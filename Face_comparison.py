from Data_Manage import validate_school_index, schools_database

from deepface import DeepFace
import requests
import os
import cv2

import glob
import shutil
from tabulate import tabulate

# הגדרות סף
FIRST_THRESHOLD = 0.6
SECOND_THRESHOLD = 0.5
GRAY_ZONE_LOWER_THRESHOLD = 5.5


def print_status(message, emoji="ℹ️", level=0):
    """פונקציה להדפסת סטטוס עם רמות הזחה - בלי כפילות"""
    indent = "  " * level
    log_message = f"{indent}{emoji} {message}"
    print(log_message)


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
            distance_metric='cosine',
            align=True
        )
        return 1 - result['distance']
    except Exception as e:
        print_status(f"שגיאה בהשוואת פנים שנייה: {str(e)}", level=1, emoji="⚠️")
        return 0


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


def check_attendance_unified(school_index, is_specific_check=False, person_ids=None):
    """
    פונקציה מאוחדת לבדיקת נוכחות - כללית או ספציפית
    משווה את התמונה הראשית של כל אדם מול פנים ב-EnviroFaces

    Args:
        school_index (int): מספר בית הספר במערכת
        is_specific_check (bool): True = בדיקה ספציפית, False = בדיקה כללית
        person_ids (list, optional): רשימת תעודות זהות (נדרש רק אם is_specific_check=True)

    Returns:
        dict: {'success': bool, 'checked_people': int, 'present_people': int, 'absent_people': int, 'message': str, 'school_name': str}
    """
    try:
        # בדיקת תקינות האינדקס
        is_valid, error_msg = validate_school_index(school_index)
        if not is_valid:
            return {
                'success': False,
                'checked_people': 0,
                'present_people': 0,
                'absent_people': 0,
                'message': f"שגיאה באינדקס בית הספר: {error_msg}",
                'school_name': None
            }

        # בדיקת תקינות פרמטרים לבדיקה ספציפית
        if is_specific_check:
            if not person_ids or not isinstance(person_ids, list) or len(person_ids) == 0:
                return {
                    'success': False,
                    'checked_people': 0,
                    'present_people': 0,
                    'absent_people': 0,
                    'message': 'רשימת תעודות זהות ריקה או לא תקינה לבדיקה ספציפית',
                    'school_name': None
                }

        # קבלת בית הספר הספציפי
        school = schools_database[school_index]
        people_vector = school.people_vector

        # הדפסת הודעת התחלה לפי סוג הבדיקה
        if is_specific_check:
            print_status(f"מתחיל בדיקת נוכחות ספציפית עבור בית הספר: {school.school_name}", emoji="🚀")
            print_status(f"תעודות זהות לבדיקה: {', '.join(person_ids)}", emoji="🎯", level=1)
        else:
            print_status(f"מתחיל בדיקת נוכחות כללית עבור בית הספר: {school.school_name}", emoji="🚀")

        # בדיקה שיש אנשים בבית הספר
        if not people_vector:
            return {
                'success': False,
                'checked_people': 0,
                'present_people': 0,
                'absent_people': 0,
                'message': f'אין אנשים רשומים בבית הספר {school.school_name}',
                'school_name': school.school_name
            }

        # קביעת רשימת האנשים לבדיקה
        if is_specific_check:
            # סינון האנשים לפי תעודות הזהות הנבחרות
            people_to_check = []
            for person in people_vector:
                if person.id_number in person_ids:
                    people_to_check.append(person)

            # בדיקה שנמצאו אנשים תואמים
            if not people_to_check:
                return {
                    'success': False,
                    'checked_people': 0,
                    'present_people': 0,
                    'absent_people': 0,
                    'message': f'לא נמצאו אנשים עם תעודות הזהות שנבחרו בבית הספר {school.school_name}',
                    'school_name': school.school_name
                }

            print_status(f"נמצאו {len(people_to_check)} אנשים תואמים מתוך {len(person_ids)} שנבחרו", emoji="👥", level=1)
        else:
            # בדיקה כללית - כל האנשים
            people_to_check = people_vector
            print_status(f"בודק נוכחות עבור {len(people_to_check)} אנשים", emoji="👥", level=1)

        # בדיקה שתיקיית EnviroFaces ספציפית לבית הספר קיימת ויש בה תמונות
        enviro_faces_dir = f"EnviroFaces_school_{school_index}_{school.admin_username}"
        if not os.path.exists(enviro_faces_dir):
            return {
                'success': False,
                'checked_people': 0,
                'present_people': 0,
                'absent_people': 0,
                'message': f'תיקיית EnviroFaces לא קיימת עבור {school.school_name}. נא להפעיל חילוץ פנים תחילה',
                'school_name': school.school_name
            }

        faces_in_db = glob.glob(f"{enviro_faces_dir}/*.jpg")
        if not faces_in_db:
            return {
                'success': False,
                'checked_people': 0,
                'present_people': 0,
                'absent_people': 0,
                'message': f'לא נמצאו פנים בתיקיית EnviroFaces עבור {school.school_name}. נא להפעיל חילוץ פנים תחילה',
                'school_name': school.school_name
            }

        print_status(f"נמצאו {len(faces_in_db)} פנים במאגר של {school.school_name}", emoji="📊", level=1)

        # מונים
        checked_people = 0
        present_people = 0

        # מעבר על האנשים לבדיקה
        for person_index, person in enumerate(people_to_check):
            try:
                display_text = f"בודק נוכחות: {person.first_name} {person.last_name}"
                if is_specific_check:
                    display_text += f" - {person.id_number}"
                display_text += f" ({person_index + 1}/{len(people_to_check)})"

                print_status(display_text, emoji="🔍", level=1)

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

                    # שמירת התמונה זמנית עם בדיקת תקינות (עם קידומת של בית הספר)
                    temp_image_path = f"temp_school_{school_index}_{person.id_number}.jpg"

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

                    # בדיקת נוכחות באמצעות הפונקציה המתקדמת
                    is_present = check_single_image_with_detailed_analysis(temp_image_path, faces_in_db,
                                                                           person.first_name, person.last_name)

                    # עדכון סטטוס נוכחות
                    person.set_presence(is_present)
                    person.update_check_time()

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
        check_type = "ספציפית" if is_specific_check else "כללית"
        additional_text = "נבחרים" if is_specific_check else "אנשים"
        success_message = f"בדיקת נוכחות {check_type} הושלמה עבור {school.school_name}: {present_people} נוכחים, {absent_people} נעדרים מתוך {checked_people} {additional_text}"

        print_status("=" * 50, level=0)
        print_status(f"סיכום בדיקת נוכחות {check_type} - {school.school_name}:", emoji="📋", level=0)
        print_status(f"סה\"כ אנשים נבדקו: {checked_people}", emoji="👥", level=1)
        print_status(f"נוכחים: {present_people}", emoji="✅", level=1)
        print_status(f"נעדרים: {absent_people}", emoji="❌", level=1)
        print_status("=" * 50, level=0)

        return {
            'success': True,
            'checked_people': checked_people,
            'present_people': present_people,
            'absent_people': absent_people,
            'message': success_message,
            'school_name': school.school_name
        }

    except Exception as e:
        check_type = "ספציפית" if is_specific_check else "כללית"
        error_message = f"שגיאה כללית בבדיקת נוכחות {check_type}: {str(e)}"
        print_status(error_message, emoji="❌")
        return {
            'success': False,
            'checked_people': 0,
            'present_people': 0,
            'absent_people': 0,
            'message': error_message,
            'school_name': None
        }
