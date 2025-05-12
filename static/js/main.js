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
});

// ===== System Functions =====

async function loadSystemStatus() {
    try {
        const response = await fetch('/api/status');
        const data = await response.json();

        // Update dashboard
        document.getElementById('total-people').textContent = data.people_count;
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
        const response = await fetch('/api/people');
        peopleData = await response.json();

        // Update dashboard counts
        const presentCount = peopleData.filter(person => person.is_present).length;
        document.getElementById('present-people').textContent = presentCount;
        document.getElementById('absent-people').textContent = peopleData.length - presentCount;

        // Update people table
        renderPeopleTable();

        // Update attendance data
        updateAttendanceStats();
        renderAttendanceTable();

    } catch (error) {
        console.error('Error loading people data:', error);
        showNotification('שגיאה בטעינת נתוני אנשים', 'error');
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

        // Update the camera feed image src to the video feed
        cameraFeedImg.src = `/api/camera_feed?t=${new Date().getTime()}`;
    } else {
        startCameraBtn.disabled = false;
        stopCameraBtn.disabled = true;
        checkAttendanceBtn.disabled = true;

        // Reset camera feed image to placeholder
        cameraFeedImg.src = '/static/img/camera-placeholder.jpg';
    }
}

// ===== Camera Controls =====

async function startCamera() {
    try {
        const cameraId = document.getElementById('camera-id').value;

        const response = await fetch('/api/start_camera', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ camera_id: cameraId })
        });

        const data = await response.json();

        if (data.success) {
            cameraActive = true;
            updateCameraControls();
            showNotification('המצלמה הופעלה בהצלחה', 'success');

            // Update camera feed
            const cameraFeedImg = document.getElementById('camera-feed-img');
            cameraFeedImg.src = `/api/camera_feed?t=${new Date().getTime()}`;

            // Set up automatic attendance checks if enabled
            setupAutomaticAttendance();
        } else {
            showNotification(data.error || 'שגיאה בהפעלת המצלמה', 'error');
        }
    } catch (error) {
        console.error('Error starting camera:', error);
        showNotification('שגיאה בהפעלת המצלמה', 'error');
    }
}

async function stopCamera() {
    try {
        const response = await fetch('/api/stop_camera', {
            method: 'POST'
        });

        const data = await response.json();

        if (data.success) {
            cameraActive = false;
            updateCameraControls();
            showNotification('המצלמה כובתה בהצלחה', 'success');

            // Clear automatic attendance interval
            if (attendanceInterval) {
                clearInterval(attendanceInterval);
                attendanceInterval = null;
            }
        } else {
            showNotification(data.error || 'שגיאה בכיבוי המצלמה', 'error');
        }
    } catch (error) {
        console.error('Error stopping camera:', error);
        showNotification('שגיאה בכיבוי המצלמה', 'error');
    }
}

function setupAutomaticAttendance() {
    // Clear existing interval if any
    if (attendanceInterval) {
        clearInterval(attendanceInterval);
        attendanceInterval = null;
    }

    // Set up new interval if frequency is greater than 0
    const frequency = parseInt(document.getElementById('detection-frequency').value);
    if (frequency > 0) {
        attendanceInterval = setInterval(checkAttendance, frequency * 1000);
        showNotification(`בדיקת נוכחות אוטומטית תתבצע כל ${frequency} שניות`, 'info');
    }
}

// ===== Attendance =====

async function checkAttendance() {
    try {
        const checkBtn = document.getElementById('check-attendance');
        checkBtn.disabled = true;
        checkBtn.textContent = 'מבצע בדיקה...';

        const response = await fetch('/api/check_attendance', {
            method: 'POST'
        });

        const data = await response.json();

        if (data.success) {
            showNotification('בדיקת נוכחות החלה', 'info');

            // Poll for attendance results
            pollAttendanceStatus();
        } else {
            checkBtn.disabled = false;
            checkBtn.innerHTML = '<i class="fas fa-check"></i> בדיקת נוכחות';
            showNotification(data.error || 'שגיאה בביצוע בדיקת נוכחות', 'error');
        }
    } catch (error) {
        console.error('Error checking attendance:', error);
        const checkBtn = document.getElementById('check-attendance');
        checkBtn.disabled = false;
        checkBtn.innerHTML = '<i class="fas fa-check"></i> בדיקת נוכחות';
        showNotification('שגיאה בביצוע בדיקת נוכחות', 'error');
    }
}

async function pollAttendanceStatus() {
    // Function to poll attendance status until completed
    const checkStatus = async () => {
        try {
            const response = await fetch('/api/attendance_status');
            const data = await response.json();

            if (data.status === 'completed') {
                // Process attendance results
                processAttendanceResults(data.results);
                const checkBtn = document.getElementById('check-attendance');
                checkBtn.disabled = false;
                checkBtn.innerHTML = '<i class="fas fa-check"></i> בדיקת נוכחות';
                showNotification('בדיקת נוכחות הושלמה', 'success');
                return true;
            } else if (data.status === 'error') {
                const checkBtn = document.getElementById('check-attendance');
                checkBtn.disabled = false;
                checkBtn.innerHTML = '<i class="fas fa-check"></i> בדיקת נוכחות';
                showNotification(`שגיאה: ${data.error}`, 'error');
                return true;
            }

            return false;
        } catch (error) {
            console.error('Error polling attendance status:', error);
            const checkBtn = document.getElementById('check-attendance');
            checkBtn.disabled = false;
            checkBtn.innerHTML = '<i class="fas fa-check"></i> בדיקת נוכחות';
            showNotification('שגיאה בקבלת סטטוס בדיקת נוכחות', 'error');
            return true;
        }
    };

    // Start polling
    const poll = async () => {
        const finished = await checkStatus();
        if (!finished) {
            setTimeout(poll, 1000); // Poll every second
        } else {
            // Reload people data
            loadPeopleData();
        }
    };

    poll();
}

function processAttendanceResults(results) {
    // Update local people data with attendance results
    for (const id in results) {
        const index = peopleData.findIndex(p => p.id === id);
        if (index !== -1) {
            peopleData[index].is_present = results[id].is_present;
        }
    }

    // Update dashboard counts
    const presentCount = peopleData.filter(person => person.is_present).length;
    document.getElementById('present-people').textContent = presentCount;
    document.getElementById('absent-people').textContent = peopleData.length - presentCount;

    // Update people table
    renderPeopleTable();

    // Update attendance data
    updateAttendanceStats();
    renderAttendanceTable();
}

function refreshAttendance() {
    // Just reload people data
    loadPeopleData();
    showNotification('נתוני נוכחות עודכנו', 'success');
}

function exportAttendance() {
    // Create CSV data
    let csvContent = "שם פרטי,שם משפחה,ת.ז.,סטטוס נוכחות,זמן בדיקה\n";

    peopleData.forEach(person => {
        const status = person.is_present ? 'נוכח' : 'נעדר';
        csvContent += `${person.first_name},${person.last_name},${person.id},"${status}",${new Date().toLocaleString()}\n`;
    });

    // Create download link
    const encodedUri = encodeURI('data:text/csv;charset=utf-8,' + csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `דוח-נוכחות-${new Date().toLocaleDateString()}.csv`);
    document.body.appendChild(link);

    // Download the CSV file
    link.click();
    document.body.removeChild(link);

    showNotification('דוח נוכחות יוצא בהצלחה', 'success');
}

function updateAttendanceStats() {
    const presentCount = peopleData.filter(person => person.is_present).length;
    const totalCount = peopleData.length;
    const percentage = totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0;

    document.getElementById('attendance-present').textContent = presentCount;
    document.getElementById('attendance-absent').textContent = totalCount - presentCount;
    document.getElementById('attendance-percentage').textContent = `${percentage}%`;
}

// ===== People Management =====

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

        // הוספת מספר התמונות על התמונה
        const imageCounter = person.image_count && person.image_count > 0 ?
            `<span class="image-count">${person.image_count}</span>` : '';

        row.innerHTML = `
            <td>
                <img src="${person.has_image ? `/api/person_image/${person.id}` : '/static/img/person-placeholder.jpg'}"
                     alt="${person.first_name}" class="person-image">
                ${imageCounter}
            </td>
            <td>${person.first_name} ${person.last_name}</td>
            <td>${person.id}</td>
            <td><span class="person-status ${statusClass}">${statusText}</span></td>
            <td>
                <div class="person-actions">
                    <button class="upload" data-id="${person.id}" title="העלאת תמונה">
                        <i class="fas fa-upload"></i>
                    </button>
                    ${person.image_count && person.image_count > 0 ?
                      `<button class="view-images" data-id="${person.id}"
                      data-name="${person.first_name} ${person.last_name}"
                      data-count="${person.image_count}" title="צפייה בכל התמונות">
                        <i class="fas fa-images"></i>
                      </button>` : ''}
                    <button class="delete" data-id="${person.id}" title="מחיקה">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </div>
            </td>
        `;

        tableBody.appendChild(row);
    });

    // Add event listeners to action buttons
    const uploadButtons = document.querySelectorAll('.person-actions .upload');
    const deleteButtons = document.querySelectorAll('.person-actions .delete');
    const viewImagesButtons = document.querySelectorAll('.person-actions .view-images');

    uploadButtons.forEach(button => {
        button.addEventListener('click', handleUploadClick);
    });

    deleteButtons.forEach(button => {
        button.addEventListener('click', handleDeleteClick);
    });

    // הוספת אירוע לכפתור צפייה בכל התמונות
    viewImagesButtons.forEach(button => {
        button.addEventListener('click', function() {
            const personId = this.getAttribute('data-id');
            const personName = this.getAttribute('data-name');
            const imageCount = parseInt(this.getAttribute('data-count'), 10);
            showPersonImages(personId, personName, imageCount);
        });
    });
}

function renderAttendanceTable() {
    const tableBody = document.getElementById('attendance-table-body');
    tableBody.innerHTML = '';

    if (peopleData.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = `<td colspan="5" style="text-align: center;">אין נתוני נוכחות</td>`;
        tableBody.appendChild(row);
        return;
    }

    peopleData.forEach(person => {
        const row = document.createElement('tr');

        const statusClass = person.is_present ? 'status-present' : 'status-absent';
        const statusText = person.is_present ? 'נוכח' : 'נעדר';

        row.innerHTML = `
            <td>
                <img src="${person.has_image ? `/api/person_image/${person.id}` : '/static/img/person-placeholder.jpg'}"
                     alt="${person.first_name}" class="person-image">
            </td>
            <td>${person.first_name} ${person.last_name}</td>
            <td>${person.id}</td>
            <td><span class="person-status ${statusClass}">${statusText}</span></td>
            <td>${new Date().toLocaleString()}</td>
        `;

        tableBody.appendChild(row);
    });
}

function filterPeopleTable() {
    const searchValue = document.getElementById('search-people').value.toLowerCase();
    const rows = document.querySelectorAll('#people-table-body tr');

    rows.forEach(row => {
        const fullName = row.children[1]?.textContent.toLowerCase() || '';
        const id = row.children[2]?.textContent.toLowerCase() || '';

        if (fullName.includes(searchValue) || id.includes(searchValue)) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}

async function handleAddPerson(event) {
    event.preventDefault();

    const firstName = document.getElementById('first-name').value;
    const lastName = document.getElementById('last-name').value;
    const idNumber = document.getElementById('id-number').value;

    try {
        const response = await fetch('/api/add_person', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                first_name: firstName,
                last_name: lastName,
                id_number: idNumber
            })
        });

        const data = await response.json();

        if (data.success) {
            // Close modal
            document.getElementById('add-person-modal').classList.remove('active');

            // Clear form
            document.getElementById('add-person-form').reset();

            // Reload people data
            loadPeopleData();

            showNotification(data.message, 'success');

            // Reset upload progress display
            updateUploadProgress(0);

            // Open upload image modal
            const uploadModal = document.getElementById('upload-image-modal');
            document.getElementById('upload-person-id').value = data.person_id;
            document.getElementById('upload-status').textContent = 'יש להעלות לפחות 3 תמונות ועד 5 תמונות בסך הכל';
            document.getElementById('finish-upload-button').style.display = 'none';
            showModal(uploadModal);
        } else {
            showNotification(data.error, 'error');
        }
    } catch (error) {
        console.error('Error adding person:', error);
        showNotification('שגיאה בהוספת אדם', 'error');
    }
}

function handleUploadClick() {
    const personId = this.getAttribute('data-id');
    const uploadModal = document.getElementById('upload-image-modal');
    document.getElementById('upload-person-id').value = personId;

    // מאתחלים את תצוגת ההעלאה
    const person = peopleData.find(p => p.id === personId);
    const currentCount = person?.image_count || 0;
    const remaining = Math.max(0, 3 - currentCount);

    if (remaining > 0) {
        document.getElementById('upload-status').textContent =
            `הועלו ${currentCount} תמונות מתוך 3-5 נדרשות. נותרו לפחות ${remaining} תמונות.`;
        document.getElementById('finish-upload-button').style.display = 'none';
    } else if (currentCount < 5) {
        document.getElementById('upload-status').textContent =
            `הועלו ${currentCount} תמונות. ניתן להוסיף עוד ${5 - currentCount} תמונות או לסיים.`;
        document.getElementById('finish-upload-button').style.display = 'inline-block';
    } else {
        document.getElementById('upload-status').textContent =
            `הגעת למקסימום של 5 תמונות.`;
        document.getElementById('finish-upload-button').style.display = 'inline-block';
    }

    // עדכון מד ההתקדמה
    updateUploadProgress(currentCount);

    showModal(uploadModal);
}

async function handleDeleteClick() {
    const personId = this.getAttribute('data-id');
    const person = peopleData.find(p => p.id === personId);

    if (!confirm(`האם אתה בטוח שברצונך למחוק את ${person.first_name} ${person.last_name}?`)) {
        return;
    }

    try {
        const response = await fetch(`/api/remove_person/${personId}`, {
            method: 'DELETE'
        });

        const data = await response.json();

        if (data.success) {
            // Reload people data
            loadPeopleData();
            showNotification(data.message, 'success');
        } else {
            showNotification(data.error, 'error');
        }
    } catch (error) {
        console.error('Error deleting person:', error);
        showNotification('שגיאה במחיקת אדם', 'error');
    }
}

async function handleUploadImage(event) {
    event.preventDefault();

    const personId = document.getElementById('upload-person-id').value;
    const fileInput = document.getElementById('person-image');

    if (!fileInput.files || fileInput.files.length === 0) {
        showNotification('נא לבחור תמונה', 'error');
        return;
    }

    const formData = new FormData();
    formData.append('image', fileInput.files[0]);

    try {
        const response = await fetch(`/api/upload_image/${personId}`, {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (data.success) {
            // עדכון ההודעה למשתמש
            showNotification(data.message, 'success');

            // עדכון מד ההתקדמה
            updateUploadProgress(data.image_count);

            // אם עדיין נדרשות תמונות, השאר את החלון פתוח ואפס את הטופס
            if (data.images_required) {
                document.getElementById('upload-status').textContent =
                    `הועלו ${data.image_count} תמונות מתוך 3-5 נדרשות. נותרו לפחות ${data.remaining} תמונות.`;
                document.getElementById('upload-image-form').reset();
                document.getElementById('image-preview').src = '/static/img/person-placeholder.jpg';
                document.getElementById('finish-upload-button').style.display = 'none';
            } else {
                // אם הגענו למינימום הנדרש, יש אפשרות לסגור או להמשיך
                if (data.can_add_more) {
                    document.getElementById('upload-status').textContent =
                        `הועלו ${data.image_count} תמונות. ניתן להוסיף עוד ${5 - data.image_count} תמונות או לסיים.`;
                    document.getElementById('upload-image-form').reset();
                    document.getElementById('image-preview').src = '/static/img/person-placeholder.jpg';
                    document.getElementById('finish-upload-button').style.display = 'inline-block';
                } else {
                    // אם הגענו למקסימום, סגור את החלון
                    document.getElementById('upload-image-modal').classList.remove('active');
                    document.getElementById('upload-image-form').reset();
                    document.getElementById('image-preview').src = '/static/img/person-placeholder.jpg';
                    loadPeopleData();
                }
            }
        } else {
            showNotification(data.error, 'error');
        }
    } catch (error) {
        console.error('Error uploading image:', error);
        showNotification('שגיאה בהעלאת תמונה', 'error');
    }
}

function showPersonImages(personId, personName, imageCount) {
    const modal = document.getElementById('person-images-modal');
    const galleryContainer = document.getElementById('person-images-gallery');
    const personNameElem = document.getElementById('person-images-name');

    // ניקוי הגלריה
    galleryContainer.innerHTML = '';

    // הגדרת שם האדם
    personNameElem.textContent = personName;

    // בדיקה אם יש תמונות
    if (!imageCount || imageCount === 0) {
        galleryContainer.innerHTML = '<p class="no-images">אין תמונות זמינות</p>';
    } else {
        // הוספת כל התמונות לגלריה
        for (let i = 1; i <= imageCount; i++) {
            const imageContainer = document.createElement('div');
            imageContainer.className = 'person-image-item';

            const img = document.createElement('img');
            img.src = `/api/person_image/${personId}/${i}`;
            img.alt = `תמונה ${i}`;
            img.loading = 'lazy';

            const counter = document.createElement('div');
            counter.className = 'person-image-counter';
            counter.textContent = i;

            imageContainer.appendChild(img);
            imageContainer.appendChild(counter);
            galleryContainer.appendChild(imageContainer);
        }
    }

    // הצגת המודאל
    showModal(modal);
}

function updateUploadProgress(currentCount) {
    // עדכון מדד ההתקדמה החזותי
    for (let i = 1; i <= 5; i++) {
        const step = document.getElementById(`progress-step-${i}`);
        if (i <= currentCount) {
            step.classList.add('completed');
            step.classList.remove('active');
        } else if (i === currentCount + 1) {
            step.classList.add('active');
            step.classList.remove('completed');
        } else {
            step.classList.remove('completed');
            step.classList.remove('active');
        }
    }
}

// ===== Settings =====

function loadSettings() {
    // Load settings from localStorage
    const savedSettings = localStorage.getItem('attendme-settings');

    if (savedSettings) {
        try {
            settings = JSON.parse(savedSettings);

            // Apply settings to form
            document.getElementById('camera-id').value = settings.cameraId;
            document.getElementById('detection-frequency').value = settings.detectionFrequency;
            document.getElementById('detection-threshold').value = settings.detectionThreshold;
            document.getElementById('threshold-value').textContent = settings.detectionThreshold;
            document.getElementById('enable-notifications').checked = settings.enableNotifications;
        } catch (e) {
            console.error('Error parsing settings:', e);
            // Reset to defaults if there's an error
            resetSettings();
        }
    }
}

function saveSettings() {
    // Get settings from form
    settings.cameraId = document.getElementById('camera-id').value;
    settings.detectionFrequency = document.getElementById('detection-frequency').value;
    settings.detectionThreshold = document.getElementById('detection-threshold').value;
    settings.enableNotifications = document.getElementById('enable-notifications').checked;

    // Save to localStorage
    localStorage.setItem('attendme-settings', JSON.stringify(settings));

    // Apply new settings
    setupAutomaticAttendance();

    showNotification('ההגדרות נשמרו בהצלחה', 'success');
}

function resetSettings() {
    // Reset to defaults
    settings = {
        cameraId: 0,
        detectionFrequency: 0,
        detectionThreshold: 0.6,
        enableNotifications: true
    };

    // Apply to form
    document.getElementById('camera-id').value = settings.cameraId;
    document.getElementById('detection-frequency').value = settings.detectionFrequency;
    document.getElementById('detection-threshold').value = settings.detectionThreshold;
    document.getElementById('threshold-value').textContent = settings.detectionThreshold;
    document.getElementById('enable-notifications').checked = settings.enableNotifications;

    // Save to localStorage
    localStorage.setItem('attendme-settings', JSON.stringify(settings));

    // Apply new settings
    setupAutomaticAttendance();

    showNotification('ההגדרות אופסו להגדרות ברירת המחדל', 'success');
}

// ===== Helper Functions =====

function setupEventListeners() {
    // Scroll to section when navigation link is clicked
    document.querySelectorAll('.nav-links a, .cta-button').forEach(link => {
        link.addEventListener('click', event => {
            if (link.getAttribute('href').startsWith('#')) {
                event.preventDefault();
                const targetId = link.getAttribute('href');
                const targetSection = document.querySelector(targetId);
                if (targetSection) {
                    window.scrollTo({
                        top: targetSection.offsetTop - 80,
                        behavior: 'smooth'
                    });

                    // Update active link
                    document.querySelectorAll('.nav-links a').forEach(navLink => {
                        navLink.classList.remove('active');
                    });

                    document.querySelector(`.nav-links a[href="${targetId}"]`).classList.add('active');
                }
            }
        });
    });
}

function showModal(modal) {
    modal.classList.add('active');
}

function showNotification(message, type = 'info') {
    // Check if notifications are enabled
    if (!settings.enableNotifications && type !== 'error') {
        return;
    }

    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <span class="notification-message">${message}</span>
        <button class="notification-close">&times;</button>
    `;

    // Add notification container if it doesn't exist
    let container = document.querySelector('.notification-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'notification-container';
        document.body.appendChild(container);
    }

    // Add notification to container
    container.appendChild(notification);

    // Add close button event
    notification.querySelector('.notification-close').addEventListener('click', () => {
        notification.classList.add('closing');
        setTimeout(() => {
            notification.remove();
        }, 300);
    });

    // Auto close after 5 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.classList.add('closing');
            setTimeout(() => {
                notification.remove();
            }, 300);
        }
    }, 5000);
}

// Add CSS for notifications
const notificationStyles = document.createElement('style');
notificationStyles.textContent = `
    .notification-container {
        position: fixed;
        top: 20px;
        left: 20px;
        z-index: 1000;
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        gap: 10px;
    }

    .notification {
        background-color: white;
        border-radius: var(--border-radius);
        box-shadow: var(--box-shadow);
        padding: 15px 20px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        min-width: 300px;
        max-width: 400px;
        transform: translateX(-120%);
        animation: slide-in 0.3s forwards;
    }

    .notification.closing {
        animation: slide-out 0.3s forwards;
    }

    .notification.info {
        border-right: 4px solid var(--primary-color);
    }

    .notification.success {
        border-right: 4px solid var(--success-color);
    }

    .notification.error {
        border-right: 4px solid var(--danger-color);
    }

    .notification-close {
        background: none;
        border: none;
        font-size: 1.2rem;
        cursor: pointer;
        margin-right: -10px;
        margin-left: 10px;
        color: #999;
    }

    .notification-close:hover {
        color: var(--danger-color);
    }

    @keyframes slide-in {
        100% { transform: translateX(0); }
    }

    @keyframes slide-out {
        0% { transform: translateX(0); }
        100% { transform: translateX(-120%); }
    }
`;

document.head.appendChild(notificationStyles);