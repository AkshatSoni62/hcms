import {
    fetchComplaints,
    createComplaint,
    updateComplaint,
    deleteComplaint,
    upvoteComplaint,
    fetchCommentsByComplaint,
    addComment
} from './api.js';
import { createStatusBadge, formatDateTime } from './ui.js';

export async function loadComplaintsInto(containerId, currentUser, options = {}) {
    const container = document.getElementById(containerId);
    if (!container) {
        return;
    }
    container.innerHTML = 'Loading complaints...';
    try {
        const complaints = await fetchComplaints();
        container.innerHTML = '';
        complaints.forEach(complaint => {
            if (options.onlyMine && complaint.user && complaint.user.id !== currentUser.id) {
                return;
            }
            const row = document.createElement('div');
            row.className = 'card-row';

            const main = document.createElement('div');
            main.className = 'card-row-main';
            const title = document.createElement('div');
            title.className = 'card-row-title';
            title.textContent = complaint.title || 'Untitled complaint';
            main.appendChild(title);

            const meta = document.createElement('div');
            meta.className = 'card-row-meta';
            const author = complaint.user ? complaint.user.fullName : 'Unknown';
            meta.textContent = `By ${author} • ${formatDateTime(complaint.createdAt)}`;
            main.appendChild(meta);

            // Admin view: show entered/stored complaint address
            if (options.isAdmin) {
                const addr = complaint.locationAddress || complaint.hospitalLocation || 'Location not provided';
                const locationMeta = document.createElement('div');
                locationMeta.className = 'card-row-meta';
                locationMeta.style.marginTop = '8px';
                locationMeta.style.display = 'block';
                locationMeta.innerHTML = `
                    <div style="font-weight: 600; margin-bottom: 4px;">
                        <i class="fas fa-map-marker-alt" style="margin-right: 6px;"></i>Address
                    </div>
                    <div style="font-size: 12px; line-height: 1.5;">${escapeHtml(addr)}</div>
                `;
                main.appendChild(locationMeta);
            }

            const commentsContainer = document.createElement('div');
            commentsContainer.className = 'comment-list';
            commentsContainer.dataset.complaintId = String(complaint.id);

            const commentForm = document.createElement('form');
            commentForm.className = 'form';
            commentForm.innerHTML = `
                <div class="form-row" style="display: flex; gap: 8px; margin-top: 12px;">
                    <div class="form-group" style="flex:1; margin-bottom: 0;">
                        <input type="text" class="form-control" placeholder="Add a comment..." required style="padding: 8px 12px; font-size: 13px;" />
                    </div>
                    <button type="submit" class="btn-submit" style="width: auto; padding: 0 16px; font-size: 13px;">Comment</button>
                </div>
            `;

            main.appendChild(commentsContainer);
            main.appendChild(commentForm);

            const statusCol = document.createElement('div');
            const badge = createStatusBadge(complaint.status);
            statusCol.appendChild(badge);
            const upvoteInfo = document.createElement('div');
            upvoteInfo.className = 'card-row-meta';
            upvoteInfo.textContent = `Upvotes: ${complaint.upvoteCount || 0}`;
            statusCol.appendChild(upvoteInfo);

            const actions = document.createElement('div');
            actions.className = 'card-row-actions';

            // Admin action: open stored coordinates in map
            if (options.isAdmin) {
                const viewMapBtn = document.createElement('button');
                viewMapBtn.className = 'btn secondary-btn';
                viewMapBtn.innerHTML = '<i class="fas fa-map"></i> View on Map';
                const hasCoords = typeof complaint.latitude === 'number' && typeof complaint.longitude === 'number';
                if (!hasCoords) {
                    viewMapBtn.disabled = true;
                    viewMapBtn.title = 'No coordinates available for this complaint';
                    viewMapBtn.style.opacity = '0.6';
                    viewMapBtn.style.cursor = 'not-allowed';
                } else {
                    viewMapBtn.addEventListener('click', () => {
                        const url = `https://www.google.com/maps?q=${encodeURIComponent(complaint.latitude)},${encodeURIComponent(complaint.longitude)}`;
                        window.open(url, '_blank', 'noopener,noreferrer');
                    });
                }
                actions.appendChild(viewMapBtn);
            }

            const upvoteBtn = document.createElement('button');
            upvoteBtn.className = 'btn secondary-btn';
            upvoteBtn.textContent = 'Upvote';
            upvoteBtn.addEventListener('click', async () => {
                try {
                    await upvoteComplaint(complaint.id, currentUser.id);
                    await loadComplaintsInto(containerId, currentUser, options);
                } catch (e) {
                    console.error(e);
                    alert('Failed to upvote complaint.');
                }
            });
            actions.appendChild(upvoteBtn);

            const isOwner = complaint.user && complaint.user.id === currentUser.id;
            if (isOwner) {
                const editBtn = document.createElement('button');
                editBtn.className = 'btn secondary-btn';
                editBtn.textContent = 'Edit';
                editBtn.addEventListener('click', () => {
                    const newTitle = prompt('New title:', complaint.title || '');
                    const newDescription = prompt('New description:', complaint.description || '');
                    if (newTitle && newDescription) {
                        updateComplaint(complaint.id, currentUser.id, {
                            title: newTitle,
                            description: newDescription
                        }).then(() => loadComplaintsInto(containerId, currentUser, options))
                            .catch(err => {
                                console.error(err);
                                alert('Failed to update complaint.');
                            });
                    }
                });
                actions.appendChild(editBtn);

                const deleteBtn = document.createElement('button');
                deleteBtn.className = 'btn';
                deleteBtn.textContent = 'Delete';
                deleteBtn.style.background = '#fee2e2';
                deleteBtn.style.color = '#991b1b';
                deleteBtn.addEventListener('click', () => {
                    if (confirm('Delete this complaint?')) {
                        deleteComplaint(complaint.id, currentUser.id)
                            .then(() => loadComplaintsInto(containerId, currentUser, options))
                            .catch(err => {
                                console.error(err);
                                alert('Failed to delete complaint.');
                            });
                    }
                });
                actions.appendChild(deleteBtn);
            }

            if (options.showStatusControls && options.isAdmin) {
                const statusWrapper = document.createElement('div');
                statusWrapper.className = 'admin-status-control-wrapper';
                statusWrapper.style.marginTop = '8px';
                statusWrapper.style.display = 'flex';
                statusWrapper.style.alignItems = 'center';
                statusWrapper.style.gap = '12px';

                const statusGroup = document.createElement('div');
                statusGroup.className = 'status-action-group';
                
                const confirmGroup = document.createElement('div');
                confirmGroup.className = 'status-confirm-group';
                confirmGroup.style.display = 'none'; // hidden by default

                let stagedStatus = null;
                
                const statuses = [
                    { value: 'PENDING', icon: 'fa-clock', label: 'Pending' },
                    { value: 'IN_PROGRESS', icon: 'fa-spinner', label: 'Working' },
                    { value: 'RESOLVED', icon: 'fa-check-circle', label: 'Resolve' }
                ];

                statuses.forEach(s => {
                    const btn = document.createElement('button');
                    btn.className = `status-action-btn ${complaint.status === s.value ? 'active' : ''}`;
                    btn.dataset.status = s.value;
                    btn.title = s.label;
                    btn.innerHTML = `<i class="fas ${s.icon}"></i>`;
                    
                    btn.addEventListener('click', () => {
                        if (complaint.status === s.value) return;
                        
                        // Clear previous staged
                        statusGroup.querySelectorAll('.status-action-btn').forEach(b => b.classList.remove('staged'));
                        
                        if (stagedStatus === s.value) {
                            stagedStatus = null;
                            confirmGroup.style.display = 'none';
                        } else {
                            stagedStatus = s.value;
                            btn.classList.add('staged');
                            confirmGroup.style.display = 'flex';
                        }
                    });
                    statusGroup.appendChild(btn);
                });

                const confirmBtn = document.createElement('button');
                confirmBtn.className = 'status-confirm-btn confirm';
                confirmBtn.innerHTML = '<i class="fas fa-check"></i>';
                confirmBtn.title = 'Confirm Change';
                confirmBtn.onclick = () => {
                    if (stagedStatus) {
                        options.onChangeStatus(complaint.id, stagedStatus);
                    }
                };

                const cancelBtn = document.createElement('button');
                cancelBtn.className = 'status-confirm-btn cancel';
                cancelBtn.innerHTML = '<i class="fas fa-times"></i>';
                cancelBtn.title = 'Cancel';
                cancelBtn.onclick = () => {
                    stagedStatus = null;
                    statusGroup.querySelectorAll('.status-action-btn').forEach(b => b.classList.remove('staged'));
                    confirmGroup.style.display = 'none';
                };

                confirmGroup.appendChild(confirmBtn);
                confirmGroup.appendChild(cancelBtn);

                statusWrapper.appendChild(statusGroup);
                statusWrapper.appendChild(confirmGroup);
                statusCol.appendChild(statusWrapper);
            }

            row.appendChild(main);
            row.appendChild(statusCol);
            row.appendChild(actions);
            container.appendChild(row);

            // load comments
            loadCommentsForComplaint(complaint.id, commentsContainer);

            commentForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const input = commentForm.querySelector('input');
                const content = input.value.trim();
                if (!content) {
                    return;
                }
                try {
                    await addComment(currentUser.id, complaint.id, content);
                    input.value = '';
                    await loadCommentsForComplaint(complaint.id, commentsContainer);
                } catch (err) {
                    console.error(err);
                    alert('Failed to add comment.');
                }
            });
        });

        if (container.innerHTML === '') {
            container.innerHTML = '<p>No complaints found.</p>';
        }
    } catch (err) {
        console.error(err);
        container.innerHTML = '<p>Failed to load complaints.</p>';
    }
}

async function loadCommentsForComplaint(complaintId, container) {
    if (!container) {
        return;
    }
    container.innerHTML = '';
    try {
        const comments = await fetchCommentsByComplaint(complaintId);
        comments.forEach(comment => {
            const item = document.createElement('div');
            item.className = 'comment-item';
            const author = comment.user ? comment.user.fullName : 'User';
            item.innerHTML = `<span class="comment-author">${author}:</span> <span class="comment-content">${comment.content}</span>`;
            container.appendChild(item);
        });
    } catch (err) {
        console.error(err);
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text ?? '';
    return div.innerHTML;
}

export async function handleCreateComplaint(formId, containerId, currentUser) {
    const form = document.getElementById(formId);
    if (!form) {
        return;
    }
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const titleInput = form.querySelector('input[type="text"]');
        const descInput = form.querySelector('textarea');
        const title = titleInput.value.trim();
        const description = descInput.value.trim();
        if (!title || !description) {
            return;
        }
        const categoryEl = form.querySelector('#patient-complaint-category');
        const severityEl = form.querySelector('#patient-complaint-severity');
        const category = categoryEl ? categoryEl.value : 'Other';
        const severity = severityEl ? severityEl.value : 'Medium';
        try {
            await createComplaint(currentUser.id, { title, description, category, severity });
            titleInput.value = '';
            descInput.value = '';
            await loadComplaintsInto(containerId, currentUser, { onlyMine: true });
        } catch (err) {
            console.error(err);
            alert('Failed to create complaint.');
        }
    });
}

