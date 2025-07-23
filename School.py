# ==================== GLOBAL VARIABLES ====================
# ווקטור גלובלי להחזקת כל אובייקטי בתי הספר
schools_database = []


# ==================== SCHOOL CLASS ====================
class School:
    """
    מחלקה לייצוג בית ספר במערכת AttendMe
    """

    def __init__(self, school_name, school_email, school_phone, school_address, admin_username, admin_password):
        """
        אתחול אובייקט בית ספר

        Args:
            school_name (str): שם בית הספר
            school_email (str): אימייל בית הספר
            school_phone (str): טלפון בית הספר
            school_address (str): כתובת בית הספר
            admin_username (str): שם משתמש של המנהל
            admin_password (str): סיסמה של המנהל
        """
        self.school_name = school_name
        self.school_email = school_email
        self.school_phone = school_phone
        self.school_address = school_address
        self.admin_username = admin_username
        self.admin_password = admin_password
        self.created_at = self._get_current_time()

    def _get_current_time(self):
        """
        קבלת זמן נוכחי

        Returns:
            str: זמן נוכחי בפורמט קריא
        """
        from datetime import datetime
        return datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    def __str__(self):
        """
        ייצוג טקסטואלי של בית הספר

        Returns:
            str: פרטי בית הספר
        """
        return f"🏫 {self.school_name} | מנהל: {self.admin_username} | אימייל: {self.school_email}"

    def get_school_info(self):
        """
        קבלת מידע מפורט על בית הספר

        Returns:
            dict: מילון עם כל פרטי בית הספר
        """
        return {
            'school_name': self.school_name,
            'school_email': self.school_email,
            'school_phone': self.school_phone,
            'school_address': self.school_address,
            'admin_username': self.admin_username,
            'created_at': self.created_at
        }


# ==================== AUTHENTICATION FUNCTIONS ====================

def login_user(username, password):
    """
    פונקציה להתחברות משתמש למערכת

    Args:
        username (str): שם המשתמש
        password (str): סיסמת המשתמש

    Returns:
        dict: תוצאת ההתחברות
    """
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
    """
    פונקציה להרשמת בית ספר חדש למערכת

    Args:
        school_data (dict): נתוני בית הספר החדש

    Returns:
        dict: תוצאת ההרשמה
    """
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
        new_school = School(
            school_name=school_name,
            school_email=school_email,
            school_phone=school_phone,
            school_address=school_address,
            admin_username=admin_username,
            admin_password=admin_password
        )

        # הוספה לווקטור הגלובלי
        schools_database.append(new_school)

        print(f"✅ בית הספר '{school_name}' נרשם בהצלחה עם המשתמש '{admin_username}'")
        print(f"📊 סה\"כ בתי ספר במערכת: {len(schools_database)}")

        return {
            'success': True,
            'message': f"בית הספר '{school_name}' נרשם בהצלחה! המשתמש '{admin_username}' יכול כעת להתחבר למערכת",
            'school_info': new_school.get_school_info()
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
    """
    קבלת רשימת כל בתי הספר במערכת

    Returns:
        list: רשימת כל בתי הספר
    """
    return schools_database


def get_schools_count():
    """
    קבלת מספר בתי הספר במערכת

    Returns:
        int: מספר בתי הספר
    """
    return len(schools_database)


def find_school_by_username(username):
    """
    חיפוש בית ספר לפי שם משתמש

    Args:
        username (str): שם המשתמש

    Returns:
        School: אובייקט בית הספר או None אם לא נמצא
    """
    for school in schools_database:
        if school.admin_username == username:
            return school
    return None


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
            print(f"{i}. {school}")

    print("=" * 60)


def clear_database():
    """
    ניקוי מסד הנתונים (לצורכי בדיקה)
    """
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


# ==================== MAIN FOR TESTING ====================

if __name__ == "__main__":
    print("🚀 מערכת AttendMe - ניהול בתי ספר")
    print("=" * 50)

    # הוספת נתוני הדגמה
    add_demo_data()

    # הצגת כל בתי הספר
    print_all_schools()

    # בדיקת התחברות
    print("\n🔐 בדיקת התחברות:")

    # התחברות מוצלחת
    result = login_user("admin_herzl", "herzl123")
    print(f"תוצאה: {result['message']}")

    # שם משתמש לא קיים
    result = login_user("admin_nonexistent", "password")
    print(f"תוצאה: {result['message']}")

    # סיסמה שגויה
    result = login_user("admin_herzl", "wrong_password")
    print(f"תוצאה: {result['message']}")

    # בדיקת הרשמה
    print("\n🏫 בדיקת הרשמה:")

    # הרשמה מוצלחת
    new_school_data = {
        'school_name': 'בית ספר אורט',
        'school_email': 'ort@education.gov.il',
        'school_phone': '02-5555555',
        'school_address': 'רחוב אורט 789, ירושלים',
        'admin_username': 'admin_ort',
        'admin_password': 'ort789'
    }

    result = register_school(new_school_data)
    print(f"תוצאה: {result['message']}")

    # ניסיון הרשמה עם שם משתמש קיים
    duplicate_user_data = {
        'school_name': 'בית ספר אחר',
        'school_email': 'other@education.gov.il',
        'school_phone': '02-7777777',
        'school_address': 'רחוב אחר 999, ירושלים',
        'admin_username': 'admin_ort',  # שם משתמש שכבר קיים
        'admin_password': 'other123'
    }

    result = register_school(duplicate_user_data)
    print(f"תוצאה: {result['message']}")

    # הצגה סופית של כל בתי הספר
    print_all_schools()