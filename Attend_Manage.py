# Attend_Manage.py
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
        face_detection.extract_faces_from_directory("C:\\Users\\User\\PyCharmProjects\\AttendMe\\target")

    try:
        # בדיקת כל האנשים או אדם ספציפי
        match_found = False

        if check_all:
            # בדיקת כל אדם במערכת
            for person in people_vector:
                personal_image = person.get_first_image_path()
                print(f"\nChecking {person.get_full_name_and_id()}...")

                # מדידת זמן לבדיקת האדם הנוכחי
                with Timer(f"{person.get_full_name_and_id()}") as timer:
                    result = face_detection.check_single_image(personal_image)

                if result:
                    person.mark_present()
                    print(f"✅ {person.get_full_name_and_id()} is present!")
                    print("\033[1;34m" + "═" * 80 + "\033[0m")  # קו כחול עם תו עבה יותר
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
                personal_image = target_person.get_first_image_path()
                print(f"\nChecking {target_person.get_full_name_and_id()}...")

                # מדידת זמן לבדיקת האדם הספציפי
                with Timer(f"{target_person.get_full_name_and_id()}") as timer:
                    result = face_detection.check_single_image(personal_image)

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
            face_detection.clear_directory(r"C:\Users\User\PycharmProjects\AttendMe\EnviroFaces")
        # face_detection.clear_directory(r"C:\Users\User\PycharmProjects\AttendMe\Identified_Images")

        if not match_found:
            print("\nNo matches found in the system")

    except Exception as e:
        print(f"\nCritical error: {str(e)}")