document.addEventListener('DOMContentLoaded', function() {
    // Global variable to hold the people data
    let peopleData = [];

    // --- Main setup function ---
    function initialize() {
        initializeEventListeners();
        loadPeopleData();
    }

    // --- All event listeners setup ---
    function initializeEventListeners() {
        // People management buttons
        document.getElementById('add-person-btn')?.addEventListener('click', () => showModal(document.getElementById('add-person-modal')));
        document.getElementById('add-person-form')?.addEventListener('submit', handleAddPerson);
        document.getElementById('upload-image-form')?.addEventListener('submit', handleUploadImage);
        document.getElementById('search-people')?.addEventListener('input', filterPeopleTable);
        document.getElementById('target-upload-form')?.addEventListener('submit', handleSingleTargetUpload);
        document.getElementById('upload-more-btn')?.addEventListener('click', handleTargetUpload);



        // Close modals
        document.querySelectorAll('.close-modal, .close-modal-btn').forEach(button => {
            button.addEventListener('click', () => {
                document.querySelectorAll('.modal').forEach(modal => modal.classList.remove('active'));
            });
        });

        // The "Finish" button in the upload modal
        document.getElementById('finish-upload-button')?.addEventListener('click', function() {
            document.getElementById('upload-image-modal').classList.remove('active');
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
        // העלאת תמונות ל-target
document.getElementById('target-upload-form')?.addEventListener('submit', handleTargetUpload);

// מחיקת תמונות נבחרות
document.getElementById('delete-selected-btn')?.addEventListener('click', deleteSelectedTargetImages);

// טען תמונות מ-Cloudinary
loadTargetImages();


    }

    // ===== Data Loading and Rendering Functions =====

    async function loadPeopleData() {
        try {
            const response = await fetch('/api/get_loaded_people');
            const data = await response.json();

            if (data.success && data.people) {
                peopleData = data.people;
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
  const files = document.getElementById('target-images').files;
  if (!files.length) {
    showNotification('נא לבחור קבצים', 'error');
    return;
  }

  const formData = new FormData();
  for (const file of files) {
    formData.append('target_image', file); // יש להחליף ל־target_images[] אם אתה תומך בשרת
  }

  try {
    const response = await fetch('/api/start_check', { method: 'POST', body: formData });
    const data = await response.json();
    if (data.success) {
      showNotification('תמונה הועלתה בהצלחה', 'success');
      loadTargetImages();
    } else {
      showNotification(data.error, 'error');
    }
  } catch (error) {
    showNotification('שגיאה בהעלאת קבצים', 'error');
  }
}

async function loadTargetImages() {
  const gallery = document.getElementById('target-gallery');
  gallery.innerHTML = '';
  // תכתוב כאן שאיבה של קישורים מ-Cloudinary (למשל תגיב עם רשימה מהשרת או תשתמש ב-API)
  const imageUrls = []; // זמנית - תמלא עם כתובות משרת או קובץ JSON

  imageUrls.forEach((url, i) => {
    const card = document.createElement('div');
    card.className = 'image-card';
    card.innerHTML = `
      <input type="checkbox" class="image-checkbox" data-url="${url}">
      <img src="${url}" alt="target ${i}">
    `;
    gallery.appendChild(card);
  });
}

async function deleteSelectedTargetImages() {
  const selected = [...document.querySelectorAll('.image-checkbox:checked')].map(cb => cb.getAttribute('data-url'));
  if (!selected.length) {
    showNotification('לא נבחרו תמונות למחיקה', 'error');
    return;
  }

  const confirmed = confirm(`האם למחוק ${selected.length} תמונות?`);
  if (!confirmed) return;

  try {
    const response = await fetch('/api/delete_target_images', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ urls: selected })
    });
    const data = await response.json();
    if (data.success) {
      showNotification('תמונות נמחקו', 'success');
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

    // This is one of the missing functions
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

    // This is another missing function
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

                document.getElementById('upload-person-id').value = data.person_id;
                updateUploadProgress(0);
                showModal(document.getElementById('upload-image-modal'));
            } else {
                showNotification(data.error, 'error');
            }
        } catch (error) {
            showNotification('שגיאה בהוספת אדם', 'error');
        }
    }

    async function handleUploadImage(event) {
        event.preventDefault();
        const personId = document.getElementById('upload-person-id').value;
        const fileInput = document.getElementById('person-image');
        if (!fileInput.files.length) {
            showNotification('נא לבחור קובץ', 'error');
            return;
        }
        const formData = new FormData();
        formData.append('image', fileInput.files[0]);

        try {
            const response = await fetch(`/api/upload_image/${personId}`, { method: 'POST', body: formData });
            const data = await response.json();
            if (data.success) {
                showNotification(data.message, 'success');
                updateUploadProgress(data.image_count);

                document.getElementById('upload-image-form').reset();
                document.getElementById('image-preview').src = '/web_static/img/person-placeholder.jpg';

                if (!data.can_add_more) {
                    document.getElementById('upload-image-modal').classList.remove('active');
                    await loadPeopleData();
                } else if (data.image_count >= 3) {
                    document.getElementById('finish-upload-button').style.display = 'inline-block';
                }
            } else {
                showNotification(data.error, 'error');
            }
        } catch (error) {
            showNotification('שגיאה בהעלאת תמונה', 'error');
        }
    }

    // This is one of the missing functions
    function handleUploadClick(event) {
    const personId = event.currentTarget.getAttribute('data-id');
    const person = peopleData.find(p => p.id === personId);
    if (!person) return;

    document.getElementById('upload-person-id').value = personId;
    updateUploadProgress(person.image_count || 0);
    showModal(document.getElementById('upload-image-modal'));
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

    function updateUploadProgress(currentCount) {
        const statusEl = document.getElementById('upload-status');
        const finishBtn = document.getElementById('finish-upload-button');
        if (!statusEl || !finishBtn) return;
        for (let i = 1; i <= 5; i++) {
            const step = document.getElementById(`progress-step-${i}`);
            if(!step) continue;
            step.classList.toggle('completed', i <= currentCount);
            step.classList.toggle('active', i === currentCount + 1);
        }
        const remaining = Math.max(0, 3 - currentCount);
        if (currentCount >= 5) {
            statusEl.textContent = `הגעת למקסימום של 5 תמונות.`;
            finishBtn.style.display = 'inline-block';
        } else if (remaining > 0) {
            statusEl.textContent = `הועלו ${currentCount} תמונות. נדרשות עוד ${remaining} תמונות לפחות.`;
            finishBtn.style.display = 'none';
        } else {
            statusEl.textContent = `הועלו ${currentCount} תמונות. ניתן להוסיף עוד ${5-currentCount} או לסיים.`;
            finishBtn.style.display = 'inline-block';
        }
    }

    function showModal(modal) {
        if(modal) modal.classList.add('active');
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


    function handleSingleTargetUpload(e) {
  e.preventDefault();
  const form = e.target;
  const fileInput = form.querySelector('input[type="file"]');
  const resultDiv = document.getElementById('target-upload-result');
  const previewDiv = document.getElementById('target-preview');
  const formData = new FormData(form);

  resultDiv.textContent = '📡 מעלה קובץ...';
  previewDiv.innerHTML = '';

  fetch('/api/start_check', {
    method: 'POST',
    body: formData
  }).then(response => response.json()).then(data => {
    if (data.success) {
      resultDiv.innerHTML = `<span style="color: green;">✅ קובץ הועלה בהצלחה</span><br><a href="${data.target_url}" target="_blank">צפייה בקובץ</a>`;
      if (data.target_url.match(/\.(jpg|jpeg|png|webp)$/)) {
        previewDiv.innerHTML = `<img src="${data.target_url}" style="max-width: 100%; margin-top: 10px; border-radius: 12px; box-shadow: 0 0 8px rgba(0,0,0,0.2);">`;
      } else if (data.target_url.match(/\.(mp4|webm)$/)) {
        previewDiv.innerHTML = `<video controls style="max-width: 100%; margin-top: 10px; border-radius: 12px; box-shadow: 0 0 8px rgba(0,0,0,0.2);"><source src="${data.target_url}"></video>`;
      }
    } else {
      resultDiv.innerHTML = `<span style="color: red;">❌ שגיאה: ${data.error}</span>`;
    }
  }).catch(error => {
    resultDiv.innerHTML = `<span style="color: red;">שגיאת תקשורת: ${error.message}</span>`;
  });
}


    // Initial load when the DOM is ready
    initialize();

});