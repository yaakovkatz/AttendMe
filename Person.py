

class Person:
    def __init__(self, first_name, last_name, id_number, images_url):
        # מידע אישי
        self.first_name = first_name
        self.last_name = last_name
        self.id_number = id_number
        self.image_urls = images_url
        self.is_present = False

    # --- פונקציות חדשות לניהול URL-ים ---
    def add_image_url(self, url):
        """מוסיפה URL של תמונה חדשה לרשימה של האדם."""
        if url and url not in self.image_urls:
            self.image_urls.append(url)

    def get_primary_image_url(self):
        """מחזירה את ה-URL של התמונה הראשונה, או None אם אין תמונות."""
        return self.image_urls[0] if self.image_urls else None

    def get_all_image_urls(self):
        """מחזירה את כל רשימת ה-URL-ים של התמונות."""
        return self.image_urls

    # --- פונקציות קיימות שנשארו ---
    def mark_present(self):
        """מסמן את האדם כנוכח"""
        self.is_present = True

    def mark_absent(self):
        """מסמן את האדם כלא נוכח"""
        self.is_present = False

    def set_presence(self, status: bool):
        """קובע את סטטוס הנוכחות"""
        self.is_present = status

    def get_presence_status(self):
        """מחזיר את סטטוס הנוכחות הנוכחי"""
        return self.is_present

    def get_full_name_and_id(self):
        """מחזיר את השם המלא ומספר ת.ז."""
        return f"{self.first_name} {self.last_name} {self.id_number}"

    def get_person_details(self):
        """מחזיר את כל פרטי האדם כמילון, מותאם לעבודה עם ענן."""
        return {
            "first_name": self.first_name,
            "last_name": self.last_name,
            "id_number": self.id_number,
            "is_present": self.is_present,
            "image_urls": self.image_urls,
            "image_count": len(self.image_urls)
        }
