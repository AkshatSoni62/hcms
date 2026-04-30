import { getLoggedInUser } from './storage.js';
import { injectSidebar } from './components/sidebar.js';
import {
    fetchComplaintsFiltered,
    upvoteComplaint,
    fetchCommentsByComplaint,
    addComment,
    upvoteComment,
    deleteComplaint,
    updateComplaint,
    updateComment,
    deleteComment
} from './api.js';
import { geocodeAddress, reverseGeocodeLatLng } from './api.js';
import { API_BASE } from './config.js';
import { createLocationPicker } from './location-picker.js';

let isFetching = false;

export async function loadFeed() {
    if (isFetching) return;
    const container = document.getElementById('feed-list');
    if (!container) return;

    isFetching = true;
    const user = JSON.parse(localStorage.getItem('hcmsUser'));
    if (!user) {
        window.location.href = 'login.html';
        return;
    }

    // Hide Submit Issue button for ADMIN
    const submitBtn = document.getElementById('open-complaint-modal');
    if (submitBtn) {
        submitBtn.style.display = user.role === 'ADMIN' ? 'none' : 'flex';
    }

    // URL Category support
    const urlParams = new URLSearchParams(window.location.search);
    const urlCategory = urlParams.get('category');
    const filterCategoryEl = document.getElementById('filter-category');
    if (urlCategory && filterCategoryEl && !filterCategoryEl.value) {
        filterCategoryEl.value = urlCategory;
    }

    const category = filterCategoryEl?.value || '';
    const status = document.getElementById('filter-status')?.value || '';
    const search = document.getElementById('feed-search')?.value || '';
    const sort = document.getElementById('filter-sort')?.value || 'recent';
    const params = { category, status, search, sort, userId: user.id };

    try {
        const complaints = await fetchComplaintsFiltered(params);
        container.innerHTML = ''; // Clear only right before rendering

        if (complaints.length === 0) {
            container.innerHTML = '<div style="text-align: center; padding: 40px; color: var(--text-muted);">No complaints found.</div>';
            return;
        }

        complaints.forEach(complaint => {
            const card = createFeedCard(complaint, user);
            container.appendChild(card);
        });

        // Handle highlighting
        const urlParams = new URLSearchParams(window.location.search);
        const highlightId = urlParams.get('highlight');
        if (highlightId) {
            setTimeout(() => {
                const target = document.querySelector(`.feed-post[data-id="${highlightId}"]`);
                if (target) {
                    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    target.classList.add('feed-post-highlight');
                }
            }, 500); // Small delay to ensure rendering
        }
    } catch (err) {
        console.error('Failed to load feed', err);
        container.innerHTML = '<div style="text-align: center; padding: 40px; color: var(--danger);">Failed to load feed. Please try again.</div>';
    } finally {
        isFetching = false;
    }
}

function createFeedCard(complaint, currentUser) {
    const card = document.createElement('div');
    card.className = 'modern-card feed-post';
    card.setAttribute('data-id', complaint.id);

    const timeAgo = formatTimeAgo(complaint.createdAt);
    const commentCount = complaint.commentCount || 0;
    const author = complaint.user || { fullName: 'Anonymous' };
    const statusClass = `status-${complaint.status}`;

    card.innerHTML = `
        <div class="post-header">
            <div class="post-user-img">
                <i class="fas fa-user-circle fa-2x" style="color: #cbd5e1;"></i>
            </div>
            <div class="post-user-info">
                <span class="name">${escapeHtml(author.fullName)}</span>
                <span class="time">${timeAgo}</span>
            </div>
            <div style="margin-left: auto; display: flex; align-items: center; gap: 12px;">
                <span class="status-badge ${statusClass}">${complaint.status}</span>
                
                ${(currentUser.role === 'ADMIN' || currentUser.id === complaint.user?.id) ? `
                    <div class="action-menu">
                        <button class="menu-trigger" title="Options">
                            <i class="fas fa-ellipsis-v"></i>
                        </button>
                        <div class="menu-dropdown">
                            ${(currentUser.id === complaint.user?.id && complaint.status === 'PENDING') ? `
                                <button class="menu-item edit-post-btn">
                                    <i class="fas fa-edit"></i> Edit
                                </button>
                            ` : ''}
                            <button class="menu-item danger delete-post-btn">
                                <i class="fas fa-trash-alt"></i> Delete
                            </button>
                        </div>
                    </div>
                ` : ''}
            </div>
        </div>
        <h3 class="post-title">${escapeHtml(complaint.title)}</h3>
        <p class="post-content">${escapeHtml(complaint.description)}</p>
        
        <div class="post-location-info" style="margin: 16px 0; display: flex; flex-direction: column; gap: 8px; padding: 12px 16px; background: rgba(0, 0, 0, 0.15); border-radius: 8px; border: 1px solid var(--border-color);">
            ${complaint.hospitalName ? `
            <div style="display: flex; align-items: center; gap: 12px;">
                <div style="background: rgba(59, 130, 246, 0.15); color: var(--primary); width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                    <i class="fas fa-hospital"></i>
                </div>
                <span style="font-size: 14px; font-weight: 600;"><span style="color: var(--text-muted); font-weight: 400;">Hospital Name:</span> ${escapeHtml(complaint.hospitalName)}</span>
            </div>` : ''}
            
            ${complaint.locationAddress ? `
            <a href="https://www.google.com/maps/search/?api=1&query=${complaint.latitude},${complaint.longitude}" target="_blank" class="location-link" style="display: flex; align-items: center; gap: 12px; text-decoration: none; color: var(--text-muted); transition: all 0.2s;" onmouseover="this.style.opacity='0.8'" onmouseout="this.style.opacity='1'">
                <div style="background: rgba(100, 116, 139, 0.15); color: inherit; width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                    <i class="fas fa-map-marker-alt"></i>
                </div>
                <span style="font-size: 13px; line-height: 1.4; flex: 1;">${escapeHtml(complaint.locationAddress)} &nbsp;&bull;&nbsp; <span style="color: var(--primary); font-weight: 500;">View Map</span></span>
            </a>` : ''}
        </div>

        ${(() => {
            if (!complaint.imageUrl) return '';
            const imgUrl = complaint.imageUrl.startsWith('http') ? complaint.imageUrl : `${API_BASE.replace('/api', '')}${complaint.imageUrl}`;
            return `<img src="${imgUrl}" class="post-media" alt="Post media">`;
        })()}
        
        <div class="post-actions">
            <button class="action-btn upvote-btn ${complaint.upvoted ? 'active' : ''}">
                <i class="fas fa-arrow-up"></i>
                <span class="upvote-count">${complaint.upvoteCount || 0}</span>
            </button>
            <button class="action-btn comment-btn">
                <i class="far fa-comment"></i>
                <span>${commentCount} Comments</span>
            </button>
        </div>
        
        <div class="comment-section" id="comments-${complaint.id}">
            <div class="comments-list" id="list-${complaint.id}">
                <!-- Comments injected here -->
            </div>
            <div class="comment-input-group" style="margin-top: 16px;">
                <input type="text" class="comment-input" placeholder="Write a comment..." id="input-${complaint.id}">
                <button class="action-btn send-comment-btn" title="Post Comment">
                    <i class="fas fa-paper-plane"></i>
                </button>
            </div>
        </div>
    `;

    // Dropdown Logic
    const trigger = card.querySelector('.menu-trigger');
    const dropdown = card.querySelector('.menu-dropdown');
    if (trigger && dropdown) {
        trigger.onclick = (e) => {
            e.stopPropagation();
            // Close all other dropdowns first
            document.querySelectorAll('.menu-dropdown.active').forEach(d => {
                if (d !== dropdown) d.classList.remove('active');
            });
            dropdown.classList.toggle('active');
        };
    }

    // Event Listeners
    const upvoteBtn = card.querySelector('.upvote-btn');
    upvoteBtn.onclick = async () => {
        try {
            const countSpan = upvoteBtn.querySelector('.upvote-count');
            const isActive = upvoteBtn.classList.contains('active');

            // Optimistic update
            if (isActive) {
                countSpan.textContent = Math.max(0, parseInt(countSpan.textContent) - 1);
                upvoteBtn.classList.remove('active');
            } else {
                countSpan.textContent = parseInt(countSpan.textContent) + 1;
                upvoteBtn.classList.add('active');
            }

            await upvoteComplaint(complaint.id, currentUser.id);
        } catch (e) {
            console.error('Upvote failed', e);
            loadFeed(); // Rollback on error
        }
    };

    const commentBtn = card.querySelector('.comment-btn');
    commentBtn.onclick = () => {
        const section = card.querySelector('.comment-section');
        const isVisible = section.style.display === 'block';
        section.style.display = isVisible ? 'none' : 'block';
        if (!isVisible) {
            loadComments(complaint.id);
        }
    };

    const sendBtn = card.querySelector('.send-comment-btn');
    sendBtn.onclick = async () => {
        const input = card.querySelector(`#input-${complaint.id}`);
        const content = input.value.trim();
        if (!content) return;

        try {
            await addComment(currentUser.id, complaint.id, content);
            input.value = '';
            loadComments(complaint.id);
            // Update count
            const countSpan = commentBtn.querySelector('span');
            const newCount = parseInt(countSpan.textContent) + 1;
            countSpan.textContent = `${newCount} Comments`;
        } catch (e) {
            console.error('Comment failed', e);
            alert('Failed to comment. Please try again.');
        }
    };

    const deleteBtn = card.querySelector('.delete-post-btn');
    if (deleteBtn) {
        deleteBtn.onclick = async () => {
            if (!confirm('Are you sure you want to delete this complaint? This cannot be undone.')) return;
            try {
                await deleteComplaint(complaint.id, currentUser.id);
                card.remove();
            } catch (e) {
                alert('Failed to delete: ' + e.message);
            }
        };
    }

    const editBtn = card.querySelector('.edit-post-btn');
    if (editBtn) {
        editBtn.onclick = () => {
            const modal = document.getElementById('complaint-modal');
            const form = document.getElementById('complaint-form');

            // Set for editing
            modal.setAttribute('data-editing-id', complaint.id);
            document.getElementById('comp-title').value = complaint.title;
            document.getElementById('comp-desc').value = complaint.description;
            if (document.getElementById('comp-hospital-name')) {
                document.getElementById('comp-hospital-name').value = complaint.hospitalName || '';
            }
            // Hide specific fields if they shouldn't be edited

            modal.style.display = 'flex';
        };
    }

    return card;
}

async function loadComments(complaintId) {
    const list = document.getElementById(`list-${complaintId}`);
    if (!list) return;

    list.innerHTML = '<div style="font-size: 12px; color: var(--text-muted); padding: 8px;">Loading comments...</div>';

    const user = JSON.parse(localStorage.getItem('hcmsUser'));

    try {
        const comments = await fetchCommentsByComplaint(complaintId, 'new', user.id);
        list.innerHTML = '';

        comments.forEach(comment => {
            const author = comment.user?.fullName || 'Anonymous';
            const authorId = comment.user?.id;
            const user = JSON.parse(localStorage.getItem('hcmsUser'));
            const firstLetter = author.charAt(0).toUpperCase();
            const div = document.createElement('div');
            div.className = 'comment-item';

            div.innerHTML = `
                <div class="comment-avatar">${firstLetter}</div>
                <div class="comment-bubble">
                    <div class="comment-author">
                        ${escapeHtml(author)}
                        ${comment.user?.role === 'ADMIN' ? '<span class="admin-tag">ADMIN</span>' : ''}
                    </div>
                    <div class="comment-text" id="comm-text-${comment.id}">${escapeHtml(comment.content)}</div>
                    
                    <div style="display: flex; gap: 12px; margin-top: 8px; align-items: center;">
                        <button class="action-btn comment-upvote-btn ${comment.upvoted ? 'active' : ''}" style="font-size: 11px;">
                            <i class="fas fa-arrow-up"></i>
                            <span class="comm-upvote-count">${comment.upvoteCount || 0}</span>
                        </button>
                    </div>

                    ${(user.role === 'ADMIN' || user.id === authorId) ? `
                        <div class="action-menu comment-menu">
                            <button class="menu-trigger">
                                <i class="fas fa-ellipsis-h"></i>
                            </button>
                            <div class="menu-dropdown">
                                ${user.id === authorId ? `
                                    <button class="menu-item edit-comment-btn">
                                        <i class="fas fa-edit"></i> Edit
                                    </button>
                                ` : ''}
                                <button class="menu-item danger delete-comment-btn">
                                    <i class="fas fa-trash-alt"></i> Delete
                                </button>
                            </div>
                        </div>
                    ` : ''}
                </div>
            `;

            // Comment Dropdown Logic
            const trigger = div.querySelector('.menu-trigger');
            const dropdown = div.querySelector('.menu-dropdown');
            if (trigger && dropdown) {
                trigger.onclick = (e) => {
                    e.stopPropagation();
                    document.querySelectorAll('.menu-dropdown.active').forEach(d => {
                        if (d !== dropdown) d.classList.remove('active');
                    });
                    dropdown.classList.toggle('active');
                };
            }

            // Comment Upvote
            const commUpvoteBtn = div.querySelector('.comment-upvote-btn');
            commUpvoteBtn.onclick = async () => {
                try {
                    const countSpan = commUpvoteBtn.querySelector('.comm-upvote-count');
                    const isActive = commUpvoteBtn.classList.contains('active');

                    // Optimistic update
                    if (isActive) {
                        countSpan.textContent = Math.max(0, parseInt(countSpan.textContent) - 1);
                        commUpvoteBtn.classList.remove('active');
                    } else {
                        countSpan.textContent = parseInt(countSpan.textContent) + 1;
                        commUpvoteBtn.classList.add('active');
                    }

                    const mod = await import('./api.js');
                    await mod.upvoteComment(comment.id, user.id);
                } catch (e) {
                    console.error('Comment upvote failed', e);
                    // loadComments(complaintId); // Too aggressive, maybe just reset locally
                }
            };

            // Comment Actions
            const deleteBtn = div.querySelector('.delete-comment-btn');
            if (deleteBtn) {
                deleteBtn.onclick = async () => {
                    if (!confirm('Delete this comment?')) return;
                    try {
                        const mod = await import('./api.js');
                        await mod.deleteComment(comment.id, user.id);
                        div.remove();
                    } catch (e) {
                        alert('Delete failed');
                    }
                };
            }

            const editBtn = div.querySelector('.edit-comment-btn');
            if (editBtn) {
                editBtn.onclick = () => {
                    const textDiv = div.querySelector(`#comm-text-${comment.id}`);
                    const original = textDiv.textContent;
                    const input = document.createElement('textarea');
                    input.className = 'comment-input';
                    input.style.width = '100%';
                    input.value = original;

                    const saveBtn = document.createElement('button');
                    saveBtn.className = 'action-btn send-comment-btn';
                    saveBtn.innerHTML = '<i class="fas fa-check"></i>';
                    saveBtn.style.marginTop = '8px';

                    textDiv.innerHTML = '';
                    textDiv.appendChild(input);
                    textDiv.appendChild(saveBtn);
                    dropdown.classList.remove('active');

                    saveBtn.onclick = async () => {
                        const newContent = input.value.trim();
                        if (!newContent) return;
                        try {
                            const mod = await import('./api.js');
                            await mod.updateComment(comment.id, user.id, newContent);
                            textDiv.textContent = newContent;
                        } catch (e) {
                            alert('Edit failed');
                            textDiv.textContent = original;
                        }
                    };
                };
            }

            list.appendChild(div);
        });

        if (comments.length === 0) {
            list.innerHTML = '<div style="font-size: 12px; color: var(--text-muted); padding: 8px;">No comments yet.</div>';
        }
    } catch (e) {
        list.innerHTML = '<div style="font-size: 12px; color: var(--danger); padding: 8px;">Failed to load comments.</div>';
    }
}

function formatTimeAgo(dateStr) {
    if (!dateStr) return 'just now';
    const date = new Date(dateStr);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000);

    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Initial Load
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('feed-list')) {
        injectSidebar('feed');
        loadFeed();

        // Setup Filter Listeners
        document.getElementById('filter-category')?.addEventListener('change', loadFeed);
        document.getElementById('filter-sort')?.addEventListener('change', loadFeed);
        document.getElementById('filter-status')?.addEventListener('change', loadFeed);

        let searchTimeout;
        document.getElementById('feed-search')?.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(loadFeed, 400);
        });

        // Setup Image Upload
        setupImageUpload();

        // Setup Location Picker (complaint modal)
        const complaintModal = document.getElementById('complaint-modal');
        const complaintForm = document.getElementById('complaint-form');

        const locationPicker = createLocationPicker({
            mapEl: document.getElementById('complaint-map'),
            addressInput: document.getElementById('comp-location-address'),
            latInput: document.getElementById('comp-location-lat'),
            lngInput: document.getElementById('comp-location-lng'),
            coordsEl: document.getElementById('complaint-location-coords'),
            loadingEl: document.getElementById('complaint-location-loading'),
            errorEl: document.getElementById('complaint-location-error'),
            recenterBtn: document.getElementById('complaint-recenter-btn')
        });

        const addressInput = document.getElementById('comp-location-address');
        const useCurrentBtn = document.getElementById('complaint-use-current-location-btn');
        const locErrorEl = document.getElementById('complaint-location-error');
        const showLocError = (msg) => {
            if (!locErrorEl) return;
            if (!msg) {
                locErrorEl.style.display = 'none';
                locErrorEl.textContent = '';
                return;
            }
            locErrorEl.style.display = 'block';
            locErrorEl.textContent = msg;
        };

        // The scheduleGeocode logic was replaced by internal location-picker autocomplete.

        // Use Current Location button
        if (useCurrentBtn) {
            useCurrentBtn.addEventListener('click', async () => {
                locationPicker.recenterToCurrentLocation();
            });
        }

        // Open modal + reset form (kept here so we can also open the map correctly)
        const openModalBtn = document.getElementById('open-complaint-modal');
        if (openModalBtn) {
            openModalBtn.onclick = async () => {
                if (complaintForm) complaintForm.reset();
                locationPicker.reset();
                showLocError('');

                const fileInput = document.getElementById('comp-image');
                if (fileInput) fileInput.value = '';
                const placeholder = document.getElementById('upload-placeholder');
                if (placeholder) placeholder.style.display = 'flex';
                const preview = document.getElementById('upload-preview');
                if (preview) preview.style.display = 'none';
                const img = document.getElementById('preview-img');
                if (img) img.src = '';

                if (complaintModal) complaintModal.style.display = 'flex';
                await locationPicker.open({ autoLocate: true });
            };
        }

        // Handle Complaint Submission
        if (complaintForm) {
            complaintForm.onsubmit = async (e) => {
                e.preventDefault();
                const user = JSON.parse(localStorage.getItem('hcmsUser'));
                const modal = document.getElementById('complaint-modal');
                const editingId = modal.getAttribute('data-editing-id');

                // Validation: location must not be empty; ensure we have lat/lng by geocoding if needed
                const loc = locationPicker.getValue();
                if (!loc.address || !loc.address.trim()) {
                    showLocError('Location field must not be empty.');
                    return;
                }
                if (loc.latitude == null || loc.longitude == null) {
                    try {
                        const res = await geocodeAddress(loc.address.trim());
                        locationPicker.setValue({
                            address: res.formattedAddress || loc.address.trim(),
                            latitude: res.latitude,
                            longitude: res.longitude
                        });
                    } catch (e2) {
                        showLocError('Invalid address, please enter a valid location');
                        return;
                    }
                }

                const locFinal = locationPicker.getValue();
                const payload = {
                    title: document.getElementById('comp-title').value,
                    description: document.getElementById('comp-desc').value,
                    category: document.getElementById('comp-category').value,
                    severity: document.getElementById('comp-severity').value,
                    hospitalName: document.getElementById('comp-hospital-name').value,
                    // Location fields (backend stores these on Complaint)
                    locationAddress: locFinal.address,
                    latitude: locFinal.latitude,
                    longitude: locFinal.longitude,
                    // Backwards-compatible: keep hospitalLocation populated for filtering/search if needed
                    hospitalLocation: locFinal.address
                };

                try {
                    const mod = await import('./api.js');
                    if (editingId) {
                        await mod.updateComplaint(editingId, user.id, payload);
                        alert('Complaint updated successfully!');
                    } else {
                        const saved = await mod.createComplaint(user.id, payload);
                        const fileInput = document.getElementById('comp-image');
                        if (fileInput && fileInput.files[0]) {
                            await mod.uploadComplaintImage(saved.id, fileInput.files[0]);
                        }
                        alert('Complaint submitted successfully!');
                    }

                    modal.style.display = 'none';
                    modal.removeAttribute('data-editing-id');
                    complaintForm.reset();
                    locationPicker.reset();
                    loadFeed();
                } catch (err) {
                    console.error(err);
                    alert('Failed to save complaint: ' + err.message);
                }
            };
        }

        // Dynamic Polling: Refresh feed every 30 seconds
        setInterval(loadFeed, 30000);

        // Global Click Listener to close dropdowns
        window.addEventListener('click', () => {
            document.querySelectorAll('.menu-dropdown.active').forEach(d => {
                d.classList.remove('active');
            });
        });
    }
});

function setupImageUpload() {
    const uploadArea = document.getElementById('image-upload-area');
    const fileInput = document.getElementById('comp-image');
    const placeholder = document.getElementById('upload-placeholder');
    const previewContainer = document.getElementById('upload-preview');
    const previewImg = document.getElementById('preview-img');
    const removeBtn = document.getElementById('remove-image-btn');

    if (!uploadArea || !fileInput) return;

    // Trigger file selection when clicking the area
    uploadArea.addEventListener('click', (e) => {
        if (e.target !== removeBtn && e.target !== removeBtn.querySelector('i')) {
            fileInput.click();
        }
    });

    // Handle file selection
    fileInput.addEventListener('change', handleFile);

    // Drag and Drop
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('dragover');
    });

    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('dragover');
    });

    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            fileInput.files = e.dataTransfer.files;
            handleFile();
        }
    });

    // Remove image
    removeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        fileInput.value = '';
        placeholder.style.display = 'flex';
        previewContainer.style.display = 'none';
        previewImg.src = '';
    });

    function handleFile() {
        const file = fileInput.files[0];
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (e) => {
                previewImg.src = e.target.result;
                placeholder.style.display = 'none';
                previewContainer.style.display = 'block';
            };
            reader.readAsDataURL(file);
        }
    }
}
