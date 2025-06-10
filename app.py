# ================= IMPORTS ==================
from flask import Flask, render_template, request, jsonify, send_from_directory, redirect
import os
import json
from werkzeug.utils import secure_filename
import time
from datetime import datetime
import logging
import threading

# ייבוא חדש עבור Cloudinary
import cloudinary
import cloudinary.uploader
import cloudinary.api

# ================= CLOUDINARY CONFIGURATION ==================
# הגדרת החיבור לקלאודינרי באמצעות משתני הסביבה שהגדרנו ב-Render
cloudinary.config(
    cloud_name=os.environ.get('CLOUDINARY_CLOUD_NAME'),
    api_key=os.environ.get('CLOUDINARY_API_KEY'),
    api_secret=os.environ.get('CLOUDINARY_API_SECRET'),
    secure=True
)
# =============================================================

# --- הוסף את קוד האבחון כאן ---
print("--- CLOUDINARY DEBUG ---")
print(f"Cloud Name from ENV: '{os.environ.get('CLOUDINARY_CLOUD_NAME')}'")
print(f"API Key from ENV is set: {os.environ.get('CLOUDINARY_API_KEY') is not None}")
print("------------------------")
# --- סוף קוד אבחון ---




# משתנים גלובליים לשמירת רשימת האנשים
loaded_people = []
people_loading_status = {"status": "not_started", "message": ""}

# הגדר את התיקיות החדשות לפלאסק
app = Flask(__name__,
            template_folder='web_templates',
            static_folder='web_static')

# הגדרת לוגים
logging.basicConfig(level=logging.INFO)
app.logger.setLevel(logging.INFO)

# התיקייה הזו עדיין נחוצה כדי לקרוא את התמונות הישנות שכבר קיימות
TRAINING_FACES_FOLDER = 'training_faces'
os.makedirs(TRAINING_FACES_FOLDER, exist_ok=True)

# אתחול משתנים גלובליים
people_list = []
attendance_status = {"is_running": False, "status": "idle", "message": "", "result": None}
current_checker = None


# --- כל ה-routes שלך נשארים אותו דבר עד לפונקציות שקשורות לקבצים ---

@app.route('/')
def index():
    return render_template('index.html')


@app.route('/api/status', methods=['GET'])
def system_status():
    return jsonify({'status': 'active', 'people_count': len(people_list), 'camera_active': False})


@app.route('/api/people', methods=['GET'])
def get_people():
    return jsonify(people_list)


@app.route('/api/add_person', methods=['POST'])
def add_person():
    data = request.json
    if not all(key in data for key in ['first_name', 'last_name', 'id_number']):
        return jsonify({'success': False, 'error': 'חסרים פרטים'}), 400
    if any(person['id'] == data['id_number'] for person in people_list):
        return jsonify({'success': False, 'error': 'אדם עם מספר זהות זה כבר קיים במערכת'}), 400

    new_person = {
        'id': data['id_number'],
        'first_name': data['first_name'],
        'last_name': data['last_name'],
        'is_present': False,
        'has_image': False,
        'image_count': 0,
        # הוספנו שדות חדשים לניהול תמונות מהענן
        'image_urls': []
    }
    people_list.append(new_person)
    return jsonify({'success': True, 'message': f"נוצר בהצלחה: {data['first_name']} {data['last_name']}",
                    'person_id': data['id_number']})


@app.route('/api/remove_person/<person_id>', methods=['DELETE'])
def remove_person(person_id):
    """מחיקת אדם מהמערכת (כולל תמונות מקומיות ומהענן)"""
    try:
        person = next((p for p in people_list if p['id'] == person_id), None)
        if not person:
            return jsonify({'success': False, 'error': 'אדם לא נמצא'}), 404

        # === שינוי: מחיקת תמונות מהענן ===
        if person.get('image_urls'):
            # מחיקת כל התמונות של האדם מהענן
            # כדי למחוק, אנחנו צריכים את ה-public_id של כל תמונה
            public_ids_to_delete = []
            for url in person['image_urls']:
                try:
                    # استخراج public_id מתוך ה-URL
                    public_id = '/'.join(url.split('/')[-4:]).split('.')[0]
                    public_ids_to_delete.append(public_id)
                except Exception as e:
                    app.logger.error(f"Could not parse public_id from URL {url}: {e}")

            if public_ids_to_delete:
                app.logger.info(f"Deleting from Cloudinary: {public_ids_to_delete}")
                cloudinary.api.delete_resources(public_ids_to_delete, resource_type="image")

        # === קוד ישן למחיקת תמונות מקומיות (נשאר ליתר ביטחון) ===
        folder_name = person.get('folder_name',
                                 secure_filename(f"{person['first_name']}_{person['last_name']}_{person['id']}"))
        person_folder = os.path.join(TRAINING_FACES_FOLDER, folder_name)
        if os.path.exists(person_folder):
            import shutil
            shutil.rmtree(person_folder)
            app.logger.info(f"Deleted local folder: {person_folder}")

        people_list.remove(person)
        return jsonify({'success': True, 'message': f"{person['first_name']} {person['last_name']} נמחק בהצלחה"})
    except Exception as e:
        app.logger.error(f"Error deleting person: {e}")
        return jsonify({'success': False, 'error': f'שגיאה במחיקת אדם: {str(e)}'}), 500


@app.route('/api/upload_image/<person_id>', methods=['POST'])
def upload_image(person_id):
    """העלאת תמונה לאדם (ישירות לענן)"""
    try:
        person = next((p for p in people_list if p['id'] == person_id), None)
        if not person:
            return jsonify({'success': False, 'error': 'אדם לא נמצא'}), 404

        if len(person.get('image_urls', [])) >= 5:
            return jsonify({'success': False, 'error': 'הגעת למקסימום התמונות המותר (5)'}), 400

        if 'image' not in request.files or request.files['image'].filename == '':
            return jsonify({'success': False, 'error': 'לא נבחר קובץ'}), 400

        file_to_upload = request.files['image']

        # === שינוי: העלאה ל-Cloudinary במקום שמירה מקומית ===
        # יצירת מזהה ייחודי לתמונה בענן
        folder_name = secure_filename(f"{person['first_name']}_{person['last_name']}_{person['id']}")
        public_id = f"attendme_faces/{folder_name}/{int(time.time())}"

        app.logger.info(f"Uploading to Cloudinary with public_id: {public_id}")
        upload_result = cloudinary.uploader.upload(file_to_upload, public_id=public_id)

        image_url = upload_result.get('secure_url')
        if not image_url:
            return jsonify({'success': False, 'error': 'שגיאה בהעלאה לענן'}), 500

        # הוספת ה-URL החדש לרשימת התמונות של האדם
        if 'image_urls' not in person:
            person['image_urls'] = []
        person['image_urls'].append(image_url)

        person['image_count'] = len(person['image_urls'])
        person['has_image'] = True

        remaining = max(0, 3 - person['image_count'])
        message = f"התמונה הועלתה בהצלחה. נדרשות עוד {remaining} תמונות." if remaining > 0 else "התמונה הועלתה בהצלחה."

        return jsonify({
            'success': True, 'message': message, 'image_count': person['image_count'],
            'images_required': remaining > 0, 'remaining': remaining,
            'can_add_more': person['image_count'] < 5
        })

    except Exception as e:
        app.logger.error(f"Error uploading image: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'error': f'שגיאה בשרת: {str(e)}'}), 500


@app.route('/api/person_image/<person_id>')
def get_person_image(person_id):
    """קבלת התמונה הראשית של אדם (מהענן או מקומית)"""
    try:
        person = next((p for p in people_list if p['id'] == person_id), None)
        if not person:
            # אם האדם לא נמצא ברשימה הדינמית, נחפש בתיקיות המקומיות
            return send_from_directory(os.path.join(app.static_folder, 'img'), 'person-placeholder.jpg')

        # === שינוי: קודם כל לבדוק אם יש תמונה בענן ===
        if person.get('image_urls'):
            # אם יש, הפנה ישירות לכתובת ה-URL של התמונה הראשונה
            return redirect(person['image_urls'][0])

        # === קוד ישן כגיבוי: אם אין תמונה בענן, חפש תמונה מקומית ===
        folder_name = person.get('folder_name',
                                 secure_filename(f"{person['first_name']}_{person['last_name']}_{person['id']}"))
        person_folder = os.path.join(TRAINING_FACES_FOLDER, folder_name)
        if os.path.exists(os.path.join(person_folder, "1.jpg")):
            return send_from_directory(person_folder, "1.jpg")

        old_format_path = os.path.join(TRAINING_FACES_FOLDER, f"{person_id}_1.jpg")
        if os.path.exists(old_format_path):
            return send_from_directory(TRAINING_FACES_FOLDER, f"{person_id}_1.jpg")

        # אם לא נמצאה שום תמונה, החזר תמונת ברירת מחדל
        return send_from_directory(os.path.join(app.static_folder, 'img'), 'person-placeholder.jpg')

    except Exception as e:
        app.logger.error(f"Error getting person image: {e}")
        return send_from_directory(os.path.join(app.static_folder, 'img'), 'person-placeholder.jpg')


# --- שאר ה-routes שלך יכולים להישאר כמעט ללא שינוי ---
# ... (העתק את שאר הפונקציות שלך החל מ-get_specific_person_image ועד הסוף) ...
# שים לב: הפונקציה get_specific_person_image תצטרך שינוי דומה ל-get_person_image
# כדי לתמוך גם בתמונות מהענן.

# דוגמה איך לעדכן את get_specific_person_image:
@app.route('/api/person_image/<person_id>/<image_number>')
def get_specific_person_image(person_id, image_number):
    try:
        person = next((p for p in people_list if p['id'] == person_id), None)
        if not person:
            return send_from_directory(os.path.join(app.static_folder, 'img'), 'person-placeholder.jpg')

        image_idx = int(image_number) - 1  # המערך מתחיל מ-0

        # בדוק אם יש תמונה בענן באינדקס המבוקש
        if person.get('image_urls') and len(person['image_urls']) > image_idx:
            return redirect(person['image_urls'][image_idx])

        # קוד גיבוי לתמונות ישנות
        folder_name = person.get('folder_name',
                                 secure_filename(f"{person['first_name']}_{person['last_name']}_{person['id']}"))
        person_folder = os.path.join(TRAINING_FACES_FOLDER, folder_name)
        if os.path.exists(os.path.join(person_folder, f"{image_number}.jpg")):
            return send_from_directory(person_folder, f"{image_number}.jpg")

        return send_from_directory(os.path.join(app.static_folder, 'img'), 'person-placeholder.jpg')
    except (ValueError, IndexError):
        return send_from_directory(os.path.join(app.static_folder, 'img'), 'person-placeholder.jpg')
    except Exception as e:
        app.logger.error(f"Error getting specific image: {e}")
        return send_from_directory(os.path.join(app.static_folder, 'img'), 'person-placeholder.jpg')


# ... המשך להעתיק את שאר הקוד המקורי שלך ...
# (הפונקציות toggle_presence, start_camera, וכו' לא צריכות שינוי)

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
def attendance_status_old():
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


@app.route('/api/check_attendance_person', methods=['POST'])
def check_attendance_person():
    """בדיקת נוכחות לאדם ספציפי לפי מספר"""
    global attendance_status, current_checker

    try:
        data = request.json
        person_number = data.get('person_number', 1)

        print(f"🔴 DEBUG: התקבלה בקשה לבדיקת נוכחות לאדם מספר: {person_number}")
        print(f"🔴 DEBUG: attendance_status נוכחי: {attendance_status}")

        # בדיקה אם כבר רצה בדיקה
        # אפס בכוח את הסטטוס
        attendance_status["is_running"] = False
        print("🔴 DEBUG: אפסתי סטטוס ומתחיל בדיקה חדשה")

        # התחלת בדיקה ברקע
        attendance_status["is_running"] = True
        attendance_status["status"] = "starting"
        attendance_status["message"] = "מתחיל בדיקה..."
        attendance_status["result"] = None
        attendance_status["start_time"] = datetime.now().strftime("%H:%M:%S")

        print("🔴 DEBUG: מתחיל בדיקת נוכחות ברקע...")

        # הפעלת הבדיקה ברקע עם עדכוני סטטוס
        def run_attendance_check():
            global attendance_status, current_checker
            try:
                print(f"🔴 DEBUG: מפעיל AttendanceChecker עם person_number={person_number}")

                # בדיקה אם הקובץ attendance_checker קיים
                import os
                if not os.path.exists('attendance_checker.py'):
                    print("🔴 DEBUG: הקובץ attendance_checker.py לא קיים!")
                    raise Exception("הקובץ attendance_checker.py לא קיים")

                print("🔴 DEBUG: נמצא קובץ attendance_checker.py")

                # ניסיון לייבא את AttendanceChecker
                try:
                    from attendance_checker import AttendanceChecker
                    print("🔴 DEBUG: AttendanceChecker יובא בהצלחה")
                except ImportError as e:
                    print(f"🔴 DEBUG: שגיאה בייבוא AttendanceChecker: {e}")
                    raise e

                # יצירת checker instance
                current_checker = AttendanceChecker()
                print("🔴 DEBUG: נוצר AttendanceChecker instance")

                # פונקציית callback לעדכון סטטוס
                def status_callback(status, message):
                    attendance_status["status"] = status
                    attendance_status["message"] = message
                    print(f"🔴 DEBUG: עדכון סטטוס: {status} - {message}")

                print("🔴 DEBUG: קורא לcheck_person_attendance...")
                # הפעלת הבדיקה
                success, message, person_name = current_checker.check_person_attendance(
                    person_number=person_number,
                    status_callback=status_callback
                )

                print(f"🔴 DEBUG: בדיקה הושלמה. success={success}, message={message}, person_name={person_name}")

                attendance_status["is_running"] = False

                if success:
                    attendance_status["status"] = "completed"
                    attendance_status["message"] = message
                    attendance_status["result"] = {
                        "success": True,
                        "message": message,
                        "person_name": person_name
                    }
                else:
                    attendance_status["status"] = "not_found"
                    attendance_status["message"] = message
                    attendance_status["result"] = {
                        "success": False,
                        "message": message
                    }

                print("🔴 DEBUG: בדיקת נוכחות הושלמה")

            except Exception as e:
                print(f"🔴 DEBUG: שגיאה בבדיקת נוכחות: {str(e)}")
                import traceback
                print(f"🔴 DEBUG: traceback: {traceback.format_exc()}")

                attendance_status["is_running"] = False
                attendance_status["status"] = "error"
                attendance_status["message"] = f"שגיאה בבדיקה: {str(e)}"
                attendance_status["result"] = {
                    "success": False,
                    "message": f"שגיאה: {str(e)}"
                }

        # הפעלת הthread
        thread = threading.Thread(target=run_attendance_check)
        thread.daemon = True
        thread.start()

        print("🔴 DEBUG: Thread נוצר ופועל ברקע")

        return jsonify({
            'success': True,
            'message': 'בדיקה החלה ברקע - זה יכול לקחת עד 40 דקות',
            'person_number': person_number,
            'start_time': attendance_status.get("start_time", "")
        })

    except Exception as e:
        print(f"🔴 DEBUG: שגיאה כללית: {str(e)}")
        attendance_status["is_running"] = False
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/attendance_check_status', methods=['GET'])
def get_attendance_check_status():
    """קבלת סטטוס בדיקת הנוכחות"""
    global attendance_status, current_checker

    # אם יש checker פעיל, נוכל לקבל סטטוס מפורט יותר
    if current_checker and attendance_status["is_running"]:
        try:
            checker_status = current_checker.get_status()
            if checker_status:
                attendance_status["status"] = checker_status.get("status", attendance_status["status"])
                attendance_status["message"] = checker_status.get("message", attendance_status["message"])
        except:
            pass

    # הוספת זמן שחלף
    response_data = {
        'is_running': attendance_status["is_running"],
        'status': attendance_status["status"],
        'message': attendance_status["message"],
        'result': attendance_status["result"]
    }

    # הוספת זמן שחלף אם הבדיקה רצה
    if attendance_status.get("start_time") and attendance_status["is_running"]:
        start_time_str = attendance_status["start_time"]
        try:
            start_time = datetime.strptime(start_time_str, "%H:%M:%S").time()
            current_time = datetime.now().time()

            start_seconds = start_time.hour * 3600 + start_time.minute * 60 + start_time.second
            current_seconds = current_time.hour * 3600 + current_time.minute * 60 + current_time.second
            elapsed_seconds = current_seconds - start_seconds

            if elapsed_seconds < 0:
                elapsed_seconds += 24 * 3600

            elapsed_minutes = elapsed_seconds // 60
            response_data["elapsed_time"] = f"{elapsed_minutes} דקות"

        except:
            pass

    return jsonify(response_data)


@app.route('/api/cancel_attendance_check', methods=['POST'])
def cancel_attendance_check():
    """ביטול בדיקת נוכחות"""
    global attendance_status, current_checker

    print("מבטל בדיקת נוכחות...")

    attendance_status["is_running"] = False
    attendance_status["status"] = "cancelled"
    attendance_status["message"] = "הבדיקה בוטלה על ידי המשתמש"
    attendance_status["result"] = None
    current_checker = None

    return jsonify({
        'success': True,
        'message': 'בדיקה בוטלה'
    })


@app.route('/api/run_advanced_function', methods=['POST'])
def run_advanced_function():
    """
    data = request.json
    command = data.get('command')
    params = data.get('params', {})

    try:
        # לכידת הפלט הסטנדרטי
        import io
        import sys
        old_stdout = sys.stdout
        new_stdout = io.StringIO()
        sys.stdout = new_stdout

        result = {"success": True}

        # הפעלת הפקודה המבוקשת
        if command == 'load_people':  # תנאי חדש לטיפול בפקודה החדשה
            # טעינת רשימת האנשים מתיקיית training_faces
            from main_runner import get_registered_people
            training_path = "./training_faces"

            print(f"טוען אנשים מהתיקייה: {training_path}")
            registered_people = get_registered_people(training_path)

            if not registered_people:
                print("לא נמצאו אנשים בתיקייה")
            else:
                print(f"נמצאו {len(registered_people)} אנשים:")
                for i, person in enumerate(registered_people, 1):
                    name_parts = person.split('_')
                    if len(name_parts) >= 3:
                        first_name, last_name, id_number = name_parts[0], name_parts[1], name_parts[2]
                        print(f"{i}. {first_name} {last_name} (ת.ז. {id_number})")

            # המרת הנתונים לפורמט המתאים לאתר
            people_data = []
            for person_id in registered_people:
                name_parts = person_id.split('_')
                if len(name_parts) >= 3:
                    first_name, last_name, id_number = name_parts[0], name_parts[1], name_parts[2]

                    # בדיקה כמה תמונות יש לאדם
                    person_folder = os.path.join(training_path, person_id)
                    image_count = 0

                    if os.path.exists(person_folder) and os.path.isdir(person_folder):
                        image_files = [f for f in os.listdir(person_folder) if
                                       f.lower().endswith(('.jpg', '.jpeg', '.png'))]
                        image_count = len(image_files)
                    else:
                        # בדיקה של מבנה ישן
                        old_format_images = [f for f in os.listdir(training_path) if
                                             f.startswith(f"{id_number}_") and f.lower().endswith(
                                                 ('.jpg', '.jpeg', '.png'))]
                        image_count = len(old_format_images)

                    people_data.append({
                        'id': id_number,
                        'first_name': first_name,
                        'last_name': last_name,
                        'is_present': False,
                        'has_image': image_count > 0,
                        'image_count': max(1, image_count)  # לפחות תמונה אחת אם יש תמונות
                    })

            # עדכון רשימת האנשים הגלובלית
            global people_list
            people_list = people_data
            print(f"\nנטענו {len(people_data)} אנשים למערכת")

        elif command == 'check_all_people':
            # בדיקת נוכחות לכל האנשים
            from Data_Manage import check_presence

            print("בודק נוכחות לכל האנשים במערכת...")
            results = check_presence(check_all=True)

            # עדכון סטטוס הנוכחות של כל האנשים לפי התוצאות
            # אם check_presence מחזירה מילון עם מזהים ומצב נוכחות
            if isinstance(results, dict):
                for person_id, is_present in results.items():
                    # מציאת האדם ברשימה לפי ת.ז.
                    person = next((p for p in people_list if p['id'] == person_id), None)
                    if person:
                        person['is_present'] = bool(is_present)
                        print(f"{person['first_name']} {person['last_name']}: {'נוכח' if is_present else 'לא נוכח'}")

            print("בדיקת נוכחות הושלמה")

        elif command == 'check_specific_person':
            # קבלת פרטי האדם הספציפי מהפרמטרים
            person_id = params.get('person_id')

            if not person_id:
                print("שגיאה: לא צוין מזהה אדם")
                result["success"] = False
                result["error"] = "לא צוין מזהה אדם"
            else:
                print(f"בודק נוכחות עבור: {person_id}")

                # קריאה לפונקציה האמיתית
                from Data_Manage import check_presence

                # פיצול המזהה לחלקים (שם פרטי, שם משפחה, ת.ז.)
                # פורמט צפוי: "שם_פרטי שם_משפחה מספר_ת.ז."
                parts = person_id.split()
                if len(parts) >= 3:
                    # הרצת בדיקת הנוכחות
                    result_present = check_presence(check_all=False, specific_person=person_id)

                    # עדכון סטטוס הנוכחות של האדם ברשימה
                    person_tz = parts[-1]  # החלק האחרון מכיל את מספר ת.ז.

                    # מציאת האדם ברשימה
                    person = next((p for p in people_list if p['id'] == person_tz), None)
                    if person:
                        # עדכון סטטוס הנוכחות לפי התוצאה
                        # נניח שהפונקציה מחזירה True אם האדם נוכח
                        person['is_present'] = bool(result_present)

                        print(f"סטטוס נוכחות עודכן: {'נוכח' if person['is_present'] else 'לא נוכח'}")
                    else:
                        print(f"אדם עם ת.ז. {person_tz} לא נמצא ברשימה")
                else:
                    print(f"פורמט מזהה לא תקין: {person_id}")

        elif command == 'manage_data':
            # קוד קיים שהיה כבר בפונקציה - אפשר להשאיר אם רוצים תאימות לאחור
            pass
        else:
            sys.stdout = old_stdout
            return jsonify({"success": False, "error": "פקודה לא מוכרת"}), 400

        # שחזור הפלט הסטנדרטי וקבלת התוצאה
        output = new_stdout.getvalue()
        sys.stdout = old_stdout

        # הוספת הפלט לתוצאה
        result["output"] = output

        # תמיד להחזיר את רשימת האנשים המעודכנת
        result["people"] = people_list

        return jsonify(result)

    except Exception as e:
        import traceback
        if 'old_stdout' in locals() and 'sys' in locals():
            sys.stdout = old_stdout
        return jsonify({
            "success": False,
            "error": str(e),
            "traceback": traceback.format_exc()
        }), 500
    """  # כאן מסתיימת ההערה

    # השאר רק את השורה הזו כדי שהפונקציה תחזיר תשובה מסודרת
    return jsonify({"success": False, "error": "Advanced functions are currently disabled."}), 404



def background_load_people():
    """טעינת אנשים ברקע בהתחלה"""
    global loaded_people, people_loading_status

    # שינוי: לא מריצים את זה יותר כאן, זה יטען מה-API
    # המטרה היא שהרשימה תהיה ריקה בהתחלה עד שהמשתמש יטען אותה
    people_loading_status["status"] = "completed"
    people_loading_status["message"] = "המערכת מוכנה. לחץ על 'טען רשימת אנשים' כדי להתחיל."
    return

    # try:
    #     people_loading_status["status"] = "loading"
    #     people_loading_status["message"] = "טוען רשימת אנשים..."
    #     print("🔄 מתחיל טעינת רשימת אנשים...".encode('utf-8', errors='ignore').decode('utf-8', errors='ignore'))

    #     # שינוי: נניח ש-load_people_for_website כבר לא רלוונטי
    #     # התנהגות ברירת מחדל תהיה רשימה ריקה
    #     loaded_people = [] # מתחילים עם רשימה ריקה
    #     people_loading_status["status"] = "completed"
    #     people_loading_status["message"] = f"נטענו {len(loaded_people)} אנשים. לחץ על 'טען רשימת אנשים' כדי לסנכרן מתיקיית התמונות."
    #     print(f"✅ טעינה ברקע הושלמה עם 0 אנשים.")

    # except Exception as e:
    #     people_loading_status["status"] = "error"
    #     people_loading_status["message"] = f"שגיאה: {str(e)}"
    #     print(f"❌ שגיאה קריטית בטעינת אנשים ברקע: {e}")


@app.route('/api/get_loaded_people', methods=['GET'])
def get_loaded_people():
    """החזרת רשימת האנשים שנטענה"""
    global loaded_people, people_loading_status

    return jsonify({
        "success": people_loading_status["status"] == "completed",
        "status": people_loading_status["status"],
        "message": people_loading_status["message"],
        "people": loaded_people,
        "total": len(loaded_people)
    })


# הפעלת טעינה ברקע כשהשרת עולה
print("🚀 מתחיל טעינת אנשים ברקע בהפעלת השרת...")
threading.Thread(target=background_load_people, daemon=True).start()

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5000))
    app.run(debug=False, host='0.0.0.0', port=port)