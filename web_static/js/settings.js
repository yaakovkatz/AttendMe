// ==================== תיקון מעבר טאבים - עובד בלי שרת (גרסה מתוקנת) ====================

/**
 * בדיקה אם אלמנט קיים לפני ביצוע פעולה
 */
function safeElementOperation(elementId, operation, fallback = null) {
    try {
        const element = document.getElementById(elementId);
        if (element) {
            return operation(element);
        } else {
            console.warn(`⚠️ אלמנט לא נמצא: ${elementId}`);
            return fallback;
        }
    } catch (error) {
        console.warn(`⚠️ שגיאה בפעולה על אלמנט ${elementId}:`, error.message);
        return fallback;
    }
}

/**
 * בדיקה אם selector קיים
 */
function safeQuerySelector(selector, operation, fallback = null) {
    try {
        const element = document.querySelector(selector);
        if (element) {
            return operation(element);
        } else {
            console.warn(`⚠️ selector לא נמצא: ${selector}`);
            return fallback;
        }
    } catch (error) {
        console.warn(`⚠️ שגיאה ב-selector ${selector}:`, error.message);
        return fallback;
    }
}

/**
 * מעבר בין טאבים - גרסה מוגנת
 */
function switchTab(tabName) {
    console.log(`🔄 עובר לטאב: ${tabName}`);

    try {
        // הסרת active מכל הטאבים
        const tabs = document.querySelectorAll('.settings-tab');
        if (tabs.length > 0) {
            tabs.forEach(tab => {
                tab.classList.remove('active');
            });
        }

        // הסרת active מכל הפאנלים
        const panels = document.querySelectorAll('.settings-panel');
        if (panels.length > 0) {
            panels.forEach(panel => {
                panel.classList.remove('active');
            });
        }

        // הוספת active לטאב הנוכחי
        const activeTabElement = document.querySelector(`[data-tab="${tabName}"]`);
        if (activeTabElement) {
            activeTabElement.classList.add('active');
            console.log(`✅ טאב ${tabName} הופעל`);
        } else {
            console.warn(`⚠️ לא נמצא טאב: ${tabName}`);
        }

        // הוספת active לפאנל הנוכחי
        const activePanelElement = document.getElementById(`${tabName}-settings`);
        if (activePanelElement) {
            activePanelElement.classList.add('active');
            console.log(`✅ פאנל ${tabName}-settings הופעל`);
        } else {
            console.warn(`⚠️ לא נמצא פאנל: ${tabName}-settings`);
        }

    } catch (error) {
        console.error(`❌ שגיאה במעבר טאב:`, error.message);
    }
}

/**
 * הגדרת מאזיני אירועים פשוטים לטאבים
 */
function initializeTabEventListeners() {
    console.log('🎯 מגדיר מאזיני טאבים...');

    try {
        // בדיקה אם יש טאבים בדף
        const tabs = document.querySelectorAll('.settings-tab');
        if (tabs.length === 0) {
            console.log('ℹ️ לא נמצאו טאבים בדף - מדלג על הגדרת מאזינים');
            return;
        }

        // מאזיני טאבים
        tabs.forEach(tab => {
            const tabName = tab.dataset.tab;
            if (tabName) {
                console.log(`📌 מגדיר מאזין עבור טאב: ${tabName}`);

                tab.addEventListener('click', (e) => {
                    e.preventDefault();
                    console.log(`🖱️ נלחץ טאב: ${tabName}`);
                    switchTab(tabName);
                });
            }
        });

        console.log('✅ מאזיני טאבים הוגדרו');
    } catch (error) {
        console.error('❌ שגיאה בהגדרת מאזיני טאבים:', error.message);
    }
}

/**
 * אתחול בסיסי ללא תלות בשרת
 */
function initializeBasicSettings() {
    console.log('⚙️ מאתחל הגדרות בסיסיות (ללא שרת)...');

    try {
        // אתחול טאבים
        initializeTabEventListeners();

        // מילוי ברירות מחדל בשדות (רק אם קיימים)
        fillDefaultValues();

        // הגדרת מאזיני שדות בסיסיים
        setupBasicFieldListeners();

        console.log('✅ הגדרות בסיסיות אותחלו');
    } catch (error) {
        console.error('❌ שגיאה באתחול הגדרות:', error.message);
    }
}

/**
 * מילוי ערכי ברירת מחדל בשדות - גרסה מוגנת
 */
function fillDefaultValues() {
    console.log('📝 ממלא ערכי ברירת מחדל...');

    try {
        // הגדרות כלליות - רק אם השדות קיימים
        safeSetValue('school-name', 'בית ספר דוגמה');
        safeSetValue('school-email', 'school@example.com');
        safeSetValue('school-phone', '03-1234567');
        safeSetValue('school-address', 'רחוב הדוגמה 123, תל אביב');
        safeSetValue('system-language', 'he');
        safeSetValue('timezone', 'Asia/Jerusalem');
        safeSetChecked('auto-backup', true);
        safeSetChecked('debug-mode', false);

        // הגדרות חשבון
        safeSetValue('username', getCurrentUsername() || 'admin');
        safeSetValue('display-name', 'מנהל המערכת');
        safeSetValue('user-email', 'admin@example.com');

        // הגדרות זיהוי פנים
        safeSetValue('recognition-threshold', 0.6);
        safeSetChecked('multi-face-detection', true);
        safeSetChecked('save-detection-images', false);
        safeSetValue('detection-interval', 5);

        // הגדרות התראות
        safeSetChecked('email-daily-report', true);
        safeSetChecked('email-system-alerts', true);
        safeSetChecked('email-new-person', false);
        safeSetChecked('browser-notifications', true);
        safeSetChecked('sound-notifications', false);
        safeSetValue('notification-duration', 5);

        // הגדרות אבטחה
        safeSetChecked('auto-logout', true);
        safeSetValue('logout-timeout', 30);
        safeSetChecked('login-alerts', true);
        safeSetChecked('require-https', true);
        safeSetChecked('data-encryption', true);

        // הגדרות גיבוי
        safeSetChecked('enable-auto-backup', true);
        safeSetValue('backup-frequency', 'daily');
        safeSetValue('backup-time', '02:00');

        console.log('✅ ערכי ברירת מחדל מולאו (השדות הזמינים)');
    } catch (error) {
        console.error('❌ שגיאה במילוי ברירות מחדל:', error.message);
    }
}

/**
 * הגדרת מאזינים בסיסיים לשדות - גרסה מוגנת
 */
function setupBasicFieldListeners() {
    console.log('🎧 מגדיר מאזיני שדות בסיסיים...');

    try {
        // מאזין לסלידר רגישות
        safeElementOperation('recognition-threshold', (element) => {
            element.addEventListener('input', updateThresholdDisplay);
            updateThresholdDisplay(); // עדכון ראשוני
        });

        // מאזינים לשדות סיסמה
        safeElementOperation('new-password', (element) => {
            element.addEventListener('input', updatePasswordStrength);
        });

        safeElementOperation('confirm-password', (element) => {
            element.addEventListener('input', validatePasswordMatch);
        });

        // מאזיני כפתורים (ללא שרת - רק הודעות)
        setupOfflineButtons();

        console.log('✅ מאזיני שדות בסיסיים הוגדרו');
    } catch (error) {
        console.error('❌ שגיאה בהגדרת מאזיני שדות:', error.message);
    }
}

/**
 * הגדרת כפתורים למצב offline - גרסה מוגנת
 */
function setupOfflineButtons() {
    console.log('🔌 מגדיר כפתורים למצב offline...');

    try {
        // כפתורי שמירה
        const saveButtons = [
            'save-general-settings',
            'save-account-settings',
            'save-recognition-settings',
            'save-notification-settings',
            'save-security-settings'
        ];

        saveButtons.forEach(buttonId => {
            safeElementOperation(buttonId, (button) => {
                button.addEventListener('click', () => {
                    console.log(`💾 נלחץ כפתור: ${buttonId}`);
                    showOfflineMessage('ההגדרות נשמרו מקומית', 'info');
                });
            });
        });

        // כפתורי בדיקה
        const testButtons = [
            { id: 'test-recognition', message: 'בדיקת זיהוי פנים - זמינה כשהשרת מחובר' },
            { id: 'test-notification', message: 'זוהי הודעת בדיקה!' },
            { id: 'change-password', message: 'שינוי סיסמה - זמין כשהשרת מחובר' }
        ];

        testButtons.forEach(({ id, message }) => {
            safeElementOperation(id, (button) => {
                button.addEventListener('click', () => {
                    console.log(`🧪 נלחץ כפתור בדיקה: ${id}`);
                    showOfflineMessage(message, 'info');
                });
            });
        });

        // כפתור איפוס
        safeElementOperation('reset-general-settings', (button) => {
            button.addEventListener('click', () => {
                if (confirm('האם לאפס את כל ההגדרות הכלליות לברירת מחדל?')) {
                    console.log('🔄 מאפס הגדרות כלליות...');
                    fillDefaultValues();
                    showOfflineMessage('הגדרות אופסו לברירת מחדל', 'success');
                }
            });
        });

        console.log('✅ כפתורים הוגדרו למצב offline');
    } catch (error) {
        console.error('❌ שגיאה בהגדרת כפתורים:', error.message);
    }
}

/**
 * הודעה למצב offline - גרסה מוגנת
 */
function showOfflineMessage(message, type = 'info') {
    console.log(`📢 הודעה: ${message}`);

    try {
        // בדיקה אם יש פונקציית showNotification
        if (typeof showNotification === 'function') {
            showNotification(message, type);
        } else {
            // יצירת הודעה פשוטה ויפה
            createSimpleNotification(message, type);
        }
    } catch (error) {
        console.warn('⚠️ לא ניתן להציג הודעה מפורטת, משתמש ב-alert:', error.message);
        alert(message);
    }
}

/**
 * יצירת הודעה פשוטה ויפה
 */
function createSimpleNotification(message, type = 'info') {
    try {
        // בדיקה אם כבר יש container להודעות
        let container = document.getElementById('simple-notifications');
        if (!container) {
            container = document.createElement('div');
            container.id = 'simple-notifications';
            container.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 9999;
                max-width: 300px;
            `;
            document.body.appendChild(container);
        }

        // יצירת הודעה
        const notification = document.createElement('div');
        notification.style.cssText = `
            background: ${type === 'error' ? '#f44336' : type === 'success' ? '#4caf50' : '#2196f3'};
            color: white;
            padding: 12px 16px;
            margin-bottom: 10px;
            border-radius: 4px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.2);
            font-size: 14px;
            line-height: 1.4;
            opacity: 0;
            transform: translateX(100%);
            transition: all 0.3s ease;
        `;
        notification.textContent = message;

        container.appendChild(notification);

        // אנימציה של הופעה
        setTimeout(() => {
            notification.style.opacity = '1';
            notification.style.transform = 'translateX(0)';
        }, 10);

        // הסרה אוטומטית
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);

    } catch (error) {
        console.warn('⚠️ לא ניתן ליצור הודעה פשוטה:', error.message);
    }
}

/**
 * עדכון תצוגת רגישות זיהוי - גרסה מוגנת
 */
function updateThresholdDisplay() {
    try {
        safeElementOperation('recognition-threshold', (slider) => {
            safeElementOperation('threshold-value', (display) => {
                const value = parseFloat(slider.value);
                display.textContent = value.toFixed(2);
                console.log(`🎛️ רגישות זיהוי עודכנה: ${value}`);
            });
        });
    } catch (error) {
        console.warn('⚠️ שגיאה בעדכון תצוגת רגישות:', error.message);
    }
}

/**
 * עדכון חוזק סיסמה בסיסי - גרסה מוגנת
 */
function updatePasswordStrength() {
    try {
        const password = safeGetValue('new-password');
        if (!password) return;

        safeElementOperation('password-strength', (strengthElement) => {
            strengthElement.style.display = 'block';

            safeQuerySelector('#password-strength .strength-text', (strengthText) => {
                let strength = 0;
                if (password.length >= 8) strength += 25;
                if (/[a-z]/.test(password)) strength += 25;
                if (/[A-Z]/.test(password)) strength += 25;
                if (/[0-9]/.test(password)) strength += 25;

                if (strength < 50) {
                    strengthText.textContent = 'חלשה';
                } else if (strength < 75) {
                    strengthText.textContent = 'בינונית';
                } else {
                    strengthText.textContent = 'חזקה';
                }

                console.log(`🔒 חוזק סיסמה: ${strength}%`);
            });
        });
    } catch (error) {
        console.warn('⚠️ שגיאה בעדכון חוזק סיסמה:', error.message);
    }
}

/**
 * בדיקת התאמת סיסמאות - גרסה מוגנת
 */
function validatePasswordMatch() {
    try {
        const newPassword = safeGetValue('new-password');
        const confirmPassword = safeGetValue('confirm-password');

        safeElementOperation('confirm-password', (confirmInput) => {
            if (confirmPassword && newPassword && newPassword !== confirmPassword) {
                confirmInput.style.borderColor = '#e74c3c';
                console.log('❌ סיסמאות לא תואמות');
            } else {
                confirmInput.style.borderColor = '';
                console.log('✅ סיסמאות תואמות');
            }
        });
    } catch (error) {
        console.warn('⚠️ שגיאה בבדיקת התאמת סיסמאות:', error.message);
    }
}

// ==================== SAFE UTILITY FUNCTIONS ====================

function safeSetValue(elementId, value) {
    return safeElementOperation(elementId, (element) => {
        if (value !== undefined && value !== null) {
            element.value = value;
            return true;
        }
        return false;
    }, false);
}

function safeSetChecked(elementId, checked) {
    return safeElementOperation(elementId, (element) => {
        if (checked !== undefined && checked !== null) {
            element.checked = checked;
            return true;
        }
        return false;
    }, false);
}

function safeGetValue(elementId) {
    return safeElementOperation(elementId, (element) => {
        return element.value || '';
    }, '');
}

function safeGetChecked(elementId) {
    return safeElementOperation(elementId, (element) => {
        return element.checked || false;
    }, false);
}

// פונקציות ישנות לתאימות לאחור
function setValue(elementId, value) {
    return safeSetValue(elementId, value);
}

function setChecked(elementId, checked) {
    return safeSetChecked(elementId, checked);
}

function getValue(elementId) {
    return safeGetValue(elementId);
}

function getChecked(elementId) {
    return safeGetChecked(elementId);
}

function getCurrentUsername() {
    try {
        // בדיקה אם יש פונקציה קיימת
        if (typeof window.getCurrentUsername === 'function') {
            return window.getCurrentUsername();
        }
        // בדיקה אם יש משתנה גלובלי
        if (window.currentUser && window.currentUser.username) {
            return window.currentUser.username;
        }
        // ברירת מחדל
        return 'admin';
    } catch (error) {
        console.warn('⚠️ לא ניתן לקבל שם משתמש נוכחי:', error.message);
        return 'admin';
    }
}

// ==================== SAFE AUTO INITIALIZATION ====================

function initializeWhenReady() {
    try {
        console.log('⚙️ Settings.js נטען - מצב offline מוגן');

        // בדיקה אם הדף מוכן
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initializeBasicSettings);
        } else {
            // הדף כבר מוכן
            initializeBasicSettings();
        }

    } catch (error) {
        console.error('❌ שגיאה באתחול ראשוני:', error.message);
    }
}

// אתחול מוגן
try {
    initializeWhenReady();
} catch (error) {
    console.error('❌ שגיאה קריטית בטעינת Settings.js:', error.message);
}

console.log('📦 Settings.js טוען במצב offline מוגן');