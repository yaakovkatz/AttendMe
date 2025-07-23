import hashlib
import secrets
from datetime import datetime, timedelta
import uuid


class User:
    def __init__(self, username, password, email, full_name, role="user", school_id=None):
        # מזהה יחודי למשתמש
        self.user_id = str(uuid.uuid4())

        # פרטי כניסה
        self.username = username
        self.password_hash = self._hash_password(password)
        self.email = email
        self.full_name = full_name

        # הרשאות ותפקיד
        self.role = role  # admin, teacher, staff, user
        self.permissions = self._get_default_permissions(role)

        # קישור לבית ספר
        self.school_id = school_id

        # מידע נוסף
        self.is_active = True
        self.created_at = datetime.now()
        self.last_login = None
        self.login_attempts = 0
        self.locked_until = None

        # הגדרות משתמש
        self.settings = {
            "notifications": True,
            "language": "he",
            "theme": "default"
        }

        # סשן
        self.current_session_token = None
        self.session_expires_at = None

        print(f"✅ נוצר משתמש חדש: {self.username} ({self.role})")

    def _hash_password(self, password):
        """הצפנת סיסמה"""
        # יצירת salt אקראי
        salt = secrets.token_hex(32)
        # יצירת hash עם salt
        password_hash = hashlib.pbkdf2_hmac('sha256', password.encode(), salt.encode(), 100000)
        # החזרת salt + hash
        return salt + password_hash.hex()

    def verify_password(self, password):
        """אימות סיסמה"""
        if len(self.password_hash) < 64:
            return False

        # הפרדת salt מה-hash
        salt = self.password_hash[:64]
        stored_hash = self.password_hash[64:]

        # יצירת hash מהסיסמה שהוזנה
        password_hash = hashlib.pbkdf2_hmac('sha256', password.encode(), salt.encode(), 100000)

        return password_hash.hex() == stored_hash

    def _get_default_permissions(self, role):
        """קבלת הרשאות ברירת מחדל לפי תפקיד"""
        permissions = {
            "admin": {
                "manage_school": True,
                "manage_users": True,
                "manage_people": True,
                "manage_targets": True,
                "view_reports": True,
                "system_settings": True,
                "attendance_check": True
            },
            "teacher": {
                "manage_school": False,
                "manage_users": False,
                "manage_people": True,
                "manage_targets": False,
                "view_reports": True,
                "system_settings": False,
                "attendance_check": True
            },
            "staff": {
                "manage_school": False,
                "manage_users": False,
                "manage_people": False,
                "manage_targets": False,
                "view_reports": True,
                "system_settings": False,
                "attendance_check": True
            },
            "user": {
                "manage_school": False,
                "manage_users": False,
                "manage_people": False,
                "manage_targets": False,
                "view_reports": False,
                "system_settings": False,
                "attendance_check": False
            }
        }

        return permissions.get(role, permissions["user"])

    def login(self, password):
        """כניסה למערכת"""
        # בדיקה אם החשבון נעול
        if self.locked_until and datetime.now() < self.locked_until:
            remaining = (self.locked_until - datetime.now()).total_seconds() / 60
            return {
                "success": False,
                "error": f"חשבון נעול למשך {remaining:.0f} דקות נוספות"
            }

        # אימות סיסמה
        if not self.verify_password(password):
            self.login_attempts += 1

            # נעילת חשבון אחרי 5 נסיונות
            if self.login_attempts >= 5:
                self.locked_until = datetime.now() + timedelta(minutes=30)
                return {
                    "success": False,
                    "error": "חשבון נעול למשך 30 דקות בגין נסיונות כניסה חוזרים"
                }

            return {
                "success": False,
                "error": f"סיסמה שגויה. נותרו {5 - self.login_attempts} נסיונות"
            }

        # כניסה מוצלחת
        self.login_attempts = 0  # איפוס נסיונות
        self.locked_until = None
        self.last_login = datetime.now()

        # יצירת session token
        self.current_session_token = secrets.token_urlsafe(32)
        self.session_expires_at = datetime.now() + timedelta(hours=8)  # סשן תקף ל-8 שעות

        print(f"✅ משתמש נכנס למערכת: {self.username}")

        return {
            "success": True,
            "user_id": self.user_id,
            "username": self.username,
            "role": self.role,
            "school_id": self.school_id,
            "session_token": self.current_session_token,
            "expires_at": self.session_expires_at.isoformat()
        }

    def logout(self):
        """יציאה מהמערכת"""
        self.current_session_token = None
        self.session_expires_at = None
        print(f"✅ משתמש יצא מהמערכת: {self.username}")

    def is_session_valid(self):
        """בדיקה אם הסשן תקף"""
        if not self.current_session_token or not self.session_expires_at:
            return False
        return datetime.now() < self.session_expires_at

    def extend_session(self, hours=8):
        """הארכת סשן"""
        if self.is_session_valid():
            self.session_expires_at = datetime.now() + timedelta(hours=hours)
            return True
        return False

    def has_permission(self, permission):
        """בדיקה אם למשתמש יש הרשאה ספציפית"""
        return self.permissions.get(permission, False)

    def change_password(self, old_password, new_password):
        """החלפת סיסמה"""
        if not self.verify_password(old_password):
            return {
                "success": False,
                "error": "סיסמה נוכחית שגויה"
            }

        # בדיקת חוזק סיסמה חדשה
        if len(new_password) < 8:
            return {
                "success": False,
                "error": "סיסמה חייבת להכיל לפחות 8 תווים"
            }

        self.password_hash = self._hash_password(new_password)
        print(f"✅ סיסמה הוחלפה למשתמש: {self.username}")

        return {
            "success": True,
            "message": "סיסמה הוחלפה בהצלחה"
        }

    def update_profile(self, **kwargs):
        """עדכון פרופיל משתמש"""
        allowed_fields = ['email', 'full_name']

        for field, value in kwargs.items():
            if field in allowed_fields and hasattr(self, field):
                setattr(self, field, value)

        print(f"✅ פרופיל עודכן למשתמש: {self.username}")

    def update_settings(self, settings_dict):
        """עדכון הגדרות משתמש"""
        self.settings.update(settings_dict)
        print(f"✅ הגדרות עודכנו למשתמש: {self.username}")

    def activate(self):
        """הפעלת משתמש"""
        self.is_active = True
        print(f"✅ משתמש הופעל: {self.username}")

    def deactivate(self):
        """השבתת משתמש"""
        self.is_active = False
        self.logout()  # יציאה אוטומטית
        print(f"⚠️ משתמש הושבת: {self.username}")

    def get_user_details(self):
        """קבלת פרטי משתמש"""
        return {
            "user_id": self.user_id,
            "username": self.username,
            "email": self.email,
            "full_name": self.full_name,
            "role": self.role,
            "school_id": self.school_id,
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat(),
            "last_login": self.last_login.isoformat() if self.last_login else None,
            "permissions": self.permissions,
            "settings": self.settings
        }

    def get_user_summary(self):
        """קבלת סיכום משתמש"""
        return {
            "user_id": self.user_id,
            "username": self.username,
            "full_name": self.full_name,
            "role": self.role,
            "is_active": self.is_active,
            "last_login": self.last_login.strftime("%d/%m/%Y %H:%M") if self.last_login else "מעולם לא נכנס"
        }

    def __str__(self):
        return f"User(username='{self.username}', role='{self.role}', school_id='{self.school_id}')"

    def __repr__(self):
        return self.__str__()