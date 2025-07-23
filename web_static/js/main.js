/**
 * ==================== ATTENDANCE MANAGEMENT SYSTEM V2.0 ====================
 * מערכת ניהול נוכחות באמצעות זיהוי פנים - עם תמיכה במערכת בתי ספר
 *
 * תיאור: מערכת מקיפה לניהול אנשים ובדיקת נוכחות באמצעות זיהוי פנים
 * חדש: אותנטיקציה, בתי ספר מרובים, הרשאות משתמשים
 *
 * מאפיינים עיקריים:
 * - מערכת כניסה והרשמה
 * - ניהול בתי ספר מרובים
 * - הוספת ועריכת אנשים במערכת (לפי בית ספר)
 * - העלאת תמונות לכל אדם (3-5 תמונות)
 * - בדיקת נוכחות באמצעות תמונות מטרה
 * - ניהול תמונות מטרה (לפי בית ספר)
 * - ממשק משתמש ידידותי ורספונסיבי
 * - הרשאות משתמשים מתקדמות
 */

document.addEventListener('DOMContentLoaded', function() {
    // ==================== GLOBAL VARIABLES ====================

    /**
     * מערך גלובלי המכיל את כל נתוני האנשים של בית הספר הנוכחי
     */
    let peopleData = [];

    /**
     * אובייקט לאחסון נתוני המשתמש הנוכחי
     */
    let currentUser = null;

    /**
     * אובייקט לאחסון נתוני בית הספר הנוכחי
     */
    let currentSchool = null;

    /**
     * אובייקט לאחסון נתונים זמניים של אדם חדש בתהליך יצירה
     */
    let tempPersonData = {
        isActive: false,
        personDetails: null,
        uploadedImages: [],
        imageUrls: []
    };

    // ==================== AUTHENTICATION & INITIALIZATION ====================

    /**
     * פונקציית אתחול ראשית - מעודכנת לאותנטיקציה
     */
    async function initialize() {
        console.log('🚀 AttendMe v2.0 - מאתחל מערכת...');

        // בדיקת אותנטיקציה
        const authResult = await checkAuthentication();

        if (!authResult.authenticated) {
            // אם לא מאומת, הפנייה לדף כניסה
            console.log('❌ לא מאומת, מפנה לדף כניסה...');
            window.location.href = '/login';
            return;
        }

        // אם מאומת, טעינת נתוני המערכת
        currentUser = authResult.user;
        currentSchool = authResult.school;

        console.log('✅ משתמש מאומת:', currentUser);
        console.log('🏫 בית ספר נוכחי:', currentSchool);

        // עדכון ממשק המשתמש
        updateUserInterface();

        // הגדרת מאזיני אירועים
        initializeEventListeners();

        // טעינת נתונים
        const serverOk = await checkServerConnection();
        if (serverOk) {
            await loadPeopleData();
            await loadTargetImages();
            updateDashboardStats();
        }

        setCurrentDate();
    }

    /**
     * בדיקת אותנטיקציה
     */
    async function checkAuthentication() {
        try {
            const sessionToken = localStorage.getItem('session_token');
            const userData = localStorage.getItem('user_data');

            if (!sessionToken || !userData) {
                return { authenticated: false };
            }

            // אימות הטוקן עם השרת
            const response = await fetch('/api/auth/verify-session', {
                headers: {
                    'Authorization': `Bearer ${sessionToken}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                const user = JSON.parse(userData);

                return {
                    authenticated: true,
                    user: user,
                    school: {
                        id: user.school_id,
                        name: user.school_name,
                        type: user.school_type
                    }
                };
            } else {
                // טוקן לא תקף
                localStorage.removeItem('session_token');
                localStorage.removeItem('user_data');
                return { authenticated: false };
            }

        } catch (error) {
            console.error('שגיאה בבדיקת אותנטיקציה:', error);
            return { authenticated: false };
        }
    }

    /**
     * עדכון ממשק המשתמש לפי המשתמש המחובר
     */
    function updateUserInterface() {
        // עדכון כותרת הדף
        const title = document.title;
        if (currentSchool) {
            document.title = `${title} - ${currentSchool.name}`;
        }

        // הוספת מידע בית ספר לממשק (אם יש אלמנט מתאים)
        const schoolInfo = document.querySelector('.school-info');
        if (schoolInfo && currentSchool) {
            schoolInfo.innerHTML = `
                <div class="school-header">
                    <h3>${currentSchool.name}</h3>
                    <span class="school-type">${currentSchool.type}</span>
                </div>
            `;
        }

        // הוספת פרטי משתמש לממשק (אם יש אלמנט מתאים)
        const userInfo = document.querySelector('.user-info');
        if (userInfo && currentUser) {
            userInfo.innerHTML = `
                <div class="user-header">
                    <span class="user-name">שלום, ${currentUser.username}</span>
                    <span class="user-role">${getRoleDisplayName(currentUser.role)}</span>
                </div>
            `;
        }

        // הסתרת/הצגת אלמנטים לפי הרשאות
        updateUIBasedOnPermissions();

        // הוספת כפתור יציאה
        addLogoutButton();
    }

    /**
     * עדכון ממשק לפי הרשאות משתמש
     */
    function updateUIBasedOnPermissions() {
        if (!currentUser) return;

        const role = currentUser.role;

        // הסתרת כפתורים לפי הרשאות
        const managementButtons = document.querySelectorAll('[data-permission]');
        managementButtons.forEach(button => {
            const requiredPermission = button.getAttribute('data-permission');
            if (!hasPermission(requiredPermission)) {
                button.style.display = 'none';
            }
        });

        // הסתרת חלקים שלמים אם אין הרשאה
        if (role === 'user' || role === 'staff') {
            const peopleManagement = document.getElementById('people-management');
            if (peopleManagement) {
                const addPersonBtn = peopleManagement.querySelector('#add-person-btn');
                if (addPersonBtn) addPersonBtn.style.display = 'none';
            }
        }

        if (role !== 'admin') {
            const settingsSection = document.getElementById('settings');
            if (settingsSection) {
                settingsSection.style.display = 'none';
            }
        }
    }

    /**
     * בדיקת הרשאות משתמש
     */
    function hasPermission(permission) {
        if (!currentUser) return false;

        const rolePermissions = {
            'admin': {
                'manage_people': true,
                'manage_targets': true,
                'attendance_check': true,
                'system_settings': true,
                'manage_users': true
            },
            'teacher': {
                'manage_people': true,
                'manage_targets': false,
                'attendance_check': true,
                'system_settings': false,
                'manage_users': false
            },
            'staff': {
                'manage_people': false,
                'manage_targets': false,
                'attendance_check': true,
                'system_settings': false,
                'manage_users': false
            },
            'user': {
                'manage_people': false,
                'manage_targets': false,
                'attendance_check': false,
                'system_settings': false,
                'manage_users': false
            }
        };

        const userPermissions = rolePermissions[currentUser.role] || rolePermissions['user'];
        return userPermissions[permission] || false;
    }

    /**
     * קבלת שם תפקיד להצגה
     */
    function getRoleDisplayName(role) {
        const roleNames = {
            'admin': 'מנהל',
            'teacher': 'מורה',
            'staff': 'צוות',
            'user': 'משתמש'
        };
        return roleNames[role] || 'משתמש';
    }

    /**
     * הוספת כפתור יציאה
     */
    function addLogoutButton() {
        const navLinks = document.querySelector('.nav-links');
        if (navLinks && !document.getElementById('logout-btn')) {
            const logoutLi = document.createElement('li');
            logoutLi.innerHTML = `
                <a href="#" id="logout-btn" class="logout-link">
                    <i class="fas fa-sign-out-alt"></i> יציאה
                </a>
            `;
            navLinks.appendChild(logoutLi);

            // הוספת מאזין לכפתור יציאה
            document.getElementById('logout-btn').addEventListener('click', handleLogout);
        }
    }

    /**
     * טיפול ביציאה מהמערכת
     */
    function handleLogout(e) {
        e.preventDefault();

        if (confirm('האם אתה בטוח שברצונך לצאת מהמערכת?')) {
            // ניקוי נתוני סשן
            localStorage.removeItem('session_token');
            localStorage.removeItem('user_data');

            // הפנייה לדף כניסה
            window.location.href = '/login';
        }
    }

    // ==================== API HELPERS ====================

    /**
     * שליחת בקשת API עם אותנטיקציה
     */
    async function authenticatedFetch(url, options = {}) {
        const sessionToken = localStorage.getItem('session_token');

        const defaultHeaders = {
            'Content-Type': 'application/json',
        };

        if (sessionToken) {
            defaultHeaders['Authorization'] = `Bearer ${sessionToken}`;
        }

        const mergedOptions = {
            ...options,
            headers: {
                ...defaultHeaders,
                ...(options.headers || {})
            }
        };

        const response = await fetch(url, mergedOptions);

        // אם קיבלנו 401, זה אומר שהטוקן פג תוקף
        if (response.status === 401) {
            console.log('🔑 טוקן פג תוקף, מפנה לכניסה...');
            localStorage.removeItem('session_token');
            localStorage.removeItem('user_data');
            window.location.href = '/login';
            return null;
        }

        return response;
    }

    // ==================== EVENT LISTENERS SETUP ====================

    /**
     * הגדרת כל מאזיני האירועים של האפליקציה - מעודכן
     */
    function initializeEventListeners() {
        // ==================== PEOPLE MANAGEMENT BUTTONS ====================

        // כפתור הוספת אדם חדש - רק אם יש הרשאה
        if (hasPermission('manage_people')) {
            document.getElementById('add-person-btn')?.addEventListener('click', () =>
                showModal(document.getElementById('add-person-modal'))
            );
        }

        // טופס הוספת אדם
        document.getElementById('add-person-form')?.addEventListener('submit', handleAddPerson);

        // טופס העלאת תמונה
        document.getElementById('upload-image-form')?.addEventListener('submit', handleUploadImage);

        // שדה חיפוש אנשים
        document.getElementById('search-people')?.addEventListener('input', filterPeopleTable);

        // כפתור בדיקת נוכחות כללית - רק אם יש הרשאה
        if (hasPermission('attendance_check')) {
            document.getElementById('check-all-people')?.addEventListener('click', handleCheckAllPeople);
        }

        // ==================== MODAL CLOSE HANDLERS ====================

        document.querySelectorAll('.close-modal').forEach(button => {
            button.addEventListener('click', (e) => {
                const modal = e.target.closest('.modal');
                if (modal && modal.id === 'upload-image-modal') {
                    if (tempPersonData.isActive && tempPersonData.uploadedImages.length < 3) {
                        const confirmed = confirm('האם אתה בטוח שברצונך לבטל? התמונות שהועלו יימחקו.');
                        if (confirmed) {
                            cancelNewPersonCreation();
                        }
                        return;
                    }
                    closeUploadModal();
                } else if (modal) {
                    modal.classList.remove('active');
                }
            });
        });

        document.querySelectorAll('.close-modal-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const modal = e.target.closest('.modal');
                if (modal && modal.id === 'upload-image-modal') {
                    if (tempPersonData.isActive && tempPersonData.uploadedImages.length < 3) {
                        const confirmed = confirm('האם אתה בטוח שברצונך לבטל? התמונות שהועלו יימחקו.');
                        if (confirmed) {
                            cancelNewPersonCreation();
                        }
                        return;
                    }
                    closeUploadModal();
                } else if (modal) {
                    modal.classList.remove('active');
                }
            });
        });

        document.getElementById('finish-upload-button')?.addEventListener('click', function() {
            if (tempPersonData.isActive) {
                finishNewPersonCreation();
            } else {
                closeUploadModal();
                loadPeopleData();
            }
        });

        // ==================== IMAGE PREVIEW ====================

        document.getElementById('person-image')?.addEventListener('change', function() {
            if (this.files && this.files[0]) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const preview = document.getElementById('image-preview');
                    if (preview) {
                        preview.src = e.target.result;
                    }
                };
                reader.readAsDataURL(this.files[0]);
            }
        });

        // ==================== TARGET UPLOAD EVENTS ====================

        document.getElementById('target-file-input')?.addEventListener('change', handleTargetFileSelection);

        // ==================== MODAL BACKGROUND CLICK ====================

        document.getElementById('upload-image-modal')?.addEventListener('click', function(e) {
            if (e.target === this) {
                if (tempPersonData.isActive && tempPersonData.uploadedImages.length < 3) {
                    const confirmed = confirm('האם אתה בטוח שברצונך לבטל? התמונות שהועלו יימחקו.');
                    if (confirmed) {
                        cancelNewPersonCreation();
                    }
                    return;
                }
                closeUploadModal();
            }
        });

        setupNavigation();
    }

    // ==================== NAVIGATION SETUP ====================

    function setupNavigation() {
        document.querySelectorAll('.nav-links a:not(.logout-link), .cta-button').forEach(link => {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                const targetId = this.getAttribute('href');

                if (targetId && targetId.startsWith('#')) {
                    const targetSection = document.querySelector(targetId);
                    if (targetSection) {
                        document.querySelectorAll('.nav-links a').forEach(l => l.classList.remove('active'));
                        if (this.classList.contains('nav-links')) {
                            this.classList.add('active');
                        }
                        targetSection.scrollIntoView({ behavior: 'smooth' });
                    }
                }
            });
        });
    }

    // ==================== TEMPORARY PERSON DATA MANAGEMENT ====================

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

    async function finishNewPersonCreation() {
        console.log('מסיים יצירת אדם חדש');

        if (!tempPersonData.isActive || !tempPersonData.personDetails) {
            showNotification('שגיאה: נתונים זמניים לא תקינים', 'error');
            return;
        }

        if (tempPersonData.imageUrls.length < 3) {
            showNotification('נדרשות לפחות 3 תמונות ליצירת אדם', 'error');
            console.log('❌ לא מספיק תמונות:', tempPersonData.imageUrls.length);
            return;
        }

        console.log('📤 שולח בקשה ליצירת אדם עם:', {
            person_details: tempPersonData.personDetails,
            image_urls: tempPersonData.imageUrls,
            image_count: tempPersonData.imageUrls.length
        });

        try {
            const response = await authenticatedFetch('/api/people/create_person', {
                method: 'POST',
                body: JSON.stringify({
                    person_details: tempPersonData.personDetails,
                    image_urls: tempPersonData.imageUrls
                })
            });

            if (!response) return; // טוקן פג תוקף - authenticatedFetch כבר טיפל בזה

            const data = await response.json();
            console.log('📨 תגובה מהשרת:', data);

            if (response.status === 200 || response.status === 201) {
                if (data.success !== false) {
                    showNotification('האדם נוצר בהצלחה!', 'success');
                    clearTempPersonData();
                    closeUploadModal();
                    await loadPeopleData();
                    updateDashboardStats();
                } else {
                    showNotification(data.error || 'שגיאה ביצירת האדם', 'error');
                }
            } else if (response.status === 409) {
                showNotification('אדם עם מספר זהות זה כבר קיים במערכת', 'error');
            } else if (response.status === 403) {
                showNotification('אין לך הרשאה ליצור אדם חדש', 'error');
            } else {
                console.error('❌ שגיאה מהשרת:', data);
                showNotification(data.error || `שגיאה ${response.status}: ${response.statusText}`, 'error');
            }
        } catch (error) {
            console.error('❌ שגיאה ביצירת אדם:', error);
            showNotification('שגיאה ביצירת האדם', 'error');
        }
    }

    async function cancelNewPersonCreation() {
        console.log('❌ מבטל יצירת אדם חדש');

        if (tempPersonData.uploadedImages.length > 0) {
            try {
                for (const public_id of tempPersonData.uploadedImages) {
                    await authenticatedFetch('/api/delete_temp_image', {
                        method: 'DELETE',
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

    function clearTempPersonData() {
        console.log('🧹 מנקה נתונים זמניים');
        tempPersonData = {
            isActive: false,
            personDetails: null,
            uploadedImages: [],
            imageUrls: []
        };
    }

    // ==================== EVENT HANDLERS ====================

    async function handleAddPerson(event) {
        event.preventDefault();

        const form = event.target;

        const personData = {
            first_name: form.querySelector('#first-name').value.trim(),
            last_name: form.querySelector('#last-name').value.trim(),
            id_number: form.querySelector('#id-number').value.trim()
        };

        if (!personData.first_name || !personData.last_name || !personData.id_number) {
            showNotification('נא למלא את כל השדות', 'error');
            return;
        }

        if (!/^\d+$/.test(personData.id_number)) {
            showNotification('מספר ת.ז. חייב להכיל ספרות בלבד', 'error');
            return;
        }

        if (peopleData.find(p => p.id_number === personData.id_number)) {
            showNotification('אדם עם מספר זהות זה כבר קיים במערכת', 'error');
            return;
        }

        form.closest('.modal').classList.remove('active');
        form.reset();

        startNewPersonCreation(personData);
        openUploadModalForNewPerson(personData);
    }

    function handleUploadClick(event) {
        const personId = event.currentTarget.getAttribute('data-id');
        const person = peopleData.find(p => p.id_number === personId);

        if (!person) return;

        openUploadModal(personId, `${person.first_name} ${person.last_name}`);
    }

    async function handleDeleteClick(event) {
        const personId = event.currentTarget.getAttribute('data-id');
        const person = peopleData.find(p => p.id_number === personId);

        if (!person) return;

        if (confirm(`האם אתה בטוח שברצונך למחוק את ${person.first_name} ${person.last_name}?`)) {
            try {
                const response = await authenticatedFetch(`/api/people/${personId}`, {
                    method: 'DELETE'
                });

                if (!response) return;

                const data = await response.json();

                if (data.success) {
                    showNotification('האדם נמחק בהצלחה', 'success');
                    await loadPeopleData();
                    updateDashboardStats();
                } else {
                    showNotification(data.error || 'שגיאה במחיקת אדם', 'error');
                }
            } catch (error) {
                showNotification('שגיאה במחיקת אדם', 'error');
            }
        }
    }

    function handleViewImagesClick(event) {
        const personId = event.currentTarget.getAttribute('data-id');
        const person = peopleData.find(p => p.id_number === personId);

        if (!person) return;

        const modal = document.getElementById('person-images-modal');
        const galleryContainer = document.getElementById('person-images-gallery');
        const personNameElem = document.getElementById('person-images-name');

        if (!modal || !galleryContainer || !personNameElem) return;

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

    /**
     * טיפול בלחיצה על כפתור בדיקת נוכחות כללית - מעודכן
     */
    async function handleCheckAllPeople() {
        console.log('🚀 מתחיל בדיקת נוכחות כללית');

        // בדיקת הרשאות
        if (!hasPermission('attendance_check')) {
            showNotification('אין לך הרשאה לבצע בדיקת נוכחות', 'error');
            return;
        }

        // בדיקה שיש תמונות מטרה
        try {
            const targetsResponse = await authenticatedFetch('/api/get_target_images');
            if (!targetsResponse) return;

            const targetsData = await targetsResponse.json();

            if (!targetsData.success || !targetsData.targets || targetsData.targets.length === 0) {
                showNotification('לא נמצאו תמונות מטרה. נא להעלות תמונות תחילה.', 'warning');
                return;
            }

            console.log(`📊 נמצאו ${targetsData.targets.length} תמונות מטרה`);

        } catch (error) {
            console.error('שגיאה בבדיקת תמונות מטרה:', error);
            showNotification('שגיאה בבדיקת תמונות מטרה', 'error');
            return;
        }

        // בדיקה שיש אנשים במערכת
        if (!peopleData || peopleData.length === 0) {
            showNotification('אין אנשים רשומים במערכת', 'warning');
            return;
        }

        showNotification('מתחיל בדיקת נוכחות כללית...', 'info');

        try {
            // שלב 1: חילוץ פנים
            console.log('🔄 מבצע חילוץ פנים מתמונות מטרה...');
            showNotification('שלב 1: מחלץ פנים מתמונות מטרה...', 'info');

            const extractResponse = await authenticatedFetch('/api/face-recognition/extract-faces', {
                method: 'POST'
            });

            if (!extractResponse) return;

            const extractData = await extractResponse.json();

            if (!extractData.success) {
                showNotification(`❌ שגיאה בחילוץ פנים: ${extractData.error}`, 'error');
                return;
            }

            console.log(`✅ חילוץ פנים הצליח: ${extractData.faces_extracted} פנים`);

            // שלב 2: בדיקת נוכחות
            console.log('🔄 מבצע בדיקת נוכחות...');
            showNotification('שלב 2: בודק נוכחות עבור כל האנשים...', 'info');

            const attendanceResponse = await authenticatedFetch('/api/attendance/check-all', {
                method: 'POST'
            });

            if (!attendanceResponse) return;

            const attendanceData = await attendanceResponse.json();

            if (attendanceData.success) {
                const message = `🎉 בדיקת נוכחות הושלמה!\n` +
                               `✅ נוכחים: ${attendanceData.present_people}\n` +
                               `❌ נעדרים: ${attendanceData.absent_people}\n` +
                               `📊 סה"כ נבדקו: ${attendanceData.checked_people} אנשים`;

                showNotification(message, 'success');
                console.log(`✅ בדיקת נוכחות הצליחה:`, attendanceData);

                // רענון רשימת האנשים
                console.log('🔄 מרענן נתוני אנשים...');
                showNotification('מעדכן רשימת אנשים...', 'info');

                await new Promise(resolve => setTimeout(resolve, 1000));

                await loadPeopleData();
                updateDashboardStats();

                const currentPresentCount = peopleData.filter(p => p.is_present).length;
                const currentAbsentCount = peopleData.length - currentPresentCount;

                console.log(`📈 סטטיסטיקות מעודכנות: ${currentPresentCount} נוכחים, ${currentAbsentCount} נעדרים`);

                const finalMessage = `🎉 בדיקת נוכחות הושלמה ונתונים עודכנו!\n` +
                                   `✅ נוכחים: ${currentPresentCount}\n` +
                                   `❌ נעדרים: ${currentAbsentCount}\n` +
                                   `📊 סה"כ: ${peopleData.length} אנשים`;

                showNotification(finalMessage, 'success');

            } else {
                showNotification(`❌ שגיאה בבדיקת נוכחות: ${attendanceData.error}`, 'error');
                console.error('שגיאה בבדיקת נוכחות:', attendanceData.error);
            }

        } catch (error) {
            console.error('שגיאה ברשת:', error);
            showNotification('שגיאה בתקשורת עם השרת', 'error');
        }
    }

    // ==================== UPLOAD MODAL FUNCTIONS ====================

    function resetUploadModal() {
        console.log('🧹 מאפס את חלון העלאה');

        const form = document.getElementById('upload-image-form');
        if (form) {
            form.reset();
        }

        const imagePreview = document.getElementById('image-preview');
        if (imagePreview) {
            imagePreview.src = '/web_static/img/person-placeholder.jpg';
        }

        const fileInput = document.getElementById('person-image');
        if (fileInput) {
            fileInput.value = '';
        }

        const existingProgress = document.querySelector('.upload-progress-container');
        if (existingProgress) {
            existingProgress.remove();
            console.log('🗑️ הוסר progress container קודם');
        }

        if (tempPersonData.isActive) {
            updateUploadProgress(tempPersonData.uploadedImages.length);
        } else {
            updateUploadProgress(0);
        }

        console.log('✅ חלון העלאה אופס במלואו');
    }

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

        const closeButtons = document.querySelectorAll('#upload-image-modal .close-modal');
        closeButtons.forEach(btn => {
            btn.style.visibility = 'hidden';
        });

        const newPersonNotice = document.getElementById('new-person-notice');
        if (newPersonNotice) {
            newPersonNotice.style.display = 'block';
        }

        updateUploadProgress(0);

        showModal(document.getElementById('upload-image-modal'));

        console.log('🎉 חלון העלאה לאדם חדש נפתח בהצלחה');
    }

    function openUploadModal(personId, personName) {
        console.log(`📂 פותח חלון העלאה עבור ${personName} (ID: ${personId})`);

        resetUploadModal();

        document.getElementById('upload-person-id').value = personId;

        const titleElement = document.querySelector('#upload-image-modal h3');
        if (titleElement) {
            titleElement.textContent = `העלאת תמונות עבור ${personName}`;
        }

        const closeButtons = document.querySelectorAll('#upload-image-modal .close-modal');
        closeButtons.forEach(btn => {
            btn.style.visibility = 'visible';
        });

        const newPersonNotice = document.getElementById('new-person-notice');
        if (newPersonNotice) {
            newPersonNotice.style.display = 'none';
        }

        const currentImageCount = getPersonImageCount(personId);
        console.log(`📊 מספר תמונות נוכחי: ${currentImageCount}`);

        updateUploadProgress(currentImageCount);

        showModal(document.getElementById('upload-image-modal'));

        console.log('🎉 חלון העלאה נפתח בהצלחה');
    }

    function closeUploadModal() {
        console.log('❌ סוגר חלון העלאה');

        document.getElementById('upload-image-modal').classList.remove('active');

        const closeButtons = document.querySelectorAll('#upload-image-modal .close-modal');
        closeButtons.forEach(btn => {
            btn.style.visibility = 'visible';
        });

        const newPersonNotice = document.getElementById('new-person-notice');
        if (newPersonNotice) {
            newPersonNotice.style.display = 'none';
        }

        resetUploadModal();

        if (tempPersonData.isActive) {
            clearTempPersonData();
        }

        console.log('✅ חלון העלאה נסגר ואופס');
    }

    // ==================== UPLOAD IMAGE HANDLER ====================

    async function handleUploadImage(event) {
        event.preventDefault();

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

        let successCount = 0;
        let errorCount = 0;
        let totalImages = 0;

        const form = event.target;

        let progressContainer = form.querySelector('.upload-progress-container');

        if (!progressContainer) {
            progressContainer = document.createElement('div');
            progressContainer.className = 'upload-progress-container';
            progressContainer.innerHTML = `
                <div style="margin: 15px 0; padding: 10px; background: #f0f8ff; border-radius: 5px;">
                    <div style="font-weight: bold; margin-bottom: 5px;">מעלה תמונות...</div>
                    <div id="upload-progress-text">מתחיל העלאה...</div>
                    <div style="background: #e0e0e0; height: 8px; border-radius: 4px; margin: 8px 0; overflow: hidden;">
                        <div id="upload-progress-bar" style="background: #4CAF50; height: 100%; width: 0%; transition: width 0.3s ease;"></div>
                    </div>
                </div>
            `;
            form.appendChild(progressContainer);
        }

        const progressBar = progressContainer.querySelector('#upload-progress-bar');
        const progressText = progressContainer.querySelector('#upload-progress-text');

        progressContainer.scrollIntoView({
            behavior: 'smooth',
            block: 'center'
        });

        progressBar.style.width = '0%';
        progressText.textContent = 'מתחיל העלאה...';

        for (let i = 0; i < files.length; i++) {
            const file = files[i];

            try {
                progressText.textContent = `מעלה תמונה ${i + 1} מתוך ${files.length}: ${file.name.substring(0, 20)}...`;

                const formData = new FormData();
                formData.append('image', file);

                if (tempPersonData.isActive) {
                    formData.append('first_name', tempPersonData.personDetails.id_number);
                    formData.append('last_name', 'person');
                    formData.append('id_number', tempPersonData.personDetails.id_number);
                }

                console.log(`מעלה קובץ: ${file.name}`);

                let response;

                if (tempPersonData.isActive) {
                    // אדם חדש - העלאה לתיקייה זמנית
                    response = await authenticatedFetch('/api/upload_temp_image', {
                        method: 'POST',
                        body: formData,
                        headers: {} // ביטול Content-Type כי FormData יגדיר אותו אוטומטית
                    });
                } else {
                    // אדם קיים - העלאה רגילה
                    response = await authenticatedFetch('/api/upload_temp_image', {
                        method: 'POST',
                        body: formData,
                        headers: {}
                    });
                }

                if (!response) return;

                const data = await response.json();
                console.log(`תגובה עבור ${file.name}:`, data);

                if (data.success) {
                    successCount++;

                    if (tempPersonData.isActive) {
                        tempPersonData.uploadedImages.push(data.public_id);
                        tempPersonData.imageUrls.push(data.image_url);
                        totalImages = tempPersonData.imageUrls.length;
                    } else {
                        totalImages = successCount;
                    }

                    const progress = ((i + 1) / files.length) * 100;
                    progressBar.style.width = `${progress}%`;

                    console.log(`✅ הועלה בהצלחה: ${file.name} (סה"כ תמונות: ${totalImages})`);

                    updateUploadProgress(totalImages);

                    if (totalImages >= 5) {
                        progressText.textContent = `הגעת למקסימום תמונות (5). הועלו ${successCount} תמונות.`;
                        showNotification('הגעת למקסימום תמונות (5)', 'warning');
                        break;
                    }
                } else {
                    errorCount++;
                    console.error(`❌ שגיאה בהעלאת ${file.name}:`, data.error);

                    const progress = ((i + 1) / files.length) * 100;
                    progressBar.style.width = `${progress}%`;

                    if (data.error && data.error.includes('מקסימום')) {
                        progressText.textContent = `הגעת למקסימום תמונות. הועלו ${successCount} תמונות.`;
                        break;
                    }
                }
            } catch (error) {
                errorCount++;
                console.error(`❌ שגיאת רשת בהעלאת ${file.name}:`, error);

                const progress = ((i + 1) / files.length) * 100;
                progressBar.style.width = `${progress}%`;
            }

            if (i < files.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 300));
            }
        }

        progressBar.style.width = '100%';

        let summaryMessage = '';
        let notificationType = 'success';

        if (successCount > 0 && errorCount === 0) {
            summaryMessage = `🎉 כל התמונות הועלו בהצלחה! (${successCount}/${files.length})`;
            progressText.textContent = `הושלם! הועלו ${successCount} תמונות בהצלחה`;
            progressContainer.style.background = '#e8f5e8';
            notificationType = 'success';
        } else if (successCount > 0 && errorCount > 0) {
            summaryMessage = `⚠️ הועלו ${successCount} תמונות, נכשלו ${errorCount}`;
            progressText.textContent = `הושלם חלקית: ${successCount} הצליחו, ${errorCount} נכשלו`;
            progressContainer.style.background = '#fff3cd';
            notificationType = 'warning';
        } else {
            summaryMessage = `❌ כל ההעלאות נכשלו (${errorCount} שגיאות)`;
            progressText.textContent = `כל ההעלאות נכשלו`;
            progressContainer.style.background = '#ffebee';
            notificationType = 'error';
        }

        console.log('סיכום העלאה:', summaryMessage);
        showNotification(summaryMessage, notificationType);

        if (!tempPersonData.isActive) {
            await loadPeopleData();
        }

        setTimeout(() => {
            document.getElementById('upload-image-form').reset();

            const imagePreview = document.getElementById('image-preview');
            if (imagePreview) {
                imagePreview.src = '/web_static/img/person-placeholder.jpg';
            }

            if (progressContainer && progressContainer.parentNode) {
                progressContainer.remove();
            }
        }, 3000);
    }

    // ==================== HELPER FUNCTIONS ====================

    function getPersonImageCount(personId) {
        try {
            if (tempPersonData.isActive && tempPersonData.personDetails &&
                tempPersonData.personDetails.id_number === personId) {
                return tempPersonData.uploadedImages.length;
            }

            const globalPerson = peopleData.find(p => p.id_number === personId);
            if (globalPerson && globalPerson.image_urls) {
                console.log(`נמצא ב-peopleData: ${globalPerson.image_urls.length} תמונות`);
                return globalPerson.image_urls.length;
            }

            console.log('לא נמצאו תמונות - מחזיר 0');
            return 0;
        } catch (error) {
            console.error('שגיאה בקבלת מספר תמונות:', error);
            return 0;
        }
    }

    function updateUploadProgress(imageCount) {
        console.log(`🎯 מעדכן מד התקדמות ל: ${imageCount} תמונות`);

        for (let i = 1; i <= 5; i++) {
            const step = document.getElementById(`progress-step-${i}`);
            if (step) {
                if (i <= imageCount) {
                    step.classList.add('completed');
                    step.style.backgroundColor = '#4caf50';
                    step.style.borderColor = '#4caf50';
                    console.log(`✅ פס ${i} מושלם`);
                } else {
                    step.classList.remove('completed');
                    step.style.backgroundColor = '#ddd';
                    step.style.borderColor = '#ddd';
                    console.log(`⭕ פס ${i} לא מושלם`);
                }
            } else {
                console.warn(`❌ לא נמצא פס ${i}`);
            }
        }

        const statusEl = document.getElementById('upload-status');
        if (statusEl) {
            const remaining = Math.max(0, 3 - imageCount);

            if (imageCount === 0) {
                statusEl.textContent = 'יש להעלות לפחות 3 תמונות ועד 5 תמונות בסך הכל';
                statusEl.style.color = '#666';
                console.log('📝 הוגדר טקסט התחלתי');
            } else if (remaining > 0) {
                statusEl.textContent = `יש לך ${imageCount} תמונות. נדרשות עוד ${remaining} תמונות לפחות.`;
                statusEl.style.color = '#ff9800';
                console.log(`📝 נדרשות עוד ${remaining} תמונות`);
            } else if (imageCount < 5) {
                statusEl.textContent = `יש לך ${imageCount} תמונות. ניתן להוסיף עד ${5 - imageCount} תמונות נוספות.`;
                statusEl.style.color = '#4caf50';
                console.log(`📝 ניתן להוסיף עוד ${5 - imageCount} תמונות`);
            } else {
                statusEl.textContent = `יש לך ${imageCount} תמונות (מקסימום).`;
                statusEl.style.color = '#4caf50';
                console.log('📝 הגעת למקסימום');
            }
        } else {
            console.warn('❌ לא נמצא אלמנט upload-status');
        }

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

    async function checkServerConnection() {
        try {
            const response = await authenticatedFetch('/api/get_loaded_people');
            if (!response) return false;

            const data = await response.json();
            console.log('✅ שרת מחובר:', data);
            return true;
        } catch (error) {
            console.error('❌ שרת לא מחובר:', error);
            showNotification('שגיאה: לא ניתן להתחבר לשרת', 'error');
            return false;
        }
    }

    async function loadPeopleData() {
        console.log('🔄 מתחיל לטעון נתוני אנשים...');

        try {
            const response = await authenticatedFetch('/api/get_loaded_people');
            if (!response) return;

            console.log('📡 תגובת שרת:', response.status);

            if (!response.ok) {
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
                console.log('⚠️ שגיאה: ' + data.error);
            } else {
                peopleData = [];
                console.log('⚠️ לא נמצאו אנשים במערכת או שגיאה בנתונים');
                console.log('📋 מבנה התגובה:', data);
            }

            renderPeopleTable();
            updateDashboardStats();
        } catch (error) {
            console.error('❌ שגיאה בטעינת נתוני אנשים:', error);
            showNotification('שגיאה בטעינת רשימת אנשים', 'error');
            peopleData = [];
            renderPeopleTable();
        }
    }

    function renderPeopleTable() {
        console.log('🎨 מתחיל לרנדר טבלת אנשים...');

        const tableBody = document.getElementById('people-table-body');
        if (!tableBody) {
            console.error('❌ לא נמצא אלמנט people-table-body!');
            return;
        }

        console.log('📋 מספר אנשים לרינדור:', peopleData.length);
        tableBody.innerHTML = '';

        if (peopleData.length === 0) {
            const emptyRow = `<tr><td colspan="5" style="text-align: center; padding: 20px; color: #666;">אין אנשים במערכת</td></tr>`;
            tableBody.innerHTML = emptyRow;
            console.log('📝 הוצגה הודעת "אין אנשים"');
            return;
        }

        peopleData.forEach((person, index) => {
            console.log(`🔄 מעבד אדם ${index + 1}:`, person);

            const row = document.createElement('tr');

            let imageUrl = '/web_static/img/person-placeholder.jpg';
            if (person.image_urls && person.image_urls.length > 0) {
                imageUrl = person.image_urls[0];
            }

            const imageCounter = person.image_count > 0 ?
                `<span class="image-count">${person.image_count}</span>` : '';

            const statusClass = person.is_present ? 'status-present' : 'status-absent';
            const statusText = person.is_present ? 'נוכח' : 'נעדר';

            // כפתורי פעולה לפי הרשאות
            let actionButtons = '';

            if (hasPermission('manage_people')) {
                actionButtons += `
                    <button class="upload" data-id="${person.id_number}" title="העלאת תמונה">
                        <i class="fas fa-upload"></i>
                    </button>
                    <button class="delete" data-id="${person.id_number}" title="מחיקה">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                `;
            }

            if (person.image_count > 0) {
                actionButtons += `
                    <button class="view-images" data-id="${person.id_number}" title="צפייה בכל התמונות">
                        <i class="fas fa-images"></i>
                    </button>
                `;
            }

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
                        ${actionButtons}
                    </div>
                </td>
            `;

            tableBody.appendChild(row);
        });

        console.log(`✅ הושלם רינדור ${peopleData.length} אנשים`);

        // הוספת מאזיני אירועים לכפתורים החדשים
        if (hasPermission('manage_people')) {
            tableBody.querySelectorAll('.upload').forEach(b =>
                b.addEventListener('click', handleUploadClick)
            );
            tableBody.querySelectorAll('.delete').forEach(b =>
                b.addEventListener('click', handleDeleteClick)
            );
        }

        tableBody.querySelectorAll('.view-images').forEach(b =>
            b.addEventListener('click', handleViewImagesClick)
        );

        console.log('🎯 הוספו מאזיני אירועים לכפתורים');
    }

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

    function updateDashboardStats() {
        const totalPeople = peopleData.length;
        const presentPeople = peopleData.filter(p => p.is_present).length;
        const absentPeople = totalPeople - presentPeople;

        const totalEl = document.getElementById('total-people');
        const presentEl = document.getElementById('present-people');
        const absentEl = document.getElementById('absent-people');

        if (totalEl) totalEl.textContent = totalPeople;
        if (presentEl) presentEl.textContent = presentPeople;
        if (absentEl) absentEl.textContent = absentPeople;

        const attendancePresentEl = document.getElementById('attendance-present');
        const attendanceAbsentEl = document.getElementById('attendance-absent');
        const attendancePercentageEl = document.getElementById('attendance-percentage');

        if (attendancePresentEl) attendancePresentEl.textContent = presentPeople;
        if (attendanceAbsentEl) attendanceAbsentEl.textContent = absentPeople;
        if (attendancePercentageEl) {
            const percentage = totalPeople > 0 ? Math.round((presentPeople / totalPeople) * 100) : 0;
            attendancePercentageEl.textContent = `${percentage}%`;
        }
    }

    function setCurrentDate() {
        const dateInput = document.getElementById('attendance-date');
        if (dateInput) {
            const today = new Date().toISOString().split('T')[0];
            dateInput.value = today;
        }
    }

    // ==================== TARGET IMAGE FUNCTIONS ====================

    async function loadTargetImages() {
        console.log('🔄 טוען תמונות מטרה...');

        try {
            const response = await authenticatedFetch('/api/get_target_images');
            if (!response) return;

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
                console.log(`📊 נמצאו ${data.targets.length} targets`);

                let totalImages = 0;
                data.targets.forEach(target => {
                    if (target.images_url && Array.isArray(target.images_url)) {
                        totalImages += target.images_url.length;
                    }
                });

                if (galleryStats) {
                    galleryStats.textContent = `${totalImages} תמונות מטרה`;
                }

                data.targets.forEach((target, targetIndex) => {
                    console.log(`🎯 מעבד target ${targetIndex}:`, target);

                    if (target.images_url && Array.isArray(target.images_url) && target.images_url.length > 0) {
                        target.images_url.forEach((imageUrl, imgIndex) => {
                            const card = document.createElement('div');
                            card.className = 'target-image-card';
                            card.innerHTML = `
                                <input type="checkbox" class="target-checkbox" data-camera="${target.camera_number}" data-index="${imgIndex}">
                                <img src="${imageUrl}" alt="מצלמה ${target.camera_number} - תמונה ${imgIndex + 1}" loading="lazy">
                                <div class="target-image-info">
                                    <div>מצלמה ${target.camera_number}</div>
                                    <div>תמונה ${imgIndex + 1}</div>
                                </div>
                            `;
                            galleryGrid.appendChild(card);
                        });
                    }
                });

                document.querySelectorAll('.target-checkbox').forEach(checkbox => {
                    checkbox.addEventListener('change', updateDeleteButton);
                });

                console.log(`✅ הוצגו ${totalImages} תמונות מטרה`);

            } else {
                console.log('📭 אין תמונות מטרה');

                if (galleryStats) {
                    galleryStats.textContent = 'אין תמונות מטרה';
                }
                galleryGrid.innerHTML = `
                    <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: #666;">
                        <div style="font-size: 48px; margin-bottom: 15px;">📷</div>
                        <h3>אין תמונות מטרה</h3>
                        <p>העלה תמונות כדי להתחיל</p>
                    </div>
                `;
            }
        } catch (error) {
            console.error('❌ שגיאה בטעינת תמונות מטרה:', error);
            showNotification('שגיאה בטעינת תמונות מטרה', 'error');

            const galleryGrid = document.getElementById('target-gallery-grid');
            const galleryStats = document.getElementById('target-gallery-stats');

            if (galleryStats) {
                galleryStats.textContent = 'שגיאה בטעינה';
            }

            if (galleryGrid) {
                galleryGrid.innerHTML = `
                    <div style="grid-column: 1/-1; text-align: center; padding: 20px; color: #e74c3c;">
                        ❌ שגיאה בטעינת התמונות
                        <button onclick="loadTargetImages()" style="display: block; margin: 10px auto; padding: 8px 16px; background: #e74c3c; color: white; border: none; border-radius: 4px; cursor: pointer;">
                            נסה שוב
                        </button>
                    </div>
                `;
            }
        }
    }

    function handleTargetFileSelection() {
        const fileInput = document.getElementById('target-file-input');
        const uploadArea = document.querySelector('.upload-area');
        const files = fileInput.files;

        if (files.length > 0) {
            console.log(`נבחרו ${files.length} קבצים לתמונות מטרה`);
            updateUploadAreaWithPreview(files, uploadArea);
        } else {
            resetUploadArea(uploadArea);
        }
    }

    function updateUploadAreaWithPreview(files, uploadArea) {
        const filesArray = Array.from(files);

        let previewHTML = `
            <div class="upload-preview">
                <div class="upload-icon">📁</div>
                <div class="upload-text">נבחרו ${files.length} קבצים</div>
                <div class="upload-hint">לחץ "העלה קבצים" להמשיך או בחר קבצים נוספים</div>
                <div class="selected-files">
        `;

        filesArray.forEach((file, index) => {
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
        uploadArea.style.borderColor = '#007bff';
        uploadArea.style.backgroundColor = '#f8f9fa';

        updateUploadButton(files.length);
    }

    function resetUploadArea(uploadArea) {
        uploadArea.innerHTML = `
            <div class="upload-icon">📁</div>
            <div class="upload-text">לחץ כאן או גרור קבצים להעלאה</div>
            <div class="upload-hint">תמיכה בתמונות וסרטונים (JPG, PNG, MP4, וכו')</div>
        `;
        uploadArea.style.borderColor = '#ccc';
        uploadArea.style.backgroundColor = '';

        updateUploadButton(0);
    }

    function updateUploadButton(fileCount) {
        const uploadBtn = document.querySelector('.target-btn-upload');
        if (uploadBtn) {
            if (fileCount > 0) {
                uploadBtn.textContent = `📤 העלה ${fileCount} קבצים`;
                uploadBtn.disabled = false;
                uploadBtn.style.backgroundColor = '#28a745';
            } else {
                uploadBtn.textContent = '📤 בחר קבצים תחילה';
                uploadBtn.disabled = true;
                uploadBtn.style.backgroundColor = '#ccc';
            }
        }
    }

    async function uploadTargetFiles() {
        // בדיקת הרשאות
        if (!hasPermission('manage_targets')) {
            showNotification('אין לך הרשאה להעלות תמונות מטרה', 'error');
            return;
        }

        const fileInput = document.getElementById('target-file-input');
        const loading = document.getElementById('target-loading');

        if (!fileInput.files.length) {
            showNotification('נא לבחור קבצים', 'error');
            return;
        }

        console.log(`📤 מעלה ${fileInput.files.length} תמונות מטרה...`);

        if (loading) loading.style.display = 'flex';

        try {
            let successCount = 0;
            let errorCount = 0;

            for (let i = 0; i < fileInput.files.length; i++) {
                const file = fileInput.files[i];
                console.log(`📷 מעלה קובץ ${i + 1}/${fileInput.files.length}: ${file.name}`);

                try {
                    const formData = new FormData();
                    formData.append('image', file);

                    const tempResponse = await authenticatedFetch('/api/upload_temp_image', {
                        method: 'POST',
                        body: formData,
                        headers: {}
                    });

                    if (!tempResponse) return;

                    const tempData = await tempResponse.json();

                    if (tempData.success) {
                        console.log(`✅ העלאה זמנית הצליחה עבור ${file.name}:`, tempData);

                        const targetPayload = {
                            camera_number: Date.now() + i,
                            image_url: tempData.image_url
                        };

                        console.log(`📤 שולח target payload:`, targetPayload);

                        const targetResponse = await authenticatedFetch('/api/target-images', {
                            method: 'POST',
                            body: JSON.stringify(targetPayload)
                        });

                        if (!targetResponse) return;

                        console.log(`📨 תגובת target server: status ${targetResponse.status}`);

                        const responseText = await targetResponse.text();
                        console.log(`📋 raw response text:`, responseText);

                        let targetData;
                        try {
                            targetData = JSON.parse(responseText);
                            console.log(`📋 target response data:`, targetData);
                        } catch (parseError) {
                            console.error(`❌ שגיאה בפענוח JSON:`, parseError);
                            console.error(`❌ התגובה שלא ניתן לפענח:`, responseText);
                            errorCount++;
                            continue;
                        }

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

                if (i < fileInput.files.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 200));
                }
            }

            if (successCount > 0 && errorCount === 0) {
                showNotification(`🎉 הועלו ${successCount} תמונות מטרה בהצלחה!`, 'success');
            } else if (successCount > 0 && errorCount > 0) {
                showNotification(`⚠️ הועלו ${successCount} תמונות, נכשלו ${errorCount}`, 'warning');
            } else {
                showNotification(`❌ כל ההעלאות נכשלו`, 'error');
            }

            fileInput.value = '';
            const uploadArea = document.querySelector('.upload-area');
            uploadArea.querySelector('.upload-text').textContent = 'לחץ כאן או גרור קבצים להעלאה';
            uploadArea.style.borderColor = '#ccc';

            await loadTargetImages();

        } catch (error) {
            console.error('שגיאה כללית בהעלאת תמונות מטרה:', error);
            showNotification('שגיאה בהעלאת תמונות מטרה', 'error');
        } finally {
            if (loading) loading.style.display = 'none';
        }
    }

    function updateDeleteButton() {
        const deleteBtn = document.getElementById('target-delete-btn');
        const checkedBoxes = document.querySelectorAll('.target-checkbox:checked');

        if (deleteBtn) {
            deleteBtn.disabled = checkedBoxes.length === 0;
        }
    }

    async function deleteSelectedTargets() {
        // בדיקת הרשאות
        if (!hasPermission('manage_targets')) {
            showNotification('אין לך הרשאה למחוק תמונות מטרה', 'error');
            return;
        }

        const checkedBoxes = document.querySelectorAll('.target-checkbox:checked');

        if (checkedBoxes.length === 0) {
            showNotification('לא נבחרו תמונות למחיקה', 'error');
            return;
        }

        const confirmed = confirm(`האם למחוק ${checkedBoxes.length} תמונות?`);
        if (!confirmed) return;

        try {
            const cameraNumbers = Array.from(checkedBoxes).map(cb =>
                parseInt(cb.getAttribute('data-camera'))
            );

            for (const cameraNumber of new Set(cameraNumbers)) {
                const response = await authenticatedFetch(`/api/targets/${cameraNumber}`, {
                    method: 'DELETE'
                });

                if (!response || !response.ok) {
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

    // ==================== UTILITY FUNCTIONS ====================

    function showModal(modal) {
        if(modal) modal.classList.add('active');
    }

    function closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('active');
        }
    }

    function showNotification(message, type = 'info') {
        let container = document.querySelector('.notification-container');
        if (!container) {
            container = document.createElement('div');
            container.className = 'notification-container';
            document.body.appendChild(container);
        }

        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `<span class="notification-message">${message}</span><button class="notification-close">&times;</button>`;

        container.appendChild(notification);

        const closeBtn = notification.querySelector('.notification-close');
        const autoClose = setTimeout(() => closeNotification(notification), 5000);

        function closeNotification() {
            notification.classList.add('closing');
            setTimeout(() => {
                notification.remove();
                clearTimeout(autoClose);
            }, 300);
        }

        closeBtn.addEventListener('click', closeNotification);
    }

    // ==================== GLOBAL FUNCTIONS FOR HTML ====================

    window.uploadTargetFiles = uploadTargetFiles;
    window.deleteSelectedTargets = deleteSelectedTargets;
    window.loadTargetImages = loadTargetImages;

    // ==================== MAIN INITIALIZATION ====================

    initialize();

    // ==================== CONSOLE MESSAGE ====================

    console.log('✅ AttendMe v2.0 - מערכת ניהול נוכחות עם בתי ספר מרובים אותחלה בהצלחה');
    console.log('📊 סטטיסטיקות אתחול:', {
        'משתמש מחובר': currentUser ? currentUser.username : 'לא מחובר',
        'בית ספר נוכחי': currentSchool ? currentSchool.name : 'לא ידוע',
        'תמיכה באותנטיקציה': '✅',
        'בתי ספר מרובים': '✅'
    });

});

/**
 * ==================== END OF FILE ====================
 *
 * גרסה 2.0 - שינויים עיקריים:
 * - אותנטיקציה מלאה עם JWT
 * - תמיכה בבתי ספר מרובים
 * - הרשאות משתמשים מתקדמות
 * - API מעודכן עם בדיקות אבטחה
 * - ממשק משתמש מותאם לכל בית ספר
 * - ניהול סשנים מתקדם
 * - תמיכה בתפקידים שונים (מנהל, מורה, צוות, משתמש)
 */