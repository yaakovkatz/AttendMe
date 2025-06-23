# ================= IMPORTS ==================
from flask import Flask, render_template, request, jsonify, send_from_directory, redirect
import os
import json
from werkzeug.utils import secure_filename
import time
from datetime import datetime
import logging
import threading

from dotenv import load_dotenv

load_dotenv()

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
TARGET_IMAGES_FILE = os.path.join(os.path.dirname(__file__), 'target_images.json')


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


# *** פונקציות חדשות לטיפול בתמונות מטרה ***
def load_target_images():
    """טוענת את רשימת תמונות המטרה מהקובץ"""
    if os.path.exists(TARGET_IMAGES_FILE):
        with open(TARGET_IMAGES_FILE, 'r', encoding='utf-8') as f:
            try:
                data = json.load(f)
                return data.get('images', [])
            except json.JSONDecodeError:
                return []
    return []


def save_target_images(images_list):
    """שומרת את רשימת תמונות המטרה לקובץ"""
    try:
        data_to_save = {
            'images': images_list,
            'last_updated': datetime.now().isoformat(),
            'total_count': len(images_list)
        }

        with open(TARGET_IMAGES_FILE, 'w', encoding='utf-8') as f:
            json.dump(data_to_save, f, ensure_ascii=False, indent=2)

        print(f"💾 נשמרו {len(images_list)} תמונות מטרה")
        return {'success': True}

    except Exception as e:
        error_msg = f"שגיאה בשמירת תמונות מטרה: {e}"
        print(f"💥 {error_msg}")
        return {'success': False, 'error': error_msg}


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
def remove_person(person_id):
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


# *** הפונקציה הישנה - נותרת לתאימות לאחור ***
@app.route('/api/start_check', methods=['POST'])
def start_check():
    """תיקון פונקציית העלאת תמונות/סרטונים (גרסה ישנה - דורסת)"""
    files = request.files.getlist('target_images')

    if not files or all(f.filename == '' for f in files):
        return jsonify({'success': False, 'error': 'לא נשלחו קבצים'}), 400

    uploaded_files = []
    failed_uploads = []

    for file in files:
        if file.filename == '':
            continue

        try:
            # בדיקת סוג הקובץ
            if file.content_type.startswith('image/'):
                resource_type = "image"
            elif file.content_type.startswith('video/'):
                resource_type = "video"
            else:
                failed_uploads.append(f"{file.filename} - סוג קובץ לא נתמך")
                continue

            # העלאה לקלאודינרי
            result = cloudinary.uploader.upload(
                file,
                folder="attendme_targets",
                resource_type=resource_type,
                unique_filename=True,
                overwrite=False
            )

            if result.get('secure_url'):
                uploaded_files.append({
                    'url': result['secure_url'],
                    'public_id': result['public_id'],
                    'filename': file.filename,
                    'type': resource_type
                })
                app.logger.info(f"הועלה בהצלחה: {file.filename}")

        except Exception as e:
            app.logger.error(f"שגיאה בהעלאת {file.filename}: {e}")
            failed_uploads.append(f"{file.filename} - שגיאה בהעלאה")
            continue

    # תגובה
    if not uploaded_files and failed_uploads:
        return jsonify({
            'success': False,
            'error': f'כל ההעלאות נכשלו: {", ".join(failed_uploads)}'
        }), 500

    response_data = {
        'success': True,
        'message': f'הועלו בהצלחה {len(uploaded_files)} קבצים',
        'uploaded_files': uploaded_files,
        'uploaded_count': len(uploaded_files)
    }

    if failed_uploads:
        response_data['warnings'] = failed_uploads
        response_data['message'] += f' (נכשלו {len(failed_uploads)} קבצים)'

    return jsonify(response_data)


# *** פונקציה חדשה - מוסיפה תמונות במקום לדרוס ***
@app.route('/api/append_target_images', methods=['POST'])
def append_target_images():
    """
    מוסיף תמונות חדשות למערך תמונות המטרה הקיימות
    במקום להחליף אותן
    """
    try:
        # בדיקה שיש קבצים
        if 'target_images' not in request.files:
            return jsonify({
                'success': False,
                'error': 'לא נבחרו קבצים להעלאה'
            }), 400

        files = request.files.getlist('target_images')

        if not files or all(f.filename == '' for f in files):
            return jsonify({
                'success': False,
                'error': 'לא נבחרו קבצים תקינים'
            }), 400

        # טעינת תמונות קיימות
        existing_targets = load_target_images()
        app.logger.info(f"📂 נמצאו {len(existing_targets)} תמונות מטרה קיימות")

        uploaded_files = []
        upload_errors = []

        for file in files:
            if file and file.filename:
                try:
                    # בדיקת סוג קובץ
                    filename = secure_filename(file.filename)
                    file_ext = filename.rsplit('.', 1)[1].lower() if '.' in filename else ''

                    allowed_extensions = {'jpg', 'jpeg', 'png', 'gif', 'webp', 'mp4', 'avi', 'mov', 'webm'}
                    if file_ext not in allowed_extensions:
                        upload_errors.append(f"סוג קובץ לא נתמך: {filename}")
                        continue

                    # העלאה ל-Cloudinary
                    app.logger.info(f"📤 מעלה קובץ: {filename}")

                    # בחירת resource_type בהתאם לסוג הקובץ
                    resource_type = 'video' if file_ext in {'mp4', 'avi', 'mov', 'webm'} else 'image'

                    upload_result = cloudinary.uploader.upload(
                        file,
                        folder="attendme_targets",  # תיקייה ייעודית לתמונות מטרה
                        resource_type=resource_type,
                        public_id=f"target_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{len(existing_targets) + len(uploaded_files)}",
                        overwrite=False,  # *** חשוב: לא דורס קבצים קיימים ***
                        unique_filename=True,
                        use_filename=True
                    )

                    # יצירת אובייקט תמונה
                    image_data = {
                        'url': upload_result['secure_url'],
                        'public_id': upload_result['public_id'],
                        'resource_type': upload_result['resource_type'],
                        'format': upload_result['format'],
                        'bytes': upload_result['bytes'],
                        'width': upload_result.get('width', 0),
                        'height': upload_result.get('height', 0),
                        'uploaded_at': datetime.now().isoformat(),
                        'original_filename': filename,
                        'file_type': resource_type
                    }

                    uploaded_files.append(image_data)
                    app.logger.info(f"✅ הועלה בהצלחה: {filename} -> {upload_result['public_id']}")

                except Exception as e:
                    error_msg = f"שגיאה בהעלאת {filename}: {str(e)}"
                    upload_errors.append(error_msg)
                    app.logger.error(f"❌ {error_msg}")
                    continue

        # *** הוספת התמונות החדשות לרשימה הקיימת ***
        all_target_images = existing_targets + uploaded_files

        # שמירת הרשימה המעודכנת
        save_result = save_target_images(all_target_images)

        if not save_result['success']:
            return jsonify({
                'success': False,
                'error': f"שגיאה בשמירת נתונים: {save_result['error']}"
            }), 500

        # הכנת תגובה
        response_data = {
            'success': True,
            'uploaded_count': len(uploaded_files),
            'total_count': len(all_target_images),
            'existing_count': len(existing_targets),
            'uploaded_files': uploaded_files,
            'message': f"הועלו בהצלחה {len(uploaded_files)} תמונות. סה\"כ: {len(all_target_images)} תמונות במערכת"
        }

        # הוספת שגיאות אם היו
        if upload_errors:
            response_data['warnings'] = upload_errors
            response_data['message'] += f" (היו {len(upload_errors)} שגיאות)"

        app.logger.info(f"🎉 הושלמה העלאה: {len(uploaded_files)} חדשות, {len(all_target_images)} סה\"כ")
        return jsonify(response_data), 200

    except Exception as e:
        error_msg = f"שגיאה כללית בהעלאת תמונות: {str(e)}"
        app.logger.error(f"💥 {error_msg}")
        return jsonify({
            'success': False,
            'error': error_msg
        }), 500


# *** שיפור ה-endpoint הקיים לקבלת תמונות ***
@app.route('/api/get_target_images', methods=['GET'])
def get_target_images():
    """
    מחזיר את כל תמונות המטרה (גרסה משופרת)
    """
    try:
        # קודם ננסה לטעון מהקובץ המקומי
        local_images = load_target_images()

        if local_images:
            # מיון לפי תאריך העלאה (החדשות ראשונות)
            sorted_images = sorted(
                local_images,
                key=lambda x: x.get('uploaded_at', ''),
                reverse=True
            )

            # הוספת מטה-דטה
            response_data = {
                'success': True,
                'files': sorted_images,
                'total_count': len(sorted_images),
                'images_count': len([img for img in sorted_images if img.get('resource_type') == 'image']),
                'videos_count': len([img for img in sorted_images if img.get('resource_type') == 'video']),
                'last_updated': max([img.get('uploaded_at', '') for img in sorted_images], default=''),
                'source': 'local_file'
            }

            return jsonify(response_data), 200

        # אם אין קובץ מקומי, ננסה מ-Cloudinary (fallback)
        result = cloudinary.api.resources(
            type="upload",
            prefix="attendme_targets/",
            max_results=100,
            resource_type="auto"
        )

        files = []
        for resource in result.get('resources', []):
            files.append({
                'url': resource['secure_url'],
                'public_id': resource['public_id'],
                'uploaded_at': resource['created_at'],
                'resource_type': resource['resource_type'],
                'format': resource.get('format', ''),
                'bytes': resource.get('bytes', 0),
                'width': resource.get('width', 0),
                'height': resource.get('height', 0)
            })

        # שמירת הנתונים שנמצאו מ-Cloudinary לקובץ מקומי
        if files:
            save_target_images(files)

        response_data = {
            'success': True,
            'files': files,
            'total_count': len(files),
            'images_count': len([f for f in files if f.get('resource_type') == 'image']),
            'videos_count': len([f for f in files if f.get('resource_type') == 'video']),
            'source': 'cloudinary_sync'
        }

        return jsonify(response_data), 200

    except Exception as e:
        error_msg = f"שגיאה בקבלת תמונות: {str(e)}"
        app.logger.error(f"💥 {error_msg}")
        return jsonify({
            'success': False,
            'error': error_msg,
            'files': []
        }), 500


# *** שיפור ה-endpoint למחיקת תמונות ***
@app.route('/api/delete_target_images', methods=['POST'])
def delete_target_images():
    """
    מוחק תמונות נבחרות (גרסה משופרת)
    """
    try:
        data = request.json
        public_ids = data.get('public_ids', [])

        if not public_ids:
            return jsonify({
                'success': False,
                'error': 'לא נבחרו תמונות למחיקה'
            }), 400

        # טעינת תמונות קיימות
        existing_images = load_target_images()

        deleted_count = 0
        deletion_errors = []

        # מחיקה מ-Cloudinary
        for public_id in public_ids:
            try:
                # בדיקה איזה סוג קובץ זה (תמונה או וידאו)
                image_info = next((img for img in existing_images if img['public_id'] == public_id), None)

                if image_info:
                    resource_type = image_info.get('resource_type', 'image')

                    # מחיקה מ-Cloudinary
                    result = cloudinary.uploader.destroy(public_id, resource_type=resource_type)

                    if result.get('result') == 'ok':
                        deleted_count += 1
                        app.logger.info(f"🗑️ נמחק מ-Cloudinary: {public_id}")
                    else:
                        deletion_errors.append(f"כשל במחיקת {public_id} מ-Cloudinary")
                else:
                    # אם לא נמצא בקובץ המקומי, ננסה למחוק בכל זאת
                    result = cloudinary.api.delete_resources([public_id], resource_type="auto")
                    if result.get('deleted', {}).get(public_id) == 'deleted':
                        deleted_count += 1
                        app.logger.info(f"🗑️ נמחק מ-Cloudinary (fallback): {public_id}")
                    else:
                        deletion_errors.append(f"לא נמצא קובץ עם ID: {public_id}")

            except Exception as e:
                deletion_errors.append(f"שגיאה במחיקת {public_id}: {str(e)}")
                app.logger.error(f"❌ שגיאה במחיקת {public_id}: {e}")

        # *** הסרת התמונות הנמחקות מהרשימה המקומית ***
        remaining_images = [
            img for img in existing_images
            if img['public_id'] not in public_ids
        ]

        # שמירת הרשימה המעודכנת
        save_result = save_target_images(remaining_images)

        if not save_result['success']:
            return jsonify({
                'success': False,
                'error': f"שגיאה בעדכון רשימת תמונות: {save_result['error']}"
            }), 500

        response_data = {
            'success': True,
            'deleted_count': deleted_count,
            'remaining_count': len(remaining_images),
            'total_requested': len(public_ids),
            'message': f"נמחקו {deleted_count} תמונות. נותרו {len(remaining_images)} תמונות"
        }

        if deletion_errors:
            response_data['warnings'] = deletion_errors

        app.logger.info(f"🧹 הושלמה מחיקה: {deleted_count} נמחקו, {len(remaining_images)} נותרו")
        return jsonify(response_data), 200

    except Exception as e:
        error_msg = f"שגיאה במחיקת תמונות: {str(e)}"
        app.logger.error(f"💥 {error_msg}")
        return jsonify({
            'success': False,
            'error': error_msg
        }), 500


# *** Endpoint בונוס: סטטיסטיקות על תמונות המטרה ***
@app.route('/api/target_images_stats', methods=['GET'])
def get_target_images_stats():
    """
    מחזיר סטטיסטיקות על תמונות המטרה
    """
    try:
        images = load_target_images()

        total_size = sum(img.get('bytes', 0) for img in images)

        stats = {
            'success': True,
            'total_files': len(images),
            'images_count': len([img for img in images if img.get('resource_type') == 'image']),
            'videos_count': len([img for img in images if img.get('resource_type') == 'video']),
            'total_size_bytes': total_size,
            'total_size_mb': round(total_size / (1024 * 1024), 2),
            'formats': {},
            'upload_dates': []
        }

        # ספירת פורמטים
        for img in images:
            format_type = img.get('format', 'unknown')
            stats['formats'][format_type] = stats['formats'].get(format_type, 0) + 1

        # תאריכי העלאה
        stats['upload_dates'] = [img.get('uploaded_at', '') for img in images]

        return jsonify(stats), 200

    except Exception as e:
        return jsonify({
            'success': False,
            'error': f"שגיאה בקבלת סטטיסטיקות: {str(e)}"
        }), 500


if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5000))
    app.run(debug=False, host='0.0.0.0', port=port)
