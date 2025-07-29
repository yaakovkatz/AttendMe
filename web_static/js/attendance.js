/**
 * ==================== ATTENDANCE MANAGEMENT JAVASCRIPT ====================
 * קובץ JavaScript ספציפי לדף נוכחות ודוחות
 *
 * מכיל:
 * - בדיקת נוכחות כללית וספציפית
 * - דוחות נוכחות וסטטיסטיקות
 * - ייצוא נתונים
 * - ניהול תוצאות בדיקות
 *
 * ⚠️ דרישה: הקובץ מצפה לפונקציה getCurrentSchoolIndex() שמחזירה את מזהה בית הספר
 */

// ==================== GLOBAL VARIABLES ====================

// נתוני נוכחות
let attendanceData = [];

// נתוני אנשים לבחירה
let peopleForSelection = [];

// אדם נבחר לבדיקה ספציפית
let selectedPersonId = null;

// מצב בדיקה פעילה
let isCheckingAttendance = false;

// ==================== HELPER FUNCTIONS FOR SCHOOL INDEX ====================

/**
 * קבלת מזהה בית הספר הנוכחי
 * @returns {number} מזהה בית הספר
 */
function getCurrentSchoolIndex() {
    return window.currentUser?.schoolInfo?.school_index ?? 0;
}

// ==================== INITIALIZATION ====================

/**
 * אתחול דף נוכחות
 */
async function initializeAttendance() {
    console.log('📊 מאתחל דף נוכחות...');

    // בדיקת התחברות
    if (!isUserLoggedIn()) {
        console.log('🔒 משתמש לא מחובר - מפנה להתחברות');
        showNotification('נדרשת התחברות לגישה לדף זה', 'warning');
        setTimeout(() => window.location.href = '/login', 1500);
        return;
    }

    // הגדרת מאזיני אירועים
    initializeAttendanceEventListeners();

    // הגדרת תאריך נוכחי
    setCurrentDate('attendance-date');

    // טעינת נתונים ראשוניים
    const serverOk = await checkServerConnection();
    if (serverOk) {
        await loadAttendanceData();
        await loadPeopleForSelection();
    }

    console.log('✅ דף נוכחות אותחל בהצלחה');
}

/**
 * הגדרת מאזיני אירועים לדף נוכחות
 */
function initializeAttendanceEventListeners() {
    // כפתור רענון נוכחות
    const refreshBtn = document.getElementById('refresh-attendance');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', handleRefreshAttendance);
    }

    // כפתור ייצוא
    const exportBtn = document.getElementById('export-attendance');
    if (exportBtn) {
        exportBtn.addEventListener('click', handleExportAttendance);
    }

    // שינוי תאריך
    const dateInput = document.getElementById('attendance-date');
    if (dateInput) {
        dateInput.addEventListener('change', handleDateChange);
    }

    // כפתור בדיקת נוכחות כללית
    const checkAllBtn = document.getElementById('check-all-people');
    if (checkAllBtn) {
        checkAllBtn.addEventListener('click', handleCheckAllPeople);
    }

    // כפתור בדיקת נוכחות ספציפית
    const checkSpecificBtn = document.getElementById('check-specific-person');
    if (checkSpecificBtn) {
        checkSpecificBtn.addEventListener('click', handleCheckSpecificPerson);
    }

    // כפתור בדיקת נוכחות לאדם נבחר
    const checkPersonBtn = document.getElementById('check-person-attendance');
    if (checkPersonBtn) {
        checkPersonBtn.addEventListener('click', handleCheckSelectedPerson);
    }

    // כפתור ביטול בדיקה
    const cancelBtn = document.getElementById('cancel-attendance-check');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', handleCancelCheck);
    }

    // כפתור סגירת תוצאות
    const closeResultsBtn = document.getElementById('close-results');
    if (closeResultsBtn) {
        closeResultsBtn.addEventListener('click', () => {
            document.getElementById('results-panel').style.display = 'none';
        });
    }

    // כפתור נסה שוב בטעינת אנשים
    const retryBtn = document.getElementById('retry-load-people');
    if (retryBtn) {
        retryBtn.addEventListener('click', loadPeopleForSelection);
    }

    console.log('🎯 מאזיני אירועים לנוכחות הוגדרו');
}

// ==================== DATA LOADING ====================

/**
 * טעינת נתוני נוכחות
 */
async function loadAttendanceData() {
    console.log('📊 טוען נתוני נוכחות...');

    try {
        const schoolIndex = getCurrentSchoolIndex();
        const selectedDate = document.getElementById('attendance-date').value;

        // בניית URL עם פרמטרים
        const params = new URLSearchParams({
            school_index: schoolIndex
        });

        if (selectedDate) {
            params.append('date', selectedDate);
        }

        const response = await fetch(`/api/get_loaded_people?${params}`);
        const data = await response.json();

        if (!handleApiResponse(response, data)) {
            return;
        }

        if (data.success && data.people) {
            attendanceData = data.people.map(person => ({
                id_number: person.id_number,
                first_name: person.first_name,
                last_name: person.last_name,
                is_present: person.is_present || false,
                check_time: person.check_time || null,
                image_urls: person.image_urls || []
            }));

            console.log('✅ נטענו נתוני נוכחות:', attendanceData);
            renderAttendanceTable();
            updateAttendanceStats();
        } else {
            attendanceData = [];
            renderAttendanceTable();
            updateAttendanceStats();
        }

    } catch (error) {
        console.error('❌ שגיאה בטעינת נתוני נוכחות:', error);
        showNotification('שגיאה בטעינת נתוני נוכחות', 'error');
    }
}

/**
 * טעינת אנשים לבחירה בבדיקה ספציפית
 */
async function loadPeopleForSelection() {
    console.log('👥 טוען אנשים לבחירה...');

    const loadingStatus = document.getElementById('people-loading-status');
    const peopleGrid = document.getElementById('people-grid');
    const errorDiv = document.getElementById('people-error');

    // הצגת loading
    if (loadingStatus) loadingStatus.style.display = 'block';
    if (peopleGrid) peopleGrid.style.display = 'none';
    if (errorDiv) errorDiv.style.display = 'none';

    try {
        const schoolIndex = getCurrentSchoolIndex();
        const response = await fetch(`/api/get_loaded_people?school_index=${schoolIndex}`);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();

        if (data.success && data.people) {
            peopleForSelection = data.people;
            renderPeopleGrid();

            // הסתרת loading והצגת grid
            if (loadingStatus) loadingStatus.style.display = 'none';
            if (peopleGrid) peopleGrid.style.display = 'grid';

            console.log(`✅ נטענו ${peopleForSelection.length} אנשים לבחירה`);
        } else {
            throw new Error(data.error || 'אין אנשים במערכת');
        }

    } catch (error) {
        console.error('❌ שגיאה בטעינת אנשים:', error);

        // הצגת שגיאה
        if (loadingStatus) loadingStatus.style.display = 'none';
        if (errorDiv) {
            errorDiv.style.display = 'block';
            const errorText = errorDiv.querySelector('span');
            if (errorText) {
                errorText.textContent = `שגיאה: ${error.message}`;
            }
        }

        showNotification('שגיאה בטעינת רשימת אנשים', 'error');
    }
}

// ==================== RENDERING ====================

/**
 * רינדור טבלת נוכחות
 */
function renderAttendanceTable() {
    const tableBody = document.getElementById('attendance-table-body');
    if (!tableBody) return;

    tableBody.innerHTML = '';

    if (attendanceData.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center; padding: 20px; color: #666;">
                    אין נתוני נוכחות זמינים
                </td>
            </tr>
        `;
        return;
    }

    attendanceData.forEach(person => {
        const row = document.createElement('tr');

        // תמונה
        let imageUrl = '/web_static/img/person-placeholder.jpg';
        if (person.image_urls && person.image_urls.length > 0) {
            imageUrl = person.image_urls[0];
        }

        // סטטוס נוכחות
        const statusClass = person.is_present ? 'status-present' : 'status-absent';
        const statusText = person.is_present ? 'נוכח' : 'נעדר';

        // זמן בדיקה
        const checkTime = person.check_time ?
            formatHebrewTime(person.check_time) :
            (person.is_present ? 'לא זמין' : '--');

        row.innerHTML = `
            <td>
                <img src="${imageUrl}" alt="${person.first_name}" class="person-image">
            </td>
            <td>${person.first_name} ${person.last_name}</td>
            <td>${person.id_number}</td>
            <td><span class="person-status ${statusClass}">${statusText}</span></td>
            <td>${checkTime}</td>
        `;

        tableBody.appendChild(row);
    });

    console.log(`✅ הוצגו ${attendanceData.length} רשומות נוכחות`);
}

/**
 * רינדור רשת אנשים לבחירה
 */
function renderPeopleGrid() {
    const grid = document.getElementById('people-grid');
    if (!grid) return;

    grid.innerHTML = '';

    peopleForSelection.forEach(person => {
        const personCard = document.createElement('div');
        personCard.className = 'person-card';
        personCard.setAttribute('data-id', person.id_number);

        // תמונה
        let imageUrl = '/web_static/img/person-placeholder.jpg';
        if (person.image_urls && person.image_urls.length > 0) {
            imageUrl = person.image_urls[0];
        }

        personCard.innerHTML = `
            <div class="person-image-container">
                <img src="${imageUrl}" alt="${person.first_name}">
                <div class="person-overlay">
                    <i class="fas fa-check"></i>
                </div>
            </div>
            <div class="person-info">
                <div class="person-name">${person.first_name} ${person.last_name}</div>
                <div class="person-id">ת.ז: ${person.id_number}</div>
            </div>
        `;

        // הוספת מאזין לחיצה
        personCard.addEventListener('click', () => selectPerson(person.id_number));

        grid.appendChild(personCard);
    });

    console.log(`✅ הוצגו ${peopleForSelection.length} אנשים לבחירה`);
}

// ==================== ATTENDANCE CHECKING ====================

/**
 * טיפול בבדיקת נוכחות כללית
 */
async function handleCheckAllPeople() {
    if (!requireLogin('בדיקת נוכחות כללית')) return;

    if (isCheckingAttendance) {
        showNotification('בדיקת נוכחות כבר פעילה', 'warning');
        return;
    }

    console.log('🚀 מתחיל בדיקת נוכחות כללית');

    // בדיקה שיש תמונות מטרה
    const hasTargets = await checkTargetImages();
    if (!hasTargets) return;

    // בדיקה שיש אנשים במערכת
    if (attendanceData.length === 0) {
        showNotification('אין אנשים רשומים במערכת', 'warning');
        return;
    }

    isCheckingAttendance = true;
    showNotification('מתחיל בדיקת נוכחות כללית...', 'info');

    try {
        const schoolIndex = getCurrentSchoolIndex();

        // שלב 1: חילוץ פנים
        showNotification('שלב 1: מחלץ פנים מתמונות מטרה...', 'info');

        const extractResponse = await fetch('/api/face-recognition/extract-faces', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ school_index: schoolIndex })
        });

        const extractData = await extractResponse.json();
        if (!extractData.success) {
            throw new Error(extractData.error || 'שגיאה בחילוץ פנים');
        }

        console.log(`✅ חילוץ פנים הצליח: ${extractData.faces_extracted} פנים`);

        // שלב 2: בדיקת נוכחות
        showNotification('שלב 2: בודק נוכחות עבור כל האנשים...', 'info');

        const attendanceResponse = await fetch('/api/attendance/check-all', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ school_index: schoolIndex })
        });

        const attendanceResult = await attendanceResponse.json();

        if (attendanceResult.success) {
            const message = `🎉 בדיקת נוכחות הושלמה!\n` +
                           `✅ נוכחים: ${attendanceResult.present_people}\n` +
                           `❌ נעדרים: ${attendanceResult.absent_people}\n` +
                           `📊 סה"כ נבדקו: ${attendanceResult.checked_people} אנשים`;

            showNotification(message, 'success');

            // רענון נתונים
            showNotification('מעדכן נתונים...', 'info');
            await new Promise(resolve => setTimeout(resolve, 1000));
            await loadAttendanceData();

        } else {
            throw new Error(attendanceResult.error || 'שגיאה בבדיקת נוכחות');
        }

    } catch (error) {
        console.error('❌ שגיאה בבדיקת נוכחות כללית:', error);
        showNotification(`שגיאה: ${error.message}`, 'error');
    } finally {
        isCheckingAttendance = false;
    }
}

/**
 * טיפול בבדיקת נוכחות ספציפית
 */
function handleCheckSpecificPerson() {
    if (!requireLogin('בדיקת נוכחות ספציפית')) return;

    const selectorSection = document.getElementById('person-selector-section');
    if (selectorSection) {
        selectorSection.style.display = selectorSection.style.display === 'none' ? 'block' : 'none';

        if (selectorSection.style.display === 'block') {
            loadPeopleForSelection();
        }
    }
}

/**
 * בחירת אדם לבדיקה ספציפית
 */
function selectPerson(personId) {
    // הסרת בחירה קודמת
    document.querySelectorAll('.person-card.selected').forEach(card => {
        card.classList.remove('selected');
    });

    // הוספת בחירה חדשה
    const selectedCard = document.querySelector(`[data-id="${personId}"]`);
    if (selectedCard) {
        selectedCard.classList.add('selected');
        selectedPersonId = personId;

        // הפעלת כפתור בדיקה
        const checkBtn = document.getElementById('check-person-attendance');
        if (checkBtn) {
            checkBtn.disabled = false;
        }

        console.log('👤 נבחר אדם:', personId);
    }
}

/**
 * בדיקת נוכחות לאדם נבחר
 */
async function handleCheckSelectedPerson() {
    if (!selectedPersonId) {
        showNotification('נא לבחור אדם תחילה', 'warning');
        return;
    }

    if (isCheckingAttendance) {
        showNotification('בדיקה כבר פעילה', 'warning');
        return;
    }

    const person = peopleForSelection.find(p => p.id_number === selectedPersonId);
    if (!person) return;

    console.log('🔍 מתחיל בדיקת נוכחות לאדם:', person.first_name, person.last_name);

    // בדיקה שיש תמונות מטרה
    const hasTargets = await checkTargetImages();
    if (!hasTargets) return;

    isCheckingAttendance = true;
    showResultsArea(true);
    updateResultsProgress('מתחיל בדיקה...', 0);

    try {
        const schoolIndex = getCurrentSchoolIndex();

        // שלב 1: חילוץ פנים
        updateResultsProgress('מחלץ פנים מתמונות מטרה...', 25);

        const extractResponse = await fetch('/api/face-recognition/extract-faces', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ school_index: schoolIndex })
        });

        const extractData = await extractResponse.json();
        if (!extractData.success) {
            throw new Error(extractData.error || 'שגיאה בחילוץ פנים');
        }

        // שלב 2: בדיקת נוכחות ספציפית
        updateResultsProgress(`בודק נוכחות עבור ${person.first_name} ${person.last_name}...`, 75);

        const attendanceResponse = await fetch('/api/attendance/check-person', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                school_index: schoolIndex,
                person_id: selectedPersonId
            })
        });

        const result = await attendanceResponse.json();

        if (result.success) {
            updateResultsProgress('בדיקה הושלמה!', 100);
            displayPersonCheckResult(person, result);

            // רענון נתונים
            await loadAttendanceData();

        } else {
            throw new Error(result.error || 'שגיאה בבדיקת נוכחות');
        }

    } catch (error) {
        console.error('❌ שגיאה בבדיקת נוכחות ספציפית:', error);
        updateResultsProgress(`שגיאה: ${error.message}`, 100);
        showNotification(`שגיאה: ${error.message}`, 'error');
    } finally {
        isCheckingAttendance = false;
    }
}

/**
 * ביטול בדיקת נוכחות
 */
function handleCancelCheck() {
    if (isCheckingAttendance) {
        isCheckingAttendance = false;
        showNotification('בדיקה בוטלה', 'info');
    }

    showResultsArea(false);
    selectedPersonId = null;

    // איפוס בחירת אדם
    document.querySelectorAll('.person-card.selected').forEach(card => {
        card.classList.remove('selected');
    });

    const checkBtn = document.getElementById('check-person-attendance');
    if (checkBtn) {
        checkBtn.disabled = true;
    }
}

// ==================== RESULTS MANAGEMENT ====================

/**
 * הצגת/הסתרת אזור תוצאות
 */
function showResultsArea(show) {
    const resultArea = document.getElementById('attendance-result-area');
    if (resultArea) {
        resultArea.style.display = show ? 'block' : 'none';
    }

    const cancelBtn = document.getElementById('cancel-attendance-check');
    if (cancelBtn) {
        cancelBtn.style.display = show ? 'inline-block' : 'none';
    }
}

/**
 * עדכון progress של תוצאות
 */
function updateResultsProgress(text, percentage) {
    const statusText = document.getElementById('attendance-status-text');
    const progressBar = document.querySelector('#attendance-progress .progress-bar');

    if (statusText) {
        statusText.textContent = text;
    }

    if (progressBar) {
        progressBar.style.width = `${percentage}%`;
    }
}

/**
 * הצגת תוצאת בדיקה לאדם ספציפי
 */
function displayPersonCheckResult(person, result) {
    const resultContent = document.getElementById('attendance-result-content');
    if (!resultContent) return;

    const isPresent = result.is_present;
    const statusClass = isPresent ? 'result-present' : 'result-absent';
    const statusIcon = isPresent ? '✅' : '❌';
    const statusText = isPresent ? 'נוכח' : 'נעדר';

    let imageUrl = '/web_static/img/person-placeholder.jpg';
    if (person.image_urls && person.image_urls.length > 0) {
        imageUrl = person.image_urls[0];
    }

    resultContent.innerHTML = `
        <div class="person-check-result ${statusClass}">
            <div class="result-person-info">
                <img src="${imageUrl}" alt="${person.first_name}" class="result-person-image">
                <div class="result-person-details">
                    <h4>${person.first_name} ${person.last_name}</h4>
                    <p>ת.ז: ${person.id_number}</p>
                </div>
            </div>
            <div class="result-status">
                <span class="result-icon">${statusIcon}</span>
                <span class="result-text">${statusText}</span>
            </div>
            ${result.confidence ? `<div class="result-confidence">רמת ודאות: ${Math.round(result.confidence * 100)}%</div>` : ''}
            ${result.check_time ? `<div class="result-time">זמן בדיקה: ${formatHebrewTime(result.check_time)}</div>` : ''}
        </div>
    `;
}

// ==================== UTILITY FUNCTIONS ====================

/**
 * עדכון סטטיסטיקות נוכחות
 */
function updateAttendanceStats() {
    const totalPeople = attendanceData.length;
    const presentPeople = attendanceData.filter(p => p.is_present).length;
    const absentPeople = totalPeople - presentPeople;
    const percentage = totalPeople > 0 ? Math.round((presentPeople / totalPeople) * 100) : 0;

    // עדכון אלמנטים
    const presentEl = document.getElementById('attendance-present');
    const absentEl = document.getElementById('attendance-absent');
    const percentageEl = document.getElementById('attendance-percentage');

    if (presentEl) presentEl.textContent = presentPeople;
    if (absentEl) absentEl.textContent = absentPeople;
    if (percentageEl) percentageEl.textContent = `${percentage}%`;

    console.log(`📊 סטטיסטיקות: ${presentPeople} נוכחים, ${absentPeople} נעדרים (${percentage}%)`);
}

/**
 * בדיקת קיום תמונות מטרה
 */
async function checkTargetImages() {
    try {
        const schoolIndex = getCurrentSchoolIndex();
        const response = await fetch(`/api/get_target_images?school_index=${schoolIndex}`);
        const data = await response.json();

        if (!data.success || !data.targets || data.targets.length === 0) {
            showNotification('לא נמצאו תמונות מטרה. נא להעלות תמונות תחילה.', 'warning');
            return false;
        }

        return true;
    } catch (error) {
        console.error('שגיאה בבדיקת תמונות מטרה:', error);
        showNotification('שגיאה בבדיקת תמונות מטרה', 'error');
        return false;
    }
}

// ==================== EVENT HANDLERS ====================

/**
 * טיפול ברענון נוכחות
 */
async function handleRefreshAttendance() {
    showNotification('מרענן נתוני נוכחות...', 'info', 2000);
    await loadAttendanceData();
    showNotification('נתונים עודכנו', 'success', 2000);
}

/**
 * טיפול בייצוא נוכחות
 */
function handleExportAttendance() {
    if (!requireLogin('ייצוא נתונים')) return;

    if (attendanceData.length === 0) {
        showNotification('אין נתונים לייצוא', 'warning');
        return;
    }

    try {
        // הכנת נתונים לייצוא
        const exportData = attendanceData.map(person => ({
            'שם פרטי': person.first_name,
            'שם משפחה': person.last_name,
            'תעודת זהות': person.id_number,
            'סטטוס נוכחות': person.is_present ? 'נוכח' : 'נעדר',
            'זמן בדיקה': person.check_time ? formatHebrewTime(person.check_time) : 'לא זמין'
        }));

        // יצירת CSV
        const csv = convertToCSV(exportData);
        const selectedDate = document.getElementById('attendance-date').value || 'today';
        const filename = `attendance_report_${selectedDate}.csv`;

        // הורדת קובץ
        downloadCSV(csv, filename);
        showNotification('הקובץ ירד בהצלחה', 'success');

    } catch (error) {
        console.error('שגיאה בייצוא:', error);
        showNotification('שגיאה בייצוא הנתונים', 'error');
    }
}

/**
 * טיפול בשינוי תאריך
 */
async function handleDateChange() {
    showNotification('טוען נתונים לתאריך החדש...', 'info', 2000);
    await loadAttendanceData();
}

// ==================== EXPORT UTILITIES ====================

/**
 * המרת נתונים ל-CSV
 */
function convertToCSV(data) {
    if (data.length === 0) return '';

    const headers = Object.keys(data[0]);
    const csvHeaders = headers.join(',');

    const csvRows = data.map(row => {
        return headers.map(header => {
            const value = row[header];
            // הוספת גרשיים אם יש פסיקים או מרווחים
            return typeof value === 'string' && (value.includes(',') || value.includes(' ')) ?
                `"${value}"` : value;
        }).join(',');
    });

    return [csvHeaders, ...csvRows].join('\n');
}

/**
 * הורדת קובץ CSV
 */
function downloadCSV(csvContent, filename) {
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');

    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

// ==================== DEBUG UTILITIES ====================

if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    window.debugAttendance = {
        showData: () => {
            console.log('Attendance Data:', attendanceData);
            console.log('People for Selection:', peopleForSelection);
            console.log('Selected Person:', selectedPersonId);
            return { attendanceData, peopleForSelection, selectedPersonId };
        },

        refresh: loadAttendanceData,

        simulateCheck: () => {
            showResultsArea(true);
            updateResultsProgress('בדיקה מדומה...', 50);
            setTimeout(() => updateResultsProgress('הושלם!', 100), 2000);
        },

        testExport: () => {
            const mockData = [
                { 'שם פרטי': 'יוסי', 'שם משפחה': 'כהן', 'תעודת זהות': '123456789', 'סטטוס נוכחות': 'נוכח', 'זמן בדיקה': '08:30' }
            ];
            const csv = convertToCSV(mockData);
            downloadCSV(csv, 'test_export.csv');
        }
    };

    console.log('🔧 כלי דיבוג זמינים: window.debugAttendance');
}

// ==================== AUTO INITIALIZATION ====================

document.addEventListener('DOMContentLoaded', function() {
    console.log('📊 Attendance.js נטען');
    initializeAttendance();
});

/**
 * ==================== END OF ATTENDANCE.JS ====================
 *
 * קובץ זה מכיל את כל הפונקציונליות לנוכחות ודוחות:
 *
 * 📊 ניהול נתוני נוכחות מלא
 * ✅ בדיקת נוכחות כללית וספציפית
 * 📈 סטטיסטיקות ודוחות
 * 📋 ייצוא נתונים ל-CSV
 * 🎯 בחירת אנשים לבדיקה
 * 📱 ממשק רספונסיבי
 * 🔧 כלי דיבוג מתקדמים
 */