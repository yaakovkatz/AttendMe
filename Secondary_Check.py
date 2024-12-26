# Secondary_Check.py
from ultralytics import YOLO
from deepface import DeepFace
import cv2
import os
import glob


class SecondaryCheck:
    def __init__(self):
        self.yolo_model = YOLO('./face_yolov8n.pt')

    def verify_face(self, known_img_path, face_path):
        try:
            result = DeepFace.verify(
                img1_path=known_img_path,
                img2_path=face_path,
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

    def draw_results(self, image, boxes, similarities):
        img_draw = image.copy()
        for i, (box, similarity) in enumerate(zip(boxes, similarities)):
            x1, y1, x2, y2 = map(int, box)

            # קביעת צבע לפי התאמה (ירוק מעל 50%, אדום מתחת)
            color = (0, 255, 0) if similarity >= 0.45 else (0, 0, 255)

            # ציור הריבוע
            cv2.rectangle(img_draw, (x1, y1), (x2, y2), color, 1)

            # הוספת טקסט עם מספר פנים ואחוז התאמה
            text = f"{i + 1}={similarity:.1%}"
            text_size = cv2.getTextSize(text, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 2)[0]

            text_x = x1 + (x2 - x1 - text_size[0]) // 2  # מרכוז אופקי
            text_y = y1 - 5  # מרווח מעל הריבוע

            # רקע לטקסט במרכז
            cv2.rectangle(img_draw, (text_x, y1 - text_size[1] - 10),
                          (text_x + text_size[0], y1), color, -1)

            # טקסט בלבן על הרקע הצבעוני
            cv2.putText(img_draw, text, (text_x, text_y),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)

        return img_draw

    def check(self, target_img_path):
        print("\n=== Starting Secondary Check (50% Threshold) ===")
        try:
            img = cv2.imread(target_img_path)
            if img is None:
                raise Exception("Could not load target image")

            known_faces = glob.glob("known_faces/*.jpg")
            if not known_faces:
                raise Exception("No reference images found in known_faces directory")

            print(f"Found {len(known_faces)} reference images")

            results = self.yolo_model(img)[0]
            max_avg_similarity = 0
            boxes = []
            final_similarities = []

            print(f"Found {len(results.boxes)} faces in image")

            for i, box in enumerate(results.boxes):
                print(f"\nProcessing face {i + 1}...")
                x1, y1, x2, y2 = map(int, box.xyxy[0])
                boxes.append([x1, y1, x2, y2])

                face = img[y1:y2, x1:x2]
                temp_path = f"temp_face_{i}.jpg"
                cv2.imwrite(temp_path, face)

                similarities = []
                for ref_img in known_faces:
                    similarity = self.verify_face(ref_img, temp_path)
                    ref_name = os.path.basename(ref_img)
                    print(f"Similarity with {ref_name}: {similarity:.2%}")
                    similarities.append(similarity)

                if similarities:
                    top_3_avg = sum(sorted(similarities, reverse=True)[:3]) / min(3, len(similarities))
                    print(f"Average of top 3 similarities for face {i + 1}: {top_3_avg:.2%}")
                    max_avg_similarity = max(max_avg_similarity, top_3_avg)
                    final_similarities.append(top_3_avg)
                else:
                    final_similarities.append(0)

                os.remove(temp_path)

            # ציור התוצאות על התמונה
            result_image = self.draw_results(img, boxes, final_similarities)

            # שמירת התמונה עם התוצאות
            output_path = "secondary_check_results.jpg"
            cv2.imwrite(output_path, result_image)
            print(f"\nResults visualization saved to {output_path}")

            found_match = max_avg_similarity >= 0.45
            print(f"\nSecondary check result: {'Match' if found_match else 'No match'}")
            print(f"Best average similarity score: {max_avg_similarity:.2%}")

            return found_match, max_avg_similarity

        except Exception as e:
            print(f"Error in secondary check: {str(e)}")
            return False, 0