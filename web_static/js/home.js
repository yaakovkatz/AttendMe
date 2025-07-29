/**
 * ==================== HOME PAGE JAVASCRIPT ====================
 * קובץ JavaScript ספציפי לדף הבית
 *
 * מכיל:
 * - ניהול dashboard למשתמשים מחוברים
 * - סטטיסטיקות בזמן אמת
 * - פעילות אחרונה
 * - אנימציות ספציפיות לדף הבית
 */

// ==================== GLOBAL VARIABLES ====================
// משתנים ספציפיים לדף הבית

// נתוני dashboard
let dashboardData = {
    totalPeople: 0,
    presentPeople: 0,
    absentPeople: 0,
    attendancePercentage: 0
};

// ==================== DASHBOARD MANAGEMENT ====================
// ניהול לוח הבקרה למשתמשים מחוברים

/**
 * טעינת נתוני dashboard מהשרת
 * @returns {Promise<void>}
 */
async function loadDashboardData() {
    if (!isUserLoggedIn()) {
        console.log('🔒 משתמש לא מחובר - דילוג על טעינת dashboard');
        return;
    }

    console.log('📊 טוען נתוני dashboard...');

    try {
        const username = getCurrentUsername();

        // טעינת נתוני אנשים
        const peopleResponse = await fetch(`/api/get_loaded_people?username=${username}`);
        if (peopleResponse.ok) {
            const peopleData = await peopleResponse.json();

            if (peopleData.success && peopleData.people) {
                dashboardData.totalPeople = peopleData.people.length;
                dashboardData.presentPeople = peopleData.people.filter(p => p.is_present).length;
                dashboardData.absentPeople = dashboardData.totalPeople - dashboardData.presentPeople;

                // חישוב אחוזי נוכחות
                dashboardData.attendancePercentage = dashboardData.totalPeople > 0
                    ? Math.round((dashboardData.presentPeople / dashboardData.totalPeople) * 100)
                    : 0;

                console.log('✅ נתוני אנשים נטענו:', {
                    total: dashboardData.totalPeople,
                    present: dashboardData.presentPeople,
                    absent: dashboardData.absentPeople,
                    percentage: dashboardData.attendancePercentage
                });
            }
        }

        // עדכון התצוגה
        updateDashboardDisplay();

    } catch (error) {
        console.error('❌ שגיאה בטעינת נתוני dashboard:', error);
        showNotification('שגיאה בטעינת נתונים', 'error');
    }
}

/**
 * עדכון תצוגת הדאשבורד
 */
function updateDashboardDisplay() {
    // עדכון סטטיסטיקות בדאשבורד המפורט בלבד
    const totalDetailEl = document.getElementById('total-people-detail');
    const presentDetailEl = document.getElementById('present-people-detail');
    const absentDetailEl = document.getElementById('absent-people-detail');
    const percentageEl = document.getElementById('attendance-percentage');

    if (totalDetailEl) {
        animateNumber(totalDetailEl, dashboardData.totalPeople);
    }

    if (presentDetailEl) {
        animateNumber(presentDetailEl, dashboardData.presentPeople);
    }

    if (absentDetailEl) {
        animateNumber(absentDetailEl, dashboardData.absentPeople);
    }

    if (percentageEl) {
        animatePercentage(percentageEl, dashboardData.attendancePercentage);
    }

    console.log('📊 Dashboard עודכן');
}

/**
 * אנימציה למספרים בדאשבורד
 * @param {HTMLElement} element - האלמנט לאנימציה
 * @param {number} targetValue - הערך המטרה
 */
function animateNumber(element, targetValue) {
    const startValue = parseInt(element.textContent) || 0;
    const duration = 1000; // מילישניות
    const startTime = Date.now();

    function animate() {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const currentValue = Math.round(startValue + (targetValue - startValue) * progress);

        element.textContent = currentValue;

        if (progress < 1) {
            requestAnimationFrame(animate);
        }
    }

    animate();
}

/**
 * אנימציה לאחוזים
 * @param {HTMLElement} element - האלמנט לאנימציה
 * @param {number} targetValue - הערך המטרה באחוזים
 */
function animatePercentage(element, targetValue) {
    const startValue = parseInt(element.textContent.replace('%', '')) || 0;
    const duration = 1000; // מילישניות
    const startTime = Date.now();

    function animate() {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const currentValue = Math.round(startValue + (targetValue - startValue) * progress);

        element.textContent = currentValue + '%';

        // שמירה על צבע אחיד כמו שאר הסטטיסטיקות
        element.style.color = 'var(--primary-color)';

        if (progress < 1) {
            requestAnimationFrame(animate);
        }
    }

    animate();
}

/**
 * רענון נתוני dashboard
 */
async function refreshDashboard() {
    console.log('🔄 מרענן dashboard...');
    showNotification('מרענן נתונים...', 'info', 2000);

    await loadDashboardData();
    await loadRecentActivity();

    showNotification('נתונים עודכנו', 'success', 2000);
}

// ==================== RECENT ACTIVITY ====================
// פעילות אחרונה

/**
 * טעינת פעילות אחרונה
 */
async function loadRecentActivity() {
    if (!isUserLoggedIn()) return;

    console.log('📝 טוען פעילות אחרונה...');

    try {
        const username = getCurrentUsername();
        const response = await fetch(`/api/recent-activity?username=${username}&limit=5`);

        if (response.ok) {
            const data = await response.json();
            displayRecentActivity(data.activities || []);
        } else {
            // אם אין API, נציג פעילות דמה
            displayRecentActivity([]);
        }

    } catch (error) {
        console.error('❌ שגיאה בטעינת פעילות:', error);
        displayRecentActivity([]);
    }
}

/**
 * הצגת פעילות אחרונה
 * @param {Array} activities - רשימת פעילויות
 */
function displayRecentActivity(activities) {
    const container = document.getElementById('recent-activity-list');
    if (!container) return;

    if (activities.length === 0) {
        // פעילות דמה
        container.innerHTML = `
            <div class="activity-item">
                <i class="fas fa-user-check"></i>
                <span>ברוכים הבאים למערכת AttendMe</span>
                <time>עכשיו</time>
            </div>
            <div class="activity-item">
                <i class="fas fa-info-circle"></i>
                <span>הפעילות האחרונה תוצג כאן</span>
                <time>--</time>
            </div>
        `;
        return;
    }

    // הצגת פעילות אמיתית
    const activityHTML = activities.map(activity => `
        <div class="activity-item">
            <i class="fas fa-${getActivityIcon(activity.type)}"></i>
            <span>${activity.description}</span>
            <time>${formatHebrewTime(activity.timestamp)}</time>
        </div>
    `).join('');

    container.innerHTML = activityHTML;
}

/**
 * קבלת אייקון לפי סוג פעילות
 * @param {string} type - סוג הפעילות
 * @returns {string} שם האייקון
 */
function getActivityIcon(type) {
    const icons = {
        'attendance_check': 'user-check',
        'person_added': 'user-plus',
        'image_uploaded': 'camera',
        'login': 'sign-in-alt',
        'logout': 'sign-out-alt',
        'system': 'cog'
    };

    return icons[type] || 'circle';
}

// ==================== EVENT LISTENERS ====================
// מאזיני אירועים ספציפיים לדף הבית

/**
 * הגדרת מאזיני אירועים לדף הבית
 */
function initializeHomeEventListeners() {
    // רענון dashboard כל 30 שניות (רק למשתמשים מחוברים)
    if (isUserLoggedIn()) {
        setInterval(async () => {
            await loadDashboardData();
        }, 30000);
    }

    console.log('🎯 מאזיני אירועים לדף הבית הוגדרו');
}

// ==================== ANIMATIONS ====================
// אנימציות ספציפיות לדף הבית

/**
 * אנימציות כניסה לאלמנטים
 */
function animateElements() {
    // אנימציה לכרטיסי dashboard
    const cards = document.querySelectorAll('.status-card, .feature-card, .step-card');

    cards.forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';

        setTimeout(() => {
            card.style.transition = 'all 0.6s ease';
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        }, index * 100);
    });
}

/**
 * אנימציה לפעילות אחרונה
 */
function animateRecentActivity() {
    const activityItems = document.querySelectorAll('.activity-item');

    activityItems.forEach((item, index) => {
        item.style.opacity = '0';
        item.style.transform = 'translateX(-20px)';

        setTimeout(() => {
            item.style.transition = 'all 0.4s ease';
            item.style.opacity = '1';
            item.style.transform = 'translateX(0)';
        }, index * 100);
    });
}

// ==================== INITIALIZATION ====================
// אתחול דף הבית

/**
 * אתחול ראשי לדף הבית
 */
async function initializeHome() {
    console.log('🏠 מאתחל דף הבית...');

    // הגדרת מאזיני אירועים
    initializeHomeEventListeners();

    // אנימציות בסיסיות
    animateElements();

    // טעינת נתונים למשתמשים מחוברים
    if (isUserLoggedIn()) {
        console.log('👤 משתמש מחובר - טוען נתוני dashboard');
        await loadDashboardData();
        await loadRecentActivity();

        // אנימציות ספציפיות למשתמשים מחוברים
        setTimeout(() => {
            animateRecentActivity();
        }, 500);
    } else {
        console.log('🔒 אורח - מציג landing page');
    }

    console.log('✅ דף הבית אותחל בהצלחה');
}

// ==================== UTILITY FUNCTIONS ====================
// פונקציות עזר

/**
 * עיצוב זמן בעברית
 * @param {string|Date} timestamp - חותמת זמן
 * @returns {string} זמן מעוצב בעברית
 */
function formatHebrewTime(timestamp) {
    if (!timestamp) return '--';

    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'עכשיו';
    if (diffMins < 60) return `לפני ${diffMins} דקות`;
    if (diffHours < 24) return `לפני ${diffHours} שעות`;
    if (diffDays < 7) return `לפני ${diffDays} ימים`;

    return date.toLocaleDateString('he-IL', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

/**
 * קבלת מיקום הבית ספר בווקטור
 * @returns {string|null} שם המשתמש או null
 */
function getCurrentSchoolIndex() {
    return window.currentUser?.schoolInfo?.school_index || 0;
}

/**
 * בדיקת אם המשתמש מחובר
 * @returns {boolean} האם המשתמש מחובר
 */
function isUserLoggedIn() {
    return window.currentUser !== null && window.currentUser !== undefined;
}

/**
 * הצגת התראה למשתמש
 * @param {string} message - הודעה
 * @param {string} type - סוג ההודעה (success, error, info, warning)
 * @param {number} duration - משך זמן התצוגה במילישניות
 */
function showNotification(message, type = 'info', duration = 5000) {
    // אם קיימת פונקציה גלובלית להתראות, נשתמש בה
    if (typeof window.showNotification === 'function') {
        window.showNotification(message, type, duration);
        return;
    }

    // אחרת, נציג התראה פשוטה
    console.log(`🔔 ${type.toUpperCase()}: ${message}`);

    // יצירת התראה ויזואלית פשוטה
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.style.cssText = `
        position: fixed;
        top: 90px;
        right: 20px;
        z-index: 1000;
        background: white;
        border: 1px solid #ddd;
        border-radius: 8px;
        padding: 15px 20px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        max-width: 300px;
        transition: all 0.3s ease;
    `;

    // צבעים לפי סוג
    const colors = {
        success: '#d4edda',
        error: '#f8d7da',
        warning: '#fff3cd',
        info: '#d1ecf1'
    };

    notification.style.background = colors[type] || colors.info;
    notification.textContent = message;

    document.body.appendChild(notification);

    // הסרה אוטומטית
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => notification.remove(), 300);
    }, duration);
}

// ==================== DEBUG UTILITIES ====================
// כלי דיבוג לדף הבית (רק בפיתוח)

if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    window.debugHome = {
        // הצגת נתוני dashboard
        showDashboard: () => {
            console.log('Dashboard Data:', dashboardData);
            return dashboardData;
        },

        // רענון ידני
        refresh: refreshDashboard,

        // סימולציה של פעילות
        simulateActivity: () => {
            const mockActivities = [
                { type: 'attendance_check', description: 'בדיקת נוכחות הושלמה', timestamp: new Date() },
                { type: 'person_added', description: 'נוסף אדם חדש: יוסי כהן', timestamp: new Date(Date.now() - 300000) }
            ];
            displayRecentActivity(mockActivities);
        },

        // בדיקת מצב המשתמש
        checkUser: () => {
            console.log('Current User:', window.currentUser);
            console.log('Is Logged In:', isUserLoggedIn());
            console.log('Username:', getCurrentUsername());
        }
    };

    console.log('🔧 כלי דיבוג לדף הבית: window.debugHome');
}

// ==================== AUTO INITIALIZATION ====================
// אתחול אוטומטי כשהדף נטען

document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Home.js נטען');
    initializeHome();
});

/**
 * ==================== END OF HOME.JS ====================
 *
 * קובץ זה מכיל את כל הפונקציונליות הספציפית לדף הבית:
 *
 * 📊 Dashboard למשתמשים מחוברים
 * 📈 סטטיסטיקות בזמן אמת עם אחוזי נוכחות
 * 📝 פעילות אחרונה
 * 🎨 אנימציות וחוויית משתמש
 * 🔧 כלי דיבוג לפיתוח
 *
 * הוסרו: פונקציות מצלמה, בקרי מצלמה, פעולות מהירות
 */