from Person import Person
from Target import Target

# וקטור גלובלי לשמירת האנשים
people_vector = []
targets_vector = []


"""==================================Person========================="""


def add_new_person(first_name, last_name, id_number, images_url):

    # בדיקה אם האדם כבר קיים
    if any(person.id_number == id_number for person in people_vector):
        return {
            'success': False,
            'person': None,
            'message': f"אדם עם מספר תעודת זהות {id_number} כבר קיים במערכת",
            'error': 'DUPLICATE_ID'
        }

    # יצירת אדם חדש
    new_person = Person(first_name, last_name, id_number, images_url)
    # הוספה ל-people_vector
    people_vector.append(new_person)

    return {
        'success': True,
        'person': new_person,  # מחזיר את האובייקט עצמו
        'message': f"האדם {new_person.get_full_name_and_id()} נוצר בהצלחה",
        'error': None
    }


def remove_person(id_number):
    """מחיקת אדם מהמערכת"""
    print(f"\n=== מחיקת אדם עם ת.ז. {id_number} ===")

    # חיפוש האדם
    for i, person in enumerate(people_vector):
        if person.id_number == id_number:
            # מחיקה
            removed_person = people_vector.pop(i)
            print(f"✅ נמחק: {removed_person.get_full_name_and_id()}")
            return

    print(f"❌ לא נמצא אדם עם ת.ז. {id_number}")


def get_all_people():
    return people_vector


def get_person(person_id):
    """מחזיר אדם לפי מספר תעודת זהות - נתונים רגילים"""
    for person in people_vector:
        if person.id_number == person_id:
            return person.get_person_details()
    return None


def update_person(person_id, new_first_name, new_last_name):
    """מעדכן פרטי אדם קיים"""
    for person in people_vector:
        if person.id_number == person_id:
            # עדכון הפרטים
            person.first_name = new_first_name
            person.last_name = new_last_name
            return


def toggle_presence(person_id, new_presence_status):
    """מעדכן סטטוס נוכחות של אדם לפי תעודת זהות"""
    for person in people_vector:
        if person.id_number == person_id:
            person._is_present = new_presence_status
            return


"""============================Target====================================="""


def add_new_target(camera_number, images_url, enable_face_detection=False):
    try:
        # יצירת מטרה חדשה
        new_target = Target(camera_number, images_url, enable_face_detection=enable_face_detection)

        # הוספה ל-targets_vector
        targets_vector.append(new_target)

        # ✅ החזר dictionary בלבד, לא את האובייקט
        return {
            'success': True,
            'message': f"מטרה במצלמה {camera_number} נוצרה בהצלחה",
            'camera_number': camera_number,
            'image_url': images_url,
            'faces_count': new_target.faces_count
        }

    except Exception as e:
        return {
            'success': False,
            'message': f"שגיאה ביצירת המטרה: {str(e)}",
            'error': 'CREATION_ERROR'
        }


def remove_target(camera_number):
    """מחיקת מטרה מהמערכת"""
    print(f"\n=== מחיקת מטרה במצלמה {camera_number} ===")

    # חיפוש המטרה
    for i, target in enumerate(targets_vector):
        if target.camera_number == camera_number:
            # מחיקה
            removed_target = targets_vector.pop(i)
            print(f"✅ נמחקה מטרה: מצלמה {removed_target.camera_number} ({removed_target.image_urls})")
            return

    print(f"❌ לא נמצאה מטרה עם מספר מצלמה {camera_number}")


def get_all_targets():
    return targets_vector


def clear_all_targets():
    targets_vector.clear()
    print("✅ הווקטור נוקה בהצלחה")
