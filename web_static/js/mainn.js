/**
 * איפוס נתונים זמניים לאדם חדש
 */
function resetTempPersonData() {
    AppState.tempPersonData = {
        isActive: false,
        personDetails: null,
        uploadedImages: [],
        imageUrls: []
    };
    updateUploadStatus();
}

/**
 * עדכון סטטוס העלאת תמונות
 */
function updateUploadStatus() {
    const uploadedCount = AppState.tempPersonData.uploadedImages ? AppState.tempPersonData.uploadedImages.length : 0;
    const statusElement = document.getElementById('upload-status');
    const finishButton = document.getElementById('finish-upload-button');

    if (statusElement) {
        let statusText = '';
        let statusColor = '';

        if (uploadedCount === 0) {
            statusText = 'יש להעלות לפחות 3 תמונות ועד 5 תמונות בסך הכל';
            statusColor = '#e74c3c';
        } else if (uploadedCount < 3) {
            statusText = `הועלו ${uploadedCount} תמונות. יש להעלות לפחות ${3 - uploadedCount} תמונות נוספות`;
            statusColor = '#f39c12';
        } else if (uploadedCount <= 5) {
            statusText = `הועלו ${uploadedCount} תמונות. ניתן להעלות עוד ${5 - uploadedCount} תמונות או לסיים`;
            statusColor = '#27ae60';
        }

        statusElement.textContent = statusText;
        statusElement.style.color = statusColor;
    }

    // עדכון מד התקדמות
    updateProgressIndicator();

    // הצגת/הסתרת כפתור סיום
    if (finishButton) {
        if (uploadedCount >= 3 && AppState.tempPersonData.isActive) {
            finishButton.style.display = 'inline-block';
        } else {
            finishButton.style.display = 'none';
        }
    }
}

/**
 * עדכון מד התקדמות החזותי
 */
function updateProgressIndicator() {
    const uploadedCount = AppState.tempPersonData.uploadedImages ? AppState.tempPersonData.uploadedImages.length : 0;

    for (let i = 1; i <= 5; i++) {
        const step = document.getElementById(`progress-step-${i}`);
        if (step) {
            step.classList.remove('completed', 'active');

            if (i <= uploadedCount) {
                step.classList.add('completed');
            } else if (i === uploadedCount + 1 && uploadedCount < 5) {
                step.classList.add('active');
            }
        }
    }
}

/**
 * עדכון סטטוס העלאת תמונות
 */
function updateUploadStatus() {
    const uploadedCount = AppState.tempPersonData.uploadedImages ? AppState.tempPersonData.uploadedImages.length : 0;
    const statusElement = document.getElementById('upload-status');
    const finishButton = document.getElementById('finish-upload-button');

    if (statusElement) {
        let statusText = '';
        let statusColor = '';

        if (uploadedCount === 0) {
            statusText = 'יש להעלות לפחות 3 תמונות ועד 5 תמונות בסך הכל';
            statusColor = '#e74c3c';/**
 * ========================================================================
 *                    AttendMe - מערכת ניהול נוכחות
 *                      main.js - קובץ JavaScript ראשי
 * ========================================================================
 */

// ===============================================================================
//                                  GLOBAL STATE
// ===============================================================================

/**
 * מצב גלובלי של האפליקציה
 */
const AppState = {
    // נתוני אנשים
    peopleData: [],

    // נתוני תמונות מטרה
    targetImages: [],

    // נתונים זמניים ליצירת אדם חדש
    tempPersonData: {
        isActive: false,
        personDetails: null,
        uploadedImages: [],
        imageUrls: []
    },

    // הגדרות מערכת
    settings: {
        cameraId: 0,
        detectionThreshold: 0.6,
        notificationsEnabled: true
    }
};

// ===============================================================================
//                               INITIALIZATION
// ===============================================================================

/**
 * אתחול האפליקציה עם בדיקות מפורטות
 */
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 מתחיל אתחול AttendMe...');
    console.log('📍 URL נוכחי:', window.location.href);
    console.log('🏠 Origin:', window.location.origin);

    // בדיקת אלמנטים חיוניים
    checkRequiredElements();

    initializeEventListeners();
    loadInitialData();
    updateDashboard();

    console.log('✅ אתחול הושלם בהצלחה');
});

/**
 * בדיקת אלמנטים נדרשים בעמוד
 */
function checkRequiredElements() {
    const requiredElements = [
        'add-person-btn',
        'add-person-form',
        'upload-image-form',
        'people-table-body',
        'upload-status',
        'finish-upload-button'
    ];

    console.log('🔍 בודק אלמנטים נדרשים...');

    requiredElements.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            console.log(`✅ נמצא: #${id}`);
        } else {
            console.warn(`⚠️ חסר: #${id}`);
        }
    });
}

/**
 * הגדרת מאזיני אירועים
 */
function initializeEventListeners() {
    // ניווט
    setupNavigationListeners();

    // ניהול אנשים
    setupPeopleManagementListeners();

    // מודלים
    setupModalListeners();

    // הגדרות
    setupSettingsListeners();
}

// ===============================================================================
//                               NAVIGATION
// ===============================================================================

/**
 * הגדרת ניווט
 */
function setupNavigationListeners() {
    const navLinks = document.querySelectorAll('.nav-links a');

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();

            // הסרת active מכל הקישורים
            navLinks.forEach(l => l.classList.remove('active'));

            // הוספת active לקישור הנוכחי
            link.classList.add('active');

            // הצגת הסקשן המתאים
            const targetSection = link.getAttribute('href').substring(1);
            showSection(targetSection);
        });
    });
}

/**
 * הצגת סקשן ספציפי
 */
function showSection(sectionId) {
    // הסתרת כל הסקשנים
    const sections = document.querySelectorAll('.section, .hero');
    sections.forEach(section => {
        section.style.display = 'none';
    });

    // הצגת הסקשן המבוקש
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.style.display = 'block';

        // פעולות מיוחדות לפי סקשן
        switch(sectionId) {
            case 'people-management':
                loadPeopleData();
                break;
            case 'target-upload':
                loadTargetImages();
                break;
            case 'dashboard':
                updateDashboard();
                break;
        }
    }
}

// ===============================================================================
//                           PEOPLE MANAGEMENT
// ===============================================================================

/**
 * הגדרת מאזיני אירועים לניהול אנשים
 */
function setupPeopleManagementListeners() {
    // כפתור הוספת אדם
    const addPersonBtn = document.getElementById('add-person-btn');
    if (addPersonBtn) {
        addPersonBtn.addEventListener('click', () => {
            resetTempPersonData();
            showModal('add-person-modal');
        });
    }

    // טופס הוספת אדם
    const addPersonForm = document.getElementById('add-person-form');
    if (addPersonForm) {
        addPersonForm.addEventListener('submit', handleAddPerson);
    }

    // טופס העלאת תמונות
    const uploadImageForm = document.getElementById('upload-image-form');
    if (uploadImageForm) {
        uploadImageForm.addEventListener('submit', handleUploadImage);
    }

    // כפתור סיום יצירת אדם
    const finishUploadBtn = document.getElementById('finish-upload-button');
    if (finishUploadBtn) {
        finishUploadBtn.addEventListener('click', finishNewPersonCreation);
    }

    // חיפוש
    const searchInput = document.getElementById('search-people');
    if (searchInput) {
        searchInput.addEventListener('input', filterPeopleTable);
    }
}

/**
 * טיפול בהעלאת תמונה - פונקציה שחסרה
 */
async function handleUploadImage(e) {
    e.preventDefault();

    console.log('🎬 מתחיל תהליך העלאת תמונות');

    const fileInput = document.getElementById('person-image');
    if (!fileInput) {
        console.error('❌ לא נמצא אלמנט person-image');
        showNotification('שגיאה: לא נמצא שדה בחירת קובץ', 'error');
        return;
    }

    const files = fileInput.files;
    console.log('📁 קבצים שנבחרו:', files.length);

    if (!files || files.length === 0) {
        showNotification('אנא בחר תמונה להעלאה', 'warning');
        return;
    }

    // בדיקה שיש פרטי אדם
    if (!AppState.tempPersonData.personDetails) {
        console.error('❌ אין פרטי אדם זמניים');
        showNotification('שגיאה: אין פרטי אדם. התחל מחדש.', 'error');
        return;
    }

    console.log('👤 פרטי אדם זמניים:', AppState.tempPersonData.personDetails);

    // בדיקה שלא נעלו יותר מ-5 תמונות
    if (AppState.tempPersonData.uploadedImages.length >= 5) {
        showNotification('ניתן להעלות מקסימום 5 תמונות', 'warning');
        return;
    }

    // העלאת כל הקבצים שנבחרו
    for (let i = 0; i < files.length && AppState.tempPersonData.uploadedImages.length < 5; i++) {
        const file = files[i];
        console.log(`📤 מעלה קובץ ${i + 1}/${files.length}:`, file.name);

        // בדיקת סוג הקובץ
        if (!file.type.startsWith('image/')) {
            showNotification(`הקובץ ${file.name} אינו תמונה תקינה`, 'warning');
            continue;
        }

        // בדיקת גודל הקובץ (מקסימום 5MB)
        if (file.size > 5 * 1024 * 1024) {
            showNotification(`הקובץ ${file.name} גדול מדי (מקסימום 5MB)`, 'warning');
            continue;
        }

        await uploadSingleImage(file);
    }

    // איפוס שדה הקובץ
    fileInput.value = '';
    updateUploadStatus();

    console.log('✅ סיום תהליך העלאת תמונות');
}

/**
 * איפוס נתונים זמניים לאדם חדש
 */
function resetTempPersonData() {
    AppState.tempPersonData = {
        isActive: false,
        personDetails: null,
        uploadedImages: [],
        imageUrls: []
    };
    updateUploadStatus();
}

/**
 * טיפול בהוספת אדם חדש
 */
function handleAddPerson(e) {
    e.preventDefault();

    const formData = new FormData(e.target);
    const personDetails = {
        first_name: formData.get('first_name'),
        last_name: formData.get('last_name'),
        id_number: formData.get('id_number')
    };

    // בדיקת תקינות
    if (!validatePersonDetails(personDetails)) {
        return;
    }

    // שמירת הנתונים הזמניים
    AppState.tempPersonData = {
        isActive: true,
        personDetails,
        uploadedImages: [],
        imageUrls: []
    };

    // מעבר לחלון העלאת תמונות
    hideModal('add-person-modal');
    showModal('upload-image-modal');
    updateUploadStatus();

    showNotification('נתוני האדם נשמרו. יש להעלות לפחות 3 תמונות', 'info');
}

/**
 * בדיקת תקינות פרטי אדם
 */
function validatePersonDetails(details) {
    if (!details.first_name || details.first_name.trim().length < 2) {
        showNotification('שם פרטי חייב להכיל לפחות 2 תווים', 'error');
        return false;
    }

    if (!details.last_name || details.last_name.trim().length < 2) {
        showNotification('שם משפחה חייב להכיל לפחות 2 תווים', 'error');
        return false;
    }

    if (!details.id_number || !/^\d{9}$/.test(details.id_number)) {
        showNotification('מספר ת.ז. חייב להכיל 9 ספרות', 'error');
        return false;
    }

    return true;
}

/**
 * טעינת נתוני אנשים מהשרת עם אבחון מפורט
 */
async function loadPeopleData() {
    try {
        showLoading('טוען נתוני אנשים...');

        console.log('🔄 מתחיל טעינת נתוני אנשים...');
        console.log('📍 כתובת בקשה:', window.location.origin + '/api/people');

        // ✅ הנתיב הנכון לפי appp.py
        const response = await fetch('/api/people');

        console.log('📊 סטטוס תגובה:', response.status);
        console.log('📊 סטטוס טקסט:', response.statusText);
        console.log('📊 headers:', Object.fromEntries(response.headers.entries()));

        // בדיקת סוג התוכן
        const contentType = response.headers.get('content-type');
        console.log('📋 Content-Type:', contentType);

        if (!response.ok) {
            // טיפול בשגיאות HTTP ספציפיות
            let errorMessage = `שגיאת שרת: ${response.status} ${response.statusText}`;

            if (response.status === 404) {
                errorMessage = 'הנתיב /api/people לא נמצא בשרת. בדוק שהשרת Flask רץ ושהנתיב מוגדר נכון.';
            } else if (response.status === 500) {
                errorMessage = 'שגיאה פנימית בשרת. בדוק את לוגי השרת Python.';
            } else if (response.status === 405) {
                errorMessage = 'שגיאת Method. השרת לא מקבל בקשות GET לנתיב הזה.';
            } else if (response.status === 0 || !response.status) {
                errorMessage = 'לא ניתן להתחבר לשרת. בדוק שהשרת Flask רץ על הפורט הנכון.';
            }

            throw new Error(errorMessage);
        }

        // בדיקה שזה באמת JSON
        if (!contentType || !contentType.includes('application/json')) {
            console.warn('⚠️ אזהרה: התגובה אינה JSON');
            const text = await response.text();
            console.log('📄 תוכן התגובה:', text);
            throw new Error('השרת החזיר תוכן שאינו JSON. ייתכן שיש שגיאה בשרת.');
        }

        const data = await response.json();
        console.log('📦 נתונים שהתקבלו:', data);

        if (data.success && data.people) {
            console.log('✅ נתונים תקינים התקבלו:', data.people.length, 'אנשים');
            AppState.peopleData = data.people;
            renderPeopleTable();
            updateDashboard();
            showNotification(`נתוני אנשים נטענו בהצלחה (${data.people.length} אנשים)`, 'success');
        } else {
            console.log('❌ נתונים לא תקינים:', data);
            throw new Error(data.error || 'השרת החזיר נתונים לא תקינים');
        }

    } catch (error) {
        console.error('💥 שגיאה בטעינת אנשים:', error);

        // הצגת פירוט השגיאה
        if (error instanceof TypeError && error.message.includes('fetch')) {
            showNotification('שגיאת רשת: לא ניתן להתחבר לשרת. בדוק שהשרת Flask רץ.', 'error');
        } else if (error.message.includes('JSON')) {
            showNotification('שגיאה בעיבוד נתונים: התגובה מהשרת אינה תקינה.', 'error');
        } else {
            showNotification(`שגיאה: ${error.message}`, 'error');
        }

        AppState.peopleData = [];
        renderPeopleTable(); // הצגת טבלה ריקה

    } finally {
        hideLoading();
    }
}

/**
 * רינדור טבלת אנשים עם טיפול בשגיאות
 */
function renderPeopleTable() {
    const tableBody = document.getElementById('people-table-body');
    if (!tableBody) {
        console.warn('⚠️ לא נמצא אלמנט people-table-body');
        return;
    }

    tableBody.innerHTML = '';

    // בדיקה שיש נתונים
    if (!AppState.peopleData || !Array.isArray(AppState.peopleData) || AppState.peopleData.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center; padding: 40px; color: #666; background: #f9f9f9;">
                    <div style="font-size: 48px; margin-bottom: 15px;">👥</div>
                    <h3 style="margin: 10px 0; color: #555;">אין אנשים רשומים במערכת</h3>
                    <p style="margin: 0; color: #777;">לחץ על "הוסף אדם חדש" כדי להתחיל</p>
                </td>
            </tr>
        `;
        return;
    }

    console.log(`📊 מציג ${AppState.peopleData.length} אנשים בטבלה`);

    AppState.peopleData.forEach((person, index) => {
        try {
            const row = createPersonRow(person);
            if (row) {
                tableBody.appendChild(row);
            } else {
                console.warn(`⚠️ לא ניתן ליצור שורה עבור אדם ${index}`);
            }
        } catch (error) {
            console.error(`💥 שגיאה ביצירת שורה עבור אדם ${index}:`, error);
        }
    });

    console.log(`✅ הטבלה רונדרה בהצלחה עם ${tableBody.children.length} שורות`);
}

/**
 * יצירת שורה בטבלת אנשים - תיקון שגיאות null
 */
function createPersonRow(person) {
    // בדיקה שהאובייקט person קיים
    if (!person) {
        console.warn('⚠️ נתונים חסרים עבור אדם');
        return null;
    }

    const row = document.createElement('tr');

    // תמונה - עם בדיקת null מקיפה
    const imageCell = document.createElement('td');
    const img = document.createElement('img');

    // בדיקה שיש תמונות ושהן תקינות
    let imageSrc = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="50" height="50"><rect width="50" height="50" fill="%23ddd"/><text x="25" y="30" text-anchor="middle" font-size="12" fill="%23999">תמונה</text></svg>'; // תמונת ברירת מחדל מובנית

    if (person.image_urls && Array.isArray(person.image_urls) && person.image_urls.length > 0 && person.image_urls[0]) {
        imageSrc = person.image_urls[0];
    }

    img.src = imageSrc;
    img.alt = `${person.first_name || 'לא זמין'} ${person.last_name || ''}`.trim();
    img.style.cssText = 'width: 50px; height: 50px; border-radius: 50%; object-fit: cover; border: 1px solid #ddd;';

    // טיפול בשגיאת טעינת תמונה
    img.onerror = function() {
        console.warn('⚠️ שגיאה בטעינת תמונה:', this.src);
        this.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="50" height="50"><rect width="50" height="50" fill="%23f0f0f0"/><text x="25" y="30" text-anchor="middle" font-size="10" fill="%23999">שגיאה</text></svg>';
    };

    imageCell.appendChild(img);

    // שם מלא - עם בדיקת null
    const nameCell = document.createElement('td');
    const firstName = (person.first_name || '').toString().trim();
    const lastName = (person.last_name || '').toString().trim();
    const fullName = `${firstName} ${lastName}`.trim();
    nameCell.textContent = fullName || 'שם לא זמין';

    // ת.ז. - עם בדיקת null
    const idCell = document.createElement('td');
    idCell.textContent = (person.id_number || '').toString() || 'לא זמין';

    // סטטוס נוכחות - עם בדיקת null
    const statusCell = document.createElement('td');
    const statusBadge = document.createElement('span');
    const isPresent = person.is_present === true; // בדיקה מפורשת
    statusBadge.className = `status-badge ${isPresent ? 'present' : 'absent'}`;
    statusBadge.textContent = isPresent ? 'נוכח' : 'נעדר';
    statusBadge.style.cssText = `
        padding: 4px 8px;
        border-radius: 12px;
        font-size: 12px;
        font-weight: bold;
        color: white;
        background: ${isPresent ? '#27ae60' : '#e74c3c'};
    `;
    statusCell.appendChild(statusBadge);

    // פעולות - עם בדיקת null
    const actionsCell = document.createElement('td');
    const personId = (person.id_number || '').toString();

    if (personId) {
        actionsCell.innerHTML = `
            <div style="display: flex; gap: 5px;">
                <button class="action-btn edit" onclick="editPerson('${personId}')" title="עריכה" style="
                    background: #3498db; color: white; border: none; padding: 6px 8px;
                    border-radius: 4px; cursor: pointer; font-size: 12px;
                ">
                    ✏️
                </button>
                <button class="action-btn delete" onclick="deletePerson('${personId}')" title="מחיקה" style="
                    background: #e74c3c; color: white; border: none; padding: 6px 8px;
                    border-radius: 4px; cursor: pointer; font-size: 12px;
                ">
                    🗑️
                </button>
                <button class="action-btn toggle" onclick="togglePresence('${personId}')" title="${isPresent ? 'סמן כנעדר' : 'סמן כנוכח'}" style="
                    background: ${isPresent ? '#f39c12' : '#27ae60'}; color: white; border: none; padding: 6px 8px;
                    border-radius: 4px; cursor: pointer; font-size: 12px;
                ">
                    ${isPresent ? '❌' : '✅'}
                </button>
            </div>
        `;
    } else {
        actionsCell.innerHTML = '<span style="color: #999; font-size: 12px;">פעולות לא זמינות</span>';
    }

    row.appendChild(imageCell);
    row.appendChild(nameCell);
    row.appendChild(idCell);
    row.appendChild(statusCell);
    row.appendChild(actionsCell);

    return row;
}

/**
 * סינון טבלת אנשים
 */
function filterPeopleTable() {
    const searchTerm = document.getElementById('search-people')?.value.toLowerCase() || '';
    const rows = document.querySelectorAll('#people-table-body tr');

    rows.forEach(row => {
        const nameCell = row.cells[1];
        const idCell = row.cells[2];

        if (nameCell && idCell) {
            const name = nameCell.textContent.toLowerCase();
            const id = idCell.textContent.toLowerCase();

            if (name.includes(searchTerm) || id.includes(searchTerm)) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        }
    });
}

// ===============================================================================
//                               MODAL MANAGEMENT
// ===============================================================================

/**
 * הגדרת מאזיני אירועים למודלים
 */
function setupModalListeners() {
    // כפתורי סגירה
    document.querySelectorAll('.close-modal, .close-modal-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const modal = e.target.closest('.modal');
            if (modal) {
                handleModalClose(modal.id);
            }
        });
    });

    // סגירה על קליק מחוץ למודל
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                handleModalClose(modal.id);
            }
        });
    });

    // טיפול ב-ESC key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const activeModal = document.querySelector('.modal.active');
            if (activeModal) {
                handleModalClose(activeModal.id);
            }
        }
    });
}

/**
 * טיפול בסגירת מודל עם בדיקות מיוחדות
 */
function handleModalClose(modalId) {
    // טיפול מיוחד לחלון העלאת תמונות
    if (modalId === 'upload-image-modal') {
        // אם זה אדם חדש ועדיין לא הועלו מספיק תמונות
        if (AppState.tempPersonData.isActive && AppState.tempPersonData.uploadedImages.length < 3) {
            const confirmed = confirm('האם אתה בטוח שברצונך לבטל? התמונות שהועלו יימחקו.');
            if (confirmed) {
                cancelNewPersonCreation();
            }
            return;
        }
    }

    // סגירה רגילה
    hideModal(modalId);
}

/**
 * הצגת מודל
 */
function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

/**
 * הסתרת מודל
 */
function hideModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';

        // אתחול טפסים
        const forms = modal.querySelectorAll('form');
        forms.forEach(form => form.reset());
    }
}

// ===============================================================================
//                               DASHBOARD
// ===============================================================================

/**
 * עדכון לוח הבקרה
 */
function updateDashboard() {
    const totalPeople = AppState.peopleData.length;
    const presentPeople = AppState.peopleData.filter(p => p.is_present).length;
    const absentPeople = totalPeople - presentPeople;

    // עדכון מונים
    updateElement('total-people', totalPeople);
    updateElement('present-people', presentPeople);
    updateElement('absent-people', absentPeople);
    updateElement('camera-status', 'לא פעילה');

    // עדכון דוח נוכחות
    updateElement('attendance-present', presentPeople);
    updateElement('attendance-absent', absentPeople);
    updateElement('attendance-percentage', totalPeople > 0 ? Math.round((presentPeople / totalPeople) * 100) + '%' : '0%');
}

// ===============================================================================
//                               UTILITY FUNCTIONS
// ===============================================================================

/**
 * עדכון תוכן אלמנט
 */
function updateElement(id, content) {
    const element = document.getElementById(id);
    if (element) {
        element.textContent = content;
    }
}

/**
 * הצגת הודעה למשתמש עם סגנון משופר
 */
function showNotification(message, type = 'info', duration = 5000) {
    // הסרת הודעות קיימות
    const existingNotifications = document.querySelectorAll('.notification');
    existingNotifications.forEach(notif => notif.remove());

    // יצירת הודעה דינמית
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;

    // בחירת אייקון לפי סוג ההודעה
    let icon = 'ℹ️';
    let bgColor = '#3498db';

    switch(type) {
        case 'success':
            icon = '✅';
            bgColor = '#27ae60';
            break;
        case 'error':
            icon = '❌';
            bgColor = '#e74c3c';
            break;
        case 'warning':
            icon = '⚠️';
            bgColor = '#f39c12';
            break;
        case 'info':
        default:
            icon = 'ℹ️';
            bgColor = '#3498db';
    }

    notification.innerHTML = `
        <div class="notification-content" style="
            background: ${bgColor};
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            display: flex;
            align-items: center;
            gap: 10px;
            margin: 10px;
            font-size: 14px;
            max-width: 500px;
        ">
            <span class="notification-icon" style="font-size: 18px;">${icon}</span>
            <span class="notification-message" style="flex: 1;">${message}</span>
            <button class="notification-close" style="
                background: none;
                border: none;
                color: white;
                font-size: 18px;
                cursor: pointer;
                padding: 0;
                opacity: 0.8;
            " onclick="this.closest('.notification').remove()">×</button>
        </div>
    `;

    // סגנון הקונטיינר של ההודעה
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 9999;
        opacity: 0;
        transform: translateX(100%);
        transition: all 0.3s ease;
    `;

    // הוספה לעמוד
    document.body.appendChild(notification);

    // הצגה עם אנימציה
    setTimeout(() => {
        notification.style.opacity = '1';
        notification.style.transform = 'translateX(0)';
    }, 100);

    // הסרה אוטומטית (רק אם זה לא שגיאה)
    if (type !== 'error') {
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => notification.remove(), 300);
        }, duration);
    }
}

/**
 * הצגת מצב טעינה
 */
function showLoading(message = 'טוען...') {
    let loader = document.getElementById('global-loader');

    if (!loader) {
        loader = document.createElement('div');
        loader.id = 'global-loader';
        loader.innerHTML = `
            <div class="loader-backdrop">
                <div class="loader-content">
                    <div class="spinner"></div>
                    <div class="loader-message">${message}</div>
                </div>
            </div>
        `;
        document.body.appendChild(loader);
    } else {
        loader.querySelector('.loader-message').textContent = message;
    }

    loader.style.display = 'block';
}

/**
 * הסתרת מצב טעינה
 */
function hideLoading() {
    const loader = document.getElementById('global-loader');
    if (loader) {
        loader.style.display = 'none';
    }
}

/**
 * טעינת נתונים ראשוניים עם אבחון
 */
async function loadInitialData() {
    // בדיקת מצב השרת
    await checkServerHealth();

    // טעינת נתוני אנשים
    await loadPeopleData();

    // טעינת תמונות מטרה
    await loadTargetImages();
}

/**
 * בדיקת מצב השרת
 */
async function checkServerHealth() {
    try {
        console.log('🏥 בודק מצב השרת...');

        // בדיקה פשוטה יותר - בקשה לעמוד הבית
        const response = await fetch('/', {
            method: 'GET',
            cache: 'no-cache'
        });

        if (response.ok) {
            console.log('✅ השרת פעיל');
            return true;
        } else {
            console.warn('⚠️ השרת מחזיר סטטוס:', response.status);
            return false;
        }

    } catch (error) {
        console.error('❌ השרת לא זמין:', error);
        showNotification('שגיאה: לא ניתן להתחבר לשרת Flask. וודא שהשרת רץ על הפורט הנכון.', 'error');
        return false;
    }
}

/**
 * הגדרת מאזיני אירועים להגדרות
 */
function setupSettingsListeners() {
    // כאן נוסיף מאזינים להגדרות בהמשך
    console.log('🔧 הגדרות יאותחלו בהמשך');
}

/**
 * טעינת תמונות מטרה
 */
async function loadTargetImages() {
    try {
        console.log('📸 טוען תמונות מטרה...');

        // ✅ הנתיב הנכון לפי appp.py
        const response = await fetch('/api/target-images');

        if (!response.ok) {
            throw new Error(`שגיאה בטעינת תמונות מטרה: ${response.status}`);
        }

        const data = await response.json();
        console.log('📦 תמונות מטרה שהתקבלו:', data);

        if (data.success && data.targets) {
            AppState.targetImages = data.targets;
            renderTargetImagesGallery();
            console.log('✅ תמונות מטרה נטענו בהצלחה:', data.targets.length, 'תמונות');
        } else {
            console.log('❌ אין תמונות מטרה או שגיאה:', data);
            AppState.targetImages = [];
            renderTargetImagesGallery();
        }

    } catch (error) {
        console.error('💥 שגיאה בטעינת תמונות מטרה:', error);
        showNotification('שגיאה בטעינת תמונות מטרה', 'error');
        AppState.targetImages = [];
        renderTargetImagesGallery();
    }
}

/**
 * רינדור גלריית תמונות מטרה
 */
function renderTargetImagesGallery() {
    const gallery = document.getElementById('target-gallery-grid');
    if (!gallery) return;

    gallery.innerHTML = '';

    if (AppState.targetImages.length === 0) {
        gallery.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: #666;">
                <div style="font-size: 48px; margin-bottom: 15px;">📷</div>
                <h3>אין תמונות מטרה</h3>
                <p>העלה תמונות כדי להתחיל</p>
            </div>
        `;
        return;
    }

    AppState.targetImages.forEach((target, index) => {
        const card = document.createElement('div');
        card.className = 'image-card';
        card.style.cssText = `
            position: relative;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
            transition: transform 0.3s ease;
        `;

        card.innerHTML = `
            <img src="${target.images_url}"
                 style="width: 100%; height: 160px; object-fit: cover;"
                 alt="מצלמה ${target.camera_number}">
            <div style="position: absolute; bottom: 0; left: 0; right: 0;
                        background: rgba(0,0,0,0.7); color: white; padding: 5px;
                        font-size: 12px; text-align: center;">
                מצלמה #${target.camera_number}
            </div>
        `;

        // אפקט hover
        card.addEventListener('mouseenter', () => {
            card.style.transform = 'scale(1.05)';
        });
        card.addEventListener('mouseleave', () => {
            card.style.transform = 'scale(1)';
        });

        gallery.appendChild(card);
    });
}

// ===============================================================================
//                               PLACEHOLDER FUNCTIONS
// ===============================================================================

// פונקציות פעולות על אנשים
function editPerson(id) {
    console.log('עריכת אדם:', id);
    // TODO: מימוש עריכת אדם
}

function deletePerson(id) {
    if (confirm('האם אתה בטוח שברצונך למחוק אדם זה?')) {
        console.log('מחיקת אדם:', id);
        // TODO: מימוש מחיקת אדם
    }
}

async function togglePresence(id) {
    try {
        // מציאת האדם ברשימה
        const person = AppState.peopleData.find(p => p.id_number === id);
        if (!person) {
            showNotification('אדם לא נמצא', 'error');
            return;
        }

        const newStatus = !person.is_present;

        const response = await fetch(`/api/people/${id}/presence`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ is_present: newStatus })
        });

        const result = await response.json();

        if (response.ok) {
            // עדכון הסטטוס במערך המקומי
            person.is_present = newStatus;

            // רענון הטבלה והדשבורד
            renderPeopleTable();
            updateDashboard();

            const statusText = newStatus ? 'נוכח' : 'נעדר';
            showNotification(`סטטוס נוכחות עודכן ל: ${statusText}`, 'success');
        } else {
            throw new Error(result.message || 'שגיאה בעדכון נוכחות');
        }

    } catch (error) {
        console.error('שגיאה בהחלפת נוכחות:', error);
        showNotification(`שגיאה בעדכון נוכחות: ${error.message}`, 'error');
    }
}

// פונקציה גלובלית לבדיקת מצב
window.debugAttendMe = function() {
    console.log('🔍 מצב נוכחי של AttendMe:');
    console.log('📊 AppState:', AppState);
    console.log('👥 מספר אנשים:', AppState.peopleData.length);
    console.log('📸 מספר תמונות מטרה:', AppState.targetImages.length);
    console.log('🔄 תהליך יצירת אדם פעיל:', AppState.tempPersonData.isActive);

    if (AppState.tempPersonData.isActive) {
        console.log('👤 פרטי אדם זמני:', AppState.tempPersonData.personDetails);
        console.log('📷 תמונות זמניות:', AppState.tempPersonData.uploadedImages.length);
    }

    // בדיקת חיבור לשרת
    checkServerConnection();
};

async function checkServerConnection() {
    try {
        console.log('🌐 בודק חיבור לשרת...');
        const response = await fetch('/');
        console.log(response.ok ? '✅ שרת פעיל' : '❌ שרת לא מגיב');
    } catch (error) {
        console.log('❌ שרת לא זמין:', error.message);
    }
}