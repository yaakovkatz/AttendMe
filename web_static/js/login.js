// ==================== GLOBAL VARIABLES ====================
let currentTab = 'login';
let isSubmitting = false;

// ==================== INITIALIZATION ====================
/**
 * אתחול הדף כשהוא נטען
 */
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 דף כניסה נטען בהצלחה');

    // מאזיני אירועים לטפסים
    document.getElementById('login-form').addEventListener('submit', handleLogin);
    document.getElementById('register-form').addEventListener('submit', handleRegister);

    // מעקב שינויים בטופס הרשמה לתצוגה מקדימה
    ['school-name', 'school-email', 'school-phone', 'school-address', 'admin-username'].forEach(id => {
        document.getElementById(id).addEventListener('input', updatePreview);
    });

    // מעקב דרישות סיסמה
    document.getElementById('admin-password').addEventListener('input', checkPasswordRequirements);

    showMessage('🎯 זהו דף ההתחברות לצורכי ההדגמה - ההתחברות תחזיר אותך לדף הבית', 'success');
});

// ==================== TAB SWITCHING ====================
/**
 * החלפת טאבים בין התחברות והרשמה
 * @param {string} tabName - שם הטאב (login/register)
 */
function switchTab(tabName) {
    console.log(`🔄 מחליף לטאב: ${tabName}`);

    // עדכון טאבים
    document.querySelectorAll('.login-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    event.target.closest('.login-tab').classList.add('active');

    // עדכון תוכן
    document.querySelectorAll('.login-form').forEach(form => {
        form.classList.remove('active');
    });
    document.getElementById(`${tabName}-form`).classList.add('active');

    currentTab = tabName;

    // ניקוי הודעות (פרט להודעת ההדגמה)
    if (document.getElementById('message-area').innerHTML.includes('דף ההתחברות לצורכי ההדגמה')) {
        // שמור את הודעת ההדגמה
        return;
    } else {
        clearMessages();
    }
}

// ==================== LOGIN HANDLING ====================
/**
 * טיפול בהתחברות - ללא אימות אמיתי
 * @param {Event} event - אירוע שליחת הטופס
 */
async function handleLogin(event) {
    event.preventDefault();

    if (isSubmitting) return;
    isSubmitting = true;

    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;

    if (!username || !password) {
        showMessage('נא למלא את כל השדות', 'error');
        isSubmitting = false;
        return;
    }

    console.log('🔐 מתחבר (הדגמה):', username);

    showSpinner('login');

    // הדמיית אימות (תמיד מצליח)
    setTimeout(() => {
        showMessage('✅ התחברות בוצעה בהצלחה! מעביר לדף הבית...', 'success');

        // העברה לדף הבית אחרי שנייה וחצי
        setTimeout(() => {
            goHome();
        }, 1500);

        hideSpinner('login');
        isSubmitting = false;
    }, 1000);
}

// ==================== REGISTRATION HANDLING ====================
/**
 * טיפול בהרשמה - ללא אימות אמיתי
 * @param {Event} event - אירוע שליחת הטופס
 */
async function handleRegister(event) {
    event.preventDefault();

    if (isSubmitting) return;
    isSubmitting = true;

    // איסוף נתונים
    const formData = {
        school_name: document.getElementById('school-name').value.trim(),
        school_email: document.getElementById('school-email').value.trim(),
        school_phone: document.getElementById('school-phone').value.trim(),
        school_address: document.getElementById('school-address').value.trim(),
        admin_username: document.getElementById('admin-username').value.trim(),
        admin_password: document.getElementById('admin-password').value
    };

    // בדיקות תקינות
    if (!formData.school_name || !formData.school_email || !formData.school_phone ||
        !formData.admin_username || !formData.admin_password) {
        showMessage('נא למלא את כל השדות הנדרשים (*)', 'error');
        isSubmitting = false;
        return;
    }

    // בדיקת תקינות אימייל
    if (!isValidEmail(formData.school_email)) {
        showMessage('כתובת אימייל לא תקינה', 'error');
        isSubmitting = false;
        return;
    }

    // בדיקת חוזק סיסמה
    if (!isPasswordStrong(formData.admin_password)) {
        showMessage('הסיסמה חייבת להכיל לפחות 8 תווים, ספרה אחת ואות אחת', 'error');
        isSubmitting = false;
        return;
    }

    console.log('🏫 יוצר בית ספר חדש (הדגמה):', formData.school_name);

    showSpinner('register');

    // הדמיית יצירת בית ספר (תמיד מצליח)
    setTimeout(() => {
        showMessage('🎉 בית הספר נוצר בהצלחה! מעביר לדף הבית...', 'success');

        // העברה לדף הבית אחרי שנייה וחצי
        setTimeout(() => {
            goHome();
        }, 2000);

        hideSpinner('register');
        isSubmitting = false;
    }, 1500);
}

// ==================== PREVIEW FUNCTIONS ====================
/**
 * עדכון תצוגה מקדימה של בית הספר
 */
function updatePreview() {
    const name = document.getElementById('school-name').value.trim();
    const email = document.getElementById('school-email').value.trim();
    const phone = document.getElementById('school-phone').value.trim();
    const address = document.getElementById('school-address').value.trim();
    const admin = document.getElementById('admin-username').value.trim();

    const preview = document.getElementById('school-preview');

    if (name || email || phone || admin) {
        preview.style.display = 'block';
        document.getElementById('preview-name').textContent = name || '-';
        document.getElementById('preview-email').textContent = email || '-';
        document.getElementById('preview-phone').textContent = phone || '-';
        document.getElementById('preview-address').textContent = address || '-';
        document.getElementById('preview-admin').textContent = admin || '-';
    } else {
        preview.style.display = 'none';
    }
}

// ==================== PASSWORD VALIDATION ====================
/**
 * בדיקת דרישות סיסמה ועדכון ויזואלי
 */
function checkPasswordRequirements() {
    const password = document.getElementById('admin-password').value;

    const lengthReq = document.getElementById('length-req');
    const numberReq = document.getElementById('number-req');
    const letterReq = document.getElementById('letter-req');
    const submitBtn = document.getElementById('register-submit');

    let allMet = true;

    // בדיקת אורך
    if (password.length >= 8) {
        lengthReq.classList.remove('not-met');
        lengthReq.classList.add('met');
        lengthReq.innerHTML = '✅ לפחות 8 תווים';
    } else {
        lengthReq.classList.remove('met');
        lengthReq.classList.add('not-met');
        lengthReq.innerHTML = '❌ לפחות 8 תווים';
        allMet = false;
    }

    // בדיקת ספרה
    if (/\d/.test(password)) {
        numberReq.classList.remove('not-met');
        numberReq.classList.add('met');
        numberReq.innerHTML = '✅ לפחות ספרה אחת';
    } else {
        numberReq.classList.remove('met');
        numberReq.classList.add('not-met');
        numberReq.innerHTML = '❌ לפחות ספרה אחת';
        allMet = false;
    }

    // בדיקת אות
    if (/[a-zA-Zא-ת]/.test(password)) {
        letterReq.classList.remove('not-met');
        letterReq.classList.add('met');
        letterReq.innerHTML = '✅ לפחות אות אחת';
    } else {
        letterReq.classList.remove('met');
        letterReq.classList.add('not-met');
        letterReq.innerHTML = '❌ לפחות אות אחת';
        allMet = false;
    }

    // עדכון כפתור
    if (allMet && password.length > 0) {
        submitBtn.disabled = false;
        submitBtn.style.opacity = '1';
    } else {
        submitBtn.disabled = true;
        submitBtn.style.opacity = '0.7';
    }
}

// ==================== VALIDATION HELPERS ====================
/**
 * בדיקת תקינות כתובת אימייל
 * @param {string} email - כתובת האימייל
 * @returns {boolean} האם האימייל תקין
 */
function isValidEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

/**
 * בדיקת חוזק סיסמה
 * @param {string} password - הסיסמה
 * @returns {boolean} האם הסיסמה חזקה מספיק
 */
function isPasswordStrong(password) {
    return password.length >= 8 && /\d/.test(password) && /[a-zA-Zא-ת]/.test(password);
}

// ==================== UI HELPERS ====================
/**
 * הצגת הודעה למשתמש
 * @param {string} message - תוכן ההודעה
 * @param {string} type - סוג ההודעה (success/error)
 */
function showMessage(message, type) {
    const messageArea = document.getElementById('message-area');
    const className = type === 'error' ? 'error-message' : 'success-message';
    messageArea.innerHTML = `<div class="${className}"><i class="fas ${type === 'error' ? 'fa-exclamation-triangle' : 'fa-check-circle'}"></i> ${message}</div>`;

    // גלילה למעלה להצגת ההודעה
    messageArea.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

/**
 * ניקוי הודעות
 */
function clearMessages() {
    document.getElementById('message-area').innerHTML = '';
}

/**
 * הצגת אנימציית טעינה
 * @param {string} formType - סוג הטופס (login/register)
 */
function showSpinner(formType) {
    document.getElementById(`${formType}-spinner`).style.display = 'block';
    document.querySelector(`#${formType}-form .submit-btn`).disabled = true;
}

/**
 * הסתרת אנימציית טעינה
 * @param {string} formType - סוג הטופס (login/register)
 */
function hideSpinner(formType) {
    document.getElementById(`${formType}-spinner`).style.display = 'none';
    document.querySelector(`#${formType}-form .submit-btn`).disabled = false;
}

// ==================== NAVIGATION ====================
/**
 * חזרה לדף הבית
 * @param {Event} event - אירוע הלחיצה (אופציונלי)
 */
function goHome(event) {
    if (event) event.preventDefault();
    console.log('🏠 חוזר לדף הבית...');
    window.location.href = '/';
}

// ==================== HELP FUNCTION ====================
/**
 * הצגת חלון עזרה עם הוראות שימוש
 */
function showHelp() {
    const helpMessage = `
🎯 הדגמת מערכת AttendMe

זהו דף התחברות לצורכי הדגמה בלבד:

✅ התחברות:
• הזן כל שם משתמש וסיסמה
• הלחיצה על "כניסה למערכת" תחזיר אותך לדף הבית

✅ הרשמה:
• מלא את כל השדות הנדרשים (*)
• הלחיצה על "צור בית ספר חדש" תחזיר אותך לדף הבית
• דרישות הסיסמה: 8 תווים + ספרה + אות

📝 הערה:
זהו דף הדגמה - אין אימות אמיתי ולא נשמרים נתונים.
    `;

    alert(helpMessage);
}

// ==================== DEBUG INFO ====================
console.log('📄 login.js נטען בהצלחה');
console.log('🎯 מוכן לטיפול בהתחברות והרשמה (הדגמה)');