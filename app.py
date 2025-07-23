"""
=================================================================
                    מערכת AttendMe - ניהול נוכחות
=================================================================
מבנה הקובץ מחולק לפי נושאים:
1. Imports והגדרות
הגדרות ופונקציות עזר .2
3. Routes עיקריים (עמוד בית)
4. API - ניהול אנשים
5. API - ניהול תמונות זמניות
6. API - ניהול תמונות מטרה
7. API - פונקציות מתקדמות
8. הפעלת השרת
=================================================================
"""

# ===============================================================================
#                                   IMPORTS והגדרות
# ===============================================================================
# ייבוא הקבצים המקומיים
from Data_Manage import (add_new_person, remove_person, get_all_people, get_person,
                         update_person, toggle_presence, add_new_target, remove_target,
                         get_all_targets, clear_all_targets)
from Attend_Manage import (extract_all_faces_from_targets, check_attendance_for_all_people)
from flask import Flask, render_template, request, jsonify
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
#                               API - ניהול אנשים (CRUD)
# ===============================================================================
@app.route('/api/people/create_person', methods=['POST'])
def create_person():
    """יוצר אדם חדש עם תמונות"""
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


@app.route('/api/people/<person_id>', methods=['DELETE'])
def delete_person(person_id):
    """מוחק אדם מהמערכת"""
    # קרא לפונקציה מ-Data_Manage
    remove_person(person_id)
    return jsonify({'success': True})


@app.route('/api/get_loaded_people', methods=['GET'])
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
def get_person_api(person_id):
    """מחזיר פרטי אדם ספציפי"""
    # קריאה לפונקציה מ-Data_Manage
    person_data = get_person(person_id)

    # המרה לעבודה עם ענן
    return jsonify({
        "first_name": person_data["first_name"],
        "last_name": person_data["last_name"],
        "id_number": person_data["id_number"],
        "is_present": person_data["is_present"],
        "image_urls": person_data["image_urls"],
        "image_count": person_data["image_count"]
    }), 200


@app.route('/api/people/<person_id>', methods=['PUT'])
def update_person_api(person_id):
    """מעדכן פרטי אדם קיים"""
    data = request.json

    # קריאה לפונקציה מ-Data_Manage
    update_person(
        person_id,
        data['first_name'],
        data['last_name'],
    )
    return jsonify({'message': 'עודכן בהצלחה'}), 200


@app.route('/api/people/<person_id>/presence', methods=['POST'])
def toggle_presence_api(person_id):
    """מחליף סטטוס נוכחות של אדם"""
    data = request.json

    # קריאה לפונקציה מ-Data_Manage
    toggle_presence(person_id, data['is_present'])
    return jsonify({'message': 'סטטוס נוכחות עודכן'}), 200


@app.route('/api/people/stats', methods=['GET'])
def get_people_stats():
    """מחזיר סטטיסטיקות על האנשים (כמה רשומים, כמה נוכחים וכו')"""
    # TODO: מלא את הפונקציה
    pass


# ===============================================================================
#                           API - ניהול תמונות מטרה
# ===============================================================================


@app.route('/api/target-images', methods=['POST'])
def upload_target_images():
    """יוצר מטרה חדשה עם תמונות"""
    data = request.json

    # קרא לפונקציה מ-Data_Manage
    result = add_new_target(
        data['camera_number'],
        data['image_url']
    )

    # החזרת תוצאה - ✅ תיקון הבעיה
    if result['success']:
        # הסר את האובייקט target מהתגובה
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


@app.route('/api/targets/<int:camera_number>', methods=['DELETE'])
def delete_target(camera_number):
    """מוחק מטרה מהמערכת"""
    # קרא לפונקציה מ-Data_Manage
    remove_target(camera_number)
    return jsonify({'success': True})


@app.route('/api/get_target_images', methods=['GET'])
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
def clear_all_target_images():
    """מוחק את כל תמונות המטרה (פעולה מסוכנת)"""
    # קרא לפונקציה מ-Data_Manage
    clear_all_targets()
    return jsonify({'success': True})


@app.route('/api/target-images/stats', methods=['GET'])
def get_target_images_stats():
    """מחזיר סטטיסטיקות מפורטות על תמונות המטרה"""
    # TODO: מלא את הפונקציה
    pass


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
#                        פונקציות ניהול נתונים ובדיקת נוכחות
# ===============================================================================

@app.route('/api/face-recognition/extract-faces', methods=['POST'])
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
#                            API - ניהול תמונות זמניות
# ===============================================================================

@app.route('/api/upload_temp_image', methods=['POST'])
def upload_temp_image():
    try:
        # מקבל קובץ ופרטי אדם
        file_to_upload = request.files['image']
        first_name = request.form.get('first_name', '')
        last_name = request.form.get('last_name', '')
        id_number = request.form.get('id_number', '')

        # יצירת שם ייחודי עם פרטי האדם
        timestamp = int(time.time())
        public_id = f"{first_name}_{last_name}_{id_number}/image_{timestamp}"

        result = cloudinary.uploader.upload(
            file_to_upload,
            public_id=public_id
        )

        return jsonify({
            'success': True,
            'image_url': result.get('secure_url'),
            'public_id': result.get('public_id')
        })
    except:
        return jsonify({
            'success': False,
            'error': 'שגיאה בהעלאה'
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
    # קבלת פורט מ-Render או ברירת מחדל
    port = int(os.environ.get("PORT", 5000))

    # הדפסת מידע לדיבוג
    print(f"🚀 Starting Flask server on port {port}")
    print(f"🌐 Host: 0.0.0.0")
    print(f"🔧 Debug mode: False")

    # הפעלת השרת
    app.run(
        debug=False,
        host='0.0.0.0',
        port=port,
        threaded=True  # מאפשר קריאות מרובות במקביל
    )

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

✅ פונקציות מתקדמות:
   - זיהוי פנים (אם רלוונטי)
   - ייצוא נתונים
   - גיבויים

💡 טיפים למימוש:
   - התחל עם הפונקציות הפשוטות (load_data, save_data)
   - בדוק כל פונקציה בנפרד
   - השתמש ב-app.logger.info() ללוגים
   - הוסף טיפול בשגיאות (try/except)
   - בדוק תקינות נתונים לפני עיבוד
"""