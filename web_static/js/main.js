
document.addEventListener('DOMContentLoaded', function() {
    let peopleData = [];

    function initialize() {
        initializeEventListeners();
        loadPeopleData();
        loadTargetImages();
    }

    function initializeEventListeners() {
        document.getElementById('add-person-btn')?.addEventListener('click', () => showModal(document.getElementById('add-person-modal')));
        document.getElementById('add-person-form')?.addEventListener('submit', handleAddPerson);
        document.getElementById('upload-image-form')?.addEventListener('submit', handleUploadImage);
        document.getElementById('search-people')?.addEventListener('input', filterPeopleTable);
        document.getElementById('finish-upload-button')?.addEventListener('click', function() {
            document.getElementById('upload-image-modal').classList.remove('active');
            loadPeopleData();
        });
        document.getElementById('person-image')?.addEventListener('change', function() {
            if (this.files && this.files[0]) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    document.getElementById('image-preview').src = e.target.result;
                };
                reader.readAsDataURL(this.files[0]);
            }
        });

        document.getElementById('target-upload-form')?.addEventListener('submit', handleTargetUpload);
        document.getElementById('delete-selected-btn')?.addEventListener('click', deleteSelectedTargetImages);
        document.querySelectorAll('.close-modal, .close-modal-btn').forEach(button => {
            button.addEventListener('click', () => {
                document.querySelectorAll('.modal').forEach(modal => modal.classList.remove('active'));
            });
        });
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
            formData.append('target_image', file);
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
        const imageUrls = []; // יש למלא מהשרת

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

    function showModal(modal) {
        if (modal) modal.classList.add('active');
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

    function filterPeopleTable() {} // מיותר כרגע
    function handleAddPerson() {} // מיותר כרגע
    function handleUploadImage() {} // מיותר כרגע
    function loadPeopleData() {} // מיותר כרגע

    initialize();
});
