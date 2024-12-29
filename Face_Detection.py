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

        # חיתוך הפנים מתמונת המטרה בעת יצירת המחלקה
        self.extract_faces_from_target(target_image_path)

    def extract_faces_from_target(self, target_path):
        """חיתוך ושמירת הפנים מתמונת המטרה"""
        try:
            if not os.path.exists(target_path):
                raise Exception(f"Target image not found: {target_path}")

            img = cv2.imread(target_path)
            if img is None:
                raise Exception("Could not load target image")

            results = self.yolo_model(img)[0]
            print(f"Found {len(results.boxes)} faces in target image")

            for i, box in enumerate(results.boxes):
                x1, y1, x2, y2 = map(int, box.xyxy[0])
                face = img[y1:y2, x1:x2]
                face_path = f"{self.enviro_faces_dir}/face_{len(os.listdir(self.enviro_faces_dir)) + 1}.jpg"
                cv2.imwrite(face_path, face)
                print(f"Saved face {i + 1} to {face_path}")

        except Exception as e:
            print(f"Error extracting faces from target: {str(e)}")

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

            # השוואה מול כל הפנים במאגר
            for face_in_db in faces_in_db:
                similarity = self.verify_face(personal_image_path, face_in_db)
                print(f"Comparing with {face_in_db}, similarity: {similarity:.2%}")
                if similarity >= threshold:
                    return True

            return False

        except Exception as e:
            print(f"Error in check_single_image: {str(e)}")
            return False