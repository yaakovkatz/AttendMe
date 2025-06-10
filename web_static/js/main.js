// Global variables
let peopleData = [];
let cameraActive = false;
let attendanceInterval = null;
let settings = {
    cameraId: 0,
    detectionFrequency: 0,
    detectionThreshold: 0.6,
    enableNotifications: true
};
let attendanceCheckInterval = null;
let loadedPeople = [];
let selectedPersonNumber = null;


// DOM Elements
document.addEventListener('DOMContentLoaded', function() {
    // Navigation
    const navLinks = document.querySelectorAll('.nav-links a');
    navLinks.forEach(link => {
        link.addEventListener('click', function() {
            navLinks.forEach(l => l.classList.remove('active'));
            this.classList.add('active');
        });
    });

    // Camera controls
    const startCameraBtn = document.getElementById('start-camera');
    const stopCameraBtn = document.getElementById('stop-camera');
    const checkAttendanceBtn = document.getElementById('check-attendance');

    startCameraBtn.addEventListener('click', startCamera);
    stopCameraBtn.addEventListener('click', stopCamera);
    checkAttendanceBtn.addEventListener('click', checkAttendance);

    // People management
    const addPersonBtn = document.getElementById('add-person-btn');
    const addPersonModal = document.getElementById('add-person-modal');
    const uploadImageModal = document.getElementById('upload-image-modal');
    const addPersonForm = document.getElementById('add-person-form');
    const uploadImageForm = document.getElementById('upload-image-form');
    const searchPeopleInput = document.getElementById('search-people');

    addPersonBtn.addEventListener('click', () => showModal(addPersonModal));
    addPersonForm.addEventListener('submit', handleAddPerson);
    uploadImageForm.addEventListener('submit', handleUploadImage);
    searchPeopleInput.addEventListener('input', filterPeopleTable);

    // Close modals
    const closeModalButtons = document.querySelectorAll('.close-modal, .close-modal-btn');
    closeModalButtons.forEach(button => {
        button.addEventListener('click', () => {
            document.getElementById('add-person-modal').classList.remove('active');
            document.getElementById('upload-image-modal').classList.remove('active');
            document.getElementById('person-images-modal').classList.remove('active');
        });
    });

    // הוספת אירוע לכפתור סיום העלאת תמונות
    const finishUploadButton = document.getElementById('finish-upload-button');
    if (finishUploadButton) {
        finishUploadButton.addEventListener('click', function() {
            document.getElementById('upload-image-modal').classList.remove('active');
            loadPeopleData();
        });
    }

    // Image preview
    const imageInput = document.getElementById('person-image');
    const imagePreview = document.getElementById('image-preview');

    imageInput.addEventListener('change', function() {
        const file = this.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                imagePreview.src = e.target.result;
            };
            reader.readAsDataURL(file);
        }
    });

    // Attendance
    const refreshAttendanceBtn = document.getElementById('refresh-attendance');
    const exportAttendanceBtn = document.getElementById('export-attendance');
    const attendanceDate = document.getElementById('attendance-date');

    refreshAttendanceBtn.addEventListener('click', refreshAttendance);
    exportAttendanceBtn.addEventListener('click', exportAttendance);

    // Set today's date as default
    const today = new Date();
    attendanceDate.valueAsDate = today;

    // Settings
    const saveSettingsBtn = document.getElementById('save-settings');
    const resetSettingsBtn = document.getElementById('reset-settings');
    const thresholdInput = document.getElementById('detection-threshold');
    const thresholdValue = document.getElementById('threshold-value');

    // Update the threshold value display
    thresholdInput.addEventListener('input', function() {
        thresholdValue.textContent = this.value;
    });

    saveSettingsBtn.addEventListener('click', saveSettings);
    resetSettingsBtn.addEventListener('click', resetSettings);

    // Load settings from localStorage if available
    loadSettings();

    // Initial data load
    loadSystemStatus();
    loadPeopleData();
    setupEventListeners();
    // טעינת אנשים לפונקציות מתקדמות
    setTimeout(() => {
        console.log('🔄 מתחיל טעינת אנשים לפונקציות מתקדמות...');
        const advancedSection = document.getElementById('advanced-functions');
        if (advancedSection) {
            loadPeopleList();
            setupPeopleSelectorEvents();
        }
    }, 2000); // 2 שניות אחרי טעינת הדף
});

// ===== System Functions =====

async function loadSystemStatus() {
    try {
        const response = await fetch('/api/status');
        const data = await response.json();

        // Update dashboard
        // document.getElementById('total-people').textContent = data.people_count;
        document.getElementById('camera-status').textContent = data.camera_active ? 'פעילה' : 'לא פעילה';

        cameraActive = data.camera_active;
        updateCameraControls();

    } catch (error) {
        console.error('Error loading system status:', error);
        showNotification('שגיאה בטעינת סטטוס המערכת', 'error');
    }
}


async function loadPeopleData() {
    try {
        console.log('🔄 טוען אנשים...');
        const response = await fetch('/api/get_loaded_people');
        const data = await response.json();
        console.log('📊 נתונים שהתקבלו:', data);

        if (data.success && data.people) {
            // --- שינוי חשוב: שומרים את כל המידע שמגיע מהשרת, כולל image_urls ---
            peopleData = data.people; 
        } else {
            peopleData = [];
        }

        console.log(`✅ נטענו ${peopleData.length} אנשים`);

        const presentCount = peopleData.filter(person => person.is_present).length;
        document.getElementById('total-people').textContent = peopleData.length;
        document.getElementById('present-people').textContent = presentCount;
        document.getElementById('absent-people').textContent = peopleData.length - presentCount;

        renderPeopleTable();
        updateAttendanceStats();
        renderAttendanceTable();

        if (peopleData.length > 0) {
            // showNotification(`נטענו ${peopleData.length} אנשים בהצלחה`, 'success');
        }

    } catch (error) {
        console.error('❌ שגיאה:', error);
        showNotification('שגיאה בטעינת אנשים', 'error');
        peopleData = [];
        renderPeopleTable();
    }
}

function updateCameraControls() {
    const startCameraBtn = document.getElementById('start-camera');
    const stopCameraBtn = document.getElementById('stop-camera');
    const checkAttendanceBtn = document.getElementById('check-attendance');
    const cameraFeedImg = document.getElementById('camera-feed-img');

    if (cameraActive) {
        startCameraBtn.disabled = true;
        stopCameraBtn.disabled = false;
        checkAttendanceBtn.disabled = false;
        cameraFeedImg.src = `/api/camera_feed?t=${new Date().getTime()}`;
    } else {
        startCameraBtn.disabled = false;
        stopCameraBtn.disabled = true;
        checkAttendanceBtn.disabled = true;
        cameraFeedImg.src = '/web_static/img/camera-placeholder.jpg';
    }
}

// ===== People Management & Rendering =====

function renderPeopleTable() {
    const tableBody = document.getElementById('people-table-body');
    tableBody.innerHTML = '';

    if (peopleData.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = `<td colspan="5" style="text-align: center;">אין אנשים במערכת</td>`;
        tableBody.appendChild(row);
        return;
    }

    peopleData.forEach(person => {
        const row = document.createElement('tr');
        const statusClass = person.is_present ? 'status-present' : 'status-absent';
        const statusText = person.is_present ? 'נוכח' : 'נעדר';

        // --- שינוי 1: לוגיקה חדשה לקביעת URL של תמונה ---
        let imageUrl = '/web_static/img/person-placeholder.jpg';
        if (person.image_urls && person.image_urls.length > 0) {
            imageUrl = person.image_urls[0]; // שימוש ישיר ב-URL מהענן
        }

        const imageCounter = person.image_count > 0 ? `<span class="image-count">${person.image_count}</span>` : '';

        row.innerHTML = `
            <td>
                <img src="<span class="math-inline">\{imageUrl\}" alt\="</span>{person.first_name}" class="person-image">
                <span class="math-inline">\{imageCounter\}
</td\>
<td\></span>{person.first_name} <span class="math-inline">\{person\.last\_name\}</td\>
<td\></span>{person.id_number}</td>
            <td><span class="person-status <span class="math-inline">\{statusClass\}"\></span>{statusText}</span></td>
            <td>
                <div class="person-actions">
                    <button class="upload" data-id="${person.id_number}" title="העלאת תמונה">
                        <i class="fas fa-upload"></i>
                    </button>
                    ${person.image_count > 0 ?
                      `<button class="view-images" data-id="${person.id_number}"
                      data-name="${person.first_name} ${person.last_name}"
                      data-count="${person.image_count}" title="צפייה בכל התמונות">
                        <i class="fas fa-images"></i>
                      </button>` : ''}
                    <button class="delete" data-id="${person.id_number}" title="מחיקה">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </div>