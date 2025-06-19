from ultralytics import YOLO
from deepface import DeepFace
import numpy as np
import cv2
import os
import glob
import shutil
from tabulate import tabulate
import contextlib
import io
import requests
import tempfile
import logging

# הגדרת logger
logger = logging.getLogger(__name__)

# סף זיהוי
FIRST_THRESHOLD = 0.5
SECOND_THRESHOLD = 0.3
FACE_SIZE_THRESHOLD = 0.0
MIN_SHARPNESS = 0
MAX_NOISE_THRESHOLD = 100
MIN_CONTRAST = 0.0


@contextlib.contextmanager
def temp_image_from_url(image_url):
    """Downloads an image from a URL to a temporary file and yields the path."""
    temp_file_path = None
    try:
        response = requests.get(image_url, stream=True, timeout=30)
        response.raise_for_status()
        with tempfile.NamedTemporaryFile(delete=False, suffix=".jpg") as temp_file:
            for chunk in response.iter_content(8192):
                temp_file.write(chunk)
            temp_file_path = temp_file.name
        yield temp_file_path
    finally:
        if temp_file_path and os.path.exists(temp_file_path):
            os.remove(temp_file_path)


def print_status(message, level=0, emoji=""):
    """הדפסת סטטוס עם logging"""
    indent = "    " * level
    log_message = f"{indent}{emoji} {message}" if emoji else f"{indent}{message}"
    print(log_message)
    logger.info(log_message)


class FaceDetection:
    def __init__(self, target_image_path="target.jpg"):
        print_status("מאתחל מערכת זיהוי פנים...", emoji="🚀")

        # *** הסרתי את הדרישה לקובץ הענק ***
        # במקום shape_predictor, נשתמש רק ב-DeepFace

        try:
            self.yolo_model = YOLO('yolov8n.pt')  # מודל קטן יותר
        except Exception as e:
            logger.warning(f"Failed to load YOLO model: {e}")
            self.yolo_model = None

        self.enviro_faces_dir = "./EnviroFaces"

        # יצירת תיקיית המאגר אם לא קיימת
        if not os.path.exists(self.enviro_faces_dir):
            os.makedirs(self.enviro_faces_dir)
            print_status(f"נוצרה תיקיית מאגר פנים חדשה: {self.enviro_faces_dir}", level=1, emoji="📁")

    def normalize_similarity_score(self, value):
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

    def clear_directory(self, directory_path):
        """מחיקת כל הקבצים מתיקייה"""
        try:
            if not os.path.exists(directory_path):
                print_status(f"התיקייה {directory_path} לא קיימת", emoji="❌")
                return

            files = glob.glob(f"{directory_path}/*.*")
            if not files:
                print_status(f"התיקייה {directory_path} ריקה", emoji="📂")
                return

            print_status(f"מוחק {len(files)} קבצים מתיקייה {os.path.basename(directory_path)}", emoji="🗑️")

            for file in files:
                try:
                    os.remove(file)
                    print_status(f"נמחק: {os.path.basename(file)}", level=1, emoji="✓")
                except Exception as e:
                    print_status(f"שגיאה במחיקת {os.path.basename(file)}: {str(e)}", level=1, emoji="⚠️")

            print_status(f"הסתיימה מחיקת {len(files)} קבצים בהצלחה", emoji="✅")

        except Exception as e:
            print_status(f"שגיאה בניקוי התיקייה: {str(e)}", emoji="❌")

    def extract_faces_from_directory(self, directory_path):
        """חילוץ פנים מתיקייה - גרסה מפושטת"""
        extracted_faces_count = 0

        try:
            if not os.path.exists(directory_path):
                print_status(f"התיקייה {directory_path} לא נמצאה", emoji="❌")
                return extracted_faces_count

            image_extensions = ['.jpg', '.jpeg', '.png']
            image_files = []
            for ext in image_extensions:
                image_files.extend(glob.glob(os.path.join(directory_path, f'*{ext}')))

            if not image_files:
                print_status("לא נמצאו קבצי תמונה בתיקייה", emoji="❌")
                return extracted_faces_count

            print_status(f"התחלת סריקת תיקייה: {os.path.basename(directory_path)}", emoji="📁")
            print_status(f"נמצאו {len(image_files)} תמונות לסריקה", level=1)

            for img_path in image_files:
                try:
                    img = cv2.imread(img_path)
                    if img is None:
                        continue

                    # שימוש ב-DeepFace לזיהוי פנים במקום YOLO
                    try:
                        # ניסיון לזהות פנים עם DeepFace
                        face_objs = DeepFace.extract_faces(
                            img_path=img_path,
                            enforce_detection=False,
                            detector_backend='opencv'
                        )

                        if face_objs:
                            # שמירת הפנים שזוהו
                            for i, face_obj in enumerate(face_objs):
                                if face_obj.shape[0] > 50 and face_obj.shape[1] > 50:  # מסנן גודל מינימלי
                                    face_path = f"{self.enviro_faces_dir}/face_{len(os.listdir(self.enviro_faces_dir)) + 1}.jpg"
                                    face_img = (face_obj * 255).astype(np.uint8)
                                    cv2.imwrite(face_path, face_img)
                                    extracted_faces_count += 1

                    except Exception as face_error:
                        logger.warning(f"Failed to extract faces from {img_path}: {face_error}")
                        continue

                except Exception as img_error:
                    print_status(f"שגיאה בעיבוד תמונה {os.path.basename(img_path)}: {str(img_error)}", emoji="⚠️")
                    continue

            print_status(f"סה\"כ חולצו {extracted_faces_count} פנים", level=1)
            return extracted_faces_count

        except Exception as e:
            print_status(f"שגיאה בעיבוד התיקייה: {str(e)}", emoji="❌")
            return extracted_faces_count

    def verify_face(self, img1_path, img2_path):
        """השוואת שתי תמונות פנים - גרסה מפושטת"""
        try:
            result = DeepFace.verify(
                img1_path=img1_path,
                img2_path=img2_path,
                enforce_detection=False,
                detector_backend='opencv',  # במקום retinaface
                model_name='VGG-Face',  # מודל קל יותר
                distance_metric='cosine',
                align=True
            )
            return 1 - result['distance']
        except Exception as e:
            print_status(f"שגיאה בהשוואת פנים: {str(e)}", level=1, emoji="⚠️")
            return 0

    def verify_face_second(self, img1_path, img2_path):
        """בדיקה שנייה עם מודל אחר"""
        try:
            result = DeepFace.verify(
                img1_path=img1_path,
                img2_path=img2_path,
                enforce_detection=False,
                detector_backend='opencv',
                model_name='Facenet',  # מודל שונה
                distance_metric='euclidean',
                align=True
            )
            return 1 - result['distance']
        except Exception as e:
            print_status(f"שגיאה בהשוואת פנים שנייה: {str(e)}", level=1, emoji="⚠️")
            return 0

    def check_person_against_environment(self, personal_image_url):
        """בדיקת אדם מול הסביבה - גרסה מפושטת ללא קובץ הענק"""
        try:
            with temp_image_from_url(personal_image_url) as personal_image_path:
                faces_in_db = glob.glob(f"{self.enviro_faces_dir}/*.jpg")

                if not faces_in_db:
                    print_status("לא נמצאו פנים במאגר הזמני", emoji="❌")
                    return False

                if not os.path.exists(personal_image_path):
                    print_status("שגיאה: לא נוצר קובץ זמני עבור התמונה האישית", emoji="❌")
                    return False

                print_status(f"בודק התאמה מול {len(faces_in_db)} תמונות במאגר", emoji="🔍")

                found_match = False
                results = []

                # בדיקה פשוטה יותר ללא נקודות ציון
                for face_in_db in faces_in_db:
                    face_filename = os.path.basename(face_in_db)

                    # בדיקה ראשונה
                    first_similarity = self.verify_face(personal_image_path, face_in_db)

                    # בדיקה שנייה רק אם הראשונה הצליחה
                    second_similarity = 0
                    if first_similarity >= FIRST_THRESHOLD:
                        second_similarity = self.verify_face_second(personal_image_path, face_in_db)

                    # קביעת התאמה
                    if first_similarity >= FIRST_THRESHOLD and second_similarity >= SECOND_THRESHOLD:
                        found_match = True
                        status_icon = "✅"
                        final_similarity = max(first_similarity, second_similarity)
                    else:
                        status_icon = "❌"
                        final_similarity = first_similarity

                    results.append([
                        os.path.basename(personal_image_path),
                        face_filename,
                        f"{self.normalize_similarity_score(first_similarity):.2f}",
                        f"{self.normalize_similarity_score(second_similarity):.2f}",
                        f"{self.normalize_similarity_score(final_similarity):.2f}",
                        status_icon
                    ])

                # הדפסת תוצאות
                headers = ["סטטוס", "התאמה סופית", "התאמה שנייה", "התאמה ראשונה", "תמונה בבסיס הנתונים", "תמונה נבדקת"]
                print("\n" + tabulate(results, headers=headers, tablefmt="grid", stralign="center"))

                if found_match:
                    print_status("נמצאה התאמה!", emoji="✅")
                else:
                    print_status("לא נמצאה התאמה במאגר", emoji="❓")

                return found_match

        except Exception as e:
            print_status(f"שגיאה בבדיקת תמונה מ-URL: {str(e)}", emoji="❌")
            return False

    def check_single_image(self, personal_image_path):
        """בדיקת תמונה בודדת - גרסה מפושטת"""
        return self.check_person_against_environment(personal_image_path)