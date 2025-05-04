import os
import glob
import cv2
import numpy as np
from ultralytics import YOLO
import time
from tabulate import tabulate


def print_status(message, level=0, emoji=""):
    """
    הדפסת הודעות סטטוס בצורה ברורה ומאורגנת

    Args:
        message (str): ההודעה להדפסה
        level (int): רמת ההיררכיה (כמה רווחים להוסיף)
        emoji (str): אימוג'י אופציונלי להוספה בתחילת ההודעה
    """
    indent = "    " * level
    if emoji:
        print(f"{indent}{emoji} {message}")
    else:
        print(f"{indent}{message}")


class FaceExtractor:
    def __init__(self, model_path='./face_yolov8n.pt', output_dir="./EnviroFaces"):
        """
        אתחול מחלץ הפנים

        Args:
            model_path (str): הנתיב למודל YOLO
            output_dir (str): תיקיית הפלט לשמירת הפנים שזוהו
        """
        print_status("מאתחל מערכת חילוץ פנים...", emoji="🚀")
        self.yolo_model = YOLO(model_path)
        self.output_dir = output_dir

        # יצירת תיקיית הפלט אם לא קיימת
        if not os.path.exists(self.output_dir):
            os.makedirs(self.output_dir)
            print_status(f"נוצרה תיקיית פלט חדשה: {self.output_dir}", level=1, emoji="📁")

        # ערכי סף לבדיקות איכות
        self.FACE_SIZE_THRESHOLD = 0.000
        self.MIN_SHARPNESS = 000
        self.MAX_NOISE_THRESHOLD = 100
        self.MIN_CONTRAST = 0.0

    def check_face_size(self, face_area, image_area):
        """בדיקת גודל הפנים ביחס לתמונה"""
        face_ratio = face_area / image_area

        is_big_enough = face_ratio >= self.FACE_SIZE_THRESHOLD
        if is_big_enough:
            return is_big_enough, face_ratio
        else:
            return is_big_enough, face_ratio

    def check_face_sharpness(self, face_image):
        """בדיקת חדות הפנים בתמונה"""
        gray = cv2.cvtColor(face_image, cv2.COLOR_BGR2GRAY)
        sharpness = cv2.Laplacian(gray, cv2.CV_64F).var()

        is_sharp = sharpness >= self.MIN_SHARPNESS
        return is_sharp, sharpness

    def check_face_noise(self, face_image):
        """בדיקת רמת הרעש בתמונת הפנים"""
        gray = cv2.cvtColor(face_image, cv2.COLOR_BGR2GRAY)
        noise = cv2.meanStdDev(gray)[1][0][0]

        is_clean = noise <= self.MAX_NOISE_THRESHOLD
        return is_clean, noise

    def check_face_contrast(self, face_image):
        """בדיקת ניגודיות בתמונת הפנים"""
        gray = cv2.cvtColor(face_image, cv2.COLOR_BGR2GRAY)
        min_val, max_val = np.min(gray), np.max(gray)
        contrast = (max_val - min_val) / (max_val + min_val + 1e-6)  # מניעת חלוקה באפס

        has_good_contrast = contrast >= self.MIN_CONTRAST
        return has_good_contrast, contrast

    def extract_faces_from_directory(self, directory_path):
        """
        חיתוך ושמירת הפנים מכל התמונות בתיקייה

        Args:
            directory_path (str): הנתיב לתיקייה המכילה תמונות לעיבוד

        Returns:
            int: מספר הפנים שחולצו בהצלחה
        """
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

            print_status(f"🔍 התחלת סריקת תיקייה: {os.path.basename(directory_path)}", emoji="📁")
            print_status(f"נמצאו {len(image_files)} תמונות לסריקה", level=1)

            # מידע לסיכום
            total_faces_found = 0
            images_with_faces = []
            start_time = time.time()

            for img_path in image_files:
                try:
                    img = cv2.imread(img_path)
                    if img is None:
                        print_status(f"לא ניתן לטעון את התמונה: {os.path.basename(img_path)}", level=1, emoji="❌")
                        continue

                    image_area = img.shape[0] * img.shape[1]
                    results = self.yolo_model(img, verbose=False)[0]
                    image_name = os.path.basename(img_path)
                    num_faces = len(results.boxes)

                    # שומר מידע על התמונה
                    if num_faces > 0:
                        total_faces_found += num_faces
                        images_with_faces.append((image_name, num_faces))

                    faces_saved_from_image = 0

                    for i, box in enumerate(results.boxes):
                        x1, y1, x2, y2 = map(int, box.xyxy[0])
                        face_area = (x2 - x1) * (y2 - y1)
                        face = img[y1:y2, x1:x2]

                        # בדיקות איכות
                        size_ok, face_ratio = self.check_face_size(face_area, image_area)
                        sharpness_ok, sharpness = self.check_face_sharpness(face)
                        noise_ok, noise = self.check_face_noise(face)
                        contrast_ok, contrast = self.check_face_contrast(face)

                        # אם כל הבדיקות עברו בהצלחה
                        if (size_ok and sharpness_ok and noise_ok and contrast_ok):
                            face_path = f"{self.output_dir}/face_{len(os.listdir(self.output_dir)) + 1}.jpg"
                            cv2.imwrite(face_path, face)
                            extracted_faces_count += 1
                            faces_saved_from_image += 1

                except Exception as img_error:
                    print_status(f"שגיאה בעיבוד תמונה {os.path.basename(img_path)}: {str(img_error)}", emoji="⚠️")
                    continue

            # סיכום בטבלה
            elapsed_time = time.time() - start_time

            print_status(f"📊 סיכום סריקת תיקייה: נסרקו {len(image_files)} תמונות, נמצאו {total_faces_found} פנים",
                         emoji="✅")

            if images_with_faces:
                table_data = [[i + 1, name, count] for i, (name, count) in enumerate(images_with_faces)]
                headers = ["מספר פנים", "שם קובץ", "#"]
                print("\n" + tabulate(table_data, headers=headers, tablefmt="grid", stralign="center"))

            print_status(f"סה\"כ חולצו {extracted_faces_count} פנים איכותיות ונשמרו במאגר", level=1)
            print_status(f"⏱️ זמן סריקה כולל: {elapsed_time:.2f} שניות", emoji="✅")

            return extracted_faces_count

        except Exception as e:
            print_status(f"שגיאה בעיבוד התיקייה: {str(e)}", emoji="❌")
            return extracted_faces_count

# מאפשר להריץ את הקובץ גם כתסריט עצמאי
if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description='חילוץ פנים מתיקיית תמונות')
    parser.add_argument('--input_dir', type=str, required=True, help='תיקיית הקלט המכילה תמונות')
    parser.add_argument('--output_dir', type=str, default='./EnviroFaces', help='תיקיית הפלט לשמירת הפנים')
    parser.add_argument('--model_path', type=str, default='./face_yolov8n.pt', help='נתיב למודל YOLO')

    args = parser.parse_args()

    extractor = FaceExtractor(model_path=args.model_path, output_dir=args.output_dir)
    num_faces = extractor.extract_faces_from_directory(args.input_dir)

    print(f"סה\"כ חולצו {num_faces} פנים")