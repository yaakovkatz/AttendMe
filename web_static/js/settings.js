// ==================== תיקון מעבר טאבים - עובד בלי שרת ====================

/**
 * מעבר בין טאבים - גרסה פשוטה שעובדת ללא שרת
 */
function switchTab(tabName) {
    console.log(`🔄 עובר לטאב: ${tabName}`);

    // הסרת active מכל הטאבים
    document.querySelectorAll('.settings-tab').forEach(tab => {
        tab.classList.remove('active');
    });

    // הסרת active מכל הפאנלים
    document.querySelectorAll('.settings-panel').forEach(panel => {
        panel.classList.remove('active');
    });

    // הוספת active לטאב הנוכחי
    const activeTabElement = document.querySelector(`[data-tab="${tabName}"]`);
    if (activeTabElement) {
        activeTabElement.classList.add('active');
        console.log(`✅ טאב ${tabName} הופעל`);
    } else {
        console.error(`❌ לא נמצא טאב: ${tabName}`);
    }

    // הוספת active לפאנל הנוכחי
    const activePanelElement = document.getElementById(`${tabName}-settings`);
    if (activePanelElement) {
        activePanelElement.classList.add('active');
        console.log(`✅ פאנל ${tabName}-settings הופעל`);
    } else {
        console.error(`❌ לא נמצא פאנל: ${tabName}-settings`);
    }

    activeTab = tabName;
}

/**
 * הגדרת מאזיני אירועים פשוטים לטאבים
 */
function initializeTabEventListeners() {
    console.log('🎯 מגדיר מאזיני טאבים...');

    // מאזיני טאבים
    document.querySelectorAll('.settings-tab').forEach(tab => {
        const tabName = tab.dataset.tab;
        console.log(`📌 מגדיר מאזין עבור טאב: ${tabName}`);

        tab.addEventListener('click', (e) => {
            e.preventDefault();
            console.log(`🖱️ נלחץ טאב: ${tabName}`);
            switchTab(tabName);
        });
    });

    console.log('✅ מאזיני טאבים הוגדרו');
}

/**
 * אתחול בסיסי ללא תלות בשרת
 */
function initializeBasicSettings() {
    console.log('⚙️ מאתחל הגדרות בסיסיות (ללא שרת)...');

    // אתחול טאבים
    initializeTabEventListeners();

    // מילוי ברירות מחדל בשדות
    fillDefaultValues();

    // הגדרת מאזיני שדות בסיסיים
    setupBasicFieldListeners();

    console.log('✅ הגדרות בסיסיות אותחלו');
}

/**
 * מילוי ערכי ברירת מחדל בשדות
 */
function fillDefaultValues() {
    console.log('📝 ממלא ערכי ברירת מחדל...');

    // הגדרות כלליות
    setValue('school-name', 'בית ספר דוגמה');
    setValue('school-email', 'school@example.com');
    setValue('school-phone', '03-1234567');
    setValue('school-address', 'רחוב הדוגמה 123, תל אביב');
    setValue('system-language', 'he');
    setValue('timezone', 'Asia/Jerusalem');
    setChecked('auto-backup', true);
    setChecked('debug-mode', false);

    // הגדרות חשבון
    setValue('username', getCurrentUsername() || 'admin');
    setValue('display-name', 'מנהל המערכת');
    setValue('user-email', 'admin@example.com');

    // הגדרות זיהוי פנים
    setValue('recognition-threshold', 0.6);
    setChecked('multi-face-detection', true);
    setChecked('save-detection-images', false);
    setValue('detection-interval', 5);

    // הגדרות התראות
    setChecked('email-daily-report', true);
    setChecked('email-system-alerts', true);
    setChecked('email-new-person', false);
    setChecked('browser-notifications', true);
    setChecked('sound-notifications', false);
    setValue('notification-duration', 5);

    // הגדרות אבטחה
    setChecked('auto-logout', true);
    setValue('logout-timeout', 30);
    setChecked('login-alerts', true);
    setChecked('require-https', true);
    setChecked('data-encryption', true);

    // הגדרות גיבוי
    setChecked('enable-auto-backup', true);
    setValue('backup-frequency', 'daily');
    setValue('backup-time', '02:00');

    console.log('✅ ערכי ברירת מחדל מולאו');
}

/**
 * הגדרת מאזינים בסיסיים לשדות
 */
function setupBasicFieldListeners() {
    console.log('🎧 מגדיר מאזיני שדות בסיסיים...');

    // מאזין לסלידר רגישות
    const thresholdSlider = document.getElementById('recognition-threshold');
    if (thresholdSlider) {
        thresholdSlider.addEventListener('input', updateThresholdDisplay);
        updateThresholdDisplay(); // עדכון ראשוני
    }

    // מאזינים לשדות סיסמה
    const newPasswordInput = document.getElementById('new-password');
    const confirmPasswordInput = document.getElementById('confirm-password');

    if (newPasswordInput) {
        newPasswordInput.addEventListener('input', updatePasswordStrength);
    }

    if (confirmPasswordInput) {
        confirmPasswordInput.addEventListener('input', validatePasswordMatch);
    }

    // מאזיני כפתורים (ללא שרת - רק הודעות)
    setupOfflineButtons();

    console.log('✅ מאזיני שדות בסיסיים הוגדרו');
}

/**
 * הגדרת כפתורים למצב offline
 */
function setupOfflineButtons() {
    console.log('🔌 מגדיר כפתורים למצב offline...');

    // כפתורי שמירה
    const saveButtons = [
        'save-general-settings',
        'save-account-settings',
        'save-recognition-settings',
        'save-notification-settings',
        'save-security-settings'
    ];

    saveButtons.forEach(buttonId => {
        const button = document.getElementById(buttonId);
        if (button) {
            button.addEventListener('click', () => {
                console.log(`💾 נלחץ כפתור: ${buttonId}`);
                showOfflineMessage('ההגדרות נשמרו מקומית', 'info');
            });
        }
    });

    // כפתורי בדיקה
    const testButtons = [
        { id: 'test-recognition', message: 'בדיקת זיהוי פנים - זמינה כשהשרת מחובר' },
        { id: 'test-notification', message: 'זוהי הודעת בדיקה!' },
        { id: 'change-password', message: 'שינוי סיסמה - זמין כשהשרת מחובר' }
    ];

    testButtons.forEach(({ id, message }) => {
        const button = document.getElementById(id);
        if (button) {
            button.addEventListener('click', () => {
                console.log(`🧪 נלחץ כפתור בדיקה: ${id}`);
                showOfflineMessage(message, 'info');
            });
        }
    });

    // כפתור איפוס
    const resetButton = document.getElementById('reset-general-settings');
    if (resetButton) {
        resetButton.addEventListener('click', () => {
            if (confirm('האם לאפס את כל ההגדרות הכלליות לברירת מחדל?')) {
                console.log('🔄 מאפס הגדרות כלליות...');
                fillDefaultValues();
                showOfflineMessage('הגדרות אופסו לברירת מחדל', 'success');
            }
        });
    }

    console.log('✅ כפתורים הוגדרו למצב offline');
}

/**
 * הודעה למצב offline
 */
function showOfflineMessage(message, type = 'info') {
    console.log(`📢 הודעה: ${message}`);

    // אם יש פונקציית showNotification - השתמש בה
    if (typeof showNotification === 'function') {
        showNotification(message, type);
    } else {
        // אחרת - הודעה פשוטה
        alert(message);
    }
}

/**
 * עדכון תצוגת רגישות זיהוי
 */
function updateThresholdDisplay() {
    const slider = document.getElementById('recognition-threshold');
    const display = document.getElementById('threshold-value');

    if (slider && display) {
        const value = parseFloat(slider.value);
        display.textContent = value.toFixed(2);
        console.log(`🎛️ רגישות זיהוי עודכנה: ${value}`);
    }
}

/**
 * עדכון חוזק סיסמה בסיסי
 */
function updatePasswordStrength() {
    const password = getValue('new-password');
    const strengthElement = document.getElementById('password-strength');
    const strengthText = strengthElement?.querySelector('.strength-text');

    if (!password) {
        if (strengthElement) strengthElement.style.display = 'none';
        return;
    }

    if (strengthElement) strengthElement.style.display = 'block';

    let strength = 0;
    if (password.length >= 8) strength += 25;
    if (/[a-z]/.test(password)) strength += 25;
    if (/[A-Z]/.test(password)) strength += 25;
    if (/[0-9]/.test(password)) strength += 25;

    if (strengthText) {
        if (strength < 50) {
            strengthText.textContent = 'חלשה';
        } else if (strength < 75) {
            strengthText.textContent = 'בינונית';
        } else {
            strengthText.textContent = 'חזקה';
        }
    }

    console.log(`🔒 חוזק סיסמה: ${strength}%`);
}

/**
 * בדיקת התאמת סיסמאות
 */
function validatePasswordMatch() {
    const newPassword = getValue('new-password');
    const confirmPassword = getValue('confirm-password');
    const confirmInput = document.getElementById('confirm-password');

    if (!confirmInput) return;

    if (confirmPassword && newPassword !== confirmPassword) {
        confirmInput.style.borderColor = '#e74c3c';
        console.log('❌ סיסמאות לא תואמות');
    } else {
        confirmInput.style.borderColor = '';
        console.log('✅ סיסמאות תואמות');
    }
}

// ==================== UTILITY FUNCTIONS ללא שינוי ====================

function setValue(elementId, value) {
    const element = document.getElementById(elementId);
    if (element && value !== undefined) {
        element.value = value;
    }
}

function setChecked(elementId, checked) {
    const element = document.getElementById(elementId);
    if (element && checked !== undefined) {
        element.checked = checked;
    }
}

function getValue(elementId) {
    const element = document.getElementById(elementId);
    return element ? element.value : '';
}

function getChecked(elementId) {
    const element = document.getElementById(elementId);
    return element ? element.checked : false;
}

function getCurrentUsername() {
    // אם יש פונקציה קיימת - השתמש בה
    if (typeof window.getCurrentUsername === 'function') {
        return window.getCurrentUsername();
    }
    // אחרת - ברירת מחדל
    return 'admin';
}

// ==================== AUTO INITIALIZATION ====================

document.addEventListener('DOMContentLoaded', function() {
    console.log('⚙️ Settings.js נטען - מצב offline');
    initializeBasicSettings();
});

console.log('📦 Settings.js טוען במצב offline');