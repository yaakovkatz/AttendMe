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
            # הלוגיקה של מחיקת קבצים ותמונות מהענן נמצאת ב-app.py, כאן רק נסיר מהרשימה
            people_vector.pop(i)
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


def load_existing_people(base_path=None):
    """
    פונקציה זו אינה רלוונטית יותר במודל הענן.
    טעינת האנשים מתבצעת דרך ה-API של האתר.
    """
    print("\n=== פונקציה זו אינה בשימוש במודל הענן ===")
    print("טעינת האנשים מתבצעת כעת דרך ה-API של האתר,")
    print("שמושך את הנתונים העדכניים ביותר, כולל תמונות מהענן.")
    return True


def check_presence(check_all=True, specific_person=None):
    """
    בדיקת נוכחות - עכשיו עובדת עם URL-ים מהענן.
    """
    # יצירת מופע של מערכת זיהוי פנים
    face_detector = FaceDetection()

    # בדיקת נוכחות לאדם ספציפי
    if not check_all and specific_person:
        print(f"\n=== בדיקת נוכחות לאדם ספציפי ===")
        print(f"בודק נוכחות עבור: {specific_person}")

        parts = specific_person.split()
        id_number = parts[2] if len(parts) >= 3 else None

        person_obj = next((p for p in people_vector if p.id_number == id_number), None)

        if not person_obj:
            print(f"לא נמצא אדם עם ת.ז. {id_number} ברשימה שנטענה.")
            return False

        # --- שינוי מרכזי: שימוש ב-URL ---
        is_present = False
        if hasattr(person_obj, 'image_urls') and person_obj.image_urls:
            personal_image_url = person_obj.image_urls[0]
            is_present = face_detector.check_person_against_environment(personal_image_url)
        else:
            print(f"לא נמצאו תמונות בענן עבור {specific_person}")
        # --- סוף שינוי ---

        person_obj.set_presence(is_present)
        print(f"תוצאת בדיקה: {'נוכח' if is_present else 'לא נוכח'}")
        return is_present

    # בדיקת נוכחות לכל האנשים
    else:
        print("\n=== בדיקת נוכחות לכל האנשים ===")
        results = {}
        for person in people_vector:
            is_present = False
            # --- שינוי מרכזי: שימוש ב-URL ---
            if hasattr(person, 'image_urls') and person.image_urls:
                personal_image_url = person.image_urls[0]
                print(f"בודק את {person.get_full_name_and_id()}...")
                is_present = face_detector.check_person_against_environment(personal_image_url)
            else:
                print(f"מדלג על {person.get_full_name_and_id()} - אין תמונות בענן.")
            # --- סוף שינוי ---

            person.set_presence(is_present)
            results[person.id_number] = is_present
            print(f"{person.first_name} {person.last_name}: {'נוכח' if is_present else 'לא נוכח'}")

        print(f"\nהושלמה בדיקת נוכחות עבור {len(results)} אנשים")
        return results


def manage_data():
    while True:
        print("\n=== ניהול נתונים ===")
        print("1. הוספת אדם חדש")
        print("2. הסרת אדם")
        print("3. הצגת כל האנשים במערכת")
        print("4. טעינת אנשים קיימים (לא פעיל)")
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