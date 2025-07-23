from datetime import datetime


class Person:
    def __init__(self, first_name, last_name, id_number, images_url, school_id=None):
        # מידע אישי
        self.first_name = first_name
        self.last_name = last_name
        self.id_number = id_number
        self.image_urls = images_url
        self.is_present = False

        # קישור לבית ספר
        self.school_id = school_id

        # מידע נוסף
        self.created_at = datetime.now()
        self.last_attendance_check = None
        self.total_attendance_days = 0
        self.notes = ""  # הערות על האדם

        # הגדרות אישיות
        self.person_type = "student"  # student, teacher, staff
        self.class_name = ""  # כיתה (עבור תלמידים)
        self.grade_level = ""  # רמת כיתה

        print(f"✅ נוצר אדם חדש: {self.get_full_name_and_id()}")

    # --- פונקציות קיימות ---

    def add_image_url(self, url):
        """מוסיפה URL של תמונה חדשה לרשימה של האדם."""
        if url and url not in self.image_urls:
            self.image_urls.append(url)
            print(f"✅ נוספה תמונה לאדם {self.get_full_name_and_id()}: {len(self.image_urls)} תמונות סה\"כ")

    def remove_image_url(self, url):
        """מסירה URL של תמונה מהרשימה"""
        if url in self.image_urls:
            self.image_urls.remove(url)
            print(f"✅ הוסרה תמונה מאדם {self.get_full_name_and_id()}: {len(self.image_urls)} תמונות נותרו")

    def get_primary_image_url(self):
        """מחזירה את ה-URL של התמונה הראשונה, או None אם אין תמונות."""
        return self.image_urls[0] if self.image_urls else None

    def get_all_image_urls(self):
        """מחזירה את כל רשימת ה-URL-ים של התמונות."""
        return self.image_urls

    def get_image_count(self):
        """מחזיר את מספר התמונות"""
        return len(self.image_urls)

    def mark_present(self):
        """מסמן את האדם כנוכח"""
        if not self.is_present:
            self.is_present = True
            self.last_attendance_check = datetime.now()
            self.total_attendance_days += 1
            print(f"✅ {self.get_full_name_and_id()} סומן כנוכח")

    def mark_absent(self):
        """מסמן את האדם כלא נוכח"""
        if self.is_present:
            self.is_present = False
            self.last_attendance_check = datetime.now()
            print(f"❌ {self.get_full_name_and_id()} סומן כנעדר")

    def set_presence(self, status: bool):
        """קובע את סטטוס הנוכחות"""
        old_status = self.is_present
        self.is_present = status
        self.last_attendance_check = datetime.now()

        if status and not old_status:
            self.total_attendance_days += 1
            print(f"✅ {self.get_full_name_and_id()} סומן כנוכח")
        elif not status and old_status:
            print(f"❌ {self.get_full_name_and_id()} סומן כנעדר")

    def get_presence_status(self):
        """מחזיר את סטטוס הנוכחות הנוכחי"""
        return self.is_present

    def get_full_name_and_id(self):
        """מחזיר את השם המלא ומספר ת.ז."""
        return f"{self.first_name} {self.last_name} ({self.id_number})"

    def get_full_name(self):
        """מחזיר שם מלא בלבד"""
        return f"{self.first_name} {self.last_name}"

    # --- פונקציות חדשות ---

    def set_person_type(self, person_type):
        """קביעת סוג האדם"""
        allowed_types = ["student", "teacher", "staff", "admin", "parent"]
        if person_type in allowed_types:
            self.person_type = person_type
            print(f"✅ סוג אדם עודכן עבור {self.get_full_name_and_id()}: {person_type}")
        else:
            print(f"❌ סוג אדם לא חוקי: {person_type}")

    def set_class_info(self, class_name, grade_level=""):
        """קביעת מידע כיתה"""
        self.class_name = class_name
        self.grade_level = grade_level
        print(f"✅ מידע כיתה עודכן עבור {self.get_full_name_and_id()}: כיתה {class_name}, רמה {grade_level}")

    def add_note(self, note):
        """הוספת הערה"""
        timestamp = datetime.now().strftime("%d/%m/%Y %H:%M")
        new_note = f"[{timestamp}] {note}"

        if self.notes:
            self.notes += "\n" + new_note
        else:
            self.notes = new_note

        print(f"✅ נוספה הערה לאדם {self.get_full_name_and_id()}")

    def clear_notes(self):
        """ניקוי כל ההערות"""
        self.notes = ""
        print(f"✅ הערות נוקו עבור {self.get_full_name_and_id()}")

    def get_attendance_stats(self):
        """קבלת סטטיסטיקות נוכחות"""
        return {
            "total_days": self.total_attendance_days,
            "current_status": "נוכח" if self.is_present else "נעדר",
            "last_check": self.last_attendance_check.strftime(
                "%d/%m/%Y %H:%M") if self.last_attendance_check else "מעולם לא נבדק"
        }

    def reset_daily_attendance(self):
        """איפוס נוכחות יומית (לקריאה בתחילת יום חדש)"""
        self.is_present = False
        print(f"🔄 נוכחות יומית אופסה עבור {self.get_full_name_and_id()}")

    def get_person_details(self):
        """מחזיר את כל פרטי האדם כמילון, מותאם לעבודה עם ענן."""
        return {
            "first_name": self.first_name,
            "last_name": self.last_name,
            "id_number": self.id_number,
            "is_present": self.is_present,
            "image_urls": self.image_urls,
            "image_count": len(self.image_urls),

            # מידע נוסף
            "school_id": self.school_id,
            "person_type": self.person_type,
            "class_name": self.class_name,
            "grade_level": self.grade_level,
            "notes": self.notes,

            # תאריכים וסטטיסטיקות
            "created_at": self.created_at.isoformat(),
            "last_attendance_check": self.last_attendance_check.isoformat() if self.last_attendance_check else None,
            "total_attendance_days": self.total_attendance_days,

            # סטטוס נוכחי
            "attendance_stats": self.get_attendance_stats()
        }

    def get_person_summary(self):
        """מחזיר סיכום קצר של האדם"""
        return {
            "id_number": self.id_number,
            "full_name": self.get_full_name(),
            "person_type": self.person_type,
            "class_name": self.class_name,
            "is_present": self.is_present,
            "image_count": len(self.image_urls),
            "school_id": self.school_id
        }

    def update_personal_info(self, first_name=None, last_name=None):
        """עדכון מידע אישי"""
        old_name = self.get_full_name()

        if first_name:
            self.first_name = first_name
        if last_name:
            self.last_name = last_name

        new_name = self.get_full_name()

        if old_name != new_name:
            print(f"✅ שם עודכן מ-{old_name} ל-{new_name}")

    def is_valid(self):
        """בדיקת תקינות נתוני האדם"""
        required_fields = [self.first_name, self.last_name, self.id_number]

        # בדיקה שכל השדות הנדרשים קיימים ולא ריקים
        if not all(field and str(field).strip() for field in required_fields):
            return False

        # בדיקה שמספר תעודת הזהות הוא מספר
        if not str(self.id_number).isdigit():
            return False

        # בדיקה שיש לפחות תמונה אחת
        if not self.image_urls or len(self.image_urls) == 0:
            return False

        return True

    def export_to_dict(self):
        """ייצוא לדיקשנרי לשמירה בקובץ"""
        return {
            "basic_info": {
                "first_name": self.first_name,
                "last_name": self.last_name,
                "id_number": self.id_number,
                "school_id": self.school_id,
                "person_type": self.person_type,
                "class_name": self.class_name,
                "grade_level": self.grade_level
            },
            "images": {
                "urls": self.image_urls,
                "count": len(self.image_urls)
            },
            "attendance": {
                "is_present": self.is_present,
                "total_days": self.total_attendance_days,
                "last_check": self.last_attendance_check.isoformat() if self.last_attendance_check else None
            },
            "metadata": {
                "created_at": self.created_at.isoformat(),
                "notes": self.notes
            }
        }

    @classmethod
    def create_from_dict(cls, data_dict):
        """יצירת אדם מדיקשנרי (לטעינה מקובץ)"""
        basic = data_dict.get("basic_info", {})
        images = data_dict.get("images", {})
        attendance = data_dict.get("attendance", {})
        metadata = data_dict.get("metadata", {})

        # יצירת אובייקט אדם
        person = cls(
            first_name=basic.get("first_name"),
            last_name=basic.get("last_name"),
            id_number=basic.get("id_number"),
            images_url=images.get("urls", []),
            school_id=basic.get("school_id")
        )

        # עדכון נתונים נוספים
        person.person_type = basic.get("person_type", "student")
        person.class_name = basic.get("class_name", "")
        person.grade_level = basic.get("grade_level", "")

        person.is_present = attendance.get("is_present", False)
        person.total_attendance_days = attendance.get("total_days", 0)

        person.notes = metadata.get("notes", "")

        # עדכון תאריכים
        try:
            if metadata.get("created_at"):
                person.created_at = datetime.fromisoformat(metadata["created_at"])
            if attendance.get("last_check"):
                person.last_attendance_check = datetime.fromisoformat(attendance["last_check"])
        except:
            pass  # אם יש שגיאה בתאריכים, נשאיר ברירת מחדל

        return person

    def __str__(self):
        status = "נוכח" if self.is_present else "נעדר"
        return f"Person(name='{self.get_full_name()}', id='{self.id_number}', type='{self.person_type}', status='{status}')"

    def __repr__(self):
        return self.__str__()

    def __eq__(self, other):
        """השוואה בין אנשים לפי מספר תעודת זהות"""
        if not isinstance(other, Person):
            return False
        return self.id_number == other.id_number

    def __hash__(self):
        """מאפשר שימוש באדם כמפתח בדיקשנרי או בסט"""
        return hash(self.id_number)