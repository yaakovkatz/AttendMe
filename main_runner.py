# main_runner.py
from Data_Manage import manage_data
from Attend_Manage import check_presence
import os


def main():
    while True:
        try:
            print("\n=== מערכת זיהוי פנים ===")
            print("1. ניהול נתונים")
            print("2. בדיקת נוכחות")
            print("3. יציאה")

            choice = input("\nבחר אפשרות (1-3): ")

            if choice == "1":
                manage_data()
            elif choice == "2":
                print("\n=== בדיקת נוכחות ===")
                print("1. בדיקת נוכחות לכל האנשים")
                print("2. בדיקת נוכחות לאדם ספציפי")
                print("3. חזרה לתפריט הראשי")

                sub_choice = input("\nבחר אפשרות (1-3): ")

                if sub_choice == "1":
                    check_presence(check_all=True)
                elif sub_choice == "2":
                    print("\nבחירת אדם לבדיקת נוכחות:")
                    print("1. בחירה מרשימה")
                    print("2. הזנת מספר ת.ז.")

                    select_method = input("\nבחר שיטת בחירה (1-2): ")

                    if select_method == "1":
                        # קבלת רשימת האנשים מתיקיית training_faces
                        training_path = "C:/Users/User/PycharmProjects/AttendMe/training_faces"
                        people = get_registered_people(training_path)

                        if not people:
                            print("\nאין אנשים רשומים במערכת")
                            continue

                        print("\nאנשים רשומים:")
                        for i, person in enumerate(people, 1):
                            # הצגת השם בצורה קריאה
                            name_parts = person.split('_')
                            if len(name_parts) >= 3:
                                first_name, last_name, id_number = name_parts[0], name_parts[1], name_parts[2]
                                print(f"{i}. {first_name} {last_name} (ת.ז. {id_number})")
                            else:
                                print(f"{i}. {person}")

                        try:
                            selection = int(input("\nבחר מספר אדם: "))
                            if 1 <= selection <= len(people):
                                selected_person = people[selection - 1]
                                # לחלץ את החלקים מהמחרוזת
                                name_parts = selected_person.split('_')
                                if len(name_parts) >= 3:
                                    first_name, last_name, id_number = name_parts[0], name_parts[1], name_parts[2]
                                    person_id = f"{first_name} {last_name} {id_number}"
                                    check_presence(check_all=False, specific_person=person_id)
                                else:
                                    print("\nפורמט שם לא תקין")
                            else:
                                print("\nבחירה לא חוקית")
                        except ValueError:
                            print("\nיש להזין מספר")

                    elif select_method == "2":
                        # בחירה לפי מספר ת.ז.
                        id_number = input("\nהכנס מספר ת.ז.: ")
                        training_path = "C:/Users/User/PycharmProjects/AttendMe/training_faces"
                        person_id = find_person_by_id(training_path, id_number)

                        if person_id:
                            name_parts = person_id.split('_')
                            first_name, last_name, id_number = name_parts[0], name_parts[1], name_parts[2]
                            person_id_str = f"{first_name} {last_name} {id_number}"
                            check_presence(check_all=False, specific_person=person_id_str)
                        else:
                            print(f"\nלא נמצא אדם עם ת.ז. {id_number}")

                    else:
                        print("\nאפשרות לא חוקית")

                elif sub_choice == "3":
                    continue
                else:
                    print("\nאפשרות לא חוקית, חוזר לתפריט הראשי")
            elif choice == "3":
                print("\nיציאה מהמערכת...")
                break
            else:
                print("\nאפשרות לא חוקית, אנא נסה שנית")

        except Exception as e:
            print(f"\nCritical error: {str(e)}")


def get_registered_people(training_path):
    """
    פונקציה שמחזירה רשימה של כל האנשים הרשומים במערכת

    Args:
        training_path (str): הנתיב לתיקיית training_faces

    Returns:
        list: רשימת כל האנשים הרשומים
    """
    people = []

    try:
        # בדיקה שהתיקייה קיימת
        if not os.path.exists(training_path):
            print(f"התיקייה {training_path} לא קיימת")
            return people

        # סריקת התיקיות כדי למצוא תיקיות של אנשים רשומים
        for item in os.listdir(training_path):
            item_path = os.path.join(training_path, item)
            # בדיקה אם זו תיקייה ואם היא מתאימה לפורמט של שם_פרטי_שם_משפחה_ת.ז.
            if os.path.isdir(item_path) and '_' in item:
                parts = item.split('_')
                if len(parts) >= 3:  # לפחות שם פרטי, שם משפחה ות.ז.
                    people.append(item)
    except Exception as e:
        print(f"שגיאה בקבלת רשימת אנשים: {str(e)}")

    return people


def find_person_by_id(training_path, id_number):
    """
    פונקציה שמחפשת אדם לפי מספר ת.ז.

    Args:
        training_path (str): הנתיב לתיקיית training_faces
        id_number (str): מספר ת.ז. לחיפוש

    Returns:
        str: מזהה האדם אם נמצא, אחרת None
    """
    try:
        # בדיקה שהתיקייה קיימת
        if not os.path.exists(training_path):
            print(f"התיקייה {training_path} לא קיימת")
            return None

        # סריקת התיקיות
        for item in os.listdir(training_path):
            item_path = os.path.join(training_path, item)
            # בדיקה אם זו תיקייה ואם היא מתאימה לפורמט של שם_פרטי_שם_משפחה_ת.ז.
            if os.path.isdir(item_path) and '_' in item:
                parts = item.split('_')
                if len(parts) >= 3 and parts[2] == id_number:  # בדיקה אם ת.ז. תואמת
                    return item
    except Exception as e:
        print(f"שגיאה בחיפוש אדם לפי ת.ז.: {str(e)}")

    return None


if __name__ == "__main__":
    main()