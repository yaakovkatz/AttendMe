import os
import cv2
import numpy as np
from ultralytics import YOLO
import requests
from io import BytesIO
import cloudinary
import cloudinary.uploader
import cloudinary.api


def print_status(message, emoji="ℹ️", level=0):
    """פונקציה להדפסת סטטוס עם רמות הזחה"""
    indent = "  " * level
    print(f"{indent}{emoji} {message}")


class Target:
    def __init__(self, camera_number, images_url, yolo_model_path="yolov8n-face.pt", enable_face_detection=False):
        # מידע אישי
        self.camera_number = camera_number
        self.image_url = images_url
        self._is_checked = False  # שים לב לקו תחתון
        self.extracted_faces = []
        self.faces_count = 0
        self.yolo_model = None

        # ערכי סף לבדיקות איכות
        self.FACE_SIZE_THRESHOLD = 0.01  # 1% מגודל התמונה
        self.MIN_SHARPNESS = 100
        self.MAX_NOISE_THRESHOLD = 50
        self.MIN_CONTRAST = 30

        # טעינת מודל YOLO רק אם נדרש ואם הקובץ קיים
        if enable_face_detection:
            try:
                if os.path.exists(yolo_model_path):
                    self.yolo_model = YOLO(yolo_model_path)
                    print_status(f"✅ מודל YOLO נטען בהצלחה: {yolo_model_path}")
                    self.extract_faces()  # רק אם יש מודל
                else:
                    print_status(f"⚠️ קובץ מודל YOLO לא נמצא: {yolo_model_path}")
                    print_status("ℹ️ ממשיך בלי זיהוי פנים")
            except Exception as e:
                print_status(f"❌ שגיאה בטעינת מודל YOLO: {str(e)}")
                print_status("ℹ️ ממשיך בלי זיהוי פנים")
        else:
            print_status("ℹ️ זיהוי פנים מבוטל")

    @property
    def is_checked(self):
        """getter לסטטוס בדיקה"""
        return self._is_checked

    @is_checked.setter
    def is_checked(self, value):
        """setter לסטטוס בדיקה"""
        self._is_checked = value

    @property
    def image_urls(self):
        """מחזיר רשימת URLs של תמונות (תאימות לקוד הקיים)"""
        if isinstance(self.image_url, list):
            return self.image_url
        else:
            return [self.image_url] if self.image_url else []

    def check_face_size(self, face_area, image_area):
        """בדיקת גודל הפנים ביחס לתמונה"""
        if image_area == 0:
            return False, 0

        face_ratio = face_area / image_area
        is_big_enough = face_ratio >= self.FACE_SIZE_THRESHOLD
        return is_big_enough, face_ratio

    def check_face_sharpness(self, face_image):
        """בדיקת חדות הפנים בתמונה"""
        if face_image is None or face_image.size == 0:
            return False, 0

        gray = cv2.cvtColor(face_image, cv2.COLOR_BGR2GRAY)
        sharpness = cv2.Laplacian(gray, cv2.CV_64F).var()
        is_sharp = sharpness >= self.MIN_SHARPNESS
        return is_sharp, sharpness

    def check_face_noise(self, face_image):
        """בדיקת רמת הרעש בתמונת הפנים"""
        if face_image is None or face_image.size == 0:
            return False, 0

        gray = cv2.cvtColor(face_image, cv2.COLOR_BGR2GRAY)
        noise = cv2.meanStdDev(gray)[1][0][0]
        is_clean = noise <= self.MAX_NOISE_THRESHOLD
        return is_clean, noise

    def check_face_contrast(self, face_image):
        """בדיקת ניגודיות בתמונת הפנים"""
        if face_image is None or face_image.size == 0:
            return False, 0

        gray = cv2.cvtColor(face_image, cv2.COLOR_BGR2GRAY)
        min_val, max_val = np.min(gray), np.max(gray)

        # מניעת חלוקה באפס
        if max_val + min_val == 0:
            return False, 0

        contrast = max_val - min_val
        has_good_contrast = contrast >= self.MIN_CONTRAST
        return has_good_contrast, contrast

    def extract_faces(self):
        """
        מחלצת פנים מתמונות ב-Cloudinary ומעלה אותם חזרה
        רק אם מודל YOLO זמין
        """

        # בדיקה שמודל YOLO זמין
        if self.yolo_model is None:
            print_status("⚠️ מודל YOLO לא זמין, מדלג על חילוץ פנים")
            return 0

        try:
            print_status(f"🔍 התחלת סריקת תמונה: {self.image_url}", emoji="☁️")

            # איפוס משתנים
            self.extracted_faces = []
            self.faces_count = 0

            # אם זה URL ישיר של תמונה
            if isinstance(self.image_url, str) and (
                    self.image_url.startswith('http') or self.image_url.startswith('https')):
                try:
                    print_status(f"מעבד תמונה: {self.image_url}", level=1)

                    # הורדת התמונה מ-URL
                    response = requests.get(self.image_url)
                    if response.status_code != 200:
                        print_status(f"לא ניתן להוריד את התמונה", level=1, emoji="❌")
                        return 0

                    # המרה ל-OpenCV format
                    image_bytes = BytesIO(response.content)
                    image_array = np.frombuffer(image_bytes.getvalue(), np.uint8)
                    img = cv2.imdecode(image_array, cv2.IMREAD_COLOR)

                    if img is None:
                        print_status(f"לא ניתן לטעון את התמונה", level=1, emoji="❌")
                        return 0

                    # זיהוי פנים
                    image_area = img.shape[0] * img.shape[1]
                    results = self.yolo_model(img, verbose=False)[0]

                    # בדיקה שיש boxes
                    if not hasattr(results, 'boxes') or results.boxes is None:
                        print_status(f"לא נמצאו פנים בתמונה", level=2)
                        return 0

                    num_faces = len(results.boxes)
                    print_status(f"נמצאו {num_faces} פנים בתמונה", level=1)

                    faces_saved = 0

                    for i, box in enumerate(results.boxes):
                        x1, y1, x2, y2 = map(int, box.xyxy[0])

                        # בדיקה שהקואורדינטות תקינות
                        if x2 <= x1 or y2 <= y1:
                            continue

                        face_area = (x2 - x1) * (y2 - y1)
                        face = img[y1:y2, x1:x2]

                        # בדיקה שהפנים לא ריקות
                        if face.size == 0:
                            continue

                        # בדיקות איכות
                        size_ok, face_ratio = self.check_face_size(face_area, image_area)
                        sharpness_ok, sharpness = self.check_face_sharpness(face)
                        noise_ok, noise = self.check_face_noise(face)
                        contrast_ok, contrast = self.check_face_contrast(face)

                        # אם כל הבדיקות עברו בהצלחה
                        if (size_ok and sharpness_ok and noise_ok and contrast_ok):
                            try:
                                # המרת התמונה ל-bytes להעלאה
                                _, img_encoded = cv2.imencode('.jpg', face)
                                img_bytes = img_encoded.tobytes()

                                # יצירת שם ייחודי לפנים
                                face_filename = f"extracted_face_{self.camera_number}_{self.faces_count + 1}_{i}"

                                # העלאה ל-Cloudinary
                                upload_result = cloudinary.uploader.upload(
                                    img_bytes,
                                    public_id=f"extracted_faces/{face_filename}",
                                    resource_type="image",
                                    folder="extracted_faces"
                                )

                                # שמירת ה-public_id במערך
                                face_public_id = upload_result['public_id']
                                self.extracted_faces.append(face_public_id)
                                self.faces_count += 1
                                faces_saved += 1

                                print_status(f"✅ פנים נשמרו: {face_public_id}", level=2)

                            except Exception as upload_error:
                                print_status(f"שגיאה בהעלאת פנים: {str(upload_error)}", level=2, emoji="⚠️")
                                continue

                    print_status(f"✅ חולצו {faces_saved} פנים איכותיות מהתמונה", level=1)
                    return faces_saved

                except Exception as img_error:
                    print_status(f"שגיאה בעיבוד התמונה: {str(img_error)}", emoji="⚠️")
                    return 0
            else:
                print_status("⚠️ פורמט URL לא נתמך לחילוץ פנים", emoji="❌")
                return 0

        except Exception as e:
            print_status(f"שגיאה כללית בחילוץ פנים: {str(e)}", emoji="❌")
            return 0

    def get_image_url(self):
        """מחזיר URL של התמונה"""
        return self.image_url

    def get_faces_count(self):
        """מחזיר מספר פנים שחולצו"""
        return self.faces_count

    def get_extracted_faces_urls(self):
        """מחזיר רשימת URLs של פנים שחולצו"""
        return self.extracted_faces

    def enable_face_detection_later(self, yolo_model_path="yolov8n-face.pt"):
        """מאפשר הפעלת זיהוי פנים לאחר יצירת האובייקט"""
        try:
            if os.path.exists(yolo_model_path):
                self.yolo_model = YOLO(yolo_model_path)
                print_status(f"✅ מודל YOLO נטען בהצלחה: {yolo_model_path}")
                return self.extract_faces()  # מבצע חילוץ פנים
            else:
                print_status(f"❌ קובץ מודל YOLO לא נמצא: {yolo_model_path}")
                return 0
        except Exception as e:
            print_status(f"❌ שגיאה בטעינת מודל YOLO: {str(e)}")
            return 0