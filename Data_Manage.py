# Data_Manage.py
import os
import re
from Person import Person
from Face_Detection import FaceDetection

# וקטור גלובלי לשמירת האנשים
people_vector = []


def add_new_person():
    print("\n=== הוספת אדם חדש ===")
    first_name = input("הכנס שם פרטי: ")
    last_name = input("הכנס שם משפחה: ")
    id_number = input("הכנס מספר תעודת זהות: ")

    if any(person.id_number == id_number for person in people_vector):
        print("אדם עם מספר תעודת זהות זה כבר קיים במערכת")
        return None

    try:
        new_person = Person(first_name, last_name, id_number)
        people_vector.append(new_person)
        print(f"\nנוצר בהצלחה: {new_person.get_full_name_and_id()}")
        print(f"מספר אנשים במערכת: {len(people_vector)}")
        return new_person
    except Exception as e:
        print(f"שגיאה ביצירת אדם חדש: {str(e)}")
        return None


def remove_person():
    print("\n=== הסרת אדם ===")
    id_number = input("הכנס מספר תעודת זהות להסרה: ")

    for i, person in enumerate(people_vector):
        if person.id_number == id_number:
            removed_person = people_vector[i]
            removed_person.mark_for_deletion()  # סימון למחיקת תיקייה
            people_vector.pop(i)  # הסרה מהווקטור
            print(f"האדם {removed_person.get_full_name_and_id()} הוסר בהצלחה")
            print(f"מספר אנשים במערכת: {len(people_vector)}")
            return

    print("לא נמצא אדם עם מספר תעודת זהות זה")


def display_all_people():
    print("\n=== רשימת כל האנשים במערכת ===")
    if not people_vector:
        print("אין אנשים במערכת")
        return

    for i, person in enumerate(people_vector, 1):
        details = person.get_person_details()
        print(f"\n{i}. {details['first_name']} {details['last_name']}")
        print(f"   ת.ז: {details['id_number']}")
        print(f"   סטטוס נוכחות: {'נוכח' if details['is_present'] else 'לא נוכח'}")


def load_existing_people(base_path="C:/Users/User/PycharmProjects/AttendMe/training_faces"):
    """טעינת אנשים קיימים מהתיקיות"""
    print("\n=== טוען אנשים קיימים מהמערכת ===")

    try:
        # מקבל רשימה של כל התיקיות בנתיב הבסיס
        directories = [d for d in os.listdir(base_path)
                       if os.path.isdir(os.path.join(base_path, d))]

        # ביטוי רגולרי לבדיקת פורמט השם
        # מחפש: אותיות_אותיות_מספרים
        pattern = r'^([A-Za-z]+)_([A-Za-z]+)_(\d+)$'

        loaded_count = 0
        for dir_name in directories:
            match = re.match(pattern, dir_name)
            if match:
                first_name = match.group(1)  # הקבוצה הראשונה - שם פרטי
                last_name = match.group(2)  # הקבוצה השנייה - שם משפחה
                id_number = match.group(3)  # הקבוצה השלישית - ת.ז.

                # בדיקה אם האדם כבר קיים במערכת
                if not any(person.id_number == id_number for person in people_vector):
                    try:
                        new_person = Person(first_name, last_name, id_number)
                        people_vector.append(new_person)
                        loaded_count += 1
                        print(f"נטען בהצלחה: {new_person.get_full_name_and_id()}")
                    except Exception as e:
                        print(f"שגיאה בטעינת {dir_name}: {str(e)}")
                else:
                    print(f"דילוג על {dir_name} - כבר קיים במערכת")

        print(f"\nסה\"כ נטענו {loaded_count} אנשים חדשים למערכת")
        print(f"מספר אנשים כולל במערכת: {len(people_vector)}")
        return True

    except Exception as e:
        print(f"שגיאה בטעינת אנשים קיימים: {str(e)}")
        return False


def check_presence(check_all=True, specific_person=None):
    """
    בדיקת נוכחות - לכל האנשים או לאדם ספציפי

    Args:
        check_all (bool): האם לבדוק את כל האנשים
        specific_person (str): מזהה האדם הספציפי (אם check_all=False)

    Returns:
        bool או dict: אם check_all=False, מחזיר True/False לפי אם האדם נוכח
                      אם check_all=True, מחזיר מילון עם מזהים של אנשים ומצב נוכחות
    """
    # יצירת מופע של מערכת זיהוי פנים
    face_detector = FaceDetection()
    training_path = "./training_faces"

    # בדיקת נוכחות לאדם ספציפי
    if not check_all and specific_person:
        print(f"\n=== בדיקת נוכחות לאדם ספציפי ===")
        print(f"בודק נוכחות עבור: {specific_person}")

        # פיצול המזהה לחלקים
        parts = specific_person.split()
        if len(parts) < 3:
            print("פורמט מזהה לא תקין")
            return False

        # קבלת הפרטים מהמזהה
        first_name, last_name, id_number = parts[0], parts[1], parts[2]

        # חיפוש התיקייה והתמונות של האדם
        person_folder_name = f"{first_name}_{last_name}_{id_number}"
        person_folder = os.path.join(training_path, person_folder_name)

        if not os.path.exists(person_folder):
            print(f"לא נמצאה תיקייה עבור {specific_person}")
            return False

        print(f"נמצאה תיקייה: {person_folder}")

        # בדיקה אם יש תמונות בתיקייה
        image_files = [f for f in os.listdir(person_folder) if f.lower().endswith(('.jpg', '.jpeg', '.png'))]
        if not image_files:
            print("לא נמצאו תמונות בתיקייה")
            return False

        print(f"נמצאו {len(image_files)} תמונות")

        # ביצוע בדיקת נוכחות באמצעות FaceDetection
        # נניח שיש לנו קובץ target.jpg בתיקיית הפרויקט שמכיל תמונה עדכנית לבדיקה
        # או שאנחנו משתמשים באחת התמונות מתיקיית האדם לצורך הבדיקה
        is_present = face_detector.check_single_image(os.path.join(person_folder, image_files[0]))

        # עדכון סטטוס הנוכחות של האדם בווקטור האנשים (אם קיים)
        for person in people_vector:
            if person.id_number == id_number:
                person.set_presence(is_present)
                break

        print(f"תוצאת בדיקה: {'נוכח' if is_present else 'לא נוכח'}")
        return is_present

    # בדיקת נוכחות לכל האנשים
    else:
        print("\n=== בדיקת נוכחות לכל האנשים ===")

        results = {}

        # עבור על כל התיקיות בנתיב הבסיס
        directories = [d for d in os.listdir(training_path)
                       if os.path.isdir(os.path.join(training_path, d))]

        # ביטוי רגולרי לבדיקת פורמט השם
        pattern = r'^([A-Za-z]+)_([A-Za-z]+)_(\d+)$'

        for dir_name in directories:
            match = re.match(pattern, dir_name)
            if match:
                first_name = match.group(1)
                last_name = match.group(2)
                id_number = match.group(3)

                person_folder = os.path.join(training_path, dir_name)

                # בדיקה אם יש תמונות בתיקייה
                image_files = [f for f in os.listdir(person_folder) if f.lower().endswith(('.jpg', '.jpeg', '.png'))]
                if not image_files:
                    print(f"אין תמונות עבור {first_name} {last_name}, דילוג...")
                    continue

                # ביצוע בדיקת נוכחות
                is_present = face_detector.check_single_image(os.path.join(person_folder, image_files[0]))

                # עדכון תוצאות
                results[id_number] = is_present

                # עדכון סטטוס הנוכחות של האדם בווקטור האנשים (אם קיים)
                for person in people_vector:
                    if person.id_number == id_number:
                        person.set_presence(is_present)
                        break

                print(f"{first_name} {last_name} (ת.ז. {id_number}): {'נוכח' if is_present else 'לא נוכח'}")

        print(f"\nהושלמה בדיקת נוכחות עבור {len(results)} אנשים")
        return results


def manage_data():
    while True:
        print("\n=== ניהול נתונים ===")
        print("1. הוספת אדם חדש")
        print("2. הסרת אדם")
        print("3. הצגת כל האנשים במערכת")
        print("4. טעינת אנשים קיימים מהמערכת")
        print("5. חזרה לתפריט ראשי")

        choice = input("\nבחר אפשרות (1-5): ")

        if choice == "1":
            add_new_person()
        elif choice == "2":
            remove_person()
        elif choice == "3":
            display_all_people()
        elif choice == "4":
            load_existing_people()
        elif choice == "5":
            print("חוזר לתפריט ראשי...")
            break
        else:
            print("אפשרות לא חוקית, אנא נסה שנית")