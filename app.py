"""
=================================================================
                    מערכת AttendMe - ניהול נוכחות עם בתי ספר
=================================================================
מבנה הקובץ מחולק לפי נושאים:
1. Imports והגדרות
2. הגדרות ופונקציות עזר
3. Routes אימות ובתי ספר
4. Routes עיקריים (עמוד בית)
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
                         get_all_targets, clear_all_targets, create_new_school,
                         authenticate_and_load_school, logout, get_current_school_stats,
                         get_current_school, set_current_school, ensure_school)
from Attend_Manage import (extract_all_faces_from_targets, check_attendance_for_all_people)
from School import School
from School_Manager import (school_manager, require_auth, require_role,
                           get_current_session, get_current_user, get_current_school_id)

from flask import Flask, render_template, request, jsonify, redirect, url_for, make_response
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

# הגדרת secret key לsessions
app.secret_key = os.environ.get('SECRET_KEY', 'your-secret-key-here-change-in-production')

# הגדרת לוגים
logging.basicConfig(level=logging.INFO)
app.logger.setLevel(logging.INFO)


# ===============================================================================
#                              HELPER FUNCTIONS
# ===============================================================================

def get_client_ip():
    """קבלת IP של הלקוח"""
    return request.headers.get('X-Real-IP',
           request.headers.get('X-Forwarded-For',
           request.remote_addr))


# ===============================================================================
#                           AUTHENTICATION ROUTES
# ===============================================================================

@app.route('/login')
def login_page():
    """דף התחברות"""
    return render_template('login.html')


@app.route('/api/health')
def health_check():
    """בדיקת בריאות השרת"""
    return jsonify({
        'status': 'healthy',
        'version': '2.0.0',
        'timestamp': time.time(),
        'schools_available': len(School.get_all_schools())
    })


@app.route('/api/auth/register', methods=['POST'])
def register_school():
    """הרשמה - יצירת בית ספר חדש"""
    try:
        data = request.json

        # בדיקת נתונים נדרשים
        required_fields = ['school_name', 'school_email', 'school_phone', 'admin_username', 'admin_password']
        missing_fields = [field for field in required_fields if not data.get(field)]

        if missing_fields:
            return jsonify({
                'success': False,
                'error': f'שדות חסרים: {", ".join(missing_fields)}'
            }), 400

        # יצירת בית ספר חדש
        result = create_new_school(
            name=data['school_name'],
            email=data['school_email'],
            phone=data['school_phone'],
            address=data.get('school_address', ''),
            admin_username=data['admin_username'],
            admin_password=data['admin_password']
        )

        if result['success']:
            # התחברות אוטומטית למנהל
            auth_result = authenticate_and_load_school(data['admin_username'], data['admin_password'])

            if auth_result['success']:
                # יצירת session
                session_result = school_manager.create_session(
                    school_id=result['school_id'],
                    user_data=auth_result['user'],
                    request_ip=get_client_ip()
                )

                if session_result['success']:
                    # הגדרת עוגיות
                    response = make_response(jsonify({
                        'success': True,
                        'message': result['message'],
                        'school_id': result['school_id'],
                        'redirect': '/dashboard'
                    }))

                    response.set_cookie('session_id', session_result['session_id'],
                                      httponly=True, secure=False, max_age=24*60*60)
                    response.set_cookie('security_token', session_result['security_token'],
                                      httponly=True, secure=False, max_age=24*60*60)

                    app.logger.info(f"בית ספר חדש נוצר: {data['school_name']} (ID: {result['school_id']})")
                    return response, 201
                else:
                    return jsonify({
                        'success': False,
                        'error': 'בית הספר נוצר אך יש בעיה בהתחברות'
                    }), 500
            else:
                return jsonify({
                    'success': False,
                    'error': 'בית הספר נוצר אך יש בעיה בהתחברות האוטומטית'
                }), 500
        else:
            return jsonify({
                'success': False,
                'error': result['error']
            }), 409

    except Exception as e:
        app.logger.error(f"שגיאה בהרשמה: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'שגיאה פנימית בשרת'
        }), 500


@app.route('/api/auth/login', methods=['POST'])
def login():
    """התחברות למערכת"""
    try:
        data = request.json
        username = data.get('username', '').strip()
        password = data.get('password', '')

        if not username or not password:
            return jsonify({
                'success': False,
                'error': 'שם משתמש וסיסמה נדרשים'
            }), 400

        # אימות
        auth_result = authenticate_and_load_school(username, password)

        if auth_result['success']:
            # יצירת session
            session_result = school_manager.create_session(
                school_id=auth_result['school'].school_id,
                user_data=auth_result['user'],
                request_ip=get_client_ip()
            )

            if session_result['success']:
                # הגדרת עוגיות
                response = make_response(jsonify({
                    'success': True,
                    'message': auth_result['message'],
                    'user': {
                        'username': auth_result['user']['username'],
                        'role': auth_result['user']['role'],
                        'display_name': auth_result['user']['display_name']
                    },
                    'school': {
                        'id': auth_result['school'].school_id,
                        'name': auth_result['school'].name
                    },
                    'redirect': '/dashboard'
                }))

                response.set_cookie('session_id', session_result['session_id'],
                                  httponly=True, secure=False, max_age=24*60*60)
                response.set_cookie('security_token', session_result['security_token'],
                                  httponly=True, secure=False, max_age=24*60*60)

                app.logger.info(f"התחברות מוצלחת: {username} לבית ספר {auth_result['school'].name}")
                return response
            else:
                return jsonify({
                    'success': False,
                    'error': 'שגיאה ביצירת הפעלה'
                }), 500
        else:
            return jsonify({
                'success': False,
                'error': auth_result['error']
            }), 401

    except Exception as e:
        app.logger.error(f"שגיאה בהתחברות: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'שגיאה פנימית בשרת'
        }), 500


@app.route('/api/auth/logout', methods=['POST'])
@require_auth
def logout_user():
    """התנתקות מהמערכת"""
    try:
        session_id = request.cookies.get('session_id')

        if session_id:
            school_manager.invalidate_session(session_id)

        # ניקוי בית ספר נוכחי
        logout()

        response = make_response(jsonify({
            'success': True,
            'message': 'התנתקות בוצעה בהצלחה'
        }))

        # מחיקת עוגיות
        response.set_cookie('session_id', '', expires=0)
        response.set_cookie('security_token', '', expires=0)

        return response

    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'שגיאה בהתנתקות: {str(e)}'
        }), 500


@app.route('/api/auth/me')
@require_auth
def get_current_user_info():
    """קבלת מידע על המשתמש הנוכחי"""
    try:
        current_user = get_current_user()
        school = get_current_school()

        return jsonify({
            'success': True,
            'user': {
                'username': current_user['username'],
                'role': current_user['role'],
                'display_name': current_user['display_name'],
                'last_login': current_user.get('last_login')
            },
            'school': {
                'id': school.school_id,
                'name': school.name,
                'email': school.email
            }
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'שגיאה בקבלת פרטי משתמש: {str(e)}'
        }), 500


# ===============================================================================
#                                    ROUTES עיקריים
# ===============================================================================

@app.route('/')
def index():
    """בדיקה אם יש session פעיל - אם כן העברה לדשבורד, אחרת לכניסה"""
    session_id = request.cookies.get('session_id')
    security_token = request.cookies.get('security_token')

    if session_id:
        validation = school_manager.validate_session(session_id, security_token)
        if validation['valid']:
            # טעינת בית הספר המתאים
            try:
                school_id = validation['session_data']['school_id']
                school, _ = School.load_school_data(school_id)
                if school:
                    set_current_school(school)
                    return redirect('/dashboard')
            except Exception as e:
                app.logger.error(f"שגיאה בטעינת בית ספר: {str(e)}")

    return redirect('/login')


@app.route('/dashboard')
@require_auth
def dashboard():
    """עמוד הדשבורד - מציג את הממשק הראשי של המערכת"""
    return render_template('index.html')


# ===============================================================================
#                               API - ניהול אנשים (CRUD)
# ===============================================================================

@app.route('/api/people/create_person', methods=['POST'])
@require_auth
def create_person():
    """יוצר אדם חדש עם תמונות"""
    try:
        data = request.json

        # קרא לפונקציה מ-Data_Manage
        person_details = data['person_details']
        result = add_new_person(
            person_details['first_name'],
            person_details['last_name'],
            person_details['id_number'],
            data['image_urls']
        )

        # החזרת תוצאה
        if result['success']:
            return jsonify({
                'success': True,
                'message': 'האדם נוצר בהצלחה',
                'person_id': person_details['id_number']
            }), 201
        else:
            return jsonify(result), 409

    except Exception as e:
        app.logger.error(f"שגיאה ביצירת אדם: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'שגיאה פנימית בשרת'
        }), 500


@app.route('/api/people/<person_id>', methods=['DELETE'])
@require_role('admin')
def delete_person(person_id):
    """מוחק אדם מהמערכת"""
    try:
        # קרא לפונקציה מ-Data_Manage
        remove_person(person_id)
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'שגיאה במחיקת אדם: {str(e)}'
        }), 500


@app.route('/api/get_loaded_people', methods=['GET'])
@require_auth
def get_loaded_people():
    """מחזיר רשימת אנשים"""
    try:
        # קריאה לפונקציה מ-Data_Manage
        people_vector = get_all_people()

        people_list = []
        for person in people_vector:
            people_list.append({
                'first_name': person.first_name,
                'last_name': person.last_name,
                'id_number': person.id_number,
                'image_urls': person.image_urls if hasattr(person, 'image_urls') else [],
                'is_present': person.get_presence_status()
            })

        return jsonify({
            'success': True,
            'people': people_list
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/people/<person_id>', methods=['GET'])
@require_auth
def get_person_api(person_id):
    """מחזיר פרטי אדם ספציפי"""
    try:
        # קריאה לפונקציה מ-Data_Manage
        person_data = get_person(person_id)

        if person_data:
            return jsonify({
                "first_name": person_data["first_name"],
                "last_name": person_data["last_name"],
                "id_number": person_data["id_number"],
                "is_present": person_data["is_present"],
                "image_urls": person_data["image_urls"],
                "image_count": person_data["image_count"]
            }), 200
        else:
            return jsonify({
                'success': False,
                'error': 'אדם לא נמצא'
            }), 404
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/people/<person_id>', methods=['PUT'])
@require_auth
def update_person_api(person_id):
    """מעדכן פרטי אדם קיים"""
    try:
        data = request.json

        # קריאה לפונקציה מ-Data_Manage
        update_person(
            person_id,
            data['first_name'],
            data['last_name'],
        )
        return jsonify({'message': 'עודכן בהצלחה'}), 200
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/people/<person_id>/presence', methods=['POST'])
@require_auth
def toggle_presence_api(person_id):
    """מחליף סטטוס נוכחות של אדם"""
    try:
        data = request.json

        # קריאה לפונקציה מ-Data_Manage
        toggle_presence(person_id, data['is_present'])
        return jsonify({'message': 'סטטוס נוכחות עודכן'}), 200
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/people/stats', methods=['GET'])
@require_auth
def get_people_stats():
    """מחזיר סטטיסטיקות על האנשים"""
    try:
        stats = get_current_school_stats()
        return jsonify({
            'success': True,
            'stats': stats
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


# ===============================================================================
#                           API - ניהול תמונות מטרה
# ===============================================================================

@app.route('/api/target-images', methods=['POST'])
@require_auth
def upload_target_images():
    """יוצר מטרה חדשה עם תמונות"""
    try:
        data = request.json

        # קרא לפונקציה מ-Data_Manage
        result = add_new_target(
            data['camera_number'],
            data['image_url']
        )

        # החזרת תוצאה
        if result['success']:
            return jsonify({
                'success': True,
                'message': result['message'],
                'camera_number': data['camera_number']
            }), 201
        else:
            return jsonify({
                'success': False,
                'error': result['message']
            }), 409
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/targets/<int:camera_number>', methods=['DELETE'])
@require_auth
def delete_target(camera_number):
    """מוחק מטרה מהמערכת"""
    try:
        # קרא לפונקציה מ-Data_Manage
        remove_target(camera_number)
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/get_target_images', methods=['GET'])
@require_auth
def get_target_images():
    """מחזיר את כל תמונות המטרה עם מטא-דטה מפורט"""
    try:
        # קריאה לפונקציה מ-Data_Manage
        targets_vector = get_all_targets()

        targets_list = []
        for target in targets_vector:
            targets_list.append({
                'camera_number': target.camera_number,
                'images_url': target.image_urls,
                'is_checked': target.is_checked,
                'faces_count': target.faces_count,
                'extracted_faces': target.extracted_faces
            })

        return jsonify({
            'success': True,
            'targets': targets_list
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/target-images/clear-all', methods=['DELETE'])
@require_role('admin')
def clear_all_target_images():
    """מוחק את כל תמונות המטרה (פעולה מסוכנת)"""
    try:
        # קרא לפונקציה מ-Data_Manage
        clear_all_targets()
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


# ===============================================================================
#                          API - ניהול תמונות אנשים
# ===============================================================================

@app.route('/api/upload_temp_image', methods=['POST'])
@require_auth
def upload_temp_image():
    """העלאת תמונה זמנית"""
    try:
        # מקבל קובץ ופרטי אדם
        file_to_upload = request.files['image']
        first_name = request.form.get('first_name', '')
        last_name = request.form.get('last_name', '')
        id_number = request.form.get('id_number', '')

        # יצירת שם ייחודי עם פרטי האדם
        timestamp = int(time.time())
        school_id = get_current_school_id()
        public_id = f"{school_id}/{first_name}_{last_name}_{id_number}/image_{timestamp}"

        result = cloudinary.uploader.upload(
            file_to_upload,
            public_id=public_id
        )

        return jsonify({
            'success': True,
            'image_url': result.get('secure_url'),
            'public_id': result.get('public_id')
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'שגיאה בהעלאה: {str(e)}'
        }), 500


@app.route('/api/delete_temp_image', methods=['DELETE'])
@require_auth
def delete_temp_image():
    """מחיקת תמונה זמנית"""
    try:
        # מקבל public_id מהדפדפן
        data = request.get_json()
        public_id = data.get('public_id')
        cloudinary.uploader.destroy(public_id)
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


# ===============================================================================
#                        פונקציות ניהול נתונים ובדיקת נוכחות
# ===============================================================================

@app.route('/api/face-recognition/extract-faces', methods=['POST'])
@require_auth
def extract_faces_from_targets():
    """מחלץ פנים מכל תמונות המטרה"""
    try:
        # קריאה לפונקציה מ-Attend_Manage
        result = extract_all_faces_from_targets()

        if result['success']:
            return jsonify({
                'success': True,
                'faces_extracted': result['faces_extracted'],
                'message': result['message']
            }), 200
        else:
            return jsonify({
                'success': False,
                'error': result['message'],
                'faces_extracted': 0
            }), 400

    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'שגיאה בחילוץ פנים: {str(e)}',
            'faces_extracted': 0
        }), 500


@app.route('/api/attendance/check-all', methods=['POST'])
@require_auth
def check_attendance_all():
    """בודק נוכחות עבור כל האנשים במערכת"""
    try:
        # קריאה לפונקציה מ-Attend_Manage
        result = check_attendance_for_all_people()

        if result['success']:
            return jsonify({
                'success': True,
                'checked_people': result['checked_people'],
                'present_people': result['present_people'],
                'absent_people': result['absent_people'],
                'message': result['message']
            }), 200
        else:
            return jsonify({
                'success': False,
                'error': result['message'],
                'checked_people': result['checked_people'],
                'present_people': result['present_people']
            }), 400

    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'שגיאה בבדיקת נוכחות: {str(e)}',
            'checked_people': 0,
            'present_people': 0
        }), 500


# ===============================================================================
#                           API - מידע מערכת ומנהלה
# ===============================================================================

@app.route('/api/system/stats')
@require_role('admin')
def get_system_stats():
    """סטטיסטיקות כלליות של המערכת"""
    try:
        # סטטיסטיקות sessions
        session_stats = school_manager.get_stats()

        # סטטיסטיקות בתי ספר
        all_schools = School.get_all_schools()

        # סטטיסטיקות בית ספר נוכחי
        current_school_stats = get_current_school_stats()

        return jsonify({
            'success': True,
            'system_stats': {
                'total_schools': len(all_schools),
                'active_sessions': session_stats.get('active_sessions', 0),
                'users_online': session_stats.get('users_active', 0)
            },
            'current_school_stats': current_school_stats,
            'session_stats': session_stats
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/schools/activity')
@require_role('admin')
def get_schools_activity():
    """מידע על פעילות כל בתי הספר (למנהלי מערכת)"""
    try:
        schools_activity = school_manager.get_all_schools_activity()
        return jsonify({
            'success': True,
            'schools_activity': schools_activity
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/schools/list')
@require_role('admin')
def list_all_schools():
    """רשימת כל בתי הספר (למנהלי מערכת)"""
    try:
        schools = School.get_all_schools()
        return jsonify({
            'success': True,
            'schools': schools
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/school-manager/stats')
@require_role('admin')
def get_school_manager_stats():
    """סטטיסטיקות מנהל בתי ספר (למנהלי מערכת)"""
    try:
        manager_stats = school_manager.get_stats()
        schools_activity = school_manager.get_all_schools_activity()

        return jsonify({
            'success': True,
            'manager_stats': manager_stats,
            'schools_count': len(schools_activity),
            'total_active_users': sum(school['active_users'] for school in schools_activity.values()),
            'total_sessions': sum(school['active_sessions'] for school in schools_activity.values())
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


# ===============================================================================
#                               ERROR HANDLERS
# ===============================================================================

@app.errorhandler(401)
def unauthorized(error):
    """טיפול בשגיאת אימות"""
    return jsonify({
        'error': 'נדרש אימות',
        'authenticated': False,
        'redirect': '/login'
    }), 401


@app.errorhandler(403)
def forbidden(error):
    """טיפול בשגיאת הרשאה"""
    return jsonify({
        'error': 'אין הרשאה לפעולה זו',
        'authenticated': True,
        'authorized': False
    }), 403


@app.errorhandler(404)
def not_found(error):
    """טיפול בשגיאת 404"""
    return jsonify({
        'error': 'הדף או המשאב לא נמצא'
    }), 404


@app.errorhandler(500)
def internal_error(error):
    """טיפול בשגיאת שרת פנימית"""
    app.logger.error(f'שגיאת שרת: {str(error)}')
    return jsonify({
        'error': 'שגיאה פנימית בשרת'
    }), 500


# ===============================================================================
#                              STARTUP TASKS
# ===============================================================================

def startup_tasks():
    """משימות שרצות עם הפעלת השרת - אתחול מנהל בתי ספר"""
    try:
        app.logger.info("🚀 מתחיל אתחול שרת בתי ספר...")

        # יצירת תיקיות נדרשות
        required_dirs = ['schools_data', 'sessions', 'EnviroFaces', 'Identified_Images']
        for dir_name in required_dirs:
            if not os.path.exists(dir_name):
                os.makedirs(dir_name)
                app.logger.info(f"📁 נוצרה תיקייה: {dir_name}")

        # ניקוי sessions פגי תוקף
        school_manager.cleanup_expired_sessions()

        # הצגת סטטיסטיקות אתחול
        all_schools = School.get_all_schools()
        session_stats = school_manager.get_stats()

        app.logger.info(f"📊 בתי ספר רשומים: {len(all_schools)}")
        app.logger.info(f"📊 sessions פעילים: {session_stats.get('active_sessions', 0)}")
        app.logger.info("✅ אתחול הושלם בהצלחה")

    except Exception as e:
        app.logger.error(f"❌ שגיאה באתחול: {str(e)}")


# ===============================================================================
#                                   הפעלת השרת
# ===============================================================================

if __name__ == '__main__':
    """
    הפעלת שרת Flask

    הגדרות:
        - Port: מקורות - משתנה סביבה PORT או 5000 כברירת מחדל
        - Host: 0.0.0.0 (מאפשר גישה מכל IP)
        - Debug: False (לייצור)
    """
    # הפעלת משימות אתחול
    with app.app_context():
        startup_tasks()

    # קבלת פורט מ-Render או ברירת מחדל
    port = int(os.environ.get("PORT", 5000))

    # הדפסת מידע לדיבוג
    print(f"🚀 Starting AttendMe School Management System")
    print(f"🌐 Server URL: http://0.0.0.0:{port}")
    print(f"🔧 Debug mode: False")
    print(f"🏫 Multi-school support: Enabled")
    print(f"🔐 Authentication: School Manager Active")

    # הפעלת השרת
    app.run(
        debug=False,
        host='0.0.0.0',
        port=port,
        threaded=True  # מאפשר קריאות מרובות במקביל
    )