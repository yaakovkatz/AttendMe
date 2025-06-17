# ================= IMPORTS ==================
from flask import Flask, render_template, request, jsonify, send_from_directory, redirect
import os
import json
from werkzeug.utils import secure_filename
import time
from datetime import datetime
import logging
import threading

import cloudinary
import cloudinary.uploader
import cloudinary.api

# ================= CLOUDINARY CONFIGURATION ==================
cloudinary.config(
    cloud_name=os.environ.get('CLOUDINARY_CLOUD_NAME'),
    api_key=os.environ.get('CLOUDINARY_API_KEY'),
    api_secret=os.environ.get('CLOUDINARY_API_SECRET'),
    secure=True
)
# =============================================================

# --- קוד חדש לניהול קובץ JSON ---
DATA_FILE = os.path.join(os.path.dirname(__file__), 'people_data.json')


def load_data():
    """טוענת את רשימת האנשים מהקובץ"""
    if os.path.exists(DATA_FILE):
        with open(DATA_FILE, 'r', encoding='utf-8') as f:
            try:
                return json.load(f)
            except json.JSONDecodeError:
                return []
    return []


def save_data(data):
    """שומרת את רשימת האנשים לקובץ"""
    with open(DATA_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=4)


# --- סוף קוד לניהול JSON ---


app = Flask(__name__,
            template_folder='web_templates',
            static_folder='web_static')

logging.basicConfig(level=logging.INFO)
app.logger.setLevel(logging.INFO)


# --- ROUTES ---

@app.route('/')
def index():
    return render_template('index.html')


@app.route('/api/people', methods=['GET'])
def get_people():
    people_list = load_data()
    return jsonify(people_list)


@app.route('/api/add_person', methods=['POST'])
def add_person():
    people_list = load_data()
    data = request.json
    if not all(key in data for key in ['first_name', 'last_name', 'id_number']):
        return jsonify({'success': False, 'error': 'חסרים פרטים'}), 400
    if any(p['id'] == data['id_number'] for p in people_list):
        return jsonify({'success': False, 'error': 'אדם עם מספר זהות זה כבר קיים במערכת'}), 400

    new_person = {
        'id': data['id_number'],
        'first_name': data['first_name'],
        'last_name': data['last_name'],
        'is_present': False,
        'image_urls': []
    }
    people_list.append(new_person)
    save_data(people_list)
    return jsonify({'success': True, 'message': f"נוצר בהצלחה: {data['first_name']} {data['last_name']}",
                    'person_id': data['id_number']})


@app.route('/api/remove_person/<person_id>', methods=['DELETE'])
def remove_person():
    people_list = load_data()
    person_to_remove = next((p for p in people_list if p['id'] == person_id), None)
    if not person_to_remove:
        return jsonify({'success': False, 'error': 'אדם לא נמצא'}), 404

    if person_to_remove.get('image_urls'):
        public_ids_to_delete = []
        for url in person_to_remove['image_urls']:
            try:
                public_id = '/'.join(url.split('/')[-4:]).split('.')[0]
                public_ids_to_delete.append(public_id)
            except Exception as e:
                app.logger.error(f"Could not parse public_id from URL {url}: {e}")
        if public_ids_to_delete:
            app.logger.info(f"Deleting from Cloudinary: {public_ids_to_delete}")
            # --- הנה התיקון ---
            cloudinary.api.delete_resources(public_ids_to_delete, resource_type="image")

    people_list = [p for p in people_list if p['id'] != person_id]
    save_data(people_list)
    return jsonify({'success': True, 'message': f"נמחק בהצלחה"})


@app.route('/api/edit_person/<person_id>', methods=['POST'])
def edit_person(person_id):
    people_list = load_data()
    person = next((p for p in people_list if p['id'] == person_id), None)
    if not person:
        return jsonify({'success': False, 'error': 'אדם לא נמצא'}), 404
    data = request.json
    person['first_name'] = data.get('first_name', person['first_name'])
    person['last_name'] = data.get('last_name', person['last_name'])
    save_data(people_list)
    return jsonify({'success': True, 'message': 'הפרטים עודכנו בהצלחה'})


@app.route('/api/upload_image/<person_id>', methods=['POST'])
def upload_image(person_id):
    people_list = load_data()
    person = next((p for p in people_list if p['id'] == person_id), None)
    if not person:
        return jsonify({'success': False, 'error': 'אדם לא נמצא'}), 404

    if len(person.get('image_urls', [])) >= 5:
        return jsonify({'success': False, 'error': 'הגעת למקסימום התמונות המותר (5)'}), 400

    if 'image' not in request.files or request.files['image'].filename == '':
        return jsonify({'success': False, 'error': 'לא נבחר קובץ'}), 400

    file_to_upload = request.files['image']
    folder_name = secure_filename(f"{person['first_name']}_{person['last_name']}_{person['id']}")
    public_id = f"attendme_faces/{folder_name}/{int(time.time())}"

    upload_result = cloudinary.uploader.upload(file_to_upload, public_id=public_id)
    image_url = upload_result.get('secure_url')

    if not image_url:
        return jsonify({'success': False, 'error': 'שגיאה בהעלאה לענן'}), 500

    if 'image_urls' not in person:
        person['image_urls'] = []
    person['image_urls'].append(image_url)

    save_data(people_list)

    remaining = max(0, 3 - len(person['image_urls']))
    message = f"התמונה הועלתה בהצלחה. נדרשות עוד {remaining} תמונות." if remaining > 0 else "התמונה הועלתה בהצלחה."

    return jsonify({
        'success': True, 'message': message, 'image_count': len(person['image_urls']),
        'images_required': remaining > 0, 'remaining': remaining,
        'can_add_more': len(person['image_urls']) < 5
    })


@app.route('/api/get_loaded_people', methods=['GET'])
def get_loaded_people():
    people_list = load_data()
    for person in people_list:
        person['has_image'] = bool(person.get('image_urls'))
        person['image_count'] = len(person.get('image_urls', []))
    return jsonify({"success": True, "people": people_list})


@app.route('/api/toggle_presence/<person_id>', methods=['POST'])
def toggle_presence(person_id):
    people_list = load_data()
    person = next((p for p in people_list if p['id'] == person_id), None)
    if not person:
        return jsonify({'success': False, 'error': 'אדם לא נמצא'}), 404

    person['is_present'] = not person.get('is_present', False)
    save_data(people_list)

    status = "נוכח" if person['is_present'] else "לא נוכח"
    return jsonify({'success': True, 'message': f"{person['first_name']} {person['last_name']} סומן כ{status}",
                    'is_present': person['is_present']})


# הפונקציה הזו מנוטרלת כרגע כי היא מכילה לוגיקה ישנה
@app.route('/api/run_advanced_function', methods=['POST'])
def run_advanced_function():
    return jsonify({"success": False, "error": "Advanced functions are currently disabled."}), 404


@app.route('/api/start_check', methods=['POST'])
def start_check():
    files = request.files.getlist('target_images')
    if not files:
        return jsonify({'success': False, 'error': 'לא נשלחו קבצים'}), 400

    uploaded_urls = []
    for file in files:
        if file.filename == '':
            continue
        try:
            result = cloudinary.uploader.upload(file, folder="attendme_targets")
            if result.get('secure_url'):
                uploaded_urls.append(result['secure_url'])
        except Exception as e:
            app.logger.error(f"שגיאה בהעלאה: {e}")
            continue

    if not uploaded_urls:
        return jsonify({'success': False, 'error': 'לא הועלו קבצים'}), 500

    return jsonify({'success': True, 'message': 'קבצים הועלו בהצלחה', 'target_urls': uploaded_urls})


if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5000))
    app.run(debug=False, host='0.0.0.0', port=port)