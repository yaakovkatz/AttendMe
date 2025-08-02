from Yolo_modle import extract_all_faces_from_cameras
from Face_comparison import check_attendance_unified


def extract_faces_from_cameras(school_index):
    return extract_all_faces_from_cameras(school_index)


def check_attendance_for_people(school_index):
    return check_attendance_unified(school_index, is_specific_check=False)


def check_attendance_for_selected_people(school_index, person_ids):
    return check_attendance_unified(school_index, is_specific_check=True, person_ids=person_ids)
