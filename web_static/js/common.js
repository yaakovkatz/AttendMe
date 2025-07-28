/**
 * ==================== COMMON JAVASCRIPT FUNCTIONS ====================
 * קובץ פונקציות משותפות לכל דפי האפליקציה
 *
 * מכיל:
 * - מערכת התחברות ואבטחה
 * - ניהול modals
 * - מערכת הודעות (notifications)
 * - פונקציות עזר כלליות
 * - בדיקת חיבור לשרת
 */

// ==================== GLOBAL VARIABLES ====================
// משתנים גלובליים הזמינים לכל הדפים

// פרטי המשתמש המחובר - יוגדר ב-template
window.currentUser = window.currentUser || null;

// ==================== LOGIN & AUTHENTICATION ====================
// מערכת התחברות ובדיקות אבטחה

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
 * שמירת פרטי המשתמש ב-sessionStorage
 * @param {Object} userData - פרטי המשתמש לשמירה
 */
function saveUserToStorage(userData) {
    try {
        window.currentUser = userData;
        sessionStorage.setItem('currentUser', JSON.stringify(userData));
        console.log('💾 שמר פרטי משתמש באחסון:', userData.username);
    } catch (error) {
        console.error('❌ שגיאה בשמירת פרטי משתמש:', error);
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

/**
 * פונקציה למעבר לדף התחברות
 * מטפלת בניווט לדף התחברות עם נתיבים חלופיים
 * @param {Event} event - אירוע הלחיצה על כפתור ההתחברות
 */
function goToLogin(event) {
    if (event) event.preventDefault();

    console.log('🔄 מנסה לעבור לדף התחברות...');
    console.log('📍 נתיב נוכחי:', window.location.href);

    // נתיבים אפשריים לשרת
    const possiblePaths = [
        '/login',               // נתיב Flask
        '/login.html',          // נתיב מהשורש
        './login.html',         // נתיב יחסי
        'login.html'            // ישירות
    ];

    // בחר את הנתיב המתאים
    let targetPath = possiblePaths[0]; // נתיב Flask

    console.log('🎯 מנסה נתיב:', targetPath);
    window.location.href = targetPath;
}

// הוספת פונקציות לחלון הגלובלי
window.logout = logout;
window.goToLogin = goToLogin;
window.showUserInfo = showUserInfo;
window.requireLogin = requireLogin;
window.isUserLoggedIn = isUserLoggedIn;
window.getCurrentUsername = getCurrentUsername;

// ==================== MODAL MANAGEMENT ====================
// מערכת ניהול חלונות מודל

/**
 * הצגת חלון מודל
 * מוסיף את הקלאס 'active' לחלון כדי להציגו
 * @param {HTMLElement|string} modal - אלמנט המודל או מזהה שלו
 */
function showModal(modal) {
    if (typeof modal === 'string') {
        modal = document.getElementById(modal);
    }

    if (modal) {
        modal.classList.add('active');
        console.log('📂 פתח מודל:', modal.id || 'ללא מזהה');

        // מניעת גלילה ברקע
        document.body.style.overflow = 'hidden';
    } else {
        console.error('❌ לא נמצא מודל להצגה');
    }
}

/**
 * סגירת חלון מודל
 * מסיר את הקלאס 'active' מהחלון
 * @param {HTMLElement|string} modal - אלמנט המודל או מזהה שלו
 */
function closeModal(modal) {
    if (typeof modal === 'string') {
        modal = document.getElementById(modal);
    }

    if (modal) {
        modal.classList.remove('active');
        console.log('❌ סגר מודל:', modal.id || 'ללא מזהה');

        // החזרת גלילה ברקע
        document.body.style.overflow = '';
    }
}

/**
 * אתחול מאזיני אירועים למודלים
 * מוסיף מאזינים לכפתורי סגירה ולחיצה על הרקע
 */
function initializeModalListeners() {
    // כפתורי סגירה עם X
    document.querySelectorAll('.close-modal').forEach(button => {
        button.addEventListener('click', (e) => {
            const modal = e.target.closest('.modal');
            if (modal) closeModal(modal);
        });
    });

    // כפתורי סגירה רגילים
    document.querySelectorAll('.close-modal-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const modal = e.target.closest('.modal');
            if (modal) closeModal(modal);
        });
    });

    // לחיצה על רקע המודל (מחוץ לתוכן)
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal(modal);
            }
        });
    });

    // ESC לסגירת מודל
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const activeModal = document.querySelector('.modal.active');
            if (activeModal) {
                closeModal(activeModal);
            }
        }
    });

    console.log('🎯 הוגדרו מאזיני מודלים');
}

// הוספת פונקציות לחלון הגלובלי
window.showModal = showModal;
window.closeModal = closeModal;

// ==================== NOTIFICATION SYSTEM ====================
// מערכת הודעות התראה מתקדמת

/**
 * הצגת הודעת התראה למשתמש
 * יוצר הודעה צפה עם כפתור סגירה וסגירה אוטומטית
 * @param {string} message - תוכן ההודעה
 * @param {string} type - סוג ההודעה (info/success/warning/error)
 * @param {number} duration - זמן הצגה במילישניות (ברירת מחדל 5000)
 */
function showNotification(message, type = 'info', duration = 5000) {
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
    notification.innerHTML = `
        <span class="notification-message">${message}</span>
        <button class="notification-close">&times;</button>
    `;

    container.appendChild(notification);

    // מאזין לכפתור סגירה
    const closeBtn = notification.querySelector('.notification-close');

    // טיימר לסגירה אוטומטית
    const autoClose = setTimeout(() => closeNotification(), duration);

    /**
     * פונקציית סגירת הודעה
     */
    function closeNotification() {
        notification.classList.add('closing');
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
            clearTimeout(autoClose);
        }, 300);
    }

    // הוספת מאזין לכפתור סגירה
    closeBtn.addEventListener('click', closeNotification);

    // הצגת ההודעה
    setTimeout(() => notification.classList.add('active'), 10);

    console.log(`🔔 הודעה: [${type}] ${message}`);

    return notification;
}

// הוספת פונקציה לחלון הגלובלי
window.showNotification = showNotification;

// ==================== SERVER CONNECTION ====================
// בדיקות חיבור לשרת ו-API

/**
 * בדיקת חיבור לשרת
 * @returns {Promise<boolean>} האם השרת מחובר
 */
async function checkServerConnection() {
    try {
        let response;

        // אם המשתמש מחובר, נשלח את ה-username
        if (isUserLoggedIn()) {
            const username = getCurrentUsername();
            response = await fetch(`/api/health?username=${username}`);
        } else {
            // אם לא מחובר, ננסה endpoint בסיסי
            response = await fetch('/api/health');
        }

        if (response.ok) {
            const data = await response.json();
            console.log('✅ שרת מחובר:', data);
            return true;
        } else {
            console.log('⚠️ שרת מגיב אבל עם שגיאה:', response.status);
            return false;
        }
    } catch (error) {
        console.error('❌ שרת לא מחובר:', error);
        showNotification('שגיאה: לא ניתן להתחבר לשרת', 'error');
        return false;
    }
}

/**
 * בדיקת endpoints זמינים (רק בפיתוח)
 */
async function checkAvailableEndpoints() {
    if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
        return; // רק בפיתוח
    }

    const endpoints = [
        '/api/health',
        '/api/get_loaded_people',
        '/api/people/create_person',
        '/api/upload_temp_image',
        '/api/get_target_images'
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

// הוספת פונקציות לחלון הגלובלי
window.checkServerConnection = checkServerConnection;
window.checkAvailableEndpoints = checkAvailableEndpoints;

// ==================== UTILITY FUNCTIONS ====================
// פונקציות עזר כלליות

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
 * פורמט תאריך לעברית
 * @param {Date|string} date - התאריך לפורמט
 * @returns {string} תאריך מפורמט
 */
function formatHebrewDate(date) {
    if (typeof date === 'string') {
        date = new Date(date);
    }

    const options = {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: 'Asia/Jerusalem'
    };

    return date.toLocaleDateString('he-IL', options);
}

/**
 * פורמט זמן לעברית
 * @param {Date|string} time - הזמן לפורמט
 * @returns {string} זמן מפורמט
 */
function formatHebrewTime(time) {
    if (typeof time === 'string') {
        time = new Date(time);
    }

    const options = {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Asia/Jerusalem'
    };

    return time.toLocaleTimeString('he-IL', options);
}

/**
 * הגדרת תאריך נוכחי בשדה
 * @param {string} elementId - מזהה השדה
 */
function setCurrentDate(elementId = 'attendance-date') {
    const dateInput = document.getElementById(elementId);
    if (dateInput) {
        const today = new Date().toISOString().split('T')[0];
        dateInput.value = today;
    }
}

/**
 * פונקציה לטיפול בשגיאות API
 * @param {Response} response - תגובת השרת
 * @param {Object} data - נתוני התגובה
 * @returns {boolean} האם הצליח
 */
function handleApiResponse(response, data) {
    if (response.ok && (data.success !== false)) {
        return true;
    }

    // טיפול בשגיאות שונות
    if (response.status === 401) {
        showNotification('נדרשת התחברות מחדש', 'warning');
        setTimeout(() => window.location.href = '/login', 1500);
    } else if (response.status === 403) {
        showNotification('אין הרשאה לביצוע פעולה זו', 'error');
    } else if (response.status === 404) {
        showNotification('הנתיב או המשאב לא נמצא', 'error');
    } else if (response.status === 500) {
        showNotification('שגיאה פנימית בשרת - נא לנסות שוב', 'error');
    } else {
        showNotification(data?.error || `שגיאה: ${response.status}`, 'error');
    }

    return false;
}

// הוספת פונקציות לחלון הגלובלי
window.transliterateHebrew = transliterateHebrew;
window.formatHebrewDate = formatHebrewDate;
window.formatHebrewTime = formatHebrewTime;
window.setCurrentDate = setCurrentDate;
window.handleApiResponse = handleApiResponse;

// ==================== NAVIGATION HELPERS ====================
// עזרי ניווט

/**
 * הגדרת ניווט בין הסקשנים
 */
function setupNavigation() {
    // מאזינים לקישורי ניווט
    document.querySelectorAll('.nav-links a, .cta-button').forEach(link => {
        link.addEventListener('click', function(e) {
            const href = this.getAttribute('href');

            // אם זה קישור לאותו דף עם # (anchor)
            if (href && href.startsWith('#')) {
                e.preventDefault();
                const targetSection = document.querySelector(href);
                if (targetSection) {
                    // הסרת active מכל הקישורים
                    document.querySelectorAll('.nav-links a').forEach(l => l.classList.remove('active'));
                    // הוספת active לקישור הנוכחי
                    this.classList.add('active');
                    // גלילה לסקשן
                    targetSection.scrollIntoView({ behavior: 'smooth' });
                }
            }
            // אחרת תן לדפדפן להתנהל רגיל
        });
    });
}

// ==================== ERROR HANDLING ====================
// טיפול גלובלי בשגיאות

/**
 * טיפול גלובלי בשגיאות JavaScript
 */
function setupGlobalErrorHandling() {
    // שגיאות JavaScript רגילות
    window.addEventListener('error', function(event) {
        console.error('JavaScript Error:', event.error);

        // הצגת הודעה ידידותית למשתמש (רק בסביבת פיתוח)
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            showNotification('אירעה שגיאה בסיסית באפליקציה. בדוק את הקונסול לפרטים.', 'error');
        }
    });

    // שגיאות Promise שלא נתפסו
    window.addEventListener('unhandledrejection', function(event) {
        console.error('Unhandled Promise Rejection:', event.reason);

        // הצגת הודעה ידידותית למשתמש (רק בסביבת פיתוח)
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            showNotification('אירעה שגיאה בתקשורת עם השרת', 'error');
        }
    });
}

// ==================== INITIALIZATION ====================
// אתחול מערכות משותפות

/**
 * אתחול פונקציות משותפות
 * מופעל אוטומטית כשהדף נטען
 */
function initializeCommon() {
    console.log('🔧 מאתחל פונקציות משותפות...');

    // טעינת פרטי משתמש מאחסון
    loadUserFromStorage();

    // הגדרת מאזיני מודלים
    initializeModalListeners();

    // הגדרת ניווט
    setupNavigation();

    // הגדרת טיפול בשגיאות
    setupGlobalErrorHandling();

    // הצגת מידע משתמש
    showUserInfo();

    // בדיקת שרת (לא חוסם)
    checkServerConnection().then(isConnected => {
        if (isConnected) {
            console.log('✅ חיבור לשרת מוכן');
        } else {
            console.log('⚠️ בעיה בחיבור לשרת');
        }
    });

    // בדיקת endpoints בפיתוח
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        checkAvailableEndpoints();
    }

    console.log('✅ פונקציות משותפות אותחלו בהצלחה');
}

// ==================== DEBUG UTILITIES ====================
// כלים לדיבוג (רק בפיתוח)

if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    window.debugCommon = {
        // בדיקת סטטוס התחברות
        checkAuth: () => {
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
        reloadAuth: () => {
            console.log('🔄 טוען מחדש מ-sessionStorage...');
            const loaded = loadUserFromStorage();
            console.log('תוצאה:', loaded);
            showUserInfo();
            return loaded;
        },

        // בדיקת שרת
        testServer: checkServerConnection,

        // הצגת הודעה לבדיקה
        testNotification: (type = 'info') => {
            showNotification(`הודעת בדיקה: ${type}`, type);
        },

        // רשימת פונקציות זמינות
        help: () => {
            console.log('🔧 כלי דיבוג זמינים:');
            console.log('- debugCommon.checkAuth() - בדיקת התחברות');
            console.log('- debugCommon.reloadAuth() - טעינה מחדש');
            console.log('- debugCommon.testServer() - בדיקת שרת');
            console.log('- debugCommon.testNotification(type) - הודעת בדיקה');
        }
    };

    console.log('🔧 כלי דיבוג זמינים: window.debugCommon');
}

// ==================== AUTO INITIALIZATION ====================
// אתחול אוטומטי כשהדף נטען

document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Common.js נטען');
    initializeCommon();
});

/**
 * ==================== END OF COMMON.JS ====================
 *
 * קובץ זה מספק תשתית משותפת לכל דפי האפליקציה:
 *
 * 🔐 מערכת התחברות מלאה
 * 📂 ניהול modals מתקדם
 * 🔔 מערכת הודעות עשירה
 * 🌐 בדיקות שרת ו-API
 * 🛠️ פונקציות עזר שימושיות
 * 🔧 כלי דיבוג מתקדמים
 *
 * כל הפונקציות זמינות גלובלית דרך window
 */