import subprocess
import time
import threading
import queue
import os
import signal


class AttendanceDebugFocused:
    def __init__(self):
        self.status = "idle"
        self.progress_message = ""
        self.result = None
        self.process = None
        self.all_output = []
        self.last_output_time = time.time()

    def read_output(self, process, output_queue):
        """קריאת פלט בזמן אמת ללא הדפסה"""
        while True:
            try:
                output = process.stdout.readline()
                if output == '' and process.poll() is not None:
                    break
                if output:
                    line = output.strip()
                    output_queue.put(line)  # רק line, בלי timestamp
                    self.last_output_time = time.time()
            except Exception as e:
                break

    def check_person_attendance_debug_focused(self, person_number=1, status_callback=None):
        try:
            print(f"\n🚀 === התחלת בדיקת נוכחות לאדם מספר {person_number} ===")

            self.status = "starting"
            self.progress_message = "מתחיל מערכת זיהוי פנים..."
            if status_callback:
                status_callback(self.status, self.progress_message)

            # הפעלת התהליך עם פלט מיידי
            print("🔵 מפעיל main_runner.py...")
            self.process = subprocess.Popen(
                ['python', 'main_runner.py'],
                stdin=subprocess.PIPE,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                bufsize=0,  # ללא buffer כלל
                universal_newlines=True,
                encoding='utf-8',
                errors='ignore'
            )

            print(f"🔵 תהליך הופעל, PID: {self.process.pid}")

            # queue לפלט
            output_queue = queue.Queue()

            # thread לקריאת פלט
            output_thread = threading.Thread(target=self.read_output, args=(self.process, output_queue))
            output_thread.daemon = True
            output_thread.start()

            # המתנה ראשונית
            print("⏳ ממתין לטעינת המערכת...")
            time.sleep(3)

            # בדיקה אם התהליך עדיין חי
            if self.process.poll() is not None:
                print(f"❌ התהליך מת מוקדם! Return code: {self.process.poll()}")
                return False, "התהליך נכשל בהפעלה", ""

            # קריאת פלט ראשוני
            print("🔍 מחפש פלט ראשוני...")
            initial_wait = 5
            start_wait = time.time()

            while time.time() - start_wait < initial_wait:
                try:
                    line = output_queue.get_nowait()
                    self.all_output.append(line)

                    # בדיקה אם זה התפריט הראשי
                    if "מערכת זיהוי פנים" in line:
                        print("✅ זוהה התפריט הראשי!")
                    elif "בחר אפשרות" in line:
                        print("✅ המערכת מוכנה לקבלת פקודות!")
                        break
                except queue.Empty:
                    time.sleep(0.1)

            print(f"📊 קיבלתי {len(self.all_output)} שורות פלט ראשוני")

            self.status = "sending_commands"
            self.progress_message = "שולח פקודות למערכת..."
            if status_callback:
                status_callback(self.status, self.progress_message)

            # רצף הפקודות עם זמנים מדוייקים
            commands = [
                ("1", "ניהול נתונים", 2),
                ("4", "טעינת אנשים קיימים", 3),
                ("5", "חזרה לתפריט ראשי", 2),
                ("2", "בדיקת נוכחות", 2),
                ("2", "אדם ספציפי", 2),
                ("1", "בחירה מרשימה", 3),
                (str(person_number), f"בחירת אדם מספר {person_number}", 5)
            ]

            # שליחת פקודות בשקט
            for i, (command, description, wait_time) in enumerate(commands):
                # בדיקה שהתהליך עדיין חי
                if self.process.poll() is not None:
                    print(f"❌ התהליך מת בפקודה {i + 1}!")
                    return False, f"התהליך נכשל בפקודה {i + 1}", ""

                # שליחת הפקודה
                self.process.stdin.write(f"{command}\n")
                self.process.stdin.flush()

                # קריאת פלט ללא הדפסה
                try:
                    while True:
                        line = output_queue.get_nowait()
                        self.all_output.append(line)

                except queue.Empty:
                    time.sleep(0.1)

                time.sleep(wait_time)

            print("✅ כל הפקודות נשלחו - המערכת עובדת...")

            self.status = "waiting_for_processing"
            self.progress_message = "ממתין לתחילת עיבוד זיהוי פנים..."
            if status_callback:
                status_callback(self.status, self.progress_message)

            # מעקב אחרי התהליך - זמן ארוך לזיהוי מלא
            start_time = time.time()
            max_wait_time = 7200  # 2 שעות
            last_update = time.time()

            # הודעה ראשונה
            print("🚀 המערכת התחילה לרוץ - ממתין לתוצאות (זה יכול לקחת זמן רב)")

            while True:
                # בדיקה אם התהליך הסתיים
                if self.process.poll() is not None:
                    print(f"🔵 התהליך הסתיים עם קוד: {self.process.poll()}")
                    break

                # בדיקה אם חלף זמן המתנה מקסימלי
                if time.time() - start_time > max_wait_time:
                    print("⏰ פג זמן ההמתנה (2 שעות), מסיים תהליך")
                    self.process.kill()
                    self.status = "timeout"
                    self.progress_message = "פג זמן ההמתנה"
                    if status_callback:
                        status_callback(self.status, self.progress_message)
                    return False, "פג זמן ההמתנה", ""

                # קריאת פלט חדש (בלי להדפיס כל שורה)
                try:
                    while True:
                        line = output_queue.get_nowait()
                        self.all_output.append(line)

                        # בדיקה לתוצאות סופיות בלבד
                        if "is present!" in line:
                            person_name = line.replace(" is present!", "").strip()
                            print(f"✅ זוהה בהצלחה: {person_name}")
                            self.status = "completed"
                            self.progress_message = f"זיהוי הושלם - {person_name} נוכח"
                            if status_callback:
                                status_callback(self.status, self.progress_message)
                            return True, f"{person_name} נוכח", person_name

                        elif "לא נמצאה התאמה" in line or "not found" in line.lower():
                            print(f"❌ לא נמצאה התאמה")
                            self.status = "not_found"
                            self.progress_message = "לא נמצאה התאמה"
                            if status_callback:
                                status_callback(self.status, self.progress_message)
                            return False, "לא נמצאה התאמה", ""

                except queue.Empty:
                    pass

                # עדכון סטטוס כל 4 דקות בלבד
                if time.time() - last_update > 240:  # 4 דקות
                    elapsed_minutes = int((time.time() - start_time) / 60)
                    print(f"🕐 עדכון: רץ כבר {elapsed_minutes} דקות...")
                    self.progress_message = f"מעבד זיהוי פנים... ({elapsed_minutes} דקות)"
                    if status_callback:
                        status_callback(self.status, self.progress_message)
                    last_update = time.time()

                time.sleep(2)  # בדיקה כל 2 שניות

            # ניתוח התוצאות סופי
            print("🔵 מנתח תוצאות סופיות...")

            # שמירת כל הפלט לקובץ
            with open('final_output.log', 'w', encoding='utf-8') as f:
                f.write('\n'.join(self.all_output))

            print(f"📝 נשמרו {len(self.all_output)} שורות פלט ל-final_output.log")

            # חיפוש דפוסים שונים בפלט
            success_patterns = ["is present!", "נוכח", "זוהה", "נמצא"]
            failure_patterns = ["לא נמצאה", "not found", "לא זוהה"]

            for pattern in success_patterns:
                for line in self.all_output:
                    if pattern in line:
                        print(f"✅ נמצא דפוס הצלחה: {line}")
                        return True, f"נמצאה התאמה: {line}", "אדם זוהה"

            for pattern in failure_patterns:
                for line in self.all_output:
                    if pattern in line:
                        print(f"❌ נמצא דפוס כישלון: {line}")
                        return False, f"לא נמצאה התאמה: {line}", ""

            # אם לא נמצא כלום ברור
            print("⚠️ לא נמצאו דפוסים ברורים בפלט")
            return False, "לא הצלחתי לפרש את התוצאות", ""

        except Exception as e:
            print(f"❌ שגיאה כללית: {str(e)}")
            import traceback
            traceback.print_exc()
            return False, f"שגיאה: {str(e)}", ""

    def save_debug_log(self, filename):
        """שמירת לוג מפורט"""
        with open(filename, 'w', encoding='utf-8') as f:
            f.write(f"=== Debug Log - {time.strftime('%Y-%m-%d %H:%M:%S')} ===\n")
            f.write(f"Status: {self.status}\n")
            f.write(f"Message: {self.progress_message}\n")
            f.write(f"Total output lines: {len(self.all_output)}\n")
            f.write("\n=== Full Output ===\n")
            for i, line in enumerate(self.all_output, 1):
                f.write(f"{i:3d}: {line}\n")
        print(f"📁 נשמר לוג ל-{filename}")

    def get_status(self):
        return {
            "status": self.status,
            "message": self.progress_message,
            "result": self.result,
            "output_lines": len(self.all_output),
            "last_output_time": self.last_output_time
        }

    def kill_process(self):
        """הריגת התהליך בכוח"""
        if self.process and self.process.poll() is None:
            print("🛑 הורג תהליך...")
            self.process.kill()


# פונקציה לבדיקה מהירה
def debug_attendance_focused(person_number=1):
    print(f"🔍 === דיבאג ממוקד לאדם מספר {person_number} ===")

    checker = AttendanceDebugFocused()

    def debug_callback(status, message):
        print(f"📢 STATUS: {status} - {message}")

    try:
        success, message, person_name = checker.check_person_attendance_debug_focused(
            person_number,
            debug_callback
        )

        print(f"\n🏁 תוצאה סופית:")
        print(f"   Success: {success}")
        print(f"   Message: {message}")
        print(f"   Person: {person_name}")

        return {
            "success": success,
            "message": message,
            "person_name": person_name,
            "status": checker.status,
            "output_lines": len(checker.all_output)
        }

    except KeyboardInterrupt:
        print("\n🛑 נקטע על ידי המשתמש")
        checker.kill_process()
        return {"success": False, "message": "נקטע על ידי המשתמש", "person_name": ""}


if __name__ == "__main__":
    print("🚀 מתחיל דיבאג ממוקד...")
    result = debug_attendance_focused(3)
    print(f"\n📊 תוצאה: {result}")