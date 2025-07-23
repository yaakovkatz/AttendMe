"""
=================================================================
                 School Manager - מנהל בתי ספר
=================================================================
מחלקה לניהול הפעלות משתמשים, אימות וביטחון המערכת.
כולל ניהול tokens, תפוגת הפעלות ורישום פעילות עבור בתי ספר.
=================================================================
"""

import os
import json
import uuid
import hashlib
import secrets
from datetime import datetime, timedelta
from functools import wraps
from flask import request, jsonify, session, current_app

class SchoolManager:
    def __init__(self):
        self.sessions = {}  # מאחסן sessions פעילים בזיכרון
        self.session_timeout = 24 * 60 * 60  # 24 שעות בשניות
        self.max_sessions_per_user = 5  # מקסימום הפעלות למשתמש

        # יצירת תיקיית sessions אם לא קיימת
        self.sessions_dir = "sessions"
        if not os.path.exists(self.sessions_dir):
            os.makedirs(self.sessions_dir)

        # טעינת sessions קיימים
        self.load_sessions()

    def create_session(self, school_id, user_data, request_ip=None):
        """יצירת הפעלה חדשה"""
        try:
            # יצירת session_id ייחודי
            session_id = str(uuid.uuid4())

            # יצירת token אבטחה
            security_token = secrets.token_urlsafe(32)

            # נתוני ההפעלה
            session_data = {
                'session_id': session_id,
                'school_id': school_id,
                'user_data': user_data,
                'created_at': datetime.now().isoformat(),
                'last_activity': datetime.now().isoformat(),
                'expires_at': (datetime.now() + timedelta(seconds=self.session_timeout)).isoformat(),
                'ip_address': request_ip or 'unknown',
                'security_token': security_token,
                'is_active': True
            }

            # ניקוי sessions ישנים של אותו משתמש
            self.cleanup_user_sessions(user_data['username'], school_id)

            # שמירת ההפעלה
            self.sessions[session_id] = session_data
            self.save_session_to_file(session_id, session_data)

            print(f"✅ נוצרה הפעלה חדשה: {session_id[:8]}... למשתמש {user_data['username']}")

            return {
                'success': True,
                'session_id': session_id,
                'security_token': security_token,
                'expires_at': session_data['expires_at']
            }

        except Exception as e:
            print(f"❌ שגיאה ביצירת הפעלה: {str(e)}")
            return {'success': False, 'error': str(e)}

    def validate_session(self, session_id, security_token=None):
        """בדיקת תקינות הפעלה"""
        try:
            # בדיקה שההפעלה קיימת
            if session_id not in self.sessions:
                # נסיון טעינה מקובץ
                self.load_session_from_file(session_id)

                if session_id not in self.sessions:
                    return {'valid': False, 'reason': 'session_not_found'}

            session_data = self.sessions[session_id]

            # בדיקה שההפעלה פעילה
            if not session_data.get('is_active', False):
                return {'valid': False, 'reason': 'session_inactive'}

            # בדיקת תפוגה
            expires_at = datetime.fromisoformat(session_data['expires_at'])
            if datetime.now() > expires_at:
                self.invalidate_session(session_id)
                return {'valid': False, 'reason': 'session_expired'}

            # בדיקת token אבטחה (אם סופק)
            if security_token and session_data.get('security_token') != security_token:
                return {'valid': False, 'reason': 'invalid_token'}

            # עדכון זמן פעילות אחרון
            session_data['last_activity'] = datetime.now().isoformat()
            self.sessions[session_id] = session_data

            return {
                'valid': True,
                'session_data': session_data
            }

        except Exception as e:
            print(f"❌ שגיאה בבדיקת הפעלה: {str(e)}")
            return {'valid': False, 'reason': 'validation_error', 'error': str(e)}

    def invalidate_session(self, session_id):
        """ביטול הפעלה"""
        try:
            if session_id in self.sessions:
                # סימון כלא פעיל
                self.sessions[session_id]['is_active'] = False
                self.sessions[session_id]['invalidated_at'] = datetime.now().isoformat()

                # שמירה לקובץ ומחיקה מזיכרון
                self.save_session_to_file(session_id, self.sessions[session_id])
                del self.sessions[session_id]

                print(f"✅ הפעלה בוטלה: {session_id[:8]}...")
                return True

            return False

        except Exception as e:
            print(f"❌ שגיאה בביטול הפעלה: {str(e)}")
            return False

    def cleanup_user_sessions(self, username, school_id):
        """ניקוי הפעלות ישנות של משתמש"""
        try:
            user_sessions = []

            # איסוף הפעלות של המשתמש
            for sid, sdata in list(self.sessions.items()):
                if (sdata.get('user_data', {}).get('username') == username and
                    sdata.get('school_id') == school_id and
                    sdata.get('is_active', False)):
                    user_sessions.append((sid, sdata))

            # אם יש יותר מדי הפעלות, מחיקת הישנות
            if len(user_sessions) >= self.max_sessions_per_user:
                # מיון לפי זמן יצירה
                user_sessions.sort(key=lambda x: x[1]['created_at'])

                # מחיקת ההפעלות הישנות
                sessions_to_remove = len(user_sessions) - self.max_sessions_per_user + 1
                for i in range(sessions_to_remove):
                    old_session_id = user_sessions[i][0]
                    self.invalidate_session(old_session_id)
                    print(f"🧹 הוסרה הפעלה ישנה: {old_session_id[:8]}...")

        except Exception as e:
            print(f"❌ שגיאה בניקוי הפעלות: {str(e)}")

    def cleanup_expired_sessions(self):
        """ניקוי הפעלות שפגו"""
        try:
            expired_sessions = []
            current_time = datetime.now()

            for session_id, session_data in list(self.sessions.items()):
                try:
                    expires_at = datetime.fromisoformat(session_data['expires_at'])
                    if current_time > expires_at:
                        expired_sessions.append(session_id)
                except:
                    # אם יש בעיה עם תאריך, מחק את ההפעלה
                    expired_sessions.append(session_id)

            # מחיקת הפעלות שפגו
            for session_id in expired_sessions:
                self.invalidate_session(session_id)

            if expired_sessions:
                print(f"🧹 נוקו {len(expired_sessions)} הפעלות שפגו")

        except Exception as e:
            print(f"❌ שגיאה בניקוי הפעלות שפגו: {str(e)}")

    def get_session_info(self, session_id):
        """קבלת מידע על הפעלה"""
        validation_result = self.validate_session(session_id)

        if validation_result['valid']:
            session_data = validation_result['session_data']
            return {
                'session_id': session_id,
                'school_id': session_data['school_id'],
                'username': session_data['user_data']['username'],
                'user_role': session_data['user_data']['role'],
                'created_at': session_data['created_at'],
                'last_activity': session_data['last_activity'],
                'expires_at': session_data['expires_at']
            }

        return None

    def extend_session(self, session_id, additional_hours=24):
        """הארכת הפעלה"""
        try:
            if session_id in self.sessions:
                new_expiry = datetime.now() + timedelta(hours=additional_hours)
                self.sessions[session_id]['expires_at'] = new_expiry.isoformat()
                self.save_session_to_file(session_id, self.sessions[session_id])
                return True

            return False

        except Exception as e:
            print(f"❌ שגיאה בהארכת הפעלה: {str(e)}")
            return False

    def get_user_sessions(self, username, school_id):
        """קבלת כל הפעלות המשתמש"""
        try:
            user_sessions = []

            for session_id, session_data in self.sessions.items():
                if (session_data.get('user_data', {}).get('username') == username and
                    session_data.get('school_id') == school_id and
                    session_data.get('is_active', False)):

                    user_sessions.append({
                        'session_id': session_id,
                        'created_at': session_data['created_at'],
                        'last_activity': session_data['last_activity'],
                        'ip_address': session_data.get('ip_address', 'unknown')
                    })

            return user_sessions

        except Exception as e:
            print(f"❌ שגיאה בקבלת הפעלות משתמש: {str(e)}")
            return []

    def save_session_to_file(self, session_id, session_data):
        """שמירת הפעלה לקובץ"""
        try:
            session_file = os.path.join(self.sessions_dir, f"{session_id}.json")
            with open(session_file, 'w', encoding='utf-8') as f:
                json.dump(session_data, f, ensure_ascii=False, indent=2)
        except Exception as e:
            print(f"❌ שגיאה בשמירת הפעלה לקובץ: {str(e)}")

    def load_session_from_file(self, session_id):
        """טעינת הפעלה מקובץ"""
        try:
            session_file = os.path.join(self.sessions_dir, f"{session_id}.json")
            if os.path.exists(session_file):
                with open(session_file, 'r', encoding='utf-8') as f:
                    session_data = json.load(f)
                self.sessions[session_id] = session_data
                return True
        except Exception as e:
            print(f"❌ שגיאה בטעינת הפעלה מקובץ: {str(e)}")

        return False

    def load_sessions(self):
        """טעינת כל ההפעלות מקבצים"""
        try:
            if not os.path.exists(self.sessions_dir):
                return

            session_files = [f for f in os.listdir(self.sessions_dir) if f.endswith('.json')]
            loaded_count = 0

            for session_file in session_files:
                session_id = session_file[:-5]  # הסרת .json
                if self.load_session_from_file(session_id):
                    loaded_count += 1

            if loaded_count > 0:
                print(f"✅ נטענו {loaded_count} הפעלות מקבצים")

            # ניקוי הפעלות שפגו
            self.cleanup_expired_sessions()

        except Exception as e:
            print(f"❌ שגיאה בטעינת הפעלות: {str(e)}")

    def get_stats(self):
        """סטטיסטיקות הפעלות"""
        try:
            active_sessions = len(self.sessions)
            schools_active = len(set(s.get('school_id', '') for s in self.sessions.values()))
            users_active = len(set(s.get('user_data', {}).get('username', '') for s in self.sessions.values()))

            return {
                'active_sessions': active_sessions,
                'schools_active': schools_active,
                'users_active': users_active,
                'session_timeout_hours': self.session_timeout / 3600,
                'max_sessions_per_user': self.max_sessions_per_user
            }
        except Exception as e:
            print(f"❌ שגיאה בקבלת סטטיסטיקות: {str(e)}")
            return {}

    def get_all_schools_activity(self):
        """קבלת סטטיסטיקות פעילות של כל בתי הספר"""
        try:
            from School import School

            schools_activity = {}
            all_schools = School.get_all_schools()

            # אתחול נתונים לכל בית ספר
            for school_info in all_schools:
                schools_activity[school_info['school_id']] = {
                    'school_name': school_info['name'],
                    'active_sessions': 0,
                    'active_users': 0,
                    'total_users': school_info.get('total_users', 0),
                    'total_people': school_info.get('total_people', 0)
                }

            # חישוב פעילות נוכחית
            for session_data in self.sessions.values():
                school_id = session_data.get('school_id', '')
                if school_id in schools_activity:
                    schools_activity[school_id]['active_sessions'] += 1

            # חישוב משתמשים פעילים לכל בית ספר
            school_users = {}
            for session_data in self.sessions.values():
                school_id = session_data.get('school_id', '')
                username = session_data.get('user_data', {}).get('username', '')
                if school_id and username:
                    if school_id not in school_users:
                        school_users[school_id] = set()
                    school_users[school_id].add(username)

            for school_id, users in school_users.items():
                if school_id in schools_activity:
                    schools_activity[school_id]['active_users'] = len(users)

            return schools_activity

        except Exception as e:
            print(f"❌ שגיאה בקבלת פעילות בתי ספר: {str(e)}")
            return {}


# יצירת instance גלובלי
school_manager = SchoolManager()


def require_auth(f):
    """דקורטור לדרישת אימות"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        try:
            # בדיקת session_id בכותרות או בעוגיות
            session_id = request.headers.get('X-Session-ID') or request.cookies.get('session_id')
            security_token = request.headers.get('X-Security-Token') or request.cookies.get('security_token')

            if not session_id:
                return jsonify({'error': 'נדרש אימות', 'authenticated': False}), 401

            # בדיקת תקינות ההפעלה
            validation = school_manager.validate_session(session_id, security_token)

            if not validation['valid']:
                return jsonify({
                    'error': 'הפעלה לא תקינה או שפגה',
                    'authenticated': False,
                    'reason': validation.get('reason', 'unknown')
                }), 401

            # הוספת נתוני ההפעלה ל-request
            request.session_data = validation['session_data']
            request.current_school_id = validation['session_data']['school_id']
            request.current_user = validation['session_data']['user_data']

            return f(*args, **kwargs)

        except Exception as e:
            return jsonify({'error': f'שגיאה באימות: {str(e)}', 'authenticated': False}), 500

    return decorated_function


def require_role(required_role):
    """דקורטור לדרישת תפקיד ספציפי"""
    def decorator(f):
        @wraps(f)
        @require_auth
        def decorated_function(*args, **kwargs):
            user_role = request.current_user.get('role', '')

            if user_role != required_role and user_role != 'admin':
                return jsonify({
                    'error': f'נדרש תפקיד {required_role}',
                    'authenticated': True,
                    'authorized': False
                }), 403

            return f(*args, **kwargs)

        return decorated_function
    return decorator


def get_current_session():
    """קבלת הפעלה נוכחית"""
    return getattr(request, 'session_data', None)


def get_current_user():
    """קבלת משתמש נוכחי"""
    return getattr(request, 'current_user', None)


def get_current_school_id():
    """קבלת מזהה בית ספר נוכחי"""
    return getattr(request, 'current_school_id', None)


def get_school_manager():
    """קבלת מנהל בתי הספר"""
    return school_manager