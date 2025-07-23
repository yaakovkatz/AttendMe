"""
=================================================================
            Data Management - ניהול נתונים עם בתי ספר
=================================================================
עדכון של ניהול הנתונים לעבודה עם מערכת בתי ספר מרובים.
כל הפונקציות עכשיו עובדות דרך אובייקט School ספציפי.
=================================================================
"""

from Person import Person
from Target import Target
from School import School
import os

# משתנה גלובלי למעקב אחר בית הספר הנוכחי
current_school = None

def set_current_school(school):
    """קביעת בית הספר הנוכחי לעבודה"""
    global current_school
    current_school = school
    print(f"✅ בית ספר נוכחי הוגדר: {school.name} (ID: {school.school_id})")

def get_current_school():
    """קבלת בית הספר הנוכחי"""
    return current_school

def ensure_school():
    """בדיקה שיש בית ספר פעיל"""
    if not current_school:
        raise Exception("לא הוגדר בית ספר פעיל. יש להתחבר תחילה.")
    return current_school

"""==================================Person========================="""

def add_new_person(first_name, last_name, id_number, images_url):
    """הוספת אדם חדש לבית הספר הנוכחי"""
    school = ensure_school()
    return school.add_person(first_name, last_name, id_number, images_url)

def remove_person(id_number):
    """מחיקת אדם מבית הספר הנוכחי"""
    school = ensure_school()
    success, message = school.remove_person(id_number)
    print(f"{'✅' if success else '❌'} {message}")

def get_all_people():
    """קבלת כל האנשים מבית הספר הנוכחי"""
    school = ensure_school()
    return school.people_vector

def get_person(person_id):
    """מחזיר אדם לפי מספר תעודת זהות - נתונים רגילים"""
    school = ensure_school()
    return school.get_person(person_id)

def update_person(person_id, new_first_name, new_last_name):
    """מעדכן פרטי אדם קיים"""
    school = ensure_school()
    for person in school.people_vector:
        if person.id_number == person_id:
            person.first_name = new_first_name
            person.last_name = new_last_name
            school.save_school_data()
            return

def toggle_presence(person_id, new_presence_status):
    """מעדכן סטטוס נוכחות של אדם לפי תעודת זהות"""
    school = ensure_school()
    for person in school.people_vector:
        if person.id_number == person_id:
            person._is_present = new_presence_status
            school.save_school_data()
            return

"""============================Target====================================="""

def add_new_target(camera_number, images_url, enable_face_detection=False):
    """הוספת מטרה חדשה לבית הספר הנוכחי"""
    school = ensure_school()
    return school.add_target(camera_number, images_url, enable_face_detection)

def remove_target(camera_number):
    """מחיקת מטרה מבית הספר הנוכחי"""
    school = ensure_school()
    success, message = school.remove_target(camera_number)
    print(f"{'✅' if success else '❌'} {message}")

def get_all_targets():
    """קבלת כל המטרות מבית הספר הנוכחי"""
    school = ensure_school()
    return school.targets_vector

def clear_all_targets():
    """מחיקת כל המטרות מבית הספר הנוכחי"""
    school = ensure_school()
    school.targets_vector.clear()
    school.save_school_data()
    print("✅ כל המטרות נוקו בהצלחה")

"""============================School Management====================================="""

def create_new_school(name, email, phone, address, admin_username, admin_password):
    """יצירת בית ספר חדש"""
    try:
        # בדיקה שלא קיים בית ספר עם אותו אימייל
        existing_schools = School.get_all_schools()
        for existing_school in existing_schools:
            if existing_school['email'] == email:
                return {
                    'success': False,
                    'error': 'כבר קיים בית ספר עם כתובת אימייל זו',
                    'school': None
                }

        # יצירת בית ספר חדש
        new_school = School(
            name=name,
            email=email,
            phone=phone,
            address=address,
            admin_username=admin_username,
            admin_password=admin_password
        )

        # שמירת הנתונים
        success, message = new_school.save_school_data()

        if success:
            return {
                'success': True,
                'message': f'בית הספר "{name}" נוצר בהצלחה',
                'school': new_school,
                'school_id': new_school.school_id
            }
        else:
            return {
                'success': False,
                'error': f'שגיאה בשמירת בית הספר: {message}',
                'school': None
            }

    except Exception as e:
        return {
            'success': False,
            'error': f'שגיאה ביצירת בית הספר: {str(e)}',
            'school': None
        }

def authenticate_and_load_school(username, password):
    """אימות משתמש וטעינת בית הספר המתאים"""
    try:
        # קבלת כל בתי הספר
        all_schools = School.get_all_schools()

        # חיפוש בכל בית ספר
        for school_info in all_schools:
            school, load_message = School.load_school_data(school_info['school_id'])

            if school:
                # בדיקת אימות
                is_authenticated, user_data = school.authenticate_user(username, password)

                if is_authenticated:
                    # הגדרת בית ספר נוכחי
                    set_current_school(school)

                    return {
                        'success': True,
                        'message': f'התחברות בוצעה בהצלחה לבית ספר: {school.name}',
                        'school': school,
                        'user': user_data
                    }

        # אם הגענו לכאן, האימות נכשל
        return {
            'success': False,
            'error': 'שם משתמש או סיסמה שגויים',
            'school': None,
            'user': None
        }

    except Exception as e:
        return {
            'success': False,
            'error': f'שגיאה באימות: {str(e)}',
            'school': None,
            'user': None
        }

def logout():
    """התנתקות - ניקוי בית ספר נוכחי"""
    global current_school
    if current_school:
        print(f"👋 מתנתק מבית ספר: {current_school.name}")
        current_school = None
    else:
        print("⚠️ לא היה בית ספר פעיל")

def get_current_school_stats():
    """קבלת סטטיסטיקות בית הספר הנוכחי"""
    school = ensure_school()
    return school.get_school_stats()

def record_attendance(person_id, status, timestamp=None, method='auto'):
    """רישום נוכחות לבית הספר הנוכחי"""
    school = ensure_school()
    return school.record_attendance(person_id, status, timestamp, method)

def get_attendance_report(date=None):
    """קבלת דוח נוכחות מבית הספר הנוכחי"""
    school = ensure_school()
    return school.get_attendance_report(date)