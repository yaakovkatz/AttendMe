# Attend_Manage.py
import os
from Face_Detection import FaceDetection
from Data_Manage import people_vector

def check_presence():
   if not people_vector:
       print("אין אנשים במערכת לבדיקה")
       return

   print("\nInitializing Face Detection System...")

   # יצירת מופע של FaceDetection שמיד יחתוך את הפנים מתמונת המטרה
   face_detection = FaceDetection("target.jpg")
   face_detection.extract_faces_from_directory(r"C:\Users\User\PycharmProjects\AttendMe\target")

   # נתיב לתיקייה שמכילה תיקיות משנה לכל אדם עם התמונות שלו
   # אימון המודל

   pairs, labels = face_detection.prepare_data("./training_faces")
   model, training_history = face_detection.train_siamese_network("./training_faces")

   try:
       # בדיקת כל אדם במערכת
       match_found = False
       for person in people_vector:
           personal_image = person.get_first_image_path()
           print(f"\nChecking {person.get_full_name_and_id()}...")

           if face_detection.check_single_image(personal_image):
               person.mark_present()
               print(f"✅ {person.get_full_name_and_id()} is present!")
               match_found = True
           else:
               person.mark_absent()
               print(f"❌ {person.get_full_name_and_id()} is not present")

       print(f"")
       face_detection.clear_directory(r"C:\Users\User\PycharmProjects\AttendMe\EnviroFaces")
       #face_detection.clear_directory(r"C:\Users\User\PycharmProjects\AttendMe\Identified_Images")

       if not match_found:
           print("\nNo matches found in the system")

   except Exception as e:
       print(f"\nCritical error: {str(e)}")
