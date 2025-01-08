from ultralytics import YOLO
from deepface import DeepFace
from tensorflow.keras import Model, Sequential
from tensorflow.keras.layers import Dense, Conv2D, MaxPooling2D, Flatten, Input, Lambda
from sklearn.model_selection import train_test_split
import tensorflow as tf
import numpy as np
import cv2
import os
import glob

FIRST_THRESHOLD = 0.45
SECOND_THRESHOLD = 0.25
THIRD_THRESHOLD = 0.5
FACE_SIZE_THRESHOLD = 0.000
MIN_SHARPNESS = 000
MAX_NOISE_THRESHOLD = 100
MIN_CONTRAST = 0.0


class FaceDetection:
    def __init__(self, target_image_path="target.jpg"):
        self.yolo_model = YOLO('./face_yolov8n.pt')
        self.enviro_faces_dir = "./EnviroFaces"

        # ניסיון לטעון מודל Siamese קיים
        self.siamese_model = None
        #try:
        #    self.siamese_model = tf.keras.models.load_model('siamese_model.h5')
        #    print("Loaded existing Siamese model")
        #except:
        #    print("No existing Siamese model found")

        # יצירת תיקיית המאגר אם לא קיימת
        if not os.path.exists(self.enviro_faces_dir):
            os.makedirs(self.enviro_faces_dir)

    def clear_directory(self, directory_path):
        """מחיקת כל הקבצים מתיקייה לפי נתיב שהתקבל

        Args:
            directory_path (str): הנתיב לתיקייה שרוצים למחוק ממנה את הקבצים
        """
        try:
            # בדיקה שהתיקייה קיימת
            if not os.path.exists(directory_path):
                print(f"Directory {directory_path} does not exist")
                return

            # מחיקת כל הקבצים בתיקייה
            files = glob.glob(f"{directory_path}/*.*")  # תומך בכל סוגי הקבצים, לא רק jpg
            for file in files:
                try:
                    os.remove(file)
                    print(f"Deleted: {file}")
                except Exception as e:
                    print(f"Error deleting {file}: {str(e)}")

            print(f"Successfully cleared {len(files)} files from {directory_path}")

        except Exception as e:
            print(f"Error clearing directory: {str(e)}")

    def check_face_size(self, face_area, image_area):
        """בדיקת גודל הפנים ביחס לתמונה"""
        face_ratio = face_area / image_area

        is_big_enough = face_ratio >= FACE_SIZE_THRESHOLD
        if is_big_enough:
            print(f"Face passed size check (ratio: {face_ratio:.2%})")
        else:
            print(f"Face failed size check (ratio: {face_ratio:.2%})")

        return is_big_enough

    def check_face_sharpness(self, face_image):
        """בדיקת חדות הפנים בתמונה"""
        gray = cv2.cvtColor(face_image, cv2.COLOR_BGR2GRAY)
        sharpness = cv2.Laplacian(gray, cv2.CV_64F).var()

        is_sharp = sharpness >= MIN_SHARPNESS
        if is_sharp:
            print(f"Face passed sharpness check (value: {sharpness:.2f})")
        else:
            print(f"Face failed sharpness check (value: {sharpness:.2f})")

        return is_sharp

    def check_face_noise(self, face_image):
        """בדיקת רמת הרעש בתמונת הפנים"""
        gray = cv2.cvtColor(face_image, cv2.COLOR_BGR2GRAY)
        noise = cv2.meanStdDev(gray)[1][0][0]

        is_clean = noise <= MAX_NOISE_THRESHOLD
        if is_clean:
            print(f"Face passed noise check (value: {noise:.2f})")
        else:
            print(f"Face failed noise check (value: {noise:.2f})")

        return is_clean

    def check_face_contrast(self, face_image):
        """בדיקת ניגודיות בתמונת הפנים"""
        gray = cv2.cvtColor(face_image, cv2.COLOR_BGR2GRAY)
        min_val, max_val = np.min(gray), np.max(gray)
        contrast = (max_val - min_val) / (max_val + min_val + 1e-6)  # מניעת חלוקה באפס

        has_good_contrast = contrast >= MIN_CONTRAST
        if has_good_contrast:
            print(f"Face passed contrast check (value: {contrast:.2f})")
        else:
            print(f"Face failed contrast check (value: {contrast:.2f})")

        return has_good_contrast

    def extract_faces_from_directory(self, directory_path):
        """חיתוך ושמירת הפנים מכל התמונות בתיקייה"""
        try:
            if not os.path.exists(directory_path):
                raise Exception(f"Directory not found: {directory_path}")

            image_extensions = ['.jpg', '.jpeg', '.png']
            image_files = []
            for ext in image_extensions:
                image_files.extend(glob.glob(os.path.join(directory_path, f'*{ext}')))

            if not image_files:
                print("No image files found in directory")
                return

            print(f"Found {len(image_files)} images in directory")

            for img_path in image_files:
                try:
                    print(f"\nProcessing image: {img_path}")
                    img = cv2.imread(img_path)
                    if img is None:
                        print(f"Could not load image: {img_path}")
                        continue

                    image_area = img.shape[0] * img.shape[1]
                    results = self.yolo_model(img)[0]
                    print(f"Found {len(results.boxes)} faces in {os.path.basename(img_path)}")

                    for i, box in enumerate(results.boxes):
                        x1, y1, x2, y2 = map(int, box.xyxy[0])
                        face_area = (x2 - x1) * (y2 - y1)
                        face = img[y1:y2, x1:x2]

                        # בדיקות איכות
                        if (self.check_face_size(face_area, image_area) and
                                self.check_face_sharpness(face) and
                                self.check_face_noise(face) and
                                self.check_face_contrast(face)):
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

    def verify_face_second(self, img1_path, img2_path):
        """פונקציה שנייה להשוואת פנים - משתמשת בDeepFace עם מודל אחר"""
        try:
            result = DeepFace.verify(
                img1_path=img1_path,
                img2_path=img2_path,
                enforce_detection=False,
                detector_backend='retinaface',
                model_name='VGG-Face',  # מודל שונה מהראשון
                distance_metric='cosine',
                align=True
            )
            return 1 - result['distance']
        except Exception as e:
            print(f"Error during second face verification: {str(e)}")
            return 0

    def check_single_image(self, personal_image_path):
        """בדיקת התאמה בין תמונה אישית למאגר הפנים - עם שלוש שכבות אימות"""
        try:
            faces_in_db = glob.glob(f"{self.enviro_faces_dir}/*.jpg")
            if not faces_in_db:
                print("No faces found in database")
                return False

            if not os.path.exists(personal_image_path):
                print(f"Personal image not found: {personal_image_path}")
                return False

            parent_dir = os.path.basename(os.path.dirname(personal_image_path))
            identified_dir = "./Identified_Images"
            if not os.path.exists(identified_dir):
                os.makedirs(identified_dir)

            found_match = False
            matched_faces = []

            for face_in_db in faces_in_db:
                # בדיקה ראשונה עם Facenet512
                first_similarity = self.verify_face(personal_image_path, face_in_db)
                print(f"First check similarity with {face_in_db}: {first_similarity:.2%}")

                # אם עברנו את הסף הראשון, מבצעים בדיקה נוספת עם VGG-Face
                if first_similarity >= FIRST_THRESHOLD:
                    second_similarity = self.verify_face_second(personal_image_path, face_in_db)
                    print(f"Second check similarity with {face_in_db}: {second_similarity:.2%}")

                    # אם עברנו גם את הסף השני ויש לנו מודל Siamese
                    if second_similarity >= SECOND_THRESHOLD and self.siamese_model is not None:
                        # הכנת התמונות למודל Siamese
                        img1 = cv2.imread(personal_image_path)
                        img2 = cv2.imread(face_in_db)
                        if img1 is not None and img2 is not None:
                            img1 = cv2.resize(img1, (105, 105))
                            img2 = cv2.resize(img2, (105, 105))
                            img1 = img1.astype('float32') / 255.0
                            img2 = img2.astype('float32') / 255.0
                            img1 = np.expand_dims(img1, axis=0)
                            img2 = np.expand_dims(img2, axis=0)

                            # בדיקה עם מודל Siamese
                            siamese_similarity = float(self.siamese_model.predict([img1, img2])[0])
                            print(f"Siamese similarity with {face_in_db}: {siamese_similarity:.2%}")

                            # רק אם כל שלוש הבדיקות עוברות את הסף
                            if siamese_similarity >= THIRD_THRESHOLD:  # סף למודל Siamese
                                matched_faces.append(face_in_db)
                                found_match = True
                        else:
                            print("Could not load images for Siamese comparison")
                    else:
                        # אם אין מודל Siamese, נסתמך רק על שתי הבדיקות הראשונות
                        if second_similarity >= SECOND_THRESHOLD:
                            matched_faces.append(face_in_db)
                            found_match = True

            if found_match:
                for face_in_db in matched_faces:
                    try:
                        import shutil
                        original_number = os.path.basename(face_in_db).split('_')[-1].split('.')[0]
                        new_filename = f"{parent_dir}_{original_number}.jpg"
                        new_path = os.path.join(identified_dir, new_filename)

                        shutil.copy2(face_in_db, new_path)
                        print(f"Matched face copied to: {new_path}")
                        os.remove(face_in_db)
                        print(f"Matched face removed from EnviroFaces: {face_in_db}")
                    except Exception as file_error:
                        print(f"Error handling files: {str(file_error)}")

            return found_match

        except Exception as e:
            print(f"Error in check_single_image: {str(e)}")
            return False

    def create_siamese_network(self, input_shape=(105, 105, 3)):
        """יצירת מודל בסיסי של Siamese Network"""

        def create_base_network():
            model = Sequential([
                Conv2D(64, (10, 10), activation='relu', input_shape=input_shape),
                MaxPooling2D(),
                Conv2D(128, (7, 7), activation='relu'),
                MaxPooling2D(),
                Conv2D(128, (4, 4), activation='relu'),
                MaxPooling2D(),
                Conv2D(256, (4, 4), activation='relu'),
                Flatten(),
                Dense(4096, activation='relu')
            ])
            return model

        base_network = create_base_network()

        input_a = Input(shape=input_shape)
        input_b = Input(shape=input_shape)

        processed_a = base_network(input_a)
        processed_b = base_network(input_b)

        distance = Lambda(lambda x: tf.keras.backend.abs(x[0] - x[1]))([processed_a, processed_b])
        prediction = Dense(1, activation='sigmoid')(distance)

        return Model(inputs=[input_a, input_b], outputs=prediction)

    def prepare_data(self, base_dir):
        """הכנת נתוני אימון מתיקייה"""
        pairs = []  # זוגות תמונות
        labels = []  # תוויות (1 לאותו אדם, 0 לאנשים שונים)

        person_dirs = [d for d in os.listdir(base_dir) if os.path.isdir(os.path.join(base_dir, d))]

        for person in person_dirs:
            person_dir = os.path.join(base_dir, person)
            person_images = [f for f in os.listdir(person_dir) if f.endswith('.jpg')]

            if len(person_images) < 2:
                continue

            # יצירת זוגות חיוביים (אותו אדם)
            for i in range(len(person_images) - 1):
                for j in range(i + 1, len(person_images)):
                    img1 = cv2.imread(os.path.join(person_dir, person_images[i]))
                    img2 = cv2.imread(os.path.join(person_dir, person_images[j]))

                    img1 = cv2.resize(img1, (105, 105))
                    img2 = cv2.resize(img2, (105, 105))

                    pairs.append([img1, img2])
                    labels.append(1)

            # יצירת זוגות שליליים (אנשים שונים)
            other_people = [p for p in person_dirs if p != person]
            for other_person in np.random.choice(other_people, min(len(person_images), len(other_people))):
                other_dir = os.path.join(base_dir, other_person)
                other_images = [f for f in os.listdir(other_dir) if f.endswith('.jpg')]

                if not other_images:
                    continue

                img1 = cv2.imread(os.path.join(person_dir, np.random.choice(person_images)))
                img2 = cv2.imread(os.path.join(other_dir, np.random.choice(other_images)))

                img1 = cv2.resize(img1, (105, 105))
                img2 = cv2.resize(img2, (105, 105))

                pairs.append([img1, img2])
                labels.append(0)

        return np.array(pairs), np.array(labels)

    def train_siamese_network(self, base_dir, epochs=20, batch_size=32):
        """אימון הרשת"""
        # יצירת המודל
        self.siamese_model = self.create_siamese_network()

        # הגדרת האופטימייזר והלוס
        self.siamese_model.compile(
            optimizer='adam',
            loss='binary_crossentropy',
            metrics=['accuracy']
        )

        # הכנת הנתונים
        pairs, labels = self.prepare_data(base_dir)

        # חלוקה לאימון ובדיקה
        train_pairs, test_pairs, train_labels, test_labels = train_test_split(
            pairs, labels, test_size=0.2, random_state=42
        )

        # אימון המודל
        history = self.siamese_model.fit(
            [train_pairs[:, 0], train_pairs[:, 1]], train_labels,
            validation_data=([test_pairs[:, 0], test_pairs[:, 1]], test_labels),
            batch_size=batch_size,
            epochs=epochs
        )

        # שמירת המודל
        self.siamese_model.save('siamese_model.h5')

        return self.siamese_model, history

    def verify_person_images(self, person_details):
        """
        בדיקת התאמה בין תמונות מאומתות של אדם לתמונות שזוהו כשלו

        Args:
            person_details (str): מחרוזת המכילה "שם_פרטי שם_משפחה תעודת_זהות"

        Returns:
            dict: מילון עם תוצאות ההשוואה לכל תמונה
        """
        try:
            first_name, last_name, id_number = person_details.split()
            person_id = f"{first_name}_{last_name}_{id_number}"

            verified_dir = f"./{person_id}"
            if not os.path.exists(verified_dir):
                print(f"No verified images directory found for {person_id}")
                return {}

            verified_images = glob.glob(f"{verified_dir}/*.jpg")
            if not verified_images:
                print(f"No verified images found in {verified_dir}")
                return {}

            identified_pattern = f"./Identified_Images/{person_id}_*.jpg"
            identified_images = glob.glob(identified_pattern)
            if not identified_images:
                print(f"No identified images found for {person_id}")
                return {}

            print(f"Found {len(verified_images)} verified images and {len(identified_images)} identified images")

            results = {}

            for identified_img in identified_images:
                img_results = {
                    'verified_matches': [],
                    'highest_similarity': 0,
                    'average_similarity': 0,
                    'passed_threshold': False
                }

                similarities = []

                for verified_img in verified_images:
                    first_check = self.verify_face(identified_img, verified_img)
                    if first_check >= FIRST_THRESHOLD:
                        second_check = self.verify_face_second(identified_img, verified_img)
                        if second_check >= SECOND_THRESHOLD:
                            similarity = (first_check + second_check) / 2
                            similarities.append(similarity)
                            img_results['verified_matches'].append({
                                'verified_image': os.path.basename(verified_img),
                                'similarity': similarity
                            })

                if similarities:
                    img_results['highest_similarity'] = max(similarities)
                    img_results['average_similarity'] = sum(similarities) / len(similarities)
                    img_results['passed_threshold'] = img_results['highest_similarity'] >= (
                            (FIRST_THRESHOLD + SECOND_THRESHOLD) / 2)

                results[os.path.basename(identified_img)] = img_results

                print(f"\nResults for {os.path.basename(identified_img)}:")
                print(f"Matches found: {len(img_results['verified_matches'])}")
                print(f"Highest similarity: {img_results['highest_similarity']:.2%}")
                print(f"Average similarity: {img_results['average_similarity']:.2%}")
                print(f"Passed threshold: {img_results['passed_threshold']}")

            return results

        except Exception as e:
            print(f"Error in verify_person_images: {str(e)}")
            return {}
