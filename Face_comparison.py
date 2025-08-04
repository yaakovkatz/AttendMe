from Data_Manage import validate_school_index, schools_database

from deepface import DeepFace
import requests
import os
import cv2
import numpy as np
from io import BytesIO

from tabulate import tabulate

# ייבוא פונקציות Cloudinary
from Yolo_modle import get_school_faces_from_cloudinary, save_detected_match_to_cloudinary

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


def download_image_to_memory(image_url):
    """מוריד תמונה מ-URL ומחזיר אותה כ-OpenCV image בזיכרון"""
    try:
        response = requests.get(image_url, timeout=10)
        if response.status_code == 200:
            image_array = np.frombuffer(response.content, np.uint8)
            img = cv2.imdecode(image_array, cv2.IMREAD_COLOR)
            return img
        return None
    except Exception as e:
        print_status(f"שגיאה בהורדת תמונה: {str(e)}", emoji="❌", level=2)
        return None


def verify_face_primary(img1, img2):
    """פונקציה ראשונה להשוואת שתי תמונות פנים - משתמשת ב-VGG-Face - עבודה בזיכרון"""
    try:
        # בדיקה שהתמונות תקינות
        if img1 is None or img2 is None:
            print_status(f"תמונה לא תקינה", level=5)
            return 0

        result = DeepFace.verify(
            img1_path=img1,
            img2_path=img2,
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


def verify_face_secondary(img1, img2):
    """פונקציה שנייה להשוואת פנים - משתמשת ב-Facenet עם cosine - עבודה בזיכרון"""
    try:
        # בדיקה שהתמונות תקינות
        if img1 is None or img2 is None:
            print_status(f"תמונה לא תקינה", level=5)
            return 0

        result = DeepFace.verify(
            img1_path=img1,
            img2_path=img2,
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


def check_single_image_with_detailed_analysis(person_image, faces_from_cloudinary, first_name, last_name, school_index,
                                              person_id):
    """
    גרסה מתקדמת של בדיקת תמונה בודדת עם ניתוח מפורט וטבלאות - עבודה בזיכרון בלבד

    Args:
        person_image (numpy.ndarray): תמונת האדם בזיכרון
        faces_from_cloudinary (list): רשימת פנים מ-Cloudinary
        first_name (str): שם פרטי
        last_name (str): שם משפחה
        school_index (int): מספר בית הספר
        person_id (str): תעודת זהות

    Returns:
        bool: True אם נמצאה התאמה, False אחרת
    """
    try:
        print_status(f"מתחיל בדיקה מפורטת עבור {first_name} {last_name}", emoji="🔍", level=3)

        # בדיקת תקינות התמונה
        if person_image is None:
            print_status(f"תמונת אדם לא תקינה", emoji="❌", level=3)
            return False

        found_match = False
        results = []  # רשימה לשמירת התוצאות להצגתן בטבלה
        definite_matches = []  # התאמות ודאיות (מעל הסף)
        gray_zone_matches = []  # התאמות באזור האפור

        print_status(f"בודק התאמה מול {len(faces_from_cloudinary)} תמונות ב-Cloudinary", emoji="🔍", level=3)

        # בדיקה מול כל פנים מ-Cloudinary
        for face_data in faces_from_cloudinary:
            try:
                face_filename = face_data['filename']
                face_url = face_data['url']

                print_status(f"בודק מול: {face_filename}", emoji="🔎", level=4)

                # הורדת תמונת הפנים מ-Cloudinary לזיכרון
                face_image = download_image_to_memory(face_url)
                if face_image is None:
                    print_status(f"לא ניתן להוריד: {face_filename}", emoji="❌", level=4)
                    continue

                # בדיקה ראשונה עם VGG-Face - ישירות בזיכרון
                first_similarity = verify_face_primary(person_image, face_image)
                print_status(f"בדיקה ראשונה (VGG-Face): {first_similarity:.3f}", level=4)

                # בדיקה שנייה עם Facenet (רק אם עברנו את הסף הראשון)
                second_similarity = 0
                if first_similarity >= FIRST_THRESHOLD:
                    second_similarity = verify_face_secondary(person_image, face_image)
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
                    definite_matches.append(face_data)
                    found_match = True
                    print_status(f"התאמה ודאית נמצאה! {face_filename}", emoji="🎯", level=4)

                elif first_similarity >= GRAY_ZONE_LOWER_THRESHOLD:
                    # מקרה 2: באזור האפור, צריך בדיקה מעמיקה
                    status_icon = "🔍"
                    gray_zone_matches.append((face_data, first_similarity))
                    print_status(f"באזור אפור: {face_filename} - {first_similarity:.3f}", emoji="🔍", level=4)

                else:
                    # מקרה 3: מתחת לסף
                    status_icon = "❌"
                    print_status(f"מתחת לסף: {face_filename} - {first_similarity:.3f}", emoji="❌", level=4)

                # הוסף את הנתונים לרשימת התוצאות (בסדר הנכון - מימין לשמאל בעברית)
                results.append([
                    f"{person_id}",
                    face_filename,
                    f"{normalize_similarity_score(first_similarity):.3f}",
                    f"{normalize_similarity_score(second_similarity):.3f}",
                    f"{normalize_similarity_score(final_similarity):.3f}",
                    status_icon
                ])

            except Exception as face_error:
                print_status(f"שגיאה בבדיקת פנים {face_data.get('filename', 'לא ידוע')}: {str(face_error)}", emoji="⚠️",
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

            for face_data, similarity in gray_zone_matches:
                print_status(f"באזור אפור: {face_data['filename']} - {similarity:.3f}", level=4, emoji="🔍")

        # שמירת פנים מזוהות ב-Cloudinary
        if found_match and definite_matches:
            try:
                print_status(f"שומר {len(definite_matches)} פנים מזוהות ב-Cloudinary...", emoji="💾", level=3)

                # שמירת כל הפנים מהמצלמה שהתאימו
                saved_count = 0
                for face_index, matched_face in enumerate(definite_matches):
                    # הורדת הפנים מהמצלמה שהתאימו
                    camera_face_image = download_image_to_memory(matched_face['url'])
                    if camera_face_image is not None:
                        success = save_detected_match_to_cloudinary(
                            camera_face_image,  # פנים מהמצלמה
                            school_index,
                            first_name,
                            last_name,
                            f"{person_id}_{face_index + 1}"  # הוסף מספר סידורי למקרה של כמה התאמות
                        )

                        if success:
                            saved_count += 1
                            print_status(f"פנים מהמצלמה נשמרו #{saved_count}: {first_name} {last_name}", emoji="☁️",
                                         level=4)

                print_status(f"סה״כ נשמרו {saved_count} התאמות עבור {first_name} {last_name}", emoji="📸", level=3)

            except Exception as file_error:
                print_status(f"שגיאה בשמירה ב-Cloudinary: {str(file_error)}", emoji="❌", level=4)

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


# הוסף את השורה הזו בתחילת הקובץ Face_comparison.py (עם הייבואים)
from Yolo_modle import save_unidentified_faces_after_attendance


def check_attendance_unified(school_index, is_specific_check=False, person_ids=None):
    """
    פונקציה מאוחדת לבדיקת נוכחות - כללית או ספציפית - עבודה בזיכרון בלבד
    משווה את התמונה הראשית של כל אדם מול פנים ב-Cloudinary
    *** מעקב על פנים מזוהים ושמירת לא מזוהים ***

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

        # טעינת פנים מ-Cloudinary
        print_status("טוען פנים מ-Cloudinary...", emoji="☁️", level=1)
        faces_from_cloudinary = get_school_faces_from_cloudinary(school_index)

        if not faces_from_cloudinary:
            return {
                'success': False,
                'checked_people': 0,
                'present_people': 0,
                'absent_people': 0,
                'message': f'לא נמצאו פנים ב-Cloudinary עבור {school.school_name}. נא להפעיל חילוץ פנים תחילה',
                'school_name': school.school_name
            }

        print_status(f"נמצאו {len(faces_from_cloudinary)} פנים ב-Cloudinary של {school.school_name}", emoji="📊",
                     level=1)

        # 👈 🆕 מעקב על פנים מזוהים
        identified_faces = set()

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

                # הורדת התמונה לזיכרון
                print_status(f"מוריד תמונה לזיכרון: {person.first_name} {person.last_name}", emoji="📥", level=2)

                person_image = download_image_to_memory(primary_image_url)
                if person_image is None:
                    print_status(f"לא ניתן להוריד תמונה עבור {person.first_name} {person.last_name}", emoji="❌",
                                 level=2)
                    person.set_presence(False)
                    checked_people += 1
                    continue

                print_status(f"תמונה נטענה לזיכרון בהצלחה", emoji="💾", level=3)

                # בדיקת נוכחות באמצעות הפונקציה המתקדמת - עבודה בזיכרון
                is_present = check_single_image_with_detailed_analysis(
                    person_image,
                    faces_from_cloudinary,
                    person.first_name,
                    person.last_name,
                    school_index,
                    person.id_number
                )

                # 👈 🆕 אם נמצאה התאמה - עדכן מעקב פנים מזוהים
                if is_present:
                    # מצא איזה פנים התאימו לאדם הזה
                    for face_data in faces_from_cloudinary:
                        # בדוק שוב איזה פנים התאימו (פשטות - נבדוק שוב מהר)
                        face_image = download_image_to_memory(face_data['url'])
                        if face_image is not None:
                            first_similarity = verify_face_primary(person_image, face_image)
                            if first_similarity >= FIRST_THRESHOLD:
                                second_similarity = verify_face_secondary(person_image, face_image)
                                if second_similarity >= SECOND_THRESHOLD:
                                    # זה פנים שזוהה!
                                    identified_faces.add(face_data['filename'])
                                    print_status(f"פנים {face_data['filename']} סומן כמזוהה", emoji="✅", level=4)

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
                continue

        # 👈 🆕 שמירת פנים לא מזוהים
        print_status("=" * 30, level=0)
        print_status(f"מעבד פנים לא מזוהים...", emoji="🔍", level=0)
        unidentified_count = save_unidentified_faces_after_attendance(school_index, faces_from_cloudinary,
                                                                      identified_faces)

        print_status(f"נמצאו {len(identified_faces)} פנים מזוהים", emoji="✅", level=1)
        print_status(f"נשמרו {unidentified_count} פנים לא מזוהים", emoji="❓", level=1)

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
        print_status(f"פנים מזוהים: {len(identified_faces)}", emoji="✅", level=1)  # 👈 חדש
        print_status(f"פנים לא מזוהים: {unidentified_count}", emoji="❓", level=1)  # 👈 חדש
        print_status("=" * 50, level=0)

        return {
            'success': True,
            'checked_people': checked_people,
            'present_people': present_people,
            'absent_people': absent_people,
            'identified_faces': len(identified_faces),  # 👈 חדש
            'unidentified_faces': unidentified_count,  # 👈 חדש
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
            'identified_faces': 0,
            'unidentified_faces': 0,
            'message': error_message,
            'school_name': None
        }
