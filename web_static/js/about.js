/**
 * ==================== ABOUT PAGE JAVASCRIPT ====================
 * קובץ JavaScript ספציפי לדף אודותינו
 *
 * מכיל:
 * - אנימציות כניסה לאלמנטים
 * - ספירת סטטיסטיקות מונפשת
 * - אפקטי גלילה (scroll effects)
 * - אינטראקציות עם כרטיסי הצוות
 * - אנימציות hover מתקדמות
 */

// ==================== GLOBAL VARIABLES ====================

// מעקב אחר אלמנטים שכבר הונפשו
let animatedElements = new Set();

// מעקב אחר סטטיסטיקות שכבר נספרו
let countedStats = new Set();

// Observer לזיהוי אלמנטים שנכנסים לתצוגה
let intersectionObserver = null;

// ==================== INITIALIZATION ====================

/**
 * אתחול דף אודותינו
 */
function initializeAbout() {
    console.log('ℹ️ מאתחל דף אודותינו...');

    // הגדרת מאזיני אירועים
    initializeAboutEventListeners();

    // הגדרת intersection observer
    setupIntersectionObserver();

    // אנימציות ראשוניות
    initializeAnimations();

    // הגדרת אפקטי hover
    setupHoverEffects();

    console.log('✅ דף אודותינו אותחל בהצלחה');
}

/**
 * הגדרת מאזיני אירועים לדף אודותינו
 */
function initializeAboutEventListeners() {
    // מאזין לגלילה לאפקטי parallax קלים
    window.addEventListener('scroll', handleScroll);

    // מאזינים לכרטיסי הצוות
    setupTeamCardInteractions();

    // מאזינים לכרטיסי הערכים
    setupValueCardInteractions();

    console.log('🎯 מאזיני אירועים לדף אודותינו הוגדרו');
}

// ==================== INTERSECTION OBSERVER ====================

/**
 * הגדרת intersection observer לזיהוי אלמנטים בתצוגה
 */
function setupIntersectionObserver() {
    const options = {
        root: null,
        rootMargin: '0px 0px -50px 0px',
        threshold: 0.1
    };

    intersectionObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                handleElementInView(entry.target);
            }
        });
    }, options);

    // צפייה באלמנטים לאנימציה
    const elementsToObserve = document.querySelectorAll(`
        .story-step,
        .mv-card,
        .value-card,
        .tech-feature,
        .stat-card,
        .team-member,
        .award-card
    `);

    elementsToObserve.forEach(element => {
        intersectionObserver.observe(element);
    });

    console.log(`👀 צופה ב-${elementsToObserve.length} אלמנטים לאנימציה`);
}

/**
 * טיפול באלמנט שנכנס לתצוגה
 */
function handleElementInView(element) {
    const elementId = element.id || element.className;

    // בדיקה שהאלמנט עדיין לא הונפש
    if (animatedElements.has(elementId)) {
        return;
    }

    // סימון האלמנט כמונפש
    animatedElements.add(elementId);

    // הוספת אנימציה בהתאם לסוג האלמנט
    if (element.classList.contains('stat-card')) {
        animateStatCard(element);
    } else if (element.classList.contains('story-step')) {
        animateStoryStep(element);
    } else if (element.classList.contains('team-member')) {
        animateTeamMember(element);
    } else {
        // אנימציה כללית
        animateElement(element);
    }
}

// ==================== ANIMATION FUNCTIONS ====================

/**
 * אנימציה כללית לאלמנטים
 */
function animateElement(element) {
    element.style.opacity = '0';
    element.style.transform = 'translateY(30px)';
    element.style.transition = 'all 0.6s ease';

    // השהיה קטנה לפני הפעלת האנימציה
    setTimeout(() => {
        element.style.opacity = '1';
        element.style.transform = 'translateY(0)';
    }, 100);
}

/**
 * אנימציה לכרטיסי סטטיסטיקות
 */
function animateStatCard(element) {
    // אנימציה בסיסית
    animateElement(element);

    // אנימציית ספירה למספר
    const numberElement = element.querySelector('.stat-number');
    const targetValue = parseInt(element.getAttribute('data-target')) || 0;

    if (numberElement && !countedStats.has(element)) {
        countedStats.add(element);
        animateNumber(numberElement, 0, targetValue, 2000);
    }
}

/**
 * אנימציה לשלבי הסיפור
 */
function animateStoryStep(element) {
    const delay = Array.from(element.parentNode.children).indexOf(element) * 200;

    element.style.opacity = '0';
    element.style.transform = 'translateX(-50px)';
    element.style.transition = 'all 0.8s ease';

    setTimeout(() => {
        element.style.opacity = '1';
        element.style.transform = 'translateX(0)';
    }, delay);
}

/**
 * אנימציה לחברי הצוות
 */
function animateTeamMember(element) {
    const delay = Array.from(element.parentNode.children).indexOf(element) * 150;

    element.style.opacity = '0';
    element.style.transform = 'scale(0.8) translateY(30px)';
    element.style.transition = 'all 0.6s ease';

    setTimeout(() => {
        element.style.opacity = '1';
        element.style.transform = 'scale(1) translateY(0)';
    }, delay);
}

/**
 * אנימציית ספירת מספרים
 */
function animateNumber(element, start, end, duration) {
    const startTime = Date.now();
    const range = end - start;

    function updateNumber() {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // פונקציית easing חלקה
        const easedProgress = 1 - Math.pow(1 - progress, 3);
        const currentValue = Math.floor(start + (range * easedProgress));

        element.textContent = currentValue.toLocaleString('he-IL');

        if (progress < 1) {
            requestAnimationFrame(updateNumber);
        } else {
            element.textContent = end.toLocaleString('he-IL');
        }
    }

    updateNumber();
}

// ==================== SCROLL EFFECTS ====================

/**
 * טיפול בגלילה
 */
function handleScroll() {
    const scrollY = window.scrollY;

    // אפקט parallax קל לסקשן הראשי
    const hero = document.querySelector('.about-hero');
    if (hero) {
        const speed = 0.5;
        hero.style.transform = `translateY(${scrollY * speed}px)`;
    }

    // אפקט fade על הלוגו הגדול
    const logoLarge = document.querySelector('.logo-large');
    if (logoLarge) {
        const opacity = Math.max(0, 1 - (scrollY / 500));
        logoLarge.style.opacity = opacity;
    }
}

// ==================== INTERACTION EFFECTS ====================

/**
 * הגדרת אינטראקציות לכרטיסי הצוות
 */
function setupTeamCardInteractions() {
    const teamMembers = document.querySelectorAll('.team-member');

    teamMembers.forEach(member => {
        const avatar = member.querySelector('.member-avatar');

        member.addEventListener('mouseenter', () => {
            member.style.transform = 'translateY(-10px)';
            member.style.boxShadow = '0 20px 40px rgba(0,0,0,0.1)';

            if (avatar) {
                avatar.style.transform = 'scale(1.1) rotate(5deg)';
            }
        });

        member.addEventListener('mouseleave', () => {
            member.style.transform = 'translateY(0)';
            member.style.boxShadow = '';

            if (avatar) {
                avatar.style.transform = 'scale(1) rotate(0deg)';
            }
        });

        // אפקט לחיצה
        member.addEventListener('click', () => {
            member.style.transform = 'scale(0.98)';
            setTimeout(() => {
                member.style.transform = '';
            }, 150);
        });
    });
}

/**
 * הגדרת אינטראקציות לכרטיסי ערכים
 */
function setupValueCardInteractions() {
    const valueCards = document.querySelectorAll('.value-card');

    valueCards.forEach(card => {
        const icon = card.querySelector('.value-icon');

        card.addEventListener('mouseenter', () => {
            card.style.transform = 'translateY(-5px) scale(1.02)';
            card.style.boxShadow = '0 15px 30px rgba(0,0,0,0.15)';

            if (icon) {
                icon.style.transform = 'scale(1.2) rotate(10deg)';
            }
        });

        card.addEventListener('mouseleave', () => {
            card.style.transform = '';
            card.style.boxShadow = '';

            if (icon) {
                icon.style.transform = '';
            }
        });
    });
}

/**
 * הגדרת אפקטי hover כלליים
 */
function setupHoverEffects() {
    // אפקטים לכרטיסי פרסים
    const awardCards = document.querySelectorAll('.award-card');
    awardCards.forEach(card => {
        card.addEventListener('mouseenter', () => {
            card.style.transform = 'rotateY(5deg) scale(1.05)';
            card.style.boxShadow = '0 10px 25px rgba(0,0,0,0.2)';
        });

        card.addEventListener('mouseleave', () => {
            card.style.transform = '';
            card.style.boxShadow = '';
        });
    });

    // אפקטים לכפתורי CTA
    const ctaButtons = document.querySelectorAll('.cta-button');
    ctaButtons.forEach(button => {
        button.addEventListener('mouseenter', () => {
            button.style.transform = 'translateY(-2px) scale(1.05)';
            button.style.boxShadow = '0 8px 20px rgba(0,0,0,0.2)';
        });

        button.addEventListener('mouseleave', () => {
            button.style.transform = '';
            button.style.boxShadow = '';
        });
    });
}

// ==================== ANIMATIONS INITIALIZATION ====================

/**
 * אתחול אנימציות ראשוניות
 */
function initializeAnimations() {
    // אנימציית כניסה לכותרת הראשית
    const heroTitle = document.querySelector('.about-hero h1');
    if (heroTitle) {
        heroTitle.style.opacity = '0';
        heroTitle.style.transform = 'translateY(50px)';

        setTimeout(() => {
            heroTitle.style.transition = 'all 1s ease';
            heroTitle.style.opacity = '1';
            heroTitle.style.transform = 'translateY(0)';
        }, 300);
    }

    // אנימציית כניסה לתת-כותרת
    const heroSubtitle = document.querySelector('.hero-subtitle');
    if (heroSubtitle) {
        heroSubtitle.style.opacity = '0';
        heroSubtitle.style.transform = 'translateY(30px)';

        setTimeout(() => {
            heroSubtitle.style.transition = 'all 1s ease';
            heroSubtitle.style.opacity = '1';
            heroSubtitle.style.transform = 'translateY(0)';
        }, 600);
    }

    // אנימציית כניסה ללוגו הגדול
    const logoLarge = document.querySelector('.logo-large');
    if (logoLarge) {
        logoLarge.style.opacity = '0';
        logoLarge.style.transform = 'scale(0.8)';

        setTimeout(() => {
            logoLarge.style.transition = 'all 1.2s ease';
            logoLarge.style.opacity = '1';
            logoLarge.style.transform = 'scale(1)';
        }, 900);
    }
}

// ==================== UTILITIES ====================

/**
 * איפוס אנימציות (לדיבוג)
 */
function resetAnimations() {
    animatedElements.clear();
    countedStats.clear();

    // איפוס כל הסטטיסטיקות
    document.querySelectorAll('.stat-number').forEach(element => {
        element.textContent = '0';
    });

    // איפוס סגנונות אלמנטים
    document.querySelectorAll('.story-step, .mv-card, .value-card, .tech-feature, .stat-card, .team-member, .award-card').forEach(element => {
        element.style.opacity = '';
        element.style.transform = '';
        element.style.transition = '';
    });

    console.log('🔄 אנימציות אופסו');
}

/**
 * הפעלת אנימציות מחדש לכל האלמנטים הנראים
 */
function rerunAnimations() {
    resetAnimations();

    // השהיה קצרה ואז הפעלה מחדש
    setTimeout(() => {
        const elementsInView = document.querySelectorAll('.story-step, .mv-card, .value-card, .tech-feature, .stat-card, .team-member, .award-card');

        elementsInView.forEach((element, index) => {
            setTimeout(() => {
                handleElementInView(element);
            }, index * 100);
        });
    }, 100);
}

/**
 * עצירת observer (לניקוי משאבים)
 */
function stopObserver() {
    if (intersectionObserver) {
        intersectionObserver.disconnect();
        intersectionObserver = null;
        console.log('⏹️ Observer נעצר');
    }
}

// ניקוי אוטומטי כשעוזבים את הדף
window.addEventListener('beforeunload', stopObserver);
window.addEventListener('pagehide', stopObserver);

// ==================== RESPONSIVE ADJUSTMENTS ====================

/**
 * התאמות לגדלי מסך שונים
 */
function handleResponsiveChanges() {
    const isMobile = window.innerWidth <= 768;

    if (isMobile) {
        // הפחתת אפקטי parallax במובייל
        window.removeEventListener('scroll', handleScroll);

        // הפחתת עוצמת אנימציות
        document.documentElement.style.setProperty('--animation-duration', '0.4s');
    } else {
        // החזרת אפקטים במסכים גדולים
        window.addEventListener('scroll', handleScroll);
        document.documentElement.style.setProperty('--animation-duration', '0.6s');
    }
}

// מאזין לשינויי גודל מסך
window.addEventListener('resize', handleResponsiveChanges);

// ==================== DEBUG UTILITIES ====================

if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    window.debugAbout = {
        // הצגת מידע על אנימציות
        showAnimationStatus: () => {
            console.log('Animated Elements:', animatedElements);
            console.log('Counted Stats:', countedStats);
            return { animatedElements, countedStats };
        },

        // איפוס והפעלה מחדש של אנימציות
        resetAndRerun: rerunAnimations,

        // בדיקת אלמנטים בתצוגה
        checkElementsInView: () => {
            const rect = document.documentElement.getBoundingClientRect();
            const elementsInView = [];

            document.querySelectorAll('.story-step, .stat-card, .team-member').forEach(element => {
                const elementRect = element.getBoundingClientRect();
                if (elementRect.top < window.innerHeight && elementRect.bottom > 0) {
                    elementsInView.push(element);
                }
            });

            console.log('Elements in view:', elementsInView);
            return elementsInView;
        },

        // הפעלת אנימציית ספירה ידנית
        testCountAnimation: (target = 1000) => {
            const testElement = document.createElement('div');
            testElement.textContent = '0';
            testElement.style.cssText = 'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); font-size: 48px; color: #333; z-index: 9999; background: white; padding: 20px; border-radius: 10px; box-shadow: 0 10px 30px rgba(0,0,0,0.3);';
            document.body.appendChild(testElement);

            animateNumber(testElement, 0, target, 3000);

            setTimeout(() => {
                document.body.removeChild(testElement);
            }, 4000);
        },

        // עצירה והפעלה של observer
        stopObserver: stopObserver,

        restartObserver: () => {
            stopObserver();
            setupIntersectionObserver();
        }
    };

    console.log('🔧 כלי דיבוג זמינים: window.debugAbout');
}

// ==================== AUTO INITIALIZATION ====================

document.addEventListener('DOMContentLoaded', function() {
    console.log('ℹ️ About.js נטען');

    // התאמה לגודל מסך
    handleResponsiveChanges();

    // אתחול הדף
    initializeAbout();
});

/**
 * ==================== END OF ABOUT.JS ====================
 *
 * קובץ זה מכיל את כל הפונקציונליות לדף אודותינו:
 *
 * ✨ אנימציות כניסה מתקדמות
 * 📊 ספירת סטטיסטיקות מונפשת
 * 🎭 אפקטי hover אינטראקטיביים
 * 📱 התאמה רספונסיבית
 * 👀 Intersection Observer לביצועים
 * 🔧 כלי דיבוג מתקדמים
 *
 * האנימציות מתרחשות רק כשהאלמנטים נכנסים לתצוגה
 * לחוויית משתמש מותאמת וביצועים מעולים
 */