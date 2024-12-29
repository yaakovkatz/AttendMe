# Person.py
class Person:
    def __init__(self, first_name, last_name, id_number, base_path="C:/Users/User/PycharmProjects/AttendMe"):
        # מידע אישי
        self.first_name = first_name
        self.last_name = last_name
        self.id_number = id_number
        self._is_present = False  # משתנה בוליאני פרטי לנוכחות

        # יצירת נתיבים
        self.folder_name = f"{first_name}{last_name}{id_number}"
        self.person_dir = f"{base_path}/{self.folder_name}"

        # נתיבים לתמונות
        self._image1_path = f"{self.person_dir}/person1.jpg"
        self._image2_path = f"{self.person_dir}/person2.jpg"
        self._image3_path = f"{self.person_dir}/person3.jpg"

    # מחזיר את הנתיב לתמונה הראשונה
    def get_first_image_path(self):
        return self._image1_path

    # מחזיר את הנתיב לתמונה השנייה
    def get_second_image_path(self):
        return self._image2_path

    # מחזיר את הנתיב לתמונה השלישית
    def get_third_image_path(self):
        return self._image3_path

    # מסמן את האדם כנוכח
    def mark_present(self):
        self._is_present = True

    # מסמן את האדם כלא נוכח
    def mark_absent(self):
        self._is_present = False

    # מחזיר את סטטוס הנוכחות הנוכחי
    def get_presence_status(self):
        return self._is_present

    # מחזיר את השם המלא
    def get_full_name(self):
        return f"{self.first_name} {self.last_name}"

    # מחזיר את כל פרטי האדם כמילון
    def get_person_details(self):
        return {
            "first_name": self.first_name,
            "last_name": self.last_name,
            "id_number": self.id_number,
            "is_present": self._is_present,
            "folder_path": self.person_dir,
            "image1_path": self._image1_path,
            "image2_path": self._image2_path,
            "image3_path": self._image3_path
        }