/**
 * ==================== CAMERAS MANAGEMENT JAVASCRIPT ====================
 * קובץ JavaScript ספציפי לדף ניהול מצלמות ותמונות מטרה
 *
 * מכיל:
 * - ניהול תמונות מטרה (העלאה, מחיקה, עדכון)
 * - בקרת מצלמות מרובות (הפעלה, עצירה, צילום)
 * - גלריית תמונות מטרה
 * - הגדרות מצלמה מתקדמות
 *
 * ⚠️ דרישה: הקובץ מצפה לפונקציה getCurrentSchoolIndex() שמחזירה את מזהה בית הספר
 */

// ==================== GLOBAL VARIABLES ====================

// נתוני תמונות מטרה
let targetImages = [];

// קבצים נבחרים להעלאה
let selectedFiles = [];

// מצב המצלמות (עד 4 מצלמות)
let cameras = {
    1: { isActive: false, stream: null, videoElement: null, settings: null },
    2: { isActive: false, stream: null, videoElement: null, settings: null },
    3: { isActive: false, stream: null, videoElement: null, settings: null },
    4: { isActive: false, stream: null, videoElement: null, settings: null }
};

// הגדרות ברירת מחדל למצלמה
const defaultCameraSettings = {
    resolution: '1280x720',
    fps: 30,
    autoCapture: false,
    captureInterval: 5
};

// טיימרים לצילום אוטומטי
let autoCaptureTimers = {};

// ==================== INITIALIZATION ====================

/**
 * אתחול דף מצלמות
 */
async function initializeCameras() {
    console.log('📷 מאתחל דף מצלמות...');

    // בדיקת התחברות
    if (!isUserLoggedIn()) {
        console.log('🔒 משתמש לא מחובר - מפנה להתחברות');
        showNotification('נדרשת התחברות לגישה לדף זה', 'warning');
        setTimeout(() => window.location.href = '/login', 1500);
        return;
    }

    // הגדרת מאזיני אירועים
    initializeCamerasEventListeners();

    // בדיקת תמיכה במצלמה
    checkCameraSupport();

    // טעינת נתונים ראשוניים
    const serverOk = await checkServerConnection();
    if (serverOk) {
        await loadTargetImages();
    }

    console.log('✅ דף מצלמות אותחל בהצלחה');
}

/**
 * הגדרת מאזיני אירועים לדף מצלמות
 */
function initializeCamerasEventListeners() {
    // בחירת קבצים
    const fileInput = document.getElementById('target-file-input');
    if (fileInput) {
        fileInput.addEventListener('change', handleTargetFileSelection);
    }

    // drag and drop לקבצים
    setupDragAndDrop();

    console.log('🎯 מאזיני אירועים למצלמות הוגדרו');
}

/**
 * הגדרת drag and drop
 */
function setupDragAndDrop() {
    const uploadArea = document.querySelector('.upload-area');
    if (!uploadArea) return;

    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        uploadArea.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    ['dragenter', 'dragover'].forEach(eventName => {
        uploadArea.addEventListener(eventName, highlight, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        uploadArea.addEventListener(eventName, unhighlight, false);
    });

    function highlight() {
        uploadArea.classList.add('drag-over');
    }

    function unhighlight() {
        uploadArea.classList.remove('drag-over');
    }

    uploadArea.addEventListener('drop', handleDrop, false);

    function handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        handleFileSelection(files);
    }
}

// ==================== MULTIPLE CAMERAS MANAGEMENT ====================

/**
 * הוספת מצלמה חדשה
 */
async function addNewCamera(slotId) {
    console.log(`📹 מוסיף מצלמה חדשה לחריץ ${slotId}`);

    if (!requireLogin('הוספת מצלמה')) return;
    if (!checkCameraSupport()) return;

    const slot = document.getElementById(`camera-slot-${slotId}`);
    if (!slot) return;

    // אתחול הגדרות המצלמה
    cameras[slotId].settings = { ...defaultCameraSettings };

    try {
        // בקש גישה למצלמה
        const resolution = cameras[slotId].settings.resolution.split('x');
        const width = parseInt(resolution[0]);
        const height = parseInt(resolution[1]);

        const stream = await navigator.mediaDevices.getUserMedia({
            video: {
                width: { ideal: width },
                height: { ideal: height },
                frameRate: { ideal: cameras[slotId].settings.fps }
            }
        });

        cameras[slotId].stream = stream;
        cameras[slotId].isActive = true;

        // יצירת תוכן המצלמה
        const cameraContent = createCameraContent(slotId, stream);
        slot.innerHTML = '';
        slot.appendChild(cameraContent);
        slot.classList.add('camera-active');

        showNotification(`מצלמה ${slotId} הופעלה בהצלחה`, 'success');
        console.log(`✅ מצלמה ${slotId} פעילה`);

        // הפעלת צילום אוטומטי אם מופעל
        if (cameras[slotId].settings.autoCapture) {
            startAutoCapture(slotId);
        }

    } catch (error) {
        console.error(`❌ שגיאה בהפעלת מצלמה ${slotId}:`, error);

        let errorMessage = 'שגיאה בהפעלת המצלמה';
        if (error.name === 'NotAllowedError') {
            errorMessage = 'נדרשת הרשאה לשימוש במצלמה';
        } else if (error.name === 'NotFoundError') {
            errorMessage = 'לא נמצאה מצלמה במכשיר';
        }

        showNotification(errorMessage, 'error');
    }
}

/**
 * יצירת תוכן המצלמה
 */
function createCameraContent(slotId, stream) {
    const content = document.createElement('div');
    content.className = 'camera-content';
    content.innerHTML = `
        <video class="camera-feed" autoplay muted></video>
        <div class="camera-overlay">
            <div class="camera-status">
                <div class="status-light active"></div>
                <span>מצלמה ${slotId} פעילה</span>
            </div>
            <div class="camera-info">
                <div>מצלמה ${slotId}</div>
                <div id="camera-timestamp-${slotId}">--:--</div>
            </div>
        </div>
        <div class="camera-controls">
            <button class="camera-control-btn success" onclick="captureFromCamera(${slotId})" title="צלם תמונה">
                <i class="fas fa-camera"></i>
            </button>
            <button class="camera-control-btn" onclick="toggleCameraSettings(${slotId})" title="הגדרות">
                <i class="fas fa-cog"></i>
            </button>
            <button class="camera-control-btn danger" onclick="removeCamera(${slotId})" title="הסר מצלמה">
                <i class="fas fa-times"></i>
            </button>
        </div>
        <div class="camera-settings" id="camera-settings-${slotId}" style="display: none;">
            <label>רזולוציה:</label>
            <select onchange="updateCameraSettings(${slotId}, 'resolution', this.value)">
                <option value="640x480">640x480</option>
                <option value="1280x720" selected>1280x720 (HD)</option>
                <option value="1920x1080">1920x1080 (Full HD)</option>
            </select>
            <label>FPS:</label>
            <select onchange="updateCameraSettings(${slotId}, 'fps', this.value)">
                <option value="15">15</option>
                <option value="24">24</option>
                <option value="30" selected>30</option>
            </select>
            <label>
                <input type="checkbox" onchange="toggleAutoCapture(${slotId}, this.checked)"> צילום אוטומטי
            </label>
            <label>מרווח (שניות):</label>
            <input type="number" value="5" min="1" max="60" onchange="updateCameraSettings(${slotId}, 'captureInterval', this.value)">
        </div>
    `;

    // חיבור הזרם לוידאו
    const video = content.querySelector('.camera-feed');
    video.srcObject = stream;
    cameras[slotId].videoElement = video;

    // התחלת timestamp
    startCameraTimestamp(slotId);

    return content;
}

/**
 * הסרת מצלמה
 */
function removeCamera(slotId) {
    console.log(`🗑️ מסיר מצלמה ${slotId}`);

    const confirmed = confirm(`האם להסיר מצלמה ${slotId}?`);
    if (!confirmed) return;

    // עצירת הזרם
    if (cameras[slotId].stream) {
        cameras[slotId].stream.getTracks().forEach(track => track.stop());
        cameras[slotId].stream = null;
    }

    // עצירת צילום אוטומטי
    stopAutoCapture(slotId);

    // עצירת timestamp
    stopCameraTimestamp(slotId);

    // איפוס המצלמה
    cameras[slotId].isActive = false;
    cameras[slotId].videoElement = null;
    cameras[slotId].settings = null;

    // החזרת placeholder
    const slot = document.getElementById(`camera-slot-${slotId}`);
    if (slot) {
        slot.innerHTML = `
            <div class="add-camera-placeholder" onclick="addNewCamera(${slotId})">
                <div class="add-camera-icon">
                    <i class="fas fa-plus"></i>
                </div>
                <div class="add-camera-text">הוסף מצלמה</div>
            </div>
        `;
        slot.classList.remove('camera-active');
    }

    showNotification(`מצלמה ${slotId} הוסרה`, 'info');
}

/**
 * צילום תמונה ממצלמה ספציפית
 */
async function captureFromCamera(slotId) {
    if (!cameras[slotId].isActive || !cameras[slotId].videoElement) {
        showNotification(`מצלמה ${slotId} לא פעילה`, 'warning');
        return;
    }

    try {
        const video = cameras[slotId].videoElement;
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        // צילום הפריים הנוכחי
        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        // המרה ל-blob
        canvas.toBlob(async (blob) => {
            try {
                // העלאה זמנית לקבלת URL
                const formData = new FormData();
                formData.append('image', blob, `camera_${slotId}_${Date.now()}.jpg`);

                const tempResponse = await fetch('/api/upload_temp_image', {
                    method: 'POST',
                    body: formData
                });

                const tempData = await tempResponse.json();

                if (tempData.success) {
                    // יצירת target עם ה-URL
                    const schoolIndex = getCurrentSchoolIndex();
                    const targetPayload = {
                        school_index: schoolIndex,
                        camera_number: Date.now() + slotId,
                        image_url: tempData.image_url
                    };

                    const targetResponse = await fetch('/api/target-images', {
                        method: 'POST',
                        headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify(targetPayload)
                    });

                    const targetData = await targetResponse.json();

                    if (targetData.success) {
                        showNotification(`תמונה נוספה לגלריית המטרה ממצלמה ${slotId}`, 'success');
                        // רענון הגלריה
                        await loadTargetImages();
                        console.log(`📸 תמונה צולמה ממצלמה ${slotId} ונוספה לגלריית המטרה`);
                    } else {
                        showNotification('שגיאה בשמירת התמונה לגלריית המטרה', 'error');
                    }
                } else {
                    showNotification('שגיאה בהעלאת התמונה', 'error');
                }

            } catch (error) {
                console.error(`❌ שגיאה בשמירת תמונה ממצלמה ${slotId}:`, error);
                showNotification('שגיאה בשמירת התמונה', 'error');
            }
        }, 'image/jpeg', 0.8);

    } catch (error) {
        console.error(`❌ שגיאה בצילום ממצלמה ${slotId}:`, error);
        showNotification('שגיאה בצילום תמונה', 'error');
    }
}

/**
 * הצגה/הסתרה של הגדרות מצלמה
 */
function toggleCameraSettings(slotId) {
    const settings = document.getElementById(`camera-settings-${slotId}`);
    if (settings) {
        settings.style.display = settings.style.display === 'none' ? 'block' : 'none';
    }
}

/**
 * עדכון הגדרות מצלמה
 */
function updateCameraSettings(slotId, setting, value) {
    if (!cameras[slotId].settings) return;

    cameras[slotId].settings[setting] = setting === 'fps' || setting === 'captureInterval' ? parseInt(value) : value;

    console.log(`⚙️ הגדרות מצלמה ${slotId} עודכנו:`, cameras[slotId].settings);

    // אם זה שינוי רזולוציה או FPS, הפעל מחדש את המצלמה
    if (setting === 'resolution' || setting === 'fps') {
        showNotification(`מעדכן הגדרות מצלמה ${slotId}...`, 'info');
        removeCamera(slotId);
        setTimeout(() => addNewCamera(slotId), 1000);
    }

    // אם זה שינוי במרווח צילום, עדכן את הטיימר
    if (setting === 'captureInterval' && cameras[slotId].settings.autoCapture) {
        stopAutoCapture(slotId);
        startAutoCapture(slotId);
    }
}

/**
 * הפעלת/ביטול צילום אוטומטי
 */
function toggleAutoCapture(slotId, enabled) {
    cameras[slotId].settings.autoCapture = enabled;

    if (enabled && cameras[slotId].isActive) {
        startAutoCapture(slotId);
        showNotification(`צילום אוטומטי הופעל עבור מצלמה ${slotId}`, 'info');
    } else {
        stopAutoCapture(slotId);
        showNotification(`צילום אוטומטי בוטל עבור מצלמה ${slotId}`, 'info');
    }
}

/**
 * התחלת צילום אוטומטי
 */
function startAutoCapture(slotId) {
    if (autoCaptureTimers[slotId]) {
        clearInterval(autoCaptureTimers[slotId]);
    }

    const interval = cameras[slotId].settings.captureInterval * 1000;
    autoCaptureTimers[slotId] = setInterval(() => {
        captureFromCamera(slotId);
    }, interval);

    console.log(`🔄 צילום אוטומטי הופעל עבור מצלמה ${slotId} (כל ${cameras[slotId].settings.captureInterval} שניות)`);
}

/**
 * עצירת צילום אוטומטי
 */
function stopAutoCapture(slotId) {
    if (autoCaptureTimers[slotId]) {
        clearInterval(autoCaptureTimers[slotId]);
        autoCaptureTimers[slotId] = null;
        console.log(`⏹️ צילום אוטומטי הופסק עבור מצלמה ${slotId}`);
    }
}

/**
 * התחלת עדכון timestamp למצלמה
 */
function startCameraTimestamp(slotId) {
    const timestampElement = document.getElementById(`camera-timestamp-${slotId}`);
    if (!timestampElement) return;

    const updateTime = () => {
        const now = new Date();
        timestampElement.textContent = formatHebrewTime(now);
    };

    updateTime(); // עדכון מיידי
    cameras[slotId].timestampInterval = setInterval(updateTime, 1000);
}

/**
 * עצירת עדכון timestamp למצלמה
 */
function stopCameraTimestamp(slotId) {
    if (cameras[slotId].timestampInterval) {
        clearInterval(cameras[slotId].timestampInterval);
        cameras[slotId].timestampInterval = null;
    }
}

// ==================== TARGET IMAGES MANAGEMENT ====================

/**
 * טעינת תמונות מטרה מהשרת
 */
async function loadTargetImages() {
    console.log('🔄 טוען תמונות מטרה...');

    try {
        const schoolIndex = getCurrentSchoolIndex();
        const url = `/api/get_target_images?school_index=${schoolIndex}`;

        const response = await fetch(url);
        const data = await response.json();

        console.log('📡 תגובת שרת לתמונות מטרה:', data);

        const galleryGrid = document.getElementById('target-gallery-grid');
        const galleryStats = document.getElementById('target-gallery-stats');

        if (!galleryGrid) {
            console.error('❌ לא נמצא אלמנט target-gallery-grid');
            return;
        }

        galleryGrid.innerHTML = '';

        if (data.success && data.targets && data.targets.length > 0) {
            targetImages = data.targets;
            console.log(`📊 נמצאו ${targetImages.length} targets`);

            // עדכון סטטיסטיקות
            let totalImages = targetImages.length;
            if (galleryStats) {
                galleryStats.textContent = `${totalImages} תמונות מטרה`;
            }

            // יצירת הגלריה
            targetImages.forEach((target, index) => {
                console.log(`🎯 מעבד target ${index}:`, target);

                if (target.image_url) {
                    const card = createTargetImageCard(target, index);
                    galleryGrid.appendChild(card);
                }
            });

            // הוספת מאזיני צ'קבוקסים
            attachCheckboxListeners();

            console.log(`✅ הוצגו ${totalImages} תמונות מטרה`);

        } else {
            // מצב ריק
            targetImages = [];
            console.log('📭 אין תמונות מטרה');

            if (galleryStats) {
                galleryStats.textContent = 'אין תמונות מטרה';
            }

            galleryGrid.innerHTML = `
                <div class="empty-gallery" style="grid-column: 1 / -1; width: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center;">
                    <div class="empty-icon">📷</div>
                    <h3>אין תמונות מטרה</h3>
                    <p>העלה תמונות או צלם ממצלמה כדי להתחיל</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('❌ שגיאה בטעינת תמונות מטרה:', error);
        showNotification('שגיאה בטעינת תמונות מטרה', 'error');
        displayGalleryError();
    }
}

/**
 * יצירת כרטיס תמונת מטרה
 */
function createTargetImageCard(target, index) {
    const card = document.createElement('div');
    card.className = 'target-image-card';
    card.innerHTML = `
        <div class="target-image-wrapper">
            <input type="checkbox" class="target-checkbox"
                   data-camera="${target.camera_number}"
                   data-index="${index}">
            <img src="${target.image_url}"
                 alt="מצלמה ${target.camera_number}"
                 loading="lazy"
                 onerror="this.src='/web_static/img/error-placeholder.jpg'">
            <div class="target-image-overlay">
                <button class="target-action-btn" onclick="viewTargetImage('${target.image_url}')" title="צפה בתמונה">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="target-action-btn delete" onclick="deleteSingleTarget(${target.camera_number})" title="מחק תמונה">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
        <div class="target-image-info">
            <div class="target-camera-number">מצלמה ${target.camera_number}</div>
            <div class="target-timestamp">${formatUploadTime(target.created_at)}</div>
        </div>
    `;
    return card;
}

/**
 * הצגת שגיאה בגלריה
 */
function displayGalleryError() {
    const galleryGrid = document.getElementById('target-gallery-grid');
    const galleryStats = document.getElementById('target-gallery-stats');

    if (galleryStats) {
        galleryStats.textContent = 'שגיאה בטעינה';
    }

    if (galleryGrid) {
        galleryGrid.innerHTML = `
            <div class="gallery-error" style="grid-column: 1 / -1; width: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center;">
                <div class="error-icon">❌</div>
                <h3>שגיאה בטעינת התמונות</h3>
                <button onclick="loadTargetImages()" class="retry-btn">נסה שוב</button>
            </div>
        `;
    }
}

/**
 * טיפול בבחירת קבצים לתמונות מטרה
 */
function handleTargetFileSelection(event) {
    const files = event.target.files;
    handleFileSelection(files);
}

/**
 * טיפול בבחירת קבצים (מעבד גם drag&drop)
 */
function handleFileSelection(files) {
    if (files.length > 0) {
        selectedFiles = Array.from(files);
        console.log(`נבחרו ${selectedFiles.length} קבצים לתמונות מטרה`);

        updateUploadAreaWithPreview();
        updateUploadButton();
    } else {
        clearFileSelection();
    }
}

/**
 * עדכון אזור ההעלאה עם תצוגה מקדימה
 */
function updateUploadAreaWithPreview() {
    const uploadArea = document.querySelector('.upload-area');
    if (!uploadArea) return;

    let previewHTML = `
        <div class="upload-preview">
            <div class="upload-icon">📁</div>
            <div class="upload-text">נבחרו ${selectedFiles.length} קבצים</div>
            <div class="upload-hint">לחץ "העלה קבצים" להמשיך או בחר קבצים נוספים</div>
            <div class="selected-files">
    `;

    selectedFiles.forEach((file, index) => {
        const fileSize = (file.size / 1024 / 1024).toFixed(2);
        const isImage = file.type.startsWith('image/');
        const isVideo = file.type.startsWith('video/');

        let fileIcon = '📄';
        if (isImage) fileIcon = '🖼️';
        else if (isVideo) fileIcon = '🎥';

        previewHTML += `
            <div class="file-preview-item">
                <span class="file-icon">${fileIcon}</span>
                <div class="file-info">
                    <div class="file-name">${file.name}</div>
                    <div class="file-details">${fileSize} MB • ${file.type}</div>
                </div>
                <button class="remove-file-btn" onclick="removeFileFromSelection(${index})" title="הסר קובץ">×</button>
            </div>
        `;
    });

    previewHTML += `
            </div>
        </div>
    `;

    uploadArea.innerHTML = previewHTML;
    uploadArea.classList.add('has-files');
}

/**
 * איפוס בחירת קבצים
 */
function clearFileSelection() {
    selectedFiles = [];
    const fileInput = document.getElementById('target-file-input');
    if (fileInput) fileInput.value = '';

    const uploadArea = document.querySelector('.upload-area');
    if (uploadArea) {
        uploadArea.innerHTML = `
            <div class="upload-icon">📁</div>
            <div class="upload-text">לחץ כאן או גרור קבצים להעלאה</div>
            <div class="upload-hint">תמיכה בתמונות וסרטונים (JPG, PNG, MP4, וכו')</div>
        `;
        uploadArea.classList.remove('has-files', 'drag-over');
    }

    updateUploadButton();
}

/**
 * הסרת קובץ ספציפי מהבחירה
 */
function removeFileFromSelection(indexToRemove) {
    selectedFiles = selectedFiles.filter((_, index) => index !== indexToRemove);

    if (selectedFiles.length > 0) {
        updateUploadAreaWithPreview();
    } else {
        clearFileSelection();
    }

    updateUploadButton();
    console.log(`הוסר קובץ. נותרו ${selectedFiles.length} קבצים`);
}

/**
 * עדכון כפתור העלאה
 */
function updateUploadButton() {
    const uploadBtn = document.querySelector('.target-btn-upload');
    if (!uploadBtn) return;

    if (selectedFiles.length > 0) {
        uploadBtn.textContent = `📤 העלה ${selectedFiles.length} קבצים`;
        uploadBtn.disabled = false;
        uploadBtn.classList.remove('disabled');
    } else {
        uploadBtn.textContent = '📤 בחר קבצים תחילה';
        uploadBtn.disabled = true;
        uploadBtn.classList.add('disabled');
    }
}

/**
 * העלאת תמונות מטרה
 */
async function uploadTargetFiles() {
    if (!requireLogin('העלאת תמונות מטרה')) return;

    if (selectedFiles.length === 0) {
        showNotification('נא לבחור קבצים', 'error');
        return;
    }

    const schoolIndex = getCurrentSchoolIndex();
    console.log(`📤 מעלה ${selectedFiles.length} תמונות מטרה עבור בית ספר: ${schoolIndex}...`);

    const loading = document.getElementById('target-loading');
    if (loading) loading.style.display = 'flex';

    try {
        let successCount = 0;
        let errorCount = 0;

        for (let i = 0; i < selectedFiles.length; i++) {
            const file = selectedFiles[i];
            console.log(`📷 מעלה קובץ ${i + 1}/${selectedFiles.length}: ${file.name}`);

            try {
                // העלאה זמנית לקבלת URL
                const formData = new FormData();
                formData.append('image', file);

                const tempResponse = await fetch('/api/upload_temp_image', {
                    method: 'POST',
                    body: formData
                });

                const tempData = await tempResponse.json();

                if (tempData.success) {
                    console.log(`✅ העלאה זמנית הצליחה עבור ${file.name}:`, tempData);

                    // יצירת target עם ה-URL
                    const targetPayload = {
                        school_index: schoolIndex,
                        camera_number: Date.now() + i,
                        image_url: tempData.image_url
                    };

                    const targetResponse = await fetch('/api/target-images', {
                        method: 'POST',
                        headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify(targetPayload)
                    });

                    const targetData = await targetResponse.json();

                    if (targetData.success) {
                        successCount++;
                        console.log(`✅ הועלה בהצלחה: ${file.name}`);
                    } else {
                        errorCount++;
                        console.error(`❌ שגיאה ביצירת target עבור ${file.name}:`, targetData.error);
                    }
                } else {
                    errorCount++;
                    console.error(`❌ שגיאה בהעלאה זמנית של ${file.name}:`, tempData.error);
                }

            } catch (fileError) {
                errorCount++;
                console.error(`❌ שגיאה בעיבוד ${file.name}:`, fileError);
            }

            // השהיה קצרה בין קבצים
            if (i < selectedFiles.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 200));
            }
        }

        // הודעת סיכום
        if (successCount > 0 && errorCount === 0) {
            showNotification(`🎉 הועלו ${successCount} תמונות מטרה בהצלחה!`, 'success');
        } else if (successCount > 0 && errorCount > 0) {
            showNotification(`⚠️ הועלו ${successCount} תמונות, נכשלו ${errorCount}`, 'warning');
        } else {
            showNotification(`❌ כל ההעלאות נכשלו`, 'error');
        }

        // איפוס וטעינה מחדש
        clearFileSelection();
        await loadTargetImages();

    } catch (error) {
        console.error('שגיאה כללית בהעלאת תמונות מטרה:', error);
        showNotification('שגיאה בהעלאת תמונות מטרה', 'error');
    } finally {
        if (loading) loading.style.display = 'none';
    }
}

// ==================== TARGET IMAGES ACTIONS ====================

/**
 * הוספת מאזיני צ'קבוקסים
 */
function attachCheckboxListeners() {
    document.querySelectorAll('.target-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', updateDeleteButton);
    });
}

/**
 * עדכון מצב כפתור מחיקה
 */
function updateDeleteButton() {
    const deleteBtn = document.getElementById('target-delete-btn');
    const checkedBoxes = document.querySelectorAll('.target-checkbox:checked');

    if (deleteBtn) {
        if (checkedBoxes.length > 0) {
            deleteBtn.disabled = false;
            deleteBtn.classList.remove('disabled');
            deleteBtn.textContent = `🗑️ מחק ${checkedBoxes.length} נבחרים`;
        } else {
            deleteBtn.disabled = true;
            deleteBtn.classList.add('disabled');
            deleteBtn.textContent = '🗑️ מחק נבחרים';
        }
    }
}

/**
 * בחירת כל התמונות
 */
function selectAllTargets() {
    document.querySelectorAll('.target-checkbox').forEach(checkbox => {
        checkbox.checked = true;
    });
    updateDeleteButton();
}

/**
 * ביטול בחירת כל התמונות
 */
function deselectAllTargets() {
    document.querySelectorAll('.target-checkbox').forEach(checkbox => {
        checkbox.checked = false;
    });
    updateDeleteButton();
}

/**
 * רענון גלריית תמונות מטרה
 */
async function refreshTargetGallery() {
    showNotification('מרענן גלריה...', 'info', 2000);
    await loadTargetImages();
    showNotification('גלריה עודכנה', 'success', 2000);
}

/**
 * מחיקת תמונות מטרה נבחרות
 */
async function deleteSelectedTargets() {
    if (!requireLogin('מחיקת תמונות מטרה')) return;

    const checkedBoxes = document.querySelectorAll('.target-checkbox:checked');

    if (checkedBoxes.length === 0) {
        showNotification('לא נבחרו תמונות למחיקה', 'error');
        return;
    }

    const confirmed = confirm(`האם למחוק ${checkedBoxes.length} תמונות?`);
    if (!confirmed) return;

    try {
        const schoolIndex = getCurrentSchoolIndex();
        const cameraNumbers = Array.from(checkedBoxes).map(cb =>
            parseInt(cb.getAttribute('data-camera'))
        );

        for (const cameraNumber of new Set(cameraNumbers)) {
            const response = await fetch(`/api/targets/${cameraNumber}`, {
                method: 'DELETE',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ school_index: schoolIndex })
            });

            if (!response.ok) {
                throw new Error(`Failed to delete camera ${cameraNumber}`);
            }
        }

        showNotification(`נמחקו תמונות בהצלחה`, 'success');
        await loadTargetImages();
        updateDeleteButton();

    } catch (error) {
        console.error('שגיאה במחיקת תמונות:', error);
        showNotification('שגיאה במחיקת תמונות', 'error');
    }
}

/**
 * מחיקת תמונת מטרה בודדת
 */
async function deleteSingleTarget(cameraNumber) {
    if (!requireLogin('מחיקת תמונת מטרה')) return;

    const confirmed = confirm('האם למחוק תמונה זו?');
    if (!confirmed) return;

    try {
        const schoolIndex = getCurrentSchoolIndex();
        const response = await fetch(`/api/targets/${cameraNumber}`, {
            method: 'DELETE',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ school_index: schoolIndex })
        });

        if (handleApiResponse(response, await response.json())) {
            showNotification('תמונה נמחקה בהצלחה', 'success');
            await loadTargetImages();
        }
    } catch (error) {
        console.error('שגיאה במחיקת תמונה:', error);
        showNotification('שגיאה במחיקת תמונה', 'error');
    }
}

/**
 * צפייה בתמונת מטרה
 */
function viewTargetImage(imageUrl) {
    // יצירת modal לצפייה בתמונה
    const modal = document.createElement('div');
    modal.className = 'image-viewer-modal';
    modal.innerHTML = `
        <div class="image-viewer-content">
            <span class="image-viewer-close">&times;</span>
            <img src="${imageUrl}" alt="תמונת מטרה" class="viewer-image">
        </div>
    `;

    // הוספת מאזיני סגירה
    modal.addEventListener('click', (e) => {
        if (e.target === modal || e.target.classList.contains('image-viewer-close')) {
            document.body.removeChild(modal);
        }
    });

    document.body.appendChild(modal);
    modal.style.display = 'flex';
}

// ==================== UTILITY FUNCTIONS ====================

/**
 * בדיקת תמיכה במצלמה
 */
function checkCameraSupport() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.warn('⚠️ דפדפן לא תומך במצלמה');
        showNotification('הדפדפן לא תומך במצלמה', 'warning');
        return false;
    }
    return true;
}

/**
 * פורמט זמן העלאה
 */
function formatUploadTime(timestamp) {
    if (!timestamp) return 'לא זמין';

    try {
        const date = new Date(timestamp);
        return formatHebrewTime(date);
    } catch (error) {
        return 'לא זמין';
    }
}

/**
 * ניקוי משאבים כשעוזבים את הדף
 */
function cleanupCameraResources() {
    // עצירת כל המצלמות
    Object.keys(cameras).forEach(slotId => {
        if (cameras[slotId].isActive) {
            removeCamera(parseInt(slotId));
        }
    });

    // עצירת כל הטיימרים
    Object.keys(autoCaptureTimers).forEach(slotId => {
        if (autoCaptureTimers[slotId]) {
            clearInterval(autoCaptureTimers[slotId]);
        }
    });
}

// ניקוי אוטומטי
window.addEventListener('beforeunload', cleanupCameraResources);
window.addEventListener('pagehide', cleanupCameraResources);

// ==================== GLOBAL FUNCTIONS ====================
// הפונקציות האלה נקראות מה-HTML

window.addNewCamera = addNewCamera;
window.removeCamera = removeCamera;
window.captureFromCamera = captureFromCamera;
window.toggleCameraSettings = toggleCameraSettings;
window.updateCameraSettings = updateCameraSettings;
window.toggleAutoCapture = toggleAutoCapture;
window.uploadTargetFiles = uploadTargetFiles;
window.deleteSelectedTargets = deleteSelectedTargets;
window.deleteSingleTarget = deleteSingleTarget;
window.viewTargetImage = viewTargetImage;
window.removeFileFromSelection = removeFileFromSelection;
window.clearFileSelection = clearFileSelection;
window.selectAllTargets = selectAllTargets;
window.deselectAllTargets = deselectAllTargets;
window.refreshTargetGallery = refreshTargetGallery;

// ==================== DEBUG UTILITIES ====================

if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    window.debugCameras = {
        showState: () => {
            console.log('Cameras State:', cameras);
            console.log('Target Images:', targetImages);
            console.log('Selected Files:', selectedFiles);
            console.log('Auto Capture Timers:', autoCaptureTimers);
            return { cameras, targetImages, selectedFiles, autoCaptureTimers };
        },

        refreshTargets: loadTargetImages,

        testCamera: (slotId = 1) => {
            console.log('Camera Support:', checkCameraSupport());
            console.log(`Camera ${slotId} Active:`, cameras[slotId]?.isActive || false);
        },

        simulateCapture: (slotId = 1) => {
            // סימולציה של צילום ללא מצלמה אמיתית
            console.log(`Simulating capture from camera ${slotId}`);
            captureFromCamera(slotId);
        },

        addAllCameras: () => {
            // הוספת כל 4 המצלמות לבדיקה
            [1, 2, 3, 4].forEach(slotId => {
                setTimeout(() => addNewCamera(slotId), slotId * 1000);
            });
        }
    };

    console.log('🔧 כלי דיבוג זמינים: window.debugCameras');
}

// ==================== AUTO INITIALIZATION ====================

document.addEventListener('DOMContentLoaded', function() {
    console.log('📷 Cameras.js נטען');
    initializeCameras();
});

/**
 * ==================== END OF CAMERAS.JS ====================
 *
 * קובץ זה מכיל את כל הפונקציונליות לניהול מצלמות מרובות ותמונות מטרה:
 *
 * 📸 ניהול תמונות מטרה מלא
 * 🎥 תמיכה ב-4 מצלמות במקביל
 * 🔄 העברת תמונות ממצלמות לגלריית המטרה
 * ⚙️ הגדרות נפרדות לכל מצלמה
 * 📷 צילום וצילום אוטומטי למצלמה
 * 📱 ממשק רספונסיבי עם פריסת 2x2
 * 🔧 כלי דיבוג מתקדמים
 */