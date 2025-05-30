# מערכת זיהוי נוכחות באמצעות זיהוי פנים

מערכת זיהוי נוכחות אוטומטית המיועדת לגני ילדים ובתי ספר באמצעות טכנולוגיית זיהוי פנים מבוססת בינה מלאכותית.

## תכונות עיקריות

- זיהוי פנים מדויק באמצעות אלגוריתמים מתקדמים
- ממשק משתמש נוח וידידותי
- ניהול אנשים (הוספה, מחיקה, עריכה)
- דוחות נוכחות בזמן אמת
- תמיכה במצלמות אבטחה
- אפשרות לייצוא דוחות

## דרישות מערכת

- Python 3.8 ומעלה
- לפחות 4GB זיכרון RAM
- מעבד עם תמיכה ב-AVX (מומלץ למודלים של זיהוי פנים)
- מצלמת רשת או מצלמת IP

## התקנה והגדרה

1. התקן את Python 3.8 ומעלה:
   - ניתן להוריד מ-[אתר Python הרשמי](https://www.python.org/downloads/)

2. שכפל את המאגר:
   ```
   git clone https://github.com/your-username/face-attendance-system.git
   cd face-attendance-system
   ```

3. צור סביבת Python וירטואלית (מומלץ):
   ```
   python -m venv venv
   source venv/bin/activate  # בלינוקס/מאק
   venv\Scripts\activate  # בווינדוס
   ```

4. התקן את התלויות:
   ```
   pip install -r requirements.txt
   ```

5. הורד את קובץ המודל הנדרש:
   ```
   wget https://github.com/ultralytics/assets/releases/download/v0.0.0/yolov8n-face.pt -O face_yolov8n.pt
   ```

6. הורד את קובץ הגדרות ה-shape predictor של dlib:
   ```
   wget http://dlib.net/files/shape_predictor_68_face_landmarks.dat.bz2
   bzip2 -d shape_predictor_68_face_landmarks.dat.bz2
   ```

7. וודא שמבנה התיקיות הבא קיים:
   ```
   mkdir -p static/img static/css static/js templates uploads target training_faces EnviroFaces Identified_Images
   ```

8. העבר את הקבצים הסטטיים למקומם:
   ```
   cp style.css static/css/
   cp main.js static/js/
   cp index.html templates/
   ```

## הפעלה

1. הפעל את השרת:
   ```
   python app.py
   ```

2. גש לכתובת ה-URL הבאה בדפדפן:
   ```
   http://localhost:5000
   ```

## שימוש

1. **ניהול אנשים**:
   - לחץ על "הוסף אדם חדש" בלשונית ניהול אנשים
   - מלא את פרטי האדם והעלה תמונת פנים

2. **בדיקת נוכחות**:
   - הפעל את המצלמה בלחיצה על "הפעל מצלמה"
   - לחץ על "בדיקת נוכחות" כדי לבצע בדיקה ידנית
   - באפשרותך להגדיר בדיקות אוטומטיות בלשונית הגדרות

3. **דוחות**:
   - צפה בתוצאות ב"דוח נוכחות"
   - ייצא את הנתונים לקובץ אקסל באמצעות לחצן הייצוא

## פתרון בעיות

- **שגיאת טעינת מודל**:
  וודא שהורדת את הקבצים הנדרשים (face_yolov8n.pt ו-shape_predictor_68_face_landmarks.dat)

- **שגיאת מצלמה**:
  בדוק את הגדרות המצלמה ואת מזהה המצלמה בלשונית הגדרות

- **בעיות ביצועים**:
  הגדל את זיכרון ה-RAM הזמין, וודא שיש לך מספיק מקום בדיסק

## קרדיטים

מערכת זו משתמשת בטכנולוגיות וספריות הבאות:
- YOLO (You Only Look Once) לזיהוי פנים
- DeepFace לאימות פנים
- TensorFlow לעיבוד תמונה מתקדם
- Flask לשרת הווב
- OpenCV לעיבוד תמונה

## רישיון

פרויקט זה מוגן תחת רישיון MIT.