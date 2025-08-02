from Person import Person
from Target import Target
from School import School

schools_database = []

"""==================================School========================="""


def login_user(username, password):
    print(f"🔐 מנסה להתחבר עם המשתמש: {username}")

    # בדיקה אם יש משתמש כזה
    user_school = None
    for school in schools_database:
        if school.admin_username == username:
            user_school = school
            break

    # אם לא נמצא שם משתמש כזה
    if user_school is None:
        print(f"❌ שם משתמש '{username}' לא נמצא במערכת")
        return {
            'success': False,
            'message': f"שם המשתמש '{username}' לא קיים במערכת",
            'error_type': 'username_not_found'
        }

    # אם נמצא שם המשתמש אבל הסיסמה שגויה
    if user_school.admin_password != password:
        print(f"❌ סיסמה שגויה עבור המשתמש: {username}")
        return {
            'success': False,
            'message': "הסיסמה שהוזנה שגויה",
            'error_type': 'wrong_password'
        }

    # התחברות מוצלחת
    print(f"✅ התחברות מוצלחת עבור: {username} (בית הספר: {user_school.school_name})")
    return {
        'success': True,
        'message': f"ברוך הבא {username}! התחברת בהצלחה לבית הספר {user_school.school_name}",
        'school_info': user_school.get_school_info()
    }


def register_school(school_data):
    print(f"🏫 מנסה לרשום בית ספר חדש: {school_data.get('school_name', 'לא צוין')}")

    # חילוץ הנתונים
    school_name = school_data.get('school_name', '').strip()
    school_email = school_data.get('school_email', '').strip()
    school_phone = school_data.get('school_phone', '').strip()
    school_address = school_data.get('school_address', '').strip()
    admin_username = school_data.get('admin_username', '').strip()
    admin_password = school_data.get('admin_password', '')

    # בדיקת שדות חובה
    required_fields = {
        'school_name': school_name,
        'school_email': school_email,
        'school_phone': school_phone,
        'admin_username': admin_username,
        'admin_password': admin_password
    }

    missing_fields = [field for field, value in required_fields.items() if not value]
    if missing_fields:
        return {
            'success': False,
            'message': f"שדות חובה חסרים: {', '.join(missing_fields)}",
            'error_type': 'missing_fields'
        }

    # בדיקה אם שם המשתמש כבר קיים
    for school in schools_database:
        if school.admin_username == admin_username:
            print(f"❌ שם המשתמש '{admin_username}' כבר קיים במערכת")
            return {
                'success': False,
                'message': f"שם המשתמש '{admin_username}' כבר קיים במערכת. נא לבחור שם משתמש אחר",
                'error_type': 'username_exists'
            }

    # בדיקה אם האימייל כבר קיים
    for school in schools_database:
        if school.school_email == school_email:
            print(f"❌ האימייל '{school_email}' כבר קיים במערכת")
            return {
                'success': False,
                'message': f"האימייל '{school_email}' כבר רשום במערכת. נא להשתמש באימייל אחר",
                'error_type': 'email_exists'
            }

    # יצירת אובייקט בית ספר חדש
    try:
        # חישוב המיקום החדש בווקטור (האינדקס הבא)
        new_position = len(schools_database)

        new_school = School(
            school_name=school_name,
            school_email=school_email,
            school_phone=school_phone,
            school_address=school_address,
            admin_username=admin_username,
            admin_password=admin_password,
            school_index=new_position
        )

        # הוספה לווקטור הגלובלי
        schools_database.append(new_school)

        print(f"✅ בית הספר '{school_name}' נרשם בהצלחה עם המשתמש '{admin_username}'")
        print(f"📍 מיקום בווקטור: {new_position}")
        print(f"📊 סה\"כ בתי ספר במערכת: {len(schools_database)}")

        return {
            'success': True,
            'message': f"בית הספר '{school_name}' נרשם בהצלחה! המשתמש '{admin_username}' יכול כעת להתחבר למערכת",
            'school_info': new_school.get_school_info(),
            'position_in_database': new_position  # החזרת המיקום גם בתגובה
        }

    except Exception as e:
        print(f"❌ שגיאה ביצירת בית הספר: {str(e)}")
        return {
            'success': False,
            'message': f"שגיאה ביצירת בית הספר: {str(e)}",
            'error_type': 'creation_error'
        }

# ==================== UTILITY FUNCTIONS ====================

def get_all_schools():
    return schools_database


def get_schools_count():
    return len(schools_database)


def find_school_by_username(username):
    for school in schools_database:
        if school.admin_username == username:
            return school
    return None


def get_school_index_by_username(username):
    """מחזיר את האינדקס של בית הספר לפי שם משתמש"""
    for i, school in enumerate(schools_database):
        if school.admin_username == username:
            return i
    return -1  # לא נמצא


def validate_school_index(school_index):
    """בדיקה שהאינדקס של בית הספר תקין"""
    if not isinstance(school_index, int):
        return False, "מספר בית הספר חייב להיות מספר שלם"

    if school_index < 0:
        return False, "מספר בית הספר לא יכול להיות שלילי"

    if school_index >= len(schools_database):
        return False, f"מספר בית הספר {school_index} לא קיים במערכת (יש {len(schools_database)} בתי ספר)"

    return True, "תקין"


def print_all_schools():
    """
    הדפסת כל בתי הספר במערכת (לצורכי דיבוג)
    """
    print(f"\n📋 רשימת כל בתי הספר במערכת ({len(schools_database)} בתי ספר):")
    print("=" * 60)

    if not schools_database:
        print("אין בתי ספר רשומים במערכת")
    else:
        for i, school in enumerate(schools_database, 1):
            people_count = len(school.people_vector)
            targets_count = len(school.targets_vector)
            print(f"{i - 1}. {school} | אנשים: {people_count} | מטרות: {targets_count}")

    print("=" * 60)


def clear_database():
    global schools_database
    schools_database.clear()
    print("🗑️ מסד הנתונים נוקה")


# ==================== DEMO DATA ====================

def add_demo_data():
    """
    הוספת נתוני הדגמה למערכת (לצורכי בדיקה)
    """
    demo_schools = [
        {
            'school_name': 'בית ספר יסודי הרצל',
            'school_email': 'herzl@education.gov.il',
            'school_phone': '03-1234567',
            'school_address': 'רחוב הרצל 123, תל אביב',
            'admin_username': 'admin_herzl',
            'admin_password': 'herzl123'
        },
        {
            'school_name': 'בית ספר תיכון ביאליק',
            'school_email': 'bialik@education.gov.il',
            'school_phone': '04-9876543',
            'school_address': 'שדרות ביאליק 456, חיפה',
            'admin_username': 'admin_bialik',
            'admin_password': 'bialik456'
        }
    ]

    print("🎯 מוסיף נתוני הדגמה...")
    for school_data in demo_schools:
        result = register_school(school_data)
        if result['success']:
            print(f"✅ נוסף: {school_data['school_name']}")
        else:
            print(f"❌ שגיאה בהוספת: {school_data['school_name']} - {result['message']}")


"""==================================Person========================="""


def add_new_person(school_index, first_name, last_name, id_number, images_url):
    """הוספת אדם חדש לבית ספר ספציפי"""

    # בדיקת תקינות האינדקס
    is_valid, error_msg = validate_school_index(school_index)
    if not is_valid:
        return {
            'success': False,
            'person': None,
            'message': f"שגיאה באינדקס בית הספר: {error_msg}",
            'error': 'INVALID_SCHOOL_INDEX'
        }

    # קבלת בית הספר הספציפי
    school = schools_database[school_index]

    # בדיקה אם האדם כבר קיים בבית הספר הזה
    if any(person.id_number == id_number for person in school.people_vector):
        return {
            'success': False,
            'person': None,
            'message': f"אדם עם מספר תעודת זהות {id_number} כבר קיים בבית הספר {school.school_name}",
            'error': 'DUPLICATE_ID'
        }

    # יצירת אדם חדש
    new_person = Person(first_name, last_name, id_number, images_url)

    # הוספה לווקטור של בית הספר הספציפי
    school.people_vector.append(new_person)

    print(f"✅ נוסף אדם חדש לבית הספר {school.school_name}: {new_person.get_full_name_and_id()}")

    return {
        'success': True,
        'person': new_person,
        'message': f"האדם {new_person.get_full_name_and_id()} נוצר בהצלחה בבית הספר {school.school_name}",
        'error': None,
        'school_name': school.school_name
    }


def remove_person(school_index, id_number):
    """מחיקת אדם מבית ספר ספציפי"""

    # בדיקת תקינות האינדקס
    is_valid, error_msg = validate_school_index(school_index)
    if not is_valid:
        print(f"❌ שגיאה באינדקס בית הספר: {error_msg}")
        return {
            'success': False,
            'message': f"שגיאה באינדקס בית הספר: {error_msg}",
            'error': 'INVALID_SCHOOL_INDEX'
        }

    school = schools_database[school_index]
    print(f"\n=== מחיקת אדם עם ת.ז. {id_number} מבית הספר {school.school_name} ===")

    # חיפוש האדם בבית הספר הספציפי
    for i, person in enumerate(school.people_vector):
        if person.id_number == id_number:
            # מחיקה
            removed_person = school.people_vector.pop(i)
            print(f"✅ נמחק: {removed_person.get_full_name_and_id()} מבית הספר {school.school_name}")
            return {
                'success': True,
                'message': f"האדם {removed_person.get_full_name_and_id()} נמחק בהצלחה",
                'removed_person': removed_person.get_person_details()
            }

    print(f"❌ לא נמצא אדם עם ת.ז. {id_number} בבית הספר {school.school_name}")
    return {
        'success': False,
        'message': f"לא נמצא אדם עם ת.ז. {id_number} בבית הספר {school.school_name}",
        'error': 'PERSON_NOT_FOUND'
    }


def get_all_people(school_index):
    """קבלת כל האנשים של בית ספר ספציפי"""

    # בדיקת תקינות האינדקס
    is_valid, error_msg = validate_school_index(school_index)
    if not is_valid:
        return {
            'success': False,
            'people': [],
            'message': f"שגיאה באינדקס בית הספר: {error_msg}",
            'error': 'INVALID_SCHOOL_INDEX'
        }

    school = schools_database[school_index]
    people_data = [person.get_person_details() for person in school.people_vector]

    return {
        'success': True,
        'people': people_data,
        'count': len(people_data),
        'school_name': school.school_name,
        'message': f"נמצאו {len(people_data)} אנשים בבית הספר {school.school_name}"
    }


def get_person(school_index, person_id):
    """מחזיר אדם לפי מספר תעודת זהות מבית ספר ספציפי"""

    # בדיקת תקינות האינדקס
    is_valid, error_msg = validate_school_index(school_index)
    if not is_valid:
        return {
            'success': False,
            'person': None,
            'message': f"שגיאה באינדקס בית הספר: {error_msg}",
            'error': 'INVALID_SCHOOL_INDEX'
        }

    school = schools_database[school_index]

    for person in school.people_vector:
        if person.id_number == person_id:
            return {
                'success': True,
                'person': person.get_person_details(),
                'school_name': school.school_name,
                'message': f"אדם נמצא בבית הספר {school.school_name}"
            }

    return {
        'success': False,
        'person': None,
        'message': f"לא נמצא אדם עם ת.ז. {person_id} בבית הספר {school.school_name}",
        'error': 'PERSON_NOT_FOUND'
    }


def update_person(school_index, person_id, new_first_name, new_last_name):
    """מעדכן פרטי אדם קיים בבית ספר ספציפי"""

    # בדיקת תקינות האינדקס
    is_valid, error_msg = validate_school_index(school_index)
    if not is_valid:
        return {
            'success': False,
            'message': f"שגיאה באינדקס בית הספר: {error_msg}",
            'error': 'INVALID_SCHOOL_INDEX'
        }

    school = schools_database[school_index]

    for person in school.people_vector:
        if person.id_number == person_id:
            # שמירת שמות ישנים לצורך הודעה
            old_name = f"{person.first_name} {person.last_name}"

            # עדכון הפרטים
            person.first_name = new_first_name
            person.last_name = new_last_name

            new_name = f"{person.first_name} {person.last_name}"

            return {
                'success': True,
                'message': f"פרטי האדם עודכנו בהצלחה: {old_name} → {new_name}",
                'updated_person': person.get_person_details(),
                'school_name': school.school_name
            }

    return {
        'success': False,
        'message': f"לא נמצא אדם עם ת.ז. {person_id} בבית הספר {school.school_name}",
        'error': 'PERSON_NOT_FOUND'
    }


def add_new_image_url(school_index, person_id, image_url):
    """מוסיפה URL של תמונה חדשה לאדם קיים"""
    print(f"🔍 מחפש אדם: school_index={school_index}, person_id={person_id}")

    try:
        # בדיקה שמזהה בית הספר תקין
        is_valid, error_msg = validate_school_index(school_index)
        if not is_valid:
            return {
                'success': False,
                'error': f'מזהה בית ספר לא תקין: {error_msg}'
            }

        # קבלת בית הספר
        school = schools_database[school_index]
        print(f"📚 בית ספר נמצא: {school.school_name}")

        # חיפוש האדם - תיקון: people_vector במקום people
        person = None
        for p in school.people_vector:  # 🔧 זה התיקון העיקרי!
            if p.id_number == person_id:
                person = p
                break

        if not person:
            return {
                'success': False,
                'error': f'לא נמצא אדם עם ת.ז. {person_id}'
            }

        print(f"👤 אדם נמצא: {person.first_name} {person.last_name}")

        # בדיקה שהתמונה לא קיימת כבר
        if image_url in person.image_urls:
            return {
                'success': False,
                'error': 'התמונה כבר קיימת'
            }

        # הוספת התמונה באמצעות הפונקציה של Person
        success = person.add_image_url(image_url)
        if not success:
            return {
                'success': False,
                'error': 'שגיאה בהוספת התמונה'
            }

        print(f"📷 התמונה נוספה. סה״כ תמונות: {len(person.image_urls)}")

        # כאן אין צורך בשמירת קובץ כי הנתונים נשמרים בזיכרון
        # אם יש לך פונקציה לשמירה, תוסיף אותה כאן

        return {
            'success': True,
            'message': 'התמונה נוספה בהצלחה',
            'total_images': len(person.image_urls)
        }

    except Exception as e:
        print(f"💥 שגיאה ב-add_new_image_url: {e}")
        import traceback
        traceback.print_exc()
        return {
            'success': False,
            'error': f'שגיאה פנימית: {str(e)}'
        }


def toggle_presence(school_index, person_id, new_presence_status):
    """מעדכן סטטוס נוכחות של אדם לפי תעודת זהות בבית ספר ספציפי"""

    # בדיקת תקינות האינדקס
    is_valid, error_msg = validate_school_index(school_index)
    if not is_valid:
        return {
            'success': False,
            'message': f"שגיאה באינדקס בית הספר: {error_msg}",
            'error': 'INVALID_SCHOOL_INDEX'
        }

    school = schools_database[school_index]

    for person in school.people_vector:
        if person.id_number == person_id:
            # עדכון סטטוס הנוכחות
            person.set_presence(new_presence_status)

            status_text = "נוכח" if new_presence_status else "לא נוכח"

            return {
                'success': True,
                'message': f"סטטוס נוכחות של {person.get_full_name_and_id()} עודכן ל: {status_text}",
                'person_id': person_id,
                'new_status': new_presence_status,
                'school_name': school.school_name
            }

    return {
        'success': False,
        'message': f"לא נמצא אדם עם ת.ז. {person_id} בבית הספר {school.school_name}",
        'error': 'PERSON_NOT_FOUND'
    }


"""============================Target====================================="""


def add_new_target(school_index, camera_number, images_url, enable_face_detection=False):
    """הוספת מטרה חדשה לבית ספר ספציפי"""

    # בדיקת תקינות האינדקס
    is_valid, error_msg = validate_school_index(school_index)
    if not is_valid:
        return {
            'success': False,
            'message': f"שגיאה באינדקס בית הספר: {error_msg}",
            'error': 'INVALID_SCHOOL_INDEX'
        }

    school = schools_database[school_index]

    # בדיקה אם מצלמה עם המספר הזה כבר קיימת בבית הספר
    if any(target.camera_number == camera_number for target in school.targets_vector):
        return {
            'success': False,
            'message': f"מצלמה מספר {camera_number} כבר קיימת בבית הספר {school.school_name}",
            'error': 'DUPLICATE_CAMERA'
        }

    try:
        # יצירת מטרה חדשה
        new_target = Target(camera_number, images_url, enable_face_detection=enable_face_detection)

        # הוספה לווקטור של בית הספר הספציפי
        school.targets_vector.append(new_target)

        print(f"✅ נוספה מטרה חדשה לבית הספר {school.school_name}: מצלמה {camera_number}")

        return {
            'success': True,
            'message': f"מטרה במצלמה {camera_number} נוצרה בהצלחה בבית הספר {school.school_name}",
            'camera_number': camera_number,
            'image_url': images_url,
            'faces_count': new_target.faces_count,
            'school_name': school.school_name
        }

    except Exception as e:
        return {
            'success': False,
            'message': f"שגיאה ביצירת המטרה: {str(e)}",
            'error': 'CREATION_ERROR'
        }


def remove_target(school_index, camera_number):
    """מחיקת מטרה מבית ספר ספציפי"""

    # בדיקת תקינות האינדקס
    is_valid, error_msg = validate_school_index(school_index)
    if not is_valid:
        print(f"❌ שגיאה באינדקס בית הספר: {error_msg}")
        return {
            'success': False,
            'message': f"שגיאה באינדקס בית הספר: {error_msg}",
            'error': 'INVALID_SCHOOL_INDEX'
        }

    school = schools_database[school_index]
    print(f"\n=== מחיקת מטרה במצלמה {camera_number} מבית הספר {school.school_name} ===")

    # חיפוש המטרה בבית הספר הספציפי
    for i, target in enumerate(school.targets_vector):
        if target.camera_number == camera_number:
            # מחיקה
            removed_target = school.targets_vector.pop(i)
            print(f"✅ נמחקה מטרה: מצלמה {removed_target.camera_number} מבית הספר {school.school_name}")
            return {
                'success': True,
                'message': f"מטרה במצלמה {camera_number} נמחקה בהצלחה",
                'camera_number': camera_number,
                'school_name': school.school_name
            }

    print(f"❌ לא נמצאה מטרה עם מספר מצלמה {camera_number} בבית הספר {school.school_name}")
    return {
        'success': False,
        'message': f"לא נמצאה מטרה עם מספר מצלמה {camera_number} בבית הספר {school.school_name}",
        'error': 'TARGET_NOT_FOUND'
    }


def get_all_targets(school_index):
    """קבלת כל המטרות של בית ספר ספציפי"""

    # בדיקת תקינות האינדקס
    is_valid, error_msg = validate_school_index(school_index)
    if not is_valid:
        return {
            'success': False,
            'targets': [],
            'message': f"שגיאה באינדקס בית הספר: {error_msg}",
            'error': 'INVALID_SCHOOL_INDEX'
        }

    school = schools_database[school_index]

    targets_data = []
    for target in school.targets_vector:
        target_info = {
            'camera_number': target.camera_number,
            'image_url': target.get_image_url(),
            'faces_count': target.get_faces_count(),
            'extracted_faces': target.get_extracted_faces_urls(),
            'is_checked': target.is_checked
        }
        targets_data.append(target_info)

    return {
        'success': True,
        'targets': targets_data,
        'count': len(targets_data),
        'school_name': school.school_name,
        'message': f"נמצאו {len(targets_data)} מטרות בבית הספר {school.school_name}"
    }


def clear_all_targets(school_index):
    """מחיקת כל המטרות של בית ספר ספציפי"""

    # בדיקת תקינות האינדקס
    is_valid, error_msg = validate_school_index(school_index)
    if not is_valid:
        return {
            'success': False,
            'message': f"שגיאה באינדקס בית הספר: {error_msg}",
            'error': 'INVALID_SCHOOL_INDEX'
        }

    school = schools_database[school_index]
    targets_count = len(school.targets_vector)

    school.targets_vector.clear()

    print(f"✅ כל המטרות ({targets_count}) נמחקו מבית הספר {school.school_name}")

    return {
        'success': True,
        'message': f"כל המטרות ({targets_count}) נמחקו בהצלחה מבית הספר {school.school_name}",
        'cleared_count': targets_count,
        'school_name': school.school_name
    }