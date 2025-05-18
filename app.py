from flask import Flask, render_template, request, jsonify, send_from_directory
import os
import json
from werkzeug.utils import secure_filename
import time
import threading
from datetime import datetime
import logging
# from unidecode import unidecode
from flask import Flask, render_template, request

# הגדר את התיקיות החדשות לפלאסק
app = Flask(__name__,
            template_folder='web_templates',
            static_folder='web_static')


# הגדרת לוגים מורחבים
logging.basicConfig(level=logging.DEBUG)
app.logger.setLevel(logging.DEBUG)

# הגדרת תיקיות
UPLOAD_FOLDER = 'uploads'
TARGET_FOLDER = 'target'
TRAINING_FACES_FOLDER = 'training_faces'

# יצירת התיקיות אם הן לא קיימות
for folder in [UPLOAD_FOLDER, TARGET_FOLDER, TRAINING_FACES_FOLDER]:
    try:
        os.makedirs(folder, exist_ok=True)
        print(f"תיקייה {folder} נוצרה/קיימת")
    except Exception as e:
        print(f"בעיה עם תיקייה {folder}: {str(e)}")

# הגדרת התצורה של Flask
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # מגבלת גודל קובץ - 16MB

# אתחול משתנים גלובליים
people_list = []  # רשימה זמנית של אנשים


@app.route('/')
def index():
    """דף הבית"""
    return render_template('index.html')


@app.route('/api/status', methods=['GET'])
def system_status():
    """החזרת סטטוס המערכת"""
    return jsonify({
        'status': 'active',
        'people_count': len(people_list),
        'camera_active': False
    })


@app.route('/api/people', methods=['GET'])
def get_people():
    """החזרת רשימת האנשים"""
    return jsonify(people_list)


@app.route('/api/add_person', methods=['POST'])
def add_person():
    """הוספת אדם חדש"""
    data = request.json

    if not all(key in data for key in ['first_name', 'last_name', 'id_number']):
        return jsonify({'success': False, 'error': 'חסרים פרטים'}), 400

    # בדיקה אם האדם כבר קיים
    if any(person['id'] == data['id_number'] for person in people_list):
        return jsonify({'success': False, 'error': 'אדם עם מספר זהות זה כבר קיים במערכת'}), 400

    # הוספת האדם לרשימה עם שדה image_count
    new_person = {
        'id': data['id_number'],
        'first_name': data['first_name'],
        'last_name': data['last_name'],
        'is_present': False,
        'has_image': False,
        'image_count': 0  # מספר התמונות שיש לאדם
    }

    people_list.append(new_person)

    return jsonify({
        'success': True,
        'message': f"נוצר בהצלחה: {data['first_name']} {data['last_name']}",
        'person_id': data['id_number']
    })


@app.route('/api/remove_person/<person_id>', methods=['DELETE'])
def remove_person(person_id):
    """מחיקת אדם מהמערכת"""
    try:
        # בדיקה אם האדם קיים
        person = next((p for p in people_list if p['id'] == person_id), None)
        if not person:
            return jsonify({'success': False, 'error': 'אדם לא נמצא'}), 404

        # מחיקת האדם מהרשימה
        people_list.remove(person)

        # בדיקה אם יש לאדם תיקייה עם תמונות
        if 'folder_name' in person:
            folder_path = os.path.join(TRAINING_FACES_FOLDER, person['folder_name'])
            print(f"בודק אם יש תיקייה: {folder_path}")
            if os.path.exists(folder_path):
                # מחיקת כל הקבצים בתיקייה
                for file in os.listdir(folder_path):
                    os.remove(os.path.join(folder_path, file))
                # מחיקת התיקייה
                os.rmdir(folder_path)
                print(f"מחקתי את התיקייה: {folder_path}")

        # בדיקה גם עבור פורמט ישן של תמונות
        for i in range(1, 6):
            image_path = os.path.join(TRAINING_FACES_FOLDER, f"{person_id}_{i}.jpg")
            if os.path.exists(image_path):
                os.remove(image_path)
                print(f"מחקתי תמונה ישנה: {image_path}")

        old_image_path = os.path.join(TRAINING_FACES_FOLDER, f"{person_id}.jpg")
        if os.path.exists(old_image_path):
            os.remove(old_image_path)

        return jsonify({
            'success': True,
            'message': f"{person['first_name']} {person['last_name']} נמחק בהצלחה"
        })

    except Exception as e:
        print(f"שגיאה במחיקת אדם: {str(e)}")
        return jsonify({'success': False, 'error': f'שגיאה במחיקת אדם: {str(e)}'}), 500


@app.route('/api/upload_image/<person_id>', methods=['POST'])
def upload_image(person_id):
    """העלאת תמונה לאדם"""
    try:
        print(f"התחלנו העלאת תמונה לאדם {person_id}")

        # בדיקה אם האדם קיים
        person = next((p for p in people_list if p['id'] == person_id), None)
        if not person:
            print(f"אדם עם ID {person_id} לא נמצא")
            return jsonify({'success': False, 'error': 'אדם לא נמצא'}), 404

        print(f"נמצא אדם: {person['first_name']} {person['last_name']}")

        # בדיקה אם הגענו למקסימום תמונות
        if person.get('image_count', 0) >= 5:
            return jsonify({'success': False, 'error': 'הגעת למקסימום התמונות המותר (5)'}), 400

        # בדיקה אם קיים קובץ בבקשה
        if 'image' not in request.files:
            return jsonify({'success': False, 'error': 'לא נבחר קובץ'}), 400

        file = request.files['image']

        # בדיקה אם הקובץ ריק
        if file.filename == '':
            return jsonify({'success': False, 'error': 'לא נבחר קובץ'}), 400

        # יצירת שם תיקייה בפורמט שם_פרטי_שם_משפחה_תז
        from unidecode import unidecode

        # ובפונקציה upload_image:
        folder_name = unidecode(person['first_name']) + "_" + unidecode(person['last_name']) + "_" + person_id        # הסרת תווים בעייתיים משם התיקייה
        folder_name = secure_filename(folder_name)

        # יצירת התיקייה אם היא לא קיימת
        person_folder = os.path.join(TRAINING_FACES_FOLDER, folder_name)
        print(f"יוצר תיקייה: {person_folder}")
        os.makedirs(person_folder, exist_ok=True)

        # שמירת הקובץ עם מספר התמונה
        image_number = person.get('image_count', 0) + 1
        filename = f"{image_number}.jpg"
        file_path = os.path.join(person_folder, filename)
        print(f"שומר קובץ בנתיב: {file_path}")
        file.save(file_path)

        # שמירת שם התיקייה במידע של האדם
        person['folder_name'] = folder_name

        # עדכון מספר התמונות ומצב התמונה
        person['image_count'] = image_number
        person['has_image'] = True

        # בדיקה אם הושגה כמות המינימום
        remaining = 3 - person['image_count']

        if remaining <= 0:
            return jsonify({
                'success': True,
                'message': f"התמונה הועלתה בהצלחה עבור {person['first_name']} {person['last_name']}",
                'image_count': person['image_count'],
                'images_required': False,
                'remaining': 0,
                'can_add_more': person['image_count'] < 5
            })
        else:
            return jsonify({
                'success': True,
                'message': f"התמונה הועלתה בהצלחה. נדרשות עוד {remaining} תמונות לפחות.",
                'image_count': person['image_count'],
                'images_required': True,
                'remaining': remaining,
                'can_add_more': True
            })
    except Exception as e:
        print(f"שגיאה בהעלאת תמונה: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'error': f'שגיאה בשרת: {str(e)}'}), 500


@app.route('/api/upload_multiple_images/<person_id>', methods=['POST'])
def upload_multiple_images(person_id):
    """העלאת מספר תמונות לאדם"""
    try:
        print(f"התחלנו העלאת מספר תמונות לאדם {person_id}")

        # בדיקה אם האדם קיים
        person = next((p for p in people_list if p['id'] == person_id), None)
        if not person:
            return jsonify({'success': False, 'error': 'אדם לא נמצא'}), 404

        # בדיקה אם כבר יש תמונות
        current_image_count = person.get('image_count', 0)

        # בדיקה אם הגענו למקסימום תמונות
        if current_image_count >= 5:
            return jsonify({'success': False, 'error': 'הגעת למקסימום התמונות המותר (5)'}), 400

        files = []
        # איסוף כל הקבצים מהבקשה
        for key in request.files:
            files.append(request.files[key])

        if not files:
            return jsonify({'success': False, 'error': 'לא נבחרו קבצים'}), 400

        # בדיקה שלא חורגים ממקסימום 5 תמונות
        if current_image_count + len(files) > 5:
            return jsonify({'success': False, 'error': f'ניתן להעלות רק עוד {5 - current_image_count} תמונות'}), 400

        # יצירת שם תיקייה בפורמט שם_פרטי_שם_משפחה_תז
        folder_name = person['first_name'] + "_" + person['last_name'] + "_" + person_id        # הסרת תווים בעייתיים משם התיקייה
        folder_name = secure_filename(folder_name)

        # יצירת התיקייה אם היא לא קיימת
        person_folder = os.path.join(TRAINING_FACES_FOLDER, folder_name)
        print(f"יוצר תיקייה: {person_folder}")
        os.makedirs(person_folder, exist_ok=True)

        # שמירת שם התיקייה במידע של האדם
        person['folder_name'] = folder_name

        # שמירת כל הקבצים
        for i, file in enumerate(files):
            if file.filename == '':
                continue

            image_number = current_image_count + i + 1
            filename = f"{image_number}.jpg"
            file_path = os.path.join(person_folder, filename)
            print(f"שומר קובץ בנתיב: {file_path}")
            file.save(file_path)

        # עדכון מספר התמונות
        person['image_count'] = current_image_count + len(files)
        person['has_image'] = True

        # בדיקה אם הושגה כמות המינימום
        remaining = max(0, 3 - person['image_count'])

        return jsonify({
            'success': True,
            'message': f"הועלו {len(files)} תמונות בהצלחה" + (
                f", נותרו עוד {remaining} תמונות לפחות" if remaining > 0 else ""),
            'image_count': person['image_count'],
            'images_required': remaining > 0,
            'remaining': remaining,
            'can_add_more': person['image_count'] < 5
        })
    except Exception as e:
        print(f"שגיאה בהעלאת מספר תמונות: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'error': f'שגיאה בשרת: {str(e)}'}), 500


@app.route('/api/person_image/<person_id>')
def get_person_image(person_id):
    """קבלת תמונה של אדם (התמונה הראשונה)"""
    try:
        print(f"מבקש תמונה של אדם {person_id}")

        # מציאת האדם
        person = next((p for p in people_list if p['id'] == person_id), None)

        # בדיקה אם יש לאדם תיקייה מוגדרת
        if person and 'folder_name' in person:
            person_folder = os.path.join(TRAINING_FACES_FOLDER, person['folder_name'])
            image_path = os.path.join(person_folder, "1.jpg")

            print(f"מחפש תמונה בנתיב: {image_path}")

            # בדיקה אם התמונה קיימת
            if os.path.exists(image_path):
                print(f"נמצאה תמונה בתיקייה של האדם")
                return send_from_directory(person_folder, "1.jpg")

        # חיפוש לפי שם מחושב (במקרה שהתיקייה קיימת אבל לא מוגדרת באובייקט)
        if person:
            computed_folder_name = secure_filename(person['first_name'] + "_" + person['last_name'] + "_" + person_id)
            computed_folder = os.path.join(TRAINING_FACES_FOLDER, computed_folder_name)
            computed_path = os.path.join(computed_folder, "1.jpg")

            print(f"מחפש תמונה בנתיב מחושב: {computed_path}")

            if os.path.exists(computed_path):
                print(f"נמצאה תמונה בנתיב מחושב")
                # עדכון שם התיקייה במידע של האדם
                person['folder_name'] = computed_folder_name
                return send_from_directory(computed_folder, "1.jpg")

        # חיפוש במבנה הישן
        old_format_path = os.path.join(TRAINING_FACES_FOLDER, f"{person_id}_1.jpg")
        print(f"מחפש תמונה במבנה ישן: {old_format_path}")

        if os.path.exists(old_format_path):
            print(f"נמצאה תמונה במבנה ישן")
            return send_from_directory(TRAINING_FACES_FOLDER, f"{person_id}_1.jpg")

        # אם לא נמצאה תמונה בכלל, נחזיר תמונת ברירת מחדל
        print(f"לא נמצאה תמונה, מחזיר תמונת ברירת מחדל")
        os.makedirs(os.path.join(app.static_folder, 'img'), exist_ok=True)
        return send_from_directory(os.path.join(app.static_folder, 'img'), 'person-placeholder.jpg')

    except Exception as e:
        print(f"שגיאה בהצגת תמונה: {str(e)}")
        import traceback
        traceback.print_exc()
        # במקרה של שגיאה, החזר ברירת מחדל
        os.makedirs(os.path.join(app.static_folder, 'img'), exist_ok=True)
        return send_from_directory(os.path.join(app.static_folder, 'img'), 'person-placeholder.jpg')


@app.route('/api/person_image/<person_id>/<image_number>')
def get_specific_person_image(person_id, image_number):
    """קבלת תמונה ספציפית של אדם לפי מספר"""
    try:
        print(f"מבקש תמונה ספציפית {image_number} של אדם {person_id}")

        # מציאת האדם
        person = next((p for p in people_list if p['id'] == person_id), None)

        # בדיקה אם יש לאדם תיקייה מוגדרת
        if person and 'folder_name' in person:
            person_folder = os.path.join(TRAINING_FACES_FOLDER, person['folder_name'])
            image_path = os.path.join(person_folder, f"{image_number}.jpg")

            print(f"מחפש תמונה בנתיב: {image_path}")

            # בדיקה אם התמונה קיימת
            if os.path.exists(image_path):
                print(f"נמצאה תמונה ספציפית בתיקייה של האדם")
                return send_from_directory(person_folder, f"{image_number}.jpg")

        # חיפוש לפי שם מחושב
        if person:
            computed_folder_name = secure_filename(person['first_name'] + "_" + person['last_name'] + "_" + person_id)
            computed_folder = os.path.join(TRAINING_FACES_FOLDER, computed_folder_name)
            computed_path = os.path.join(computed_folder, f"{image_number}.jpg")

            print(f"מחפש תמונה בנתיב מחושב: {computed_path}")

            if os.path.exists(computed_path):
                print(f"נמצאה תמונה ספציפית בנתיב מחושב")
                # עדכון שם התיקייה במידע של האדם
                person['folder_name'] = computed_folder_name
                return send_from_directory(computed_folder, f"{image_number}.jpg")

        # חיפוש במבנה הישן
        old_format_path = os.path.join(TRAINING_FACES_FOLDER, f"{person_id}_{image_number}.jpg")
        print(f"מחפש תמונה במבנה ישן: {old_format_path}")

        if os.path.exists(old_format_path):
            print(f"נמצאה תמונה במבנה ישן")
            return send_from_directory(TRAINING_FACES_FOLDER, f"{person_id}_{image_number}.jpg")

        # החזרת תמונת ברירת מחדל אם אין תמונה
        print(f"לא נמצאה תמונה ספציפית, מחזיר תמונת ברירת מחדל")
        return send_from_directory(os.path.join(app.static_folder, 'img'), 'person-placeholder.jpg')

    except Exception as e:
        print(f"שגיאה בהצגת תמונה ספציפית: {str(e)}")
        import traceback
        traceback.print_exc()
        # במקרה של שגיאה, החזר ברירת מחדל
        return send_from_directory(os.path.join(app.static_folder, 'img'), 'person-placeholder.jpg')


@app.route('/api/toggle_presence/<person_id>', methods=['POST'])
def toggle_presence(person_id):
    """שינוי סטטוס נוכחות של אדם"""
    # בדיקה אם האדם קיים
    person = next((p for p in people_list if p['id'] == person_id), None)
    if not person:
        return jsonify({'success': False, 'error': 'אדם לא נמצא'}), 404

    # שינוי סטטוס הנוכחות
    person['is_present'] = not person['is_present']

    status = "נוכח" if person['is_present'] else "לא נוכח"

    return jsonify({
        'success': True,
        'message': f"{person['first_name']} {person['last_name']} סומן כ{status}",
        'is_present': person['is_present']
    })


@app.route('/api/start_camera', methods=['POST'])
def start_camera():
    """הפעלת המצלמה"""
    # זה סימולציה בלבד - בגרסה אמיתית תהיה כאן התקשרות למצלמה
    return jsonify({'success': True, 'message': 'המצלמה הופעלה בהצלחה'})


@app.route('/api/stop_camera', methods=['POST'])
def stop_camera():
    """כיבוי המצלמה"""
    # זה סימולציה בלבד
    return jsonify({'success': True, 'message': 'המצלמה כובתה בהצלחה'})


@app.route('/api/camera_feed')
def camera_feed():
    """קבלת התמונה מהמצלמה"""
    # זה סימולציה בלבד
    return send_from_directory(os.path.join(app.static_folder, 'img'), 'camera-placeholder.jpg')


@app.route('/api/check_attendance', methods=['POST'])
def check_attendance():
    """בדיקת נוכחות באמצעות המצלמה"""
    # זה סימולציה בלבד
    return jsonify({'success': True, 'message': 'בדיקת נוכחות החלה'})


@app.route('/api/attendance_status')
def attendance_status():
    """קבלת סטטוס בדיקת הנוכחות"""
    # זה סימולציה בלבד
    # נדמה שזיהינו את כל האנשים במערכת
    results = {}
    for person in people_list:
        # נבחר באופן אקראי אם האדם נוכח או לא
        import random
        is_present = random.choice([True, False])
        person['is_present'] = is_present
        results[person['id']] = {'is_present': is_present}

    return jsonify({
        'status': 'completed',
        'results': results
    })


@app.route('/api/export_attendance', methods=['GET'])
def export_attendance():
    """ייצוא רשימת נוכחות"""
    timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
    attendance_data = {
        'timestamp': timestamp,
        'people': [
            {
                'id': person['id'],
                'name': f"{person['first_name']} {person['last_name']}",
                'status': 'נוכח' if person['is_present'] else 'לא נוכח'
            }
            for person in people_list
        ]
    }

    # יצירת תיקיית ייצוא אם אינה קיימת
    export_path = os.path.join(app.static_folder, 'exports')
    os.makedirs(export_path, exist_ok=True)

    # שמירת הקובץ
    file_path = os.path.join(export_path, f"attendance_{timestamp}.json")
    with open(file_path, 'w', encoding='utf-8') as f:
        json.dump(attendance_data, f, ensure_ascii=False, indent=4)

    return jsonify({
        'success': True,
        'message': 'רשימת הנוכחות יוצאה בהצלחה',
        'file_url': f"/static/exports/attendance_{timestamp}.json"
    })


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)