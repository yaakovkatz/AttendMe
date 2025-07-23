"""
=================================================================
                    School Class - ניהול בתי ספר
=================================================================
מחלקה לניהול בית ספר בודד עם כל הנתונים השייכים לו:
- פרטי בית ספר (שם, כתובת, טלפון וכו')
- משתמשים (מנהלים, מורים)
- אנשים (תלמידים/עובדים)
- תמונות מטרה
- היסטוריית נוכחות
=================================================================
"""

import os
import json
import hashlib
import uuid
from datetime import datetime
from Person import Person
from Target import Target

class School:
    def __init__(self, school_id=None, name=None, email=None, phone=None,
                 address=None, admin_username=None, admin_password=None):
        # מזהה ייחודי של בית הספר
        self.school_id = school_id if school_id else str(uuid.uuid4())

        # פרטי בית ספר
        self.name = name
        self.email = email
        self.phone = phone
        self.address = address
        self.created_at = datetime.now().isoformat()
        self.updated_at = datetime.now().isoformat()

        # משתמשים (מנהלים, מורים)
        self.users = {}

        # נתונים פנימיים של בית הספר
        self.people_vector = []
        self.targets_vector = []
        self.attendance_history = []

        # הגדרות בית ספר
        self.settings = {
            'face_recognition_threshold': 0.6,
            'max_images_per_person': 5,
            'auto_attendance_check': False,
            'attendance_check_interval': 300,  # 5 דקות
            'timezone': 'Asia/Jerusalem'
        }

        # יצירת מנהל ראשי אם מסופקים פרטים
        if admin_username and admin_password:
            self.add_user(admin_username, admin_password, 'admin', 'מנהל ראשי')

    def add_user(self, username, password, role='teacher', display_name=''):
        """הוספת משתמש חדש לבית הספר"""
        if username in self.users:
            return False, "שם המשתמש כבר קיים"

        # הצפנת סיסמה
        password_hash = hashlib.sha256(password.encode()).hexdigest()

        user_data = {
            'username': username,
            'password_hash': password_hash,
            'role': role,  # admin, teacher, viewer
            'display_name': display_name,
            'created_at': datetime.now().isoformat(),
            'last_login': None,
            'is_active': True
        }

        self.users[username] = user_data
        self.save_school_data()
        return True, "המשתמש נוסף בהצלחה"

    def authenticate_user(self, username, password):
        """בדיקת זהות משתמש"""
        if username not in self.users:
            return False, None

        user = self.users[username]
        if not user['is_active']:
            return False, None

        password_hash = hashlib.sha256(password.encode()).hexdigest()

        if user['password_hash'] == password_hash:
            # עדכון זמן התחברות אחרון
            user['last_login'] = datetime.now().isoformat()
            self.save_school_data()
            return True, user

        return False, None

    def add_person(self, first_name, last_name, id_number, images_url):
        """הוספת אדם חדש לבית הספר"""
        # בדיקה אם האדם כבר קיים
        if any(person.id_number == id_number for person in self.people_vector):
            return {
                'success': False,
                'person': None,
                'message': f"אדם עם מספר תעודת זהות {id_number} כבר קיים במערכת",
                'error': 'DUPLICATE_ID'
            }

        # יצירת אדם חדש
        new_person = Person(first_name, last_name, id_number, images_url)
        self.people_vector.append(new_person)

        # שמירת נתונים
        self.save_school_data()

        return {
            'success': True,
            'person': new_person,
            'message': f"האדם {new_person.get_full_name_and_id()} נוצר בהצלחה",
            'error': None
        }

    def remove_person(self, id_number):
        """מחיקת אדם מבית הספר"""
        for i, person in enumerate(self.people_vector):
            if person.id_number == id_number:
                removed_person = self.people_vector.pop(i)
                self.save_school_data()
                return True, f"נמחק: {removed_person.get_full_name_and_id()}"

        return False, f"לא נמצא אדם עם ת.ז. {id_number}"

    def get_person(self, person_id):
        """קבלת פרטי אדם"""
        for person in self.people_vector:
            if person.id_number == person_id:
                return person.get_person_details()
        return None

    def add_target(self, camera_number, images_url, enable_face_detection=False):
        """הוספת תמונת מטרה"""
        try:
            new_target = Target(camera_number, images_url, enable_face_detection=enable_face_detection)
            self.targets_vector.append(new_target)
            self.save_school_data()

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

    def remove_target(self, camera_number):
        """מחיקת תמונת מטרה"""
        for i, target in enumerate(self.targets_vector):
            if target.camera_number == camera_number:
                removed_target = self.targets_vector.pop(i)
                self.save_school_data()
                return True, f"נמחקה מטרה: מצלמה {removed_target.camera_number}"

        return False, f"לא נמצאה מטרה עם מספר מצלמה {camera_number}"

    def record_attendance(self, person_id, status, timestamp=None, method='auto'):
        """רישום נוכחות"""
        if not timestamp:
            timestamp = datetime.now().isoformat()

        attendance_record = {
            'person_id': person_id,
            'status': status,  # present/absent
            'timestamp': timestamp,
            'method': method,  # auto/manual
            'school_id': self.school_id
        }

        self.attendance_history.append(attendance_record)

        # עדכון סטטוס נוכחות באדם
        person = next((p for p in self.people_vector if p.id_number == person_id), None)
        if person:
            person.set_presence(status == 'present')

        self.save_school_data()
        return True

    def get_attendance_report(self, date=None):
        """קבלת דוח נוכחות"""
        if not date:
            date = datetime.now().date().isoformat()

        # סינון לפי תאריך
        daily_attendance = [
            record for record in self.attendance_history
            if record['timestamp'].startswith(date)
        ]

        return daily_attendance

    def get_school_stats(self):
        """סטטיסטיקות בית ספר"""
        total_people = len(self.people_vector)
        present_people = len([p for p in self.people_vector if p.is_present])
        absent_people = total_people - present_people
        total_targets = len(self.targets_vector)

        return {
            'school_name': self.name,
            'total_people': total_people,
            'present_people': present_people,
            'absent_people': absent_people,
            'total_targets': total_targets,
            'total_users': len(self.users),
            'created_at': self.created_at
        }

    def save_school_data(self):
        """שמירת נתוני בית ספר לקובץ JSON"""
        try:
            # יצירת תיקיית בתי ספר אם לא קיימת
            schools_dir = "schools_data"
            if not os.path.exists(schools_dir):
                os.makedirs(schools_dir)

            # נתיב קובץ בית ספר ספציפי
            school_file = os.path.join(schools_dir, f"{self.school_id}.json")

            # הכנת נתונים לשמירה
            school_data = {
                'school_info': {
                    'school_id': self.school_id,
                    'name': self.name,
                    'email': self.email,
                    'phone': self.phone,
                    'address': self.address,
                    'created_at': self.created_at,
                    'updated_at': datetime.now().isoformat()
                },
                'users': self.users,
                'people': [person.get_person_details() for person in self.people_vector],
                'targets': [
                    {
                        'camera_number': target.camera_number,
                        'image_url': target.image_url,
                        'faces_count': target.faces_count,
                        'is_checked': target.is_checked
                    }
                    for target in self.targets_vector
                ],
                'attendance_history': self.attendance_history,
                'settings': self.settings
            }

            # שמירה לקובץ
            with open(school_file, 'w', encoding='utf-8') as f:
                json.dump(school_data, f, ensure_ascii=False, indent=2)

            return True, f"נתוני בית ספר נשמרו: {school_file}"

        except Exception as e:
            return False, f"שגיאה בשמירת נתונים: {str(e)}"

    @classmethod
    def load_school_data(cls, school_id):
        """טעינת נתוני בית ספר מקובץ JSON"""
        try:
            school_file = os.path.join("schools_data", f"{school_id}.json")

            if not os.path.exists(school_file):
                return None, f"קובץ בית ספר לא נמצא: {school_id}"

            with open(school_file, 'r', encoding='utf-8') as f:
                data = json.load(f)

            # יצירת אובייקט בית ספר
            school_info = data['school_info']
            school = cls(
                school_id=school_info['school_id'],
                name=school_info['name'],
                email=school_info['email'],
                phone=school_info['phone'],
                address=school_info['address']
            )

            # טעינת משתמשים
            school.users = data.get('users', {})

            # טעינת אנשים
            school.people_vector = []
            for person_data in data.get('people', []):
                person = Person(
                    person_data['first_name'],
                    person_data['last_name'],
                    person_data['id_number'],
                    person_data.get('image_urls', [])
                )
                person.set_presence(person_data.get('is_present', False))
                school.people_vector.append(person)

            # טעינת מטרות
            school.targets_vector = []
            for target_data in data.get('targets', []):
                target = Target(
                    target_data['camera_number'],
                    target_data['image_url']
                )
                target.faces_count = target_data.get('faces_count', 0)
                target.is_checked = target_data.get('is_checked', False)
                school.targets_vector.append(target)

            # טעינת היסטוריית נוכחות והגדרות
            school.attendance_history = data.get('attendance_history', [])
            school.settings.update(data.get('settings', {}))

            # עדכון זמני
            school.created_at = school_info.get('created_at', school.created_at)
            school.updated_at = school_info.get('updated_at', datetime.now().isoformat())

            return school, "נתוני בית ספר נטענו בהצלחה"

        except Exception as e:
            return None, f"שגיאה בטעינת נתונים: {str(e)}"

    @staticmethod
    def get_all_schools():
        """קבלת רשימת כל בתי הספר"""
        try:
            schools_dir = "schools_data"
            if not os.path.exists(schools_dir):
                return []

            schools = []
            for filename in os.listdir(schools_dir):
                if filename.endswith('.json'):
                    school_id = filename[:-5]  # הסרת .json
                    try:
                        with open(os.path.join(schools_dir, filename), 'r', encoding='utf-8') as f:
                            data = json.load(f)

                        school_info = data.get('school_info', {})
                        schools.append({
                            'school_id': school_id,
                            'name': school_info.get('name', 'לא מוגדר'),
                            'email': school_info.get('email', ''),
                            'created_at': school_info.get('created_at', ''),
                            'total_users': len(data.get('users', {})),
                            'total_people': len(data.get('people', []))
                        })
                    except:
                        continue

            return schools

        except Exception as e:
            print(f"שגיאה בקבלת רשימת בתי ספר: {str(e)}")
            return []

    def update_settings(self, new_settings):
        """עדכון הגדרות בית ספר"""
        self.settings.update(new_settings)
        self.save_school_data()

    def get_school_details(self):
        """קבלת פרטי בית ספר מלאים"""
        return {
            'school_id': self.school_id,
            'name': self.name,
            'email': self.email,
            'phone': self.phone,
            'address': self.address,
            'created_at': self.created_at,
            'updated_at': self.updated_at,
            'settings': self.settings,
            'stats': self.get_school_stats()
        }

    def __str__(self):
        return f"School(id={self.school_id}, name='{self.name}', people={len(self.people_vector)})"

    def __repr__(self):
        return self.__str__()