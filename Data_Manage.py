# Data_Manage.py
import os
import re
from Person import Person

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

    except Exception as e:
        print(f"שגיאה בטעינת אנשים קיימים: {str(e)}")


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
