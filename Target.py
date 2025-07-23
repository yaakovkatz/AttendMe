import os
import cv2
import numpy as np
from ultralytics import YOLO
import requests
from io import BytesIO
import cloudinary
import cloudinary.uploader
import cloudinary.api
from datetime import datetime


def print_status(message, emoji="ℹ️", level=0):
    """פונקציה להדפסת סטטוס עם רמות הזחה"""
    indent = "  " * level
    print(f"{indent}{emoji} {message}")


class Target:
    def __init__(self, camera_number, images_url, yolo_model_path="yolov8n-face.pt",
                 enable_face_detection=False, school_id=None):
        # מידע בסיסי
        self.camera_number = camera_number
        self.image_url = images_url
        self.school_id = school_id  # קישור לבית ספר

        # מידע נוסף
        self.created_at = datetime.now()
        self.last_updated = datetime.now()
        self.camera_location = ""  # מיקום המצלמה
        self.camera_description = ""  # תיאור המצלמה

        # סטטוס
        self._is_checked = False
        self.is_active = True

        # נתוני פנים
        self.extracted_faces = []
        self.faces_count = 0
        self.yolo_model = None

        # ערכי סף לבדיקות איכות
        self.FACE_SIZE_THRESHOLD = 0.01  # 1% מגודל התמונה
        self.MIN_SHARPNESS = 100
        self.MAX_NOISE_THRESHOLD = 50
        self.MIN_CONTRAST = 30

        # סטטיסטיקות
        self.total_faces_detected = 0
        self.quality_faces_saved = 0
        self.last_detection_time = None

        print_status(f"✅ נוצרה מטרה חדשה: מצלמה {camera_number}")

        # טעינת מודל YOLO רק אם נדרש ואם הקובץ קיים
        if enable_face_detection:
            self.enable_face_detection_now(yolo_model_path)

    @property
    def is_checked(self):
        """getter לסטטוס בדיקה"""
        return self._is_checked

    @is_checked.setter
    def is_checked(self, value):
        """setter לסטטוס בדיקה"""
        self._is_checked = value
        if value:
            self.last_updated = datetime.now()

    @property
    def image_urls(self):
        """מחזיר רשימת URLs של תמונות (תאימות לקוד הקיים)"""
        if isinstance(self.image_url, list):
            return self.image_url
        else:
            return [self.image_url] if self.image_url else []

    # --- פונקציות חדשות לניהול ---

    def set_camera_info(self, location="", description=""):
        """קביעת מידע על המצלמה"""
        self.camera_location = location
        self.camera_description = description
        self.last_updated = datetime.now()
        print_status(f"✅ מידע מצלמה עודכן: {self.camera_number}")

    def activate(self):
        """הפעלת המצלמה"""
        self.is_active = True
        self.last_updated = datetime.now()
        print_status(f"✅ מצלמה {self.camera_number} הופעלה")

    def deactivate(self):
        """השבתת המצלמה"""
        self.is_active = False
        self.last_updated = datetime.now()
        print_status(f"⚠️ מצלמה {self.camera_number} הושבתה")

    def get_target_summary(self):
        """קבלת סיכום המטרה"""
        return {
            "camera_number": self.camera_number,
            "school_id": self.school_id,
            "location": self.camera_location,
            "description": self.camera_description,
            "is_active": self.is_active,
            "faces_count": self.faces_count,
            "quality_faces": self.quality_faces_saved,
            "last_updated": self.last_updated.strftime("%d/%m/%Y %H:%M")
        }

    def get_target_details(self):
        """קבלת פרטי המטרה המלאים"""
        return {
            "basic_info": {
                "camera_number": self.camera_number,
                "school_id": self.school_id,
                "camera_location": self.camera_location,
                "camera_description": self.camera_description,
                "is_active": self.is_active
            },
            "images": {
                "image_url": self.image_url,
                "image_urls": self.image_urls
            },
            "face_detection": {
                "faces_count": self.faces_count,
                "extracted_faces": self.extracted_faces,
                "total_detected": self.total_faces_detected,
                "quality_saved": self.quality_faces_saved,
                "model_loaded": self.yolo_model is not None
            },
            "timestamps": {
                "created_at": self.created_at.isoformat(),
                "last_updated": self.last_updated.isoformat(),
                "last_detection": self.last_detection_time.isoformat() if self.last_detection_time else None
            },
            "status": {
                "is_checked": self.is_checked
            }
        }

    # --- פונקציות בדיקת איכות קיימות ---

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

    # --- פונקציות חילוץ פנים מעודכנות ---

    def enable_face_detection_now(self, yolo_model_path="yolov8n-face.pt"):
        """הפעלת זיהוי פנים"""
        try:
            if os.path.exists(yolo_model_path):
                self.yolo_model = YOLO(yolo_model_path)
                print_status(f"✅ מודל YOLO נטען בהצלחה: {yolo_model_path}")
                return True
            else:
                print_status(f"❌ קובץ מודל YOLO לא נמצא: {yolo_model_path}")
                return False
        except Exception as e:
            print_status(f"❌ שגיאה בטעינת מודל YOLO: {str(e)}")
            return False

    def extract_faces(self):
        """
        מחלצת פנים מתמונות ב-Cloudinary ומעלה אותם חזרה
        גרסה מעודכנת עם סטטיסטיקות וקישור לבית ספר
        """
        # בדיקה שמודל YOLO זמין
        if self.yolo_model is None:
            print_status("⚠️ מודל YOLO לא זמין, מדלג על חילוץ פנים")
            return 0

        if not self.is_active:
            print_status(f"⚠️ מצלמה {self.camera_number} לא פעילה, מדלג על חילוץ פנים")
            return 0

        try:
            print_status(f"🔍 התחלת סריקת תמונה: מצלמה {self.camera_number}", emoji="☁️")

            # איפוס משתנים
            self.extracted_faces = []
            old_faces_count = self.faces_count
            self.faces_count = 0

            # אם זה URL ישיר של תמונה
            if isinstance(self.image_url, str) and (
                    self.image_url.startswith('http') or self.image_url.startswith('https')):
                try:
                    print_status(f"מעבד תמונה: {self.image_url}", level=1)

                    # הורדת התמונה מ-URL
                    response = requests.get(self.image_url, timeout=15)
                    if response.status_code != 200:
                        print_status(f"לא ניתן להוריד את התמונה (קוד: {response.status_code})", level=1, emoji="❌")
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
                    print_status(f"מתחיל זיהוי פנים (גודל תמונה: {img.shape[1]}x{img.shape[0]})", level=1)

                    results = self.yolo_model(img, verbose=False)[0]

                    # בדיקה שיש boxes
                    if not hasattr(results, 'boxes') or results.boxes is None:
                        print_status(f"לא נמצאו פנים בתמונה", level=2)
                        return 0

                    num_faces = len(results.boxes)
                    self.total_faces_detected += num_faces
                    print_status(f"זוהו {num_faces} פנים בתמונה", level=1)

                    faces_saved = 0

                    for i, box in enumerate(results.boxes):
                        try:
                            x1, y1, x2, y2 = map(int, box.xyxy[0])

                            # בדיקה שהקואורדינטות תקינות
                            if x2 <= x1 or y2 <= y1:
                                print_status(f"קואורדינטות לא תקינות עבור פנים {i + 1}", level=2, emoji="⚠️")
                                continue

                            face_area = (x2 - x1) * (y2 - y1)
                            face = img[y1:y2, x1:x2]

                            # בדיקה שהפנים לא ריקות
                            if face.size == 0:
                                print_status(f"פנים ריקות עבור פנים {i + 1}", level=2, emoji="⚠️")
                                continue

                            # בדיקות איכות מפורטות
                            size_ok, face_ratio = self.check_face_size(face_area, image_area)
                            sharpness_ok, sharpness = self.check_face_sharpness(face)
                            noise_ok, noise = self.check_face_noise(face)
                            contrast_ok, contrast = self.check_face_contrast(face)

                            # דיווח על בדיקות איכות
                            print_status(f"פנים {i + 1}: גודל={'✓' if size_ok else '✗'}({face_ratio:.3f}), " +
                                         f"חדות={'✓' if sharpness_ok else '✗'}({sharpness:.0f}), " +
                                         f"רעש={'✓' if noise_ok else '✗'}({noise:.0f}), " +
                                         f"ניגודיות={'✓' if contrast_ok else '✗'}({contrast:.0f})", level=2)

                            # אם כל הבדיקות עברו בהצלחה
                            if (size_ok and sharpness_ok and noise_ok and contrast_ok):
                                try:
                                    # המרת התמונה ל-bytes להעלאה
                                    _, img_encoded = cv2.imencode('.jpg', face,
                                                                  [cv2.IMWRITE_JPEG_QUALITY, 95])
                                    img_bytes = img_encoded.tobytes()

                                    # יצירת שם ייחודי לפנים עם קישור לבית ספר
                                    timestamp = int(datetime.now().timestamp())
                                    face_filename = f"school_{self.school_id}/camera_{self.camera_number}/face_{timestamp}_{i}"

                                    # העלאה ל-Cloudinary
                                    upload_result = cloudinary.uploader.upload(
                                        img_bytes,
                                        public_id=f"extracted_faces/{face_filename}",
                                        resource_type="image",
                                        folder="extracted_faces",
                                        tags=[f"school_{self.school_id}", f"camera_{self.camera_number}"]
                                    )

                                    # שמירת ה-public_id במערך
                                    face_public_id = upload_result['public_id']
                                    self.extracted_faces.append(face_public_id)
                                    self.faces_count += 1
                                    self.quality_faces_saved += 1
                                    faces_saved += 1

                                    print_status(f"✅ פנים איכותיות נשמרו: {face_public_id}", level=2)

                                except Exception as upload_error:
                                    print_status(f"שגיאה בהעלאת פנים: {str(upload_error)}", level=2, emoji="⚠️")
                                    continue

                            else:
                                # פנים לא עברו בדיקות איכות
                                failed_checks = []
                                if not size_ok: failed_checks.append("גודל")
                                if not sharpness_ok: failed_checks.append("חדות")
                                if not noise_ok: failed_checks.append("רעש")
                                if not contrast_ok: failed_checks.append("ניגודיות")

                                print_status(f"פנים {i + 1} לא עברו בדיקות: {', '.join(failed_checks)}",
                                             level=2, emoji="🔍")

                        except Exception as face_error:
                            print_status(f"שגיאה בעיבוד פנים {i + 1}: {str(face_error)}", level=2, emoji="❌")
                            continue

                    # עדכון זמן בדיקה אחרון
                    self.last_detection_time = datetime.now()
                    self.last_updated = datetime.now()

                    # סיכום
                    improvement = faces_saved - old_faces_count
                    print_status(f"✅ הושלם חילוץ פנים למצלמה {self.camera_number}: " +
                                 f"{faces_saved} פנים איכותיות נשמרו " +
                                 f"({'+' if improvement >= 0 else ''}{improvement} יחסית לקודם)", level=1)

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

    # --- פונקציות קיימות עם שיפורים ---

    def get_image_url(self):
        """מחזיר URL של התמונה"""
        return self.image_url

    def get_faces_count(self):
        """מחזיר מספר פנים שחולצו"""
        return self.faces_count

    def get_extracted_faces_urls(self):
        """מחזיר רשימת URLs של פנים שחולצו"""
        return self.extracted_faces

    def get_detection_stats(self):
        """קבלת סטטיסטיקות זיהוי"""
        return {
            "total_detected": self.total_faces_detected,
            "quality_saved": self.quality_faces_saved,
            "current_faces": self.faces_count,
            "detection_rate": (self.quality_faces_saved / max(1, self.total_faces_detected)) * 100,
            "last_detection": self.last_detection_time.strftime(
                "%d/%m/%Y %H:%M") if self.last_detection_time else "לא בוצע",
            "model_loaded": self.yolo_model is not None
        }

    def clear_extracted_faces(self):
        """ניקוי פנים שחולצו (מבלי למחוק מהענן)"""
        self.extracted_faces = []
        self.faces_count = 0
        self.last_updated = datetime.now()
        print_status(f"🧹 נוקו פנים שמורים עבור מצלמה {self.camera_number}")

    def delete_extracted_faces_from_cloud(self):
        """מחיקת פנים שחולצו מהענן"""
        try:
            deleted_count = 0
            for face_id in self.extracted_faces:
                try:
                    cloudinary.uploader.destroy(face_id)
                    deleted_count += 1
                except:
                    pass  # ממשיך אם יש שגיאה במחיקת פנים ספציפיות

            self.extracted_faces = []
            self.faces_count = 0
            self.last_updated = datetime.now()

            print_status(f"🗑️ נמחקו {deleted_count} פנים מהענן עבור מצלמה {self.camera_number}")
            return deleted_count

        except Exception as e:
            print_status(f"❌ שגיאה במחיקת פנים מהענן: {str(e)}")
            return 0

    def export_to_dict(self):
        """ייצוא לדיקשנרי לשמירה"""
        return {
            "basic_info": {
                "camera_number": self.camera_number,
                "school_id": self.school_id,
                "camera_location": self.camera_location,
                "camera_description": self.camera_description,
                "is_active": self.is_active
            },
            "images": {
                "image_url": self.image_url,
                "image_urls": self.image_urls
            },
            "face_data": {
                "faces_count": self.faces_count,
                "extracted_faces": self.extracted_faces,
                "total_detected": self.total_faces_detected,
                "quality_saved": self.quality_faces_saved
            },
            "timestamps": {
                "created_at": self.created_at.isoformat(),
                "last_updated": self.last_updated.isoformat(),
                "last_detection": self.last_detection_time.isoformat() if self.last_detection_time else None
            },
            "status": {
                "is_checked": self.is_checked
            }
        }

    @classmethod
    def create_from_dict(cls, data_dict):
        """יצירת מטרה מדיקשנרי"""
        basic = data_dict.get("basic_info", {})
        images = data_dict.get("images", {})
        face_data = data_dict.get("face_data", {})
        timestamps = data_dict.get("timestamps", {})
        status = data_dict.get("status", {})

        # יצירת מטרה
        target = cls(
            camera_number=basic.get("camera_number"),
            images_url=images.get("image_url"),
            school_id=basic.get("school_id"),
            enable_face_detection=False
        )

        # עדכון נתונים
        target.camera_location = basic.get("camera_location", "")
        target.camera_description = basic.get("camera_description", "")
        target.is_active = basic.get("is_active", True)

        target.faces_count = face_data.get("faces_count", 0)
        target.extracted_faces = face_data.get("extracted_faces", [])
        target.total_faces_detected = face_data.get("total_detected", 0)
        target.quality_faces_saved = face_data.get("quality_saved", 0)

        target.is_checked = status.get("is_checked", False)

        # עדכון תאריכים
        try:
            if timestamps.get("created_at"):
                target.created_at = datetime.fromisoformat(timestamps["created_at"])
            if timestamps.get("last_updated"):
                target.last_updated = datetime.fromisoformat(timestamps["last_updated"])
            if timestamps.get("last_detection"):
                target.last_detection_time = datetime.fromisoformat(timestamps["last_detection"])
        except:
            pass

        return target

    def __str__(self):
        status = "פעילה" if self.is_active else "לא פעילה"
        return f"Target(camera={self.camera_number}, school={self.school_id}, faces={self.faces_count}, status={status})"

    def __repr__(self):
        return self.__str__()

    def __eq__(self, other):
        """השוואה בין מטרות לפי מספר מצלמה ובית ספר"""
        if not isinstance(other, Target):
            return False
        return self.camera_number == other.camera_number and self.school_id == other.school_id

    def __hash__(self):
        """מאפשר שימוש במטרה כמפתח בדיקשנרי או בסט"""
        return hash((self.camera_number, self.school_id))