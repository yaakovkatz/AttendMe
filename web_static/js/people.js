/**
 * ==================== PEOPLE MANAGEMENT JAVASCRIPT ====================
 * קובץ JavaScript ספציפי לדף ניהול אנשים
 *
 * מכיל:
 * - ניהול רשימת אנשים
 * - הוספת אנשים חדשים
 * - העלאת תמונות לאנשים
 * - מחיקת ועריכת אנשים
 * - חיפוש וסינון
 */

// ==================== GLOBAL VARIABLES ====================
// משתנים ספציפיים לדף ניהול אנשים

/**
 * מערך גלובלי המכיל את כל נתוני האנשים במערכת
 * כל אובייקט אדם מכיל: id_number, first_name, last_name, is_present, image_urls, וכו'
 * @type {Array<Object>}
 */
let peopleData = [];

/**
 * אובייקט לאחסון נתונים זמניים של אדם חדש בתהליך יצירה
 * משמש לשמירת מידע עד להשלמת תהליך ההוספה
 * @type {Object}
 */
let tempPersonData = {
    isActive: false,           // האם יש תהליך יצירה פעיל
    personDetails: null,       // פרטי האדם (שם, ת.ז.)
    uploadedImages: [],        // מערך של public_id של תמונות שהועלו
    imageUrls: []             // מערך של URL-ים לתצוגה
};

// ==================== INITIALIZATION ====================

/**
 * אתחול דף ניהול אנשים
 */
async function initializePeople() {
    console.log('👥 מאתחל דף ניהול אנשים...');

    // בדיקת התחברות
    if (!isUserLoggedIn()) {
        console.log('🔒 משתמש לא מחובר - מפנה להתחברות');
        showNotification('נדרשת התחברות לגישה לדף זה', 'warning');
        setTimeout(() => window.location.href = '/login', 1500);
        return;
    }

    // הגדרת מאזיני אירועים
    initializePeopleEventListeners();

    // בדיקת חיבור לשרת
    const serverOk = await checkServerConnection();
    if (serverOk) {
        await loadPeopleData();           // טעינת נתוני אנשים מהשרת
    }

    console.log('✅ דף ניהול אנשים אותחל בהצלחה');
}

/**
 * הגדרת מאזיני אירועים לדף ניהול אנשים
 */
function initializePeopleEventListeners() {
    // כפתור הוספת אדם חדש
    const addPersonBtn = document.getElementById('add-person-btn');
    if (addPersonBtn) {
        addPersonBtn.addEventListener('click', () => {
            if (!requireLogin('הוספת אדם חדש')) return;
            showModal('add-person-modal');
        });
    }

    // טופס הוספת אדם
    const addPersonForm = document.getElementById('add-person-form');
    if (addPersonForm) {
        addPersonForm.addEventListener('submit', handleAddPerson);
    }

    // טופס העלאת תמונה
    const uploadImageForm = document.getElementById('upload-image-form');
    if (uploadImageForm) {
        uploadImageForm.addEventListener('submit', handleUploadImage);
    }

    // שדה חיפוש אנשים
    const searchPeople = document.getElementById('search-people');
    if (searchPeople) {
        searchPeople.addEventListener('input', filterPeopleTable);
    }

    // טיפול מיוחד בסגירת מודל העלאת תמונות
    setupUploadModalHandlers();

    // תצוגה מקדימה של תמונה
    const personImageInput = document.getElementById('person-image');
    if (personImageInput) {
        personImageInput.addEventListener('change', handleImagePreview);
    }

    console.log('🎯 מאזיני אירועים לניהול אנשים הוגדרו');
}

/**
 * הגדרת טיפול מיוחד במודל העלאת תמונות
 */
function setupUploadModalHandlers() {
    const uploadModal = document.getElementById('upload-image-modal');
    if (!uploadModal) return;

    // טיפול בכפתורי סגירה עם בדיקת נתונים זמניים
    const closeButtons = uploadModal.querySelectorAll('.close-modal, .close-modal-btn');
    closeButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            handleUploadModalClose(e);
        });
    });

    // טיפול בלחיצה על רקע המודל
    uploadModal.addEventListener('click', (e) => {
        if (e.target === uploadModal) {
            handleUploadModalClose(e);
        }
    });

    // כפתור "צור" בחלון העלאת תמונות
    const finishBtn = document.getElementById('finish-upload-button');
    if (finishBtn) {
        finishBtn.addEventListener('click', function() {
            if (tempPersonData.isActive) {
                finishNewPersonCreation();
            } else {
                closeUploadModal();
                loadPeopleData(); // רענון הרשימה
            }
        });
    }
}

/**
 * טיפול בסגירת מודל העלאת תמונות
 */
function handleUploadModalClose(event) {
    // אם זה אדם חדש ועדיין לא הועלו מספיק תמונות
    if (tempPersonData.isActive && tempPersonData.uploadedImages.length < 3) {
        const confirmed = confirm('האם אתה בטוח שברצונך לבטל? התמונות שהועלו יימחקו.');
        if (confirmed) {
            cancelNewPersonCreation();
        }
        return;
    }
    closeUploadModal();
}

// ==================== DATA LOADING ====================

/**
 * טעינת נתוני אנשים מהשרת
 */
async function loadPeopleData() {
    console.log('🔄 מתחיל לטעון נתוני אנשים...');

    try {
        const username = getCurrentUsername();
        const url = `/api/get_loaded_people?username=${username}`;

        const response = await fetch(url);
        console.log('📡 תגובת שרת:', response.status);

        if (!response.ok) {
            if (response.status === 404 || response.status === 400) {
                console.log('❌ בעיה עם authentication - מפנה להתחברות');
                showNotification('נדרשת התחברות מחדש', 'warning');
                setTimeout(() => window.location.href = '/login', 1500);
                return;
            }
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        console.log('📋 נתונים שהתקבלו:', data);

        if (data.success && data.people) {
            peopleData = data.people.map(person => ({
                id_number: person.id_number,
                first_name: person.first_name,
                last_name: person.last_name,
                is_present: person.is_present || false,
                image_urls: person.image_urls || [],
                image_count: person.image_urls ? person.image_urls.length : 0
            }));
            console.log('✅ נטענו נתוני אנשים:', peopleData);
            console.log(`📊 סה"כ ${peopleData.length} אנשים`);
        } else if (data.error) {
            console.error('❌ שגיאה מהשרת:', data.error);
            peopleData = [];
            showNotification('שגיאה: ' + data.error, 'error');
        } else {
            peopleData = [];
            console.log('⚠️ לא נמצאו אנשים במערכת');
        }

        renderPeopleTable();

    } catch (error) {
        console.error('❌ שגיאה בטעינת נתוני אנשים:', error);
        showNotification('שגיאה בטעינת רשימת אנשים', 'error');
        peopleData = [];
        renderPeopleTable();
    }
}

/**
 * רינדור טבלת האנשים ב-DOM
 */
function renderPeopleTable() {
    console.log('🎨 מתחיל לרנדר טבלת אנשים...');

    const tableBody = document.getElementById('people-table-body');
    if (!tableBody) {
        console.error('❌ לא נמצא אלמנט people-table-body!');
        return;
    }

    console.log('📋 מספר אנשים לרינדור:', peopleData.length);
    tableBody.innerHTML = ''; // ניקוי תוכן קיים

    // בדיקה אם יש אנשים
    if (peopleData.length === 0) {
        const emptyRow = `<tr><td colspan="5" style="text-align: center; padding: 20px; color: #666;">אין אנשים במערכת</td></tr>`;
        tableBody.innerHTML = emptyRow;
        console.log('📝 הוצגה הודעת "אין אנשים"');
        return;
    }

    // יצירת שורה לכל אדם
    peopleData.forEach((person, index) => {
        console.log(`🔄 מעבד אדם ${index + 1}:`, person);

        const row = document.createElement('tr');

        // קביעת תמונה
        let imageUrl = '/web_static/img/person-placeholder.jpg';
        if (person.image_urls && person.image_urls.length > 0) {
            imageUrl = person.image_urls[0];
        }

        // מונה תמונות
        const imageCounter = person.image_count > 0 ?
            `<span class="image-count">${person.image_count}</span>` : '';

        // סטטוס נוכחות
        const statusClass = person.is_present ? 'status-present' : 'status-absent';
        const statusText = person.is_present ? 'נוכח' : 'נעדר';

        // בניית תוכן השורה
        row.innerHTML = `
            <td>
                <div style="position: relative; display: inline-block;">
                    <img src="${imageUrl}" alt="${person.first_name}" class="person-image">
                    ${imageCounter}
                </div>
            </td>
            <td>${person.first_name} ${person.last_name}</td>
            <td>${person.id_number}</td>
            <td><span class="person-status ${statusClass}">${statusText}</span></td>
            <td>
                <div class="person-actions">
                    <button class="upload" data-id="${person.id_number}" title="העלאת תמונה">
                        <i class="fas fa-upload"></i>
                    </button>
                    ${person.image_count > 0 ?
                        `<button class="view-images" data-id="${person.id_number}" title="צפייה בכל התמונות">
                            <i class="fas fa-images"></i>
                        </button>` : ''
                    }
                    <button class="delete" data-id="${person.id_number}" title="מחיקה">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </div>
            </td>
        `;

        tableBody.appendChild(row);
    });

    console.log(`✅ הושלם רינדור ${peopleData.length} אנשים`);

    // הוספת מאזיני אירועים לכפתורים החדשים
    attachTableEventListeners();
}

/**
 * הוספת מאזיני אירועים לכפתורי הטבלה
 */
function attachTableEventListeners() {
    const tableBody = document.getElementById('people-table-body');
    if (!tableBody) return;

    // כפתורי העלאה
    tableBody.querySelectorAll('.upload').forEach(button => {
        button.addEventListener('click', handleUploadClick);
    });

    // כפתורי מחיקה
    tableBody.querySelectorAll('.delete').forEach(button => {
        button.addEventListener('click', handleDeleteClick);
    });

    // כפתורי צפייה בתמונות
    tableBody.querySelectorAll('.view-images').forEach(button => {
        button.addEventListener('click', handleViewImagesClick);
    });

    console.log('🎯 הוספו מאזיני אירועים לכפתורי הטבלה');
}

// ==================== PERSON MANAGEMENT ====================

/**
 * טיפול בהוספת אדם חדש
 */
async function handleAddPerson(event) {
    event.preventDefault();

    if (!requireLogin('הוספת אדם חדש')) return;

    const form = event.target;

    // איסוף נתונים מהטופס
    const personData = {
        first_name: form.querySelector('#first-name').value.trim(),
        last_name: form.querySelector('#last-name').value.trim(),
        id_number: form.querySelector('#id-number').value.trim()
    };

    // בדיקות תקינות
    if (!personData.first_name || !personData.last_name || !personData.id_number) {
        showNotification('נא למלא את כל השדות', 'error');
        return;
    }

    if (!/^\d+$/.test(personData.id_number)) {
        showNotification('מספר ת.ז. חייב להכיל ספרות בלבד', 'error');
        return;
    }

    // בדיקה שהאדם לא קיים כבר
    if (peopleData.find(p => p.id_number === personData.id_number)) {
        showNotification('אדם עם מספר זהות זה כבר קיים במערכת', 'error');
        return;
    }

    // סגירת מודל הוספת אדם
    closeModal('add-person-modal');
    form.reset();

    // התחלת תהליך יצירת אדם חדש
    startNewPersonCreation(personData);

    // פתיחת חלון העלאת תמונות
    openUploadModalForNewPerson(personData);
}

/**
 * טיפול בלחיצה על כפתור העלאת תמונה
 */
function handleUploadClick(event) {
    if (!requireLogin('העלאת תמונה')) return;

    const personId = event.currentTarget.getAttribute('data-id');
    const person = peopleData.find(p => p.id_number === personId);

    if (!person) return;

    openUploadModal(personId, `${person.first_name} ${person.last_name}`);
}

/**
 * טיפול בלחיצה על כפתור מחיקת אדם
 */
async function handleDeleteClick(event) {
    if (!requireLogin('מחיקת אדם')) return;

    const personId = event.currentTarget.getAttribute('data-id');
    const person = peopleData.find(p => p.id_number === personId);

    if (!person) return;

    if (confirm(`האם אתה בטוח שברצונך למחוק את ${person.first_name} ${person.last_name}?`)) {
        try {
            const username = getCurrentUsername();

            const response = await fetch(`/api/people/${personId}`, {
                method: 'DELETE',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ username: username })
            });

            const data = await response.json();

            if (handleApiResponse(response, data)) {
                showNotification('האדם נמחק בהצלחה', 'success');
                await loadPeopleData();
            }
        } catch (error) {
            console.error('❌ שגיאה במחיקת אדם:', error);
            showNotification('שגיאה במחיקת אדם', 'error');
        }
    }
}

/**
 * טיפול בלחיצה על כפתור צפייה בתמונות
 */
function handleViewImagesClick(event) {
    const personId = event.currentTarget.getAttribute('data-id');
    const person = peopleData.find(p => p.id_number === personId);

    if (!person) return;

    const modal = document.getElementById('person-images-modal');
    const galleryContainer = document.getElementById('person-images-gallery');
    const personNameElem = document.getElementById('person-images-name');

    if (!modal || !galleryContainer || !personNameElem) return;

    // איפוס ומילוי תוכן
    galleryContainer.innerHTML = '';
    personNameElem.textContent = `${person.first_name} ${person.last_name}`;

    if (!person.image_urls || person.image_urls.length === 0) {
        galleryContainer.innerHTML = '<p class="no-images">אין תמונות זמינות</p>';
    } else {
        person.image_urls.forEach((url, index) => {
            const imageContainer = document.createElement('div');
            imageContainer.className = 'person-image-item';
            imageContainer.innerHTML = `
                <img src="${url}" alt="תמונה ${index + 1}" loading="lazy">
                <div class="person-image-counter">${index + 1}</div>
            `;
            galleryContainer.appendChild(imageContainer);
        });
    }

    showModal(modal);
}

// ==================== TEMPORARY PERSON DATA MANAGEMENT ====================

/**
 * התחלת תהליך יצירת אדם חדש
 */
function startNewPersonCreation(personDetails) {
    console.log('🚀 מתחיל יצירת אדם חדש:', personDetails);

    tempPersonData = {
        isActive: true,
        personDetails: personDetails,
        uploadedImages: [],
        imageUrls: []
    };

    console.log('💾 נתונים זמניים הוגדרו:', tempPersonData);
}

/**
 * השלמת תהליך יצירת אדם חדש
 */
async function finishNewPersonCreation() {
    console.log('🏁 מסיים יצירת אדם חדש');

    if (!requireLogin('יצירת אדם חדש')) return;

    if (!tempPersonData.isActive || !tempPersonData.personDetails) {
        showNotification('שגיאה: נתונים זמניים לא תקינים', 'error');
        return;
    }

    if (tempPersonData.imageUrls.length < 3) {
        showNotification('נדרשות לפחות 3 תמונות ליצירת אדם', 'error');
        return;
    }

    const username = getCurrentUsername();

    try {
        const response = await fetch('/api/people/create_person', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                username: username,
                person_details: tempPersonData.personDetails,
                image_urls: tempPersonData.imageUrls
            })
        });

        const data = await response.json();

        if (handleApiResponse(response, data)) {
            showNotification('האדם נוצר בהצלחה!', 'success');
            clearTempPersonData();
            closeUploadModal();
            await loadPeopleData();
        }
    } catch (error) {
        console.error('❌ שגיאה ביצירת אדם:', error);
        showNotification('שגיאה ביצירת האדם', 'error');
    }
}

/**
 * ביטול תהליך יצירת אדם חדש
 */
async function cancelNewPersonCreation() {
    console.log('❌ מבטל יצירת אדם חדש');

    // מחיקת תמונות זמניות
    if (tempPersonData.uploadedImages.length > 0) {
        try {
            for (const public_id of tempPersonData.uploadedImages) {
                await fetch('/api/delete_temp_image', {
                    method: 'DELETE',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({ public_id: public_id })
                });
            }
            console.log('🗑️ נמחקו תמונות זמניות:', tempPersonData.uploadedImages);
        } catch (error) {
            console.error('שגיאה במחיקת תמונות זמניות:', error);
        }
    }

    clearTempPersonData();
    closeUploadModal();
}

/**
 * ניקוי הנתונים הזמניים
 */
function clearTempPersonData() {
    console.log('🧹 מנקה נתונים זמניים');
    tempPersonData = {
        isActive: false,
        personDetails: null,
        uploadedImages: [],
        imageUrls: []
    };
}

// ==================== UPLOAD MODAL MANAGEMENT ====================

/**
 * פתיחת חלון העלאה עבור אדם חדש
 */
function openUploadModalForNewPerson(personData) {
    console.log(`📂 פותח חלון העלאה עבור אדם חדש: ${personData.first_name} ${personData.last_name}`);

    resetUploadModal();

    document.getElementById('upload-person-id').value = personData.id_number;

    const titleElement = document.querySelector('#upload-image-modal h3');
    if (titleElement) {
        titleElement.innerHTML = `
            <span style="color: #e67e22;">👤 אדם חדש:</span>
            העלאת תמונות עבור ${personData.first_name} ${personData.last_name}
        `;
    }

    // הסתרת כפתור הסגירה
    const closeButtons = document.querySelectorAll('#upload-image-modal .close-modal');
    closeButtons.forEach(btn => {
        btn.style.visibility = 'hidden';
    });

    updateUploadProgress(0);
    showModal('upload-image-modal');
}

/**
 * פתיחת חלון העלאה עבור אדם קיים
 */
function openUploadModal(personId, personName) {
    console.log(`📂 פותח חלון העלאה עבור ${personName}`);

    resetUploadModal();

    document.getElementById('upload-person-id').value = personId;

    const titleElement = document.querySelector('#upload-image-modal h3');
    if (titleElement) {
        titleElement.textContent = `העלאת תמונות עבור ${personName}`;
    }

    // הצגת כפתור הסגירה
    const closeButtons = document.querySelectorAll('#upload-image-modal .close-modal');
    closeButtons.forEach(btn => {
        btn.style.visibility = 'visible';
    });

    const currentImageCount = getPersonImageCount(personId);
    updateUploadProgress(currentImageCount);

    showModal('upload-image-modal');
}

/**
 * איפוס חלון העלאת תמונות
 */
function resetUploadModal() {
    const form = document.getElementById('upload-image-form');
    if (form) form.reset();

    const fileInput = document.getElementById('person-image');
    if (fileInput) fileInput.value = '';

    // הסרת progress containers קודמים
    const existingProgress = document.querySelector('.upload-progress-container');
    if (existingProgress) {
        existingProgress.remove();
    }

    updateUploadProgress(tempPersonData.isActive ? tempPersonData.uploadedImages.length : 0);
}

/**
 * סגירת חלון העלאת תמונות
 */
function closeUploadModal() {
    closeModal('upload-image-modal');

    // החזרת כפתור הסגירה
    const closeButtons = document.querySelectorAll('#upload-image-modal .close-modal');
    closeButtons.forEach(btn => {
        btn.style.visibility = 'visible';
    });

    resetUploadModal();

    if (tempPersonData.isActive) {
        clearTempPersonData();
    }
}

// ==================== IMAGE UPLOAD ====================

/**
 * טיפול בהעלאת תמונות
 */
async function handleUploadImage(event) {
    event.preventDefault();

    if (!requireLogin('העלאת תמונה')) return;

    const personId = document.getElementById('upload-person-id').value;
    const fileInput = document.getElementById('person-image');

    if (!fileInput.files.length) {
        showNotification('נא לבחור קבצים', 'error');
        return;
    }

    const files = Array.from(fileInput.files);

    if (files.length > 5) {
        showNotification('ניתן להעלות עד 5 תמונות בלבד', 'error');
        return;
    }

    console.log(`מתחיל להעלות ${files.length} תמונות...`);

    // יצירת progress container
    const form = event.target;
    let progressContainer = createProgressContainer(form);

    let successCount = 0;
    let errorCount = 0;

    // העלאת קבצים
    for (let i = 0; i < files.length; i++) {
        const file = files[i];

        try {
            updateProgressDisplay(progressContainer, `מעלה תמונה ${i + 1} מתוך ${files.length}: ${file.name.substring(0, 20)}...`);

            const formData = new FormData();
            formData.append('image', file);

            if (tempPersonData.isActive) {
                formData.append('first_name', tempPersonData.personDetails.id_number);
                formData.append('last_name', 'person');
                formData.append('id_number', tempPersonData.personDetails.id_number);
            }

            const response = await fetch('/api/upload_temp_image', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (data.success) {
                successCount++;

                if (tempPersonData.isActive) {
                    tempPersonData.uploadedImages.push(data.public_id);
                    tempPersonData.imageUrls.push(data.image_url);
                    updateUploadProgress(tempPersonData.imageUrls.length);
                }

                console.log(`✅ הועלה בהצלחה: ${file.name}`);
            } else {
                errorCount++;
                console.error(`❌ שגיאה בהעלאת ${file.name}:`, data.error);
            }

            // עדכון progress bar
            const progress = ((i + 1) / files.length) * 100;
            updateProgressBar(progressContainer, progress);

        } catch (error) {
            errorCount++;
            console.error(`❌ שגיאת רשת בהעלאת ${file.name}:`, error);
        }

        if (i < files.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 300));
        }
    }

    // סיכום העלאה
    handleUploadCompletion(progressContainer, successCount, errorCount, files.length);

    // ניקוי
    setTimeout(() => {
        form.reset();
        if (progressContainer && progressContainer.parentNode) {
            progressContainer.remove();
        }
    }, 3000);

    if (!tempPersonData.isActive) {
        await loadPeopleData();
    }
}

/**
 * יצירת progress container
 */
function createProgressContainer(form) {
    const progressContainer = document.createElement('div');
    progressContainer.className = 'upload-progress-container';
    progressContainer.innerHTML = `
        <div style="margin: 15px 0; padding: 10px; background: #f0f8ff; border-radius: 5px;">
            <div style="font-weight: bold; margin-bottom: 5px;">מעלה תמונות...</div>
            <div class="upload-progress-text">מתחיל העלאה...</div>
            <div style="background: #e0e0e0; height: 8px; border-radius: 4px; margin: 8px 0; overflow: hidden;">
                <div class="upload-progress-bar" style="background: #4CAF50; height: 100%; width: 0%; transition: width 0.3s ease;"></div>
            </div>
        </div>
    `;
    form.appendChild(progressContainer);
    return progressContainer;
}

/**
 * עדכון תצוגת progress
 */
function updateProgressDisplay(container, text) {
    const textElement = container.querySelector('.upload-progress-text');
    if (textElement) {
        textElement.textContent = text;
    }
}

/**
 * עדכון progress bar
 */
function updateProgressBar(container, percentage) {
    const barElement = container.querySelector('.upload-progress-bar');
    if (barElement) {
        barElement.style.width = `${percentage}%`;
    }
}

/**
 * טיפול בסיום העלאה
 */
function handleUploadCompletion(container, successCount, errorCount, totalFiles) {
    updateProgressBar(container, 100);

    let message, type, backgroundColor;

    if (successCount > 0 && errorCount === 0) {
        message = `🎉 כל התמונות הועלו בהצלחה! (${successCount}/${totalFiles})`;
        type = 'success';
        backgroundColor = '#e8f5e8';
    } else if (successCount > 0 && errorCount > 0) {
        message = `⚠️ הועלו ${successCount} תמונות, נכשלו ${errorCount}`;
        type = 'warning';
        backgroundColor = '#fff3cd';
    } else {
        message = `❌ כל ההעלאות נכשלו (${errorCount} שגיאות)`;
        type = 'error';
        backgroundColor = '#ffebee';
    }

    updateProgressDisplay(container, message);
    container.style.background = backgroundColor;
    showNotification(message, type);
}

/**
 * תצוגה מקדימה של תמונה
 */
function handleImagePreview() {
    // כרגע לא מוצג preview, אבל ניתן להוסיף בעתיד
}

// ==================== HELPER FUNCTIONS ====================

/**
 * קבלת מספר התמונות של אדם ספציפי
 */
function getPersonImageCount(personId) {
    if (tempPersonData.isActive && tempPersonData.personDetails &&
        tempPersonData.personDetails.id_number === personId) {
        return tempPersonData.uploadedImages.length;
    }

    const person = peopleData.find(p => p.id_number === personId);
    return person && person.image_urls ? person.image_urls.length : 0;
}

/**
 * עדכון מד התקדמות העלאת תמונות
 */
function updateUploadProgress(imageCount) {
    console.log(`🎯 מעדכן מד התקדמות ל: ${imageCount} תמונות`);

    // עדכון הפסים הגרפיים
    for (let i = 1; i <= 5; i++) {
        const step = document.getElementById(`progress-step-${i}`);
        if (step) {
            if (i <= imageCount) {
                step.classList.add('completed');
                step.style.backgroundColor = '#4caf50';
                step.style.borderColor = '#4caf50';
            } else {
                step.classList.remove('completed');
                step.style.backgroundColor = '#ddd';
                step.style.borderColor = '#ddd';
            }
        }
    }

    // עדכון הטקסט
    const statusEl = document.getElementById('upload-status');
    if (statusEl) {
        const remaining = Math.max(0, 3 - imageCount);

        if (imageCount === 0) {
            statusEl.textContent = 'יש להעלות לפחות 3 תמונות ועד 5 תמונות בסך הכל';
            statusEl.style.color = '#666';
        } else if (remaining > 0) {
            statusEl.textContent = `יש לך ${imageCount} תמונות. נדרשות עוד ${remaining} תמונות לפחות.`;
            statusEl.style.color = '#ff9800';
        } else if (imageCount < 5) {
            statusEl.textContent = `יש לך ${imageCount} תמונות. ניתן להוסיף עד ${5 - imageCount} תמונות נוספות.`;
            statusEl.style.color = '#4caf50';
        } else {
            statusEl.textContent = `יש לך ${imageCount} תמונות (מקסימום).`;
            statusEl.style.color = '#4caf50';
        }
    }

    // עדכון כפתור צור
    const finishBtn = document.getElementById('finish-upload-button');
    if (finishBtn) {
        if (imageCount >= 3) {
            finishBtn.style.display = 'inline-block';
            finishBtn.disabled = false;
            finishBtn.textContent = 'צור';
        } else {
            if (tempPersonData.isActive) {
                finishBtn.style.display = 'inline-block';
                finishBtn.disabled = true;
                finishBtn.textContent = `נדרשות עוד ${3 - imageCount} תמונות`;
            } else {
                finishBtn.style.display = 'none';
            }
        }
    }
}

/**
 * סינון טבלת האנשים
 */
function filterPeopleTable() {
    const searchValue = document.getElementById('search-people').value.toLowerCase();
    const tableBody = document.getElementById('people-table-body');

    if (!tableBody) return;

    const rows = tableBody.querySelectorAll('tr');

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

// ==================== DEBUG UTILITIES ====================

if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    window.debugPeople = {
        showData: () => {
            console.table(peopleData);
            return peopleData;
        },

        showTempData: () => {
            console.log('Temp Person Data:', tempPersonData);
            return tempPersonData;
        },

        refresh: loadPeopleData,

        simulateNewPerson: () => {
            startNewPersonCreation({
                first_name: 'בדיקה',
                last_name: 'דיבוג',
                id_number: '123456789'
            });
            console.log('🧪 נוצר אדם זמני לדיבוג');
        }
    };

    console.log('🔧 כלי דיבוג זמינים: window.debugPeople');
}

// ==================== AUTO INITIALIZATION ====================

document.addEventListener('DOMContentLoaded', function() {
    console.log('👥 People.js נטען');
    initializePeople();
});

/**
 * ==================== END OF PEOPLE.JS ====================
 *
 * קובץ זה מכיל את כל הפונקציונליות לניהול אנשים:
 *
 * 👥 ניהול רשימת אנשים מלא
 * ➕ הוספת אנשים חדשים עם תמונות
 * 📷 העלאת תמונות מתקדמת
 * 🗑️ מחיקת אנשים
 * 🔍 חיפוש וסינון
 * 📱 ממשק רספונסיבי
 * 🔧 כלי דיבוג מתקדמים
 */