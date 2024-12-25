import os
import tensorflow as tf

os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'
tf.compat.v1.logging.set_verbosity(tf.compat.v1.logging.ERROR)

from primary_check import detect_and_recognize_faces as primary_check
from secondary_check import detect_and_recognize_faces as secondary_check
import cv2

def run_face_detection(target_image):
    """
    מריץ את תהליך זיהוי הפנים:
    1. קודם בדיקה ראשית מול primary.jpg עם סף 70%
    2. אם לא נמצאה התאמה, בדיקה משנית מול known_faces עם סף 40%
    """
    print("\n=== מתחיל בדיקה ראשית ===")
    try:
        # בדיקת קיום הקבצים הנדרשים
        if not os.path.exists("primary.jpg"):
            raise Exception("הקובץ primary.jpg לא נמצא")
        if not os.path.exists("./face_yolov8n.pt"):
            raise Exception("מודל YOLO לא נמצא")

        # בדיקה ראשית
        matches, image, all_faces, found_match = primary_check("primary.jpg", target_image)

        if image is not None:
            cv2.imwrite("result_primary.jpg", image)
            print("\nתוצאות הבדיקה הראשית נשמרו בקובץ result_primary.jpg")

            if found_match:
                print("\nנמצאה התאמה טובה בבדיקה הראשית!")
                print("אין צורך בבדיקה נוספת.")
                return True

        # אם לא נמצאה התאמה טובה בבדיקה הראשית
        print("\n=== לא נמצאה התאמה מספקת, עובר לבדיקה משנית ===")

        # בדיקת קיום תיקיית known_faces
        known_faces_dir = "known_faces"
        if not os.path.exists(known_faces_dir):
            os.makedirs(known_faces_dir)

        if not any(f.endswith('.jpg') for f in os.listdir(known_faces_dir)):
            raise Exception("לא נמצאו תמונות בתיקיית known_faces")

        # בדיקה משנית
        matches, image, all_faces, found_match = secondary_check(known_faces_dir, target_image)

        if image is not None:
            cv2.imwrite("result_secondary.jpg", image)
            print("\nתוצאות הבדיקה המשנית נשמרו בקובץ result_secondary.jpg")

        return found_match

    except Exception as e:
        print(f"\nשגיאה בתהליך הזיהוי: {str(e)}")
        return False


def main():
    try:
        target_image = "petel.jpg"  # התמונה שרוצים לבדוק
        if not os.path.exists(target_image):
            raise Exception(f"התמונה {target_image} לא נמצאה")

        print("\nמתחיל תהליך זיהוי פנים...")
        found_match = run_face_detection(target_image)

        if found_match:
            print("\nתהליך הזיהוי הסתיים בהצלחה עם התאמה")
        else:
            print("\nתהליך הזיהוי הסתיים - לא נמצאה התאמה מספקת")

    except Exception as e:
        print(f"\nשגיאה: {str(e)}")


if __name__ == "__main__":
    main()