from Data_Manage import validate_school_index, schools_database

import numpy as np
from ultralytics import YOLO
from io import BytesIO
import requests
import os
import cv2


def print_status(message, emoji="ℹ️", level=0):
    """פונקציה להדפסת סטטוס עם רמות הזחה - בלי כפילות"""
    indent = "  " * level
    log_message = f"{indent}{emoji} {message}"
    print(log_message)


def extract_all_faces_from_cameras(school_index):
    """
    מחלצת פנים מכל תמונות המטרה של בית ספר ספציפי ושומרת אותן בתיקייה EnviroFaces

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

        # יצירת תיקיית EnviroFaces ספציפית לבית הספר
        enviro_faces_dir = f"EnviroFaces_school_{school_index}_{school.admin_username}"
        if not os.path.exists(enviro_faces_dir):
            os.makedirs(enviro_faces_dir)
            print_status(f"נוצרה תיקיית מאגר פנים חדשה: {enviro_faces_dir}", emoji="📁", level=1)

        # בדיקה וטעינת/יצירת מודל YOLO ספציפי לפנים
        yolo_model_path = "face_yolov8n.pt"

        try:
            if os.path.exists(yolo_model_path):
                # המודל קיים - טוען אותו
                print_status(f"נמצא מודל פנים קיים: {yolo_model_path}", emoji="📁")
                yolo_model = YOLO(yolo_model_path)
                print_status("מודל פנים קיים נטען בהצלחה", emoji="✅")
            else:
                # המודל לא קיים - יוצר/מוריד מודל ספציפי לפנים
                print_status("מודל פנים לא נמצא, מוריד מודל ספציפי לזיהוי פנים...", emoji="📥")

                # אפשרות 1: מודל YOLOv8 מותאם לפנים (מומלץ)
                yolo_model = YOLO('yolov8n-face.pt')  # מודל ספציפי לפנים

                # אפשרות 2: אם המודל הראשון לא עובד, נסה את זה:
                # yolo_model = YOLO('https://github.com/akanametov/yolov8-face/releases/download/v0.0.0/yolov8n-face.pt')

                # שמירה עם השם המותאם
                yolo_model.save(yolo_model_path)
                print_status(f"מודל פנים חדש נשמר כ: {yolo_model_path}", emoji="💾")

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

                        # שמירת הפנים (עם קידומת של בית הספר)
                        face_filename = f"school_{school_index}_f{face_counter}.jpg"
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
        message = f"הושלם חילוץ פנים עבור {school.school_name}: {total_faces_extracted} פנים נשמרו בתיקייה {enviro_faces_dir}"
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