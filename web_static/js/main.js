document.addEventListener('DOMContentLoaded', function() {
    // Global variable to hold the people data
    let peopleData = [];
    let selectedTargetFiles = [];
    let allTargetImages = [];

    // --- Main setup function ---
    function initialize() {
        initializeEventListeners();
        loadPeopleData();
        loadTargetImages();
        setupTargetDragAndDrop();
        setupTargetFileInput();
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

        // Modal background click to close
        document.getElementById('upload-image-modal')?.addEventListener('click', function(e) {
            if (e.target === this) {
                closeUploadModal();
            }
        });
    }

    // ===== TARGET IMAGES FUNCTIONALITY =====

    // Setup drag and drop for target images
    function setupTargetDragAndDrop() {
        const uploadArea = document.querySelector('.upload-area');
        if (!uploadArea) return;

        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            uploadArea.addEventListener(eventName, preventDefaults, false);
        });

        function preventDefaults(e) {
            e.preventDefault();
            e.stopPropagation();
        }

        ['dragenter', 'dragover'].forEach(eventName => {
            uploadArea.addEventListener(eventName, () => uploadArea.classList.add('dragover'), false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            uploadArea.addEventListener(eventName, () => uploadArea.classList.remove('dragover'), false);
        });

        uploadArea.addEventListener('drop', handleTargetDrop, false);
    }

    function handleTargetDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        const fileInput = document.getElementById('target-file-input');
        if (fileInput) {
            fileInput.files = files;
            updateTargetFileDisplay();
        }
    }

    // Setup file input for target images
    function setupTargetFileInput() {
        const fileInput = document.getElementById('target-file-input');
        if (fileInput) {
            fileInput.addEventListener('change', updateTargetFileDisplay);
        }
    }

    function updateTargetFileDisplay() {
        const fileInput = document.getElementById('target-file-input');
        const uploadText = document.querySelector('.upload-text');

        if (fileInput && uploadText) {
            if (fileInput.files.length > 0) {
                uploadText.textContent = `נבחרו ${fileInput.files.length} קבצים`;
                uploadText.style.color = '#27ae60';
            } else {
                uploadText.textContent = 'לחץ כאן או גרור קבצים להעלאה';
                uploadText.style.color = '#2c3e50';
            }
        }
    }

    // Upload target files - GLOBAL FUNCTION
    window.uploadTargetFiles = async function() {
        const fileInput = document.getElementById('target-file-input');

        if (!fileInput || !fileInput.files.length) {
            showNotification('נא לבחור קבצים להעלאה', 'error');
            return;
        }

        const formData = new FormData();
        for (const file of fileInput.files) {
            formData.append('target_images', file);
        }

        showTargetLoading(true);

        try {
            const response = await fetch('/api/append_target_images', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (data.success) {
                showNotification(`הועלו בהצלחה ${data.uploaded_count} קבצים! סה"כ: ${data.total_count}`, 'success');
                fileInput.value = '';
                updateTargetFileDisplay();
                await loadTargetImages();
            } else {
                showNotification(data.error, 'error');
            }
        } catch (error) {
            showNotification('שגיאה בהעלאת קבצים', 'error');
            console.error('Target upload error:', error);
        } finally {
            showTargetLoading(false);
        }
    };

    // Delete selected targets - GLOBAL FUNCTION
    window.deleteSelectedTargets = async function() {
        const checkboxes = document.querySelectorAll('.target-image-checkbox:checked');
        const publicIds = Array.from(checkboxes).map(cb => cb.getAttribute('data-public-id'));

        if (!publicIds.length) {
            showNotification('לא נבחרו קבצים למחיקה', 'error');
            return;
        }

        const confirmed = confirm(`האם למחוק ${publicIds.length} קבצים?`);
        if (!confirmed) return;

        showTargetLoading(true);

        try {
            const response = await fetch('/api/delete_target_images', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ public_ids: publicIds })
            });

            const data = await response.json();

            if (data.success) {
                showNotification(`נמחקו ${data.deleted_count} קבצים`, 'success');
                await loadTargetImages();
            } else {
                showNotification(data.error, 'error');
            }
        } catch (error) {
            showNotification('שגיאה במחיקת קבצים', 'error');
            console.error('Delete target images error:', error);
        } finally {
            showTargetLoading(false);
        }
    };

    // Update target delete button - GLOBAL FUNCTION
    window.updateTargetDeleteButton = function() {
        const checkboxes = document.querySelectorAll('.target-image-checkbox:checked');
        const deleteBtn = document.getElementById('target-delete-btn');

        if (deleteBtn) {
            deleteBtn.disabled = checkboxes.length === 0;

            if (checkboxes.length > 0) {
                deleteBtn.textContent = `🗑️ מחק ${checkboxes.length} נבחרים`;
            } else {
                deleteBtn.textContent = '🗑️ מחק נבחרים';
            }
        }
    };

    // Load target images
    async function loadTargetImages() {
        // Only try to load if we're in the target upload section
        if (!document.getElementById('target-gallery-grid')) {
            return;
        }

        showTargetLoading(true);

        try {
            const response = await fetch('/api/get_target_images');
            const data = await response.json();

            if (data.success) {
                allTargetImages = data.files || [];
                renderTargetGallery();
                updateTargetGalleryStats(data);
            } else {
                console.log('No target images available yet');
                renderEmptyTargetGallery();
            }
        } catch (error) {
            console.log('Target images not available yet:', error);
            renderEmptyTargetGallery();
        } finally {
            showTargetLoading(false);
        }
    }

    function renderEmptyTargetGallery() {
        const galleryGrid = document.getElementById('target-gallery-grid');
        if (galleryGrid) {
            galleryGrid.innerHTML = `
                <div class="target-empty-state" style="grid-column: 1 / -1;">
                    <div class="target-empty-icon">📷</div>
                    <h3>אין תמונות מטרה</h3>
                    <p>העלה תמונות כדי להתחיל</p>
                </div>
            `;
        }
    }

    // Render target gallery
    function renderTargetGallery() {
        const galleryGrid = document.getElementById('target-gallery-grid');
        if (!galleryGrid) return;

        if (!allTargetImages.length) {
            galleryGrid.innerHTML = `
                <div class="target-empty-state" style="grid-column: 1 / -1;">
                    <div class="target-empty-icon">📷</div>
                    <h3>אין תמונות מטרה</h3>
                    <p>העלה תמונות כדי להתחיל</p>
                </div>
            `;
            return;
        }

        galleryGrid.innerHTML = '';

        allTargetImages.forEach((image, index) => {
            const card = document.createElement('div');
            card.className = 'target-image-card';

            let mediaElement = '';
            if (image.resource_type === 'video') {
                mediaElement = `<video controls><source src="${image.url}"></video>`;
            } else {
                mediaElement = `<img src="${image.url}" alt="תמונה ${index + 1}">`;
            }

            card.innerHTML = `
                <input type="checkbox" class="target-image-checkbox" data-public-id="${image.public_id}" onchange="updateTargetDeleteButton()">
                ${mediaElement}
                <div class="target-image-info">
                    ${image.resource_type === 'video' ? '🎬' : '📷'} קובץ #${index + 1}
                    ${image.bytes ? `<br>${Math.round(image.bytes / 1024)} KB` : ''}
                </div>
            `;

            galleryGrid.appendChild(card);
        });
    }

    // Update target gallery stats
    function updateTargetGalleryStats(data) {
        const statsElement = document.getElementById('target-gallery-stats');
        if (!statsElement) return;

        const total = data.total_count || 0;
        const images = data.images_count || 0;
        const videos = data.videos_count || 0;

        statsElement.innerHTML = `
            סה"כ: ${total} קבצים |
            תמונות: ${images} |
            סרטונים: ${videos}
        `;
    }

    // Show/hide target loading
    function showTargetLoading(show) {
        const loading = document.getElementById('target-loading');
        if (loading) {
            loading.classList.toggle('show', show);
        }
    }

    // ===== PEOPLE DATA LOADING AND RENDERING =====

    async function loadPeopleData() {
        try {
            const response = await fetch('/api/get_loaded_people');
            const data = await response.json();

            if (data.success && data.people) {
                peopleData = data.people;
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

            let imageUrl = 'https://via.placeholder.com/50x50/3498db/ffffff?text=👤';
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

    // ===== EVENT HANDLERS =====

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

                openUploadModal(data.person_id, `${personData.first_name} ${personData.last_name}`);
            } else {
                showNotification(data.error, 'error');
            }
        } catch (error) {
            showNotification('שגיאה בהוספת אדם', 'error');
        }
    }

    // Upload Modal Management
    function resetUploadModal() {
        console.log('🧹 מאפס את חלון העלאה');

        const form = document.getElementById('upload-image-form');
        if (form) {
            form.reset();
        }

        const existingProgress = document.querySelector('.upload-progress-container');
        if (existingProgress) {
            existingProgress.remove();
            console.log('🗑️ הוסר progress container קודם');
        }

        updateUploadProgress(0);
        console.log('✅ חלון העלאה אופס במלואו');
    }

    function getPersonImageCount(personId) {
        try {
            const people = JSON.parse(localStorage.getItem('peopleData') || '[]');
            const person = people.find(p => p.id === personId);

            if (person && person.image_urls) {
                console.log(`נמצא באחסון מקומי: ${person.image_urls.length} תמונות`);
                return person.image_urls.length;
            }

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

        resetUploadModal();

        document.getElementById('upload-person-id').value = personId;

        const titleElement = document.querySelector('#upload-image-modal h3');
        if (titleElement) {
            titleElement.textContent = `העלאת תמונות עבור ${personName}`;
        }

        const currentImageCount = getPersonImageCount(personId);
        console.log(`📊 מספר תמונות נוכחי: ${currentImageCount}`);

        updateUploadProgress(currentImageCount);

        showModal(document.getElementById('upload-image-modal'));

        console.log('🎉 חלון העלאה נפתח בהצלחה');
    }

    function closeUploadModal() {
        console.log('❌ סוגר חלון העלאה');

        document.getElementById('upload-image-modal').classList.remove('active');
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

    // ===== UTILITY FUNCTIONS =====

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
        // Check if notification function exists in main.js
        if (typeof window.showNotification === 'function') {
            window.showNotification(message, type);
            return;
        }

        // Create notification container if it doesn't exist
        let container = document.querySelector('.notification-container');
        if (!container) {
            container = document.createElement('div');
            container.className = 'notification-container';
            container.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 10000;
                max-width: 400px;
            `;
            document.body.appendChild(container);
        }

        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.style.cssText = `
            padding: 15px 20px;
            margin-bottom: 10px;
            border-radius: 8px;
            color: white;
            font-weight: 500;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            animation: slideInRight 0.3s ease;
            position: relative;
            ${type === 'success' ? 'background: linear-gradient(135deg, #27ae60, #2ecc71);' : ''}
            ${type === 'error' ? 'background: linear-gradient(135deg, #e74c3c, #c0392b);' : ''}
            ${type === 'warning' ? 'background: linear-gradient(135deg, #f39c12, #e67e22);' : ''}
            ${type === 'info' ? 'background: linear-gradient(135deg, #3498db, #2980b9);' : ''}
        `;

        notification.innerHTML = `
            <span class="notification-message">${message}</span>
            <button class="notification-close" style="
                position: absolute;
                top: 5px;
                left: 5px;
                background: none;
                border: none;
                color: white;
                font-size: 18px;
                cursor: pointer;
                padding: 5px;
                line-height: 1;
            ">&times;</button>
        `;

        container.appendChild(notification);

        // Add close functionality
        const closeBtn = notification.querySelector('.notification-close');
        const autoClose = setTimeout(() => closeNotification(notification), 5000);

        function closeNotification() {
            notification.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
                clearTimeout(autoClose);
            }, 300);
        }

        closeBtn.addEventListener('click', closeNotification);

        // Add CSS animations if not already added
        if (!document.querySelector('#notification-animations')) {
            const style = document.createElement('style');
            style.id = 'notification-animations';
            style.textContent = `
                @keyframes slideInRight {
                    from {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(0);
                        opacity: 1;
                    }
                }
                @keyframes slideOutRight {
                    from {
                        transform: translateX(0);
                        opacity: 1;
                    }
                    to {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                }
            `;
            document.head.appendChild(style);
        }
    }

    // Make showNotification globally available
    window.showNotification = showNotification;

    // ===== LEGACY TARGET UPLOAD HANDLERS =====
    // These are kept for backward compatibility with existing HTML

    async function handleTargetUpload(e) {
        e.preventDefault();

        const form = e.target;
        const fileInput = form.querySelector('#target-file');
        const resultDiv = document.getElementById('target-upload-result');
        const previewDiv = document.getElementById('target-preview');

        if (!fileInput || !fileInput.files.length) {
            showNotification('נא לבחור קבצים', 'error');
            return;
        }

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
        for (const file of fileInput.files) {
            formData.append('target_images', file);
        }

        if (resultDiv) {
            resultDiv.textContent = `📡 מעלה ${fileInput.files.length} קבצים נוספים...`;
        }
        if (previewDiv) {
            previewDiv.innerHTML = '';
        }

        try {
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

                if (resultDiv) {
                    resultDiv.innerHTML = `
                        <span style="color: green;">✅ ${data.uploaded_count} קבצים הועלו בהצלחה</span><br>
                        <small>סה"כ תמונות במערכת: ${newCount}</small>
                    `;
                }

                form.reset();
                await loadTargetImages();

            } else {
                showNotification(data.error || 'שגיאה בהעלאת קבצים', 'error');
                if (resultDiv) {
                    resultDiv.innerHTML = `<span style="color: red;">❌ שגיאה: ${data.error}</span>`;
                }
            }
        } catch (error) {
            console.error('שגיאה בהעלאת קבצים:', error);
            showNotification('שגיאה בהעלאת קבצים', 'error');
            if (resultDiv) {
                resultDiv.innerHTML = `<span style="color: red;">שגיאת תקשורת: ${error.message}</span>`;
            }
        }
    }

    async function handleMultipleTargetUpload() {
        const fileInput = document.getElementById('target-images');

        if (!fileInput || !fileInput.files.length) {
            showNotification('נא לבחור קבצים', 'error');
            return;
        }

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

        showNotification(`מעלה ${fileInput.files.length} תמונות נוספות (יש כבר ${existingCount} תמונות)...`, 'info');

        try {
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

                fileInput.value = '';
                await loadTargetImages();
            } else {
                showNotification(data.error || 'שגיאה בהעלאת קבצים', 'error');
            }
        } catch (error) {
            console.error('שגיאה בהעלאת קבצים:', error);
            showNotification('שגיאה בהעלאת קבצים', 'error');
        }
    }

    async function deleteSelectedTargetImages() {
        const selected = [...document.querySelectorAll('.image-checkbox:checked')];
        const publicIds = selected.map(cb => cb.getAttribute('data-public-id'));

        if (!publicIds.length) {
            showNotification('לא נבחרו תמונות למחיקה', 'error');
            return;
        }

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
                await loadTargetImages();
            } else {
                showNotification(data.error || 'שגיאה במחיקה', 'error');
            }
        } catch (error) {
            console.error('שגיאה במחיקה:', error);
            showNotification('שגיאה במחיקה', 'error');
        }
    }

    // Initialize everything
    initialize();
});