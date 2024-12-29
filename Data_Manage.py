# Data_Manage.py
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
        print(f"\nנוצר בהצלחה: {new_person.get_full_name()}")
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
            removed_person = people_vector.pop(i)
            print(f"האדם {removed_person.get_full_name()} הוסר בהצלחה")
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


def manage_data():
    while True:
        print("\n=== ניהול נתונים ===")
        print("1. הוספת אדם חדש")
        print("2. הסרת אדם")
        print("3. הצגת כל האנשים במערכת")
        print("4. חזרה לתפריט ראשי")

        choice = input("\nבחר אפשרות (1-4): ")

        if choice == "1":
            add_new_person()
        elif choice == "2":
            remove_person()
        elif choice == "3":
            display_all_people()
        elif choice == "4":
            print("חוזר לתפריט ראשי...")
            break
        else:
            print("אפשרות לא חוקית, אנא נסה שנית")