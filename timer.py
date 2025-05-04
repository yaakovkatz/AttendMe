import time
import threading
import sys
from datetime import datetime, timedelta


class Timer:
    """
    מחלקה למדידת זמן עם תצוגה בזמן אמת של הזמן שחלף
    התצוגה מיושרת כך שהשעון תמיד מתחיל באותו מיקום אנכי
    """

    def __init__(self, description="פעולה", update_interval=0.5, description_width=25, time_width=12):
        """
        אתחול מודד הזמן

        Args:
            description (str): תיאור הפעולה שנמדדת
            update_interval (float): תדירות עדכון התצוגה בשניות
            description_width (int): רוחב עמודת התיאור בתווים
            time_width (int): רוחב עמודת הזמן בתווים
        """
        self.description = description
        self.update_interval = update_interval
        self.description_width = description_width
        self.time_width = time_width
        self.start_time = None
        self.stop_time = None
        self.running = False
        self.display_thread = None

    def start(self):
        """התחלת מדידת הזמן והצגת העדכונים"""
        self.start_time = time.time()
        self.running = True
        self.display_thread = threading.Thread(target=self._update_display)
        self.display_thread.daemon = True
        self.display_thread.start()
        return self

    def stop(self):
        """עצירת מדידת הזמן והצגת הזמן הסופי"""
        self.stop_time = time.time()
        self.running = False
        if self.display_thread:
            self.display_thread.join(timeout=2 * self.update_interval)
        elapsed = self.stop_time - self.start_time
        self._clear_line()
        self._print_aligned("\n" + self.description, self._format_time(elapsed), "הושלם")
        return elapsed

    def _update_display(self):
        """עדכון תצוגת הזמן בזמן אמת"""
        while self.running:
            elapsed = time.time() - self.start_time
            self._clear_line()
            self._print_aligned(self.description, self._format_time(elapsed), "")
            time.sleep(self.update_interval)

    def _print_aligned(self, description, time_str, status=""):
        """הדפסת שורה מיושרת עם רווחים קבועים"""
        # קיצור התיאור אם הוא ארוך מדי
        if len(description) > self.description_width:
            description = description[:self.description_width - 3] + "..."

        # יישור שמאל לתיאור (עם רוחב קבוע)
        desc_formatted = description.ljust(self.description_width)

        # יישור ימין לזמן (עם רוחב קבוע)
        time_formatted = f"⏱️ {time_str}".rjust(self.time_width)

        # הדפסת השורה המלאה המיושרת
        if status:
            print(f"{desc_formatted} | {time_formatted} | {status}", flush=True)
        else:
            print(f"{desc_formatted} | {time_formatted}", end="", flush=True)

    def _clear_line(self):
        """ניקוי השורה הנוכחית בטרמינל"""
        sys.stdout.write('\r' + ' ' * 100 + '\r')
        sys.stdout.flush()

    def _format_time(self, seconds):
        """פורמט זמן נוח לקריאה"""
        minutes, seconds = divmod(int(seconds), 60)
        hours, minutes = divmod(minutes, 60)
        return f"{hours:02d}:{minutes:02d}:{seconds:02d}"

    def __enter__(self):
        """תמיכה בשימוש עם with statement"""
        return self.start()

    def __exit__(self, exc_type, exc_val, exc_tb):
        """סיום מדידת הזמן בסוף בלוק with"""
        self.stop()


# דוגמה לשימוש:
if __name__ == "__main__":
    # דוגמה פשוטה
    with Timer("פעולה קצרה") as timer:
        time.sleep(2)

    # דוגמה עם תיאור ארוך
    with Timer("זוהי פעולה עם תיאור ארוך מאוד שיקוצר אוטומטית") as timer:
        time.sleep(3)