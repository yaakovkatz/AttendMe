from flask import Flask, render_template, request, jsonify, send_from_directory
import os
import json
from werkzeug.utils import secure_filename
import time
import threading
from datetime import datetime

app = Flask(__name__, static_folder='static', template_folder='templates')

# הגדרת תיקיות
UPLOAD_FOLDER = 'uploads'
TARGET_FOLDER = 'target'
TRAINING_FACES_FOLDER = 'training_faces'

# יצירת התיקיות אם הן לא קיימות
for folder in [UPLOAD_FOLDER, TARGET_FOLDER, TRAINING_FACES_FOLDER]:
    os.makedirs(folder, exist_ok=True)

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
    # בדיקה אם האדם קיים
    person = next((p for p in people_list if p['id'] == person_id), None)
    if not person:
        return jsonify({'success': False, 'error': 'אדם לא נמצא'}), 404

    # מחיקת האדם מהרשימה
    people_list.remove(person)

    # מחיקת כל התמונות שקשורות לאדם
    for i in range(1, 6):  # נבדוק את כל 5 התמונות האפשריות
        image_path = os.path.join(TRAINING_FACES_FOLDER, f"{person_id}_{i}.jpg")
        if os.path.exists(image_path):
            os.remove(image_path)

    # בדיקה גם עבור פורמט ישן של תמונה
    old_image_path = os.path.join(TRAINING_FACES_FOLDER, f"{person_id}.jpg")
    if os.path.exists(old_image_path):
        os.remove(old_image_path)

    return jsonify({
        'success': True,
        'message': f"{person['first_name']} {person['last_name']} נמחק בהצלחה"
    })


@app.route('/api/upload_image/<person_id>', methods=['POST'])
def upload_image(person_id):
    """העלאת תמונה לאדם"""
    # בדיקה אם האדם קיים
    person = next((p for p in people_list if p['id'] == person_id), None)
    if not person:
        return jsonify({'success': False, 'error': 'אדם לא נמצא'}), 404

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

    # שמירת הקובץ עם מספר התמונה
    image_number = person.get('image_count', 0) + 1
    filename = secure_filename(f"{person_id}_{image_number}.jpg")
    file_path = os.path.join(TRAINING_FACES_FOLDER, filename)
    file.save(file_path)

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


@app.route('/api/upload_multiple_images/<person_id>', methods=['POST'])
def upload_multiple_images(person_id):
    """העלאת מספר תמונות לאדם"""
    # בדיקה אם האדם קיים
    person = next((p for p in people_list if p['id'] == person_id), None)
    if not person:
        return jsonify({'success': False, 'error': 'אדם לא נמצא'}), 404

    # בדיקה אם כבר יש תמונות
    current_image_count = person.get('image_count', 0)

    # בדיקה אם הגענו למקסימום תמונות
    if current_image_count >= a5:
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

    # שמירת כל הקבצים
    for i, file in enumerate(files):
        if file.filename == '':
            continue

        image_number = current_image_count + i + 1
        filename = secure_filename(f"{person_id}_{image_number}.jpg")
        file_path = os.path.join(TRAINING_FACES_FOLDER, filename)
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


@app.route('/api/person_image/<person_id>')
def get_person_image(person_id):
    """קבלת תמונה של אדם (התמונה הראשונה)"""
    # קודם כל, ננסה למצוא את התמונה החדשה עם מספור
    image_path = os.path.join(TRAINING_FACES_FOLDER, f"{person_id}_1.jpg")

    # אם התמונה החדשה לא קיימת, ננסה את התבנית הישנה
    if not os.path.exists(image_path):
        old_format_path = os.path.join(TRAINING_FACES_FOLDER, f"{person_id}.jpg")
        if os.path.exists(old_format_path):
            return send_from_directory(TRAINING_FACES_FOLDER, f"{person_id}.jpg")
    else:
        # אם התמונה החדשה קיימת, נחזיר אותה
        return send_from_directory(TRAINING_FACES_FOLDER, f"{person_id}_1.jpg")

    # אם לא נמצאה תמונה בכלל, נחזיר תמונת ברירת מחדל
    os.makedirs(os.path.join(app.static_folder, 'img'), exist_ok=True)
    return send_from_directory(os.path.join(app.static_folder, 'img'), 'person-placeholder.jpg')


@app.route('/api/person_image/<person_id>/<image_number>')
def get_specific_person_image(person_id, image_number):
    """קבלת תמונה ספציפית של אדם לפי מספר"""
    image_path = os.path.join(TRAINING_FACES_FOLDER, f"{person_id}_{image_number}.jpg")

    # בדיקה אם התמונה קיימת
    if os.path.exists(image_path):
        return send_from_directory(TRAINING_FACES_FOLDER, f"{person_id}_{image_number}.jpg")
    else:
        # החזרת תמונת ברירת מחדל אם אין תמונה
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