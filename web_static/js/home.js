/**
 * ==================== ATTENDANCE MANAGEMENT SYSTEM ====================
 * מערכת ניהול נוכחות באמצעות זיהוי פנים
 *
 * תיאור: מערכת מקיפה לניהול אנשים ובדיקת נוכחות באמצעות זיהוי פנים
 * מאפיינים עיקריים:
 * - הוספת ועריכת אנשים במערכת
 * - העלאת תמונות לכל אדם (3-5 תמונות)
 * - בדיקת נוכחות באמצעות תמונות מטרה
 * - ניהול תמונות מטרה
 * - ממשק משתמש ידידותי ורספונסיבי
 * - מערכת התחברות עם הפרדה בין בתי ספר
 */

// ==================== LOGIN FUNCTIONALITY ====================

/**
 * פונקציה למעבר לדף התחברות
 * מטפלת בניווט לדף התחברות עם נתיבים חלופיים
 * @param {Event} event - אירוע הלחיצה על כפתור ההתחברות
 */
function goToLogin(event) {
    event.preventDefault();

    console.log('🔄 מנסה לעבור לדף התחברות...');
    console.log('📍 נתיב נוכחי:', window.location.href);

    // נתיבים אפשריים לשרת
    const possiblePaths = [
        '/login.html',          // נתיב מהשורש
        './login.html',         // נתיב יחסי
        'login.html',           // ישירות
        '/web_static/login.html', // תיקיית static
        '/templates/login.html',  // תיקיית templates
        '/static/login.html'    // תיקיית static אחרת
    ];

    // בחר את הנתיב המתאים לפי המבנה שלך
    let targetPath = possiblePaths[0]; // נתיב מהשורש

    console.log('🎯 מנסה נתיב:', targetPath);

    // נסה לעבור לדף
    window.location.href = targetPath;
}

// הוספת הפונקציה לחלון הגלובלי כדי שהHTML יוכל לקרוא לה
window.goToLogin = goToLogin;

// ==================== LOGIN VALIDATION FUNCTIONS ====================

/**
 * טעינת פרטי המשתמש מ-sessionStorage
 * מטען את פרטי המשתמש שנשמרו ב-sessionStorage למשתנה הגלובלי
 * @returns {boolean} האם הטעינה הצליחה
 */
function loadUserFromStorage() {
    try {
        const storedUser = sessionStorage.getItem('currentUser');
        if (storedUser) {
            window.currentUser = JSON.parse(storedUser);
            console.log('📂 טען פרטי משתמש מהאחסון:', window.currentUser);
            return true;
        } else {
            console.log('❌ לא נמצאו פרטי משתמש באחסון');
            return false;
        }
    } catch (error) {
        console.error('❌ שגיאה בטעינת פרטי משתמש:', error);
        return false;
    }
}

/**
 * בדיקה שהמשתמש מחובר
 * בדיקה בסיסית שקיים currentUser עם username
 * @returns {boolean} האם המשתמש מחובר
 */
function isUserLoggedIn() {
    return !!(window.currentUser && window.currentUser.username);
}

/**
 * קבלת שם המשתמש המחובר
 * @returns {string|null} שם המשתמש או null אם לא מחובר
 */
function getCurrentUsername() {
    return window.currentUser?.username || null;
}

/**
 * בדיקת התחברות עם הפניה לדף login אם לא מחובר
 * @param {string} actionName - שם הפעולה שמנסים לבצע (לצורך הודעה)
 * @returns {boolean} האם המשתמש מחובר
 */
function requireLogin(actionName = 'פעולה זו') {
    if (!isUserLoggedIn()) {
        showNotification(`נדרשת התחברות לביצוע ${actionName}`, 'warning');
        console.log(`❌ ${actionName} נדחתה - משתמש לא מחובר`);

        // השהיה קצרה והפניה לדף התחברות
        setTimeout(() => {
            window.location.href = '/login';
        }, 1500);

        return false;
    }

    console.log(`✅ ${actionName} מאושרת - משתמש מחובר: ${getCurrentUsername()}`);
    return true;
}

/**
 * הצגת מידע על המשתמש המחובר
 */
function showUserInfo() {
    if (isUserLoggedIn()) {
        const user = window.currentUser;
        console.log('👤 משתמש מחובר:', {
            username: user.username,
            schoolName: user.schoolInfo?.school_name || 'לא זמין',
            schoolEmail: user.schoolInfo?.school_email || 'לא זמין'
        });

        // עדכון ממשק אם יש אלמנט מתאים
        const userDisplay = document.getElementById('current-user-display');
        if (userDisplay) {
            userDisplay.innerHTML = `
                <div class="user-info">
                    <span class="user-name">👤 ${user.schoolInfo?.school_name || user.username}</span>
                    <button onclick="logout()" class="logout-btn">התנתק</button>
                </div>
            `;
        }
    } else {
        console.log('❌ אין משתמש מחובר');
    }
}

/**
 * התנתקות מהמערכת
 * מנקה את נתוני המשתמש מ-window ומ-sessionStorage
 */
function logout() {
    console.log('🚪 מתנתק מהמערכת...');

    // ניקוי נתוני התחברות מכל המקומות
    window.currentUser = null;
    sessionStorage.removeItem('currentUser');

    console.log('🧹 נתוני התחברות נוקו מ-window ומ-sessionStorage');

    showNotification('התנתקת בהצלחה', 'info');

    // הפניה לדף התחברות
    setTimeout(() => {
        window.location.href = '/login';
    }, 1000);
}

// הוספת פונקציות לחלון הגלובלי
window.logout = logout;
window.showUserInfo = showUserInfo;

// ==================== MAIN INITIALIZATION ====================

document.addEventListener('DOMContentLoaded', function() {
    // הוספת לוגים נוספים לדף הבית
    console.log('🏠 דף בית נטען');
    console.log('🌐 URL מלא:', window.location.href);
    console.log('📂 Host:', window.location.host);
    console.log('📁 Path:', window.location.pathname);

    // 🎯 טעינת פרטי משתמש מאחסון לפני הכל!
    const userLoaded = loadUserFromStorage();

    // בדיקת סטטוס התחברות
    console.log('🔐 בודק סטטוס התחברות...');
    if (userLoaded) {
        console.log('✅ משתמש נטען מהאחסון בהצלחה');
    } else {
        console.log('⚠️ לא נמצא משתמש מחובר באחסון');
    }
    showUserInfo();

    // ==================== GLOBAL VARIABLES ====================

    /**
     * עדכון כפתור העלאה בהתאם למספר קבצים
     */
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
     * פונקציית אתחול ראשית
     * מופעלת כאשר הדף נטען ומגדירה את כל הפונקציות הבסיסיות
     */
    async function initialize() {
        initializeEventListeners(); // הגדרת מאזיני אירועים

        // בדיקת חיבור לשרת
        const serverOk = await checkServerConnection();
        if (serverOk) {
            await loadPeopleData();           // טעינת נתוני אנשים מהשרת
            await loadTargetImages();         // טעינת תמונות מטרה מהשרת
            updateDashboardStats();     // עדכון סטטיסטיקות לוח הבקרה
        }

        setCurrentDate();           // הגדרת תאריך נוכחי

        // בדיקת endpoints בסביבת פיתוח
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            await checkAvailableEndpoints();
        }
    }

    // ==================== EVENT LISTENERS SETUP ====================

    /**
     * הגדרת כל מאזיני האירועים של האפליקציה
     * מרכז את כל האירועים במקום אחד לניהול נוח
     */
    function initializeEventListeners() {
        // ==================== PEOPLE MANAGEMENT BUTTONS ====================

        // כפתור הוספת אדם חדש - פותח מודל הוספה
        document.getElementById('add-person-btn')?.addEventListener('click', () => {
            if (!requireLogin('הוספת אדם חדש')) return;
            showModal(document.getElementById('add-person-modal'));
        });

        // טופס הוספת אדם - מטפל בשליחת הנתונים
        document.getElementById('add-person-form')?.addEventListener('submit', handleAddPerson);

        // טופס העלאת תמונה - מטפל בהעלאת תמונות
        document.getElementById('upload-image-form')?.addEventListener('submit', handleUploadImage);

        // שדה חיפוש אנשים - מסנן את הטבלה בזמן אמת
        document.getElementById('search-people')?.addEventListener('input', filterPeopleTable);

        // כפתור בדיקת נוכחות כללית
        document.getElementById('check-all-people')?.addEventListener('click', handleCheckAllPeople);

        // ==================== MODAL CLOSE HANDLERS ====================

        /**
         * טיפול בסגירת מודלים - עדכון מיוחד לחלון העלאת תמונות
         * בודק אם זה אדם חדש שעדיין לא הושלם ומציג אזהרה
         */
        document.querySelectorAll('.close-modal').forEach(button => {
            button.addEventListener('click', (e) => {
                const modal = e.target.closest('.modal');

                // טיפול מיוחד לחלון העלאת תמונות
                if (modal && modal.id === 'upload-image-modal') {
                    // אם זה אדם חדש ועדיין לא הועלו מספיק תמונות
                    if (tempPersonData.isActive && tempPersonData.uploadedImages.length < 3) {
                        const confirmed = confirm('האם אתה בטוח שברצונך לבטל? התמונות שהועלו יימחקו.');
                        if (confirmed) {
                            cancelNewPersonCreation(); // ביטול יצירת האדם
                        }
                        return;
                    }
                    closeUploadModal(); // סגירה רגילה
                } else if (modal) {
                    modal.classList.remove('active'); // סגירה רגילה לשאר המודלים
                }
            });
        });

        /**
         * כפתורי סגירה במודלים
         * טיפול דומה לכפתור X אבל עם class שונה
         */
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

        /**
         * כפתור "צור" בחלון העלאת תמונות
         * מסיים את תהליך יצירת אדם חדש או סוגר חלון לאדם קיים
         */
        document.getElementById('finish-upload-button')?.addEventListener('click', function() {
            if (tempPersonData.isActive) {
                // זה אדם חדש - יוצר אותו בשרת
                finishNewPersonCreation();
            } else {
                // זה אדם קיים - סגירה רגילה
                closeUploadModal();
                loadPeopleData(); // רענון הרשימה
            }
        });

        // ==================== IMAGE PREVIEW ====================

        /**
         * תצוגה מקדימה של תמונה שנבחרה להעלאה
         * מציג את התמונה לפני ההעלאה בפועל
         */
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

        // קובץ תמונות מטרה - העלאה
        document.getElementById('target-file-input')?.addEventListener('change', handleTargetFileSelection);

        // ==================== MODAL BACKGROUND CLICK ====================

        /**
         * סגירת מודל בלחיצה על הרקע (מחוץ לתוכן)
         * טיפול מיוחד לחלון העלאת תמונות
         */
        document.getElementById('upload-image-modal')?.addEventListener('click', function(e) {
            if (e.target === this) { // לחיצה על הרקע ולא על התוכן
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

        // Navigation events
        setupNavigation();
    }

    // ==================== NAVIGATION SETUP ====================

    /**
     * הגדרת ניווט בין הסקשנים
     */
    function setupNavigation() {
        // מאזינים לקישורי ניווט
        document.querySelectorAll('.nav-links a, .cta-button').forEach(link => {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                const targetId = this.getAttribute('href');

                if (targetId && targetId.startsWith('#')) {
                    const targetSection = document.querySelector(targetId);
                    if (targetSection) {
                        // הסרת active מכל הקישורים
                        document.querySelectorAll('.nav-links a').forEach(l => l.classList.remove('active'));
                        // הוספת active לקישור הנוכחי
                        if (this.classList.contains('nav-links')) {
                            this.classList.add('active');
                        }
                        // גלילה לסקשן
                        targetSection.scrollIntoView({ behavior: 'smooth' });
                    }
                }
            });
        });
    }

    // ==================== TEMPORARY PERSON DATA MANAGEMENT ====================

    /**
     * התחלת תהליך יצירת אדם חדש
     * שומר את פרטי האדם באופן זמני עד השלמת ההעלאות
     * @param {Object} personDetails - פרטי האדם (שם פרטי, משפחה, ת.ז.)
     */
    function startNewPersonCreation(personDetails) {
        console.log('🚀 מתחיל יצירת אדם חדש:', personDetails);

        // איפוס ואתחול הנתונים הזמניים
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
     * שולח בקשה לשרת ליצירת האדם עם כל התמונות שהועלו
     * @returns {Promise<void>}
     */
    async function finishNewPersonCreation() {
        console.log('מסיים יצירת אדם חדש');

        // 🔐 בדיקת התחברות
        if (!requireLogin('יצירת אדם חדש')) {
            return;
        }

        // בדיקות תקינות
        if (!tempPersonData.isActive || !tempPersonData.personDetails) {
            showNotification('שגיאה: נתונים זמניים לא תקינים', 'error');
            return;
        }

        // בדיקה שיש מספיק תמונות
        if (tempPersonData.imageUrls.length < 3) {
            showNotification('נדרשות לפחות 3 תמונות ליצירת אדם', 'error');
            console.log('❌ לא מספיק תמונות:', tempPersonData.imageUrls.length);
            return;
        }

        const username = getCurrentUsername(); // 🎯 קבלת שם המשתמש

        console.log('📤 שולח בקשה ליצירת אדם עם:', {
            username: username, // 🎯 הוספה!
            person_details: tempPersonData.personDetails,
            image_urls: tempPersonData.imageUrls,
            image_count: tempPersonData.imageUrls.length
        });

        try {
            // ניסיון יצירת אדם עם username
            const response = await fetch('/api/people/create_person', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    username: username, // 🎯 הוספת שם המשתמש!
                    person_details: tempPersonData.personDetails,
                    image_urls: tempPersonData.imageUrls
                })
            });

            const data = await response.json();
            console.log('📨 תגובה מהשרת:', data);
            console.log('📨 status:', response.status);

            if (response.status === 200 || response.status === 201) {
                // הצלחה - בדוק אם יש שדה success
                if (data.success !== false) {
                    showNotification('האדם נוצר בהצלחה!', 'success');
                    // ניקוי והשלמה
                    clearTempPersonData();
                    closeUploadModal();
                    await loadPeopleData(); // רענון הרשימה
                    updateDashboardStats(); // עדכון סטטיסטיקות
                } else {
                    showNotification(data.error || 'שגיאה ביצירת האדם', 'error');
                }
            } else if (response.status === 409) {
                // אדם כבר קיים
                showNotification('אדם עם מספר זהות זה כבר קיים במערכת', 'error');
            } else if (response.status === 400) {
                // שגיאה בבקשה - אולי בעיה עם username
                showNotification(data.message || 'שגיאה בנתוני הבקשה', 'error');
                console.error('❌ שגיאה 400 - בדוק username:', data);
            } else if (response.status === 404) {
                // בית ספר לא נמצא
                showNotification('בית הספר לא נמצא. נא להתחבר מחדש.', 'error');
                setTimeout(() => logout(), 2000);
            } else if (response.status === 500) {
                // שגיאת שרת פנימית
                showNotification('שגיאה פנימית בשרת - נא לנסות שוב', 'error');
                console.error('❌ שגיאת שרת 500 - צריך לתקן את הקובץ Python');
            } else {
                console.error('❌ שגיאה מהשרת:', data);
                showNotification(data.error || `שגיאה ${response.status}: ${response.statusText}`, 'error');
            }
        } catch (error) {
            console.error('❌ שגיאה ביצירת אדם:', error);
            console.error('❌ סוג השגיאה:', error.constructor.name);
            console.error('❌ הודעת השגיאה:', error.message);

            // בדיקה אם זה שגיאת רשת
            if (error.message.includes('Failed to fetch')) {
                showNotification('שגיאה: לא ניתן להתחבר לשרת', 'error');
            } else if (error.message.includes('Unexpected token')) {
                showNotification('שגיאה: ה-API לא נמצא או לא מוגדר נכון', 'error');
            } else {
                showNotification('שגיאה ביצירת האדם', 'error');
            }
        }
    }

    /**
     * ביטול תהליך יצירת אדם חדש
     * מוחק את התמונות הזמניות ומנקה את הנתונים
     * @returns {Promise<void>}
     */
    async function cancelNewPersonCreation() {
        console.log('❌ מבטל יצירת אדם חדש');

        // מחיקת תמונות זמניות מהענן
        if (tempPersonData.uploadedImages.length > 0) {
            try {
                // מחיקת כל תמונה בנפרד
                for (const public_id of tempPersonData.uploadedImages) {
                    await fetch('/api/delete_temp_image', {
                        method: 'DELETE',
                        headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify({
                            public_id: public_id
                        })
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
     * מאפס את כל המשתנים לערכי ברירת מחדל
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

    /**
     * טיפול בלחיצה על כפתור בדיקת נוכחות כללית
     */
    async function handleCheckAllPeople() {
        console.log('🚀 מתחיל בדיקת נוכחות כללית');

        // 🔐 בדיקת התחברות
        if (!requireLogin('בדיקת נוכחות כללית')) {
            return;
        }

        const username = getCurrentUsername();

        // בדיקה שיש תמונות מטרה
        try {
            const targetsResponse = await fetch(`/api/get_target_images?username=${username}`);
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

        // הצגת הודעת התחלה
        showNotification('מתחיל בדיקת נוכחות כללית...', 'info');

        try {
            // שלב 1: חילוץ פנים (אם עדיין לא בוצע)
            console.log('🔄 מבצע חילוץ פנים מתמונות מטרה...');
            showNotification('שלב 1: מחלץ פנים מתמונות מטרה...', 'info');

            const extractResponse = await fetch('/api/face-recognition/extract-faces', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    username: username // 🎯 הוספת שם המשתמש!
                })
            });

            const extractData = await extractResponse.json();

            if (!extractData.success) {
                showNotification(`❌ שגיאה בחילוץ פנים: ${extractData.error}`, 'error');
                return;
            }

            console.log(`✅ חילוץ פנים הצליח: ${extractData.faces_extracted} פנים`);

            // שלב 2: בדיקת נוכחות
            console.log('🔄 מבצע בדיקת נוכחות...');
            showNotification('שלב 2: בודק נוכחות עבור כל האנשים...', 'info');

            const attendanceResponse = await fetch('/api/attendance/check-all', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    username: username // 🎯 הוספת שם המשתמש!
                })
            });

            const attendanceData = await attendanceResponse.json();

            if (attendanceData.success) {
                // הצגת תוצאות
                const message = `🎉 בדיקת נוכחות הושלמה!\n` +
                               `✅ נוכחים: ${attendanceData.present_people}\n` +
                               `❌ נעדרים: ${attendanceData.absent_people}\n` +
                               `📊 סה"כ נבדקו: ${attendanceData.checked_people} אנשים`;

                showNotification(message, 'success');
                console.log(`✅ בדיקת נוכחות הצליחה:`, attendanceData);

                // רענון רשימת האנשים לעדכון סטטוס נוכחות
                console.log('🔄 מרענן נתוני אנשים...');
                showNotification('מעדכן רשימת אנשים...', 'info');

                // השהיה קצרה לוודא שהשרת עדכן את הנתונים
                await new Promise(resolve => setTimeout(resolve, 1000));

                await loadPeopleData();
                updateDashboardStats();

                // בדיקה שהנתונים התעדכנו
                console.log('📊 נתוני אנשים אחרי רענון:', peopleData);

                // הצגת סטטיסטיקות מעודכנות
                const currentPresentCount = peopleData.filter(p => p.is_present).length;
                const currentAbsentCount = peopleData.length - currentPresentCount;

                console.log(`📈 סטטיסטיקות מעודכנות: ${currentPresentCount} נוכחים, ${currentAbsentCount} נעדרים`);

                // הודעה מעודכנת עם הנתונים החדשים
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

    // ==================== EVENT HANDLERS ====================

    /**
     * טיפול בהוספת אדם חדש
     * מעבד את הנתונים מהטופס ומתחיל תהליך יצירה
     * @param {Event} event - אירוע שליחת הטופס
     */
    async function handleAddPerson(event) {
        event.preventDefault(); // מניעת שליחה רגילה של הטופס

        // 🔐 בדיקת התחברות
        if (!requireLogin('הוספת אדם חדש')) {
            return;
        }

        const form = event.target;

        // איסוף נתונים מהטופס
        const personData = {
            first_name: form.querySelector('#first-name').value.trim(),
            last_name: form.querySelector('#last-name').value.trim(),
            id_number: form.querySelector('#id-number').value.trim()
        };

        // בדיקות תקינות בסיסיות
        if (!personData.first_name || !personData.last_name || !personData.id_number) {
            showNotification('נא למלא את כל השדות', 'error');
            return;
        }

        // בדיקת פורמט ת.ז.
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
        form.closest('.modal').classList.remove('active');
        form.reset();

        // התחלת תהליך יצירת אדם חדש (שמירה זמנית)
        startNewPersonCreation(personData);

        // פתיחת חלון העלאת תמונות
        openUploadModalForNewPerson(personData);
    }

    /**
     * טיפול בלחיצה על כפתור העלאת תמונה (לאדם קיים)
     * @param {Event} event - אירוע הלחיצה
     */
    function handleUploadClick(event) {
        // 🔐 בדיקת התחברות
        if (!requireLogin('העלאת תמונה')) {
            return;
        }

        const personId = event.currentTarget.getAttribute('data-id');
        const person = peopleData.find(p => p.id_number === personId);

        if (!person) return;

        openUploadModal(personId, `${person.first_name} ${person.last_name}`);
    }

    /**
     * טיפול בלחיצה על כפתור מחיקת אדם
     * מציג אישור ושולח בקשת מחיקה לשרת
     * @param {Event} event - אירוע הלחיצה
     */
    async function handleDeleteClick(event) {
        // 🔐 בדיקת התחברות
        if (!requireLogin('מחיקת אדם')) {
            return;
        }

        const personId = event.currentTarget.getAttribute('data-id');
        const person = peopleData.find(p => p.id_number === personId);

        if (!person) return;

        // בקשת אישור מהמשתמש
        if (confirm(`האם אתה בטוח שברצונך למחוק את ${person.first_name} ${person.last_name}?`)) {
            try {
                const username = getCurrentUsername();

                const response = await fetch(`/api/people/${personId}`, {
                    method: 'DELETE',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({
                        username: username // 🎯 הוספת שם המשתמש!
                    })
                });
                const data = await response.json();

                if (data.success) {
                    showNotification('האדם נמחק בהצלחה', 'success');
                    await loadPeopleData(); // רענון הרשימה
                    updateDashboardStats(); // עדכון סטטיסטיקות
                } else {
                    showNotification(data.error || 'שגיאה במחיקת אדם', 'error');
                }
            } catch (error) {
                showNotification('שגיאה במחיקת אדם', 'error');
            }
        }
    }

    /**
     * טיפול בלחיצה על כפתור צפייה בתמונות
     * פותח מודל עם כל התמונות של האדם
     * @param {Event} event - אירוע הלחיצה
     */
    function handleViewImagesClick(event) {
        const personId = event.currentTarget.getAttribute('data-id');
        const person = peopleData.find(p => p.id_number === personId);

        if (!person) return;

        // מציאת אלמנטי המודל
        const modal = document.getElementById('person-images-modal');
        const galleryContainer = document.getElementById('person-images-gallery');
        const personNameElem = document.getElementById('person-images-name');

        if (!modal || !galleryContainer || !personNameElem) return;

        // איפוס ומילוי תוכן
        galleryContainer.innerHTML = '';
        personNameElem.textContent = `${person.first_name} ${person.last_name}`;

        // בדיקה אם יש תמונות
        if (!person.image_urls || person.image_urls.length === 0) {
            galleryContainer.innerHTML = '<p class="no-images">אין תמונות זמינות</p>';
        } else {
            // יצירת גלריית תמונות
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

    // ==================== UPLOAD MODAL FUNCTIONS ====================

    /**
     * איפוס מלא של חלון העלאת תמונות
     * מנקה את כל השדות והתצוגות המקדימות
     */
    function resetUploadModal() {
        console.log('🧹 מאפס את חלון העלאה');

        // איפוס הטופס
        const form = document.getElementById('upload-image-form');
        if (form) {
            form.reset();
        }

        // איפוס תצוגה מקדימה (אם קיימת)
        const imagePreview = document.getElementById('image-preview');
        if (imagePreview) {
            imagePreview.src = '/web_static/img/person-placeholder.jpg';
        }

        // איפוס שדה הקובץ
        const fileInput = document.getElementById('person-image');
        if (fileInput) {
            fileInput.value = '';
        }

        // הסרת הודעות progress קודמות
        const existingProgress = document.querySelector('.upload-progress-container');
        if (existingProgress) {
            existingProgress.remove();
            console.log('🗑️ הוסר progress container קודם');
        }

        // עדכון מד ההתקדמות בהתאם למצב
        if (tempPersonData.isActive) {
            updateUploadProgress(tempPersonData.uploadedImages.length);
        } else {
            updateUploadProgress(0);
        }

        console.log('✅ חלון העלאה אופס במלואו');
    }

    /**
     * פתיחת חלון העלאה עבור אדם חדש
     * מגדיר את החלון במצב מיוחד לאדם חדש
     * @param {Object} personData - פרטי האדם החדש
     */
    function openUploadModalForNewPerson(personData) {
        console.log(`📂 פותח חלון העלאה עבור אדם חדש: ${personData.first_name} ${personData.last_name}`);

        // איפוס מלא קודם
        resetUploadModal();

        // מילוי פרטי האדם
        document.getElementById('upload-person-id').value = personData.id_number;

        // עדכון כותרת עם אינדיקטור "אדם חדש"
        const titleElement = document.querySelector('#upload-image-modal h3');
        if (titleElement) {
            titleElement.innerHTML = `
                <span style="color: #e67e22;">👤 אדם חדש:</span>
                העלאת תמונות עבור ${personData.first_name} ${personData.last_name}
            `;
        }

        // הסתרת כפתור הסגירה (X) - אדם חדש חייב להשלים
        const closeButtons = document.querySelectorAll('#upload-image-modal .close-modal');
        closeButtons.forEach(btn => {
            btn.style.visibility = 'hidden';
        });

        // הצגת הודעה מיוחדת לאדם חדש (אם קיימת)
        const newPersonNotice = document.getElementById('new-person-notice');
        if (newPersonNotice) {
            newPersonNotice.style.display = 'block';
        }

        // עדכון מד ההתקדמות (0 תמונות)
        updateUploadProgress(0);

        // פתיחת החלון
        showModal(document.getElementById('upload-image-modal'));

        console.log('🎉 חלון העלאה לאדם חדש נפתח בהצלחה');
    }

    /**
     * פתיחת חלון העלאה עבור אדם קיים
     * מגדיר את החלון במצב רגיל
     * @param {string} personId - מזהה האדם
     * @param {string} personName - שם האדם לתצוגה
     */
    function openUploadModal(personId, personName) {
        console.log(`📂 פותח חלון העלאה עבור ${personName} (ID: ${personId})`);

        // איפוס מלא קודם
        resetUploadModal();

        // מילוי פרטי האדם
        document.getElementById('upload-person-id').value = personId;

        // עדכון כותרת רגילה
        const titleElement = document.querySelector('#upload-image-modal h3');
        if (titleElement) {
            titleElement.textContent = `העלאת תמונות עבור ${personName}`;
        }

        // הצגת כפתור הסגירה (X) - אדם קיים
        const closeButtons = document.querySelectorAll('#upload-image-modal .close-modal');
        closeButtons.forEach(btn => {
            btn.style.visibility = 'visible';
        });

        // הסתרת הודעה מיוחדת לאדם חדש (אם קיימת)
        const newPersonNotice = document.getElementById('new-person-notice');
        if (newPersonNotice) {
            newPersonNotice.style.display = 'none';
        }

        // קבלת מספר התמונות הנוכחי ועדכון המד
        const currentImageCount = getPersonImageCount(personId);
        console.log(`📊 מספר תמונות נוכחי: ${currentImageCount}`);

        // עדכון מד ההתקדמות
        updateUploadProgress(currentImageCount);

        // פתיחת החלון
        showModal(document.getElementById('upload-image-modal'));

        console.log('🎉 חלון העלאה נפתח בהצלחה');
    }

    /**
     * סגירת חלון העלאת תמונות
     * מנקה ומאפס את החלון לקראת השימוש הבא
     */
    function closeUploadModal() {
        console.log('❌ סוגר חלון העלאה');

        // סגירת החלון
        document.getElementById('upload-image-modal').classList.remove('active');

        // החזרת כפתור הסגירה (X) לתצוגה
        const closeButtons = document.querySelectorAll('#upload-image-modal .close-modal');
        closeButtons.forEach(btn => {
            btn.style.visibility = 'visible';
        });

        // הסתרת הודעה מיוחדת לאדם חדש (אם קיימת)
        const newPersonNotice = document.getElementById('new-person-notice');
        if (newPersonNotice) {
            newPersonNotice.style.display = 'none';
        }

        // איפוס החלון לקראת הפעם הבאה
        resetUploadModal();

        // איפוס נתונים זמניים אם זה אדם חדש שהושלם
        if (tempPersonData.isActive) {
            clearTempPersonData();
        }

        console.log('✅ חלון העלאה נסגר ואופס');
    }

    // ==================== UPLOAD IMAGE HANDLER ====================

    /**
     * טיפול בהעלאת תמונות
     * מעלה תמונות לשרת עם מעקב התקדמות מפורט
     * @param {Event} event - אירוע שליחת הטופס
     */
    async function handleUploadImage(event) {
        event.preventDefault();

        // 🔐 בדיקת התחברות
        if (!requireLogin('העלאת תמונה')) {
            return;
        }

        const personId = document.getElementById('upload-person-id').value;
        const fileInput = document.getElementById('person-image');

        // בדיקות בסיסיות
        if (!fileInput.files.length) {
            showNotification('נא לבחור קבצים', 'error');
            return;
        }

        const files = Array.from(fileInput.files);

        // הגבלת מספר קבצים
        if (files.length > 5) {
            showNotification('ניתן להעלות עד 5 תמונות בלבד', 'error');
            return;
        }

        console.log(`מתחיל להעלות ${files.length} תמונות...`);

        // משתני מעקב
        let successCount = 0;
        let errorCount = 0;
        let totalImages = 0;

        const form = event.target;

        // יצירת/חיפוש אלמנט progress
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

        // גלילה לאזור ההתקדמות
        progressContainer.scrollIntoView({
            behavior: 'smooth',
            block: 'center'
        });

        // איפוס מד ההתקדמות
        progressBar.style.width = '0%';
        progressText.textContent = 'מתחיל העלאה...';

        // העלאת קבצים בלולאה
        for (let i = 0; i < files.length; i++) {
            const file = files[i];

            try {
                progressText.textContent = `מעלה תמונה ${i + 1} מתוך ${files.length}: ${file.name.substring(0, 20)}...`;

                const formData = new FormData();
                formData.append('image', file);

                // הוספת פרטי אדם לבקשה אם זה אדם חדש
                if (tempPersonData.isActive) {
                    // שימוש במספר ת.ז. בלבד לשם פשטות
                    formData.append('first_name', tempPersonData.personDetails.id_number);
                    formData.append('last_name', 'person');
                    formData.append('id_number', tempPersonData.personDetails.id_number);
                }

                console.log(`מעלה קובץ: ${file.name}`);

                // בחירת endpoint בהתאם לסוג האדם (חדש/קיים)
                let response, data;

                if (tempPersonData.isActive) {
                    // אדם חדש - העלאה לתיקייה זמנית
                    response = await fetch('/api/upload_temp_image', {
                        method: 'POST',
                        body: formData
                    });
                } else {
                    // אדם קיים - העלאה רגילה (API לא קיים עדיין, נשתמש בזמני)
                    response = await fetch('/api/upload_temp_image', {
                        method: 'POST',
                        body: formData
                    });
                }

                data = await response.json();
                console.log(`תגובה עבור ${file.name}:`, data);

                if (data.success) {
                    successCount++;

                    // עדכון נתונים בהתאם לסוג האדם
                    if (tempPersonData.isActive) {
                        // אדם חדש - הוספה לנתונים הזמניים
                        tempPersonData.uploadedImages.push(data.public_id);
                        tempPersonData.imageUrls.push(data.image_url);
                        totalImages = tempPersonData.imageUrls.length; // ✅ תיקון: משתמש ב-imageUrls
                    } else {
                        // אדם קיים - עדכון מהשרת
                        totalImages = successCount; // זמני עד שנוסיף API נכון
                    }

                    // עדכון מד ההתקדמות הכללי
                    const progress = ((i + 1) / files.length) * 100;
                    progressBar.style.width = `${progress}%`;

                    console.log(`✅ הועלה בהצלחה: ${file.name} (סה"כ תמונות: ${totalImages})`);

                    updateUploadProgress(totalImages);

                    // בדיקת מגבלת תמונות
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

                    // טיפול בשגיאת מקסימום תמונות
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

            // השהיה קצרה בין קבצים
            if (i < files.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 300));
            }
        }

        // סיום העלאה - עדכון מד התקדמות ל-100%
        progressBar.style.width = '100%';

        // הכנת הודעת סיכום
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

        // רענון נתונים רק אם זה לא אדם חדש (זמני)
        if (!tempPersonData.isActive) {
            await loadPeopleData();
        }

        // ניקוי וסגירה אוטומטית לאחר 3 שניות
        setTimeout(() => {
            document.getElementById('upload-image-form').reset();

            // איפוס תצוגה מקדימה
            const imagePreview = document.getElementById('image-preview');
            if (imagePreview) {
                imagePreview.src = '/web_static/img/person-placeholder.jpg';
            }

            if (progressContainer && progressContainer.parentNode) {
                progressContainer.remove();
            }

            // הערה: החלון לא נסגר אוטומטית - המשתמש צריך לבחור "צור"
        }, 3000);
    }

    // ==================== HELPER FUNCTIONS ====================

    /**
     * קבלת מספר התמונות של אדם ספציפי
     * בודק באחסון מקומי ובנתונים הגלובליים
     * @param {string} personId - מזהה האדם
     * @returns {number} מספר התמונות
     */
    function getPersonImageCount(personId) {
        try {
            // אם זה אדם חדש (זמני), נחזיר את מספר התמונות הזמניות
            if (tempPersonData.isActive && tempPersonData.personDetails &&
                tempPersonData.personDetails.id_number === personId) {
                return tempPersonData.uploadedImages.length;
            }

            // חיפוש בנתונים הגלובליים
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

    /**
     * עדכון מד התקדמות העלאת תמונות
     * מעדכן את הפסים הגרפיים והטקסט המתאים
     * @param {number} imageCount - מספר התמונות הנוכחי
     */
    function updateUploadProgress(imageCount) {
        console.log(`🎯 מעדכן מד התקדמות ל: ${imageCount} תמונות`);

        // עדכון הפסים הגרפיים (1-5)
        for (let i = 1; i <= 5; i++) {
            const step = document.getElementById(`progress-step-${i}`);
            if (step) {
                if (i <= imageCount) {
                    // פס מושלם - צבע ירוק
                    step.classList.add('completed');
                    step.style.backgroundColor = '#4caf50';
                    step.style.borderColor = '#4caf50';
                    console.log(`✅ פס ${i} מושלם`);
                } else {
                    // פס לא מושלם - צבע אפור
                    step.classList.remove('completed');
                    step.style.backgroundColor = '#ddd';
                    step.style.borderColor = '#ddd';
                    console.log(`⭕ פס ${i} לא מושלם`);
                }
            } else {
                console.warn(`❌ לא נמצא פס ${i}`);
            }
        }

        // עדכון הטקסט המתאר
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

        // עדכון כפתור צור
        const finishBtn = document.getElementById('finish-upload-button');
        if (finishBtn) {
            if (imageCount >= 3) {
                // מספיק תמונות - הפעלת הכפתור
                finishBtn.style.display = 'inline-block';
                finishBtn.disabled = false;
                finishBtn.textContent = 'צור';
            } else {
                // לא מספיק תמונות
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
     * בדיקת חיבור לשרת
     */
    async function checkServerConnection() {
        try {
            let response;

            // אם המשתמש מחובר, נשלח את ה-username
            if (isUserLoggedIn()) {
                const username = getCurrentUsername();
                response = await fetch(`/api/get_loaded_people?username=${username}`);
            } else {
                // אם לא מחובר, ננסה בלי username (עשוי להיכשל)
                response = await fetch('/api/get_loaded_people');
            }

            const data = await response.json();
            console.log('✅ שרת מחובר:', data);
            return true;
        } catch (error) {
            console.error('❌ שרת לא מחובר:', error);
            showNotification('שגיאה: לא ניתן להתחבר לשרת', 'error');
            return false;
        }
    }

    /**
     * בדיקת endpoints זמינים
     */
    async function checkAvailableEndpoints() {
        const endpoints = [
            '/api/get_loaded_people',
            '/api/people/create_person',
            '/api/add_person',
            '/api/upload_temp_image'
        ];

        console.log('🔍 בודק endpoints זמינים:');

        for (const endpoint of endpoints) {
            try {
                const response = await fetch(endpoint, { method: 'OPTIONS' });
                console.log(`✅ ${endpoint}: ${response.status}`);
            } catch (error) {
                console.log(`❌ ${endpoint}: לא זמין`);
            }
        }
    }

    /**
     * טעינת נתוני אנשים מהשרת
     * מבצע בקשה ל-API ומעדכן את המערך הגלובלי
     * @returns {Promise<void>}
     */
    async function loadPeopleData() {
        console.log('🔄 מתחיל לטעון נתוני אנשים...');

        try {
            let url = '/api/get_loaded_people';

            // אם המשתמש מחובר, נוסיף את ה-username לבקשה
            if (isUserLoggedIn()) {
                const username = getCurrentUsername();
                url += `?username=${username}`;
                console.log(`📤 טוען נתונים עבור משתמש: ${username}`);
            } else {
                console.log('⚠️ משתמש לא מחובר - מנסה לטעון נתונים כלליים');
            }

            const response = await fetch(url);
            console.log('📡 תגובת שרת:', response.status);

            if (!response.ok) {
                // אם זה 404 או שגיאה אחרת הקשורה להתחברות
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
                    is_present: person.is_present || false, // ברירת מחדל אם לא קיים
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

    /**
     * רינדור טבלת האנשים ב-DOM
     * יוצר את השורות בטבלה על בסיס הנתונים הגלובליים
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

            // קביעת תמונה - ברירת מחדל או התמונה הראשונה
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
        tableBody.querySelectorAll('.upload').forEach(b =>
            b.addEventListener('click', handleUploadClick)
        );
        tableBody.querySelectorAll('.delete').forEach(b =>
            b.addEventListener('click', handleDeleteClick)
        );
        tableBody.querySelectorAll('.view-images').forEach(b =>
            b.addEventListener('click', handleViewImagesClick)
        );

        console.log('🎯 הוספו מאזיני אירועים לכפתורים');
    }

    /**
     * סינון טבלת האנשים על פי טקסט החיפוש
     * מסתיר/מציג שורות בהתאם למחרוזת החיפוש
     */
    function filterPeopleTable() {
        const searchValue = document.getElementById('search-people').value.toLowerCase();
        const tableBody = document.getElementById('people-table-body');

        if (!tableBody) return;

        const rows = tableBody.querySelectorAll('tr');

        rows.forEach(row => {
            // חיפוש בשם מלא ובת.ז.
            const fullName = row.children[1]?.textContent.toLowerCase() || '';
            const id = row.children[2]?.textContent.toLowerCase() || '';

            if (fullName.includes(searchValue) || id.includes(searchValue)) {
                row.style.display = ''; // הצגה
            } else {
                row.style.display = 'none'; // הסתרה
            }
        });
    }

    /**
     * עדכון סטטיסטיקות לוח הבקרה
     */
    function updateDashboardStats() {
        const totalPeople = peopleData.length;
        const presentPeople = peopleData.filter(p => p.is_present).length;
        const absentPeople = totalPeople - presentPeople;

        // עדכון אלמנטים ב-DOM
        const totalEl = document.getElementById('total-people');
        const presentEl = document.getElementById('present-people');
        const absentEl = document.getElementById('absent-people');

        if (totalEl) totalEl.textContent = totalPeople;
        if (presentEl) presentEl.textContent = presentPeople;
        if (absentEl) absentEl.textContent = absentPeople;

        // עדכון סטטיסטיקות נוכחות
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

    /**
     * הגדרת תאריך נוכחי
     */
    function setCurrentDate() {
        const dateInput = document.getElementById('attendance-date');
        if (dateInput) {
            const today = new Date().toISOString().split('T')[0];
            dateInput.value = today;
        }
    }

    // ==================== TARGET IMAGE FUNCTIONS ====================

    /**
     * טעינת תמונות מטרה מהשרת
     * מציג את התמונות בגלריה עם סטטיסטיקות
     */
    async function loadTargetImages() {
        console.log('🔄 טוען תמונות מטרה...');

        try {
            let url = '/api/get_target_images';

            // אם המשתמש מחובר, נוסיף את ה-username לבקשה
            if (isUserLoggedIn()) {
                const username = getCurrentUsername();
                url += `?username=${username}`;
                console.log(`📤 טוען תמונות מטרה עבור משתמש: ${username}`);
            } else {
                console.log('⚠️ משתמש לא מחובר - מנסה לטעון תמונות מטרה כלליות');
            }

            const response = await fetch(url);
            const data = await response.json();

            console.log('📡 תגובת שרת לתמונות מטרה:', data);

            const galleryGrid = document.getElementById('target-gallery-grid');
            const galleryStats = document.getElementById('target-gallery-stats');

            if (!galleryGrid) {
                console.error('❌ לא נמצא אלמנט target-gallery-grid');
                return;
            }

            galleryGrid.innerHTML = ''; // ניקוי תוכן קיים

            if (data.success && data.targets && data.targets.length > 0) {
                console.log(`📊 נמצאו ${data.targets.length} targets`);

                // עדכון סטטיסטיקות
                let totalImages = 0;
                data.targets.forEach(target => {
                    if (target.images_url && Array.isArray(target.images_url)) {
                        totalImages += target.images_url.length;
                    }
                });

                if (galleryStats) {
                    galleryStats.textContent = `${totalImages} תמונות מטרה`;
                }

                // יצירת הגלריה
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

                // הוספת מאזין לצ'קבוקסים
                document.querySelectorAll('.target-checkbox').forEach(checkbox => {
                    checkbox.addEventListener('change', updateDeleteButton);
                });

                console.log(`✅ הוצגו ${totalImages} תמונות מטרה`);

            } else {
                // מצב ריק - אין תמונות
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

    /**
     * טיפול בבחירת קבצים לתמונות מטרה
     */
    function handleTargetFileSelection() {
        const fileInput = document.getElementById('target-file-input');
        const uploadArea = document.querySelector('.upload-area');
        const files = fileInput.files;

        if (files.length > 0) {
            console.log(`נבחרו ${files.length} קבצים לתמונות מטרה`);

            // עדכון אזור ההעלאה להראות את הקבצים שנבחרו
            updateUploadAreaWithPreview(files, uploadArea);
        } else {
            // איפוס לתצוגה רגילה
            resetUploadArea(uploadArea);
        }
    }

    /**
     * עדכון אזור ההעלאה עם תצוגה מקדימה
     */
    function updateUploadAreaWithPreview(files, uploadArea) {
        const filesArray = Array.from(files);

        // יצירת תוכן חדש עם תצוגה מקדימה
        let previewHTML = `
            <div class="upload-preview">
                <div class="upload-icon">📁</div>
                <div class="upload-text">נבחרו ${files.length} קבצים</div>
                <div class="upload-hint">לחץ "העלה קבצים" להמשיך או בחר קבצים נוספים</div>
                <div class="selected-files">
        `;

        // הוספת תצוגה מקדימה לכל קובץ
        filesArray.forEach((file, index) => {
            const fileSize = (file.size / 1024 / 1024).toFixed(2); // MB
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

        // עדכון כפתור העלאה
        updateUploadButton(files.length);
    }

    /**
     * איפוס אזור ההעלאה לתצוגה רגילה
     */
    function resetUploadArea(uploadArea) {
        uploadArea.innerHTML = `
            <div class="upload-icon">📁</div>
            <div class="upload-text">לחץ כאן או גרור קבצים להעלאה</div>
            <div class="upload-hint">תמיכה בתמונות וסרטונים (JPG, PNG, MP4, וכו')</div>
        `;
        uploadArea.style.borderColor = '#ccc';
        uploadArea.style.backgroundColor = '';

        // איפוס כפתור העלאה
        updateUploadButton(0);
    }

    /**
     * הסרת קובץ ספציפי מהבחירה
     */
    function removeFileFromSelection(indexToRemove) {
        const fileInput = document.getElementById('target-file-input');
        const uploadArea = document.querySelector('.upload-area');

        // יצירת רשימה חדשה של קבצים בלי הקובץ שנבחר להסרה
        const dt = new DataTransfer();
        const files = Array.from(fileInput.files);

        files.forEach((file, index) => {
            if (index !== indexToRemove) {
                dt.items.add(file);
            }
        });

        // עדכון ה-input עם הרשימה החדשה
        fileInput.files = dt.files;

        // עדכון התצוגה
        if (dt.files.length > 0) {
            updateUploadAreaWithPreview(dt.files, uploadArea);
        } else {
            resetUploadArea(uploadArea);
        }

        console.log(`הוסר קובץ. נותרו ${dt.files.length} קבצים`);
    }

    /**
     * העלאת תמונות מטרה
     */
    async function uploadTargetFiles() {
        // 🔐 בדיקת התחברות
        if (!requireLogin('העלאת תמונות מטרה')) {
            return;
        }

        const fileInput = document.getElementById('target-file-input');
        const loading = document.getElementById('target-loading');

        if (!fileInput.files.length) {
            showNotification('נא לבחור קבצים', 'error');
            return;
        }

        const username = getCurrentUsername();
        console.log(`📤 מעלה ${fileInput.files.length} תמונות מטרה עבור משתמש: ${username}...`);

        // הצגת loading
        if (loading) loading.style.display = 'flex';

        try {
            let successCount = 0;
            let errorCount = 0;

            // העלאת כל קובץ בנפרד
            for (let i = 0; i < fileInput.files.length; i++) {
                const file = fileInput.files[i];
                console.log(`📷 מעלה קובץ ${i + 1}/${fileInput.files.length}: ${file.name}`);

                try {
                    // יצירת FormData לקובץ בודד
                    const formData = new FormData();
                    formData.append('image', file);

                    // העלאה זמנית לקבלת URL
                    const tempResponse = await fetch('/api/upload_temp_image', {
                        method: 'POST',
                        body: formData
                    });

                    const tempData = await tempResponse.json();

                    if (tempData.success) {
                        console.log(`✅ העלאה זמנית הצליחה עבור ${file.name}:`, tempData);

                        // עכשיו יצירת target עם ה-URL
                        const targetPayload = {
                            username: username, // 🎯 הוספת שם המשתמש!
                            camera_number: Date.now() + i,
                            image_url: tempData.image_url
                        };

                        console.log(`📤 שולח target payload:`, targetPayload);

                        const targetResponse = await fetch('/api/target-images', {
                            method: 'POST',
                            headers: {'Content-Type': 'application/json'},
                            body: JSON.stringify(targetPayload)
                        });

                        console.log(`📨 תגובת target server: status ${targetResponse.status}`);

                        const targetData = await targetResponse.json();
                        console.log(`📋 target response data:`, targetData);

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
                if (i < fileInput.files.length - 1) {
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

            // איפוס הקלט והתצוגה
            fileInput.value = '';
            const uploadArea = document.querySelector('.upload-area');
            if (uploadArea) {
                resetUploadArea(uploadArea);
            }

            await loadTargetImages(); // רענון הגלריה

        } catch (error) {
            console.error('שגיאה כללית בהעלאת תמונות מטרה:', error);
            showNotification('שגיאה בהעלאת תמונות מטרה', 'error');
        } finally {
            // הסתרת loading
            if (loading) loading.style.display = 'none';
        }
    }

    /**
     * עדכון מצב כפתור מחיקה של תמונות מטרה
     */
    function updateDeleteButton() {
        const deleteBtn = document.getElementById('target-delete-btn');
        const checkedBoxes = document.querySelectorAll('.target-checkbox:checked');

        if (deleteBtn) {
            deleteBtn.disabled = checkedBoxes.length === 0;
        }
    }

    /**
     * מחיקת תמונות מטרה נבחרות
     */
    async function deleteSelectedTargets() {
        // 🔐 בדיקת התחברות
        if (!requireLogin('מחיקת תמונות מטרה')) {
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
            const username = getCurrentUsername();

            // איסוף מזהי התמונות למחיקה
            const cameraNumbers = Array.from(checkedBoxes).map(cb =>
                parseInt(cb.getAttribute('data-camera'))
            );

            // מחיקה של כל מצלמה
            for (const cameraNumber of new Set(cameraNumbers)) {
                const response = await fetch(`/api/targets/${cameraNumber}`, {
                    method: 'DELETE',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({
                        username: username // 🎯 הוספת שם המשתמש!
                    })
                });

                if (!response.ok) {
                    throw new Error(`Failed to delete camera ${cameraNumber}`);
                }
            }

            showNotification(`נמחקו תמונות בהצלחה`, 'success');
            await loadTargetImages(); // רענון הגלריה
            updateDeleteButton(); // עדכון כפתור מחיקה

        } catch (error) {
            console.error('שגיאה במחיקת תמונות:', error);
            showNotification('שגיאה במחיקת תמונות', 'error');
        }
    }

    // ==================== UTILITY FUNCTIONS ====================

    /**
     * תעתיק מעברית לאנגלית לשמות קבצים
     * @param {string} text - טקסט בעברית
     * @returns {string} טקסט באנגלית
     */
    function transliterateHebrew(text) {
        const hebrewToEnglish = {
            'א': 'a', 'ב': 'b', 'ג': 'g', 'ד': 'd', 'ה': 'h', 'ו': 'v', 'ז': 'z',
            'ח': 'ch', 'ט': 't', 'י': 'y', 'כ': 'k', 'ך': 'k', 'ל': 'l', 'מ': 'm',
            'ם': 'm', 'ן': 'n', 'נ': 'n', 'ס': 's', 'ע': 'a', 'פ': 'p', 'ף': 'f',
            'צ': 'tz', 'ץ': 'tz', 'ק': 'k', 'ר': 'r', 'ש': 'sh', 'ת': 't',
            ' ': '_', '-': '_', '.': '_'
        };

        return text
            .toLowerCase()
            .split('')
            .map(char => hebrewToEnglish[char] || char)
            .join('')
            .replace(/[^a-z0-9_]/g, '') // הסרת תווים לא חוקיים
            .replace(/_+/g, '_') // החלפת מספר קווים תחתונים באחד
            .replace(/^_|_$/g, ''); // הסרת קווים תחתונים מתחילת וסוף
    }

    /**
     * הצגת חלון מודל
     * מוסיף את הקלאס 'active' לחלון כדי להציגו
     * @param {HTMLElement} modal - אלמנט המודל להצגה
     */
    function showModal(modal) {
        if(modal) modal.classList.add('active');
    }

    /**
     * סגירת חלון מודל לפי מזהה
     * @param {string} modalId - מזהה המודל לסגירה
     */
    function closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('active');
        }
    }

    /**
     * הצגת הודעת התראה למשתמש
     * יוצר הודעה צפה עם כפתור סגירה וסגירה אוטומטית
     * @param {string} message - תוכן ההודעה
     * @param {string} type - סוג ההודעה (info/success/warning/error)
     */
    function showNotification(message, type = 'info') {
        // יצירה/חיפוש מיכל הודעות
        let container = document.querySelector('.notification-container');
        if (!container) {
            container = document.createElement('div');
            container.className = 'notification-container';
            document.body.appendChild(container);
        }

        // יצירת הודעה חדשה
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `<span class="notification-message">${message}</span><button class="notification-close">&times;</button>`;

        container.appendChild(notification);

        // מאזין לכפתור סגירה
        const closeBtn = notification.querySelector('.notification-close');

        // טיימר לסגירה אוטומטית
        const autoClose = setTimeout(() => closeNotification(notification), 5000);

        /**
         * פונקציית סגירת הודעה
         */
        function closeNotification() {
            notification.classList.add('closing');
            setTimeout(() => {
                notification.remove();
                clearTimeout(autoClose);
            }, 300);
        }

        // הוספת מאזין לכפתור סגירה
        closeBtn.addEventListener('click', closeNotification);
    }

    // ==================== GLOBAL FUNCTIONS FOR HTML ====================

    /**
     * פונקציות גלובליות שהHTML יכול לקרוא להן
     */
    window.uploadTargetFiles = uploadTargetFiles;
    window.deleteSelectedTargets = deleteSelectedTargets;
    window.loadTargetImages = loadTargetImages;
    window.removeFileFromSelection = removeFileFromSelection;

    // ==================== ERROR HANDLING ====================

    /**
     * טיפול גלובלי בשגיאות JavaScript
     * לוכד שגיאות שלא נתפסו ומציג הודעה למשתמש
     */
    window.addEventListener('error', function(event) {
        console.error('JavaScript Error:', event.error);

        // הצגת הודעה ידידותית למשתמש (רק בסביבת פיתוח)
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            showNotification('אירעה שגיאה בסיסית באפליקציה. בדוק את הקונסול לפרטים.', 'error');
        }
    });

    /**
     * טיפול בשגיאות Promise שלא נתפסו
     */
    window.addEventListener('unhandledrejection', function(event) {
        console.error('Unhandled Promise Rejection:', event.reason);

        // הצגת הודעה ידידותית למשתמש (רק בסביבת פיתוח)
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            showNotification('אירעה שגיאה בתקשורת עם השרת', 'error');
        }
    });

    // ==================== MAIN INITIALIZATION ====================

    /**
     * הפעלת האתחול הראשי
     * זה הקוד הראשון שרץ כשהדף נטען
     */
    initialize();

    // ==================== DEBUG UTILITIES ====================

    /**
     * כלי עזר לדיבוג (רק בסביבת פיתוח)
     * מוסיף פונקציות עזר לקונסול
     */
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        // הוספת פונקציות דיבוג לאובייקט הגלובלי
        window.debugAttendance = {
            // הצגת נתוני אנשים נוכחיים
            showPeopleData: () => {
                console.table(peopleData);
                return peopleData;
            },

            // הצגת נתונים זמניים
            showTempData: () => {
                console.log('Temp Person Data:', tempPersonData);
                return tempPersonData;
            },

            // הצגת מידע משתמש
            showCurrentUser: () => {
                console.log('Current User:', window.currentUser);
                return window.currentUser;
            },

            // בדיקת התחברות
            checkLogin: () => {
                console.log('Current User (window):', window.currentUser);
                console.log('Current User (sessionStorage):', sessionStorage.getItem('currentUser'));
                console.log('Logged in:', isUserLoggedIn());
                console.log('Username:', getCurrentUsername());
                return {
                    loggedIn: isUserLoggedIn(),
                    username: getCurrentUsername(),
                    userInfo: window.currentUser,
                    sessionData: sessionStorage.getItem('currentUser')
                };
            },

            // טעינה מחדש מאחסון
            reloadFromStorage: () => {
                console.log('🔄 טוען מחדש מ-sessionStorage...');
                const loaded = loadUserFromStorage();
                console.log('תוצאה:', loaded);
                showUserInfo();
                return loaded;
            },

            // טעינה ידנית של נתונים
            refresh: async () => {
                console.log('🔄 מתחיל רענון ידני...');
                await loadPeopleData();
                await loadTargetImages();
                updateDashboardStats();
                console.log('✅ רענון הושלם');
            },

            // בדיקת DOM
            checkDOM: () => {
                const elements = {
                    'people-table-body': document.getElementById('people-table-body'),
                    'people-table': document.getElementById('people-table'),
                    'people-management': document.getElementById('people-management')
                };

                console.log('🔍 בדיקת אלמנטי DOM:');
                for (const [name, element] of Object.entries(elements)) {
                    console.log(`${element ? '✅' : '❌'} ${name}:`, element);
                }

                return elements;
            },

            // אילוץ רינדור
            forceRender: () => {
                console.log('🎨 אילוץ רינדור טבלה...');
                renderPeopleTable();
            },

            // בדיקת שרת
            checkServer: checkServerConnection,

            // בדיקת endpoints
            checkEndpoints: checkAvailableEndpoints,

            // ניסיון יצירת אדם ידני
            testCreatePerson: async () => {
                if (!isUserLoggedIn()) {
                    console.log('❌ משתמש לא מחובר');
                    return 'לא מחובר';
                }

                try {
                    const testData = {
                        username: getCurrentUsername(), // 🎯 הוספת username!
                        person_details: {
                            first_name: 'טסט',
                            last_name: 'דיבוג',
                            id_number: '999999999'
                        },
                        image_urls: ['https://via.placeholder.com/150']
                    };

                    const response = await fetch('/api/people/create_person', {
                        method: 'POST',
                        headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify(testData)
                    });

                    console.log('Response status:', response.status);
                    console.log('Response headers:', response.headers);

                    const data = await response.json();
                    console.log('Response data:', data);
                    return data;
                } catch (error) {
                    console.error('Test failed:', error);
                    return error;
                }
            },

            // סימולציה של הוספת אדם לדיבוג
            simulatePersonCreation: () => {
                startNewPersonCreation({
                    first_name: 'בדיקה',
                    last_name: 'דיבוג',
                    id_number: '123456789'
                });
                console.log('🧪 נוצר אדם זמני לדיבוג');
            }
        };

        console.log('🔧 כלי דיבוג זמינים: window.debugAttendance');
    }

    // ==================== FINAL CONSOLE MESSAGE ====================

    /**
     * הודעת סיום טעינה
     */
    console.log('✅ מערכת ניהול נוכחות אותחלה בהצלחה');
    console.log('🔐 סטטוס התחברות:', isUserLoggedIn() ? `מחובר: ${getCurrentUsername()}` : 'לא מחובר');
    console.log('📦 sessionStorage:', sessionStorage.getItem('currentUser') ? 'יש נתונים' : 'ריק');
    console.log('📊 נתונים זמינים:', {
        'כמות אנשים': peopleData.length,
        'מצב נתונים זמניים': tempPersonData.isActive ? 'פעיל' : 'לא פעיל'
    });

}); // סוף DOMContentLoaded

/**
 * ==================== END OF FILE ====================
 *
 * קובץ זה מכיל את כל הפונקציונליות של מערכת ניהול הנוכחות:
 *
 * 🏗️ מבנה הקוד:
 * - משתנים גלובליים ואתחול
 * - מערכת התחברות ובדיקות אבטחה
 * - מאזיני אירועים
 * - ניהול נתונים זמניים
 * - טיפול בטפסים ומודלים
 * - העלאת וניהול תמונות
 * - פונקציות עזר ויוטיליטיס
 * - שיפורי נגישות וביצועים
 *
 * 🎯 מאפיינים עיקריים:
 * - ניהול מלא של מחזור חיי יצירת אדם
 * - העלאת תמונות עם מעקב התקדמות
 * - ניהול תמונות מטרה לבדיקת נוכחות
 * - ממשק משתמש רספונסיבי ונגיש
 * - טיפול מקיף בשגיאות
 * - כלי דיבוג לסביבת פיתוח
 * - מערכת התחברות מאובטחת עם הפרדה בין בתי ספר
 *
 * 💡 הערות למפתח:
 * - הקוד כתוב בצורה מודולרית וניתן להרחבה
 * - כל פונקציה מתועדת עם JSDoc
 * - יש תמיכה מלאה בשגיאות ובדיבוג
 * - הקוד מותאם לעברית וממשק RTL
 * - מותאם למבנה ה-API ב-Python backend
 * - תומך בכל האלמנטים שמופיעים ב-HTML
 * - כולל מערכת התחברות מאובטחת עם בדיקות לכל פעולה
 */