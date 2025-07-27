"""
=================================================================
                    מערכת AttendMe - ניהול נוכחות
=================================================================
מבנה הקובץ מחולק לפי נושאים:
1. Imports והגדרות
2. הגדרות ופונקציות עזר
3. Routes עיקריים (עמוד בית)
4. School Authentication Routes (הוסף!)
5. API - ניהול אנשים
6. API - ניהול תמונות זמניות
7. API - ניהול תמונות מטרה
8. API - פונקציות מתקדמות
9. הפעלת השרת
=================================================================
"""

# ===============================================================================
#                                   IMPORTS והגדרות
# ===============================================================================
# ייבוא הקבצים המקומיים
from Data_Manage import (add_new_person, remove_person, get_all_people, get_person,
                         update_person, toggle_presence, add_new_target, remove_target,
                         get_all_targets, clear_all_targets, login_user, register_school,
                         add_demo_data, print_all_schools)

from Attend_Manage import (extract_all_faces_from_targets, check_attendance_for_all_people)


from flask import Flask, render_template, request, jsonify
from flask_cors import CORS
import os
import time
import logging
from dotenv import load_dotenv

load_dotenv()

import cloudinary
import cloudinary.uploader
import cloudinary.api

# הגדרת Cloudinary
cloudinary.config(
    cloud_name=os.environ.get('CLOUDINARY_CLOUD_NAME'),
    api_key=os.environ.get('CLOUDINARY_API_KEY'),
    api_secret=os.environ.get('CLOUDINARY_API_SECRET'),
    secure=True
)

# נתיבי קבצים
DATA_FILE = os.path.join(os.path.dirname(__file__), 'people_data.json')
TARGET_IMAGES_FILE = os.path.join(os.path.dirname(__file__), 'target_images.json')

# הגדרת Flask
app = Flask(__name__,
            template_folder='web_templates',
            static_folder='web_static')

# הוסף CORS (הוסף!)
CORS(app)

logging.basicConfig(level=logging.INFO)
app.logger.setLevel(logging.INFO)


# ===============================================================================
#                                    ROUTES עיקריים
# ===============================================================================

@app.route('/')
def index():
    """עמוד הבית - מציג את הממשק הראשי של המערכת"""
    return render_template('home.html')


@app.route('/login')
def login_page():
    """דף התחברות למערכת"""
    return render_template('login.html')


@app.route('/login.html')
def login_page_html():
    """דף התחברות עם סיומת .html"""
    return render_template('login.html')

# ===============================================================================
#                         SCHOOL AUTHENTICATION ROUTES (הוסф!)
# ===============================================================================

@app.route('/api/login', methods=['POST'])
def api_login():
    """
    API להתחברות משתמש - מערכת בתי ספר
    """
    try:
        # קבלת נתונים מה-JavaScript
        data = request.get_json()

        if not data:
            return jsonify({
                'success': False,
                'message': 'לא התקבלו נתונים',
                'error_type': 'no_data'
            }), 400

        username = data.get('username', '').strip()
        password = data.get('password', '')

        # בדיקת נתונים בסיסית
        if not username or not password:
            return jsonify({
                'success': False,
                'message': 'שם משתמש וסיסמה נדרשים',
                'error_type': 'missing_credentials'
            }), 400

        print(f"🔐 API: ניסיון התחברות - {username}")

        # קריאה לפונקציה מ-School.py
        result = login_user(username, password)

        # החזרת התוצאה ל-JavaScript
        if result['success']:
            print(f"✅ API: התחברות מוצלחת - {username}")
            return jsonify(result), 200
        else:
            print(f"❌ API: התחברות נכשלה - {username} ({result['error_type']})")
            return jsonify(result), 401

    except Exception as e:
        print(f"❌ API: שגיאה בהתחברות - {str(e)}")
        return jsonify({
            'success': False,
            'message': f'שגיאת שרת: {str(e)}',
            'error_type': 'server_error'
        }), 500

@app.route('/api/register', methods=['POST'])
def api_register():
    """
    API להרשמת בית ספר חדש
    """
    try:
        # קבלת נתונים מה-JavaScript
        data = request.get_json()

        if not data:
            return jsonify({
                'success': False,
                'message': 'לא התקבלו נתונים',
                'error_type': 'no_data'
            }), 400

        print(f"🏫 API: ניסיון הרשמה - {data.get('school_name', 'לא צוין')}")

        # קריאה לפונקציה מ-School.py
        result = register_school(data)

        # החזרת התוצאה ל-JavaScript
        if result['success']:
            print(f"✅ API: הרשמה מוצלחת - {data.get('school_name')}")
            return jsonify(result), 201
        else:
            print(f"❌ API: הרשמה נכשלה - {data.get('school_name')} ({result['error_type']})")
            return jsonify(result), 400

    except Exception as e:
        print(f"❌ API: שגיאה בהרשמה - {str(e)}")
        return jsonify({
            'success': False,
            'message': f'שגיאת שרת: {str(e)}',
            'error_type': 'server_error'
        }), 500

@app.route('/api/schools', methods=['GET'])
def api_get_schools():
    """
    API לקבלת רשימת כל בתי הספר (לבדיקה)
    """
    try:
        from School import get_all_schools, get_schools_count

        schools = get_all_schools()
        schools_list = []

        for school in schools:
            schools_list.append({
                'school_name': school.school_name,
                'school_email': school.school_email,
                'school_phone': school.school_phone,
                'admin_username': school.admin_username,
                'created_at': school.created_at
            })

        return jsonify({
            'success': True,
            'count': get_schools_count(),
            'schools': schools_list
        }), 200

    except Exception as e:
        print(f"❌ API: שגיאה בקבלת בתי ספר - {str(e)}")
        return jsonify({
            'success': False,
            'message': f'שגיאת שרת: {str(e)}',
            'error_type': 'server_error'
        }), 500

@app.route('/api/schools/<username>', methods=['GET'])
def api_get_school_by_username(username):
    """
    API לקבלת פרטי בית ספר לפי שם משתמש
    """
    try:
        from School import find_school_by_username

        school = find_school_by_username(username)

        if school:
            return jsonify({
                'success': True,
                'school_info': school.get_school_info()
            }), 200
        else:
            return jsonify({
                'success': False,
                'message': f'לא נמצא בית ספר עם שם המשתמש: {username}',
                'error_type': 'school_not_found'
            }), 404

    except Exception as e:
        print(f"❌ API: שגיאה בחיפוש בית ספר - {str(e)}")
        return jsonify({
            'success': False,
            'message': f'שגיאת שרת: {str(e)}',
            'error_type': 'server_error'
        }), 500

@app.route('/api/test', methods=['GET'])
def api_test():
    """
    API לבדיקת תקינות השרת
    """
    return jsonify({
        'success': True,
        'message': 'השרת פועל תקין! 🚀',
        'timestamp': __import__('datetime').datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    }), 200

@app.route('/api/debug/schools', methods=['GET'])
def api_debug_schools():
    """
    API לדיבוג - הדפסת כל בתי הספר לקונסול
    """
    try:
        print("\n" + "="*60)
        print("🔧 API DEBUG: הדפסת כל בתי הספר")
        print_all_schools()
        print("="*60 + "\n")

        return jsonify({
            'success': True,
            'message': 'רשימת בתי הספר הודפסה לקונסול'
        }), 200

    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'שגיאה: {str(e)}'
        }), 500


# ===============================================================================
#                               API - ניהול אנשים (CRUD) - מעודכן
# ===============================================================================

@app.route('/api/people/create_person', methods=['POST'])
def create_person():
    """יוצר אדם חדש עם תמונות לבית ספר ספציפי"""
    try:
        data = request.json

        # קבלת username מהבקשה
        username = data.get('username')
        if not username:
            return jsonify({
                'success': False,
                'message': 'שם משתמש נדרש'
            }), 400

        # חיפוש אינדקס בית הספר
        from Data_Manage import get_school_index_by_username
        school_index = get_school_index_by_username(username)

        if school_index == -1:
            return jsonify({
                'success': False,
                'message': 'בית ספר לא נמצא'
            }), 404

        # קרא לפונקציה המעודכנת מ-Data_Manage
        person_details = data['person_details']
        result = add_new_person(
            school_index,  # 🎯 הוספנו את school_index!
            person_details['first_name'],
            person_details['last_name'],
            person_details['id_number'],
            data['image_urls']
        )

        # החזרת תוצאה
        if result['success']:
            return jsonify({
                'success': True,
                'message': result['message'],
                'person_id': person_details['id_number'],
                'school_name': result['school_name']
            }), 201
        else:
            return jsonify(result), 409

    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'שגיאת שרת: {str(e)}'
        }), 500


@app.route('/api/people/<person_id>', methods=['DELETE'])
def delete_person(person_id):
    """מוחק אדם מהמערכת של בית ספר ספציפי"""
    try:
        data = request.json or {}

        # קבלת username מהבקשה
        username = data.get('username')
        if not username:
            return jsonify({
                'success': False,
                'message': 'שם משתמש נדרש'
            }), 400

        # חיפוש אינדקס בית הספר
        from Data_Manage import get_school_index_by_username
        school_index = get_school_index_by_username(username)

        if school_index == -1:
            return jsonify({
                'success': False,
                'message': 'בית ספר לא נמצא'
            }), 404

        # קרא לפונקציה המעודכנת מ-Data_Manage
        result = remove_person(school_index, person_id)  # 🎯 הוספנו את school_index!

        if result['success']:
            return jsonify(result), 200
        else:
            return jsonify(result), 404

    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'שגיאת שרת: {str(e)}'
        }), 500


@app.route('/api/get_loaded_people', methods=['GET'])
def get_loaded_people():
    """מחזיר רשימת אנשים של בית ספר ספציפי"""
    try:
        # קבלת username מ-query parameters
        username = request.args.get('username')
        if not username:
            return jsonify({
                'success': False,
                'message': 'שם משתמש נדרש כ-query parameter (?username=...)'
            }), 400

        # חיפוש אינדקס בית הספר
        from Data_Manage import get_school_index_by_username
        school_index = get_school_index_by_username(username)

        if school_index == -1:
            return jsonify({
                'success': False,
                'message': 'בית ספר לא נמצא'
            }), 404

        # קריאה לפונקציה המעודכנת מ-Data_Manage
        result = get_all_people(school_index)  # 🎯 הוספנו את school_index!

        if result['success']:
            return jsonify({
                'success': True,
                'people': result['people'],
                'count': result['count'],
                'school_name': result['school_name']
            })
        else:
            return jsonify(result), 404

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/people/<person_id>', methods=['GET'])
def get_person_api(person_id):
    """מחזיר פרטי אדם ספציפי מבית ספר ספציפי"""
    try:
        # קבלת username מ-query parameters
        username = request.args.get('username')
        if not username:
            return jsonify({
                'success': False,
                'message': 'שם משתמש נדרש כ-query parameter (?username=...)'
            }), 400

        # חיפוש אינדקס בית הספר
        from Data_Manage import get_school_index_by_username
        school_index = get_school_index_by_username(username)

        if school_index == -1:
            return jsonify({
                'success': False,
                'message': 'בית ספר לא נמצא'
            }), 404

        # קריאה לפונקציה המעודכנת מ-Data_Manage
        result = get_person(school_index, person_id)  # 🎯 הוספנו את school_index!

        if result['success']:
            person_data = result['person']
            return jsonify({
                "first_name": person_data["first_name"],
                "last_name": person_data["last_name"],
                "id_number": person_data["id_number"],
                "is_present": person_data["is_present"],
                "image_urls": person_data["image_urls"],
                "image_count": person_data["image_count"],
                "school_name": result['school_name']
            }), 200
        else:
            return jsonify(result), 404

    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'שגיאת שרת: {str(e)}'
        }), 500


@app.route('/api/people/<person_id>', methods=['PUT'])
def update_person_api(person_id):
    """מעדכן פרטי אדם קיים בבית ספר ספציפי"""
    try:
        data = request.json

        # קבלת username מהבקשה
        username = data.get('username')
        if not username:
            return jsonify({
                'success': False,
                'message': 'שם משתמש נדרש'
            }), 400

        # חיפוש אינדקס בית הספר
        from Data_Manage import get_school_index_by_username
        school_index = get_school_index_by_username(username)

        if school_index == -1:
            return jsonify({
                'success': False,
                'message': 'בית ספר לא נמצא'
            }), 404

        # קריאה לפונקציה המעודכנת מ-Data_Manage
        result = update_person(
            school_index,  # 🎯 הוספנו את school_index!
            person_id,
            data['first_name'],
            data['last_name'],
        )

        if result['success']:
            return jsonify(result), 200
        else:
            return jsonify(result), 404

    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'שגיאת שרת: {str(e)}'
        }), 500


@app.route('/api/people/<person_id>/presence', methods=['POST'])
def toggle_presence_api(person_id):
    """מחליף סטטוס נוכחות של אדם בבית ספר ספציפי"""
    try:
        data = request.json

        # קבלת username מהבקשה
        username = data.get('username')
        if not username:
            return jsonify({
                'success': False,
                'message': 'שם משתמש נדרש'
            }), 400

        # חיפוש אינדקס בית הספר
        from Data_Manage import get_school_index_by_username
        school_index = get_school_index_by_username(username)

        if school_index == -1:
            return jsonify({
                'success': False,
                'message': 'בית ספר לא נמצא'
            }), 404

        # קריאה לפונקציה המעודכנת מ-Data_Manage
        result = toggle_presence(school_index, person_id, data['is_present'])  # 🎯 הוספנו את school_index!

        if result['success']:
            return jsonify(result), 200
        else:
            return jsonify(result), 404

    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'שגיאת שרת: {str(e)}'
        }), 500


# ===============================================================================
#                           API - ניהול תמונות מטרה - מעודכן
# ===============================================================================

@app.route('/api/target-images', methods=['POST'])
def upload_target_images():
    """יוצר מטרה חדשה עם תמונות לבית ספר ספציפי"""
    try:
        data = request.json

        # קבלת username מהבקשה
        username = data.get('username')
        if not username:
            return jsonify({
                'success': False,
                'message': 'שם משתמש נדרש'
            }), 400

        # חיפוש אינדקס בית הספר
        from Data_Manage import get_school_index_by_username
        school_index = get_school_index_by_username(username)

        if school_index == -1:
            return jsonify({
                'success': False,
                'message': 'בית ספר לא נמצא'
            }), 404

        # קרא לפונקציה המעודכנת מ-Data_Manage
        result = add_new_target(
            school_index,  # 🎯 הוספנו את school_index!
            data['camera_number'],
            data['image_url'],
            data.get('enable_face_detection', False)
        )

        # החזרת תוצאה
        if result['success']:
            return jsonify({
                'success': True,
                'message': result['message'],
                'camera_number': data['camera_number'],
                'school_name': result['school_name']
            }), 201
        else:
            return jsonify(result), 409

    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'שגיאת שרת: {str(e)}'
        }), 500


@app.route('/api/targets/<int:camera_number>', methods=['DELETE'])
def delete_target(camera_number):
    """מוחק מטרה מהמערכת של בית ספר ספציפי"""
    try:
        data = request.json or {}

        # קבלת username מהבקשה
        username = data.get('username')
        if not username:
            return jsonify({
                'success': False,
                'message': 'שם משתמש נדרש'
            }), 400

        # חיפוש אינדקס בית הספר
        from Data_Manage import get_school_index_by_username
        school_index = get_school_index_by_username(username)

        if school_index == -1:
            return jsonify({
                'success': False,
                'message': 'בית ספר לא נמצא'
            }), 404

        # קרא לפונקציה המעודכנת מ-Data_Manage
        result = remove_target(school_index, camera_number)  # 🎯 הוספנו את school_index!

        if result['success']:
            return jsonify(result), 200
        else:
            return jsonify(result), 404

    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'שגיאת שרת: {str(e)}'
        }), 500


@app.route('/api/get_target_images', methods=['GET'])
def get_target_images():
    """מחזיר את כל תמונות המטרה של בית ספר ספציפי עם מטא-דטה מפורט"""
    try:
        # קבלת username מ-query parameters
        username = request.args.get('username')
        if not username:
            return jsonify({
                'success': False,
                'message': 'שם משתמש נדרש כ-query parameter (?username=...)'
            }), 400

        # חיפוש אינדקס בית הספר
        from Data_Manage import get_school_index_by_username
        school_index = get_school_index_by_username(username)

        if school_index == -1:
            return jsonify({
                'success': False,
                'message': 'בית ספר לא נמצא'
            }), 404

        # קריאה לפונקציה המעודכנת מ-Data_Manage
        result = get_all_targets(school_index)  # 🎯 הוספנו את school_index!

        if result['success']:
            return jsonify({
                'success': True,
                'targets': result['targets'],
                'count': result['count'],
                'school_name': result['school_name']
            })
        else:
            return jsonify(result), 404

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/target-images/clear-all', methods=['DELETE'])
def clear_all_target_images():
    """מוחק את כל תמונות המטרה של בית ספר ספציפי (פעולה מסוכנת)"""
    try:
        data = request.json or {}

        # קבלת username מהבקשה
        username = data.get('username')
        if not username:
            return jsonify({
                'success': False,
                'message': 'שם משתמש נדרש'
            }), 400

        # חיפוש אינדקס בית הספר
        from Data_Manage import get_school_index_by_username
        school_index = get_school_index_by_username(username)

        if school_index == -1:
            return jsonify({
                'success': False,
                'message': 'בית ספר לא נמצא'
            }), 404

        # קרא לפונקציה המעודכנת מ-Data_Manage
        result = clear_all_targets(school_index)  # 🎯 הוספנו את school_index!

        if result['success']:
            return jsonify(result), 200
        else:
            return jsonify(result), 404

    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'שגיאת שרת: {str(e)}'
        }), 500


# ===============================================================================
#                          API - ניהול תמונות אנשים
# ===============================================================================

@app.route('/api/people/<person_id>/images', methods=['GET'])
def get_person_images(person_id):
    """מחזיר את כל התמונות של אדם ספציפי"""
    # TODO: מלא את הפונקציה
    pass


@app.route('/api/people/<person_id>/images', methods=['POST'])
def add_person_image(person_id):
    """מוסיף תמונה נוספת לאדם קיים (עד 5 תמונות סה"כ)"""
    # TODO: מלא את הפונקציה
    pass


@app.route('/api/people/<person_id>/images/<image_id>', methods=['DELETE'])
def delete_person_image(person_id, image_id):
    """מוחק תמונה ספציפית של אדם"""
    # TODO: מלא את הפונקציה
    pass


# ===============================================================================
#                        פונקציות ניהול נתונים ובדיקת נוכחות - מעודכן
# ===============================================================================

@app.route('/api/face-recognition/extract-faces', methods=['POST'])
def extract_faces_from_targets():
    """מחלץ פנים מכל תמונות המטרה של בית ספר ספציפי"""
    try:
        data = request.json or {}

        # קבלת username מהבקשה
        username = data.get('username')
        if not username:
            return jsonify({
                'success': False,
                'message': 'שם משתמש נדרש',
                'faces_extracted': 0
            }), 400

        # חיפוש אינדקס בית הספר
        from Data_Manage import get_school_index_by_username
        school_index = get_school_index_by_username(username)

        if school_index == -1:
            return jsonify({
                'success': False,
                'message': 'בית ספר לא נמצא',
                'faces_extracted': 0
            }), 404

        # קריאה לפונקציה המעודכנת מ-Attend_Manage
        from Attend_Manage import extract_all_faces_from_targets
        result = extract_all_faces_from_targets(school_index)  # 🎯 הוספנו את school_index!

        if result['success']:
            return jsonify({
                'success': True,
                'faces_extracted': result['faces_extracted'],
                'message': result['message'],
                'school_name': result['school_name']
            }), 200
        else:
            return jsonify({
                'success': False,
                'error': result['message'],
                'faces_extracted': result['faces_extracted'],
                'school_name': result.get('school_name')
            }), 400

    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'שגיאה בחילוץ פנים: {str(e)}',
            'faces_extracted': 0
        }), 500


@app.route('/api/attendance/check-all', methods=['POST'])
def check_attendance_all():
    """בודק נוכחות עבור כל האנשים של בית ספר ספציפי"""
    try:
        data = request.json or {}

        # קבלת username מהבקשה
        username = data.get('username')
        if not username:
            return jsonify({
                'success': False,
                'message': 'שם משתמש נדרש',
                'checked_people': 0,
                'present_people': 0,
                'absent_people': 0
            }), 400

        # חיפוש אינדקס בית הספר
        from Data_Manage import get_school_index_by_username
        school_index = get_school_index_by_username(username)

        if school_index == -1:
            return jsonify({
                'success': False,
                'message': 'בית ספר לא נמצא',
                'checked_people': 0,
                'present_people': 0,
                'absent_people': 0
            }), 404

        # קריאה לפונקציה המעודכנת מ-Attend_Manage
        from Attend_Manage import check_attendance_for_all_people
        result = check_attendance_for_all_people(school_index)  # 🎯 הוספנו את school_index!

        if result['success']:
            return jsonify({
                'success': True,
                'checked_people': result['checked_people'],
                'present_people': result['present_people'],
                'absent_people': result['absent_people'],
                'message': result['message'],
                'school_name': result['school_name']
            }), 200
        else:
            return jsonify({
                'success': False,
                'error': result['message'],
                'checked_people': result['checked_people'],
                'present_people': result['present_people'],
                'absent_people': result['absent_people'],
                'school_name': result.get('school_name')
            }), 400

    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'שגיאה בבדיקת נוכחות: {str(e)}',
            'checked_people': 0,
            'present_people': 0,
            'absent_people': 0
        }), 500


# ===============================================================================
#                            API - ניהול תמונות זמניות
# ===============================================================================

@app.route('/api/upload_temp_image', methods=['POST'])
def upload_temp_image():
    try:
        # בדיקת חיבור ל-Cloudinary
        print("Cloudinary config check:")
        print(f"Cloud name: {os.environ.get('CLOUDINARY_CLOUD_NAME', 'MISSING')}")
        print(f"API key: {'EXISTS' if os.environ.get('CLOUDINARY_API_KEY') else 'MISSING'}")
        print(f"API secret: {'EXISTS' if os.environ.get('CLOUDINARY_API_SECRET') else 'MISSING'}")

        # מקבל קובץ ופרטי אדם
        file_to_upload = request.files['image']
        first_name = request.form.get('first_name', '')
        last_name = request.form.get('last_name', '')
        id_number = request.form.get('id_number', '')

        print(f"Uploading file: {file_to_upload.filename}")

        # יצירת שם ייחודי עם פרטי האדם
        timestamp = int(time.time())
        public_id = f"{first_name}_{last_name}_{id_number}/image_{timestamp}"

        print(f"Public ID: {public_id}")

        result = cloudinary.uploader.upload(
            file_to_upload,
            public_id=public_id
        )

        print(f"Upload successful: {result.get('secure_url')}")

        return jsonify({
            'success': True,
            'image_url': result.get('secure_url'),
            'public_id': result.get('public_id')
        })
    except Exception as e:
        print(f"Upload error: {str(e)}")
        print(f"Error type: {type(e).__name__}")
        import traceback
        traceback.print_exc()

        return jsonify({
            'success': False,
            'error': f'שגיאה בהעלאה: {str(e)}'
        })


@app.route('/api/delete_temp_image', methods=['DELETE'])
def delete_temp_image():
   # מקבל public_id מהדפדפן
   data = request.get_json()
   public_id = data.get('public_id')
   try:
       cloudinary.uploader.destroy(public_id)
       return jsonify({'success': True})
   except:
       return jsonify({'success': False})


@app.route('/api/temp-images', methods=['GET'])
def get_temp_images():
    """מחזיר רשימת תמונות זמניות (אם צריך)"""
    # TODO: מלא את הפונקציה
    pass


# ===============================================================================
#                               API - פעולות מתקדמות
# ===============================================================================


@app.route('/api/face-recognition/status', methods=['GET'])
def get_face_recognition_status():
    """מחזיר סטטוס תהליך זיהוי הפנים"""
    # TODO: מלא את הפונקציה
    pass


@app.route('/api/face-recognition/results', methods=['GET'])
def get_face_recognition_results():
    """מחזיר תוצאות זיהוי הפנים"""
    # TODO: מלא את הפונקציה
    pass


@app.route('/api/attendance/mark-all-present', methods=['POST'])
def mark_all_present():
    """מסמן את כל האנשים כנוכחים"""
    # TODO: מלא את הפונקציה
    pass


@app.route('/api/attendance/mark-all-absent', methods=['POST'])
def mark_all_absent():
    """מסמן את כל האנשים כלא נוכחים"""
    # TODO: מלא את הפונקציה
    pass


@app.route('/api/attendance/export', methods=['GET'])
def export_attendance():
    """מייצא דו"ח נוכחות (CSV/Excel)"""
    # TODO: מלא את הפונקציה
    pass

# ===============================================================================
#                                ERROR HANDLERS (הוסף!)
# ===============================================================================

@app.errorhandler(404)
def not_found(error):
    """
    טיפול בשגיאת 404
    """
    return jsonify({
        'success': False,
        'message': 'הדף המבוקש לא נמצא',
        'error_type': 'not_found'
    }), 404

@app.errorhandler(405)
def method_not_allowed(error):
    """
    טיפול בשגיאת 405
    """
    return jsonify({
        'success': False,
        'message': 'שיטת HTTP לא מורשית',
        'error_type': 'method_not_allowed'
    }), 405

@app.errorhandler(500)
def internal_error(error):
    """
    טיפול בשגיאת 500
    """
    return jsonify({
        'success': False,
        'message': 'שגיאת שרת פנימית',
        'error_type': 'internal_server_error'
    }), 500


# ===============================================================================
#                                   הפעלת השרת
# ===============================================================================

if __name__ == '__main__':
    # קבלת פורט מ-Render או ברירת מחדל
    port = int(os.environ.get("PORT", 5000))

    print(f"🚀 Starting Flask server on port {port}")

    # הפעלת השרת מיד - בלי אתחולים מורכבים
    try:
        app.run(
            debug=False,
            host='0.0.0.0',
            port=port,
            threaded=True
        )
    except Exception as e:
        print(f"Error starting server: {e}")

# ===============================================================================
#                                    הערות למימוש
# ===============================================================================

"""
📝 רשימת משימות למימוש:

✅ פונקציות עזר (load_data, save_data):
   - טעינה ושמירה של קבצי JSON
   - טיפול בשגיאות

✅ ניהול אנשים (CRUD):
   - קריאה, יצירה, עדכון, מחיקה
   - בדיקות תקינות נתונים

✅ ניהול תמונות:
   - העלאה ל-Cloudinary
   - מחיקה מ-Cloudinary
   - ניהול תמונות זמניות

✅ מערכת בתי ספר (הוסף!):
   - ייבוא מ-School.py
   - התחברות והרשמה
   - APIs מושלמים

💡 טיפים למימוש:
   - התחל עם הפונקציות הפשוטות (load_data, save_data)
   - בדוק כל פונקציה בנפרד
   - השתמש ב-app.logger.info() ללוגים
   - הוסף טיפול בשגיאות (try/except)
   - בדוק תקינות נתונים לפני עיבוד
"""