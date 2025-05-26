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
            document.getElementById('total-people').textContent = data.people_count;
            document.getElementById('camera-status').textContent = data.camera_active ? 'פעילה' : 'לא פעילה';

            cameraActive = data.camera_active;
            updateCameraControls();

        } catch (error) {
            console.error('Error loading system status:', error);
            showNotification('שגיאה בטעינת סטטוס המערכת', 'error');
        }
    }

    // החלף את הפונקציה loadPeopleData הקיימת בקובץ main.js בפונקציה הזו:

async function loadPeopleData() {
    try {
        console.log('🔄 טוען אנשים...');

        // שינוי הכתובת מ /api/people ל /api/get_loaded_people
        const response = await fetch('/api/get_loaded_people');
        const data = await response.json();

        console.log('📊 נתונים שהתקבלו:', data);

        // התאמת הנתונים לטבלה
        if (data.success && data.people) {
            peopleData = data.people.map(person => ({
                id: person.id_number,
                first_name: person.full_name.split(' ')[0] || '',
                last_name: person.full_name.split(' ').slice(1).join(' ') || '',
                is_present: false,
                has_image: true,
                image_count: 1
            }));
        } else {
            peopleData = [];
        }

        console.log(`✅ נטענו ${peopleData.length} אנשים`);

        // עדכון הספירות בדשבורד
        const presentCount = peopleData.filter(person => person.is_present).length;
        document.getElementById('total-people').textContent = peopleData.length;
        document.getElementById('present-people').textContent = presentCount;
        document.getElementById('absent-people').textContent = peopleData.length - presentCount;

        // הצגת הטבלה
        renderPeopleTable();
        updateAttendanceStats();
        renderAttendanceTable();

        if (peopleData.length > 0) {
            showNotification(`נטענו ${peopleData.length} אנשים בהצלחה`, 'success');
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
                setTimeout(poll, 5000); // Poll every second
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

    function setupPeopleSelectorEvents() {
    // כפתור נסה שוב
    const retryButton = document.getElementById('retry-load-people');
    if (retryButton) {
        retryButton.addEventListener('click', loadPeopleList);
    }

    // כפתור בדיקת נוכחות - לוגיקה זהה לטעינת אנשים
    const checkButton = document.getElementById('check-person-attendance');
    if (checkButton) {
        checkButton.onclick = function() {
    if (selectedPersonNumber) {
        startAttendanceCheck(); // קרא לפונקציה הקיימת
    } else {
        alert('אנא בחר אדם מהרשימה תחילה');
    }
};
    }
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
    // פונקציות נוספות לתפריט המתקדם
    document.addEventListener('DOMContentLoaded', function() {
        // קישור לכפתורים
        const checkAllButton = document.getElementById('check-all-people');
        const checkSpecificButton = document.getElementById('check-specific-person');
        const loadPeopleButton = document.getElementById('load-people'); // שונה: שם המשתנה והמזהה
        const closeResultsButton = document.getElementById('close-results');
        const resultsPanel = document.getElementById('results-panel');
        const resultsTitle = document.getElementById('results-title');
        const resultsContent = document.getElementById('results-content');

        // הוספת מאזיני אירועים לכפתורים אם הם קיימים
        if (checkAllButton) {
            checkAllButton.addEventListener('click', function() {
                runAdvancedFunction('check_all_people', 'בדיקת נוכחות כללית');
            });
        }

        if (checkSpecificButton) {
            checkSpecificButton.addEventListener('click', function() {
                showPersonSelectionModal();
            });
        }

        if (loadPeopleButton) { // שונה: שם המשתנה
            loadPeopleButton.addEventListener('click', function() {
                runAdvancedFunction('load_people', 'טעינת אנשים'); // שונה: שם הפעולה והכותרת
            });
        }

        if (closeResultsButton) {
            closeResultsButton.addEventListener('click', function() {
                resultsPanel.style.display = 'none';
            });
        }

        // פונקציה להרצת פעולות מתקדמות
        async function runAdvancedFunction(command, title, params = {}) {
            try {
                // עדכון כותרת וריקון תוכן
                resultsTitle.textContent = title;
                resultsContent.innerHTML = '<div class="loading">טוען תוצאות...</div>';
                resultsPanel.style.display = 'block';

                // שליחת בקשה לשרת
                const response = await fetch('/api/run_advanced_function', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        command: command,
                        params: params
                    })
                });

                const data = await response.json();

                if (data.success) {
                    // הצגת התוצאות
                    resultsContent.innerHTML = '';

                    if (data.output) {
                        // המרת שורות חדשות ל-<br> והצגת הפלט
                        const formattedOutput = data.output
                            .replace(/\n/g, '<br>')
                            .replace(/\s{2}/g, '&nbsp;&nbsp;');

                        resultsContent.innerHTML = formattedOutput;
                    } else {
                        resultsContent.innerHTML = 'הפעולה בוצעה בהצלחה, אין פלט להצגה';
                    }

                    // אם יש נתוני אנשים, הצג אותם
                    if (data.people) {
                        displayPeopleTable(data.people);

                        // עדכון של peopleData הגלובלי אם קיים - תוספת חדשה
                        if (typeof peopleData !== 'undefined') {
                            peopleData = data.people;
                            // עדכון טבלת האנשים בדף הראשי
                            if (typeof renderPeopleTable === 'function') {
                                renderPeopleTable();
                            }

                            // עדכון ספירות בלוח הבקרה
                            if (document.getElementById('total-people')) {
                                document.getElementById('total-people').textContent = data.people.length;
                                const presentCount = data.people.filter(p => p.is_present).length;
                                document.getElementById('present-people').textContent = presentCount;
                                document.getElementById('absent-people').textContent = data.people.length - presentCount;
                            }

                            // הצגת הודעה
                            if (typeof showNotification === 'function') {
                                showNotification(`נטענו ${data.people.length} אנשים בהצלחה`, 'success');
                            }
                        }
                    }
                } else {
                    resultsContent.innerHTML = `<div class="error">שגיאה: ${data.error}</div>`;
                    // הצגת הודעת שגיאה אם יש פונקציית showNotification
                    if (typeof showNotification === 'function') {
                        showNotification('שגיאה בביצוע הפעולה', 'error');
                    }
                }
            } catch (error) {
                resultsContent.innerHTML = `<div class="error">שגיאה בתקשורת עם השרת: ${error.message}</div>`;
                // הצגת הודעת שגיאה אם יש פונקציית showNotification
                if (typeof showNotification === 'function') {
                    showNotification('שגיאה בתקשורת עם השרת', 'error');
                }
            }
        }

        // פונקציה להצגת חלון בחירת אדם
        function showPersonSelectionModal() {
        // נשתמש בחלון קיים או ניצור חדש אם צריך
        if (!document.getElementById('select-person-modal')) {
            // יצירת חלון מודאלי חדש
            const modal = document.createElement('div');
            modal.id = 'select-person-modal';
            modal.className = 'modal';

            modal.innerHTML = `
                <div class="modal-content">
                    <span class="close-modal">&times;</span>
                    <h3>בחירת אדם לבדיקת נוכחות</h3>
                    <div class="search-container">
                        <input type="text" id="person-search-input" placeholder="חיפוש לפי שם או ת.ז." class="search-input">
                    </div>
                    <div id="person-selection-content">
                        טוען אנשים...
                    </div>
                </div>
            `;

            document.body.appendChild(modal);

            // הוספת מאזין אירועים לכפתור סגירה
            modal.querySelector('.close-modal').addEventListener('click', function() {
                modal.classList.remove('active');
            });
        }

        const modal = document.getElementById('select-person-modal');
        const contentDiv = document.getElementById('person-selection-content');

        // הצגת החלון
        modal.classList.add('active');

        // טעינת רשימת האנשים
        fetch('/api/people')
            .then(response => response.json())
            .then(people => {
                if (people.length === 0) {
                    contentDiv.innerHTML = '<p class="no-people-message">אין אנשים רשומים במערכת</p>';
                    return;
                }

                // שימוש בטבלה משופרת
                let html = `
                    <table class="person-selection-table">
                        <thead>
                            <tr>
                                <th>תמונה</th>
                                <th>שם מלא</th>
                                <th>ת.ז.</th>
                            </tr>
                        </thead>
                        <tbody>
                `;

                people.forEach(person => {
                    const hasImage = person.has_image ? true : false;
                    const imageSrc = hasImage ?
                        `/api/person_image/${person.id}` :
                        '/static/img/person-placeholder.jpg';

                    html += `
                        <tr class="person-selection-row" data-id="${person.first_name} ${person.last_name} ${person.id}" data-name="${person.first_name} ${person.last_name}">
                            <td class="person-image-cell"><img src="${imageSrc}" alt="${person.first_name}" class="person-selection-image"></td>
                            <td class="person-name-cell">${person.first_name} ${person.last_name}</td>
                            <td class="person-id-cell">${person.id}</td>
                        </tr>
                    `;
                });

                html += `
                        </tbody>
                    </table>
                `;

                contentDiv.innerHTML = html;

                // הוספת מאזיני אירועים לשורות הטבלה
                document.querySelectorAll('.person-selection-row').forEach(row => {
                    row.addEventListener('click', function() {
                        const personId = this.getAttribute('data-id');
                        const personName = this.getAttribute('data-name');

                        // הוספת אפקט בחירה
                        document.querySelectorAll('.person-selection-row').forEach(r => {
                            r.classList.remove('selected');
                        });
                        this.classList.add('selected');

                        // השהייה קצרה כדי שהמשתמש יראה את האפקט
                        setTimeout(() => {
                            // סגירת החלון
                            modal.classList.remove('active');

                            // הרצת בדיקת הנוכחות לאדם שנבחר
                            runAdvancedFunction('check_specific_person',
                                `בדיקת נוכחות: ${personName}`,
                                { person_id: personId }
                            );
                        }, 300);
                    });
                });

                // הוספת פונקציונליות חיפוש
                const searchInput = document.getElementById('person-search-input');
                if (searchInput) {
                    searchInput.addEventListener('input', function() {
                        const searchValue = this.value.toLowerCase();
                        document.querySelectorAll('.person-selection-row').forEach(row => {
                            const name = row.querySelector('.person-name-cell').textContent.toLowerCase();
                            const id = row.querySelector('.person-id-cell').textContent.toLowerCase();

                            if (name.includes(searchValue) || id.includes(searchValue)) {
                                row.style.display = '';
                            } else {
                                row.style.display = 'none';
                            }
                        });
                    });

                    // פוקוס על תיבת החיפוש כשהחלון נפתח
                    setTimeout(() => {
                        searchInput.focus();
                    }, 300);
                }
            })
            .catch(error => {
                contentDiv.innerHTML = `<p class="error-message">שגיאה בטעינת אנשים: ${error.message}</p>`;
            });
    }

        // פונקציה להצגת טבלת אנשים בתוצאות
        function displayPeopleTable(people) {
            let tableHtml = `
                <table class="results-table">
                    <thead>
                        <tr>
                            <th>שם</th>
                            <th>ת.ז.</th>
                            <th>סטטוס</th>
                        </tr>
                    </thead>
                    <tbody>
            `;

            people.forEach(person => {
                const statusClass = person.is_present ? 'status-present' : 'status-absent';
                const statusText = person.is_present ? 'נוכח' : 'נעדר';

                tableHtml += `
                    <tr>
                        <td>${person.first_name} ${person.last_name}</td>
                        <td>${person.id}</td>
                        <td><span class="person-status ${statusClass}">${statusText}</span></td>
                    </tr>
                `;
            });

            tableHtml += `
                    </tbody>
                </table>
            `;

            resultsContent.innerHTML += tableHtml;
        }
        const checkPersonAttendanceBtn = document.getElementById('check-person-attendance');
        const cancelAttendanceBtn = document.getElementById('cancel-attendance-check');
        const personNumberInput = document.getElementById('person-number-input');
        const attendanceResultArea = document.getElementById('attendance-result-area');
        const attendanceStatusText = document.getElementById('attendance-status-text');
        const attendanceResultContent = document.getElementById('attendance-result-content');

        if (checkPersonAttendanceBtn) {
            checkPersonAttendanceBtn.addEventListener('click', startAttendanceCheck);
        }

        if (cancelAttendanceBtn) {
            cancelAttendanceBtn.addEventListener('click', cancelAttendanceCheck);
        }

        async function startAttendanceCheck() {
        const personNumber = selectedPersonNumber || 1;


        if (personNumber < 1 || personNumber > 20) {
            showNotification('אנא הכנס מספר בין 1 ל-20', 'error');
            return;
        }

        // הצגת מידע על האדם - השורה החדשה!
        const personInfo = await showPersonInfo(personNumber);
        console.log(`🔵 DEBUG: בודק נוכחות עבור: ${personInfo}`);

        try {
            const response = await fetch('/api/check_attendance_person', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    person_number: personNumber
                })
            });

            const data = await response.json();

            if (data.success) {
                showAttendanceResultArea();
                updateAttendanceUI('running');

                // עדכון הכותרת - השורות החדשות!
                const titleElement = document.getElementById('attendance-result-title');
                if (titleElement) {
                    titleElement.textContent = `בדיקת נוכחות: ${personInfo}`;
                }

                const statusElement = document.getElementById('attendance-status-text');
                if (statusElement) {
                    statusElement.textContent = `מתחיל בדיקה עבור ${personInfo}...`;
                }

                startAttendanceStatusChecking();
                showNotification(`בדיקה החלה עבור ${personInfo}`, 'info'); // עדכון הודעה
            } else {
                showNotification(data.error || 'שגיאה בהתחלת בדיקה', 'error');
            }
        } catch (error) {
            console.error('Error starting attendance check:', error);
            showNotification('שגיאה בתקשורת עם השרת', 'error');
        }
    }

        async function cancelAttendanceCheck() {
            try {
                const response = await fetch('/api/cancel_attendance_check', {
                    method: 'POST'
                });

                const data = await response.json();

                if (data.success) {
                    stopAttendanceStatusChecking();
                    updateAttendanceUI('idle');
                    hideAttendanceResultArea();
                    showNotification('הבדיקה בוטלה', 'info');
                }
            } catch (error) {
                console.error('Error cancelling check:', error);
                showNotification('שגיאה בביטול בדיקה', 'error');
            }
        }

        function startAttendanceStatusChecking() {
            // בדיקת סטטוס כל 3 שניות
            attendanceCheckInterval = setInterval(checkAttendanceStatusNow, 30000); // האט מ-3 ל-10 שניות

            checkAttendanceStatusNow(); // בדיקה מיידית
        }

        function stopAttendanceStatusChecking() {
            if (attendanceCheckInterval) {
                clearInterval(attendanceCheckInterval);
                attendanceCheckInterval = null;
            }
        }

        async function checkAttendanceStatusNow() {
            try {
                const response = await fetch('/api/attendance_check_status');
                const data = await response.json();

                updateAttendanceStatusDisplay(data);

                // אם הבדיקה הושלמה או נכשלה
                if (!data.is_running) {
                    stopAttendanceStatusChecking();

                    if (data.status === 'completed' && data.result) {
                        displayAttendanceFinalResult(data.result);
                        updateAttendanceUI('completed');
                    } else if (data.status === 'error') {
                        displayAttendanceError(data.message);
                        updateAttendanceUI('error');
                    } else {
                        updateAttendanceUI('idle');
                    }
                }
            } catch (error) {
                console.error('Error checking attendance status:', error);
                stopAttendanceStatusChecking();
                updateAttendanceUI('error');
            }
        }

        // החלף את הפונקציה updateAttendanceStatusDisplay הקיימת (שורה ~965) בזו:

function updateAttendanceStatusDisplay(data) {
    // עדכון הטקסט
    if (attendanceStatusText) {
        let message = data.message || 'מעבד...';

        // הוספת זמן שחלף אם קיים
        if (data.elapsed_time) {
            message += ` (${data.elapsed_time})`;
        }

        attendanceStatusText.textContent = message;
    }

    // עדכון הפס הירוק - זה החסר!
    const progressBar = document.querySelector('.progress-bar');
    if (progressBar) {
        const progress = data.progress || 50; // ברירת מחדל 50%

        // עדכון רוחב הפס
        progressBar.style.width = progress + '%';
        progressBar.style.backgroundColor = '#28a745'; // ירוק
        progressBar.style.transition = 'width 0.5s ease';

        console.log(`📊 עדכון פס התקדמות: ${progress}%`);
    }

    // שינוי צבע לפי סטטוס
    if (data.status) {
        const progressBar = document.querySelector('.progress-bar');
        if (progressBar) {
            switch(data.status) {
                case 'starting':
                case 'initializing':
                    progressBar.style.backgroundColor = '#007bff'; // כחול - התחלה
                    break;
                case 'processing':
                case 'analyzing':
                    progressBar.style.backgroundColor = '#28a745'; // ירוק - עיבוד
                    break;
                case 'completed':
                    progressBar.style.backgroundColor = '#28a745'; // ירוק - הושלם
                    break;
                case 'error':
                case 'not_found':
                    progressBar.style.backgroundColor = '#dc3545'; // אדום - שגיאה
                    break;
            }
        }
    }
}

        function displayAttendanceFinalResult(result) {
            if (!attendanceResultContent) return;

            const isSuccess = result.success;
            const personName = result.person_name || 'לא ידוע';
            const message = result.message;

            attendanceResultContent.innerHTML = `
                <div class="${isSuccess ? 'result-success' : 'result-error'}">
                    <i class="fas fa-${isSuccess ? 'check-circle' : 'times-circle'}"></i>
                    ${isSuccess ? 'נמצאה התאמה!' : 'לא נמצאה התאמה'}
                </div>
                <div style="margin-top: 15px; font-size: 16px;">
                    <strong>פרטים:</strong> ${message}
                </div>
                ${isSuccess ? `<div style="margin-top: 10px; color: var(--success-color);">
                    <strong>שם האדם:</strong> ${personName}
                </div>` : ''}
            `;
        }

        function displayAttendanceError(message) {
            if (!attendanceResultContent) return;

            attendanceResultContent.innerHTML = `
                <div class="result-error">
                    <i class="fas fa-exclamation-triangle"></i>
                    שגיאה בבדיקה
                </div>
                <div style="margin-top: 15px;">
                    <strong>פרטים:</strong> ${message}
                </div>
            `;
        }

        function updateAttendanceUI(status) {
            if (!checkPersonAttendanceBtn || !cancelAttendanceBtn) return;

            const progressBar = document.querySelector('.progress-bar');

            switch (status) {
                case 'running':
                    checkPersonAttendanceBtn.disabled = true;
                    checkPersonAttendanceBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> מבצע בדיקה...';
                    cancelAttendanceBtn.style.display = 'inline-block';
                    if (progressBar) progressBar.className = 'progress-bar';
                    break;
                case 'completed':
                    checkPersonAttendanceBtn.disabled = false;
                    checkPersonAttendanceBtn.innerHTML = '<i class="fas fa-user-check"></i> בדוק נוכחות';
                    cancelAttendanceBtn.style.display = 'none';
                    if (progressBar) progressBar.className = 'progress-bar completed';
                    if (attendanceStatusText) attendanceStatusText.textContent = 'בדיקה הושלמה';
                    break;
                case 'error':
                    checkPersonAttendanceBtn.disabled = false;
                    checkPersonAttendanceBtn.innerHTML = '<i class="fas fa-user-check"></i> בדוק נוכחות';
                    cancelAttendanceBtn.style.display = 'none';
                    if (progressBar) progressBar.className = 'progress-bar error';
                    if (attendanceStatusText) attendanceStatusText.textContent = 'שגיאה בבדיקה';
                    break;
                default: // idle
                    checkPersonAttendanceBtn.disabled = false;
                    checkPersonAttendanceBtn.innerHTML = '<i class="fas fa-user-check"></i> בדוק נוכחות';
                    cancelAttendanceBtn.style.display = 'none';
                    break;
            }
        }

        function showAttendanceResultArea() {
            if (attendanceResultArea) {
                attendanceResultArea.style.display = 'block';
                attendanceResultContent.innerHTML = '<div class="result-processing">מתחיל בדיקת זיהוי פנים...</div>';
            }
        }
        function showAttendanceResultArea() {
    const attendanceResultArea = document.getElementById('attendance-result-area');

    if (attendanceResultArea) {
        // הצגת האזור
        attendanceResultArea.style.display = 'block';

        // עדכון הפס הירוק - התחלה
        const progressBar = document.querySelector('.progress-bar');
        if (progressBar) {
            progressBar.style.width = '0%';
            progressBar.style.backgroundColor = '#28a745';
            progressBar.style.transition = 'width 0.5s ease';
        }

        // עדכון הטקסט הנכון
        const statusText = document.getElementById('attendance-status-text');
        if (statusText) {
            statusText.textContent = 'מתחיל בדיקת זיהוי פנים...';
        }

        // ניקוי תוכן התוצאה
        const attendanceResultContent = document.getElementById('attendance-result-content');
        if (attendanceResultContent) {
            attendanceResultContent.innerHTML = '';
        }

        console.log('📱 אזור התוצאות מוצג עם פס ירוק');
    }
}

        function hideAttendanceResultArea() {
            if (attendanceResultArea) {
                attendanceResultArea.style.display = 'none';
            }
        }

        // ניקוי כשעוזבים את הדף
        window.addEventListener('beforeunload', function() {
            stopAttendanceStatusChecking();
        });

        // בסוף הקובץ, לפני הסוגר האחרון, הוסף:
    async function showPersonInfo(personNumber) {
        try {
            const response = await fetch('/api/people');
            const people = await response.json();

            if (personNumber <= people.length && personNumber > 0) {
                const person = people[personNumber - 1];
                return `${person.first_name} ${person.last_name} (ת.ז. ${person.id})`;
            } else {
                return `אדם מספר ${personNumber} (לא נמצא ברשימה)`;
            }
        } catch (error) {
            console.error('Error getting person info:', error);
            return `אדם מספר ${personNumber}`;
        }
    }

    function loadPeopleList() {
        const loadingStatus = document.getElementById('people-loading-status');
        const peopleGrid = document.getElementById('people-grid');
        const errorDiv = document.getElementById('people-error');
        const loadingMessage = document.getElementById('loading-message');

        // הצגת סטטוס טעינה
        loadingStatus.style.display = 'flex';
        peopleGrid.style.display = 'none';
        errorDiv.style.display = 'none';
        loadingMessage.textContent = 'טוען רשימת אנשים...';

        // בקשה לשרת
        fetch('/api/get_loaded_people')
            .then(response => response.json())
            .then(data => {
                if (data.success && data.people && data.people.length > 0) {
                    loadedPeople = data.people;
                    displayPeopleGrid(data.people);
                    loadingStatus.style.display = 'none';
                    peopleGrid.style.display = 'grid';
                    console.log(`✅ נטענו ${data.people.length} אנשים בהצלחה`);
                } else {
                    showPeopleError(data.message || 'לא נמצאו אנשים במערכת');
                }
            })
            .catch(error => {
                console.error('שגיאה בטעינת אנשים:', error);
                showPeopleError('שגיאה בחיבור לשרת');
            });
    }

    function displayPeopleGrid(people) {
        const peopleGrid = document.getElementById('people-grid');
        peopleGrid.innerHTML = '';

        people.forEach((person, index) => {
            const personCard = document.createElement('div');
            personCard.className = 'person-card';
            personCard.dataset.personNumber = index + 1;
            personCard.dataset.personId = person.id_number;

            personCard.innerHTML = `
                <div class="person-info">
                    <div class="person-name">${person.full_name}</div>
                    <div class="person-id">ת.ז. ${person.id_number}</div>
                </div>
                <div class="person-number">${index + 1}</div>
            `;

            // הוספת מאזין אירועים לקליק
            personCard.addEventListener('click', function() {
                selectPerson(this, index + 1, person);
            });

            peopleGrid.appendChild(personCard);
        });
    }

    function selectPerson(cardElement, personNumber, personData) {
        // הסרת בחירה קודמת
        document.querySelectorAll('.person-card').forEach(card => {
            card.classList.remove('selected');
        });

        // בחירת הקלף הנוכחי
        cardElement.classList.add('selected');
        selectedPersonNumber = personNumber;

        // הפעלת כפתור הבדיקה
        const checkButton = document.getElementById('check-person-attendance');
        checkButton.disabled = false;
        checkButton.innerHTML = `<i class="fas fa-user-check"></i> בדוק נוכחות: ${personData.full_name}`;

        console.log(`נבחר: ${personData.full_name} (מספר ${personNumber})`);
    }

    function showPeopleError(message) {
        const loadingStatus = document.getElementById('people-loading-status');
        const peopleGrid = document.getElementById('people-grid');
        const errorDiv = document.getElementById('people-error');

        loadingStatus.style.display = 'none';
        peopleGrid.style.display = 'none';
        errorDiv.style.display = 'block';

        errorDiv.querySelector('span').textContent = message;
    }


    function startAttendanceCheckWithSelectedPerson(personNumber) {
        // שימוש בפונקציה הקיימת אבל עם המספר שנבחר
        console.log(`מתחיל בדיקת נוכחות לאדם מספר ${personNumber}`);

        // אם יש לך פונקציה קיימת לבדיקת נוכחות, קרא לה כאן
        // או השתמש בקוד המקורי עם המספר החדש
        if (typeof startAttendanceCheck === 'function') {
            // שינוי הערך בשדה הקלט הישן (אם עדיין קיים)
            const oldInput = document.getElementById('person-number-input');
            if (oldInput) {
                oldInput.value = personNumber;
            }

            startAttendanceCheck();
        } else {
            // אם אין פונקציה קיימת, נשתמש באותה לוגיקה כמו הקוד המקורי
            const personNumber = selectedPersonNumber;

            if (personNumber < 1 || personNumber > 20) {
                showNotification('אנא בחר מספר בין 1 ל-20', 'error');
                return;
            }

            // השאר את הקוד המקורי לבדיקת הנוכחות...
            // (אותה לוגיקה כמו שהיה בקוד המקורי)
        }
    }

    // פונקציה לרענון רשימת האנשים (אם רוצים כפתור רענון)
    function refreshPeopleList() {
        fetch('/api/refresh_people', {
            method: 'POST'
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showNotification('מרענן רשימת אנשים...', 'info');
                // המתנה קצרה ואז טעינה מחדש
                setTimeout(loadPeopleList, 2000);
            }
        })
        .catch(error => {
            console.error('שגיאה ברענון:', error);
            showNotification('שגיאה ברענון רשימת אנשים', 'error');
        });
    }

    // פונקציה לקבלת האדם שנבחר
    function getSelectedPersonNumber() {
        return selectedPersonNumber;
    }

    // יצוא פונקציות לשימוש גלובלי
    window.loadPeopleList = loadPeopleList;
    window.refreshPeopleList = refreshPeopleList;
    window.getSelectedPersonNumber = getSelectedPersonNumber;
    });