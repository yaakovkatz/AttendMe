from datetime import datetime


class School:
    def __init__(self, school_name, school_email, school_phone, school_address,
                 admin_username, admin_password, school_index=None):

        self.school_name = school_name
        self.school_email = school_email
        self.school_phone = school_phone
        self.school_address = school_address
        self.admin_username = admin_username
        self.admin_password = admin_password
        self.created_at = self._get_current_time()
        self.school_index = school_index
        self.people_vector = []
        self.targets_vector = []

    def _get_current_time(self):
        return datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    def __str__(self):
        return f"🏫 {self.school_name} | מנהל: {self.admin_username} | אימייל: {self.school_email}"

    def get_school_info(self):
        return {
            'school_name': self.school_name,
            'school_email': self.school_email,
            'school_phone': self.school_phone,
            'school_address': self.school_address,
            'admin_username': self.admin_username,
            'created_at': self.created_at,
            'school_index': self.school_index
        }
