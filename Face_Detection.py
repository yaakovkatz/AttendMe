from ultralytics import YOLO
from deepface import DeepFace
from tensorflow.keras import Model, Sequential
from tensorflow.keras.layers import Conv2D, MaxPooling2D, Dense, Flatten, Input, Lambda, BatchNormalization
from sklearn.model_selection import train_test_split
from tensorflow.keras.layers import Dropout
import tensorflow as tf
import numpy as np
import cv2
import os
import glob
import shutil
from tabulate import tabulate  # הוספת הספרייה לטבלה
import contextlib
import io

# ייבוא מהמודול החדש
from face_extraction import FaceExtractor, print_status

FIRST_THRESHOLD = 0.5
SECOND_THRESHOLD = 0.3
# הסרת THIRD_THRESHOLD = 0.65
FACE_SIZE_THRESHOLD = 0.000
MIN_SHARPNESS = 000
MAX_NOISE_THRESHOLD = 100
MIN_CONTRAST = 0.0

# ============================================================================

import requests
import tempfile
import contextlib
import os

@contextlib.contextmanager
def temp_image_from_url(image_url):
    """Downloads an image from a URL to a temporary file and yields the path."""
    temp_file_path = None
    try:
        response = requests.get(image_url, stream=True)
        response.raise_for_status()
        with tempfile.NamedTemporaryFile(delete=False, suffix=".jpg") as temp_file:
            for chunk in response.iter_content(8192):
                temp_file.write(chunk)
            temp_file_path = temp_file.name
        yield temp_file_path
    finally:
        if temp_file_path and os.path.exists(temp_file_path):
            os.remove(temp_file_path)


class FaceDetection:
    def __init__(self, target_image_path="target.jpg"):
        print_status("מאתחל מערכת זיהוי פנים...", emoji="🚀")
        self.yolo_model = YOLO('./face_yolov8n.pt')
        self.enviro_faces_dir = "./EnviroFaces"

        # יצירת מופע של מחלץ הפנים
        self.face_extractor = FaceExtractor(model_path='./face_yolov8n.pt', output_dir=self.enviro_faces_dir)

        # יצירת תיקיית המאגר אם לא קיימת
        if not os.path.exists(self.enviro_faces_dir):
            os.makedirs(self.enviro_faces_dir)
            print_status(f"נוצרה תיקיית מאגר פנים חדשה: {self.enviro_faces_dir}", level=1, emoji="📁")

    # ==================================================================================
    """ממיר ערכי דמיון לטווח תקין של 0 עד 1 ערכים שליליים הופכים ל-0 """
    # ==================================================================================
    def normalize_similarity_score(self, value):

        if isinstance(value, str):
            # במקרה שהערך מגיע כמחרוזת עם %
            try:
                value = float(value.strip('%')) / 100
            except ValueError:
                return 0.0

        # המרת ערכים שליליים ל-0
        if value < 0:
            return 0.0
        # הגבלת ערכים מעל 1 ל-1
        elif value > 1:
            return 1.0
        else:
            return value

    # ==================================================================================
    "מחיקת כל הקבצים מתיקייה לפי נתיב שהתקבל"
    # ==================================================================================
    def clear_directory(self, directory_path):
        try:
            # בדיקה שהתיקייה קיימת
            if not os.path.exists(directory_path):
                print_status(f"התיקייה {directory_path} לא קיימת", emoji="❌")
                return

            # מחיקת כל הקבצים בתיקייה
            files = glob.glob(f"{directory_path}/*.*")  # תומך בכל סוגי הקבצים, לא רק jpg

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

    # ==================================================================================
    "מעביר את הקריאה למודול החיצוני"
    # ==================================================================================
    def extract_faces_from_directory(self, directory_path):

        return self.face_extractor.extract_faces_from_directory(directory_path)

    # ==================================================================================
        """בדיקת דמיון בין נקודות ציון בפנים - מחליפה את בדיקת יחס הרוחב המקורית"""
    # ==================================================================================
    def check_face_width_ratio(self, face_image1, face_image2, img1_path=None, img2_path=None, threshold=0.90):
        try:
            # לייבא את הספרייה הנדרשת
            import dlib
            from scipy.spatial.distance import cosine

            # הדפסת מידע על הבדיקה
            face1_name = os.path.basename(img1_path) if img1_path else "תמונה 1"
            face2_name = os.path.basename(img2_path) if img2_path else "תמונה 2"
            print_status(f"בודק התאמת נקודות ציון: {face1_name} מול {face2_name}", level=1)

            # טעינת גלאי נקודות ציון של dlib
            detector = dlib.get_frontal_face_detector()
            predictor = dlib.shape_predictor('shape_predictor_68_face_landmarks.dat')

            # איתור נקודות ציון בתמונה 1 - עם קדם-עיבוד משופר
            gray1 = cv2.cvtColor(face_image1, cv2.COLOR_BGR2GRAY)
            gray1 = cv2.equalizeHist(gray1)
            gray1 = cv2.GaussianBlur(gray1, (3, 3), 0)
            gray1 = cv2.resize(gray1, (0, 0), fx=1.5, fy=1.5)

            faces1 = detector(gray1, 1)

            if not faces1:
                print_status(f"לא זוהו פנים בתמונה בשלב בדיקת המבנה: {face1_name}", level=1, emoji="ℹ️")
                return "NO_FACE_DETECTED"

            # איתור נקודות ציון בתמונה 2 - עם אותו קדם-עיבוד
            gray2 = cv2.cvtColor(face_image2, cv2.COLOR_BGR2GRAY)
            gray2 = cv2.equalizeHist(gray2)
            gray2 = cv2.GaussianBlur(gray2, (3, 3), 0)
            gray2 = cv2.resize(gray2, (0, 0), fx=1.5, fy=1.5)

            faces2 = detector(gray2, 1)

            if not faces2:
                print_status(f"לא זוהו פנים בתמונה בשלב בדיקת המבנה: {face2_name}", level=1, emoji="ℹ️")
                return "NO_FACE_DETECTED"

            # הקוד המקורי להשוואת נקודות ציון
            landmarks1 = predictor(gray1, faces1[0])
            landmarks2 = predictor(gray2, faces2[0])

            # המרת נקודות ציון למערך
            landmarks1_array = np.array([[landmarks1.part(i).x, landmarks1.part(i).y] for i in range(68)])
            landmarks2_array = np.array([[landmarks2.part(i).x, landmarks2.part(i).y] for i in range(68)])

            # נרמול הנקודות (להפחתת השפעות גודל וסיבוב)
            landmarks1_norm = landmarks1_array - np.mean(landmarks1_array, axis=0)
            landmarks2_norm = landmarks2_array - np.mean(landmarks2_array, axis=0)

            # חלוקה לאזורים אנטומיים
            # עיניים: נקודות 36-47
            eyes_1 = landmarks1_norm[36:48]
            eyes_2 = landmarks2_norm[36:48]

            # אף: נקודות 27-35
            nose_1 = landmarks1_norm[27:36]
            nose_2 = landmarks2_norm[27:36]

            # פה: נקודות 48-67
            mouth_1 = landmarks1_norm[48:68]
            mouth_2 = landmarks2_norm[48:68]

            # קו לסת: נקודות 0-16
            jaw_1 = landmarks1_norm[0:17]
            jaw_2 = landmarks2_norm[0:17]

            # חישוב דמיון לכל אזור
            eyes_sim = 1 - cosine(eyes_1.flatten(), eyes_2.flatten())
            nose_sim = 1 - cosine(nose_1.flatten(), nose_2.flatten())
            mouth_sim = 1 - cosine(mouth_1.flatten(), mouth_2.flatten())
            jaw_sim = 1 - cosine(jaw_1.flatten(), jaw_2.flatten())

            # חישוב דמיון כולל - שקלול עם דגש על העיניים והאף
            similarity = (eyes_sim * 0.35 + nose_sim * 0.35 + mouth_sim * 0.15 + jaw_sim * 0.15)

            # חישוב יחסים מבניים חשובים
            eye_distance_1 = np.linalg.norm(landmarks1_norm[36] - landmarks1_norm[45])
            eye_distance_2 = np.linalg.norm(landmarks2_norm[36] - landmarks2_norm[45])

            nose_length_1 = np.linalg.norm(landmarks1_norm[27] - landmarks1_norm[33])
            nose_length_2 = np.linalg.norm(landmarks2_norm[27] - landmarks2_norm[33])

            # יחס עיניים-אף
            eye_nose_ratio_1 = eye_distance_1 / (nose_length_1 + 1e-6)  # מניעת חלוקה באפס
            eye_nose_ratio_2 = eye_distance_2 / (nose_length_2 + 1e-6)

            # בדיקת הבדל ביחסים
            ratio_diff = abs(eye_nose_ratio_1 - eye_nose_ratio_2)

            # הפחתה מהדמיון אם היחסים שונים מדי
            if ratio_diff > 0.2:  # הבדל של יותר מ-20% ביחס
                similarity = similarity * (1 - ratio_diff)

            result = similarity >= threshold

            # הדפסת מידע מפורט על ההשוואה
            if result:
                print_status(f"התאמת נקודות ציון טובה: {similarity:.2%}", level=1, emoji="✅")
                print_status(f"דמיון לפי אזורים - עיניים: {eyes_sim:.2%}, אף: {nose_sim:.2%}, פה: {mouth_sim:.2%}",
                             level=2)
            else:
                print_status(f"התאמת נקודות ציון חלשה: {similarity:.2%}", level=1, emoji="⚠️")
                print_status(f"דמיון לפי אזורים - עיניים: {eyes_sim:.2%}, אף: {nose_sim:.2%}, פה: {mouth_sim:.2%}",
                             level=2)

            return result

        except Exception as e:
            print_status(f"שגיאה בבדיקת נקודות ציון: {str(e)}", level=1, emoji="❌")
            return False

# ==================================================================================
            """פונקציה להשוואת שתי תמונות פנים"""
# ==================================================================================
    def verify_face(self, img1_path, img2_path):
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
            print_status(f"שגיאה בהשוואת פנים: {str(e)}", level=1, emoji="⚠️")
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
            print_status(f"שגיאה בהשוואת פנים שנייה: {str(e)}", level=1, emoji="⚠️")
            return 0

    # ==================================================================================
        """Runs DeepFace verification on two images from URLs."""
    # ==================================================================================
    def verify_face_from_urls(self, img1_url, img2_url):

        try:
            with temp_image_from_url(img1_url) as temp_img1_path:
                with temp_image_from_url(img2_url) as temp_img2_path:
                    # קריאה ל-DeepFace עם הנתיבים הזמניים
                    result = DeepFace.verify(
                        img1_path=temp_img1_path,
                        img2_path=temp_img2_path,
                        enforce_detection=False,
                        detector_backend='retinaface',
                        model_name='Facenet512',
                        distance_metric='cosine',
                        align=True
                    )
                    return 1 - result['distance']
        except Exception as e:
            print_status(f"שגיאה בהשוואת פנים מ-URL: {str(e)}", level=1, emoji="⚠️")
            return 0


# ==================================================================================
    """בדיקת התאמה מעמיקה למקרים גבוליים עם 4 גישות שונות כולל נקודות ציון"""
# ==================================================================================
    def perform_enhanced_verification(self, img1_path, img2_path):
        try:
            # גישה 1: המקורית עם נורמליזציה
            try:
                result1 = DeepFace.verify(
                    img1_path=img1_path,
                    img2_path=img2_path,
                    enforce_detection=False,
                    detector_backend='retinaface',
                    model_name='Facenet512',
                    distance_metric='cosine',
                    align=True,
                    normalization='base'
                )
                sim1 = 1 - result1['distance']
                print_status(f"✅ גישה 1 (retinaface/cosine): ציון דמיון {self.normalize_similarity_score(sim1):.2f}", level=2)
            except Exception as e:
                sim1 = 0.0
                print_status(f"❌ גישה 1 (retinaface/cosine): ציון דמיון {sim1:.4f}", level=2)

            # גישה 2: מטריקת מרחק שונה
            try:
                result2 = DeepFace.verify(
                    img1_path=img1_path,
                    img2_path=img2_path,
                    enforce_detection=False,
                    detector_backend='retinaface',
                    model_name='Facenet512',
                    distance_metric='euclidean_l2',
                    align=True
                )
                sim2 = 1 - result2['distance']
                print_status(f"✅ גישה 2 (retinaface/euclidean_l2): ציון דמיון {sim2:.4f}", level=2)
            except Exception as e:
                sim2 = 0.0
                print_status(f"❌ גישה 2 (retinaface/euclidean_l2): ציון דמיון {sim2:.4f}", level=2)

            # גישה 3: מנוע זיהוי שונה לגמרי
            try:
                result3 = DeepFace.verify(
                    img1_path=img1_path,
                    img2_path=img2_path,
                    enforce_detection=False,
                    detector_backend='mtcnn',  # שינוי מנוע זיהוי לגמרי
                    model_name='Facenet512',
                    distance_metric='cosine',
                    align=True
                )
                sim3 = 1 - result3['distance']
                print_status(f"✅ גישה 3 (mtcnn/cosine): ציון דמיון {sim3:.4f}", level=2)
            except Exception as e:
                sim3 = 0.0
                print_status(f"❌ גישה 3 (mtcnn/cosine): ציון דמיון {sim3:.4f}", level=2)

            # גישה 4: שימוש ב-VGG-Face עם גלאי והגדרות אחרות
            try:
                result4 = DeepFace.verify(
                    img1_path=img1_path,
                    img2_path=img2_path,
                    enforce_detection=False,
                    detector_backend='opencv',  # שימוש ב-OpenCV במקום retinaface/mtcnn
                    model_name='VGG-Face',  # מודל שכנראה כבר מותקן
                    distance_metric='euclidean',
                    align=True
                )
                sim4 = 1 - result4['distance']
                print_status(f"✅ גישה 4 (opencv/VGG-Face/euclidean): ציון דמיון {sim4:.4f}", level=2)
            except Exception as e:
                sim4 = 0.0
                print_status(f"❌ גישה 4 (opencv/VGG-Face/euclidean): ציון דמיון {sim4:.4f}", level=2)

            # החלטה האם לכלול את גישה 4 בשקלול הסופי
            # תמיד כלול את גישה 4 בשקלול, בלי תנאי
            if sim4 < 0:
                # אם הערך שלילי, הפוך אותו לחיובי אבל תן לו משקל נמוך יותר
                sim4_adjusted = abs(sim4) * 0.5  # למשל, חצי מהערך המוחלט
            else:
                sim4_adjusted = sim4

            # שקלול עם כל 4 הגישות תמיד
            final_score = (sim1 * 0.3) + (sim2 * 0.1) + (sim3 * 0.3) + (sim4_adjusted * 0.3)
            print_status(f"📊 ציון סופי משוקלל (עם כל 4 הגישות): {final_score:.4f}", level=1)

            return final_score

        except Exception as e:
            print_status(f"⚠️ שגיאה בבדיקה מעמיקה: {str(e)}", level=1)
            return 0

# ==================================================================================
    """ביצוע בדיקה מעמיקה לתמונות פוטנציאליות שלא עברו את הסף הרגיל"""
# ==================================================================================
    def perform_deep_analysis(self, personal_image_path, potential_matches):
        """
        ביצוע בדיקה מעמיקה לתמונות פוטנציאליות שלא עברו את הסף הרגיל

        Args:
            personal_image_path: נתיב לתמונה האישית שנבדקת
            potential_matches: רשימה של טאפלים (נתיב_לתמונה, ציון_דמיון) לבדיקה מעמיקה

        Returns:
            list: רשימת נתיבים לתמונות שעברו את הבדיקה המעמיקה
        """

        if not potential_matches:
            return []

        print_status(f"נמצאו {len(potential_matches)} פנים שדורשות בדיקה מעמיקה:", emoji="🔍")

        # ספירה של סוגי ההתאמות
        gray_zone_count = sum(1 for face, sim in potential_matches if sim < FIRST_THRESHOLD)
        first_pass_only_count = len(potential_matches) - gray_zone_count

        if gray_zone_count:
            print_status(f"- {gray_zone_count} פנים קרובות לסף הזיהוי", level=1)
        if first_pass_only_count:
            print_status(f"- {first_pass_only_count} פנים שעברו רק את הבדיקה הראשונה", level=1)

        # מיון לפי דמיון יורד (הגבוה ביותר ראשון)
        potential_matches.sort(key=lambda x: x[1], reverse=True)

        # הגדרת סף לבדיקה המעמיקה
        ENHANCED_VERIFICATION_THRESHOLD = 0.35

        matched_faces = []

        for face_in_db, similarity in potential_matches:
            # בדיקה מעמיקה עם ארבע גישות שונות
            enhanced_similarity = self.perform_enhanced_verification(personal_image_path, face_in_db)

            if enhanced_similarity >= ENHANCED_VERIFICATION_THRESHOLD:
                print_status(
                    f"בבדיקה מעמיקה נמצאה התאמה לתמונה {os.path.basename(face_in_db)} ({enhanced_similarity:.2%})",
                    level=1, emoji="✅")
                matched_faces.append(face_in_db)
            else:
                print_status(
                    f"בבדיקה מעמיקה לא נמצאה התאמה מספקת לתמונה {os.path.basename(face_in_db)} ({enhanced_similarity:.2%})",
                    level=1, emoji="❌")

        return matched_faces

# ==================================================================================
        """בדיקת התאמה בין תמונה אישית למאגר הפנים - גרסה עם טעינה חכמה"""
# ==================================================================================
    def check_single_image(self, personal_image_path):
        try:
            # הוסף משתנה שיעקוב אם בוצעה בדיקה מעמיקה
            used_enhanced_verification = False

            faces_in_db = glob.glob(f"{self.enviro_faces_dir}/*.jpg")
            if not faces_in_db:
                print_status("לא נמצאו פנים במאגר", emoji="❌")
                return False

            if not os.path.exists(personal_image_path):
                print_status(f"לא נמצאה תמונה אישית: {personal_image_path}", emoji="❌")
                return False

            parent_dir = os.path.basename(os.path.dirname(personal_image_path))
            identified_dir = "./Identified_Images"
            if not os.path.exists(identified_dir):
                os.makedirs(identified_dir)

            # הגדרת אזור אפור - טווח ערכים קרובים לסף שדורשים בדיקה נוספת
            # GRAY_ZONE_FACTOR = 0.05  # 5% מתחת לסף
            # GRAY_ZONE_THRESHOLD = FIRST_THRESHOLD - (FIRST_THRESHOLD * GRAY_ZONE_FACTOR)

            GRAY_ZONE_LOWER_THRESHOLD = 0.42  # הסף התחתון של האזור האפור - 42%

            found_match = False
            results = []  # רשימה לשמירת התוצאות להצגתן בטבלה
            definite_matches = []  # התאמות ודאיות (מעל הסף)
            gray_zone_matches = []  # התאמות באזור האפור
            first_pass_only_matches = []  # חדש: התאמות שעברו רק את הבדיקה הראשונה

            # טעינת התמונה האישית פעם אחת
            personal_img = cv2.imread(personal_image_path)
            if personal_img is None:
                print_status(f"לא ניתן לטעון את התמונה האישית: {personal_image_path}", emoji="❌")
                return False

            print_status(f"בודק התאמה מול {len(faces_in_db)} תמונות במאגר", emoji="🔍")

            # טעינת תמונות המאגר מראש לזיכרון - חוסך טעינות חוזרות
            print_status("טוען תמונות מאגר לזיכרון...", level=1)
            loaded_faces = {}
            for face_path in faces_in_db:
                face_img = cv2.imread(face_path)
                if face_img is not None:
                    loaded_faces[face_path] = face_img
                else:
                    print_status(f"לא ניתן לטעון תמונה: {os.path.basename(face_path)}", level=1, emoji="⚠️")

            print_status(f"נטענו {len(loaded_faces)} תמונות מתוך {len(faces_in_db)}", level=1)

            # בדיקה ראשונה עם Facenet512
            for face_in_db in faces_in_db:
                face_filename = os.path.basename(face_in_db)

                # תמיד להפעיל את שני המודלים
                first_similarity = self.verify_face(personal_image_path, face_in_db)
                second_similarity = self.verify_face_second(personal_image_path, face_in_db)

                # חישוב דמיון משולב (לשימוש עתידי ב-ROC)
                combined_similarity = (first_similarity + second_similarity) / 2

                # המשך הלוגיקה המקורית
                if first_similarity >= FIRST_THRESHOLD:
                    final_similarity = max(first_similarity, second_similarity)

                    # מקרה 1: עבר גם את הבדיקה השנייה
                    if second_similarity >= SECOND_THRESHOLD:
                        status_icon = "✅"
                        definite_matches.append(face_in_db)
                        found_match = True
                    # מקרה 2: עבר רק את הבדיקה הראשונה
                    else:
                        status_icon = "ℹ️"
                        first_pass_only_matches.append((face_in_db, first_similarity))

                # מקרה 3: באזור האפור, קרוב מאוד לסף
                elif first_similarity >= GRAY_ZONE_LOWER_THRESHOLD:
                    status_icon = "🔍"
                    gray_zone_matches.append((face_in_db, first_similarity))
                    final_similarity = first_similarity
                # מקרה 4: מתחת לסף
                else:
                    status_icon = "❌"
                    final_similarity = first_similarity

                # הוסף את הנתונים לרשימת התוצאות בצורת ציון דמיון
                results.append([
                    os.path.basename(personal_image_path),  # תמונה נבדקת
                    face_filename,  # תמונה בבסיס הנתונים
                    f"{self.normalize_similarity_score(first_similarity):.2f}",  # דמיון ראשוני
                    f"{self.normalize_similarity_score(second_similarity):.2f}",  # דמיון משני
                    f"{self.normalize_similarity_score(final_similarity):.2f}",  # ציון דמיון סופי
                    status_icon  # סטטוס
                ])

            # הדפסת כל התוצאות בצורה מסודרת בטבלה אחת
            headers = ["סטטוס", "התאמה סופית", "התאמה שנייה", "התאמה ראשונה", "תמונה בבסיס הנתונים", "תמונה נבדקת"]
            print("\n" + tabulate(results, headers=headers, tablefmt="grid", stralign="center"))

            # אם לא נמצאו התאמות ודאיות אבל יש התאמות באזור האפור או שעברו רק בדיקה ראשונה
            if not found_match and (gray_zone_matches or first_pass_only_matches):
                all_potential_matches = gray_zone_matches + first_pass_only_matches

                # סימון שמתבצעת בדיקה מעמיקה
                used_enhanced_verification = True

                # הרצת הבדיקה המעמיקה באמצעות הפונקציה החדשה
                deep_matched_faces = self.perform_deep_analysis(personal_image_path, all_potential_matches)

                # הוספת התוצאות המוצלחות לרשימת ההתאמות הסופית
                if deep_matched_faces:
                    definite_matches.extend(deep_matched_faces)
                    found_match = True

            if found_match:
                print_status(f"נמצאו {len(definite_matches)} פנים מתאימות, בודק התאמת מבנה פנים...", emoji="🔍")

                # בדיקה אם כבר בוצעה בדיקה מעמיקה שכוללת את בדיקת נקודות הציון
                if used_enhanced_verification:
                    print_status(f"דילוג על בדיקת מבנה פנים נוספת - כבר בוצעה בדיקה מעמיקה", level=1, emoji="↪️")
                else:
                    # נבדוק את יחס הרוחב בכל ההתאמות שנמצאו
                    matches_to_remove = []
                    for face_in_db in definite_matches:
                        # השתמש בתמונות שכבר נטענו לזיכרון
                        db_img = loaded_faces.get(face_in_db)

                        # אם התמונה לא נטענה בהצלחה, ננסה לטעון שוב
                        if db_img is None:
                            db_img = cv2.imread(face_in_db)
                            if db_img is None:
                                print_status(f"לא ניתן לטעון תמונה: {os.path.basename(face_in_db)}", level=1,
                                             emoji="⚠️")
                                matches_to_remove.append(face_in_db)
                                continue

                        # בדיקת נקודות ציון פנים
                        width_check_result = self.check_face_width_ratio(personal_img, db_img, personal_image_path,
                                                                         face_in_db)

                        if width_check_result == "NO_FACE_DETECTED":
                            # אם לא זוהו פנים, ממשיכים ולא מסירים את התמונה
                            print_status(f"ממשיך עם התמונה למרות כשל בזיהוי מבנה: {os.path.basename(face_in_db)}",
                                         level=1, emoji="➡️")
                        elif width_check_result == "ERROR":
                            # אם הייתה שגיאה, ממשיכים ולא מסירים את התמונה
                            print_status(f"ממשיך עם התמונה למרות שגיאה בבדיקת מבנה: {os.path.basename(face_in_db)}",
                                         level=1, emoji="➡️")
                        elif width_check_result == False:
                            # רק אם זוהו פנים ונמצא שהן לא מתאימות, מסירים את התמונה
                            print_status(f"התאמה נדחתה עקב הבדל משמעותי במבנה הפנים: {os.path.basename(face_in_db)}",
                                         level=1, emoji="⛔")
                            matches_to_remove.append(face_in_db)

                    # הסרת ההתאמות שנכשלו בבדיקת נקודות ציון
                    for face_to_remove in matches_to_remove:
                        definite_matches.remove(face_to_remove)

                # המשך רק אם נשארו התאמות לאחר בדיקת נקודות ציון
                if definite_matches:
                    # המשך הקוד הקיים להעתקת ההתאמות
                    for face_in_db in definite_matches:
                        try:
                            # העתקת התמונה המזוהה ל-Identified_Images
                            original_number = os.path.basename(face_in_db).split('_')[-1].split('.')[0]
                            new_filename = f"{parent_dir}_{original_number}.jpg"
                            new_path = os.path.join(identified_dir, new_filename)

                            shutil.copy2(face_in_db, new_path)
                            print_status(f"הפנים המתאימות הועתקו ל: {new_filename}", level=1, emoji="📋")
                        except Exception as file_error:
                            print_status(f"שגיאה בטיפול בקבצים: {str(file_error)}", level=1, emoji="⚠️")
                else:
                    print_status("לא נשארו התאמות לאחר בדיקת מבנה פנים", emoji="❓")
                    found_match = False
            else:
                print_status("לא נמצאה התאמה במאגר", emoji="❓")

            # ניקוי זיכרון
            loaded_faces.clear()

            return found_match

        except Exception as e:
            print_status(f"שגיאה בבדיקת תמונה בודדת: {str(e)}", emoji="❌")
            return False

# ==================================================================================
            "מקבלת URL של תמונה אישית ובודקת אותה מול תיקיית EnviroFaces המקומית"
# ==================================================================================
    def check_person_against_environment(self, personal_image_url):

        try:
            # 'with' נמצא רמה אחת פנימה מה-def, וזה נכון
            with temp_image_from_url(personal_image_url) as personal_image_path:

                # כל הקוד הבא מוזח רמה אחת נוספת פנימה, תחת ה-'with'
                faces_in_db = glob.glob(f"{self.enviro_faces_dir}/*.jpg")
                if not faces_in_db:
                    print_status("לא נמצאו פנים במאגר הזמני (EnviroFaces)", emoji="❌")
                    return False

                if not os.path.exists(personal_image_path):
                    print_status(f"שגיאה: לא נוצר קובץ זמני עבור התמונה האישית", emoji="❌")
                    return False

                used_enhanced_verification = False

                faces_in_db = glob.glob(f"{self.enviro_faces_dir}/*.jpg")
                if not faces_in_db:
                    print_status("לא נמצאו פנים במאגר", emoji="❌")
                    return False

                if not os.path.exists(personal_image_path):
                    print_status(f"לא נמצאה תמונה אישית: {personal_image_path}", emoji="❌")
                    return False

                parent_dir = os.path.basename(os.path.dirname(personal_image_path))
                identified_dir = "./Identified_Images"
                if not os.path.exists(identified_dir):
                    os.makedirs(identified_dir)

                # הגדרת אזור אפור - טווח ערכים קרובים לסף שדורשים בדיקה נוספת
                # GRAY_ZONE_FACTOR = 0.05  # 5% מתחת לסף
                # GRAY_ZONE_THRESHOLD = FIRST_THRESHOLD - (FIRST_THRESHOLD * GRAY_ZONE_FACTOR)

                GRAY_ZONE_LOWER_THRESHOLD = 0.42  # הסף התחתון של האזור האפור - 42%

                found_match = False
                results = []  # רשימה לשמירת התוצאות להצגתן בטבלה
                definite_matches = []  # התאמות ודאיות (מעל הסף)
                gray_zone_matches = []  # התאמות באזור האפור
                first_pass_only_matches = []  # חדש: התאמות שעברו רק את הבדיקה הראשונה

                # טעינת התמונה האישית פעם אחת
                personal_img = cv2.imread(personal_image_path)
                if personal_img is None:
                    print_status(f"לא ניתן לטעון את התמונה האישית: {personal_image_path}", emoji="❌")
                    return False

                print_status(f"בודק התאמה מול {len(faces_in_db)} תמונות במאגר", emoji="🔍")

                # טעינת תמונות המאגר מראש לזיכרון - חוסך טעינות חוזרות
                print_status("טוען תמונות מאגר לזיכרון...", level=1)
                loaded_faces = {}
                for face_path in faces_in_db:
                    face_img = cv2.imread(face_path)
                    if face_img is not None:
                        loaded_faces[face_path] = face_img
                    else:
                        print_status(f"לא ניתן לטעון תמונה: {os.path.basename(face_path)}", level=1, emoji="⚠️")

                print_status(f"נטענו {len(loaded_faces)} תמונות מתוך {len(faces_in_db)}", level=1)

                # בדיקה ראשונה עם Facenet512
                for face_in_db in faces_in_db:
                    face_filename = os.path.basename(face_in_db)

                    # תמיד להפעיל את שני המודלים
                    first_similarity = self.verify_face(personal_image_path, face_in_db)
                    second_similarity = self.verify_face_second(personal_image_path, face_in_db)

                    # חישוב דמיון משולב (לשימוש עתידי ב-ROC)
                    combined_similarity = (first_similarity + second_similarity) / 2

                    # המשך הלוגיקה המקורית
                    if first_similarity >= FIRST_THRESHOLD:
                        final_similarity = max(first_similarity, second_similarity)

                        # מקרה 1: עבר גם את הבדיקה השנייה
                        if second_similarity >= SECOND_THRESHOLD:
                            status_icon = "✅"
                            definite_matches.append(face_in_db)
                            found_match = True
                        # מקרה 2: עבר רק את הבדיקה הראשונה
                        else:
                            status_icon = "ℹ️"
                            first_pass_only_matches.append((face_in_db, first_similarity))

                    # מקרה 3: באזור האפור, קרוב מאוד לסף
                    elif first_similarity >= GRAY_ZONE_LOWER_THRESHOLD:
                        status_icon = "🔍"
                        gray_zone_matches.append((face_in_db, first_similarity))
                        final_similarity = first_similarity
                    # מקרה 4: מתחת לסף
                    else:
                        status_icon = "❌"
                        final_similarity = first_similarity

                    # הוסף את הנתונים לרשימת התוצאות בצורת ציון דמיון
                    results.append([
                        os.path.basename(personal_image_path),  # תמונה נבדקת
                        face_filename,  # תמונה בבסיס הנתונים
                        f"{self.normalize_similarity_score(first_similarity):.2f}",  # דמיון ראשוני
                        f"{self.normalize_similarity_score(second_similarity):.2f}",  # דמיון משני
                        f"{self.normalize_similarity_score(final_similarity):.2f}",  # ציון דמיון סופי
                        status_icon  # סטטוס
                    ])

                # הדפסת כל התוצאות בצורה מסודרת בטבלה אחת
                headers = ["סטטוס", "התאמה סופית", "התאמה שנייה", "התאמה ראשונה", "תמונה בבסיס הנתונים", "תמונה נבדקת"]
                print("\n" + tabulate(results, headers=headers, tablefmt="grid", stralign="center"))

                # אם לא נמצאו התאמות ודאיות אבל יש התאמות באזור האפור או שעברו רק בדיקה ראשונה
                if not found_match and (gray_zone_matches or first_pass_only_matches):
                    all_potential_matches = gray_zone_matches + first_pass_only_matches

                    # סימון שמתבצעת בדיקה מעמיקה
                    used_enhanced_verification = True

                    # הרצת הבדיקה המעמיקה באמצעות הפונקציה החדשה
                    deep_matched_faces = self.perform_deep_analysis(personal_image_path, all_potential_matches)

                    # הוספת התוצאות המוצלחות לרשימת ההתאמות הסופית
                    if deep_matched_faces:
                        definite_matches.extend(deep_matched_faces)
                        found_match = True

                if found_match:
                    print_status(f"נמצאו {len(definite_matches)} פנים מתאימות, בודק התאמת מבנה פנים...", emoji="🔍")

                    # בדיקה אם כבר בוצעה בדיקה מעמיקה שכוללת את בדיקת נקודות הציון
                    if used_enhanced_verification:
                        print_status(f"דילוג על בדיקת מבנה פנים נוספת - כבר בוצעה בדיקה מעמיקה", level=1, emoji="↪️")
                    else:
                        # נבדוק את יחס הרוחב בכל ההתאמות שנמצאו
                        matches_to_remove = []
                        for face_in_db in definite_matches:
                            # השתמש בתמונות שכבר נטענו לזיכרון
                            db_img = loaded_faces.get(face_in_db)

                            # אם התמונה לא נטענה בהצלחה, ננסה לטעון שוב
                            if db_img is None:
                                db_img = cv2.imread(face_in_db)
                                if db_img is None:
                                    print_status(f"לא ניתן לטעון תמונה: {os.path.basename(face_in_db)}", level=1,
                                                 emoji="⚠️")
                                    matches_to_remove.append(face_in_db)
                                    continue

                            # בדיקת נקודות ציון פנים
                            width_check_result = self.check_face_width_ratio(personal_img, db_img, personal_image_path,
                                                                             face_in_db)

                            if width_check_result == "NO_FACE_DETECTED":
                                # אם לא זוהו פנים, ממשיכים ולא מסירים את התמונה
                                print_status(f"ממשיך עם התמונה למרות כשל בזיהוי מבנה: {os.path.basename(face_in_db)}",
                                             level=1, emoji="➡️")
                            elif width_check_result == "ERROR":
                                # אם הייתה שגיאה, ממשיכים ולא מסירים את התמונה
                                print_status(f"ממשיך עם התמונה למרות שגיאה בבדיקת מבנה: {os.path.basename(face_in_db)}",
                                             level=1, emoji="➡️")
                            elif width_check_result == False:
                                # רק אם זוהו פנים ונמצא שהן לא מתאימות, מסירים את התמונה
                                print_status(
                                    f"התאמה נדחתה עקב הבדל משמעותי במבנה הפנים: {os.path.basename(face_in_db)}",
                                    level=1, emoji="⛔")
                                matches_to_remove.append(face_in_db)

                        # הסרת ההתאמות שנכשלו בבדיקת נקודות ציון
                        for face_to_remove in matches_to_remove:
                            definite_matches.remove(face_to_remove)

                    # המשך רק אם נשארו התאמות לאחר בדיקת נקודות ציון
                    if definite_matches:
                        # המשך הקוד הקיים להעתקת ההתאמות
                        for face_in_db in definite_matches:
                            try:
                                # העתקת התמונה המזוהה ל-Identified_Images
                                original_number = os.path.basename(face_in_db).split('_')[-1].split('.')[0]
                                new_filename = f"{parent_dir}_{original_number}.jpg"
                                new_path = os.path.join(identified_dir, new_filename)

                                shutil.copy2(face_in_db, new_path)
                                print_status(f"הפנים המתאימות הועתקו ל: {new_filename}", level=1, emoji="📋")
                            except Exception as file_error:
                                print_status(f"שגיאה בטיפול בקבצים: {str(file_error)}", level=1, emoji="⚠️")
                    else:
                        print_status("לא נשארו התאמות לאחר בדיקת מבנה פנים", emoji="❓")
                        found_match = False
                else:
                    print_status("לא נמצאה התאמה במאגר", emoji="❓")

                # ניקוי זיכרון
                loaded_faces.clear()

                return found_match

            # ה-except נמצא באותה רמה כמו ה-try
        except Exception as e:
            print_status(f"שגיאה בבדיקת תמונה מ-URL: {str(e)}", emoji="❌")
            return False


# ==================================================================================
            "בדיקת התאמה בין תמונות מאומתות של אדם לתמונות שזוהו כשלו"
# ==================================================================================
    def verify_person_images(self, person_details):

        try:
            first_name, last_name, id_number = person_details.split()
            person_id = f"{first_name}_{last_name}_{id_number}"

            print_status(f"בודק תמונות של {first_name} {last_name}", emoji="👤")

            verified_dir = f"./{person_id}"
            if not os.path.exists(verified_dir):
                print_status(f"לא נמצאה תיקיית תמונות מאומתות עבור {person_id}", level=1, emoji="❌")
                return {}

            verified_images = glob.glob(f"{verified_dir}/*.jpg")
            if not verified_images:
                print_status(f"לא נמצאו תמונות מאומתות בתיקייה {verified_dir}", level=1, emoji="❌")
                return {}

            identified_pattern = f"./Identified_Images/{person_id}_*.jpg"
            identified_images = glob.glob(identified_pattern)
            if not identified_images:
                print_status(f"לא נמצאו תמונות מזוהות עבור {person_id}", level=1, emoji="❌")
                return {}

            print_status(f"נמצאו {len(verified_images)} תמונות מאומתות ו-{len(identified_images)} תמונות מזוהות",
                         level=1, emoji="📊")

            results = {}

            for identified_img in identified_images:
                img_name = os.path.basename(identified_img)
                print_status(f"בודק תמונה מזוהה: {img_name}", level=1, emoji="🔍")

                img_results = {
                    'verified_matches': [],
                    'highest_similarity': 0,
                    'average_similarity': 0,
                    'passed_threshold': False
                }

                similarities = []

                for verified_img in verified_images:
                    verified_name = os.path.basename(verified_img)
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
                            print_status(f"התאמה עם {verified_name}: {similarity:.2%}", level=2, emoji="✅")

                if similarities:
                    img_results['highest_similarity'] = max(similarities)
                    img_results['average_similarity'] = sum(similarities) / len(similarities)
                    img_results['passed_threshold'] = img_results['highest_similarity'] >= (
                            (FIRST_THRESHOLD + SECOND_THRESHOLD) / 2)

                    threshold_emoji = "✅" if img_results['passed_threshold'] else "❌"

                    print_status(f"סיכום עבור {img_name}:", level=2)
                    print_status(f"נמצאו {len(img_results['verified_matches'])} התאמות", level=3)
                    print_status(f"ציון דמיון מירבי: {self.normalize_similarity_score(img_results['highest_similarity']):.2f}", level=3)
                    print_status(f"ציון דמיון ממוצע: {self.normalize_similarity_score(img_results['average_similarity']):.2f}", level=3)
                    print_status(f"עבר סף: {threshold_emoji}", level=3)
                else:
                    print_status(f"לא נמצאו התאמות לתמונה זו", level=2, emoji="❌")

                results[os.path.basename(identified_img)] = img_results

            print_status(f"הושלמה בדיקת התמונות של {first_name} {last_name}", emoji="✅")
            return results

        except Exception as e:
            print_status(f"שגיאה בבדיקת תמונות אדם: {str(e)}", emoji="❌")
            return {}