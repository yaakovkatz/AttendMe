from Yolo_modle import extract_all_faces_from_cameras
from Face_comparison import check_attendance_for_all_people


def extract_faces_from_cameras(school_index):
    return extract_all_faces_from_cameras(school_index)


def check_attendance_for_people(school_index):
    return check_attendance_for_all_people(school_index)
