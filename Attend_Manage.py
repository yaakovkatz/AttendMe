import os
from Face_Detection import FaceDetection
from Data_Manage import people_vector
from timer import Timer


def check_presence(check_all=True, specific_person=None):
    if not people_vector:
        print("אין אנשים במערכת לבדיקה")
        return

    print("\nInitializing Face Detection System...")

    # יצירת מופע של FaceDetection שמיד יחתוך את הפנים מתמונת המטרה
    face_detection = FaceDetection("target.jpg")
    with Timer("חילוץ פנים מתיקייה") as timer:
        # ודא שהנתיב הזה נכון לסביבת Render או השתמש בנתיב יחסי
        face_detection.extract_faces_from_directory("./target")

    try:
        # בדיקת כל האנשים או אדם ספציפי
        match_found = False

        if check_all:
            # בדיקת כל אדם במערכת
            for person in people_vector:
                # --- התחלת קוד חדש ---
                result = False  # אתחול ברירת המחדל

                # בדיקה אם לאדם יש תמונות בענן
                if hasattr(person, 'image_urls') and person.image_urls:
                    # לקיחת ה-URL של התמונה הראשונה
                    personal_image_url = person.image_urls[0]
                    print(f"\nChecking {person.get_full_name_and_id()} from Cloudinary...")

                    with Timer(f"{person.get_full_name_and_id()}") as timer:
                        # קריאה לפונקציה החדשה עם ה-URL
                        result = face_detection.check_person_against_environment(personal_image_url)
                else:
                    # אם לאדם אין תמונות בענן, דלג עליו
                    print(f"⚠️ Skipping {person.get_full_name_and_id()}: No image URL found.")
                    result = False
                # --- סוף קוד חדש ---

                # עכשיו בודקים את המשתנה result שהתקבל מה-if/else
                if result:
                    person.mark_present()
                    print(f"✅ {person.get_full_name_and_id()} is present!")
                    print("\033[1;34m" + "═" * 80 + "\033[0m")
                    match_found = True
                else:
                    person.mark_absent()
                    print(f"❌ {person.get_full_name_and_id()} is not present")
        else:
            # בדיקת אדם ספציפי
            if not specific_person:
                print("לא התקבל מזהה אדם תקין")
                return

            # מציאת האדם הספציפי ברשימת האנשים
            parts = specific_person.split()
            if len(parts) < 3:
                print("פורמט לא תקין. נדרש: שם_פרטי שם_משפחה ת.ז.")
                return

            first_name, last_name, id_number = parts[0], parts[1], parts[2]
            target_person = None

            for person in people_vector:
                if (person.first_name == first_name and
                        person.last_name == last_name and
                        person.id_number == id_number):
                    target_person = person
                    break

            if target_person:
                # --- התחלת קוד חדש ---
                result = False  # אתחול

                if hasattr(target_person, 'image_urls') and target_person.image_urls:
                    personal_image_url = target_person.image_urls[0]
                    print(f"\nChecking {target_person.get_full_name_and_id()} from Cloudinary...")

                    with Timer(f"{target_person.get_full_name_and_id()}") as timer:
                        result = face_detection.check_person_against_environment(personal_image_url)
                else:
                    print(f"⚠️ Skipping {target_person.get_full_name_and_id()}: No image URL found.")
                    result = False
                # --- סוף קוד חדש ---

                if result:
                    target_person.mark_present()
                    print(f"✅ {target_person.get_full_name_and_id()} is present!")
                    match_found = True
                else:
                    target_person.mark_absent()
                    print(f"❌ {target_person.get_full_name_and_id()} is not present")
            else:
                print(f"לא נמצא אדם עם הפרטים: {first_name} {last_name} {id_number}")

        print(f"")
        # מדידת זמן לניקוי התיקייה
        with Timer("ניקוי תיקיית EnviroFaces") as timer:
            # שימוש בנתיב יחסי שעובד גם ברנדר
            face_detection.clear_directory("./EnviroFaces")

        if not match_found:
            print("\nNo matches found in the system")

    except Exception as e:
        print(f"\nCritical error: {str(e)}")