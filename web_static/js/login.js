// ==================== GLOBAL VARIABLES ====================
let currentTab = 'login';
let isSubmitting = false;

// משתנה זמני להחזקת פרטי ההרשמה
let tempRegistrationData = {
    school_name: '',
    school_email: '',
    school_phone: '',
    school_address: '',
    admin_username: '',
    admin_password: '',
    school_index: ''
};

// ==================== INITIALIZATION ====================
/**
 * אתחול הדף כשהוא נטען
 */
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 דף כניסה נטען בהצלחה');

    // מאזיני אירועים לטפסים
    document.getElementById('login-form').addEventListener('submit', handleLogin);
    document.getElementById('register-form').addEventListener('submit', handleRegister);

    // מעקב שינויים בטופס הרשמה לתצוגה מקדימה ועדכון משתנה זמני
    ['school-name', 'school-email', 'school-phone', 'school-address', 'admin-username'].forEach(id => {
        document.getElementById(id).addEventListener('input', function() {
            updateTempData(id);
            updatePreview();
        });
    });

    // מעקב דרישות סיסמה ועדכון משתנה זמני
    document.getElementById('admin-password').addEventListener('input', function() {
        updateTempData('admin-password');
        checkPasswordRequirements();
    });

    showMessage('🎯 זהו דף ההתחברות - למערכת AttendMe', 'success');
});

// ==================== TEMP DATA MANAGEMENT ====================
/**
 * עדכון המשתנה הזמני עם נתונים מהטופס
 * @param {string} fieldId - מזהה השדה שהשתנה
 */
function updateTempData(fieldId) {
    const fieldValue = document.getElementById(fieldId).value.trim();

    switch(fieldId) {
        case 'school-name':
            tempRegistrationData.school_name = fieldValue;
            break;
        case 'school-email':
            tempRegistrationData.school_email = fieldValue;
            break;
        case 'school-phone':
            tempRegistrationData.school_phone = fieldValue;
            break;
        case 'school-address':
            tempRegistrationData.school_address = fieldValue;
            break;
        case 'admin-username':
            tempRegistrationData.admin_username = fieldValue;
            break;
        case 'admin-password':
            tempRegistrationData.admin_password = document.getElementById(fieldId).value; // ללא trim לסיסמה
            break;
    }

    console.log('📝 עדכון נתונים זמניים:', {
        field: fieldId,
        value: fieldId === 'admin-password' ? '***' : fieldValue
    });
}

/**
 * בדיקת תקינות כל הנתונים הזמניים
 * @returns {object} תוצאת הבדיקה
 */
function validateTempData() {
    console.log('🔍 בודק תקינות נתונים זמניים...');

    // בדיקת שדות חובה
    const requiredFields = ['school_name', 'school_email', 'school_phone', 'admin_username', 'admin_password'];
    const missingFields = [];

    for (const field of requiredFields) {
        if (!tempRegistrationData[field] || tempRegistrationData[field].length === 0) {
            missingFields.push(field);
        }
    }

    if (missingFields.length > 0) {
        return {
            valid: false,
            error: 'missing_fields',
            message: `השדות הבאים חובה: ${missingFields.join(', ')}`,
            missingFields: missingFields
        };
    }

    // בדיקת תקינות אימייל
    if (!isValidEmail(tempRegistrationData.school_email)) {
        return {
            valid: false,
            error: 'invalid_email',
            message: 'כתובת האימייל אינה תקינה'
        };
    }

    // בדיקת תקינות טלפון
    if (!isValidPhone(tempRegistrationData.school_phone)) {
        return {
            valid: false,
            error: 'invalid_phone',
            message: 'מספר הטלפון אינו תקין (נדרש פורמט ישראלי)'
        };
    }

    // בדיקת חוזק סיסמה
    if (!isPasswordStrong(tempRegistrationData.admin_password)) {
        return {
            valid: false,
            error: 'weak_password',
            message: 'הסיסמה חייבת להכיל לפחות 8 תווים, ספרה אחת ואות אחת'
        };
    }

    // בדיקת אורך שם משתמש
    if (tempRegistrationData.admin_username.length < 3) {
        return {
            valid: false,
            error: 'short_username',
            message: 'שם המשתמש חייב להכיל לפחות 3 תווים'
        };
    }

    // בדיקת תווים מיוחדים בשם משתמש
    if (!/^[a-zA-Z0-9_]+$/.test(tempRegistrationData.admin_username)) {
        return {
            valid: false,
            error: 'invalid_username',
            message: 'שם המשתמש יכול להכיל רק אותיות אנגליות, ספרות וקו תחתון'
        };
    }

    console.log('✅ כל הנתונים הזמניים תקינים');
    return {
        valid: true,
        message: 'כל הנתונים תקינים'
    };
}

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

    // אם עוברים לטאב הרשמה, מנקים את הנתונים הזמניים
    if (tabName === 'register') {
        clearTempData();
    }

    // ניקוי הודעות (פרט להודעת ההדגמה)
    if (document.getElementById('message-area').innerHTML.includes('מחובר למערכת Python')) {
        return;
    } else {
        clearMessages();
    }
}

/**
 * ניקוי המשתנה הזמני
 */
function clearTempData() {
    tempRegistrationData = {
        school_name: '',
        school_email: '',
        school_phone: '',
        school_address: '',
        admin_username: '',
        admin_password: ''
    };
    console.log('🗑️ נתונים זמניים נוקו');
}

// ==================== LOGIN HANDLING ====================
/**
 * טיפול בהתחברות - שליחה לשרת Python
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

    console.log('🔐 מתחבר למערכת Python:', username);
    showSpinner('login');

    try {
        // שליחת בקשה לשרת Python
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                username: username,
                password: password
            })
        });

        const result = await response.json();

        if (result.success) {
            showMessage(result.message, 'success');
            console.log('✅ התחברות מוצלחת:', result.school_info);

            // שמירת פרטי המשתמש ב-sessionStorage
const userInfo = {
    username: username,
    schoolInfo: result.school_info,
};

// שמירה ב-sessionStorage וגם ב-window (לתאימות)
sessionStorage.setItem('currentUser', JSON.stringify(userInfo));
window.currentUser = userInfo;

console.log('💾 פרטי משתמש נשמרו:', userInfo);

            // העברה לדף הבית אחרי שנייה וחצי
            setTimeout(() => {
                goHome();
            }, 1500);
        } else {
            // הצגת הודעת שגיאה מהשרת
            showMessage(result.message, 'error');
            console.log('❌ שגיאת התחברות:', result.error_type);
        }

    } catch (error) {
        console.error('❌ שגיאת רשת:', error);
        showMessage('שגיאה בחיבור לשרת. נסה שוב.', 'error');
    }

    hideSpinner('login');
    isSubmitting = false;
}

// ==================== REGISTRATION HANDLING ====================
/**
 * טיפול בהרשמה - בדיקת נתונים ושליחה לשרת Python
 * @param {Event} event - אירוע שליחת הטופס
 */
async function handleRegister(event) {
    event.preventDefault();

    if (isSubmitting) return;
    isSubmitting = true;

    console.log('🏫 מתחיל תהליך הרשמה...');

    // עדכון סופי של כל הנתונים הזמניים
    ['school-name', 'school-email', 'school-phone', 'school-address', 'admin-username', 'admin-password'].forEach(id => {
        updateTempData(id);
    });

    // בדיקת תקינות הנתונים הזמניים
    const validation = validateTempData();
    if (!validation.valid) {
        showMessage(validation.message, 'error');
        isSubmitting = false;
        return;
    }

    console.log('✅ כל הנתונים תקינים, שולח לשרת Python...');
    showSpinner('register');

    try {
        // שליחת בקשה לשרת Python
        const response = await fetch('/api/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(tempRegistrationData)
        });

        const result = await response.json();

        if (result.success) {
            showMessage(result.message, 'success');
            console.log('✅ הרשמה מוצלחת:', result.school_info);

            // שמירת מידע הרישום כולל המיקום בווקטור
            const registrationInfo = {
                school_name: result.school_info?.school_name,
                admin_username: result.school_info?.admin_username,
                position_in_database: result.position_in_database,
                school_email: result.school_info?.school_email
            };
            localStorage.setItem('last_registered_school', JSON.stringify(registrationInfo));

            // ניקוי הטופס והנתונים הזמניים
            document.getElementById('register-form').reset();
            clearTempData();
            updatePreview();

            // העברה לדף הבית אחרי שתי שניות
            setTimeout(() => {
                goHome();
            }, 2000);
        } else {
            // הצגת הודעת שגיאה מהשרת
            showMessage(result.message, 'error');
            console.log('❌ שגיאת הרשמה:', result.error_type);
        }

    } catch (error) {
        console.error('❌ שגיאת רשת:', error);
        showMessage('שגיאה בחיבור לשרת. נסה שוב.', 'error');
    }

    hideSpinner('register');
    isSubmitting = false;
}

// ==================== PREVIEW FUNCTIONS ====================
/**
 * עדכון תצוגה מקדימה של בית הספר
 */
function updatePreview() {
    const preview = document.getElementById('school-preview');

    if (tempRegistrationData.school_name || tempRegistrationData.school_email ||
        tempRegistrationData.school_phone || tempRegistrationData.admin_username) {

        preview.style.display = 'block';
        document.getElementById('preview-name').textContent = tempRegistrationData.school_name || '-';
        document.getElementById('preview-email').textContent = tempRegistrationData.school_email || '-';
        document.getElementById('preview-phone').textContent = tempRegistrationData.school_phone || '-';
        document.getElementById('preview-address').textContent = tempRegistrationData.school_address || '-';
        document.getElementById('preview-admin').textContent = tempRegistrationData.admin_username || '-';
    } else {
        preview.style.display = 'none';
    }
}

// ==================== PASSWORD VALIDATION ====================
/**
 * בדיקת דרישות סיסמה ועדכון ויזואלי
 */
function checkPasswordRequirements() {
    const password = tempRegistrationData.admin_password;

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
 * בדיקת תקינות מספר טלפון ישראלי
 * @param {string} phone - מספר הטלפון
 * @returns {boolean} האם הטלפון תקין
 */
function isValidPhone(phone) {
    // פורמטים מקובלים: 03-1234567, 054-1234567, +972-3-1234567
    const patterns = [
        /^0[2-9]-?\d{7}$/,           // 03-1234567 או 031234567
        /^05[0-9]-?\d{7}$/,         // 054-1234567 או 0541234567
        /^\+972-?[2-9]-?\d{7}$/,    // +972-3-1234567
        /^[2-9]\d{6,7}$/            // 1234567 או 12345678
    ];

    return patterns.some(pattern => pattern.test(phone.replace(/\s/g, '')));
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
🎯 מערכת AttendMe - ניהול בתי ספר

✅ התחברות:
• הזן שם משתמש וסיסמה של מנהל בית ספר רשום
• המערכת תבדוק אם המשתמש קיים ואם הסיסמה נכונה

✅ הרשמה:
• מלא את כל השדות הנדרשים (*)
• שם המשתמש חייב להיות ייחודי (לא קיים במערכת)
• האימייל חייב להיות ייחודי ותקין
• דרישות הסיסמה: 8 תווים + ספרה + אות

🔧 תכונות מתקדמות:
• בדיקת תקינות בזמן אמת
• תצוגה מקדימה של פרטי בית הספר
• הודעות שגיאה מפורטות
• חיבור למסד נתונים Python

📞 תמיכה:
אם נתקלת בבעיות, פנה למנהל המערכת.
    `;

    alert(helpMessage);
}

// ==================== DEBUG INFO ====================
console.log('📄 login.js (מעודכן) נטען בהצלחה');
console.log('🔗 מחובר למערכת Python School.py');
console.log('💾 משתמש במשתנה זמני לבדיקת נתונים');
console.log('🎯 מוכן לטיפול בהתחברות והרשמה אמיתית');