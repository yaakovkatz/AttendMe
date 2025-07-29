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
                         add_demo_data, print_all_schools, get_school_index_by_username)

from Attend_Manage import (extract_all_faces_from_targets, check_attendance_for_all_people)

from flask import Flask, render_template, request, session, redirect, url_for, flash, jsonify
from flask_cors import CORS
from functools import wraps
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

# יצירת אפליקציית Flask
app = Flask(__name__,
            template_folder='web_templates',  # אם הקבצים בweb_templates
            static_folder='web_static')

# הגדרות Flask
app.secret_key = 'your-secret-key-here'  # 🔒 שנה למפתח חזק יותר!
app.config['UPLOAD_FOLDER'] = 'uploads'
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size

# הגדרת CORS
CORS(app)

print("🚀 Starting Flask server on port 5000")

logging.basicConfig(level=logging.INFO)
app.logger.setLevel(logging.INFO)


# ==================== AUTHENTICATION DECORATOR ====================

def login_required(f):
    """Decorator לבדיקת התחברות"""

    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'current_user' not in session:
            flash('נדרשת התחברות לגישה לדף זה', 'warning')
            return redirect(url_for('login_page'))
        return f(*args, **kwargs)

    return decorated_function


def get_current_user():
    """קבלת פרטי המשתמש הנוכחי"""
    return session.get('current_user')


def get_current_page():
    """קבלת שם הדף הנוכחי"""
    return request.endpoint


# ==================== MAIN ROUTES ====================

@app.route('/')
def index():
    """דף ראשי - מפנה לבית"""
    return redirect(url_for('home'))


@app.route('/home')
def home():
    """דף בית"""
    current_user = get_current_user()
    return render_template('home.html',
                           current_user=current_user,
                           current_page='home')


@app.route('/people')
@login_required
def people():
    """דף ניהול אנשים"""
    current_user = get_current_user()
    return render_template('people.html',
                           current_user=current_user,
                           current_page='people')


@app.route('/attendance')
@login_required
def attendance():
    """דף נוכחות ודוחות"""
    current_user = get_current_user()
    return render_template('attendance.html',
                           current_user=current_user,
                           current_page='attendance')


@app.route('/cameras')
@login_required
def cameras():
    """דף ניהול מצלמות ותמונות מטרה"""
    current_user = get_current_user()
    return render_template('cameras.html',
                           current_user=current_user,
                           current_page='cameras')


@app.route('/settings')
@login_required
def settings():
    """דף הגדרות"""
    current_user = get_current_user()
    return render_template('settings.html',
                           current_user=current_user,
                           current_page='settings')


@app.route('/about')
def about():
    """דף אודותינו"""
    current_user = get_current_user()
    return render_template('about.html',
                           current_user=current_user,
                           current_page='about')


@app.route('/contact')
def contact():
    """דף יצירת קשר"""
    current_user = get_current_user()
    return render_template('contact.html',
                           current_user=current_user,
                           current_page='contact')


# ==================== AUTH ROUTES ====================

@app.route('/login')
def login():
    """דף התחברות"""
    # אם כבר מחובר, מפנה לדף בית
    if 'current_user' in session:
        return redirect(url_for('home'))

    return render_template('login.html', current_page='login')


@app.route('/register')
def register():
    """דף הרשמה"""
    # אם כבר מחובר, מפנה לדף בית
    if 'current_user' in session:
        return redirect(url_for('home'))

    return render_template('register.html', current_page='register')


@app.route('/logout')
def logout():
    """התנתקות"""
    session.clear()
    flash('התנתקת בהצלחה', 'info')
    return redirect(url_for('home'))


# ==================== ADDITIONAL ROUTES ====================

@app.route('/privacy')
def privacy():
    """דף מדיניות פרטיות"""
    current_user = get_current_user()
    return render_template('privacy.html',
                           current_user=current_user,
                           current_page='privacy')


@app.route('/terms')
def terms():
    """דף תנאי שימוש"""
    current_user = get_current_user()
    return render_template('terms.html',
                           current_user=current_user,
                           current_page='terms')


# ==================== ERROR HANDLERS ====================

@app.errorhandler(404)
def not_found(error):
    """דף 404"""
    current_user = get_current_user()
    return render_template('404.html',
                           current_user=current_user), 404


@app.errorhandler(500)
def internal_error(error):
    """דף 500"""
    current_user = get_current_user()
    return render_template('500.html',
                           current_user=current_user), 500


# ==================== CONTEXT PROCESSORS ====================

@app.context_processor
def inject_user():
    """הוספת משתנים גלובליים לכל template"""
    return dict(
        current_user=get_current_user(),
        current_page=get_current_page()
    )


# ==================== API ROUTES ====================

@app.route('/api/health')
def api_health():
    """API לבדיקת בריאות השרת"""
    return jsonify({
        'status': 'ok',
        'message': 'Server is running',
        'version': '1.0.0'
    })


@app.route('/api/contact', methods=['POST'])
def api_contact():
    """API לטיפול בטופס יצירת קשר"""
    try:
        data = request.get_json()

        # כאן תוסיף את הלוגיקה לשמירת ההודעה
        print(f"📧 הודעת קשר התקבלה: {data.get('first_name')} {data.get('last_name')}")
        print(f"נושא: {data.get('subject')}")
        print(f"הודעה: {data.get('message')[:100]}...")

        return jsonify({
            'success': True,
            'message': 'הודעה התקבלה בהצלחה',
            'submission_id': f"contact_{hash(str(data))}"
        })

    except Exception as e:
        print(f"❌ שגיאה בטיפול בהודעת קשר: {e}")
        return jsonify({
            'success': False,
            'error': 'שגיאה בעיבוד ההודעה'
        }), 500


# ==================== SCHOOL AUTHENTICATION ROUTES ====================

@app.route('/api/login', methods=['POST'])
def api_login():
    """API להתחברות באמצעות Data_Manage"""
    try:
        data = request.get_json()
        username = data.get('username')
        password = data.get('password')

        print(f"🔐 ניסיון התחברות: {username}")

        if not username or not password:
            return jsonify({
                'success': False,
                'error': 'חסרים פרטי התחברות'
            }), 400

        # השתמש בפונקציה הקיימת מ-Data_Manage
        result = login_user(username, password)

        if result['success']:
            # שמור בסשן
            user_data = {
                'username': username,
                'schoolInfo': result['school_info']
            }
            session['current_user'] = user_data

            return jsonify({
                'success': True,
                'message': result['message'],
                'school_info': result['school_info']
            })
        else:
            return jsonify({
                'success': False,
                'message': result['message'],
                'error_type': result.get('error_type')
            }), 401

    except Exception as e:
        print(f"❌ שגיאה בהתחברות: {e}")
        return jsonify({
            'success': False,
            'error': 'שגיאה בהתחברות'
        }), 500


@app.route('/api/register', methods=['POST'])
def api_register():
    """API לרישום באמצעות Data_Manage"""
    try:
        data = request.get_json()
        print(f"🏫 ניסיון רישום: {data.get('school_name')}")

        # השתמש בפונקציה הקיימת מ-Data_Manage
        result = register_school(data)

        if result['success']:
            return jsonify({
                'success': True,
                'message': result['message'],
                'school_info': result['school_info'],
                'position_in_database': result['position_in_database']
            })
        else:
            return jsonify({
                'success': False,
                'message': result['message'],
                'error_type': result.get('error_type')
            }), 400

    except Exception as e:
        print(f"❌ שגיאה ברישום: {e}")
        return jsonify({
            'success': False,
            'error': f'שגיאה ברישום: {str(e)}'
        }), 500


# ===============================================================================
#                               API - ניהול אנשים (CRUD) - מעודכן
# ===============================================================================

@app.route('/api/people/create_person', methods=['POST'])
def create_person():
    print("🎯 הגענו לפונקציה create_person!")
    """יוצר אדם חדש עם תמונות לבית ספר ספציפי"""
    try:
        data = request.json
        print(f"📥 קיבלנו נתונים: {data}")

        # קבלת school_index מהבקשה
        school_index = data.get('school_index')
        if school_index is None:
            return jsonify({
                'success': False,
                'message': 'מזהה בית ספר נדרש'
            }), 400

        # בדיקת תקינות האינדקס
        if school_index < 0:
            return jsonify({
                'success': False,
                'message': 'מזהה בית ספר לא תקין'
            }), 400

        print(f"📊 School index: {school_index}")
        print("✅ מזהה בית ספר תקין, ממשיך...")

        # קרא לפונקציה המעודכנת מ-Data_Manage
        person_details = data['person_details']
        result = add_new_person(
            school_index,
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
        print(f"💥 שגיאה כללית: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False,
            'message': f'שגיאת שרת: {str(e)}'
        }), 500


@app.route('/api/people/<person_id>', methods=['DELETE'])
def delete_person(person_id):
    """מוחק אדם מהמערכת של בית ספר ספציפי"""
    try:
        data = request.json or {}

        # קבלת school_index מהבקשה
        school_index = data.get('school_index')
        if school_index is None:
            return jsonify({
                'success': False,
                'message': 'מזהה בית ספר נדרש'
            }), 400

        # בדיקת תקינות האינדקס
        if school_index < 0:
            return jsonify({
                'success': False,
                'message': 'מזהה בית ספר לא תקין'
            }), 400

        # קרא לפונקציה המעודכנת מ-Data_Manage
        result = remove_person(school_index, person_id)

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
        # קבלת school_index מ-query parameters
        school_index = request.args.get('school_index')
        if school_index is None:
            return jsonify({
                'success': False,
                'message': 'מזהה בית ספר נדרש כ-query parameter (?school_index=...)'
            }), 400

        try:
            school_index = int(school_index)
        except ValueError:
            return jsonify({
                'success': False,
                'message': 'מזהה בית ספר חייב להיות מספר'
            }), 400

        # בדיקת תקינות האינדקס
        if school_index < 0:
            return jsonify({
                'success': False,
                'message': 'מזהה בית ספר לא תקין'
            }), 400

        # קריאה לפונקציה המעודכנת מ-Data_Manage
        result = get_all_people(school_index)

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
        # קבלת school_index מ-query parameters
        school_index = request.args.get('school_index')
        if school_index is None:
            return jsonify({
                'success': False,
                'message': 'מזהה בית ספר נדרש כ-query parameter (?school_index=...)'
            }), 400

        try:
            school_index = int(school_index)
        except ValueError:
            return jsonify({
                'success': False,
                'message': 'מזהה בית ספר חייב להיות מספר'
            }), 400

        # בדיקת תקינות האינדקס
        if school_index < 0:
            return jsonify({
                'success': False,
                'message': 'מזהה בית ספר לא תקין'
            }), 400

        # קריאה לפונקציה המעודכנת מ-Data_Manage
        result = get_person(school_index, person_id)

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

        # קבלת school_index מהבקשה
        school_index = data.get('school_index')
        if school_index is None:
            return jsonify({
                'success': False,
                'message': 'מזהה בית ספר נדרש'
            }), 400

        # בדיקת תקינות האינדקס
        if school_index < 0:
            return jsonify({
                'success': False,
                'message': 'מזהה בית ספר לא תקין'
            }), 400

        # קריאה לפונקציה המעודכנת מ-Data_Manage
        result = update_person(
            school_index,
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

        # קבלת school_index מהבקשה
        school_index = data.get('school_index')
        if school_index is None:
            return jsonify({
                'success': False,
                'message': 'מזהה בית ספר נדרש'
            }), 400

        # בדיקת תקינות האינדקס
        if school_index < 0:
            return jsonify({
                'success': False,
                'message': 'מזהה בית ספר לא תקין'
            }), 400

        # קריאה לפונקציה המעודכנת מ-Data_Manage
        result = toggle_presence(school_index, person_id, data['is_present'])

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

        # קבלת school_index מהבקשה
        school_index = data.get('school_index')
        if school_index is None:
            return jsonify({
                'success': False,
                'message': 'מזהה בית ספר נדרש'
            }), 400

        # בדיקת תקינות האינדקס
        if school_index < 0:
            return jsonify({
                'success': False,
                'message': 'מזהה בית ספר לא תקין'
            }), 400

        # קרא לפונקציה המעודכנת מ-Data_Manage
        result = add_new_target(
            school_index,
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

        # קבלת school_index מהבקשה
        school_index = data.get('school_index')
        if school_index is None:
            return jsonify({
                'success': False,
                'message': 'מזהה בית ספר נדרש'
            }), 400

        # בדיקת תקינות האינדקס
        if school_index < 0:
            return jsonify({
                'success': False,
                'message': 'מזהה בית ספר לא תקין'
            }), 400

        # קרא לפונקציה המעודכנת מ-Data_Manage
        result = remove_target(school_index, camera_number)

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
        # קבלת school_index מ-query parameters
        school_index = request.args.get('school_index')
        if school_index is None:
            return jsonify({
                'success': False,
                'message': 'מזהה בית ספר נדרש כ-query parameter (?school_index=...)'
            }), 400

        try:
            school_index = int(school_index)
        except ValueError:
            return jsonify({
                'success': False,
                'message': 'מזהה בית ספר חייב להיות מספר'
            }), 400

        # בדיקת תקינות האינדקס
        if school_index < 0:
            return jsonify({
                'success': False,
                'message': 'מזהה בית ספר לא תקין'
            }), 400

        # קריאה לפונקציה המעודכנת מ-Data_Manage
        result = get_all_targets(school_index)

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

        # קבלת school_index מהבקשה
        school_index = data.get('school_index')
        if school_index is None:
            return jsonify({
                'success': False,
                'message': 'מזהה בית ספר נדרש'
            }), 400

        # בדיקת תקינות האינדקס
        if school_index < 0:
            return jsonify({
                'success': False,
                'message': 'מזהה בית ספר לא תקין'
            }), 400

        # קרא לפונקציה המעודכנת מ-Data_Manage
        result = clear_all_targets(school_index)

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

        # קבלת school_index מהבקשה
        school_index = data.get('school_index')
        if school_index is None:
            return jsonify({
                'success': False,
                'message': 'מזהה בית ספר נדרש',
                'faces_extracted': 0
            }), 400

        # בדיקת תקינות האינדקס
        if school_index < 0:
            return jsonify({
                'success': False,
                'message': 'מזהה בית ספר לא תקין',
                'faces_extracted': 0
            }), 400

        # קריאה לפונקציה המעודכנת מ-Attend_Manage
        from Attend_Manage import extract_all_faces_from_targets
        result = extract_all_faces_from_targets(school_index)

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

        # קבלת school_index מהבקשה
        school_index = data.get('school_index')
        if school_index is None:
            return jsonify({
                'success': False,
                'message': 'מזהה בית ספר נדרש',
                'checked_people': 0,
                'present_people': 0,
                'absent_people': 0
            }), 400

        # בדיקת תקינות האינדקס
        if school_index < 0:
            return jsonify({
                'success': False,
                'message': 'מזהה בית ספר לא תקין',
                'checked_people': 0,
                'present_people': 0,
                'absent_people': 0
            }), 400

        # קריאה לפונקציה המעודכנת מ-Attend_Manage
        from Attend_Manage import check_attendance_for_all_people
        result = check_attendance_for_all_people(school_index)

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
def not_found_api(error):
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
def internal_error_api(error):
    """
    טיפול בשגיאת 500
    """
    return jsonify({
        'success': False,
        'message': 'שגיאת שרת פנימית',
        'error_type': 'internal_server_error'
    }), 500


# ===============================================================================
#                             DEMO DATA INITIALIZATION
# ===============================================================================

def initialize_demo_data():
    """יצירת נתוני הדגמה לבדיקה"""
    print("🎯 מאתחל נתוני הדגמה...")
    add_demo_data()
    print_all_schools()


# ===============================================================================
#                                   הפעלת השרת
# ===============================================================================

if __name__ == '__main__':
    # יצירת נתוני הדגמה
    initialize_demo_data()

    # קבלת פורט מ-Render או ברירת מחדל
    port = int(os.environ.get("PORT", 5000))

    print(f"🚀 Starting Flask server on port {port}")

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
📝 השינויים שבוצעו:

✅ החלפת כל הפונקציות להשתמש ב-school_index ישירות
✅ הוספת בדיקות תקינות ל-school_index
✅ הוספת המיקום בווקטור לתגובת api_register
✅ ביטול הצורך בחיפוש אינדקס בכל בקשה
✅ יעילות משופרת - פחות עבודה בכל API call

עכשיו הצד לקוח צריך לשלוח school_index בכל בקשה במקום username.
"""