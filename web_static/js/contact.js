/**
 * ==================== CONTACT PAGE JAVASCRIPT ====================
 * קובץ JavaScript ספציפי לדף יצירת קשר
 *
 * מכיל:
 * - ניהול טופס יצירת קשר
 * - ולידציית שדות בזמן אמת
 * - שליחת הודעות ל-API
 * - ניהול שאלות נפוצות (FAQ)
 * - אנימציות ואפקטי UI
 * - אינטגרציה עם מפות (אופציונלי)
 */

// ==================== GLOBAL VARIABLES ====================

// מצב הטופס הנוכחי
let formState = {
    isSubmitting: false,
    isValid: false,
    validatedFields: new Set()
};

// כללי ולידציה
const validationRules = {
    firstName: {
        required: true,
        minLength: 2,
        pattern: /^[א-ת\u0590-\u05FFa-zA-Z\s]+$/
    },
    lastName: {
        required: true,
        minLength: 2,
        pattern: /^[א-ת\u0590-\u05FFa-zA-Z\s]+$/
    },
    email: {
        required: true,
        pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    },
    phone: {
        required: false,
        pattern: /^[0-9\-\+\s\(\)]+$/
    },
    subject: {
        required: true
    },
    message: {
        required: true,
        minLength: 10,
        maxLength: 1000
    },
    privacy: {
        required: true,
        mustBeChecked: true
    }
};

// ==================== INITIALIZATION ====================

/**
 * אתחול דף יצירת קשר
 */
function initializeContact() {
    console.log('📞 מאתחל דף יצירת קשר...');

    // הגדרת מאזיני אירועים
    initializeContactEventListeners();

    // הגדרת ולידציה בזמן אמת
    setupRealTimeValidation();

    // הגדרת FAQ
    setupFAQInteractions();

    // אנימציות ראשוניות
    initializeAnimations();

    // מילוי אוטומטי אם המשתמש מחובר
    populateUserInfo();

    console.log('✅ דף יצירת קשר אותחל בהצלחה');
}

/**
 * הגדרת מאזיני אירועים לדף יצירת קשר
 */
function initializeContactEventListeners() {
    // טופס יצירת קשר
    const contactForm = document.getElementById('contact-form');
    if (contactForm) {
        contactForm.addEventListener('submit', handleFormSubmit);
        contactForm.addEventListener('reset', handleFormReset);
    }

    // כפתורי מדיה חברתית
    setupSocialMediaHandlers();

    // קישורי התקשרות
    setupContactMethodHandlers();

    console.log('🎯 מאזיני אירועים ליצירת קשר הוגדרו');
}

// ==================== FORM VALIDATION ====================

/**
 * הגדרת ולידציה בזמן אמת
 */
function setupRealTimeValidation() {
    const form = document.getElementById('contact-form');
    if (!form) return;

    // מאזינים לכל השדות
    const fields = form.querySelectorAll('input, select, textarea');

    fields.forEach(field => {
        // ולידציה במעבר בין שדות
        field.addEventListener('blur', () => validateField(field));

        // ולידציה בזמן הקלדה (עם debounce)
        field.addEventListener('input', debounce(() => validateField(field), 300));

        // מעקב אחר שינויים
        field.addEventListener('change', () => validateField(field));
    });

    console.log('✅ ולידציה בזמן אמת הוגדרה');
}

/**
 * ולידציה של שדה בודד
 */
function validateField(field) {
    const fieldName = field.name;
    const value = field.value.trim();
    const rules = validationRules[fieldName];

    if (!rules) return true;

    // ניקוי שגיאות קודמות
    clearFieldError(field);

    // בדיקת חובה
    if (rules.required && !value) {
        if (field.type === 'checkbox' && rules.mustBeChecked && !field.checked) {
            showFieldError(field, 'שדה זה הוא חובה');
            return false;
        } else if (field.type !== 'checkbox') {
            showFieldError(field, 'שדה זה הוא חובה');
            return false;
        }
    }

    // בדיקת אורך מינימלי
    if (rules.minLength && value.length < rules.minLength) {
        showFieldError(field, `נדרש לפחות ${rules.minLength} תווים`);
        return false;
    }

    // בדיקת אורך מקסימלי
    if (rules.maxLength && value.length > rules.maxLength) {
        showFieldError(field, `מקסימום ${rules.maxLength} תווים`);
        return false;
    }

    // בדיקת תבנית
    if (rules.pattern && value && !rules.pattern.test(value)) {
        let errorMessage = 'פורמט לא תקין';

        if (fieldName === 'email') {
            errorMessage = 'כתובת אימייל לא תקינה';
        } else if (fieldName === 'phone') {
            errorMessage = 'מספר טלפון לא תקין';
        } else if (fieldName === 'firstName' || fieldName === 'lastName') {
            errorMessage = 'השם יכול להכיל רק אותיות ורווחים';
        }

        showFieldError(field, errorMessage);
        return false;
    }

    // שדה תקין
    showFieldSuccess(field);
    formState.validatedFields.add(fieldName);
    updateFormValidState();

    return true;
}

/**
 * הצגת שגיאה בשדה
 */
function showFieldError(field, message) {
    field.classList.add('error');
    field.classList.remove('success');

    // מציאת או יצירת אלמנט שגיאה
    let errorElement = field.parentNode.querySelector('.field-error');
    if (!errorElement) {
        errorElement = document.createElement('div');
        errorElement.className = 'field-error';
        field.parentNode.appendChild(errorElement);
    }

    errorElement.textContent = message;
    errorElement.style.display = 'block';

    // הסרה מרשימת שדות תקינים
    formState.validatedFields.delete(field.name);
    updateFormValidState();
}

/**
 * הצגת הצלחה בשדה
 */
function showFieldSuccess(field) {
    field.classList.remove('error');
    field.classList.add('success');

    const errorElement = field.parentNode.querySelector('.field-error');
    if (errorElement) {
        errorElement.style.display = 'none';
    }
}

/**
 * ניקוי שגיאה משדה
 */
function clearFieldError(field) {
    field.classList.remove('error', 'success');

    const errorElement = field.parentNode.querySelector('.field-error');
    if (errorElement) {
        errorElement.style.display = 'none';
    }
}

/**
 * עדכון מצב תקינות הטופס
 */
function updateFormValidState() {
    const requiredFields = ['firstName', 'lastName', 'email', 'subject', 'message', 'privacy'];
    const validCount = requiredFields.filter(field => formState.validatedFields.has(field)).length;

    formState.isValid = validCount === requiredFields.length;

    // עדכון כפתור השליחה
    const submitButton = document.querySelector('.submit-button');
    if (submitButton) {
        submitButton.disabled = !formState.isValid || formState.isSubmitting;

        if (formState.isValid) {
            submitButton.classList.add('ready');
        } else {
            submitButton.classList.remove('ready');
        }
    }
}

// ==================== FORM SUBMISSION ====================

/**
 * טיפול בשליחת הטופס
 */
async function handleFormSubmit(event) {
    event.preventDefault();

    console.log('📤 מתחיל שליחת טופס יצירת קשר...');

    // בדיקת תקינות מלאה
    if (!validateForm()) {
        showFormMessage('אנא תקנו את השגיאות בטופס', 'error');
        return;
    }

    // מניעת שליחה כפולה
    if (formState.isSubmitting) {
        return;
    }

    formState.isSubmitting = true;
    updateSubmitButton(true);

    try {
        // איסוף נתוני הטופס
        const formData = collectFormData();

        console.log('📊 נתוני טופס:', formData);

        // שליחה לשרת
        const response = await submitContactForm(formData);

        if (response.success) {
            handleSubmissionSuccess(response);
        } else {
            handleSubmissionError(response.error || 'שגיאה לא ידועה');
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
        first_name: formData.get('first_name'),
        last_name: formData.get('last_name'),
        email: formData.get('email'),
        phone: formData.get('phone'),
        school_name: formData.get('school_name'),
        subject: formData.get('subject'),
        message: formData.get('message'),
        newsletter: formData.get('newsletter') === 'on',
        privacy_accepted: formData.get('privacy') === 'on',
        source: 'contact_form',
        timestamp: new Date().toISOString()
    };
}

/**
 * שליחת הטופס לשרת
 */
async function submitContactForm(formData) {
    const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
    });

    if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
}

/**
 * טיפול בהצלחת שליחה
 */
function handleSubmissionSuccess(response) {
    console.log('✅ הודעה נשלחה בהצלחה');

    // הצגת הודעת הצלחה
    showFormMessage('הודעתכם נשלחה בהצלחה! נחזור אליכם בהקדם.', 'success');

    // איפוס הטופס
    document.getElementById('contact-form').reset();
    formState.validatedFields.clear();
    updateFormValidState();

    // ניקוי כל השגיאות
    document.querySelectorAll('.field-error').forEach(error => {
        error.style.display = 'none';
    });

    document.querySelectorAll('.error, .success').forEach(field => {
        field.classList.remove('error', 'success');
    });

    // אנליטיקס (אם יש)
    if (typeof gtag !== 'undefined') {
        gtag('event', 'contact_form_submit', {
            'event_category': 'Contact',
            'event_label': response.submission_id || 'unknown'
        });
    }
}

/**
 * טיפול בשגיאת שליחה
 */
function handleSubmissionError(errorMessage) {
    console.error('❌ שגיאה בשליחת הודעה:', errorMessage);
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
        submitButton.classList.add('submitting');
    } else {
        submitButton.disabled = !formState.isValid;
        submitButton.innerHTML = '<i class="fas fa-paper-plane"></i> שלח הודעה';
        submitButton.classList.remove('submitting');
    }
}

/**
 * הצגת הודעות טופס
 */
function showFormMessage(message, type) {
    const messagesContainer = document.getElementById('form-messages');
    const successMessage = document.getElementById('success-message');
    const errorMessage = document.getElementById('error-message');

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

    // הסתרה אוטומטית אחרי 10 שניות
    setTimeout(() => {
        messagesContainer.style.display = 'none';
    }, 10000);
}

// ==================== FORM RESET ====================

/**
 * טיפול באיפוס הטופס
 */
function handleFormReset() {
    console.log('🔄 מאפס טופס יצירת קשר');

    // איפוס מצב הטופס
    formState.validatedFields.clear();
    formState.isValid = false;

    // ניקוי כל השגיאות והסגנונות
    document.querySelectorAll('.field-error').forEach(error => {
        error.style.display = 'none';
    });

    document.querySelectorAll('.error, .success').forEach(field => {
        field.classList.remove('error', 'success');
    });

    // הסתרת הודעות
    document.getElementById('form-messages').style.display = 'none';

    // עדכון כפתור השליחה
    updateFormValidState();

    showNotification('הטופס אופס', 'info');
}

// ==================== FAQ INTERACTIONS ====================

/**
 * הגדרת אינטראקציות לשאלות נפוצות
 */
function setupFAQInteractions() {
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

    console.log(`📋 הוגדרו ${faqItems.length} שאלות נפוצות`);
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
        toggle.style.transform = 'rotate(0deg)';
    } else {
        // פתיחה
        item.classList.add('open');
        answer.style.maxHeight = answer.scrollHeight + 'px';
        toggle.textContent = '−';
        toggle.style.transform = 'rotate(180deg)';
    }

    console.log(`❓ FAQ פתוח/סגור: ${isOpen ? 'נסגר' : 'נפתח'}`);
}

// ==================== SOCIAL MEDIA & CONTACT METHODS ====================

/**
 * הגדרת מאזיני מדיה חברתית
 */
function setupSocialMediaHandlers() {
    const socialLinks = document.querySelectorAll('.social-link');

    socialLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            // אם אין href אמיתי, מנע ניווט
            if (link.getAttribute('href') === '#') {
                e.preventDefault();
                showNotification('קישור זה יהיה זמין בקרוב', 'info');
            }

            // אפקט ויזואלי
            link.style.transform = 'scale(0.9)';
            setTimeout(() => {
                link.style.transform = '';
            }, 150);
        });

        // אפקט hover
        link.addEventListener('mouseenter', () => {
            link.style.transform = 'translateY(-3px) scale(1.1)';
        });

        link.addEventListener('mouseleave', () => {
            link.style.transform = '';
        });
    });
}

/**
 * הגדרת מאזיני דרכי התקשרות
 */
function setupContactMethodHandlers() {
    // קישורי טלפון
    const phoneLinks = document.querySelectorAll('a[href^="tel:"]');
    phoneLinks.forEach(link => {
        link.addEventListener('click', () => {
            console.log('📞 התקשר לטלפון:', link.href);
            showNotification('פותח אפליקציית טלפון...', 'info');
        });
    });

    // קישורי אימייל
    const emailLinks = document.querySelectorAll('a[href^="mailto:"]');
    emailLinks.forEach(link => {
        link.addEventListener('click', () => {
            console.log('📧 פותח אימייל:', link.href);
            showNotification('פותח אפליקציית מייל...', 'info');
        });
    });

    // כפתורי מפות
    const mapButtons = document.querySelectorAll('.map-button');
    mapButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            if (button.getAttribute('href') === 'https://goo.gl/maps' || button.getAttribute('href') === 'https://maps.google.com') {
                e.preventDefault();
                showNotification('קישור למפה יהיה זמין בקרוב', 'info');
            }
        });
    });
}

// ==================== USER INFO POPULATION ====================

/**
 * מילוי אוטומטי של מידע משתמש
 */
function populateUserInfo() {
    if (!isUserLoggedIn()) {
        return;
    }

    const user = window.currentUser;
    if (!user) return;

    console.log('👤 ממלא מידע משתמש בטופס יצירת קשר');

    // מילוי שדות קיימים
    if (user.schoolInfo?.school_name) {
        setValue('school-name', user.schoolInfo.school_name);
    }

    if (user.schoolInfo?.school_email) {
        setValue('email', user.schoolInfo.school_email);
    }

    // ולידציה של השדות שמולאו
    document.querySelectorAll('#contact-form input').forEach(field => {
        if (field.value) {
            validateField(field);
        }
    });
}

// ==================== ANIMATIONS ====================

/**
 * אנימציות ראשוניות
 */
function initializeAnimations() {
    // אנימציית כניסה לטופס
    const form = document.querySelector('.contact-form-section');
    if (form) {
        form.style.opacity = '0';
        form.style.transform = 'translateY(30px)';

        setTimeout(() => {
            form.style.transition = 'all 0.8s ease';
            form.style.opacity = '1';
            form.style.transform = 'translateY(0)';
        }, 200);
    }

    // אנימציית כניסה למידע התקשרות
    const contactInfo = document.querySelector('.contact-info-section');
    if (contactInfo) {
        contactInfo.style.opacity = '0';
        contactInfo.style.transform = 'translateY(30px)';

        setTimeout(() => {
            contactInfo.style.transition = 'all 0.8s ease';
            contactInfo.style.opacity = '1';
            contactInfo.style.transform = 'translateY(0)';
        }, 400);
    }

    // אנימציות לכרטיסי דרכי התקשרות
    const contactMethods = document.querySelectorAll('.contact-method');
    contactMethods.forEach((method, index) => {
        method.style.opacity = '0';
        method.style.transform = 'translateX(-20px)';

        setTimeout(() => {
            method.style.transition = 'all 0.6s ease';
            method.style.opacity = '1';
            method.style.transform = 'translateX(0)';
        }, 600 + (index * 100));
    });
}

// ==================== UTILITY FUNCTIONS ====================

/**
 * Debounce function לולידציה
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

/**
 * הגדרת ערך לשדה
 */
function setValue(elementId, value) {
    const element = document.getElementById(elementId);
    if (element && value) {
        element.value = value;
    }
}

// ==================== DEBUG UTILITIES ====================

if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    window.debugContact = {
        // הצגת מצב הטופס
        showFormState: () => {
            console.log('Form State:', formState);
            console.log('Validated Fields:', Array.from(formState.validatedFields));
            return formState;
        },

        // בדיקת ולידציה
        testValidation: () => {
            const form = document.getElementById('contact-form');
            const fields = form.querySelectorAll('input, select, textarea');

            fields.forEach(field => {
                console.log(`${field.name}:`, validateField(field));
            });
        },

        // מילוי טופס לבדיקה
        fillTestData: () => {
            setValue('first-name', 'יוסי');
            setValue('last-name', 'כהן');
            setValue('email', 'yossi@example.com');
            setValue('phone', '050-1234567');
            setValue('school-name', 'בית ספר לדוגמה');

            const subject = document.getElementById('subject');
            if (subject) subject.value = 'demo';

            setValue('message', 'זוהי הודעת בדיקה למערכת יצירת הקשר.');

            const privacy = document.getElementById('privacy');
            if (privacy) privacy.checked = true;

            // ולידציה של כל השדות
            document.querySelectorAll('#contact-form input, #contact-form select, #contact-form textarea').forEach(field => {
                validateField(field);
            });

            console.log('🧪 נתוני בדיקה מולאו');
        },

        // סימולציית שליחה
        simulateSubmission: (success = true) => {
            formState.isSubmitting = true;
            updateSubmitButton(true);

            setTimeout(() => {
                if (success) {
                    handleSubmissionSuccess({ submission_id: 'test_123' });
                } else {
                    handleSubmissionError('זוהי שגיאת בדיקה');
                }
                formState.isSubmitting = false;
                updateSubmitButton(false);
            }, 2000);
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
    console.log('📞 Contact.js נטען');
    initializeContact();
});

/**
 * ==================== END OF CONTACT.JS ====================
 *
 * קובץ זה מכיל את כל הפונקציונליות לדף יצירת קשר:
 *
 * 📝 ניהול טופס מתקדם עם ולידציה בזמן אמת
 * ✅ בדיקת תקינות שדות מקיפה
 * 📤 שליחת הודעות עם feedback מלא
 * ❓ ניהול שאלות נפוצות אינטראקטיבי
 * 🎨 אנימציות ואפקטי UI מתקדמים
 * 📱 ממשק רספונסיבי וידידותי
 * 🔧 כלי דיבוג מתקדמים
 *
 * הטופס תומך בכל דרכי הקלט ומספק חוויית משתמש חלקה
 */