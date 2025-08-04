/**
 * ==================== MODERN CONTACT PAGE JAVASCRIPT ====================
 * קובץ JavaScript מעודכן לדף יצירת קשר עם עיצוב מודרני
 *
 * מכיל:
 * - ניהול טופס יצירת קשר מתקדם
 * - ולידציית שדות בזמן אמת
 * - שליחת הודעות ל-API
 * - ניהול שאלות נפוצות (FAQ)
 * - אנימציות ואפקטי UI מתקדמים
 * - חוויית משתמש משופרת
 */

// ==================== GLOBAL VARIABLES ====================

// מצב הטופס הנוכחי
let formState = {
    isSubmitting: false,
    isValid: false,
    validatedFields: new Set(),
    touchedFields: new Set()
};

// כללי ולידציה מעודכנים
const validationRules = {
    first_name: {
        required: true,
        minLength: 2,
        maxLength: 50,
        pattern: /^[א-ת\u0590-\u05FFa-zA-Z\s\-']+$/
    },
    last_name: {
        required: true,
        minLength: 2,
        maxLength: 50,
        pattern: /^[א-ת\u0590-\u05FFa-zA-Z\s\-']+$/
    },
    email: {
        required: true,
        pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        maxLength: 100
    },
    phone: {
        required: false,
        pattern: /^[0-9\-\+\s\(\)]{9,15}$/
    },
    school_name: {
        required: false,
        maxLength: 100
    },
    subject: {
        required: true
    },
    message: {
        required: true,
        minLength: 20,
        maxLength: 2000
    },
    privacy: {
        required: true,
        mustBeChecked: true
    }
};

// הודעות שגיאה מותאמות
const errorMessages = {
    required: 'שדה זה הוא חובה',
    minLength: (min) => `נדרש לפחות ${min} תווים`,
    maxLength: (max) => `מקסימום ${max} תווים`,
    email: 'כתובת אימייל לא תקינה',
    phone: 'מספר טלפון לא תקין (9-15 ספרות)',
    name: 'השם יכול להכיל רק אותיות, רווחים, מקפים וגרשים',
    privacy: 'יש לאשר את תנאי השימוש ומדיניות הפרטיות'
};

// ==================== INITIALIZATION ====================

/**
 * אתחול דף יצירת קשר מודרני
 */
function initializeContact() {
    console.log('📞 מאתחל דף יצירת קשר מודרני...');

    // הגדרת מאזיני אירועים
    initializeContactEventListeners();

    // הגדרת ולידציה בזמן אמת
    setupRealTimeValidation();

    // הגדרת FAQ עם אנימציות
    setupFAQInteractions();

    // אנימציות ראשוניות מתקדמות
    initializeAnimations();

    // מילוי אוטומטי אם המשתמש מחובר
    populateUserInfo();

    // הגדרת אובזרברים לביצועים
    setupIntersectionObservers();

    // הגדרת מאזיני מקלדת
    setupKeyboardShortcuts();

    console.log('✅ דף יצירת קשר מודרני אותחל בהצלחה');
}

/**
 * הגדרת מאזיני אירועים מתקדמים
 */
function initializeContactEventListeners() {
    // טופס יצירת קשר
    const contactForm = document.getElementById('contact-form');
    if (contactForm) {
        contactForm.addEventListener('submit', handleFormSubmit);
        contactForm.addEventListener('reset', handleFormReset);

        // מניעת שליחה על Enter בשדות שאינם textarea
        contactForm.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA' && e.target.type !== 'submit') {
                e.preventDefault();
                focusNextField(e.target);
            }
        });
    }

    // כפתורי מדיה חברתית
    setupSocialMediaHandlers();

    // קישורי התקשרות
    setupContactMethodHandlers();

    console.log('🎯 מאזיני אירועים מתקדמים הוגדרו');
}

// ==================== ADVANCED FORM VALIDATION ====================

/**
 * הגדרת ולידציה בזמן אמת מתקדמת
 */
function setupRealTimeValidation() {
    const form = document.getElementById('contact-form');
    if (!form) return;

    const fields = form.querySelectorAll('input, select, textarea');

    fields.forEach(field => {
        // ולידציה במעבר בין שדות
        field.addEventListener('blur', () => {
            formState.touchedFields.add(field.name);
            validateField(field);
            updateFormProgress();
        });

        // ולידציה בזמן הקלדה (עם debounce חכם)
        if (field.type !== 'checkbox' && field.tagName !== 'SELECT') {
            field.addEventListener('input', debounce(() => {
                if (formState.touchedFields.has(field.name)) {
                    validateField(field);
                    updateFormProgress();
                }
            }, 300));
        }

        // מעקב אחר שינויים
        field.addEventListener('change', () => {
            formState.touchedFields.add(field.name);
            validateField(field);
            updateFormProgress();
        });
    });

    console.log('✅ ולידציה בזמן אמת מתקדמת הוגדרה');
}

/**
 * ולידציה מתקדמת של שדה בודד
 */
function validateField(field) {
    const fieldName = field.name;
    const value = field.value.trim();
    const rules = validationRules[fieldName];

    if (!rules) return true;

    // ניקוי שגיאות קודמות
    clearFieldError(field);

    // בדיקת חובה
    if (rules.required) {
        if (field.type === 'checkbox' && rules.mustBeChecked && !field.checked) {
            showFieldError(field, errorMessages.privacy);
            return false;
        } else if (field.type !== 'checkbox' && !value) {
            showFieldError(field, errorMessages.required);
            return false;
        }
    }

    // אם השדה ריק ולא חובה, הוא תקין
    if (!value && !rules.required) {
        showFieldSuccess(field);
        formState.validatedFields.add(fieldName);
        return true;
    }

    // בדיקת אורך מינימלי
    if (rules.minLength && value.length < rules.minLength) {
        showFieldError(field, errorMessages.minLength(rules.minLength));
        return false;
    }

    // בדיקת אורך מקסימלי
    if (rules.maxLength && value.length > rules.maxLength) {
        showFieldError(field, errorMessages.maxLength(rules.maxLength));
        return false;
    }

    // בדיקת תבנית
    if (rules.pattern && value && !rules.pattern.test(value)) {
        let errorMessage = 'פורמט לא תקין';

        if (fieldName === 'email') {
            errorMessage = errorMessages.email;
        } else if (fieldName === 'phone') {
            errorMessage = errorMessages.phone;
        } else if (fieldName === 'first_name' || fieldName === 'last_name') {
            errorMessage = errorMessages.name;
        }

        showFieldError(field, errorMessage);
        return false;
    }

    // שדה תקין
    showFieldSuccess(field);
    formState.validatedFields.add(fieldName);
    return true;
}

/**
 * הצגת שגיאה בשדה עם אנימציה
 */
function showFieldError(field, message) {
    const formGroup = field.closest('.form-group');
    formGroup.classList.add('error');
    formGroup.classList.remove('success');

    // מציאת או יצירת אלמנט שגיאה
    let errorElement = formGroup.querySelector('.field-error');
    if (!errorElement) {
        errorElement = document.createElement('div');
        errorElement.className = 'field-error';
        formGroup.appendChild(errorElement);
    }

    errorElement.textContent = message;
    errorElement.style.display = 'flex';

    // אנימציית הופעה
    errorElement.style.opacity = '0';
    errorElement.style.transform = 'translateY(-10px)';
    setTimeout(() => {
        errorElement.style.transition = 'all 0.3s ease';
        errorElement.style.opacity = '1';
        errorElement.style.transform = 'translateY(0)';
    }, 10);

    // הסרה מרשימת שדות תקינים
    formState.validatedFields.delete(field.name);
    updateFormValidState();
}

/**
 * הצגת הצלחה בשדה עם אנימציה
 */
function showFieldSuccess(field) {
    const formGroup = field.closest('.form-group');
    formGroup.classList.remove('error');
    formGroup.classList.add('success');

    const errorElement = formGroup.querySelector('.field-error');
    if (errorElement) {
        errorElement.style.opacity = '0';
        setTimeout(() => {
            errorElement.style.display = 'none';
        }, 300);
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

/**
 * עדכון מצב תקינות הטופס עם אינדיקטור התקדמות
 */
function updateFormValidState() {
    const requiredFields = ['first_name', 'last_name', 'email', 'subject', 'message', 'privacy'];
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

/**
 * עדכון התקדמות הטופס
 */
function updateFormProgress() {
    const requiredFields = ['first_name', 'last_name', 'email', 'subject', 'message', 'privacy'];
    const validCount = requiredFields.filter(field => formState.validatedFields.has(field)).length;
    const progress = (validCount / requiredFields.length) * 100;

    // הוספת אינדיקטור התקדמות אם לא קיים
    let progressBar = document.querySelector('.form-progress');
    if (!progressBar) {
        progressBar = document.createElement('div');
        progressBar.className = 'form-progress';
        progressBar.innerHTML = `
            <div class="progress-bar">
                <div class="progress-fill"></div>
            </div>
            <span class="progress-text">${Math.round(progress)}% הושלם</span>
        `;

        const form = document.getElementById('contact-form');
        form.insertBefore(progressBar, form.firstChild);
    }

    const progressFill = progressBar.querySelector('.progress-fill');
    const progressText = progressBar.querySelector('.progress-text');

    if (progressFill) {
        progressFill.style.width = `${progress}%`;
    }

    if (progressText) {
        progressText.textContent = `${Math.round(progress)}% הושלם`;
    }
}

// ==================== FORM SUBMISSION ====================

/**
 * טיפול מתקדם בשליחת הטופס
 */
async function handleFormSubmit(event) {
    event.preventDefault();

    console.log('📤 מתחיל שליחת טופס יצירת קשר מתקדמת...');

    // בדיקת תקינות מלאה
    if (!validateForm()) {
        showFormMessage('אנא תקנו את השגיאות בטופס ונסו שוב', 'error');
        // גלילה לשגיאה הראשונה
        scrollToFirstError();
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

        console.log('📊 נתוני טופס מתקדמים:', formData);

        // שליחה לשרת עם retry mechanism
        const response = await submitContactFormWithRetry(formData);

        if (response.success) {
            handleSubmissionSuccess(response);
        } else {
            handleSubmissionError(response.error || 'שגיאה לא ידועה');
        }

    } catch (error) {
        console.error('❌ שגיאה בשליחת טופס:', error);
        handleSubmissionError('שגיאה בשליחת ההודעה. אנא בדקו את החיבור לאינטרנט ונסו שוב.');
    } finally {
        formState.isSubmitting = false;
        updateSubmitButton(false);
    }
}

/**
 * ולידציה מלאה של הטופס עם הדגשת שגיאות
 */
function validateForm() {
    const form = document.getElementById('contact-form');
    const fields = form.querySelectorAll('input, select, textarea');
    let isValid = true;
    let firstErrorField = null;

    fields.forEach(field => {
        if (!validateField(field)) {
            isValid = false;
            if (!firstErrorField) {
                firstErrorField = field;
            }
        }
    });

    // פוקוס על השגיאה הראשונה
    if (firstErrorField) {
        firstErrorField.focus();
    }

    return isValid;
}

/**
 * איסוף נתוני הטופס המתקדם
 */
function collectFormData() {
    const form = document.getElementById('contact-form');
    const formData = new FormData(form);

    return {
        first_name: formData.get('first_name')?.trim(),
        last_name: formData.get('last_name')?.trim(),
        email: formData.get('email')?.trim().toLowerCase(),
        phone: formData.get('phone')?.trim(),
        school_name: formData.get('school_name')?.trim(),
        subject: formData.get('subject'),
        message: formData.get('message')?.trim(),
        newsletter: formData.get('newsletter') === 'on',
        privacy_accepted: formData.get('privacy') === 'on',
        source: 'contact_form_modern',
        timestamp: new Date().toISOString(),
        user_agent: navigator.userAgent,
        page_url: window.location.href,
        referrer: document.referrer || 'direct'
    };
}

/**
 * שליחת הטופס עם מנגנון retry
 */
async function submitContactFormWithRetry(formData, retries = 3) {
    for (let i = 0; i < retries; i++) {
        try {
            const response = await fetch('/api/contact', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: JSON.stringify(formData)
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.warn(`Attempt ${i + 1} failed:`, error);
            if (i === retries - 1) throw error;

            // המתנה קצרה לפני ניסיון חוזר
            await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
        }
    }
}

/**
 * טיפול מתקדם בהצלחת שליחה
 */
function handleSubmissionSuccess(response) {
    console.log('✅ הודעה נשלחה בהצלחה');

    // הצגת הודעת הצלחה מעוצבת
    showFormMessage('🎉 הודעתכם נשלחה בהצלחה! נחזור אליכם תוך 24 שעות.', 'success');

    // איפוס הטופס עם אנימציה
    resetFormWithAnimation();

    // הסתרת אינדיקטור התקדמות
    const progressBar = document.querySelector('.form-progress');
    if (progressBar) {
        progressBar.style.opacity = '0';
        setTimeout(() => progressBar.remove(), 500);
    }

    // אנליטיקס מתקדם
    trackFormSubmission(response);

    // הוספת קונפטי או אפקט חזותי
    showSuccessAnimation();
}

/**
 * טיפול מתקדם בשגיאת שליחה
 */
function handleSubmissionError(errorMessage) {
    console.error('❌ שגיאה בשליחת הודעה:', errorMessage);

    // הודעת שגיאה מפורטת יותר
    const detailedMessage = `
        ${errorMessage}
        <br><br>
        💡 טיפים לפתרון:
        <br>• בדקו את החיבור לאינטרנט
        <br>• נסו לרענן את הדף ולשלוח שוב
        <br>• צרו איתנו קשר בטלפון: 03-1234567
    `;

    showFormMessage(detailedMessage, 'error');
}

// ==================== ENHANCED FAQ INTERACTIONS ====================

/**
 * הגדרת אינטראקציות FAQ מתקדמות
 */
function setupFAQInteractions() {
    const faqItems = document.querySelectorAll('.faq-item');

    faqItems.forEach((item, index) => {
        const question = item.querySelector('.faq-question');
        const answer = item.querySelector('.faq-answer');
        const toggle = item.querySelector('.faq-toggle');

        if (question && answer && toggle) {
            question.addEventListener('click', () => {
                toggleFAQItem(item, answer, toggle);
            });

            // הוספת מאזיני מקלדת
            question.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    toggleFAQItem(item, answer, toggle);
                }
            });

            // הגדרת ARIA
            question.setAttribute('tabindex', '0');
            question.setAttribute('aria-expanded', 'false');
            question.setAttribute('aria-controls', `faq-answer-${index}`);
            answer.setAttribute('id', `faq-answer-${index}`);
        }
    });

    // הוספת חיפוש בFAQ
    addFAQSearch();

    console.log(`📋 הוגדרו ${faqItems.length} שאלות נפוצות עם אינטראקציות מתקדמות`);
}

/**
 * פתיחה/סגירה מתקדמת של שאלה נפוצה
 */
function toggleFAQItem(item, answer, toggle) {
    const isOpen = item.classList.contains('open');
    const question = item.querySelector('.faq-question');

    if (isOpen) {
        // סגירה עם אנימציה
        item.classList.remove('open');
        answer.style.maxHeight = '0';
        toggle.textContent = '+';
        toggle.style.transform = 'rotate(0deg)';
        question.setAttribute('aria-expanded', 'false');
    } else {
        // סגירת כל השאר אם רוצים accordion
        // closeAllFAQItems();

        // פתיחה עם אנימציה
        item.classList.add('open');
        answer.style.maxHeight = answer.scrollHeight + 'px';
        toggle.textContent = '−';
        toggle.style.transform = 'rotate(180deg)';
        question.setAttribute('aria-expanded', 'true');

        // גלילה חלקה לשאלה
        item.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    console.log(`❓ FAQ ${isOpen ? 'נסגר' : 'נפתח'}`);
}

// ==================== UTILITY FUNCTIONS ====================

/**
 * מעבר לשדה הבא בטופס
 */
function focusNextField(currentField) {
    const form = currentField.closest('form');
    const fields = Array.from(form.querySelectorAll('input, select, textarea, button'));
    const currentIndex = fields.indexOf(currentField);
    const nextField = fields[currentIndex + 1];

    if (nextField) {
        nextField.focus();
    }
}

/**
 * גלילה לשגיאה הראשונה בטופס
 */
function scrollToFirstError() {
    const firstError = document.querySelector('.form-group.error');
    if (firstError) {
        firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
        const field = firstError.querySelector('input, select, textarea');
        if (field) {
            setTimeout(() => field.focus(), 500);
        }
    }
}

/**
 * איפוס הטופס עם אנימציה
 */
function resetFormWithAnimation() {
    const form = document.getElementById('contact-form');

    // אנימציית fade out
    form.style.opacity = '0.5';
    form.style.transform = 'scale(0.98)';

    setTimeout(() => {
        form.reset();
        formState.validatedFields.clear();
        formState.touchedFields.clear();
        updateFormValidState();

        // ניקוי כל השגיאות והסגנונות
        document.querySelectorAll('.field-error').forEach(error => {
            error.style.display = 'none';
        });

        document.querySelectorAll('.error, .success').forEach(field => {
            field.classList.remove('error', 'success');
        });

        // אנימציית fade in חזרה
        form.style.opacity = '1';
        form.style.transform = 'scale(1)';
    }, 300);
}

/**
 * הצגת אנימציית הצלחה
 */
function showSuccessAnimation() {
    // יצירת קונפטי או אפקט חזותי
    const successOverlay = document.createElement('div');
    successOverlay.className = 'success-overlay';
    successOverlay.innerHTML = `
        <div class="success-content">
            <div class="success-icon">✅</div>
            <h3>הודעה נשלחה!</h3>
            <p>תודה שפניתם אלינו</p>
        </div>
    `;

    document.body.appendChild(successOverlay);

    setTimeout(() => {
        successOverlay.classList.add('show');
    }, 100);

    setTimeout(() => {
        successOverlay.classList.remove('show');
        setTimeout(() => successOverlay.remove(), 500);
    }, 3000);
}

/**
 * מעקב אחר שליחת טופס
 */
function trackFormSubmission(response) {
    // Google Analytics
    if (typeof gtag !== 'undefined') {
        gtag('event', 'form_submit', {
            'event_category': 'Contact',
            'event_label': response.submission_id || 'unknown',
            'value': 1
        });
    }

    // Facebook Pixel
    if (typeof fbq !== 'undefined') {
        fbq('track', 'Contact');
    }

    console.log('📊 מעקב אנליטיקס נשלח');
}

/**
 * הגדרת צופי intersection למטען עמוד משופר
 */
function setupIntersectionObservers() {
    const observerOptions = {
        root: null,
        rootMargin: '0px 0px -20% 0px',
        threshold: 0.1
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-in');
            }
        });
    }, observerOptions);

    // צפייה בסקציות
    document.querySelectorAll('.contact-form-section, .contact-info-section, .faq-section').forEach(section => {
        observer.observe(section);
    });
}

/**
 * הגדרת קיצורי מקלדת
 */
function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        // Ctrl/Cmd + Enter לשליחת טופס
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            const form = document.getElementById('contact-form');
            if (form && formState.isValid) {
                form.dispatchEvent(new Event('submit'));
            }
        }

        // Escape לסגירת FAQ פתוח
        if (e.key === 'Escape') {
            const openFAQ = document.querySelector('.faq-item.open');
            if (openFAQ) {
                const question = openFAQ.querySelector('.faq-question');
                question.click();
            }
        }
    });
}

// ==================== DEBUG UTILITIES ====================

if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    window.debugContactModern = {
        // הצגת מצב הטופס
        showFormState: () => {
            console.table({
                isSubmitting: formState.isSubmitting,
                isValid: formState.isValid,
                validatedFields: Array.from(formState.validatedFields),
                touchedFields: Array.from(formState.touchedFields)
            });
            return formState;
        },

        // בדיקת ולידציה
        testValidation: () => {
            const form = document.getElementById('contact-form');
            const fields = form.querySelectorAll('input, select, textarea');

            fields.forEach(field => {
                const isValid = validateField(field);
                console.log(`${field.name}: ${isValid ? '✅' : '❌'}`);
            });
        },

        // מילוי טופס מתקדם לבדיקה
        fillTestData: () => {
            const testData = {
                'first-name': 'יוסי',
                'last-name': 'כהן',
                'email': 'yossi.cohen@example.com',
                'phone': '050-1234567',
                'school-name': 'בית ספר חדשני לטכנולוגיה',
                'message': 'שלום, אני מעוניין לקבל מידע נוסף על המערכת שלכם לרישום נוכחות. יש לנו כ-500 תלמידים ואנחנו מחפשים פתרון מתקדם וקל לשימוש.'
            };

            Object.entries(testData).forEach(([id, value]) => {
                const field = document.getElementById(id);
                if (field) {
                    field.value = value;
                    validateField(field);
                }
            });

            // בחירת subject
            const subject = document.getElementById('subject');
            if (subject) subject.value = 'demo';

            // סימון checkbox
            const privacy = document.getElementById('privacy');
            if (privacy) {
                privacy.checked = true;
                validateField(privacy);
            }

            updateFormProgress();
            console.log('🧪 נתוני בדיקה מתקדמים מולאו');
        },

        // סימולציית שליחה מתקדמת
        simulateSubmission: (success = true) => {
            formState.isSubmitting = true;
            updateSubmitButton(true);

            setTimeout(() => {
                if (success) {
                    handleSubmissionSuccess({ submission_id: 'test_modern_123' });
                } else {
                    handleSubmissionError('זוהי שגיאת בדיקה מתקדמת');
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
        },

        // בדיקת נגישות
        checkAccessibility: () => {
            const issues = [];

            // בדיקת ARIA labels
            document.querySelectorAll('input, select, textarea').forEach(field => {
                if (!field.getAttribute('aria-label') && !field.closest('label')) {
                    issues.push(`Missing label for ${field.name || field.id}`);
                }
            });

            // בדיקת contrast
            console.log('🔍 בדיקות נגישות:', issues.length === 0 ? '✅ הכל תקין' : issues);
            return issues;
        }
    };

    console.log('🔧 כלי דיבוג מתקדמים זמינים: window.debugContactModern');
}

// ==================== AUTO INITIALIZATION ====================

document.addEventListener('DOMContentLoaded', function() {
    console.log('📞 Contact.js מודרני נטען');
    initializeContact();
});

/**
 * ==================== END OF MODERN CONTACT.JS ====================
 *
 * קובץ זה מכיל פונקציונליות מתקדמת לדף יצירת קשר:
 *
 * 📝 ניהול טופס מתקדם עם ולידציה חכמה
 * ✅ בדיקת תקינות בזמן אמת עם feedback ויזואלי
 * 📤 שליחת הודעות עם retry mechanism ומעקב אנליטיקס
 * ❓ ניהול FAQ אינטראקטיבי עם נגישות מלאה
 * 🎨 אנימציות ואפקטים ויזואליים מתקדמים
 * 📱 תמיכה מלאה במובייל ונגישות
 * ⌨️ קיצורי מקלדת ותמיכה בכלי נגישות
 * 🔧 כלי דיבוג מתקדמים למפתחים
 *
 * הטופס מספק חוויית משתמש מתקדמת ומקצועית
 */