/**
 * ==================== SETTINGS MANAGEMENT JAVASCRIPT ====================
 * קובץ JavaScript ספציפי לדף הגדרות מערכת
 *
 * מכיל:
 * - ניהול טאבים והעברה ביניהם
 * - הגדרות כלליות ומידע בית ספר
 * - ניהול חשבון ושינוי סיסמה
 * - הגדרות זיהוי פנים
 * - התראות ועדכונים
 * - אבטחה והיסטוריית התחברויות
 * - גיבוי ושחזור נתונים
 */

// ==================== GLOBAL VARIABLES ====================

// הגדרות נוכחיות של המערכת
let currentSettings = {
    general: {},
    account: {},
    recognition: {},
    notifications: {},
    security: {},
    backup: {}
};

// טאב פעיל נוכחי
let activeTab = 'general';

// ==================== INITIALIZATION ====================

/**
 * אתחול דף הגדרות
 */
async function initializeSettings() {
    console.log('⚙️ מאתחל דף הגדרות...');

    // בדיקת התחברות
    if (!isUserLoggedIn()) {
        console.log('🔒 משתמש לא מחובר - מפנה להתחברות');
        showNotification('נדרשת התחברות לגישה לדף זה', 'warning');
        setTimeout(() => window.location.href = '/login', 1500);
        return;
    }

    // הגדרת מאזיני אירועים
    initializeSettingsEventListeners();

    // טעינת הגדרות נוכחיות
    await loadCurrentSettings();

    // אתחול הגדרות ספציפיות
    initializePasswordStrength();
    initializeRecognitionSettings();
    initializeNotificationSettings();

    console.log('✅ דף הגדרות אותחל בהצלחה');
}

/**
 * הגדרת מאזיני אירועים לדף הגדרות
 */
function initializeSettingsEventListeners() {
    // מאזיני טאבים
    document.querySelectorAll('.settings-tab').forEach(tab => {
        tab.addEventListener('click', () => switchTab(tab.dataset.tab));
    });

    // כפתורי שמירה ואיפוס
    setupSaveButtons();
    setupResetButtons();

    // הגדרות סיסמה
    setupPasswordHandlers();

    // הגדרות זיהוי פנים
    setupRecognitionHandlers();

    // הגדרות התראות
    setupNotificationHandlers();

    // הגדרות אבטחה
    setupSecurityHandlers();

    // הגדרות גיבוי
    setupBackupHandlers();

    console.log('🎯 מאזיני אירועים להגדרות הוגדרו');
}

// ==================== TAB MANAGEMENT ====================

/**
 * מעבר בין טאבים
 */
function switchTab(tabName) {
    // הסרת active מכל הטאבים והפאנלים
    document.querySelectorAll('.settings-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelectorAll('.settings-panel').forEach(panel => {
        panel.classList.remove('active');
    });

    // הוספת active לטאב והפאנל הנוכחיים
    const activeTabElement = document.querySelector(`[data-tab="${tabName}"]`);
    const activePanelElement = document.getElementById(`${tabName}-settings`);

    if (activeTabElement && activePanelElement) {
        activeTabElement.classList.add('active');
        activePanelElement.classList.add('active');
        activeTab = tabName;

        console.log(`📋 עבר לטאב: ${tabName}`);

        // טעינת נתונים ספציפיים לטאב
        loadTabSpecificData(tabName);
    }
}

/**
 * טעינת נתונים ספציפיים לטאב
 */
async function loadTabSpecificData(tabName) {
    switch (tabName) {
        case 'recognition':
            await loadRecognitionStats();
            break;
        case 'security':
            await loadLoginHistory();
            break;
        case 'backup':
            await loadBackupList();
            break;
    }
}

// ==================== SETTINGS LOADING ====================

/**
 * טעינת הגדרות נוכחיות מהשרת
 */
async function loadCurrentSettings() {
    console.log('📥 טוען הגדרות נוכחיות...');

    try {
        const username = getCurrentUsername();
        const response = await fetch(`/api/settings?username=${username}`);

        if (response.ok) {
            const data = await response.json();
            if (data.success) {
                currentSettings = data.settings;
                populateSettingsFields();
                console.log('✅ הגדרות נטענו בהצלחה');
            }
        } else {
            // אם אין הגדרות שמורות, נשתמש בברירות מחדל
            console.log('⚠️ לא נמצאו הגדרות שמורות - משתמש בברירות מחדל');
            loadDefaultSettings();
        }
    } catch (error) {
        console.error('❌ שגיאה בטעינת הגדרות:', error);
        loadDefaultSettings();
    }
}

/**
 * טעינת הגדרות ברירת מחדל
 */
function loadDefaultSettings() {
    currentSettings = {
        general: {
            school_name: '',
            school_email: '',
            school_phone: '',
            school_address: '',
            language: 'he',
            timezone: 'Asia/Jerusalem',
            auto_backup: true,
            debug_mode: false
        },
        account: {
            username: getCurrentUsername(),
            display_name: '',
            user_email: ''
        },
        recognition: {
            threshold: 0.6,
            multi_face: true,
            save_images: false,
            detection_interval: 5
        },
        notifications: {
            email_daily_report: true,
            email_system_alerts: true,
            email_new_person: false,
            browser_notifications: true,
            sound_notifications: false,
            notification_duration: 5
        },
        security: {
            auto_logout: true,
            logout_timeout: 30,
            login_alerts: true,
            require_https: true,
            data_encryption: true
        },
        backup: {
            auto_backup: true,
            frequency: 'daily',
            time: '02:00'
        }
    };

    populateSettingsFields();
}

/**
 * מילוי שדות ההגדרות עם הנתונים הנוכחיים
 */
function populateSettingsFields() {
    // הגדרות כלליות
    setValue('school-name', currentSettings.general.school_name);
    setValue('school-email', currentSettings.general.school_email);
    setValue('school-phone', currentSettings.general.school_phone);
    setValue('school-address', currentSettings.general.school_address);
    setValue('system-language', currentSettings.general.language);
    setValue('timezone', currentSettings.general.timezone);
    setChecked('auto-backup', currentSettings.general.auto_backup);
    setChecked('debug-mode', currentSettings.general.debug_mode);

    // הגדרות חשבון
    setValue('username', currentSettings.account.username);
    setValue('display-name', currentSettings.account.display_name);
    setValue('user-email', currentSettings.account.user_email);

    // הגדרות זיהוי פנים
    setValue('recognition-threshold', currentSettings.recognition.threshold);
    setChecked('multi-face-detection', currentSettings.recognition.multi_face);
    setChecked('save-detection-images', currentSettings.recognition.save_images);
    setValue('detection-interval', currentSettings.recognition.detection_interval);

    // הגדרות התראות
    setChecked('email-daily-report', currentSettings.notifications.email_daily_report);
    setChecked('email-system-alerts', currentSettings.notifications.email_system_alerts);
    setChecked('email-new-person', currentSettings.notifications.email_new_person);
    setChecked('browser-notifications', currentSettings.notifications.browser_notifications);
    setChecked('sound-notifications', currentSettings.notifications.sound_notifications);
    setValue('notification-duration', currentSettings.notifications.notification_duration);

    // הגדרות אבטחה
    setChecked('auto-logout', currentSettings.security.auto_logout);
    setValue('logout-timeout', currentSettings.security.logout_timeout);
    setChecked('login-alerts', currentSettings.security.login_alerts);
    setChecked('require-https', currentSettings.security.require_https);
    setChecked('data-encryption', currentSettings.security.data_encryption);

    // הגדרות גיבוי
    setChecked('enable-auto-backup', currentSettings.backup.auto_backup);
    setValue('backup-frequency', currentSettings.backup.frequency);
    setValue('backup-time', currentSettings.backup.time);

    console.log('📝 שדות הגדרות מולאו');
}

// ==================== UTILITY FUNCTIONS ====================

/**
 * הגדרת ערך לשדה
 */
function setValue(elementId, value) {
    const element = document.getElementById(elementId);
    if (element && value !== undefined) {
        element.value = value;
    }
}

/**
 * הגדרת מצב checkbox
 */
function setChecked(elementId, checked) {
    const element = document.getElementById(elementId);
    if (element && checked !== undefined) {
        element.checked = checked;
    }
}

/**
 * קבלת ערך משדה
 */
function getValue(elementId) {
    const element = document.getElementById(elementId);
    return element ? element.value : '';
}

/**
 * קבלת מצב checkbox
 */
function getChecked(elementId) {
    const element = document.getElementById(elementId);
    return element ? element.checked : false;
}

// ==================== SAVE BUTTONS SETUP ====================

/**
 * הגדרת כפתורי שמירה
 */
function setupSaveButtons() {
    // הגדרות כלליות
    document.getElementById('save-general-settings')?.addEventListener('click', saveGeneralSettings);

    // הגדרות חשבון
    document.getElementById('save-account-settings')?.addEventListener('click', saveAccountSettings);

    // הגדרות זיהוי פנים
    document.getElementById('save-recognition-settings')?.addEventListener('click', saveRecognitionSettings);

    // הגדרות התראות
    document.getElementById('save-notification-settings')?.addEventListener('click', saveNotificationSettings);

    // הגדרות אבטחה
    document.getElementById('save-security-settings')?.addEventListener('click', saveSecuritySettings);
}

/**
 * הגדרת כפתורי איפוס
 */
function setupResetButtons() {
    document.getElementById('reset-general-settings')?.addEventListener('click', () => {
        if (confirm('האם לאפס את כל ההגדרות הכלליות לברירת מחדל?')) {
            resetGeneralSettings();
        }
    });
}

// ==================== GENERAL SETTINGS ====================

/**
 * שמירת הגדרות כלליות
 */
async function saveGeneralSettings() {
    if (!requireLogin('שמירת הגדרות כלליות')) return;

    console.log('💾 שומר הגדרות כלליות...');

    // איסוף נתונים מהטופס
    const generalSettings = {
        school_name: getValue('school-name'),
        school_email: getValue('school-email'),
        school_phone: getValue('school-phone'),
        school_address: getValue('school-address'),
        language: getValue('system-language'),
        timezone: getValue('timezone'),
        auto_backup: getChecked('auto-backup'),
        debug_mode: getChecked('debug-mode')
    };

    try {
        const username = getCurrentUsername();
        const response = await fetch('/api/settings/general', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                username: username,
                settings: generalSettings
            })
        });

        const data = await response.json();

        if (handleApiResponse(response, data)) {
            currentSettings.general = generalSettings;
            showNotification('הגדרות כלליות נשמרו בהצלחה', 'success');
            console.log('✅ הגדרות כלליות נשמרו');
        }
    } catch (error) {
        console.error('❌ שגיאה בשמירת הגדרות כלליות:', error);
        showNotification('שגיאה בשמירת הגדרות כלליות', 'error');
    }
}

/**
 * איפוס הגדרות כלליות
 */
function resetGeneralSettings() {
    // איפוס לברירות מחדל
    setValue('school-name', '');
    setValue('school-email', '');
    setValue('school-phone', '');
    setValue('school-address', '');
    setValue('system-language', 'he');
    setValue('timezone', 'Asia/Jerusalem');
    setChecked('auto-backup', true);
    setChecked('debug-mode', false);

    showNotification('הגדרות כלליות אופסו לברירת מחדל', 'info');
}

// ==================== ACCOUNT SETTINGS ====================

/**
 * שמירת הגדרות חשבון
 */
async function saveAccountSettings() {
    if (!requireLogin('שמירת הגדרות חשבון')) return;

    console.log('👤 שומר הגדרות חשבון...');

    const accountSettings = {
        display_name: getValue('display-name'),
        user_email: getValue('user-email')
    };

    try {
        const username = getCurrentUsername();
        const response = await fetch('/api/settings/account', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                username: username,
                settings: accountSettings
            })
        });

        const data = await response.json();

        if (handleApiResponse(response, data)) {
            currentSettings.account = { ...currentSettings.account, ...accountSettings };
            showNotification('הגדרות חשבון נשמרו בהצלחה', 'success');
            console.log('✅ הגדרות חשבון נשמרו');
        }
    } catch (error) {
        console.error('❌ שגיאה בשמירת הגדרות חשבון:', error);
        showNotification('שגיאה בשמירת הגדרות חשבון', 'error');
    }
}

// ==================== PASSWORD MANAGEMENT ====================

/**
 * הגדרת מאזיני סיסמה
 */
function setupPasswordHandlers() {
    const newPasswordInput = document.getElementById('new-password');
    const confirmPasswordInput = document.getElementById('confirm-password');
    const changePasswordBtn = document.getElementById('change-password');

    if (newPasswordInput) {
        newPasswordInput.addEventListener('input', updatePasswordStrength);
    }

    if (confirmPasswordInput) {
        confirmPasswordInput.addEventListener('input', validatePasswordMatch);
    }

    if (changePasswordBtn) {
        changePasswordBtn.addEventListener('click', handlePasswordChange);
    }
}

/**
 * אתחול בדיקת חוזק סיסמה
 */
function initializePasswordStrength() {
    const strengthElement = document.getElementById('password-strength');
    if (strengthElement) {
        strengthElement.style.display = 'none';
    }
}

/**
 * עדכון חוזק סיסמה
 */
function updatePasswordStrength() {
    const password = getValue('new-password');
    const strengthElement = document.getElementById('password-strength');
    const strengthFill = strengthElement?.querySelector('.strength-fill');
    const strengthText = strengthElement?.querySelector('.strength-text');

    if (!password) {
        if (strengthElement) strengthElement.style.display = 'none';
        return;
    }

    if (strengthElement) strengthElement.style.display = 'block';

    // חישוב חוזק סיסמה
    let strength = 0;
    let feedback = [];

    if (password.length >= 8) strength += 25;
    else feedback.push('לפחות 8 תווים');

    if (/[a-z]/.test(password)) strength += 25;
    else feedback.push('אות קטנה');

    if (/[A-Z]/.test(password)) strength += 25;
    else feedback.push('אות גדולה');

    if (/[0-9]/.test(password)) strength += 25;
    else feedback.push('ספרה');

    if (/[^a-zA-Z0-9]/.test(password)) strength += 10;

    // עדכון תצוגה
    if (strengthFill) {
        strengthFill.style.width = `${strength}%`;

        if (strength < 50) {
            strengthFill.style.backgroundColor = '#e74c3c';
        } else if (strength < 75) {
            strengthFill.style.backgroundColor = '#f39c12';
        } else {
            strengthFill.style.backgroundColor = '#27ae60';
        }
    }

    if (strengthText) {
        if (strength < 50) {
            strengthText.textContent = `חלשה - ${feedback.join(', ')}`;
        } else if (strength < 75) {
            strengthText.textContent = 'בינונית';
        } else {
            strengthText.textContent = 'חזקה';
        }
    }
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
        confirmInput.title = 'הסיסמאות לא תואמות';
    } else {
        confirmInput.style.borderColor = '';
        confirmInput.title = '';
    }
}

/**
 * טיפול בשינוי סיסמה
 */
async function handlePasswordChange() {
    if (!requireLogin('שינוי סיסמה')) return;

    const currentPassword = getValue('current-password');
    const newPassword = getValue('new-password');
    const confirmPassword = getValue('confirm-password');

    // בדיקות תקינות
    if (!currentPassword || !newPassword || !confirmPassword) {
        showNotification('נא למלא את כל שדות הסיסמה', 'error');
        return;
    }

    if (newPassword !== confirmPassword) {
        showNotification('הסיסמאות החדשות לא תואמות', 'error');
        return;
    }

    if (newPassword.length < 8) {
        showNotification('הסיסמה החדשה חייבת להכיל לפחות 8 תווים', 'error');
        return;
    }

    try {
        const username = getCurrentUsername();
        const response = await fetch('/api/change-password', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                username: username,
                current_password: currentPassword,
                new_password: newPassword
            })
        });

        const data = await response.json();

        if (handleApiResponse(response, data)) {
            // ניקוי שדות סיסמה
            setValue('current-password', '');
            setValue('new-password', '');
            setValue('confirm-password', '');

            const strengthElement = document.getElementById('password-strength');
            if (strengthElement) strengthElement.style.display = 'none';

            showNotification('סיסמה שונתה בהצלחה', 'success');
            console.log('✅ סיסמה שונתה');
        }
    } catch (error) {
        console.error('❌ שגיאה בשינוי סיסמה:', error);
        showNotification('שגיאה בשינוי סיסמה', 'error');
    }
}

// ==================== RECOGNITION SETTINGS ====================

/**
 * הגדרת מאזיני זיהוי פנים
 */
function setupRecognitionHandlers() {
    const thresholdSlider = document.getElementById('recognition-threshold');
    const testRecognitionBtn = document.getElementById('test-recognition');

    if (thresholdSlider) {
        thresholdSlider.addEventListener('input', updateThresholdDisplay);
    }

    if (testRecognitionBtn) {
        testRecognitionBtn.addEventListener('click', testRecognitionSystem);
    }
}

/**
 * אתחול הגדרות זיהוי פנים
 */
function initializeRecognitionSettings() {
    updateThresholdDisplay();
}

/**
 * עדכון תצוגת רגישות זיהוי
 */
function updateThresholdDisplay() {
    const slider = document.getElementById('recognition-threshold');
    const display = document.getElementById('threshold-value');

    if (slider && display) {
        display.textContent = slider.value;
    }
}

/**
 * שמירת הגדרות זיהוי פנים
 */
async function saveRecognitionSettings() {
    if (!requireLogin('שמירת הגדרות זיהוי פנים')) return;

    console.log('👁️ שומר הגדרות זיהוי פנים...');

    const recognitionSettings = {
        threshold: parseFloat(getValue('recognition-threshold')),
        multi_face: getChecked('multi-face-detection'),
        save_images: getChecked('save-detection-images'),
        detection_interval: parseInt(getValue('detection-interval'))
    };

    try {
        const username = getCurrentUsername();
        const response = await fetch('/api/settings/recognition', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                username: username,
                settings: recognitionSettings
            })
        });

        const data = await response.json();

        if (handleApiResponse(response, data)) {
            currentSettings.recognition = recognitionSettings;
            showNotification('הגדרות זיהוי פנים נשמרו בהצלחה', 'success');
            console.log('✅ הגדרות זיהוי פנים נשמרו');
        }
    } catch (error) {
        console.error('❌ שגיאה בשמירת הגדרות זיהוי פנים:', error);
        showNotification('שגיאה בשמירת הגדרות זיהוי פנים', 'error');
    }
}

/**
 * טעינת סטטיסטיקות זיהוי
 */
async function loadRecognitionStats() {
    try {
        const username = getCurrentUsername();
        const response = await fetch(`/api/recognition-stats?username=${username}`);

        if (response.ok) {
            const data = await response.json();
            if (data.success) {
                setValue('total-recognitions', data.stats.total_recognitions || 0);
                setValue('successful-recognitions', data.stats.successful_recognitions || 0);
                setValue('recognition-accuracy', `${data.stats.accuracy || 0}%`);
            }
        }
    } catch (error) {
        console.error('שגיאה בטעינת סטטיסטיקות זיהוי:', error);
    }
}

/**
 * בדיקת מערכת זיהוי פנים
 */
async function testRecognitionSystem() {
    if (!requireLogin('בדיקת מערכת זיהוי')) return;

    showNotification('מבצע בדיקת מערכת זיהוי...', 'info');

    try {
        const username = getCurrentUsername();
        const response = await fetch('/api/test-recognition', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ username: username })
        });

        const data = await response.json();

        if (handleApiResponse(response, data)) {
            showNotification('בדיקת מערכת זיהוי הצליחה', 'success');
            await loadRecognitionStats(); // רענון סטטיסטיקות
        }
    } catch (error) {
        console.error('❌ שגיאה בבדיקת מערכת זיהוי:', error);
        showNotification('שגיאה בבדיקת מערכת זיהוי', 'error');
    }
}

// ==================== NOTIFICATION SETTINGS ====================

/**
 * הגדרת מאזיני התראות
 */
function setupNotificationHandlers() {
    const testNotificationBtn = document.getElementById('test-notification');

    if (testNotificationBtn) {
        testNotificationBtn.addEventListener('click', testNotificationSystem);
    }

    // בקש הרשאה להתראות דפדפן
    requestNotificationPermission();
}

/**
 * אתחול הגדרות התראות
 */
function initializeNotificationSettings() {
    // בדיקת תמיכה בהתראות דפדפן
    if (!('Notification' in window)) {
        const browserNotificationsCheckbox = document.getElementById('browser-notifications');
        if (browserNotificationsCheckbox) {
            browserNotificationsCheckbox.disabled = true;
            browserNotificationsCheckbox.checked = false;
        }
    }
}

/**
 * בקשת הרשאה להתראות דפדפן
 */
function requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
    }
}

/**
 * שמירת הגדרות התראות
 */
async function saveNotificationSettings() {
    if (!requireLogin('שמירת הגדרות התראות')) return;

    console.log('🔔 שומר הגדרות התראות...');

    const notificationSettings = {
        email_daily_report: getChecked('email-daily-report'),
        email_system_alerts: getChecked('email-system-alerts'),
        email_new_person: getChecked('email-new-person'),
        browser_notifications: getChecked('browser-notifications'),
        sound_notifications: getChecked('sound-notifications'),
        notification_duration: parseInt(getValue('notification-duration'))
    };

    try {
        const username = getCurrentUsername();
        const response = await fetch('/api/settings/notifications', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                username: username,
                settings: notificationSettings
            })
        });

        const data = await response.json();

        if (handleApiResponse(response, data)) {
            currentSettings.notifications = notificationSettings;
            showNotification('הגדרות התראות נשמרו בהצלחה', 'success');
            console.log('✅ הגדרות התראות נשמרו');
        }
    } catch (error) {
        console.error('❌ שגיאה בשמירת הגדרות התראות:', error);
        showNotification('שגיאה בשמירת הגדרות התראות', 'error');
    }
}

/**
 * בדיקת מערכת התראות
 */
function testNotificationSystem() {
    showNotification('זוהי הודעת בדיקה למערכת ההתראות', 'info');

    // בדיקת התראת דפדפן
    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('AttendMe - בדיקת התראה', {
            body: 'התראת דפדפן פועלת כראוי',
            icon: '/web_static/img/logo.png'
        });
    }

    console.log('🔔 בדיקת מערכת התראות בוצעה');
}

// ==================== SECURITY SETTINGS ====================

/**
 * הגדרת מאזיני אבטחה
 */
function setupSecurityHandlers() {
    const logoutAllBtn = document.getElementById('logout-all-devices');

    if (logoutAllBtn) {
        logoutAllBtn.addEventListener('click', handleLogoutAllDevices);
    }
}

/**
 * שמירת הגדרות אבטחה
 */
async function saveSecuritySettings() {
    if (!requireLogin('שמירת הגדרות אבטחה')) return;

    console.log('🔒 שומר הגדרות אבטחה...');

    const securitySettings = {
        auto_logout: getChecked('auto-logout'),
        logout_timeout: parseInt(getValue('logout-timeout')),
        login_alerts: getChecked('login-alerts'),
        require_https: getChecked('require-https'),
        data_encryption: getChecked('data-encryption')
    };

    try {
        const username = getCurrentUsername();
        const response = await fetch('/api/settings/security', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                username: username,
                settings: securitySettings
            })
        });

        const data = await response.json();

        if (handleApiResponse(response, data)) {
            currentSettings.security = securitySettings;
            showNotification('הגדרות אבטחה נשמרו בהצלחה', 'success');
            console.log('✅ הגדרות אבטחה נשמרו');
        }
    } catch (error) {
        console.error('❌ שגיאה בשמירת הגדרות אבטחה:', error);
        showNotification('שגיאה בשמירת הגדרות אבטחה', 'error');
    }
}

/**
 * טעינת היסטוריית התחברויות
 */
async function loadLoginHistory() {
    try {
        const username = getCurrentUsername();
        const response = await fetch(`/api/login-history?username=${username}`);

        if (response.ok) {
            const data = await response.json();
            if (data.success && data.history) {
                displayLoginHistory(data.history);
            }
        }
    } catch (error) {
        console.error('שגיאה בטעינת היסטוריית התחברויות:', error);
    }
}

/**
 * הצגת היסטוריית התחברויות
 */
function displayLoginHistory(history) {
    const historyContainer = document.getElementById('login-history');
    if (!historyContainer) return;

    if (history.length === 0) {
        historyContainer.innerHTML = '<div class="no-history">אין היסטוריית התחברויות</div>';
        return;
    }

    historyContainer.innerHTML = history.map(entry => `
        <div class="history-item">
            <div class="history-time">${formatHebrewTime(entry.timestamp)}</div>
            <div class="history-device">${entry.device || 'לא זמין'}</div>
            <div class="history-ip">${entry.ip_address || 'לא זמין'}</div>
        </div>
    `).join('');
}

/**
 * התנתקות מכל המכשירים
 */
async function handleLogoutAllDevices() {
    if (!confirm('האם להתנתק מכל המכשירים? תצטרך להתחבר מחדש.')) {
        return;
    }

    try {
        const username = getCurrentUsername();
        const response = await fetch('/api/logout-all-devices', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ username: username })
        });

        const data = await response.json();

        if (handleApiResponse(response, data)) {
            showNotification('התנתקת מכל המכשירים', 'success');

            // התנתקות מהמכשיר הנוכחי
            setTimeout(() => {
                logout();
            }, 2000);
        }
    } catch (error) {
        console.error('❌ שגיאה בהתנתקות מכל המכשירים:', error);
        showNotification('שגיאה בהתנתקות מכל המכשירים', 'error');
    }
}

// ==================== BACKUP SETTINGS ====================

/**
 * הגדרת מאזיני גיבוי
 */
function setupBackupHandlers() {
    const createBackupBtn = document.getElementById('create-manual-backup');
    const uploadBackupBtn = document.getElementById('upload-backup');
    const backupFileInput = document.getElementById('backup-file-input');

    if (createBackupBtn) {
        createBackupBtn.addEventListener('click', createManualBackup);
    }

    if (uploadBackupBtn) {
        uploadBackupBtn.addEventListener('click', () => {
            backupFileInput?.click();
        });
    }

    if (backupFileInput) {
        backupFileInput.addEventListener('change', handleBackupFileUpload);
    }
}

/**
 * יצירת גיבוי ידני
 */
async function createManualBackup() {
    if (!requireLogin('יצירת גיבוי')) return;

    showNotification('יוצר גיבוי...', 'info');

    try {
        const username = getCurrentUsername();
        const response = await fetch('/api/create-backup', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ username: username })
        });

        const data = await response.json();

        if (handleApiResponse(response, data)) {
            showNotification('גיבוי נוצר בהצלחה', 'success');
            await loadBackupList(); // רענון רשימת גיבויים
        }
    } catch (error) {
        console.error('❌ שגיאה ביצירת גיבוי:', error);
        showNotification('שגיאה ביצירת גיבוי', 'error');
    }
}

/**
 * טעינת רשימת גיבויים
 */
async function loadBackupList() {
    try {
        const username = getCurrentUsername();
        const response = await fetch(`/api/backups?username=${username}`);

        if (response.ok) {
            const data = await response.json();
            if (data.success && data.backups) {
                displayBackupList(data.backups);
            }
        }
    } catch (error) {
        console.error('שגיאה בטעינת רשימת גיבויים:', error);
    }
}

/**
 * הצגת רשימת גיבויים
 */
function displayBackupList(backups) {
    const backupContainer = document.getElementById('backup-list');
    if (!backupContainer) return;

    if (backups.length === 0) {
        backupContainer.innerHTML = '<div class="no-backups">אין גיבויים זמינים</div>';
        return;
    }

    backupContainer.innerHTML = backups.map(backup => `
        <div class="backup-item">
            <div class="backup-info">
                <div class="backup-date">${formatHebrewDate(backup.created_at)}</div>
                <div class="backup-size">${formatFileSize(backup.size)}</div>
                <div class="backup-type">${backup.type === 'auto' ? 'אוטומטי' : 'ידני'}</div>
            </div>
            <div class="backup-actions">
                <button class="backup-btn download" onclick="downloadBackup('${backup.id}')" title="הורד">
                    <i class="fas fa-download"></i>
                </button>
                <button class="backup-btn restore" onclick="restoreBackup('${backup.id}')" title="שחזר">
                    <i class="fas fa-upload"></i>
                </button>
                <button class="backup-btn delete" onclick="deleteBackup('${backup.id}')" title="מחק">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');
}

/**
 * הורדת גיבוי
 */
async function downloadBackup(backupId) {
    try {
        const username = getCurrentUsername();
        const response = await fetch(`/api/download-backup/${backupId}?username=${username}`);

        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `backup_${backupId}.zip`;
            a.click();
            window.URL.revokeObjectURL(url);

            showNotification('גיבוי הורד בהצלחה', 'success');
        } else {
            throw new Error('שגיאה בהורדת גיבוי');
        }
    } catch (error) {
        console.error('❌ שגיאה בהורדת גיבוי:', error);
        showNotification('שגיאה בהורדת גיבוי', 'error');
    }
}

/**
 * שחזור גיבוי
 */
async function restoreBackup(backupId) {
    if (!confirm('האם לשחזר גיבוי זה? פעולה זו תחליף את כל הנתונים הנוכחיים.')) {
        return;
    }

    try {
        const username = getCurrentUsername();
        const response = await fetch('/api/restore-backup', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                username: username,
                backup_id: backupId
            })
        });

        const data = await response.json();

        if (handleApiResponse(response, data)) {
            showNotification('גיבוי שוחזר בהצלחה', 'success');
            setTimeout(() => window.location.reload(), 2000);
        }
    } catch (error) {
        console.error('❌ שגיאה בשחזור גיבוי:', error);
        showNotification('שגיאה בשחזור גיבוי', 'error');
    }
}

/**
 * מחיקת גיבוי
 */
async function deleteBackup(backupId) {
    if (!confirm('האם למחוק גיבוי זה? פעולה זו בלתי הפיכה.')) {
        return;
    }

    try {
        const username = getCurrentUsername();
        const response = await fetch(`/api/backups/${backupId}`, {
            method: 'DELETE',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ username: username })
        });

        const data = await response.json();

        if (handleApiResponse(response, data)) {
            showNotification('גיבוי נמחק בהצלחה', 'success');
            await loadBackupList();
        }
    } catch (error) {
        console.error('❌ שגיאה במחיקת גיבוי:', error);
        showNotification('שגיאה במחיקת גיבוי', 'error');
    }
}

/**
 * טיפול בהעלאת קובץ גיבוי
 */
function handleBackupFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.name.endsWith('.json') && !file.name.endsWith('.zip')) {
        showNotification('קובץ גיבוי חייב להיות בפורמט JSON או ZIP', 'error');
        return;
    }

    // כאן תוכל להוסיף לוגיקה להעלאת הקובץ לשרת
    showNotification('פונקציונליות העלאת גיבוי תהיה זמינה בקרוב', 'info');
}

// ==================== UTILITY FUNCTIONS ====================

/**
 * פורמט גודל קובץ
 */
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// הוספת פונקציות לחלון הגלובלי
window.downloadBackup = downloadBackup;
window.restoreBackup = restoreBackup;
window.deleteBackup = deleteBackup;

// ==================== DEBUG UTILITIES ====================

if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    window.debugSettings = {
        showSettings: () => {
            console.log('Current Settings:', currentSettings);
            console.log('Active Tab:', activeTab);
            return { currentSettings, activeTab };
        },

        loadDefaults: loadDefaultSettings,

        switchTo: (tab) => switchTab(tab),

        testNotification: testNotificationSystem,

        simulateBackup: () => {
            const mockBackups = [
                {
                    id: 'backup_123',
                    created_at: new Date().toISOString(),
                    size: 15000000,
                    type: 'manual'
                }
            ];
            displayBackupList(mockBackups);
        }
    };

    console.log('🔧 כלי דיבוג זמינים: window.debugSettings');
}

// ==================== AUTO INITIALIZATION ====================

document.addEventListener('DOMContentLoaded', function() {
    console.log('⚙️ Settings.js נטען');
    initializeSettings();
});

/**
 * ==================== END OF SETTINGS.JS ====================
 *
 * קובץ זה מכיל את כל הפונקציונליות לדף הגדרות:
 *
 * ⚙️ ניהול הגדרות כלליות ומידע בית ספר
 * 👤 ניהול חשבון ושינוי סיסמה
 * 👁️ הגדרות זיהוי פנים מתקדמות
 * 🔔 התראות ועדכונים
 * 🔒 אבטחה והיסטוריית התחברויות
 * 💾 גיבוי ושחזור נתונים
 * 📱 ממשק רספונסיבי עם טאבים
 * 🔧 כלי דיבוג מתקדמים
 */