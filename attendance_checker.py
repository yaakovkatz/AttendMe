import subprocess
import time
import threading
import queue


class AttendanceChecker:
    def __init__(self):
        self.status = "idle"
        self.progress_message = ""
        self.result = None

    def read_output(self, process, output_queue):
        """קריאת פלט בזמן אמת מהתהליך"""
        while True:
            output = process.stdout.readline()
            if output == '' and process.poll() is not None:
                break
            if output:
                output_queue.put(output.strip())

    def check_person_attendance(self, person_number=1, status_callback=None):
        """
        בדיקת נוכחות לאדם ספציפי לפי מספר ברשימה

        Args:
            person_number (int): מספר האדם ברשימה (1, 2, 3...)
            status_callback (function): פונקציה לעדכון סטטוס (אופציונלי)

        Returns:
            tuple: (success: bool, message: str, person_name: str)
        """
        try:
            self.status = "starting"
            self.progress_message = "מתחיל מערכת זיהוי פנים..."
            if status_callback:
                status_callback(self.status, self.progress_message)

            # הפעלת התהליך
            process = subprocess.Popen(
                ['python', 'main_runner.py'],
                stdin=subprocess.PIPE,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                bufsize=1,
                universal_newlines=True,
                encoding='utf-8',
                errors='ignore'
            )

            # יצירת queue לפלט
            output_queue = queue.Queue()

            # הפעלת thread לקריאת פלט
            output_thread = threading.Thread(target=self.read_output, args=(process, output_queue))
            output_thread.daemon = True
            output_thread.start()

            time.sleep(5)  # המתנה ארוכה יותר לטעינת המערכת

            self.status = "loading_people"
            self.progress_message = "טוען רשימת אנשים..."
            if status_callback:
                status_callback(self.status, self.progress_message)

            # רצף הפקודות
            commands = [
                ("1", "ניהול נתונים"),
                ("4", "טעינת אנשים קיימים"),
                ("5", "חזרה לתפריט ראשי"),
                ("2", "בדיקת נוכחות"),
                ("2", "אדם ספציפי"),
                ("1", "בחירה מרשימה"),
                (str(person_number), f"בחירת אדם מספר {person_number}")
            ]

            all_output = []

            # שליחת פקודות - תיקון הכפילות!
            for i, (command, description) in enumerate(commands):
                print(f"🟡 DEBUG: שולח פקודה {i + 1}/{len(commands)}: '{command}' - {description}")

                if process.poll() is not None:
                    print(f"🟡 DEBUG: התהליך נסגר לפני השלמת כל הפקודות! Return code: {process.poll()}")
                    break

                # שליחה פעם אחת בלבד!
                process.stdin.write(f"{command}\n")
                process.stdin.flush()
                print(f"🟡 DEBUG: פקודה נשלחה: {command}")

                # קריאת פלט עם זמן ארוך יותר
                start_time = time.time()
                while time.time() - start_time < 5:  # 5 שניות במקום 3
                    try:
                        line = output_queue.get_nowait()
                        all_output.append(line)
                        print(f"🔵 DEBUG: קיבלתי פלט: {line}")
                    except queue.Empty:
                        time.sleep(0.1)

                time.sleep(4)  # המתנה ארוכה יותר בין פקודות

            self.status = "processing"
            self.progress_message = "מבצע זיהוי פנים..."
            if status_callback:
                status_callback(self.status, self.progress_message)

            # מעקב אחרי התהליך
            start_time = time.time()
            max_wait_time = 3600  # 60 דקות
            last_update = time.time()

            while True:
                # בדיקה אם התהליך הסתיים
                if process.poll() is not None:
                    break

                # בדיקה אם חלף זמן המתנה מקסימלי
                if time.time() - start_time > max_wait_time:
                    process.kill()
                    self.status = "timeout"
                    self.progress_message = "פג זמן ההמתנה"
                    if status_callback:
                        status_callback(self.status, self.progress_message)
                    return False, "פג זמן ההמתנה", ""

                # קריאת פלט חדש
                try:
                    line = output_queue.get_nowait()
                    all_output.append(line)
                    if any(keyword in line for keyword in ["נמצאה התאמה", "בדיקה הושלמה", "שגיאה", "התחיל", "הושלם"]):
                        print(f"🔵 DEBUG: {line}")

                    # זיהוי שלבי עיבוד
                    if "מאתחל מערכת זיהוי פנים" in line:
                        print("🎯 DEBUG: זיהוי פנים התחיל!")
                    elif "חילוץ פנים מתיקייה" in line and "הושלם" in line:
                        print("🎯 DEBUG: חילוץ פנים הושלם!")
                    elif "בודק התאמה מול" in line:
                        print("🎯 DEBUG: השוואה התחילה!")

                    # בדיקה אם זה התוצאה הסופית
                    if "is present!" in line:
                        person_name = line.replace(" is present!", "").strip()
                        self.status = "completed"
                        self.progress_message = f"זיהוי הושלם - {person_name} נוכח"
                        if status_callback:
                            status_callback(self.status, self.progress_message)
                        time.sleep(5)  # המתנה לסיום התהליך
                        break

                except queue.Empty:
                    # עדכון סטטוס כל 30 שניות
                    if time.time() - last_update > 30:
                        elapsed_minutes = int((time.time() - start_time) / 60)
                        self.progress_message = f"מעבד זיהוי פנים... ({elapsed_minutes} דקות)"
                        print(f"🔴 DEBUG: עדכון סטטוס: {self.status} - {self.progress_message}")
                        if status_callback:
                            status_callback(self.status, self.progress_message)
                        last_update = time.time()

                    time.sleep(0.5)

            # קריאת שארית הפלט
            try:
                while True:
                    line = output_queue.get_nowait()
                    all_output.append(line)
            except queue.Empty:
                pass

            # ניתוח התוצאות
            full_output = "\n".join(all_output)

            if "is present!" in full_output:
                # מציאת השורה עם התוצאה
                for line in all_output:
                    if "is present!" in line:
                        person_name = line.replace(" is present!", "").strip()
                        self.status = "success"
                        self.result = f"{person_name} נוכח"
                        return True, f"{person_name} נוכח", person_name

                return True, "נמצאה התאמה", "לא ידוע"
            else:
                self.status = "not_found"
                self.result = "לא נמצאה התאמה"
                return False, "לא נמצאה התאמה", ""

        except Exception as e:
            self.status = "error"
            self.progress_message = f"שגיאה: {str(e)}"
            if status_callback:
                status_callback(self.status, self.progress_message)
            return False, f"שגיאה: {str(e)}", ""

    def get_status(self):
        """החזרת סטטוס נוכחי"""
        return {
            "status": self.status,
            "message": self.progress_message,
            "result": self.result
        }


# פונקציה פשוטה לשימוש מהאתר
def check_attendance_simple(person_number=1):
    """
    פונקציה פשוטה לבדיקת נוכחות

    Args:
        person_number (int): מספר האדם ברשימה

    Returns:
        dict: {"success": bool, "message": str, "person_name": str}
    """
    checker = AttendanceChecker()
    success, message, person_name = checker.check_person_attendance(person_number)

    return {
        "success": success,
        "message": message,
        "person_name": person_name,
        "status": checker.status
    }


def read_output_simple(process, output_queue):
    """פונקציה פשוטה לקריאת פלט"""
    while True:
        output = process.stdout.readline()
        if output == '' and process.poll() is not None:
            break
        if output:
            output_queue.put(output.strip())


def load_people_only():
    """
    טעינת רשימת אנשים בלבד ללא זיהוי

    Returns:
        dict: {"success": bool, "people": list, "message": str}
    """
    try:
        print("🔄 מתחיל טעינת רשימת אנשים...")

        # הפעלת התהליך
        process = subprocess.Popen(
            ['python', 'main_runner.py'],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            bufsize=1,
            universal_newlines=True,
            encoding='utf-8',
            errors='ignore'
        )

        # יצירת queue לפלט
        output_queue = queue.Queue()

        # הפעלת thread לקריאת פלט
        output_thread = threading.Thread(
            target=lambda: read_output_simple(process, output_queue)
        )
        output_thread.daemon = True
        output_thread.start()

        time.sleep(3)  # המתנה לטעינת המערכת

        # רק פקודות הטעינה
        commands = [
            ("1", "ניהול נתונים"),
            ("4", "טעינת אנשים קיימים"),
            ("5", "חזרה לתפריט ראשי"),
            ("3", "יציאה")  # יציאה מהתוכנית
        ]

        all_output = []

        # שליחת פקודות הטעינה בלבד
        for i, (command, description) in enumerate(commands):
            print(f"📤 שולח פקודה: {command} - {description}")

            if process.poll() is not None:
                print(f"❌ התהליך נסגר מוקדם")
                break

            process.stdin.write(f"{command}\n")
            process.stdin.flush()

            # קריאת פלט מיד אחרי כל פקודה
            start_time = time.time()
            while time.time() - start_time < 5:  # זמן ארוך יותר
                try:
                    line = output_queue.get_nowait()
                    all_output.append(line)
                    print(f"📥 {line}")
                except queue.Empty:
                    time.sleep(0.1)

            time.sleep(3)  # המתנה ארוכה יותר בין פקודות


        # המתנה לסיום התהליך
        try:
            process.wait(timeout=10)
        except:
            process.kill()

        # ניתוח הפלט לחילוץ רשימת אנשים
        people_list = []
        for line in all_output:
            if "נטען בהצלחה:" in line:
                # חילוץ פרטי האדם מהשורה
                parts = line.replace("נטען בהצלחה:", "").strip().split()
                if len(parts) >= 3:
                    first_name = parts[0]
                    last_name = parts[1]
                    id_number = parts[2]
                    people_list.append({
                        "first_name": first_name,
                        "last_name": last_name,
                        "id_number": id_number,
                        "full_name": f"{first_name} {last_name}"
                    })

        print(f"✅ נטענו {len(people_list)} אנשים בהצלחה")

        return {
            "success": True,
            "people": people_list,
            "message": f"נטענו {len(people_list)} אנשים בהצלחה"
        }

    except Exception as e:
        print(f"❌ שגיאה בטעינת אנשים: {str(e)}")
        return {
            "success": False,
            "people": [],
            "message": f"שגיאה: {str(e)}"
        }


def load_people_for_website():
    """פונקציה לטעינת אנשים מהאתר"""
    result = load_people_only()
    return result

# בדיקה אם הקובץ מופעל ישירות
if __name__ == "__main__":
    print("בודק נוכחות לאדם ראשון...")
    result = check_attendance_simple(1)
    print(f"תוצאה: {result}")