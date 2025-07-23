from Data_Manage import people_vector
from Data_Manage import targets_vector

import cv2
import numpy as np
from ultralytics import YOLO
from deepface import DeepFace
import requests
import os
from io import BytesIO
import glob
import shutil
from tabulate import tabulate
import logging

# הגדרת logger
logger = logging.getLogger(__name__)

# הגדרות סף
FIRST_THRESHOLD = 0.72
SECOND_THRESHOLD = 0.6
GRAY_ZONE_LOWER_THRESHOLD = 0.7


def print_status(message, emoji="ℹ️", level=0):
    """פונקציה להדפסת סטטוס עם רמות הזחה - בלי כפילות"""
    indent = "  " * level
    log_message = f"{indent}{emoji} {message}"
    print(log_message)
    # הסרנו את השורה logger.info(log_message) כדי למנוע כפילות


def normalize_similarity_score(value):
    """ממיר ערכי דמיון לטווח תקין של 0 עד 1"""
    if isinstance(value, str):
        try:
            value = float(value.strip('%')) / 100
        except ValueError:
            return 0.0

    if value < 0:
        return 0.0
    elif value > 1:
        return 1.0
    else:
        return value


def verify_face_primary(img1_path, img2_path):
    """פונקציה ראשונה להשוואת שתי תמונות פנים - משתמשת ב-VGG-Face"""
    try:
        # בדיקה שהקבצים קיימים ותקינים
        if not os.path.exists(img1_path) or not os.path.exists(img2_path):
            print_status(f"קובץ לא קיים: {img1_path} או {img2_path}", level=5)
            return 0

        # בדיקה שניתן לטעון את התמונות
        img1_test = cv2.imread(img1_path)
        img2_test = cv2.imread(img2_path)

        if img1_test is None or img2_test is None:
            print_status(f"לא ניתן לטעון תמונות: {os.path.basename(img1_path)} או {os.path.basename(img2_path)}",
                         level=5)
            return 0

        result = DeepFace.verify(
            img1_path=img1_path,
            img2_path=img2_path,
            enforce_detection=False,
            detector_backend='opencv',
            model_name='VGG-Face',
            distance_metric='cosine',
            align=True
        )
        return 1 - result['distance']
    except Exception as e:
        print_status(f"שגיאה בהשוואת פנים: {str(e)}", level=1, emoji="⚠️")
        return 0


def verify_face_secondary(img1_path, img2_path):
    """פונקציה שנייה להשוואת פנים - משתמשת ב-Facenet עם cosine"""
    try:
        # בדיקה שהקבצים קיימים ותקינים
        if not os.path.exists(img1_path) or not os.path.exists(img2_path):
            print_status(f"קובץ לא קיים: {img1_path} או {img2_path}", level=5)
            return 0

        # בדיקה שניתן לטעון את התמונות
        img1_test = cv2.imread(img1_path)
        img2_test = cv2.imread(img2_path)

        if img1_test is None or img2_test is None:
            print_status(f"לא ניתן לטעון תמונות: {os.path.basename(img1_path)} או {os.path.basename(img2_path)}",
                         level=5)
            return 0

        result = DeepFace.verify(
            img1_path=img1_path,
            img2_path=img2_path,
            enforce_detection=False,
            detector_backend='opencv',
            model_name='Facenet',
            distance_metric='cosine',  # שינוי ל-cosine במקום euclidean
            align=True
        )
        return 1 - result['distance']
    except Exception as e:
        print_status(f"שגיאה בהשוואת פנים שנייה: {str(e)}", level=1, emoji="⚠️")
        return 0


def extract_all_faces_from_targets():
    """
    מחלצת פנים מכל תמונות המטרה ושומרת אותן בתיקייה EnviroFaces

    Returns:
        dict: {'success': bool, 'faces_extracted': int, 'message': str}
    """
    try:
        print_status("מאתחל מערכת חילוץ פנים...", emoji="🚀")

        # יצירת תיקיית EnviroFaces אם לא קיימת
        enviro_faces_dir = "EnviroFaces"
        if not os.path.exists(enviro_faces_dir):
            os.makedirs(enviro_faces_dir)
            print_status(f"נוצרה תיקיית מאגר פנים חדשה: {enviro_faces_dir}", emoji="📁", level=1)

        # בדיקה שמודל YOLO קיים
        yolo_model_path = "face_yolov8n.pt"
        if not os.path.exists(yolo_model_path):
            return {
                'success': False,
                'faces_extracted': 0,
                'message': f"מודל YOLO לא נמצא: {yolo_model_path}"
            }

        # טעינת מודל YOLO
        try:
            yolo_model = YOLO(yolo_model_path)
            print_status("מודל YOLO נטען בהצלחה", emoji="✅")
        except Exception as e:
            return {
                'success': False,
                'faces_extracted': 0,
                'message': f"שגיאה בטעינת מודל YOLO: {str(e)}"
            }

        # מונה פנים גלובלי
        face_counter = 1
        total_faces_extracted = 0

        # מעבר על כל targets
        for target_index, target in enumerate(targets_vector):
            print_status(f"מעבד תמונת מטרה {target_index + 1}: מצלמה {target.camera_number}", emoji="🔍")

            # קבלת URL התמונה
            image_url = target.image_url

            if not image_url or not isinstance(image_url, str):
                print_status(f"URL לא תקין עבור target {target_index + 1}", emoji="⚠️")
                continue

            if not (image_url.startswith('http') or image_url.startswith('https')):
                print_status(f"URL לא נתמך עבור target {target_index + 1}", emoji="⚠️")
                continue

            try:
                # הורדת התמונה
                print_status(f"מוריד תמונה מ-URL...", emoji="📥", level=1)
                response = requests.get(image_url, timeout=10)
                if response.status_code != 200:
                    print_status(f"לא ניתן להוריד תמונה מ-target {target_index + 1}", emoji="❌")
                    continue

                # המרה ל-OpenCV format
                image_bytes = BytesIO(response.content)
                image_array = np.frombuffer(image_bytes.getvalue(), np.uint8)
                img = cv2.imdecode(image_array, cv2.IMREAD_COLOR)

                if img is None:
                    print_status(f"לא ניתן לטעון תמונה מ-target {target_index + 1}", emoji="❌")
                    continue

                print_status(f"תמונה נטענה בהצלחה (גודל: {img.shape[1]}x{img.shape[0]})", emoji="✅", level=1)

                # זיהוי פנים
                print_status("מתחיל זיהוי פנים ב-YOLO...", emoji="🔍", level=1)
                results = yolo_model(img, verbose=False)[0]

                if not hasattr(results, 'boxes') or results.boxes is None:
                    print_status(f"לא נמצאו פנים ב-target {target_index + 1}", emoji="⚠️")
                    continue

                num_faces = len(results.boxes)
                print_status(f"נמצאו {num_faces} פנים ב-target {target_index + 1}", emoji="📊", level=1)

                # חילוץ כל פנים
                for box_index, box in enumerate(results.boxes):
                    try:
                        # קבלת קואורדינטות
                        x1, y1, x2, y2 = map(int, box.xyxy[0])

                        # בדיקת תקינות קואורדינטות
                        if x2 <= x1 or y2 <= y1:
                            print_status(f"קואורדינטות לא תקינות עבור פנים {box_index + 1}", emoji="⚠️", level=2)
                            continue

                        # חיתוך הפנים
                        face = img[y1:y2, x1:x2]

                        if face.size == 0:
                            print_status(f"פנים ריקות עבור פנים {box_index + 1}", emoji="⚠️", level=2)
                            continue

                        # שמירת הפנים
                        face_filename = f"f{face_counter}.jpg"
                        face_path = os.path.join(enviro_faces_dir, face_filename)

                        success = cv2.imwrite(face_path, face)

                        if success:
                            print_status(f"נשמרו פנים: {face_filename} (גודל: {x2 - x1}x{y2 - y1})", emoji="✅", level=2)
                            face_counter += 1
                            total_faces_extracted += 1
                        else:
                            print_status(f"שגיאה בשמירת פנים מ-target {target_index + 1}", emoji="❌", level=2)

                    except Exception as face_error:
                        print_status(f"שגיאה בעיבוד פנים מ-target {target_index + 1}: {str(face_error)}", emoji="❌",
                                     level=2)
                        continue

            except Exception as target_error:
                print_status(f"שגיאה בעיבוד target {target_index + 1}: {str(target_error)}", emoji="❌")
                continue

        # סיכום
        message = f"הושלם חילוץ פנים: {total_faces_extracted} פנים נשמרו בתיקייה {enviro_faces_dir}"
        print_status(message, emoji="🎉")

        return {
            'success': True,
            'faces_extracted': total_faces_extracted,
            'message': message
        }

    except Exception as e:
        error_message = f"שגיאה כללית בחילוץ פנים: {str(e)}"
        print_status(error_message, emoji="❌")
        return {
            'success': False,
            'faces_extracted': 0,
            'message': error_message
        }


def check_single_image_with_detailed_analysis(image_path, faces_in_db, first_name, last_name):
    """
    גרסה מתקדמת של בדיקת תמונה בודדת עם ניתוח מפורט וטבלאות

    Args:
        image_path (str): נתיב לתמונה לבדיקה
        faces_in_db (list): רשימת נתיבי תמונות פנים במאגר
        first_name (str): שם פרטי (לצורך לוג)
        last_name (str): שם משפחה (לצורך לוג)

    Returns:
        bool: True אם נמצאה התאמה, False אחרת
    """
    try:
        print_status(f"מתחיל בדיקה מפורטת עבור {first_name} {last_name}", emoji="🔍", level=3)

        # בדיקת קיום התמונה
        if not os.path.exists(image_path):
            print_status(f"תמונה לא קיימת: {image_path}", emoji="❌", level=3)
            return False

        found_match = False
        results = []  # רשימה לשמירת התוצאות להצגתן בטבלה
        definite_matches = []  # התאמות ודאיות (מעל הסף)
        gray_zone_matches = []  # התאמות באזור האפור

        # יצירת תיקיית Identified_Images אם לא קיימת
        identified_dir = "./Identified_Images"
        if not os.path.exists(identified_dir):
            os.makedirs(identified_dir)

        print_status(f"בודק התאמה מול {len(faces_in_db)} תמונות במאגר", emoji="🔍", level=3)

        # בדיקה מול כל פנים במאגר
        for face_in_db in faces_in_db:
            try:
                face_filename = os.path.basename(face_in_db)
                print_status(f"בודק מול: {face_filename}", emoji="🔎", level=4)

                # בדיקה ראשונה עם VGG-Face
                first_similarity = verify_face_primary(image_path, face_in_db)
                print_status(f"בדיקה ראשונה (VGG-Face): {first_similarity:.3f}", level=4)

                # בדיקה שנייה עם Facenet (רק אם עברנו את הסף הראשון)
                second_similarity = 0
                if first_similarity >= FIRST_THRESHOLD:
                    second_similarity = verify_face_secondary(image_path, face_in_db)
                    print_status(f"בדיקה שנייה (Facenet): {second_similarity:.3f}", level=4)

                # חישוב דמיון סופי
                if second_similarity > 0:
                    final_similarity = (first_similarity + second_similarity) / 2
                else:
                    final_similarity = first_similarity

                # חלוקה לקטגוריות לפי ציון הדמיון
                if first_similarity >= FIRST_THRESHOLD and second_similarity >= SECOND_THRESHOLD:
                    # מקרה 1: התאמה ודאית (שתי הבדיקות עברו)
                    status_icon = "✅"
                    definite_matches.append(face_in_db)
                    found_match = True
                    print_status(f"התאמה ודאית נמצאה! {face_filename}", emoji="🎯", level=4)

                elif first_similarity >= GRAY_ZONE_LOWER_THRESHOLD:
                    # מקרה 2: באזור האפור, צריך בדיקה מעמיקה
                    status_icon = "🔍"
                    gray_zone_matches.append((face_in_db, first_similarity))
                    print_status(f"באזור אפור: {face_filename} - {first_similarity:.3f}", emoji="🔍", level=4)

                else:
                    # מקרה 3: מתחת לסף
                    status_icon = "❌"
                    print_status(f"מתחת לסף: {face_filename} - {first_similarity:.3f}", emoji="❌", level=4)

                # הוסף את הנתונים לרשימת התוצאות (בסדר הנכון - מימין לשמאל בעברית)
                results.append([
                    os.path.basename(image_path),
                    face_filename,
                    f"{normalize_similarity_score(first_similarity):.3f}",
                    f"{normalize_similarity_score(second_similarity):.3f}",
                    f"{normalize_similarity_score(final_similarity):.3f}",
                    status_icon
                ])

            except Exception as face_error:
                print_status(f"שגיאה בבדיקת פנים {os.path.basename(face_in_db)}: {str(face_error)}", emoji="⚠️",
                             level=4)
                continue

        # הדפסת טבלת תוצאות
        if results:
            print_status(f"תוצאות בדיקה עבור {first_name} {last_name}:", emoji="📊", level=3)
            headers = ["סטטוס", "ציון סופי", "ציון שני", "ציון ראשון", "תמונה במאגר", "תמונה נבדקת"]
            print("\n" + tabulate(results, headers=headers, tablefmt="grid", stralign="center"))

        # טיפול באזור אפור
        if not found_match and gray_zone_matches:
            print_status(f"נמצאו {len(gray_zone_matches)} פנים באזור האפור, מבצע הערכה נוספת...", emoji="🔍", level=3)

            # כאן אפשר להוסיף לוגיקה נוספת לאזור האפור
            # לעת עתה, פשוט נדווח על זה
            for face_path, similarity in gray_zone_matches:
                print_status(f"באזור אפור: {os.path.basename(face_path)} - {similarity:.3f}", level=4, emoji="🔍")

        # שמירת פנים מזוהות
        if found_match and definite_matches:
            try:
                print_status(f"שומר {len(definite_matches)} פנים מזוהות...", emoji="💾", level=3)

                for face_in_db in definite_matches:
                    # יצירת שם קובץ חדש עבור הפנים המזוהות
                    original_number = os.path.basename(face_in_db).split('.')[0]
                    new_filename = f"{first_name}_{last_name}_{original_number}.jpg"
                    new_path = os.path.join(identified_dir, new_filename)

                    # העתקת הקובץ (לא מחיקה מהמאגר המקורי)
                    shutil.copy2(face_in_db, new_path)
                    print_status(f"פנים מזוהות הועתקו ל: {new_filename}", emoji="📁", level=4)

            except Exception as file_error:
                print_status(f"שגיאה בטיפול בקבצים: {str(file_error)}", emoji="❌", level=4)

        # סיכום
        if found_match:
            print_status(f"סיכום: נמצאו {len(definite_matches)} התאמות ודאיות עבור {first_name} {last_name}", emoji="✅",
                         level=3)
        else:
            best_score = max([float(r[2]) for r in results]) if results else 0
            print_status(f"סיכום: לא נמצאה התאמה עבור {first_name} {last_name} (ציון הטוב ביותר: {best_score:.3f})",
                         emoji="❓", level=3)

        return found_match

    except Exception as e:
        print_status(f"שגיאה בבדיקת תמונה: {str(e)}", emoji="❌", level=3)
        return False


def check_attendance_for_all_people():
    """
    בודקת נוכחות עבור כל האנשים במערכת
    משווה את התמונה הראשית של כל אדם מול פנים ב-EnviroFaces

    Returns:
        dict: {'success': bool, 'checked_people': int, 'present_people': int, 'absent_people': int, 'message': str}
    """
    try:
        print_status("מתחיל בדיקת נוכחות כללית", emoji="🚀")

        # בדיקה שיש אנשים במערכת
        if not people_vector:
            return {
                'success': False,
                'checked_people': 0,
                'present_people': 0,
                'absent_people': 0,
                'message': 'אין אנשים רשומים במערכת'
            }

        # בדיקה שתיקיית EnviroFaces קיימת ויש בה תמונות
        enviro_faces_dir = "EnviroFaces"
        if not os.path.exists(enviro_faces_dir):
            return {
                'success': False,
                'checked_people': 0,
                'present_people': 0,
                'absent_people': 0,
                'message': 'תיקיית EnviroFaces לא קיימת. נא להפעיל חילוץ פנים תחילה'
            }

        faces_in_db = glob.glob(f"{enviro_faces_dir}/*.jpg")
        if not faces_in_db:
            return {
                'success': False,
                'checked_people': 0,
                'present_people': 0,
                'absent_people': 0,
                'message': 'לא נמצאו פנים בתיקיית EnviroFaces. נא להפעיל חילוץ פנים תחילה'
            }

        print_status(f"נמצאו {len(faces_in_db)} פנים במאגר", emoji="📊", level=1)
        print_status(f"בודק נוכחות עבור {len(people_vector)} אנשים", emoji="👥", level=1)

        # מונים
        checked_people = 0
        present_people = 0

        # מעבר על כל האנשים
        for person_index, person in enumerate(people_vector):
            try:
                print_status(
                    f"בודק נוכחות: {person.first_name} {person.last_name} ({person_index + 1}/{len(people_vector)})",
                    emoji="🔍", level=1)

                # בדיקה שיש לאדם תמונות
                if not person.image_urls or len(person.image_urls) == 0:
                    print_status(f"אין תמונות עבור {person.first_name} {person.last_name}", emoji="⚠️", level=2)
                    person.set_presence(False)
                    checked_people += 1
                    continue

                # קבלת התמונה הראשית (הראשונה ברשימה)
                primary_image_url = person.image_urls[0]

                # הורדת התמונה זמנית לבדיקה
                temp_image_path = None
                try:
                    print_status(f"מוריד תמונה לבדיקה: {person.first_name} {person.last_name}", emoji="📥", level=2)

                    # הורדת התמונה
                    response = requests.get(primary_image_url, timeout=10)
                    if response.status_code != 200:
                        print_status(f"לא ניתן להוריד תמונה עבור {person.first_name} {person.last_name}", emoji="❌",
                                     level=2)
                        person.set_presence(False)
                        checked_people += 1
                        continue

                    # שמירת התמונה זמנית עם בדיקת תקינות
                    temp_image_path = f"temp_{person.id_number}.jpg"

                    # שמירה וודא שהתמונה תקינה
                    with open(temp_image_path, 'wb') as f:
                        f.write(response.content)

                    # בדיקה שהתמונה נשמרה תקין
                    test_img = cv2.imread(temp_image_path)
                    if test_img is None:
                        print_status(f"תמונה זמנית לא תקינה עבור {person.first_name} {person.last_name}", emoji="❌",
                                     level=2)
                        person.set_presence(False)
                        checked_people += 1
                        continue

                    print_status(f"תמונה זמנית נשמרה בהצלחה: {temp_image_path}", emoji="💾", level=3)

                    # בדיקת נוכחות באמצעות הפונקציה המתקדמת החדשה
                    is_present = check_single_image_with_detailed_analysis(temp_image_path, faces_in_db,
                                                                           person.first_name, person.last_name)

                    # עדכון סטטוס נוכחות
                    person.set_presence(is_present)

                    if is_present:
                        present_people += 1
                        print_status(f"נוכח: {person.first_name} {person.last_name}", emoji="✅", level=2)
                    else:
                        print_status(f"לא נוכח: {person.first_name} {person.last_name}", emoji="❌", level=2)

                    checked_people += 1

                except Exception as person_error:
                    print_status(f"שגיאה בבדיקת {person.first_name} {person.last_name}: {str(person_error)}", emoji="❌",
                                 level=2)
                    person.set_presence(False)
                    checked_people += 1

                finally:
                    # ניקוי קובץ זמני
                    if temp_image_path and os.path.exists(temp_image_path):
                        try:
                            os.remove(temp_image_path)
                            print_status(f"קובץ זמני נמחק: {temp_image_path}", emoji="🗑️", level=4)
                        except:
                            pass

            except Exception as person_loop_error:
                print_status(f"שגיאה בעיבוד אדם {person_index + 1}: {str(person_loop_error)}", emoji="❌", level=1)
                continue

        # סיכום כולל
        absent_people = checked_people - present_people
        success_message = f"בדיקת נוכחות הושלמה: {present_people} נוכחים, {absent_people} נעדרים מתוך {checked_people} אנשים"

        print_status("=" * 50, level=0)
        print_status("סיכום בדיקת נוכחות:", emoji="📋", level=0)
        print_status(f"סה\"כ אנשים נבדקו: {checked_people}", emoji="👥", level=1)
        print_status(f"נוכחים: {present_people}", emoji="✅", level=1)
        print_status(f"נעדרים: {absent_people}", emoji="❌", level=1)
        print_status("=" * 50, level=0)

        return {
            'success': True,
            'checked_people': checked_people,
            'present_people': present_people,
            'absent_people': absent_people,
            'message': success_message
        }

    except Exception as e:
        error_message = f"שגיאה כללית בבדיקת נוכחות: {str(e)}"
        print_status(error_message, emoji="❌")
        return {
            'success': False,
            'checked_people': 0,
            'present_people': 0,
            'absent_people': 0,
            'message': error_message
        }