/**
 * ==================== CONTACT PAGE JAVASCRIPT - SIMPLIFIED ====================
 * קובץ JavaScript פשוט לדף יצירת קשר
 *
 * מכיל:
 * - ולידציה בסיסית לטופס
 * - שליחת הודעות
 * - FAQ פשוט
 * - אנימציות בסיסיות
 */

// ==================== GLOBAL VARIABLES ====================

// מצב הטופס
let formState = {
    isSubmitting: false,
    isValid: false
};

// כללי ולידציה בסיסיים
const validationRules = {
    'first-name': { required: true, minLength: 2 },
    'last-name': { required: true, minLength: 2 },
    'email': { required: true, pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
    'phone': { required: false, pattern: /^[0-9\-\+\s\(\)]{9,15}$/ },
    'subject': { required: true },
    'message': { required: true, minLength: 10 },
    'privacy': { required: true, mustBeChecked: true }
};

// ==================== INITIALIZATION ====================

/**
 * אתחול דף יצירת קשר
 */
function initializeContact() {
    console.log('📞 מאתחל דף יצירת קשר פשוט...');

    // הגדרת טופס
    setupForm();

    // הגדרת FAQ
    setupFAQ();

    // אנימציות ראשוניות
    initializeAnimations();

    console.log('✅ דף יצירת קשר אותחל בהצלחה');
}

// ==================== FORM HANDLING ====================

/**
 * הגדרת הטופס
 */
function setupForm() {
    const form = document.getElementById('contact-form');
    if (!form) return;

    // מאזין לשליחת טופס
    form.addEventListener('submit', handleFormSubmit);

    // ולידציה בסיסית
    const fields = form.querySelectorAll('input, select, textarea');
    fields.forEach(field => {
        field.addEventListener('blur', () => validateField(field));
        field.addEventListener('input', () => {
            if (field.classList.contains('error')) {
                validateField(field);
            }
        });
    });

    console.log('📝 טופס הוגדר');
}

/**
 * ולידציית שדה בודד
 */
function validateField(field) {
    const fieldId = field.id;
    const value = field.value.trim();
    const rules = validationRules[fieldId];

    if (!rules) return true;

    // ניקוי שגיאות קודמות
    clearFieldError(field);

    // בדיקת חובה
    if (rules.required) {
        if (field.type === 'checkbox' && rules.mustBeChecked && !field.checked) {
            showFieldError(field, 'שדה זה הוא חובה');
            return false;
        } else if (field.type !== 'checkbox' && !value) {
            showFieldError(field, 'שדה זה הוא חובה');
            return false;
        }
    }

    // בדיקת אורך מינימלי
    if (rules.minLength && value.length < rules.minLength) {
        showFieldError(field, `נדרש לפחות ${rules.minLength} תווים`);
        return false;
    }

    // בדיקת תבנית
    if (rules.pattern && value && !rules.pattern.test(value)) {
        let errorMessage = 'פורמט לא תקין';
        if (fieldId === 'email') {
            errorMessage = 'כתובת אימייל לא תקינה';
        } else if (fieldId === 'phone') {
            errorMessage = 'מספר טלפון לא תקין';
        }
        showFieldError(field, errorMessage);
        return false;
    }

    // שדה תקין
    showFieldSuccess(field);
    return true;
}

/**
 * הצגת שגיאה בשדה
 */
function showFieldError(field, message) {
    const formGroup = field.closest('.form-group');
    formGroup.classList.add('error');
    formGroup.classList.remove('success');

    let errorElement = formGroup.querySelector('.field-error');
    if (!errorElement) {
        errorElement = document.createElement('div');
        errorElement.className = 'field-error';
        formGroup.appendChild(errorElement);
    }

    errorElement.textContent = message;
    errorElement.style.display = 'block';
}

/**
 * הצגת הצלחה בשדה
 */
function showFieldSuccess(field) {
    const formGroup = field.closest('.form-group');
    formGroup.classList.remove('error');
    formGroup.classList.add('success');

    const errorElement = formGroup.querySelector('.field-error');
    if (errorElement) {
        errorElement.style.display = 'none';
    }
}

/**
 * ניקוי שגיאה משדה
 */
function clearFieldError(field) {
    const formGroup = field.closest('.form-group');
    formGroup.classList.remove('error', 'success');

    const errorElement = formGroup.querySelector('.field-error');
    if (errorElement) {
        errorElement.style.display = 'none';
    }
}

// ==================== FORM SUBMISSION ====================

/**
 * טיפול בשליחת הטופס
 */
async function handleFormSubmit(event) {
    event.preventDefault();

    console.log('📤 שולח טופס יצירת קשר...');

    // בדיקת תקינות
    if (!validateForm()) {
        showFormMessage('אנא תקנו את השגיאות בטופס', 'error');
        return;
    }

    // מניעת שליחה כפולה
    if (formState.isSubmitting) return;

    formState.isSubmitting = true;
    updateSubmitButton(true);

    try {
        // איסוף נתונים
        const formData = collectFormData();

        // שליחה לשרת
        const response = await submitForm(formData);

        if (response.success) {
            handleSubmissionSuccess();
        } else {
            handleSubmissionError('שגיאה בשליחת ההודעה');
        }

    } catch (error) {
        console.error('❌ שגיאה בשליחת טופס:', error);
        handleSubmissionError('שגיאה בשליחת ההודעה. אנא נסו שוב.');
    } finally {
        formState.isSubmitting = false;
        updateSubmitButton(false);
    }
}

/**
 * ולידציה מלאה של הטופס
 */
function validateForm() {
    const form = document.getElementById('contact-form');
    const fields = form.querySelectorAll('input, select, textarea');
    let isValid = true;

    fields.forEach(field => {
        if (!validateField(field)) {
            isValid = false;
        }
    });

    return isValid;
}

/**
 * איסוף נתוני הטופס
 */
function collectFormData() {
    const form = document.getElementById('contact-form');
    const formData = new FormData(form);

    return {
        first_name: formData.get('first_name')?.trim(),
        last_name: formData.get('last_name')?.trim(),
        email: formData.get('email')?.trim(),
        phone: formData.get('phone')?.trim(),
        school_name: formData.get('school_name')?.trim(),
        subject: formData.get('subject'),
        message: formData.get('message')?.trim(),
        newsletter: formData.get('newsletter') === 'on',
        privacy_accepted: formData.get('privacy') === 'on',
        timestamp: new Date().toISOString()
    };
}

/**
 * שליחת הטופס לשרת
 */
async function submitForm(formData) {
    const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
    });

    if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
    }

    return await response.json();
}

/**
 * טיפול בהצלחת שליחה
 */
function handleSubmissionSuccess() {
    console.log('✅ הודעה נשלחה בהצלחה');

    showFormMessage('הודעתכם נשלחה בהצלחה! נחזור אליכם בהקדם.', 'success');

    // איפוס הטופס
    document.getElementById('contact-form').reset();

    // ניקוי שגיאות
    document.querySelectorAll('.field-error').forEach(error => {
        error.style.display = 'none';
    });

    document.querySelectorAll('.error, .success').forEach(field => {
        field.classList.remove('error', 'success');
    });
}

/**
 * טיפול בשגיאת שליחה
 */
function handleSubmissionError(errorMessage) {
    console.error('❌ שגיאה:', errorMessage);
    showFormMessage(errorMessage, 'error');
}

/**
 * עדכון כפתור השליחה
 */
function updateSubmitButton(isSubmitting) {
    const submitButton = document.querySelector('.submit-button');
    if (!submitButton) return;

    if (isSubmitting) {
        submitButton.disabled = true;
        submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> שולח...';
        submitButton.classList.add('loading');
    } else {
        submitButton.disabled = false;
        submitButton.innerHTML = '<i class="fas fa-paper-plane"></i> שלח הודעה';
        submitButton.classList.remove('loading');
    }
}

/**
 * הצגת הודעות טופס
 */
function showFormMessage(message, type) {
    const messagesContainer = document.getElementById('form-messages');
    const successMessage = document.getElementById('success-message');
    const errorMessage = document.getElementById('error-message');

    if (!messagesContainer || !successMessage || !errorMessage) return;

    // הסתרת כל ההודעות
    messagesContainer.style.display = 'none';
    successMessage.style.display = 'none';
    errorMessage.style.display = 'none';

    // הצגת ההודעה המתאימה
    if (type === 'success') {
        successMessage.querySelector('span').textContent = message;
        successMessage.style.display = 'block';
    } else {
        errorMessage.querySelector('span').textContent = message;
        errorMessage.style.display = 'block';
    }

    messagesContainer.style.display = 'block';

    // גלילה להודעה
    messagesContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });

    // הסתרה אוטומטית
    setTimeout(() => {
        messagesContainer.style.display = 'none';
    }, 8000);
}

// ==================== FAQ HANDLING ====================

/**
 * הגדרת שאלות נפוצות
 */
function setupFAQ() {
    const faqItems = document.querySelectorAll('.faq-item');

    faqItems.forEach(item => {
        const question = item.querySelector('.faq-question');
        const answer = item.querySelector('.faq-answer');
        const toggle = item.querySelector('.faq-toggle');

        if (question && answer && toggle) {
            question.addEventListener('click', () => {
                toggleFAQItem(item, answer, toggle);
            });
        }
    });

    console.log(`❓ הוגדרו ${faqItems.length} שאלות נפוצות`);
}

/**
 * פתיחה/סגירה של שאלה נפוצה
 */
function toggleFAQItem(item, answer, toggle) {
    const isOpen = item.classList.contains('open');

    if (isOpen) {
        // סגירה
        item.classList.remove('open');
        answer.style.maxHeight = '0';
        toggle.textContent = '+';
    } else {
        // פתיחה
        item.classList.add('open');
        answer.style.maxHeight = answer.scrollHeight + 'px';
        toggle.textContent = '−';
    }
}

// ==================== ANIMATIONS ====================

/**
 * אנימציות ראשוניות
 */
function initializeAnimations() {
    // אנימציית כניסה לטופס
    const formSection = document.querySelector('.contact-form-section');
    const infoSection = document.querySelector('.contact-info-section');

    if (formSection) {
        formSection.style.opacity = '0';
        formSection.style.transform = 'translateY(20px)';

        setTimeout(() => {
            formSection.style.transition = 'all 0.6s ease';
            formSection.style.opacity = '1';
            formSection.style.transform = 'translateY(0)';
        }, 100);
    }

    if (infoSection) {
        infoSection.style.opacity = '0';
        infoSection.style.transform = 'translateY(20px)';

        setTimeout(() => {
            infoSection.style.transition = 'all 0.6s ease';
            infoSection.style.opacity = '1';
            infoSection.style.transform = 'translateY(0)';
        }, 200);
    }
}

// ==================== SOCIAL MEDIA & CONTACT HANDLERS ====================

/**
 * הגדרת מאזיני מדיה חברתית וקישורי התקשרות
 */
function setupSocialMediaHandlers() {
    // קישורי מדיה חברתית
    const socialLinks = document.querySelectorAll('.social-link');
    socialLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            if (link.getAttribute('href') === '#') {
                e.preventDefault();
                showNotification('קישור זה יהיה זמין בקרוב', 'info');
            }
        });
    });

    // קישורי התקשרות
    const phoneLinks = document.querySelectorAll('a[href^="tel:"]');
    phoneLinks.forEach(link => {
        link.addEventListener('click', () => {
            console.log('📞 התקשרות:', link.href);
        });
    });

    const emailLinks = document.querySelectorAll('a[href^="mailto:"]');
    emailLinks.forEach(link => {
        link.addEventListener('click', () => {
            console.log('📧 אימייל:', link.href);
        });
    });
}

/**
 * הצגת התראות פשוטות
 */
function showNotification(message, type = 'info') {
    // יצירת התראה פשוטה
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #333;
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        z-index: 9999;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        font-size: 14px;
        max-width: 300px;
    `;

    document.body.appendChild(notification);

    // הסרה אוטומטית
    setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// ==================== UTILITY FUNCTIONS ====================

/**
 * Debounce function פשוטה
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// ==================== DEBUG UTILITIES ====================

if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    window.debugContact = {
        // מילוי טופס לבדיקה
        fillTestData: () => {
            document.getElementById('first-name').value = 'יוסי';
            document.getElementById('last-name').value = 'כהן';
            document.getElementById('email').value = 'yossi@example.com';
            document.getElementById('phone').value = '050-1234567';
            document.getElementById('school-name').value = 'בית ספר לדוגמה';
            document.getElementById('subject').value = 'demo';
            document.getElementById('message').value = 'זוהי הודעת בדיקה למערכת.';
            document.getElementById('privacy').checked = true;
            console.log('🧪 נתוני בדיקה מולאו');
        },

        // סימולציית שליחה
        simulateSubmission: (success = true) => {
            setTimeout(() => {
                if (success) {
                    handleSubmissionSuccess();
                } else {
                    handleSubmissionError('שגיאת בדיקה');
                }
            }, 1000);
        },

        // פתיחת כל השאלות הנפוצות
        openAllFAQ: () => {
            document.querySelectorAll('.faq-item').forEach(item => {
                const answer = item.querySelector('.faq-answer');
                const toggle = item.querySelector('.faq-toggle');
                if (answer && toggle && !item.classList.contains('open')) {
                    toggleFAQItem(item, answer, toggle);
                }
            });
        }
    };

    console.log('🔧 כלי דיבוג זמינים: window.debugContact');
}

// ==================== AUTO INITIALIZATION ====================

document.addEventListener('DOMContentLoaded', function() {
    console.log('📞 Contact.js (Simplified) נטען');
    initializeContact();
    setupSocialMediaHandlers();
});

/**
 * ==================== END OF SIMPLIFIED CONTACT.JS ====================
 *
 * קובץ זה מכיל פונקציונליות בסיסית ונקייה לדף יצירת קשר:
 *
 * 📝 ניהול טופס פשוט עם ולידציה בסיסית
 * ✅ בדיקת תקינות שדות
 * 📤 שליחת הודעות פשוטה
 * ❓ ניהול FAQ בסיסי
 * 🎨 אנימציות פשוטות
 * 🔧 כלי דיבוג בסיסיים
 *
 * הקוד פשוט, קל לתחזוקה ועובד בצורה יעילה
 * כ-300 שורות במקום 700+ שורות
 */