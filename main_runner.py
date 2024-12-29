# main_runner.py
from Data_Manage import manage_data
from Attend_Manage import check_presence


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
                check_presence()
            elif choice == "3":
                print("\nיציאה מהמערכת...")
                break
            else:
                print("\nאפשרות לא חוקית, אנא נסה שנית")

        except Exception as e:
            print(f"\nCritical error: {str(e)}")


if __name__ == "__main__":
    main()