# Face_Detection.py
from ultralytics import YOLO
from deepface import DeepFace
import cv2
import os
import glob

class FaceDetection:
    def __init__(self, target_image_path="target.jpg"):
        self.yolo_model = YOLO('./face_yolov8n.pt')
        self.enviro_faces_dir = "./EnviroFaces"

        # יצירת תיקיית המאגר אם לא קיימת
        if not os.path.exists(self.enviro_faces_dir):
            os.makedirs(self.enviro_faces_dir)

    def clear_enviro_faces(self):
        """מחיקת כל התמונות מתיקיית EnviroFaces"""
        try:
            # בדיקה שהתיקייה קיימת
            if not os.path.exists(self.enviro_faces_dir):
                print(f"Directory {self.enviro_faces_dir} does not exist")
                return

            # מחיקת כל הקבצים בתיקייה
            files = glob.glob(f"{self.enviro_faces_dir}/*.jpg")
            for file in files:
                try:
                    os.remove(file)
                    print(f"Deleted: {file}")
                except Exception as e:
                    print(f"Error deleting {file}: {str(e)}")

            print(f"Successfully cleared {len(files)} files from {self.enviro_faces_dir}")

        except Exception as e:
            print(f"Error clearing directory: {str(e)}")

    def extract_faces_from_directory(self, directory_path):
        """חיתוך ושמירת הפנים מכל התמונות בתיקייה"""
        try:
            if not os.path.exists(directory_path):
                raise Exception(f"Directory not found: {directory_path}")

            # מציאת כל קבצי התמונה בתיקייה
            image_extensions = ['.jpg', '.jpeg', '.png']
            image_files = []
            for ext in image_extensions:
                image_files.extend(glob.glob(os.path.join(directory_path, f'*{ext}')))

            if not image_files:
                print("No image files found in directory")
                return

            print(f"Found {len(image_files)} images in directory")

            # עיבוד כל תמונה
            for img_path in image_files:
                try:
                    print(f"\nProcessing image: {img_path}")
                    img = cv2.imread(img_path)
                    if img is None:
                        print(f"Could not load image: {img_path}")
                        continue

                    results = self.yolo_model(img)[0]
                    print(f"Found {len(results.boxes)} faces in {os.path.basename(img_path)}")

                    # חיתוך ושמירת כל הפנים מהתמונה הנוכחית
                    for i, box in enumerate(results.boxes):
                        x1, y1, x2, y2 = map(int, box.xyxy[0])
                        face = img[y1:y2, x1:x2]

                        # שם הקובץ החדש יהיה פשוט face_X
                        face_path = f"{self.enviro_faces_dir}/face_{len(os.listdir(self.enviro_faces_dir)) + 1}.jpg"

                        cv2.imwrite(face_path, face)
                        print(f"Saved face {i + 1} from {os.path.basename(img_path)} to {face_path}")

                except Exception as img_error:
                    print(f"Error processing image {img_path}: {str(img_error)}")
                    continue

        except Exception as e:
            print(f"Error processing directory: {str(e)}")

    def verify_face(self, img1_path, img2_path):
        """פונקציה להשוואת שתי תמונות פנים"""
        try:
            result = DeepFace.verify(
                img1_path=img1_path,
                img2_path=img2_path,
                enforce_detection=False,
                detector_backend='retinaface',
                model_name='Facenet512',
                distance_metric='cosine',
                align=True
            )
            return 1 - result['distance']
        except Exception as e:
            print(f"Error during face verification: {str(e)}")
            return 0

    def check_single_image(self, personal_image_path, threshold=0.5):
        """בדיקת התאמה בין תמונה אישית למאגר הפנים"""
        try:
            # בדיקה שיש תמונות במאגר
            faces_in_db = glob.glob(f"{self.enviro_faces_dir}/*.jpg")
            if not faces_in_db:
                print("No faces found in database")
                return False

            # בדיקה שהתמונה האישית קיימת
            if not os.path.exists(personal_image_path):
                print(f"Personal image not found: {personal_image_path}")
                return False

            # שם התיקייה שבה נמצאת התמונה המקורית
            parent_dir = os.path.basename(os.path.dirname(personal_image_path))

            # יצירת תיקיית Identified Images אם לא קיימת
            identified_dir = "./Identified_Images"
            if not os.path.exists(identified_dir):
                os.makedirs(identified_dir)

            # משתנה לסימון אם נמצאה לפחות התאמה אחת
            found_match = False

            # השוואה מול כל הפנים במאגר
            matched_faces = []  # רשימה לשמירת הפנים המתאימות
            for face_in_db in faces_in_db:
                similarity = self.verify_face(personal_image_path, face_in_db)
                print(f"Comparing with {face_in_db}, similarity: {similarity:.2%}")
                if similarity >= threshold:
                    matched_faces.append(face_in_db)
                    found_match = True

            # אם נמצאו התאמות, מעבירים את כל התמונות המתאימות
            if found_match:
                # העברת התמונות המתאימות עם מספור רץ
                for i, face_in_db in enumerate(matched_faces, start=1):
                    try:
                        import shutil
                        # יצירת שם חדש עם מספר רץ
                        new_filename = f"{parent_dir}_{i}.jpg"
                        new_path = os.path.join(identified_dir, new_filename)

                        # העתקת הקובץ ל-Identified_Images עם השם החדש
                        shutil.copy2(face_in_db, new_path)
                        print(f"Matched face copied to: {new_path}")

                        # מחיקת הקובץ מ-EnviroFaces
                        os.remove(face_in_db)
                        print(f"Matched face removed from EnviroFaces: {face_in_db}")
                    except Exception as file_error:
                        print(f"Error handling files: {str(file_error)}")

            return found_match

        except Exception as e:
            print(f"Error in check_single_image: {str(e)}")
            return False
