document.addEventListener('DOMContentLoaded', function() {
    // Global variable to hold the people data
    let peopleData = [];

    // *** נתונים זמניים לאדם חדש ***
    let tempPersonData = {
        isActive: false,
        personDetails: null,
        uploadedImages: [], // מערך של public_id של תמונות שהועלו
        imageUrls: [] // מערך של URL-ים לתצוגה
    };

    // --- Main setup function ---
    function initialize() {
        initializeEventListeners();
        loadPeopleData();
        loadTargetImages();
    }

    // --- All event listeners setup ---
    function initializeEventListeners() {
        // People management buttons
        document.getElementById('add-person-btn')?.addEventListener('click', () => showModal(document.getElementById('add-person-modal')));
        document.getElementById('add-person-form')?.addEventListener('submit', handleAddPerson);
        document.getElementById('upload-image-form')?.addEventListener('submit', handleUploadImage);
        document.getElementById('search-people')?.addEventListener('input', filterPeopleTable);

        // Close modals - עדכון מיוחד לחלון העלאת תמונות
        document.querySelectorAll('.close-modal').forEach(button => {
            button.addEventListener('click', (e) => {
                const modal = e.target.closest('.modal');
                if (modal && modal.id === 'upload-image-modal') {
                    // בדיקה אם זה אדם חדש ועדיין לא הושלם
                    if (tempPersonData.isActive && tempPersonData.uploadedImages.length < 3) {
                        const confirmed = confirm('האם אתה בטוח שברצונך לבטל? התמונות שהועלו יימחקו.');
                        if (confirmed) {
                            cancelNewPersonCreation();
                        }
                        return;
                    }
                    closeUploadModal();
                } else if (modal) {
                    modal.classList.remove('active');
                }
            });
        });

        // Close modal buttons
        document.querySelectorAll('.close-modal-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const modal = e.target.closest('.modal');
                if (modal && modal.id === 'upload-image-modal') {
                    if (tempPersonData.isActive && tempPersonData.uploadedImages.length < 3) {
                        const confirmed = confirm('האם אתה בטוח שברצונך לבטל? התמונות שהועלו יימחקו.');
                        if (confirmed) {
                            cancelNewPersonCreation();
                        }
                        return;
                    }
                    closeUploadModal();
                } else if (modal) {
                    modal.classList.remove('active');
                }
            });
        });

        // The "Finish" button in the upload modal
        document.getElementById('finish-upload-button')?.addEventListener('click', function() {
            if (tempPersonData.isActive) {
                // זה אדם חדש - צריך ליצור אותו בשרת
                finishNewPersonCreation();
            } else {
                // זה אדם קיים - פשוט סוגרים
                closeUploadModal();
                loadPeopleData(); // Refresh the list
            }
        });

        // Image preview for new upload
        document.getElementById('person-image')?.addEventListener('change', function() {
            if (this.files && this.files[0]) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    document.getElementById('image-preview').src = e.target.result;
                };
                reader.readAsDataURL(this.files[0]);
            }
        });

        // Target upload events
        document.getElementById('target-upload-form')?.addEventListener('submit', handleTargetUpload);
        document.getElementById('upload-more-btn')?.addEventListener('click', handleMultipleTargetUpload);
        document.getElementById('delete-selected-btn')?.addEventListener('click', deleteSelectedTargetImages);

        // Modal background click to close - עדכון לחלון העלאת תמונות
        document.getElementById('upload-image-modal')?.addEventListener('click', function(e) {
            if (e.target === this) {
                if (tempPersonData.isActive && tempPersonData.uploadedImages.length < 3) {
                    const confirmed = confirm('האם אתה בטוח שברצונך לבטל? התמונות שהועלו יימחקו.');
                    if (confirmed) {
                        cancelNewPersonCreation();
                    }
                    return;
                }
                closeUploadModal();
            }
        });
    }

    // ===== פונקציות חדשות לטיפול בנתונים זמניים =====

    function startNewPersonCreation(personDetails) {
        console.log('🚀 מתחיל יצירת אדם חדש:', personDetails);

        tempPersonData = {
            isActive: true,
            personDetails: personDetails,
            uploadedImages: [],
            imageUrls: []
        };

        console.log('💾 נתונים זמניים הוגדרו:', tempPersonData);
    }

    async function finishNewPersonCreation() {
        console.log('🏁 מסיים יצירת אדם חדש');

        if (!tempPersonData.isActive || !tempPersonData.personDetails) {
            showNotification('שגיאה: נתונים זמניים לא תקינים', 'error');
            return;
        }

        if (tempPersonData.uploadedImages.length < 3) {
            showNotification('נדרשות לפחות 3 תמונות ליצירת אדם', 'error');
            return;
        }

        try {
            // שליחת הנתונים לשרת ליצירת האדם עם התמונות
            const response = await fetch('/api/create_person_with_images', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    person_details: tempPersonData.personDetails,
                    image_public_ids: tempPersonData.uploadedImages
                })
            });

            const data = await response.json();

            if (data.success) {
                showNotification(data.message, 'success');

                // איפוס נתונים זמניים
                clearTempPersonData();

                // סגירת החלון ורענון הרשימה
                closeUploadModal();
                await loadPeopleData();
            } else {
                showNotification(data.error || 'שגיאה ביצירת האדם', 'error');
            }
        } catch (error) {
            console.error('שגיאה ביצירת אדם:', error);
            showNotification('שגיאה ביצירת האדם', 'error');
        }
    }

    async function cancelNewPersonCreation() {
        console.log('❌ מבטל יצירת אדם חדש');

        if (tempPersonData.uploadedImages.length > 0) {
            try {
                // מחיקת התמונות שהועלו מהענן
                await fetch('/api/delete_temp_images', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({
                        public_ids: tempPersonData.uploadedImages
                    })
                });
                console.log('🗑️ נמחקו תמונות זמניות:', tempPersonData.uploadedImages);
            } catch (error) {
                console.error('שגיאה במחיקת תמונות זמניות:', error);
            }
        }

        clearTempPersonData();
        closeUploadModal();
    }

    function clearTempPersonData() {
        console.log('🧹 מנקה נתונים זמניים');
        tempPersonData = {
            isActive: false,
            personDetails: null,
            uploadedImages: [],
            imageUrls: []
        };
    }

    // ===== Event Handlers =====

    async function handleAddPerson(event) {
        event.preventDefault();
        const form = event.target;
        const personData = {
            first_name: form.querySelector('#first-name').value,
            last_name: form.querySelector('#last-name').value,
            id_number: form.querySelector('#id-number').value
        };

        // *** שינוי: לא יוצרים אדם בשרת, אלא שומרים זמנית ופותחים העלאת תמונות ***

        // בדיקה בסיסית שהשדות מלאים
        if (!personData.first_name || !personData.last_name || !personData.id_number) {
            showNotification('נא למלא את כל השדות', 'error');
            return;
        }

        // בדיקה שהאדם לא קיים כבר
        if (peopleData.find(p => p.id === personData.id_number)) {
            showNotification('אדם עם מספר זהות זה כבר קיים במערכת', 'error');
            return;
        }

        // סגירת חלון הוספת אדם
        form.closest('.modal').classList.remove('active');
        form.reset();

        // התחלת תהליך יצירת אדם חדש (נתונים זמניים)
        startNewPersonCreation(personData);

        // פתיחת חלון העלאת תמונות
        openUploadModalForNewPerson(personData);
    }

    function handleUploadClick(event) {
        const personId = event.currentTarget.getAttribute('data-id');
        const person = peopleData.find(p => p.id === personId);
        if (!person) return;

        openUploadModal(personId, `${person.first_name} ${person.last_name}`);
    }

    async function handleDeleteClick(event) {
        const personId = event.currentTarget.getAttribute('data-id');
        const person = peopleData.find(p => p.id === personId);
        if (!person) return;

        if (confirm(`האם אתה בטוח שברצונך למחוק את ${person.first_name} ${person.last_name}?`)) {
            try {
                const response = await fetch(`/api/remove_person/${personId}`, { method: 'DELETE' });
                const data = await response.json();
                if (data.success) {
                    showNotification(data.message, 'success');
                    await loadPeopleData();
                } else {
                    showNotification(data.error, 'error');
                }
            } catch (error) {
                showNotification('שגיאה במחיקת אדם', 'error');
            }
        }
    }

    function handleViewImagesClick(event) {
        const personId = event.currentTarget.getAttribute('data-id');
        const person = peopleData.find(p => p.id === personId);
        if (!person) return;

        const modal = document.getElementById('person-images-modal');
        const galleryContainer = document.getElementById('person-images-gallery');
        const personNameElem = document.getElementById('person-images-name');

        galleryContainer.innerHTML = '';
        personNameElem.textContent = `${person.first_name} ${person.last_name}`;

        if (!person.image_urls || person.image_urls.length === 0) {
            galleryContainer.innerHTML = '<p class="no-images">אין תמונות זמינות</p>';
        } else {
            person.image_urls.forEach((url, index) => {
                const imageContainer = document.createElement('div');
                imageContainer.className = 'person-image-item';
                imageContainer.innerHTML = `
                    <img src="${url}" alt="תמונה ${index + 1}" loading="lazy">
                    <div class="person-image-counter">${index + 1}</div>
                `;
                galleryContainer.appendChild(imageContainer);
            });
        }
        showModal(modal);
    }

    // ===== Upload Modal Functions =====

    function resetUploadModal() {
        console.log('🧹 מאפס את חלון העלאה');

        // איפוס הטופס
        const form = document.getElementById('upload-image-form');
        if (form) {
            form.reset();
        }

        // *** איפוס תצוגה מקדימה ***
        const imagePreview = document.getElementById('image-preview');
        if (imagePreview) {
            imagePreview.src = '/web_static/img/person-placeholder.jpg';
        }

        // *** איפוס שדה הקובץ ***
        const fileInput = document.getElementById('person-image');
        if (fileInput) {
            fileInput.value = '';
        }

        // הסרת הודעות progress קודמות
        const existingProgress = document.querySelector('.upload-progress-container');
        if (existingProgress) {
            existingProgress.remove();
            console.log('🗑️ הוסר progress container קודם');
        }

        // איפוס מד ההתקדמות בהתאם למצב
        if (tempPersonData.isActive) {
            updateUploadProgress(tempPersonData.uploadedImages.length);
        } else {
            updateUploadProgress(0);
        }

        console.log('✅ חלון העלאה אופס במלואו');
    }

    function openUploadModalForNewPerson(personData) {
        console.log(`📂 פותח חלון העלאה עבור אדם חדש: ${personData.first_name} ${personData.last_name}`);

        // איפוס מלא קודם
        resetUploadModal();

        // מילוי פרטי האדם (זמני)
        document.getElementById('upload-person-id').value = personData.id_number;

        // עדכון כותרת עם שם האדם + אינדיקטור "אדם חדש"
        const titleElement = document.querySelector('#upload-image-modal h3');
        if (titleElement) {
            titleElement.innerHTML = `
                <span style="color: #e67e22;">🆕 אדם חדש:</span>
                העלאת תמונות עבור ${personData.first_name} ${personData.last_name}
            `;
        }

        // הסתרת כפתור הסגירה (X) בחלון
        const closeButtons = document.querySelectorAll('#upload-image-modal .close-modal');
        closeButtons.forEach(btn => {
            btn.style.visibility = 'hidden';
        });

        // הצגת הודעה מיוחדת לאדם חדש
        const newPersonNotice = document.getElementById('new-person-notice');
        if (newPersonNotice) {
            newPersonNotice.style.display = 'block';
        }

        // עדכון מד ההתקדמות (0 תמונות)
        updateUploadProgress(0);

        // פתיחת החלון
        showModal(document.getElementById('upload-image-modal'));

        console.log('🎉 חלון העלאה לאדם חדש נפתח בהצלחה');
    }

    function openUploadModal(personId, personName) {
        console.log(`📂 פותח חלון העלאה עבור ${personName} (ID: ${personId})`);

        // איפוס מלא קודם
        resetUploadModal();

        // מילוי פרטי האדם
        document.getElementById('upload-person-id').value = personId;

        // עדכון כותרת עם שם האדם
        const titleElement = document.querySelector('#upload-image-modal h3');
        if (titleElement) {
            titleElement.textContent = `העלאת תמונות עבור ${personName}`;
        }

        // הצגת כפתור הסגירה (X) בחלון - זה אדם קיים
        const closeButtons = document.querySelectorAll('#upload-image-modal .close-modal');
        closeButtons.forEach(btn => {
            btn.style.visibility = 'visible';
        });

        // הסתרת הודעה מיוחדת לאדם חדש
        const newPersonNotice = document.getElementById('new-person-notice');
        if (newPersonNotice) {
            newPersonNotice.style.display = 'none';
        }

        // קבלת מספר התמונות הנוכחי ועדכון המד
        const currentImageCount = getPersonImageCount(personId);
        console.log(`📊 מספר תמונות נוכחי: ${currentImageCount}`);

        // עדכון מד ההתקדמות
        updateUploadProgress(currentImageCount);

        // פתיחת החלון
        showModal(document.getElementById('upload-image-modal'));

        console.log('🎉 חלון העלאה נפתח בהצלחה');
    }

    function closeUploadModal() {
        console.log('❌ סוגר חלון העלאה');

        // סגירת החלון
        document.getElementById('upload-image-modal').classList.remove('active');

        // הצגת כפתור הסגירה (X) בחזרה
        const closeButtons = document.querySelectorAll('#upload-image-modal .close-modal');
        closeButtons.forEach(btn => {
            btn.style.visibility = 'visible';
        });

        // הסתרת הודעה מיוחדת לאדם חדש
        const newPersonNotice = document.getElementById('new-person-notice');
        if (newPersonNotice) {
            newPersonNotice.style.display = 'none';
        }

        // איפוס החלון לקראת הפעם הבאה
        resetUploadModal();

        // איפוס נתונים זמניים אם זה אדם חדש שהושלם
        if (tempPersonData.isActive) {
            clearTempPersonData();
        }

        console.log('✅ חלון העלאה נסגר ואופס');
    }

    // ===== Upload Image Handler =====

    async function handleUploadImage(event) {
        event.preventDefault();

        const personId = document.getElementById('upload-person-id').value;
        const fileInput = document.getElementById('person-image');

        if (!fileInput.files.length) {
            showNotification('נא לבחור קבצים', 'error');
            return;
        }

        const files = Array.from(fileInput.files);

        if (files.length > 5) {
            showNotification('ניתן להעלות עד 5 תמונות בלבד', 'error');
            return;
        }

        console.log(`מתחיל להעלות ${files.length} תמונות...`);

        let successCount = 0;
        let errorCount = 0;
        let totalImages = 0;

        const form = event.target;

        let progressContainer = form.querySelector('.upload-progress-container');

        if (!progressContainer) {
            progressContainer = document.createElement('div');
            progressContainer.className = 'upload-progress-container';
            progressContainer.innerHTML = `
                <div style="margin: 15px 0; padding: 10px; background: #f0f8ff; border-radius: 5px;">
                    <div style="font-weight: bold; margin-bottom: 5px;">מעלה תמונות...</div>
                    <div id="upload-progress-text">מתחיל העלאה...</div>
                    <div style="background: #e0e0e0; height: 8px; border-radius: 4px; margin: 8px 0; overflow: hidden;">
                        <div id="upload-progress-bar" style="background: #4CAF50; height: 100%; width: 0%; transition: width 0.3s ease;"></div>
                    </div>
                </div>
            `;
            form.appendChild(progressContainer);
        }

        const progressBar = progressContainer.querySelector('#upload-progress-bar');
        const progressText = progressContainer.querySelector('#upload-progress-text');

        progressContainer.scrollIntoView({
            behavior: 'smooth',
            block: 'center'
        });

        progressBar.style.width = '0%';
        progressText.textContent = 'מתחיל העלאה...';

        for (let i = 0; i < files.length; i++) {
            const file = files[i];

            try {
                progressText.textContent = `מעלה תמונה ${i + 1} מתוך ${files.length}: ${file.name.substring(0, 20)}...`;

                const formData = new FormData();
                formData.append('image', file);

                console.log(`מעלה קובץ: ${file.name}`);

                // *** בדיקה אם זה אדם חדש או קיים ***
                let response, data;

                if (tempPersonData.isActive) {
                    // זה אדם חדש - נעלה לתיקייה זמנית
                    response = await fetch('/api/upload_temp_image', {
                        method: 'POST',
                        body: formData
                    });
                } else {
                    // זה אדם קיים - נעלה בצורה רגילה
                    response = await fetch(`/api/upload_image/${personId}`, {
                        method: 'POST',
                        body: formData
                    });
                }

                data = await response.json();
                console.log(`תגובה עבור ${file.name}:`, data);

                if (data.success) {
                    successCount++;

                    if (tempPersonData.isActive) {
                        // זה אדם חדש - נוסיף לנתונים הזמניים
                        tempPersonData.uploadedImages.push(data.public_id);
                        tempPersonData.imageUrls.push(data.image_url);
                        totalImages = tempPersonData.uploadedImages.length;
                    } else {
                        // זה אדם קיים - נשתמש בתגובה מהשרת
                        totalImages = data.image_count || successCount;
                    }

                    const progress = ((i + 1) / files.length) * 100;
                    progressBar.style.width = `${progress}%`;

                    console.log(`✅ הועלה בהצלחה: ${file.name} (סה"כ תמונות: ${totalImages})`);

                    updateUploadProgress(totalImages);

                    // בדיקת מקסימום תמונות
                    if (!tempPersonData.isActive && data.can_add_more === false) {
                        progressText.textContent = `הגעת למקסימום תמונות (5). הועלו ${successCount} תמונות.`;
                        showNotification('הגעת למקסימום תמונות (5)', 'warning');
                        break;
                    } else if (tempPersonData.isActive && totalImages >= 5) {
                        progressText.textContent = `הגעת למקסימום תמונות (5). הועלו ${successCount} תמונות.`;
                        showNotification('הגעת למקסימום תמונות (5)', 'warning');
                        break;
                    }
                } else {
                    errorCount++;
                    console.error(`❌ שגיאה בהעלאת ${file.name}:`, data.error);

                    const progress = ((i + 1) / files.length) * 100;
                    progressBar.style.width = `${progress}%`;

                    if (data.error && data.error.includes('מקסימום')) {
                        progressText.textContent = `הגעת למקסימום תמונות. הועלו ${successCount} תמונות.`;
                        break;
                    }
                }
            } catch (error) {
                errorCount++;
                console.error(`❌ שגיאת רשת בהעלאת ${file.name}:`, error);

                const progress = ((i + 1) / files.length) * 100;
                progressBar.style.width = `${progress}%`;
            }

            if (i < files.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 300));
            }
        }

        progressBar.style.width = '100%';

        let summaryMessage = '';
        let notificationType = 'success';

        if (successCount > 0 && errorCount === 0) {
            summaryMessage = `🎉 כל התמונות הועלו בהצלחה! (${successCount}/${files.length})`;
            progressText.textContent = `הושלם! הועלו ${successCount} תמונות בהצלחה`;
            progressContainer.style.background = '#e8f5e8';
            notificationType = 'success';
        } else if (successCount > 0 && errorCount > 0) {
            summaryMessage = `⚠️ הועלו ${successCount} תמונות, נכשלו ${errorCount}`;
            progressText.textContent = `הושלם חלקית: ${successCount} הצליחו, ${errorCount} נכשלו`;
            progressContainer.style.background = '#fff3cd';
            notificationType = 'warning';
        } else {
            summaryMessage = `❌ כל ההעלאות נכשלו (${errorCount} שגיאות)`;
            progressText.textContent = `כל ההעלאות נכשלו`;
            progressContainer.style.background = '#ffebee';
            notificationType = 'error';
        }

        console.log('סיכום העלאה:', summaryMessage);
        showNotification(summaryMessage, notificationType);

        // רענון נתונים רק אם זה לא אדם חדש (זמני)
        if (!tempPersonData.isActive) {
            await loadPeopleData();
        }

        setTimeout(() => {
            document.getElementById('upload-image-form').reset();

            // *** איפוס תצוגה מקדימה ***
            const imagePreview = document.getElementById('image-preview');
            if (imagePreview) {
                imagePreview.src = '/web_static/img/person-placeholder.jpg';
            }

            if (progressContainer && progressContainer.parentNode) {
                progressContainer.remove();
            }

            // *** שינוי: החלון לא נסגר אוטומטית ***
            // אם זה אדם קיים ויש לו 3+ תמונות, אפשר לסגור
            // אבל אם זה אדם חדש, החלון נשאר פתוח עד לחיצה על "סיום"
        }, 3000);
    }

    // ===== Helper Functions =====

    function getPersonImageCount(personId) {
        try {
            // אם זה אדם חדש (זמני), נחזיר את מספר התמונות הזמניות
            if (tempPersonData.isActive && tempPersonData.personDetails && tempPersonData.personDetails.id_number === personId) {
                return tempPersonData.uploadedImages.length;
            }

            // אחרת, נבדוק ב-localStorage
            const people = JSON.parse(localStorage.getItem('peopleData') || '[]');
            const person = people.find(p => p.id === personId);

            if (person && person.image_urls) {
                console.log(`נמצא באחסון מקומי: ${person.image_urls.length} תמונות`);
                return person.image_urls.length;
            }

            // אם לא נמצא באחסון מקומי, נבדוק ב-peopleData גלובלי
            const globalPerson = peopleData.find(p => p.id === personId);
            if (globalPerson && globalPerson.image_urls) {
                console.log(`נמצא ב-peopleData: ${globalPerson.image_urls.length} תמונות`);
                return globalPerson.image_urls.length;
            }

            console.log('לא נמצאו תמונות - מחזיר 0');
            return 0;
        } catch (error) {
            console.error('שגיאה בקבלת מספר תמונות:', error);
            return 0;
        }
    }

    function updateUploadProgress(imageCount) {
        console.log(`🎯 מעדכן מד התקדמות ל: ${imageCount} תמונות`);

        // עדכון הפסים בחלק העליון
        for (let i = 1; i <= 5; i++) {
            const step = document.getElementById(`progress-step-${i}`);
            if (step) {
                if (i <= imageCount) {
                    step.classList.add('completed');
                    step.style.backgroundColor = '#4caf50';
                    step.style.borderColor = '#4caf50';
                    console.log(`✅ פס ${i} מושלם`);
                } else {
                    step.classList.remove('completed');
                    step.style.backgroundColor = '#ddd';
                    step.style.borderColor = '#ddd';
                    console.log(`⭕ פס ${i} לא מושלם`);
                }
            } else {
                console.warn(`❌ לא נמצא פס ${i}`);
            }
        }

        // עדכון הטקסט
        const statusEl = document.getElementById('upload-status');
        if (statusEl) {
            const remaining = Math.max(0, 3 - imageCount);
            if (imageCount === 0) {
                statusEl.textContent = 'יש להעלות לפחות 3 תמונות ועד 5 תמונות בסך הכל';
                statusEl.style.color = '#666';
                console.log('📝 הוגדר טקסט התחלתי');
            } else if (remaining > 0) {
                statusEl.textContent = `יש לך ${imageCount} תמונות. נדרשות עוד ${remaining} תמונות לפחות.`;
                statusEl.style.color = '#ff9800';
                console.log(`📝 נדרשות עוד ${remaining} תמונות`);
            } else if (imageCount < 5) {
                statusEl.textContent = `יש לך ${imageCount} תמונות. ניתן להוסיף עד ${5 - imageCount} תמונות נוספות.`;
                statusEl.style.color = '#4caf50';
                console.log(`📝 ניתן להוסיף עוד ${5 - imageCount} תמונות`);
            } else {
                statusEl.textContent = `יש לך ${imageCount} תמונות (מקסימום).`;
                statusEl.style.color = '#4caf50';
                console.log('📝 הגעת למקסימום');
            }
        } else {
            console.warn('❌ לא נמצא אלמנט upload-status');
        }

        // עדכון כפתור סיום
        const finishBtn = document.getElementById('finish-upload-button');
        if (finishBtn) {
            if (imageCount >= 3) {
                finishBtn.style.display = 'inline-block';
                finishBtn.disabled = false;
            } else {
                finishBtn.style.display = tempPersonData.isActive ? 'inline-block' : 'none';
                finishBtn.disabled = true;
            }
        }
    }

    // ===== Data Loading and Rendering Functions =====

    async function loadPeopleData() {
        try {
            const response = await fetch('/api/get_loaded_people');
            const data = await response.json();

            if (data.success && data.people) {
                peopleData = data.people;
                // שמירה ב-localStorage לעדכון מד ההתקדמות
                localStorage.setItem('peopleData', JSON.stringify(data.people));
            } else {
                peopleData = [];
                console.error('Failed to load people:', data.message);
            }
            renderPeopleTable();
        } catch (error) {
            console.error('Error fetching people:', error);
            showNotification('שגיאה בטעינת רשימת אנשים', 'error');
        }
    }

    function renderPeopleTable() {
        const tableBody = document.getElementById('people-table-body');
        if (!tableBody) return;
        tableBody.innerHTML = '';

        if (peopleData.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="5" style="text-align: center;">אין אנשים במערכת</td></tr>`;
            return;
        }

        peopleData.forEach(person => {
            const row = document.createElement('tr');

            let imageUrl = '/web_static/img/person-placeholder.jpg';
            if (person.image_urls && person.image_urls.length > 0) {
                imageUrl = person.image_urls[0];
            }

            const imageCounter = person.image_count > 0 ? `<span class="image-count">${person.image_count}</span>` : '';
            const statusClass = person.is_present ? 'status-present' : 'status-absent';
            const statusText = person.is_present ? 'נוכח' : 'נעדר';

            row.innerHTML = `
                <td><img src="${imageUrl}" alt="${person.first_name}" class="person-image">${imageCounter}</td>
                <td>${person.first_name} ${person.last_name}</td>
                <td>${person.id}</td>
                <td><span class="person-status ${statusClass}">${statusText}</span></td>
                <td>
                    <div class="person-actions">
                        <button class="upload" data-id="${person.id}" title="העלאת תמונה"><i class="fas fa-upload"></i></button>
                        ${person.image_count > 0 ? `<button class="view-images" data-id="${person.id}" title="צפייה בכל התמונות"><i class="fas fa-images"></i></button>` : ''}
                        <button class="delete" data-id="${person.id}" title="מחיקה"><i class="fas fa-trash-alt"></i></button>
                    </div>
                </td>
            `;
            tableBody.appendChild(row);
        });

        // Re-attach event listeners after rendering the table
        tableBody.querySelectorAll('.upload').forEach(b => b.addEventListener('click', handleUploadClick));
        tableBody.querySelectorAll('.delete').forEach(b => b.addEventListener('click', handleDeleteClick));
        tableBody.querySelectorAll('.view-images').forEach(b => b.addEventListener('click', handleViewImagesClick));
    }

    function filterPeopleTable() {
        const searchValue = document.getElementById('search-people').value.toLowerCase();
        const tableBody = document.getElementById('people-table-body');
        if (!tableBody) return;

        const rows = tableBody.querySelectorAll('tr');
        rows.forEach(row => {
            const fullName = row.children[1]?.textContent.toLowerCase() || '';
            const id = row.children[2]?.textContent.toLowerCase() || '';
            if (fullName.includes(searchValue) || id.includes(searchValue)) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        });
    }

    // ===== Target Image Functions =====

    async function handleTargetUpload(e) {
        e.preventDefault();

        const form = e.target;
        const fileInput = form.querySelector('#target-file');
        const resultDiv = document.getElementById('target-upload-result');
        const previewDiv = document.getElementById('target-preview');

        if (!fileInput.files.length) {
            showNotification('נא לבחור קבצים', 'error');
            return;
        }

        // בדיקת מספר תמונות קיימות לפני העלאה
        let existingCount = 0;
        try {
            const existingResponse = await fetch('/api/get_target_images');
            const existingData = await existingResponse.json();
            if (existingData.success && existingData.files) {
                existingCount = existingData.files.length;
            }
        } catch (error) {
            console.log('לא הצלחנו לבדוק תמונות קיימות, ממשיכים...');
        }

        const formData = new FormData();

        // *** השינוי הקריטי: משתמשים ב-append_target_images במקום start_check ***
        for (const file of fileInput.files) {
            formData.append('target_images', file);
        }

        resultDiv.textContent = `📡 מעלה ${fileInput.files.length} קבצים נוספים...`;
        previewDiv.innerHTML = '';

        try {
            // *** שימוש ב-API חדש שמוסיף במקום להחליף ***
            const response = await fetch('/api/append_target_images', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();
            if (data.success) {
                const newCount = data.total_count || (existingCount + data.uploaded_count);
                showNotification(
                    `הועלו בהצלחה ${data.uploaded_count} קבצים! סה"כ: ${newCount} תמונות`,
                    'success'
                );

                resultDiv.innerHTML = `
                    <span style="color: green;">✅ ${data.uploaded_count} קבצים הועלו בהצלחה</span><br>
                    <small>סה"כ תמונות במערכת: ${newCount}</small>
                `;

                // הצגת תצוגה מקדימה של התמונות החדשות
                if (data.uploaded_files && data.uploaded_files.length > 0) {
                    let previewHTML = '<div style="display: flex; flex-wrap: wrap; gap: 10px; margin-top: 15px;">';
                    previewHTML += '<h4 style="width: 100%; margin: 0 0 10px 0; color: #4caf50;">תמונות שהועלו כעת:</h4>';

                    data.uploaded_files.forEach((file, index) => {
                        if (file.type === 'image') {
                            previewHTML += `<img src="${file.url}" style="width: 150px; height: 150px; object-fit: cover; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.2); border: 2px solid #4caf50;" alt="תמונה חדשה ${index + 1}">`;
                        } else if (file.type === 'video') {
                            previewHTML += `<video controls style="width: 150px; height: 150px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.2); border: 2px solid #4caf50;"><source src="${file.url}"></video>`;
                        }
                    });
                    previewHTML += '</div>';
                    previewDiv.innerHTML = previewHTML;
                }

                // ניקוי הטופס
                form.reset();

                // רענון הגלריה כדי להראות את כל התמונות (קיימות + חדשות)
                await loadTargetImages();

            } else {
                showNotification(data.error || 'שגיאה בהעלאת קבצים', 'error');
                resultDiv.innerHTML = `<span style="color: red;">❌ שגיאה: ${data.error}</span>`;
            }
        } catch (error) {
            console.error('שגיאה בהעלאת קבצים:', error);
            showNotification('שגיאה בהעלאת קבצים', 'error');
            resultDiv.innerHTML = `<span style="color: red;">שגיאת תקשורת: ${error.message}</span>`;
        }
    }

    async function handleMultipleTargetUpload() {
        const fileInput = document.getElementById('target-images');

        if (!fileInput.files.length) {
            showNotification('נא לבחור קבצים', 'error');
            return;
        }

        // ספירת תמונות קיימות
        let existingCount = 0;
        try {
            const existingResponse = await fetch('/api/get_target_images');
            const existingData = await existingResponse.json();
            if (existingData.success && existingData.files) {
                existingCount = existingData.files.length;
            }
        } catch (error) {
            console.log('לא הצלחנו לבדוק תמונות קיימות');
        }

        const formData = new FormData();
        for (const file of fileInput.files) {
            formData.append('target_images', file);
        }

        // הצגת הודעה עם מספר תמונות קיימות
        showNotification(`מעלה ${fileInput.files.length} תמונות נוספות (יש כבר ${existingCount} תמונות)...`, 'info');

        try {
            // *** שימוש ב-API שמוסיף במקום להחליף ***
            const response = await fetch('/api/append_target_images', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (data.success) {
                const newTotal = data.total_count || (existingCount + data.uploaded_count);
                showNotification(
                    `הועלו ${data.uploaded_count} תמונות נוספות! סה"כ: ${newTotal} תמונות`,
                    'success'
                );

                fileInput.value = ''; // ניקוי הטופס
                await loadTargetImages(); // רענון הגלריה
            } else {
                showNotification(data.error || 'שגיאה בהעלאת קבצים', 'error');
            }
        } catch (error) {
            console.error('שגיאה בהעלאת קבצים:', error);
            showNotification('שגיאה בהעלאת קבצים', 'error');
        }
    }

    async function loadTargetImages() {
        try {
            const response = await fetch('/api/get_target_images');
            const data = await response.json();

            const gallery = document.getElementById('target-gallery');
            if (!gallery) return;

            gallery.innerHTML = '';

            if (data.success && data.files && data.files.length > 0) {
                // הוספת כותרת עם מונה
                const header = document.createElement('div');
                header.style.cssText = `
                    width: 100%;
                    text-align: center;
                    margin-bottom: 15px;
                    padding: 10px;
                    background: #f0f8ff;
                    border-radius: 8px;
                    border-right: 4px solid #3498db;
                `;
                header.innerHTML = `
                    <h3 style="margin: 0; color: #3498db; font-size: 18px;">
                        📸 תמונות מטרה (${data.files.length} תמונות)
                    </h3>
                `;
                gallery.appendChild(header);

                // יצירת הגלריה
                const imageGrid = document.createElement('div');
                imageGrid.style.cssText = `
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
                    gap: 15px;
                    margin-top: 15px;
                `;

                data.files.forEach((file, index) => {
                    const card = document.createElement('div');
                    card.className = 'image-card';
                    card.style.cssText = `
                        position: relative;
                        display: block;
                        border-radius: 8px;
                        overflow: hidden;
                        box-shadow: 0 2px 8px rgba(0,0,0,0.2);
                        transition: transform 0.3s ease;
                    `;

                    let mediaElement = '';
                    if (file.resource_type === 'image') {
                        mediaElement = `<img src="${file.url}" style="width: 100%; height: 160px; object-fit: cover;" alt="תמונה ${index + 1}">`;
                    } else if (file.resource_type === 'video') {
                        mediaElement = `<video controls style="width: 100%; height: 160px;"><source src="${file.url}"></video>`;
                    }

                    card.innerHTML = `
                        <input type="checkbox" class="image-checkbox" data-public-id="${file.public_id}"
                               style="position: absolute; top: 8px; right: 8px; z-index: 10; width: 18px; height: 18px; cursor: pointer;">
                        ${mediaElement}
                        <div style="position: absolute; bottom: 0; left: 0; right: 0; background: rgba(0,0,0,0.7); color: white; padding: 5px; font-size: 12px; text-align: center;">
                            תמונה #${index + 1}
                        </div>
                    `;

                    // אפקט hover
                    card.addEventListener('mouseenter', () => {
                        card.style.transform = 'scale(1.05)';
                    });
                    card.addEventListener('mouseleave', () => {
                        card.style.transform = 'scale(1)';
                    });

                    imageGrid.appendChild(card);
                });

                gallery.appendChild(imageGrid);

            } else {
                gallery.innerHTML = `
                    <div style="text-align: center; padding: 40px; color: #666; background: #f9f9f9; border-radius: 8px; border: 2px dashed #ddd;">
                        <div style="font-size: 48px; margin-bottom: 15px;">📷</div>
                        <h3>אין תמונות מטרה</h3>
                        <p>העלה תמונות כדי להתחיל</p>
                    </div>
                `;
            }
        } catch (error) {
            console.error('שגיאה בטעינת תמונות:', error);
            showNotification('שגיאה בטעינת תמונות', 'error');

            const gallery = document.getElementById('target-gallery');
            if (gallery) {
                gallery.innerHTML = `
                    <div style="text-align: center; padding: 20px; color: #e74c3c; background: #ffebee; border-radius: 8px;">
                        ❌ שגיאה בטעינת התמונות
                        <button onclick="loadTargetImages()" style="display: block; margin: 10px auto; padding: 8px 16px; background: #e74c3c; color: white; border: none; border-radius: 4px; cursor: pointer;">
                            נסה שוב
                        </button>
                    </div>
                `;
            }
        }
    }

    async function deleteSelectedTargetImages() {
        const selected = [...document.querySelectorAll('.image-checkbox:checked')];
        const publicIds = selected.map(cb => cb.getAttribute('data-public-id'));

        if (!publicIds.length) {
            showNotification('לא נבחרו תמונות למחיקה', 'error');
            return;
        }

        // ספירת תמונות כוללות לפני המחיקה
        let totalBeforeDelete = 0;
        try {
            const response = await fetch('/api/get_target_images');
            const data = await response.json();
            if (data.success && data.files) {
                totalBeforeDelete = data.files.length;
            }
        } catch (error) {
            console.log('לא הצלחנו לבדוק מספר תמונות');
        }

        const confirmed = confirm(
            `האם למחוק ${publicIds.length} תמונות?\n` +
            `(יישארו ${totalBeforeDelete - publicIds.length} תמונות)`
        );

        if (!confirmed) return;

        try {
            const response = await fetch('/api/delete_target_images', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ public_ids: publicIds })
            });

            const data = await response.json();

            if (data.success) {
                const remaining = totalBeforeDelete - data.deleted_count;
                showNotification(
                    `נמחקו ${data.deleted_count} תמונות. נותרו ${remaining} תמונות`,
                    'success'
                );
                await loadTargetImages(); // רענון הגלריה
            } else {
                showNotification(data.error || 'שגיאה במחיקה', 'error');
            }
        } catch (error) {
            console.error('שגיאה במחיקה:', error);
            showNotification('שגיאה במחיקה', 'error');
        }
    }

    // ===== Utility Functions =====

    function showModal(modal) {
        if(modal) modal.classList.add('active');
    }

    function closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('active');
        }
    }

    function showNotification(message, type = 'info') {
        let container = document.querySelector('.notification-container');
        if (!container) {
            container = document.createElement('div');
            container.className = 'notification-container';
            document.body.appendChild(container);
        }
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `<span class="notification-message">${message}</span><button class="notification-close">&times;</button>`;
        container.appendChild(notification);
        const closeBtn = notification.querySelector('.notification-close');
        const autoClose = setTimeout(() => closeNotification(notification), 5000);
        function closeNotification() {
            notification.classList.add('closing');
            setTimeout(() => {
                notification.remove();
                clearTimeout(autoClose);
            }, 300);
        }
        closeBtn.addEventListener('click', closeNotification);
    }

    // ===== Helper Functions for Target Images =====

    function showTargetStats() {
        fetch('/api/get_target_images')
            .then(response => response.json())
            .then(data => {
                if (data.success && data.files) {
                    const count = data.files.length;
                    const images = data.files.filter(f => f.resource_type === 'image').length;
                    const videos = data.files.filter(f => f.resource_type === 'video').length;

                    showNotification(
                        `📊 סטטיסטיקות: ${count} קבצים (${images} תמונות, ${videos} סרטונים)`,
                        'info'
                    );
                }
            })
            .catch(error => {
                console.error('שגיאה בקבלת סטטיסטיקות:', error);
            });
    }

    // *** הוספת כפתור לרענון ידני ***
    function addRefreshButton() {
        const gallery = document.getElementById('target-gallery');
        if (!gallery) return;

        const refreshBtn = document.createElement('button');
        refreshBtn.id = 'refresh-gallery-btn';
        refreshBtn.className = 'action-button';
        refreshBtn.innerHTML = '🔄 רענן גלריה';
        refreshBtn.style.cssText = `
            position: sticky;
            top: 10px;
            z-index: 20;
            margin: 10px 0;
            background: linear-gradient(45deg, #2196F3, #1976D2);
        `;

        refreshBtn.addEventListener('click', () => {
            loadTargetImages();
            showTargetStats();
        });

        // הוספת הכפתור לפני הגלריה אם הוא לא קיים
        if (!document.getElementById('refresh-gallery-btn')) {
            gallery.parentNode.insertBefore(refreshBtn, gallery);
        }
    }

    // *** יניציאליזציה כשהדף נטען ***
    document.addEventListener('DOMContentLoaded', function() {
        // הוספת כפתור רענון
        setTimeout(addRefreshButton, 1000);

        // הוספת טיפ לכפתור העלאה נוספת
        const uploadMoreBtn = document.getElementById('upload-more-btn');
        if (uploadMoreBtn) {
            uploadMoreBtn.title = 'העלה תמונות נוספות (יתווספו לתמונות הקיימות)';
        }
    });

    // Initial load when the DOM is ready
    initialize();
});