from Data_Manage import validate_school_index, schools_database

import numpy as np
from ultralytics import YOLO
from io import BytesIO
import requests
import os
import cv2
import tempfile
import cloudinary
import cloudinary.uploader
import cloudinary.api

# הגדרת Cloudinary
cloudinary.config(
    cloud_name=os.getenv('CLOUDINARY_CLOUD_NAME'),
    api_key=os.getenv('CLOUDINARY_API_KEY'),
    api_secret=os.getenv('CLOUDINARY_API_SECRET'),
    secure=True
)


def print_status(message, emoji="ℹ️", level=0):
    """פונקציה להדפסת סטטוס עם רמות הזחה - בלי כפילות"""
    indent = "  " * level
    log_message = f"{indent}{emoji} {message}"
    print(log_message)


def save_face_to_cloudinary(face_image, school_index, face_counter, camera_number=None):
    """שומר תמונת פנים ל-Cloudinary"""
    try:
        success, buffer = cv2.imencode('.jpg', face_image, [cv2.IMWRITE_JPEG_QUALITY, 90])
        if not success:
            return False

        camera_suffix = f"_cam{camera_number}" if camera_number else ""
        public_id = f"school_{school_index}/face_{face_counter}{camera_suffix}"

        result = cloudinary.uploader.upload(
            buffer.tobytes(),
            public_id=public_id,
            folder="attendance_faces",
            overwrite=True,
            resource_type="image",
            format="jpg"
        )

        return True

    except Exception as e:
        print_status(f"שגיאה בהעלאה ל-Cloudinary: {str(e)}", emoji="❌", level=2)
        return False


def delete_school_faces_from_cloudinary(school_index):
    """מוחק פנים קודמות של בית ספר מ-Cloudinary"""
    try:
        folder_path = f"attendance_faces/school_{school_index}"
        result = cloudinary.api.resources(type="upload", prefix=folder_path, max_results=500)

        if result.get('resources'):
            public_ids = [resource['public_id'] for resource in result['resources']]
            cloudinary.api.delete_resources(public_ids)
            print_status(f"נמחקו {len(public_ids)} פנים קודמות מ-Cloudinary", emoji="🧹", level=1)

    except Exception as e:
        print_status(f"שגיאה במחיקת פנים קודמות: {str(e)}", emoji="⚠️", level=1)


def get_school_faces_from_cloudinary(school_index):
    """מחזיר רשימת פנים של בית ספר מ-Cloudinary"""
    try:
        folder_path = f"attendance_faces/school_{school_index}"
        result = cloudinary.api.resources(type="upload", prefix=folder_path, max_results=500)

        faces = []
        for resource in result.get('resources', []):
            faces.append({
                'public_id': resource['public_id'],
                'url': resource['secure_url'],
                'filename': resource['public_id'].split('/')[-1] + '.jpg'
            })

        return faces

    except Exception as e:
        print_status(f"שגיאה בקריאת פנים מCloudinary: {str(e)}", emoji="❌")
        return []


def save_detected_match_to_cloudinary(match_image, school_index, person_first_name, person_last_name, person_id):
    """שומר תמונת התאמה מזוהה ל-Cloudinary"""
    try:
        from datetime import datetime

        success, buffer = cv2.imencode('.jpg', match_image, [cv2.IMWRITE_JPEG_QUALITY, 85])
        if not success:
            return False

        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        public_id = f"school_{school_index}/match_{person_first_name}_{person_last_name}_{person_id}_{timestamp}"

        result = cloudinary.uploader.upload(
            buffer.tobytes(),
            public_id=public_id,
            folder="detected_matches",
            overwrite=False,
            resource_type="image",
            format="jpg"
        )

        print_status(f"התאמה נשמרה ב-Cloudinary: {person_first_name} {person_last_name}", emoji="📸", level=3)
        return True

    except Exception as e:
        print_status(f"שגיאה בשמירת התאמה ל-Cloudinary: {str(e)}", emoji="❌", level=3)
        return False


def extract_all_faces_from_cameras(school_index):
    """
    מחלצת פנים מכל תמונות המטרה של בית ספר ספציפי ושומרת אותן ב-Cloudinary

    Args:
        school_index (int): מספר בית הספר במערכת

    Returns:
        dict: {'success': bool, 'faces_extracted': int, 'message': str, 'school_name': str}
    """
    try:
        # בדיקת תקינות האינדקס
        is_valid, error_msg = validate_school_index(school_index)
        if not is_valid:
            return {
                'success': False,
                'faces_extracted': 0,
                'message': f"שגיאה באינדקס בית הספר: {error_msg}",
                'school_name': None
            }

        # קבלת בית הספר הספציפי
        school = schools_database[school_index]
        targets_vector = school.targets_vector

        print_status(f"מאתחל מערכת חילוץ פנים עבור בית הספר: {school.school_name}", emoji="🚀")

        # בדיקה שיש מטרות בבית הספר
        if not targets_vector:
            return {
                'success': False,
                'faces_extracted': 0,
                'message': f'אין מטרות (תמונות מצלמה) בבית הספר {school.school_name}',
                'school_name': school.school_name
            }

        # מחיקת פנים קודמות מ-Cloudinary
        delete_school_faces_from_cloudinary(school_index)

        # בדיקה וטעינת/יצירת מודל YOLO ספציפי לפנים
        yolo_model_path = "face_yolov8n.pt"

        try:
            if os.path.exists(yolo_model_path):
                # המודל קיים - טוען אותו
                print_status(f"נמצא מודל פנים זמני", emoji="📁")
                yolo_model = YOLO(yolo_model_path)
                print_status("מודל פנים קיים נטען בהצלחה", emoji="✅")
            else:
                # המודל לא קיים - יוצר/מוריד מודל ספציפי לפנים
                print_status("מודל פנים לא נמצא, מוריד מודל ספציפי לזיהוי פנים...", emoji="📥")

                try:
                    # אפשרות 1: מודל YOLOv8 מותאם לפנים (מומלץ)
                    yolo_model = YOLO('yolov8n-face.pt')  # מודל ספציפי לפנים
                except:
                    # אפשרות 2: מודל רגיל אם הספציפי לא עובד
                    print_status("מנסה מודל רגיל...", emoji="🔄")
                    yolo_model = YOLO('yolov8n.pt')

                # שמירה זמנית
                yolo_model.save(yolo_model_path)
                print_status(f"מודל פנים זמני נשמר", emoji="💾")

        except Exception as e:
            return {
                'success': False,
                'faces_extracted': 0,
                'message': f"שגיאה בטעינת/יצירת מודל YOLO: {str(e)}",
                'school_name': school.school_name
            }

        # מונה פנים גלובלי
        face_counter = 1
        total_faces_extracted = 0

        print_status(f"מעבד {len(targets_vector)} מטרות של בית הספר {school.school_name}", emoji="📊", level=1)

        # מעבר על כל targets של בית הספר הספציפי
        for target_index, target in enumerate(targets_vector):
            camera_number = getattr(target, 'camera_number', target_index + 1)
            print_status(f"מעבד תמונת מטרה {target_index + 1}: מצלמה {camera_number}", emoji="🔍")

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

                        # שמירת הפנים ב-Cloudinary
                        success = save_face_to_cloudinary(face, school_index, face_counter, camera_number)

                        if success:
                            print_status(f"נשמרו פנים ב-Cloudinary: face_{face_counter} (גודל: {x2 - x1}x{y2 - y1})",
                                         emoji="✅", level=2)
                            face_counter += 1
                            total_faces_extracted += 1
                        else:
                            print_status(f"שגיאה בשמירת פנים ב-Cloudinary מ-target {target_index + 1}", emoji="❌",
                                         level=2)

                    except Exception as face_error:
                        print_status(f"שגיאה בעיבוד פנים מ-target {target_index + 1}: {str(face_error)}", emoji="❌",
                                     level=2)
                        continue

            except Exception as target_error:
                print_status(f"שגיאה בעיבוד target {target_index + 1}: {str(target_error)}", emoji="❌")
                continue

        # סיכום
        message = f"הושלם חילוץ פנים עבור {school.school_name}: {total_faces_extracted} פנים נשמרו ב-Cloudinary"
        print_status(message, emoji="🎉")

        return {
            'success': True,
            'faces_extracted': total_faces_extracted,
            'message': message,
            'school_name': school.school_name
        }

    except Exception as e:
        error_message = f"שגיאה כללית בחילוץ פנים: {str(e)}"
        print_status(error_message, emoji="❌")
        return {
            'success': False,
            'faces_extracted': 0,
            'message': error_message,
            'school_name': None
        }


# הוסף את הפונקציות האלו לקובץ Yolo_modle.py

def save_unidentified_faces_after_attendance(school_index, faces_from_cloudinary, identified_faces):
    """
    שומר פנים לא מזוהים אחרי בדיקת נוכחות - באותה תיקיה עם prefix שונה

    Args:
        school_index (int): מספר בית הספר
        faces_from_cloudinary (list): כל הפנים מהמצלמות
        identified_faces (set): פנים שכבר זוהו (filenames)

    Returns:
        int: כמות פנים לא מזוהים שנשמרו
    """
    try:
        from datetime import datetime

        print_status(f"מעבד פנים לא מזוהים עבור בית ספר {school_index}", emoji="🔍", level=2)

        # מצא פנים שלא זוהו כלל
        unidentified_faces = []
        for face_data in faces_from_cloudinary:
            if face_data['filename'] not in identified_faces:
                unidentified_faces.append(face_data)

        print_status(f"נמצאו {len(unidentified_faces)} פנים לא מזוהים מתוך {len(faces_from_cloudinary)}",
                     emoji="📊", level=2)

        if len(unidentified_faces) == 0:
            print_status("כל הפנים זוהו! 🎉", emoji="✅", level=2)
            return 0

        # שמור כל פנים לא מזוהים
        saved_count = 0
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

        for i, face_data in enumerate(unidentified_faces):
            try:
                # הורד תמונה לזיכרון
                face_image = download_image_to_memory(face_data['url'])
                if face_image is None:
                    continue

                # שמור עם prefix "unknown"
                success, buffer = cv2.imencode('.jpg', face_image, [cv2.IMWRITE_JPEG_QUALITY, 85])
                if not success:
                    continue

                # שמירה באותה תיקיה עם prefix שונה
                public_id = f"school_{school_index}/unknown_face_{i + 1}_{timestamp}"

                result = cloudinary.uploader.upload(
                    buffer.tobytes(),
                    public_id=public_id,
                    folder="detected_matches",  # אותה תיקיה!
                    overwrite=False,
                    resource_type="image",
                    format="jpg",
                    tags=[f"school_{school_index}", "unidentified"]  # תגים לזיהוי
                )

                print_status(f"פנים לא מזוהים נשמרו: unknown_face_{i + 1}", emoji="❓", level=3)
                saved_count += 1

            except Exception as e:
                print_status(f"שגיאה בשמירת פנים לא מזוהים {i + 1}: {str(e)}", emoji="❌", level=3)
                continue

        print_status(f"נשמרו {saved_count} פנים לא מזוהים ב-detected_matches", emoji="✅", level=2)
        return saved_count

    except Exception as e:
        print_status(f"שגיאה בעיבוד פנים לא מזוהים: {str(e)}", emoji="❌", level=2)
        return 0


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


def get_all_matches_for_school(school_index, include_unidentified=True, limit=100):
    """
    מחזיר את כל ההתאמות - מזוהות ולא מזוהות מאותה תיקיה

    Args:
        school_index (int): מספר בית הספר
        include_unidentified (bool): האם לכלול לא מזוהים
        limit (int): מגבלת תוצאות

    Returns:
        dict: {'identified': [...], 'unidentified': [...]}
    """
    try:
        folder_path = f"detected_matches/school_{school_index}"
        result = cloudinary.api.resources(type="upload", prefix=folder_path, max_results=limit)

        identified = []
        unidentified = []

        for resource in result.get('resources', []):
            filename = resource['public_id'].split('/')[-1]

            # בדוק אם זה מזוהה או לא מזוהה לפי prefix
            if filename.startswith('match_'):
                # מזוהה
                parts = filename.split('_')
                match_info = {
                    'url': resource['secure_url'],
                    'created_at': resource.get('created_at'),
                    'is_identified': True,
                    'type': 'identified',
                    'filename': filename
                }

                # חילוץ פרטים: match_יוסי_כהן_123456789_20250803
                if len(parts) >= 4:
                    match_info['first_name'] = parts[1]
                    match_info['last_name'] = parts[2]
                    match_info['person_id'] = parts[3]

                identified.append(match_info)

            elif filename.startswith('unknown_') and include_unidentified:
                # לא מזוהה
                face_info = {
                    'url': resource['secure_url'],
                    'created_at': resource.get('created_at'),
                    'is_identified': False,
                    'type': 'unidentified',
                    'filename': filename,
                    'first_name': 'לא מזוהה',
                    'last_name': '',
                    'person_id': ''
                }
                unidentified.append(face_info)

        # מיון לפי תאריך (החדשים ראשונים)
        identified.sort(key=lambda x: x.get('created_at', ''), reverse=True)
        unidentified.sort(key=lambda x: x.get('created_at', ''), reverse=True)

        return {
            'identified': identified,
            'unidentified': unidentified,
            'total_identified': len(identified),
            'total_unidentified': len(unidentified)
        }

    except Exception as e:
        print_status(f"שגיאה בקריאת התאמות: {str(e)}", emoji="❌")
        return {'identified': [], 'unidentified': [], 'total_identified': 0, 'total_unidentified': 0}


# עדכון הפונקציה הקיימת
def delete_all_detected_matches(school_index):
    """מוחק את כל ההתאמות של בית ספר - מזוהות ולא מזוהות (כולם באותה תיקיה)"""
    try:
        total_deleted = 0

        # 1. מחק תמונות התאמה (detected_matches) - כולל מזוהות ולא מזוהות
        detected_folder = f"detected_matches/school_{school_index}"
        detected_result = cloudinary.api.resources(type="upload", prefix=detected_folder, max_results=500)

        if detected_result.get('resources'):
            detected_ids = [resource['public_id'] for resource in detected_result['resources']]
            cloudinary.api.delete_resources(detected_ids)
            deleted_detected = len(detected_ids)
            total_deleted += deleted_detected
            print_status(f"נמחקו {deleted_detected} התאמות (מזוהות + לא מזוהות)", emoji="🗑️")

        # 2. מחק פנים מהמצלמות (attendance_faces)
        attendance_folder = f"attendance_faces/school_{school_index}"
        attendance_result = cloudinary.api.resources(type="upload", prefix=attendance_folder, max_results=500)

        if attendance_result.get('resources'):
            attendance_ids = [resource['public_id'] for resource in attendance_result['resources']]
            cloudinary.api.delete_resources(attendance_ids)
            deleted_attendance = len(attendance_ids)
            total_deleted += deleted_attendance
            print_status(f"נמחקו {deleted_attendance} פנים מהמצלמות", emoji="🗑️")

        print_status(f"סה״כ נמחקו {total_deleted} תמונות מ-Cloudinary", emoji="🗑️")
        return total_deleted

    except Exception as e:
        print_status(f"שגיאה במחיקת תמונות: {str(e)}", emoji="❌")
        return 0