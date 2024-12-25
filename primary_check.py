# primary_check.py - בדיקה ראשית עם סף 50%

from ultralytics import YOLO
from deepface import DeepFace
import cv2
import os
import glob
import tensorflow as tf
import numpy as np

# הגדרות להעלמת אזהרות
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'
tf.compat.v1.logging.set_verbosity(tf.compat.v1.logging.ERROR)
os.environ['CURL_CA_BUNDLE'] = ''

SIMILARITY_THRESHOLD = 0.5  # 50% סף להתאמה


def cleanup_temp_files():
    for temp_file in glob.glob("temp_face_*.jpg"):
        try:
            os.remove(temp_file)
        except Exception as e:
            print(f"שגיאה במחיקת קובץ זמני {temp_file}: {str(e)}")


def draw_results(image, matches, all_faces):
    """
    מצייר את תוצאות הזיהוי על התמונה
    """
    for x1, y1, x2, y2 in all_faces:
        matching_face = None
        for match in matches:
            if abs(match[2][0] - x1) < 10 and abs(match[2][1] - y1) < 10:
                matching_face = match
                break

        if matching_face and matching_face[1] >= SIMILARITY_THRESHOLD:
            # מסגרת ירוקה להתאמה טובה
            cv2.rectangle(image, (x1, y1), (x2, y2), (0, 255, 0), 2)
            cv2.putText(image, f"{matching_face[1]:.2%}", (x1, y1 - 10),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 2)
        else:
            # מסגרת אדומה לשאר
            cv2.rectangle(image, (x1, y1), (x2, y2), (0, 0, 255), 2)
            if matching_face:
                cv2.putText(image, f"{matching_face[1]:.2%}", (x1, y1 - 10),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 255), 2)
            else:
                cv2.putText(image, "0.00%", (x1, y1 - 10),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 255), 2)

    return image


def detect_and_recognize_faces(primary_img_path, unknown_img_path):
    found_match = False
    try:
        print(f"מנסה לקרוא את קובץ הייחוס: {os.path.abspath(primary_img_path)}")

        # טעינת מודל YOLO
        yolo_model = YOLO('./face_yolov8n.pt')

        # טעינת התמונות
        unknown_img = cv2.imread(unknown_img_path)
        primary_img = cv2.imread(primary_img_path)

        if unknown_img is None:
            raise Exception(f"לא ניתן לטעון את התמונה הלא ידועה: {unknown_img_path}")
        if primary_img is None:
            raise Exception(f"לא ניתן לטעון את תמונת הייחוס: {primary_img_path}")

        # זיהוי פנים בתמונה
        results = yolo_model(unknown_img)[0]
        matches = []
        all_faces = []

        for i, box in enumerate(results.boxes):
            try:
                x1, y1, x2, y2 = map(int, box.xyxy[0])
                all_faces.append((x1, y1, x2, y2))

                # חיתוך הפנים מהתמונה
                face_img = unknown_img[y1:y2, x1:x2]
                temp_face_path = f"temp_face_{i}.jpg"
                cv2.imwrite(temp_face_path, face_img)

                try:
                    result = DeepFace.verify(
                        img1_path=primary_img_path,
                        img2_path=temp_face_path,
                        enforce_detection=False,  # חשוב! מונע שגיאות זיהוי
                        detector_backend='retinaface',
                        model_name='Facenet512',
                        distance_metric='cosine',
                        align=True
                    )

                    similarity = 1 - result['distance']
                    print(f"\nתוצאת התאמה לפנים {i + 1}: {similarity:.2%}")

                    matches.append((True, similarity, (x1, y1, x2, y2)))

                    if similarity >= SIMILARITY_THRESHOLD:
                        found_match = True

                except Exception as e:
                    print(f"שגיאה בהשוואת פנים {i + 1}: {str(e)}")
                    continue

            except Exception as e:
                print(f"שגיאה בעיבוד פנים {i + 1}: {str(e)}")

        # מצייר את התוצאות על התמונה
        if matches:
            unknown_img = draw_results(unknown_img, matches, all_faces)
            cv2.imwrite('result_primary.jpg', unknown_img)

        return matches, unknown_img, all_faces, found_match

    except Exception as e:
        print(f"שגיאה כללית: {str(e)}")
        return [], None, [], False
    finally:
        cleanup_temp_files()