/**
 * ==================== ABOUT PAGE JAVASCRIPT - SIMPLIFIED ====================
 * קובץ JavaScript פשוט לדף אודותינו
 *
 * מכיל:
 * - אנימציות כניסה בסיסיות
 * - ספירת סטטיסטיקות
 * - אפקטי גלילה פשוטים
 */

// ==================== GLOBAL VARIABLES ====================

let observer = null;

// ==================== INITIALIZATION ====================

/**
 * אתחול דף אודותינו
 */
function initializeAbout() {
    console.log('ℹ️ מאתחל דף אודותינו...');

    // הגדרת אנימציות כניסה
    setupScrollAnimations();

    // הגדרת ספירת סטטיסטיקות
    // setupStatsAnimation(); // הוסר - אין יותר סטטיסטיקות

    // אנימציות ראשוניות
    initializeHeroAnimations();

    console.log('✅ דף אודותינו אותחל בהצלחה');
}

// ==================== SCROLL ANIMATIONS ====================

/**
 * הגדרת אנימציות גלילה
 */
function setupScrollAnimations() {
    // יצירת observer לאנימציות
    observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-in');
            }
        });
    }, {
        rootMargin: '0px 0px -100px 0px',
        threshold: 0.1
    });

    // צפייה באלמנטים לאנימציה
    const elementsToAnimate = document.querySelectorAll(`
        .origin-story,
        .founders-section,
        .journey-timeline,
        .vision-mission,
        .values-section,
        .technology-section,
        .future-plans,
        .about-cta
    `);

    elementsToAnimate.forEach(element => {
        observer.observe(element);
    });

    console.log(`👀 צופה ב-${elementsToAnimate.length} אלמנטים לאנימציה`);
}



// ==================== HERO ANIMATIONS ====================

/**
 * אנימציות ראשוניות לסקשן הראשי
 */
function initializeHeroAnimations() {
    const hero = document.querySelector('.about-hero');
    const heroTitle = hero?.querySelector('h1');
    const heroSubtitle = hero?.querySelector('.hero-subtitle');
    const logoLarge = hero?.querySelector('.logo-large');

    // אנימציית כותרת
    if (heroTitle) {
        heroTitle.style.opacity = '0';
        heroTitle.style.transform = 'translateY(30px)';

        setTimeout(() => {
            heroTitle.style.transition = 'all 0.8s ease';
            heroTitle.style.opacity = '1';
            heroTitle.style.transform = 'translateY(0)';
        }, 200);
    }

    // אנימציית תת-כותרת
    if (heroSubtitle) {
        heroSubtitle.style.opacity = '0';
        heroSubtitle.style.transform = 'translateY(20px)';

        setTimeout(() => {
            heroSubtitle.style.transition = 'all 0.8s ease';
            heroSubtitle.style.opacity = '1';
            heroSubtitle.style.transform = 'translateY(0)';
        }, 400);
    }

    // אנימציית לוגו
    if (logoLarge) {
        logoLarge.style.opacity = '0';
        logoLarge.style.transform = 'scale(0.8)';

        setTimeout(() => {
            logoLarge.style.transition = 'all 1s ease';
            logoLarge.style.opacity = '1';
            logoLarge.style.transform = 'scale(1)';
        }, 600);
    }
}

// ==================== RESPONSIVE HANDLING ====================

/**
 * טיפול בשינויי גודל מסך
 */
function handleResize() {
    const isMobile = window.innerWidth <= 768;

    // התאמות למובייל
    if (isMobile) {
        document.documentElement.style.setProperty('--animation-duration', '0.4s');
    } else {
        document.documentElement.style.setProperty('--animation-duration', '0.6s');
    }
}

// ==================== CLEANUP ====================

/**
 * ניקוי משאבים
 */
function cleanup() {
    if (observer) {
        observer.disconnect();
        observer = null;
    }
}

// ==================== EVENT LISTENERS ====================

// מאזין לשינוי גודל מסך
window.addEventListener('resize', handleResize);

// ניקוי כשעוזבים את הדף
window.addEventListener('beforeunload', cleanup);
window.addEventListener('pagehide', cleanup);

// ==================== CSS ANIMATIONS ====================

// הוספת סגנונות CSS לאנימציות
const animationStyles = `
    <style>
        /* אנימציות כניסה */
        .origin-story,
        .founders-section,
        .journey-timeline,
        .vision-mission,
        .values-section,
        .technology-section,
        .future-plans,
        .about-cta {
            opacity: 0;
            transform: translateY(30px);
            transition: all 0.6s ease;
        }

        .animate-in {
            opacity: 1 !important;
            transform: translateY(0) !important;
        }

        /* אנימציות hover */
        .founder-card:hover,
        .vm-card:hover,
        .value-card:hover,
        .plan-card:hover {
            transform: translateY(-5px);
        }

        .story-step:hover {
            transform: translateX(-5px);
        }

        /* אנימציות מותאמות למובייל */
        @media (max-width: 768px) {
            .origin-story,
            .founders-section,
            .journey-timeline,
            .vision-mission,
            .values-section,
            .technology-section,
            .impact-stats,
            .future-plans,
            .about-cta {
                transform: translateY(20px);
            }
        }
    </style>
`;

// הוספת הסגנונות לראש הדף
document.head.insertAdjacentHTML('beforeend', animationStyles);

// ==================== DEBUG UTILITIES ====================

if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    window.debugAbout = {
        // הצגת מצב האנימציות
        showStatus: () => {
            console.log('Animation Status:', {
                observerActive: !!observer
            });
        },

        // איפוס אנימציות
        resetAnimations: () => {
            document.querySelectorAll('.animate-in').forEach(el => {
                el.classList.remove('animate-in');
            });
            console.log('🔄 אנימציות אופסו');
        }
    };

    console.log('🔧 כלי דיבוג זמינים: window.debugAbout');
}

// ==================== AUTO INITIALIZATION ====================

document.addEventListener('DOMContentLoaded', function() {
    console.log('ℹ️ About.js (Simplified) נטען');

    // התאמה ראשונית לגודל מסך
    handleResize();

    // אתחול הדף
    initializeAbout();
});

/**
 * ==================== END OF SIMPLIFIED ABOUT.JS ====================
 *
 * קובץ זה מכיל פונקציונליות בסיסית ונקייה לדף אודותינו:
 *
 * ✨ אנימציות כניסה פשוטות ויעילות
 * 📊 ספירת סטטיסטיקות מונפשת
 * 📱 התאמה רספונסיבית
 * 🔧 כלי דיבוג בסיסיים
 *
 * הקוד פשוט, מקוצר ועובד בצורה יעילה
 */