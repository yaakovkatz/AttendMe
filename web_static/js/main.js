document.addEventListener('DOMContentLoaded', function() {
    // Global variable to hold the people data
    let peopleData = [];

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

        // Close modals
        document.querySelectorAll('.close-modal, .close-modal-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const modal = e.target.closest('.modal');
                if (modal && modal.id === 'upload-image-modal') {
                    closeUploadModal();
                } else {
                    document.querySelectorAll('.modal').forEach(modal => modal.classList.remove('active'));
                }
            });
        });

        // The "Finish" button in the upload modal
        document.getElementById('finish-upload-button')?.addEventListener('click', function() {
            closeUploadModal();
            loadPeopleData(); // Refresh the list
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

        // Modal background click to close
        document.getElementById('upload-image-modal')?.addEventListener('click', function(e) {
            if (e.target === this) {
                closeUploadModal();
            }
        });
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

        const formData = new FormData();
        for (const file of fileInput.files) {
            formData.append('target_images', file);
        }

        resultDiv.textContent = '📡 מעלה קבצים...';
        previewDiv.innerHTML = '';

        try {
            const response = await fetch('/api/start_check', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();
            if (data.success) {
                showNotification(`הועלו בהצלחה ${data.uploaded_count || 'כל'} הקבצים!`, 'success');
                resultDiv.innerHTML = `<span style="color: green;">✅ הקבצים הועלו בהצלחה</span>`;

                if (data.uploaded_files && data.uploaded_files.length > 0) {
                    let previewHTML = '<div style="display: flex; flex-wrap: wrap; gap: 10px; margin-top: 15px;">';
                    data.uploaded_files.forEach((file, index) => {
                        if (file.type === 'image') {
                            previewHTML += `<img src="${file.url}" style="width: 150px; height: 150px; object-fit: cover; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.2);" alt="תמונה ${index + 1}">`;
                        } else if (file.type === 'video') {
                            previewHTML += `<video controls style="width: 150px; height: 150px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.2);"><source src="${file.url}"></video>`;
                        }
                    });
                    previewHTML += '</div>';
                    previewDiv.innerHTML = previewHTML;
                }

                form.reset();
                loadTargetImages();
            } else {
                showNotification(data.error, 'error');
                resultDiv.innerHTML = `<span style="color: red;">❌ שגיאה: ${data.error}</span>`;
            }
        } catch (error) {
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

        const formData = new FormData();
        for (const file of fileInput.files) {
            formData.append('target_images', file);
        }

        try {
            const response = await fetch('/api/start_check', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (data.success) {
                showNotification(`הועלו בהצלחה ${data.uploaded_count} קבצים נוספים!`, 'success');
                fileInput.value = '';
                loadTargetImages();
            } else {
                showNotification(data.error, 'error');
            }
        } catch (error) {
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
                data.files.forEach((file, index) => {
                    const card = document.createElement('div');
                    card.className = 'image-card';
                    card.style.cssText = `
                        position: relative;
                        display: inline-block;
                        margin: 5px;
                        border-radius: 8px;
                        overflow: hidden;
                        box-shadow: 0 2px 8px rgba(0,0,0,0.2);
                    `;

                    let mediaElement = '';
                    if (file.resource_type === 'image') {
                        mediaElement = `<img src="${file.url}" style="width: 150px; height: 150px; object-fit: cover;" alt="תמונה ${index + 1}">`;
                    } else if (file.resource_type === 'video') {
                        mediaElement = `<video controls style="width: 150px; height: 150px;"><source src="${file.url}"></video>`;
                    }

                    card.innerHTML = `
                        <input type="checkbox" class="image-checkbox" data-public-id="${file.public_id}" style="position: absolute; top: 5px; right: 5px; z-index: 10;">
                        ${mediaElement}
                    `;
                    gallery.appendChild(card);
                });
            } else {
                gallery.innerHTML = '<p style="text-align: center; color: #666;">אין תמונות להציג</p>';
            }
        } catch (error) {
            console.error('שגיאה בטעינת תמונות:', error);
            showNotification('שגיאה בטעינת תמונות', 'error');
        }
    }

    async function deleteSelectedTargetImages() {
        const selected = [...document.querySelectorAll('.image-checkbox:checked')];
        const publicIds = selected.map(cb => cb.getAttribute('data-public-id'));

        if (!publicIds.length) {
            showNotification('לא נבחרו תמונות למחיקה', 'error');
            return;
        }

        const confirmed = confirm(`האם למחוק ${publicIds.length} קבצים?`);
        if (!confirmed) return;

        try {
            const response = await fetch('/api/delete_target_images', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ public_ids: publicIds })
            });

            const data = await response.json();

            if (data.success) {
                showNotification(`נמחקו ${data.deleted_count} קבצים`, 'success');
                loadTargetImages();
            } else {
                showNotification(data.error, 'error');
            }
        } catch (error) {
            showNotification('שגיאה במחיקה', 'error');
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

    // ===== Event Handlers =====

    async function handleAddPerson(event) {
        event.preventDefault();
        const form = event.target;
        const personData = {
            first_name: form.querySelector('#first-name').value,
            last_name: form.querySelector('#last-name').value,
            id_number: form.querySelector('#id-number').value,
        };

        try {
            const response = await fetch('/api/add_person', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(personData)
            });
            const data = await response.json();
            if (data.success) {
                form.closest('.modal').classList.remove('active');
                form.reset();
                await loadPeopleData();
                showNotification(data.message, 'success');

                // *** תיקון: פתיחת חלון העלאה לאדם החדש עם איפוס נכון ***
                openUploadModal(data.person_id, `${personData.first_name} ${personData.last_name}`);
            } else {
                showNotification(data.error, 'error');
            }
        } catch (error) {
            showNotification('שגיאה בהוספת אדם', 'error');
        }
    }

    // *** פונקציות עזר - איפוס וטיפול במד התקדמות ***
    function resetUploadModal() {
        console.log('🧹 מאפס את חלון העלאה');

        // איפוס הטופס
        const form = document.getElementById('upload-image-form');
        if (form) {
            form.reset();
        }

        // הסרת הודעות progress קודמות
        const existingProgress = document.querySelector('.upload-progress-container');
        if (existingProgress) {
            existingProgress.remove();
            console.log('🗑️ הוסר progress container קודם');
        }

        // איפוס מד ההתקדמות ל-0
        updateUploadProgress(0);

        console.log('✅ חלון העלאה אופס במלואו');
    }

    function getPersonImageCount(personId) {
        try {
            // קודם נבדוק ב-localStorage
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

        // איפוס החלון לקראת הפעם הבאה
        resetUploadModal();

        console.log('✅ חלון העלאה נסגר ואופס');
    }

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

                const response = await fetch(`/api/upload_image/${personId}`, {
                    method: 'POST',
                    body: formData
                });

                const data = await response.json();
                console.log(`תגובה עבור ${file.name}:`, data);

                if (data.success) {
                    successCount++;
                    totalImages = data.image_count || (successCount);

                    const progress = ((i + 1) / files.length) * 100;
                    progressBar.style.width = `${progress}%`;

                    console.log(`✅ הועלה בהצלחה: ${file.name} (סה"כ תמונות: ${totalImages})`);

                    updateUploadProgress(totalImages);

                    if (!data.can_add_more) {
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

        await loadPeopleData();

        setTimeout(() => {
            document.getElementById('upload-image-form').reset();

            if (progressContainer && progressContainer.parentNode) {
                progressContainer.remove();
            }

            if (totalImages >= 3) {
                closeUploadModal();
            }
        }, 3000);
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
            } else {
                finishBtn.style.display = 'none';
            }
        }
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

    // Initial load when the DOM is ready
    initialize();
});
