const MBTI_TYPES = ['INFJ', 'INFP', 'INTJ', 'INTP', 'ISFJ', 'ISFP', 'ISTJ', 'ISTP', 'ENFJ', 'ENFP', 'ENTJ', 'ENTP', 'ESFJ', 'ESFP', 'ESTJ', 'ESTP'];
const MAX_CHARS = 20;
const INVITATION_TYPES = [
  { value: 'play/sports', label: 'Sports/Play' },
  { value: 'teammate finding', label: 'Teammate Finding' },
  { value: 'tutoring', label: 'Tutoring' },
  { value: 'other', label: 'Other' }
];
const MAX_TITLE_LENGTH = 100;
const MAX_DESCRIPTION_LENGTH = 300;
const DESCRIPTION_TRUNCATE_LENGTH = 50;

let invitationsSort = 'event';
let myInvitationsSort = 'event';
let joinedInvitationsSort = 'event';
let invitationsFilter = null;

function getTokenExpiry() {
  const token = localStorage.getItem('token');
  if (!token) return null;
  try {
    const payload = token.split('.')[1];
    const decoded = JSON.parse(atob(payload));
    return decoded.exp * 1000;
  } catch {
    return null;
  }
}

function escapeHtml(text) {
  if (typeof text !== 'string') return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

const typeBadgeClasses = {
  'play/sports': 'badge-type-sports',
  'teammate finding': 'badge-type-teammate',
  'tutoring': 'badge-type-tutoring',
  'other': 'badge-type-other'
};

function getTypeLabel(type) {
  const t = INVITATION_TYPES.find(x => x.value === type);
  return t ? t.label : type;
}

const pages = {
  invitations: {
    title: "Invitations",
    render: renderInvitationsPage
  },
  joined: {
    title: "Ongoing",
    render: renderJoinedPage
  },
  account: {
    title: "Profile",
    render: renderAccountPage
  }
};

function getAuthHeader() {
  const token = localStorage.getItem('token');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
}

function truncateText(text, maxLength) {
  if (text.length <= maxLength) return { text, truncated: false };
  return { text: text.substring(0, maxLength) + '...', truncated: true };
}

function countWords(text) {
  if (!text) return 0;
  const chineseChars = (text.match(/[\u4e00-\u9fff]/g) || []).length;
  const englishWords = text.replace(/[\u4e00-\u9fff]/g, '').split(/\s+/).filter(w => w).length;
  return chineseChars + englishWords;
}

function renderUserTypeBadge(userType, personalityType) {
  const safeType = escapeHtml(userType || 'normal');
  const safeMbti = escapeHtml(personalityType || 'N/A');

  if (safeType === 'verified') {
    return'<span class="badge badge-verified">Verified</span>';
  }
  if (safeType === 'organization') {
    return'<span class="badge badge-organization">Organization</span>';
  }
  return `<span class="user-type-mbti">${safeMbti}</span>`;
}

function createInvitationCard(invitation, isOwn = false, showChat = false, showReport = false) {
  const { text: truncatedDesc, truncated } = truncateText(invitation.description, DESCRIPTION_TRUNCATE_LENGTH);

  const safeInvitation = {
    ...invitation,
    title: escapeHtml(invitation.title),
    description: escapeHtml(invitation.description),
    username: escapeHtml(invitation.username || 'Unknown'),
    personality_type: escapeHtml(invitation.personality_type || 'N/A'),
    user_type: escapeHtml(invitation.user_type || 'normal')
  };

  const isInviterPrivileged = invitation.user_type === 'verified' || invitation.user_type === 'organization';

  const descriptionHtml = truncated
    ? `<p class="card-desc cursor-pointer expand-desc" data-inv='${JSON.stringify(safeInvitation).replace(/'/g, "&#39;")}'>${truncatedDesc} <span class="card-desc-more">View More</span></p>`
    : `<p class="card-desc">${truncatedDesc}</p>`;

  let timeHtml = '';
  if (invitation.event_start && invitation.event_end) {
    const cstOpts = { timeZone: 'Asia/Shanghai', year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false };
    const startDate = new Date(invitation.event_start);
    const endDate = new Date(invitation.event_end);
    const startStr = startDate.toLocaleString('zh-CN', cstOpts);
    const endStr = endDate.toLocaleString('zh-CN', cstOpts);
    timeHtml = `<p class="card-meta"><strong>Time:</strong> ${startStr} - ${endStr}</p>`;
  }

  let participantsHtml = '';
  const joinedCount = (invitation.joined_count || 0) + (isInviterPrivileged ? 0 : 1);
  if (invitation.max_participants !== undefined && invitation.max_participants !== null) {
    const isFull = joinedCount >= invitation.max_participants;
    participantsHtml = `<p class="card-meta"><strong>Participants:</strong> ${joinedCount}/${invitation.max_participants}${isFull ? ' (Full)' : ''}</p>`;
  } else if (invitation.max_participants === null) {
    participantsHtml = `<p class="card-meta"><strong>Participants:</strong> ${joinedCount}/∞</p>`;
  }

  let actionButtons = '';
  if (isOwn) {
    actionButtons = `
      <div class="card-manage-actions">
        <button class="chat-btn" data-id="${invitation.id}" data-title="${escapeHtml(invitation.title)}">Temp Chat</button>
        <button class="members-btn" data-id="${invitation.id}" data-title="${escapeHtml(invitation.title)}">Members</button>
        <button class="delete-btn" data-id="${invitation.id}">Delete</button>
      </div>`;
  } else if (showChat) {
    actionButtons = `
      <div class="card-manage-actions">
        <button class="chat-btn" data-id="${invitation.id}" data-title="${escapeHtml(invitation.title)}">Temp Chat</button>
        <button class="members-btn" data-id="${invitation.id}" data-title="${escapeHtml(invitation.title)}">Members</button>
        <button class="leave-btn" data-id="${invitation.id}">Leave</button>
      </div>`;
  } else {
    const isFull = invitation.max_participants !== null && invitation.max_participants !== undefined && joinedCount >= invitation.max_participants;
    const reportBtn = showReport ? `<button class="report-btn" data-id="${invitation.id}">Report</button>` : '';
    actionButtons = `
      <div class="card-actions">
        ${isFull
          ? `<button class="join-btn" disabled data-id="${invitation.id}">Full</button>`
          : `<button class="join-btn" data-id="${invitation.id}">Join</button>`}
        ${reportBtn}
      </div>`;
  }

  return `
    <div class="dashboard-invitation-card">
      <h3>${safeInvitation.title}</h3>
      ${descriptionHtml}
      <p class="card-meta"><strong>Type:</strong> ${getTypeLabel(invitation.type)}</p>
      ${timeHtml}
      ${participantsHtml}
      <p class="card-meta"><strong>Organizer:</strong> @${safeInvitation.username} ${renderUserTypeBadge(safeInvitation.user_type, safeInvitation.personality_type)}</p>
      ${actionButtons}
    </div>
  `;
}

let currentUserId = null;
let currentUsername = null;
let currentUserType = null;
let socket = null;
let currentChatInvitationId = null;
let accountOriginalValues = null;

function checkForChanges() {
  const usernameEl = document.getElementById('username');
  const passwordEl = document.getElementById('password');
  const personalityEl = document.getElementById('personalityType');
  const fullNameEl = document.getElementById('fullName');
  const gradeEl = document.getElementById('grade');
  const classEl = document.getElementById('classField');
  const saveBtn = document.getElementById('saveBtn');
  if (!usernameEl || !passwordEl || !saveBtn) return;

  const currentUsername = usernameEl.value.trim();
  const currentPassword = passwordEl.value;
  const currentPersonality = personalityEl ? personalityEl.value : '';
  const currentFullName = fullNameEl ? fullNameEl.value.trim() : '';
  const currentGrade = gradeEl ? gradeEl.value.trim() : '';
  const currentClass = classEl ? classEl.value.trim() : '';

  const hasChanges = currentUsername !== accountOriginalValues.username ||
                     currentPassword !== accountOriginalValues.password ||
                     currentPersonality !== accountOriginalValues.personalityType ||
                     currentFullName !== accountOriginalValues.fullName ||
                     currentGrade !== accountOriginalValues.grade ||
                     currentClass !== accountOriginalValues.classField;

  if (hasChanges) {
    saveBtn.className = 'w-full btn btn-danger text-sm py-2';
    saveBtn.textContent = '* Save Changes*';
  } else {
    saveBtn.className = 'w-full btn btn-primary text-sm py-2';
    saveBtn.textContent = ' Save Changes';
  }
}

function initSocket() {
  socket = io();
  socket.on('connect', () => {
    console.log('Socket connected');
    const token = localStorage.getItem('token');
    if (token) {
      socket.emit('authenticate', token);
    }
  });
  socket.on('new_message', (data) => {
    if (currentChatInvitationId == data.invitationId) {
      appendMessageToChat(data);
    }
  });
  socket.on('user_joined', (data) => {
    if (currentChatInvitationId == data.invitationId) {
      updateChatUsers();
    }
  });
  socket.on('user_left', (data) => {
    if (currentChatInvitationId == data.invitationId) {
      appendMessageToChat({
        userId: 0,
        username: data.username,
        content: `__SYSTEM__:${data.username} left the invitation`,
        created_at: new Date().toISOString()
      });
    }
  });
  socket.on('error', (data) => {
    console.error('Socket error:', data.message);
    alert(data.message || 'Chat error');
  });
}

function getCurrentUser() {
  if (currentUserId) return Promise.resolve({ id: currentUserId, username: currentUsername, user_type: currentUserType });
  return fetch('/api/account', { headers: getAuthHeader() })
    .then(res => res.json())
    .then(user => {
      currentUserId = user.id;
      currentUsername = user.username;
      currentUserType = user.user_type || 'normal';
      return user;
    });
}

function renderInvitationsPage() {
  const container = document.getElementById('page-description');
  container.innerHTML ='<div class="dashboard-empty">Loading invitations...</div>';
  loadInvitationsList();
}

function loadInvitationsList() {
  const container = document.getElementById('page-description');

  Promise.all([
    fetch(`/api/invitations?sort=${invitationsSort}`, { headers: getAuthHeader() }).then(res => res.json()),
    getCurrentUser()
  ])
    .then(([invitations, user]) => {
      const filtered = invitationsFilter
        ? invitations.filter(inv => inv.type === invitationsFilter)
        : invitations;

      if (filtered.length === 0) {
        const emptyMessage = invitationsFilter
          ? 'No matching invitations for this category.'
          : 'No invitations yet. Be the first to post one!';
        container.innerHTML = `<p class="dashboard-empty">${emptyMessage}</p>`;
        return;
      }

      container.innerHTML = `
        <div class="dashboard-invitation-grid">
          ${filtered.map(inv => {
            const isOwn = inv.username === user.username;
            return createInvitationCard(inv, isOwn, false, !isOwn);
          }).join('')}
        </div>
      `;

      attachInvitationListeners(container);
    })
    .catch(err => {
      console.error(err);
      container.innerHTML ='<p class="dashboard-empty">Error loading invitations</p>';
    });
}

function attachInvitationListeners(container) {
  container.querySelectorAll('.join-btn').forEach(btn => {
    btn.addEventListener('click', handleJoin);
  });

  container.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', (e) => handleDelete(e, 'invitations'));
  });

  container.querySelectorAll('.report-btn').forEach(btn => {
    btn.addEventListener('click', handleReport);
  });

  container.querySelectorAll('.expand-desc').forEach(el => {
    el.addEventListener('click', function() {
      const inv = JSON.parse(this.dataset.inv.replace(/&#39;/g, "'"));
      showInviteModal(inv);
    });
  });

  container.querySelectorAll('.chat-btn').forEach(btn => {
    btn.addEventListener('click', (e) => openChatModal(e));
  });

  container.querySelectorAll('.members-btn').forEach(btn => {
    btn.addEventListener('click', () => showMembersModal(btn.dataset.id, btn.dataset.title));
  });

  container.querySelectorAll('.leave-btn').forEach(btn => {
    btn.addEventListener('click', handleLeave);
  });
}

function handleDelete(e, pageContext) {
  const btn = e.target;
  const invitationId = btn.dataset.id;
  if (!confirm('Sure to delete this invitation?')) return;

  btn.disabled = true;
  btn.textContent = 'Deleting......';

  fetch(`/api/invitations/${invitationId}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json', ...getAuthHeader() }
  })
    .then(res => res.json())
    .then(data => {
      if (pageContext === 'joined') {
        loadMyInvitations();
      } else if (pageContext === 'invitations') {
        loadInvitationsList();
      } else {
        renderInvitationsPage();
        loadMyInvitations();
      }
    })
    .catch(err => {
      btn.textContent = ' Delete';
      btn.disabled = false;
    });
}

let currentReportBtn = null;

function handleReport(e) {
  const btn = e.target;
  currentReportBtn = btn;
  const modal = document.getElementById('reportModal');
  const reasonEl = document.getElementById('reportReason');
  const countEl = document.getElementById('reportReasonCount');
  const errorEl = document.getElementById('reportError');

  reasonEl.value = '';
  countEl.textContent = '0';
  errorEl.classList.add('hidden');
  modal.classList.remove('hidden');
  reasonEl.focus();
}

function closeReportModal() {
  document.getElementById('reportModal').classList.add('hidden');
  currentReportBtn = null;
}

function submitReport() {
  const btn = currentReportBtn;
  if (!btn) return;

  const reason = document.getElementById('reportReason').value.trim();
  const errorEl = document.getElementById('reportError');
  const confirmBtn = document.getElementById('reportConfirmBtn');

  if (!reason) {
    errorEl.textContent = 'Please provide a reason';
    errorEl.classList.remove('hidden');
    return;
  }

  if (reason.length > 500) {
    errorEl.textContent = 'Reason must be under 500 characters500';
    errorEl.classList.remove('hidden');
    return;
  }

  errorEl.classList.add('hidden');
  confirmBtn.disabled = true;
  confirmBtn.textContent = 'Submitting......';

  const invitationId = btn.dataset.id;

  fetch(`/api/invitations/${invitationId}/report`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
    body: JSON.stringify({ reason })
  })
    .then(res => res.json())
    .then(data => {
      if (data.error) {
        errorEl.textContent = data.error;
        errorEl.classList.remove('hidden');
        confirmBtn.disabled = false;
        confirmBtn.textContent = 'Confirm Report';
        return;
      }
      closeReportModal();
      confirmBtn.disabled = false;
      confirmBtn.textContent = 'Confirm Report';
      btn.textContent = 'Reported';
      btn.disabled = true;
      btn.classList.add('opacity-50', 'cursor-not-allowed');
    })
    .catch(err => {
      errorEl.textContent = 'Report failed';
      errorEl.classList.remove('hidden');
      confirmBtn.disabled = false;
      confirmBtn.textContent = 'Confirm Report';
    });
}

function handleJoin(e) {
  const btn = e.target;
  const invitationId = btn.dataset.id;

  if (btn.disabled) return;

  fetch('/api/account', { headers: getAuthHeader() })
    .then(res => res.json())
    .then(user => {
      btn.disabled = true;
      btn.textContent = 'Joining......';

      return fetch(`/api/invitations/${invitationId}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() }
      });
    })
    .then(res => {
      if (!res) return;
      return res.json();
    })
    .then(data => {
      if (!data) return;
      if (data.error) {
        const btn = e.target;
        btn.textContent = data.error;
        btn.classList.add('bg-red-500/80');
        return;
      }
      const btn = e.target;
      btn.textContent = 'Joined!';
      btn.classList.add('bg-green-500/80');

      setTimeout(() => {
        document.querySelectorAll('.dashboard-rail-item').forEach(i => i.classList.remove('active'));
        document.querySelector('.dashboard-rail-item[data-page="joined"]').classList.add('active');
        document.getElementById('page-title').innerHTML = pages.joined.title;
        renderJoinedPage();
      }, 1000);
    })
    .catch(err => {
      const btn = e.target;
      btn.textContent = 'Join';
      btn.disabled = false;
    });
}

function handleLeave(e) {
  const btn = e.target;
  const invitationId = btn.dataset.id;
  if (!confirm('Sure to leave this invitation?')) return;

  btn.disabled = true;
  btn.textContent = 'Leaving......';

  fetch(`/api/invitations/${invitationId}/leave`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json', ...getAuthHeader() }
  })
    .then(res => res.json())
    .then(data => {
      if (data.error) {
        btn.textContent = data.error;
        btn.classList.add('bg-red-500/80');
        return;
      }
      btn.textContent = 'Left!';
      btn.classList.add('bg-gray-500/60');
      setTimeout(() => {
        document.querySelectorAll('.dashboard-rail-item').forEach(i => i.classList.remove('active'));
        document.querySelector('.dashboard-rail-item[data-page="invitations"]').classList.add('active');
        document.getElementById('page-title').innerHTML = pages.invitations.title;
        renderInvitationsPage();
      }, 1000);
    })
    .catch(() => {
      btn.textContent = 'Leave';
      btn.disabled = false;
    });
}

function openChatModal(e) {
  const btn = e.target;
  const invitationId = btn.dataset.id;
  const title = btn.dataset.title || 'Temp Chat';
  currentChatInvitationId = invitationId;

  const modal = document.getElementById('chatModal');
  const modalTitle = document.getElementById('chatModalTitle');
  const chatMessages = document.getElementById('chatMessages');

  modalTitle.textContent = title;
  chatMessages.innerHTML ='<div class="text-white/60 text-sm text-center py-4">Loading messages......</div>';
  modal.classList.remove('hidden');

  if (socket) {
    socket.emit('join_invitation', invitationId);
  }

  loadChatMessages(invitationId);
}

function renderSystemMessage(content, time) {
  const text = content.replace(/^__SYSTEM__:/, '');
  return `
    <div class="chat-system">
      [system] ${escapeHtml(text)} · ${time}
    </div>
  `;
}

function loadChatMessages(invitationId) {
  fetch(`/api/messages/${invitationId}`, { headers: getAuthHeader() })
    .then(res => {
      if (!res.ok) {
        return res.json().then(err => { throw new Error(err.error || 'Failed to load messages'); });
      }
      return res.json();
    })
    .then(messages => {
      const container = document.getElementById('chatMessages');
      if (!container) return;

      if (messages.length === 0) {
        container.innerHTML ='<p class="dashboard-empty">No messages yet. Start chatting!</p>';
        return;
      }

      container.innerHTML = messages.map(msg => {
        const isOwn = msg.user_id == currentUserId;
        const time = new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        if (msg.content.startsWith('__SYSTEM__:')) {
          return renderSystemMessage(msg.content, time);
        }
        return `
          <div style="margin-bottom:0.75rem;text-align:${isOwn ? 'right' : 'left'};">
            <div class="chat-bubble ${isOwn ? 'chat-bubble-own' : ''}">
              <p class="chat-meta">${isOwn ? 'You' : '@' + escapeHtml(msg.username)} · ${time}</p>
              <p class="chat-bubble-message">${escapeHtml(msg.content)}</p>
            </div>
          </div>
        `;
      }).join('');

      container.scrollTop = container.scrollHeight;
    })
    .catch(err => {
      const container = document.getElementById('chatMessages');
      if (container) {
        container.innerHTML = `<p class="text-red-400 text-sm">${err.message || 'Error loading messages'}</p>`;
      }
    });
}

function appendMessageToChat(data) {
  const container = document.getElementById('chatMessages');
  if (!container) return;

  const isOwn = data.userId == currentUserId;
  const time = new Date(data.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  let html;
  if (data.content.startsWith('__SYSTEM__:')) {
    html = renderSystemMessage(data.content, time);
  } else {
    html = `
      <div style="margin-bottom:0.75rem;text-align:${isOwn ? 'right' : 'left'};">
        <div class="chat-bubble ${isOwn ? 'chat-bubble-own' : ''}">
          <p class="chat-meta">${isOwn ? 'You' : '@' + escapeHtml(data.username)} · ${time}</p>
          <p class="chat-bubble-message">${escapeHtml(data.content)}</p>
        </div>
      </div>
    `;
  }

  const placeholder = container.querySelector('.dashboard-empty');
  if (placeholder) {
    placeholder.remove();
  }
  container.insertAdjacentHTML('beforeend', html);
  container.scrollTop = container.scrollHeight;
}

function updateChatUsers() {
  // Could add online user indicator here
}

function sendChatMessage() {
  const input = document.getElementById('chatInput');
  const content = input.value.trim();
  if (!content || !currentChatInvitationId) return;

  const originalValue = input.value;
  input.value = '';
  input.style.height = 'auto';

  fetch(`/api/messages/${currentChatInvitationId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
    body: JSON.stringify({ content })
  })
    .then(res => {
      if (!res.ok) {
        return res.json().then(err => { throw new Error(err.error || 'Failed to send message'); });
      }
      return res.json();
    })
    .then(() => {
      // Message will appear via the socket 'new_message' broadcast
    })
    .catch(err => {
      console.error('Error sending message:', err || '');
      input.value = originalValue;
      alert(err.message || 'Failed to send message');
    });
}

function closeChatModal() {
  const modal = document.getElementById('chatModal');
  modal.classList.add('hidden');
  if (socket && currentChatInvitationId) {
    socket.emit('leave_invitation', currentChatInvitationId);
  }
  currentChatInvitationId = null;
}

function renderJoinedPage() {
  const container = document.getElementById('page-description');
  getCurrentUser().then(() => {
    const isPrivileged = currentUserType === 'verified' || currentUserType === 'organization';
    const participantsLabel = isPrivileged
      ? 'People needed (excl. yourself)'
      : 'Participants (incl. yourself)';
    container.innerHTML = `
    <button id="showPostForm" class="w-full btn btn-primary text-sm py-2_5 mb-4">
      Post Invitation
    </button>
    <p id="invitationCount" class="dashboard-empty" style="padding:0 0 1rem;"></p>
    <div id="postForm" class="hidden dashboard-post-form relative mb-4">
      <button id="closePostForm" class="dashboard-post-close">
        <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
      </button>
      <form id="invitationForm" class="space-y-3">
        <div>
          <label class="form-label">Title (max 15 words)</label>
          <input type="text" id="invTitle" required
            class="form-input"
            placeholder="e.g., Need tennis partner">
          <p class="form-hint text-right"><span id="titleCount">0</span>/15 words</p>
        </div>
        <div>
          <label class="form-label">Description (max ${MAX_DESCRIPTION_LENGTH} chars)${MAX_DESCRIPTION_LENGTH}</label>
          <textarea id="invDescription" required maxlength="${MAX_DESCRIPTION_LENGTH}" rows="3"
            class="form-input resize-none"
            placeholder="Describe your invitation......"></textarea>
          <p class="form-hint text-right"><span id="descCount">0</span>/${MAX_DESCRIPTION_LENGTH}</p>
        </div>
        <div>
          <label class="form-label">Type</label>
          <select id="invType" required class="form-select">
            <option value="">Select type......</option>
            ${INVITATION_TYPES.map(t => `<option value="${t.value}">${t.label}</option>`).join('')}
          </select>
        </div>
        <div>
          <label class="form-label">${participantsLabel}</label>
          ${isPrivileged
            ? `<input type="number" id="invMaxParticipants" min="1"
                 class="form-input"
                 placeholder="Leave blank if unlimited">`
            : `<select id="invMaxParticipants" class="form-select">
                 <option value="">Select......</option>
                 ${[1,2,3,4,5,6,7,8,9,10].map(n => `<option value="${n}">${n} people</option>`).join('')}
               </select>`}
        </div>
        <div class="dashboard-datetime-row">
          <div>
            <label class="form-label">Event Start Time (Required)</label>
            <input type="datetime-local" id="invEventStart" required class="form-input">
          </div>
          <div>
            <label class="form-label">Event End Time (Required)</label>
            <input type="datetime-local" id="invEventEnd" required class="form-input">
          </div>
        </div>
        <button type="submit" id="postBtn" class="w-full btn btn-primary text-sm py-2">
          Post Invitation
        </button>
        <p id="postMessage" class="form-message"></p>
      </form>
    </div>
    <div id="myInvitations">
      <div class="dashboard-section-header">
        <p>My Invitations</p>
        <div class="dashboard-section-sort">
          <span>Sorted by:</span>
          <select id="myInvSortSelect" class="dashboard-sort-select">
            <option value="event">start time</option>
            <option value="newest">post time</option>
          </select>
        </div>
      </div>
      <div id="myInvitationsList"></div>
    </div>
    <div id="joinedInvitations" class="dashboard-joined-section">
      <div class="dashboard-section-header">
        <p>Joined Invitations</p>
        <div class="dashboard-section-sort">
          <span>Sorted by:</span>
          <select id="joinedInvSortSelect" class="dashboard-sort-select">
            <option value="event">start time</option>
            <option value="newest">post time</option>
          </select>
        </div>
      </div>
      <div id="joinedInvitationsList"></div>
    </div>
  `;

  document.getElementById('showPostForm').addEventListener('click', async () => {
    try {
      const res = await fetch('/api/my-invitations?sort=event', { headers: getAuthHeader() });
      const invitations = await res.json();
      if (invitations.length >= 4) {
        messageEl = document.getElementById('postMessage');
        if (messageEl) {
          messageEl.textContent = 'You have reached the maximum of 4 active invitations4';
          messageEl.className = 'form-message form-message-error';
        }
        return;
      }
    } catch (err) {
      console.error('Failed to check invitation count:', err);
    }
    document.getElementById('postForm').classList.remove('hidden');
    document.getElementById('showPostForm').classList.add('hidden');
    const now = new Date();
    const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(now);
    const g = t => parts.find(p => p.type === t).value;
    const minDatetime = `${g('year')}-${g('month')}-${g('day')}T${g('hour')}:${g('minute')}`;
    document.getElementById('invEventStart').setAttribute('min', minDatetime);
    document.getElementById('invEventEnd').setAttribute('min', minDatetime);
  });

  document.getElementById('closePostForm').addEventListener('click', () => {
    document.getElementById('postForm').classList.add('hidden');
    document.getElementById('showPostForm').classList.remove('hidden');
  });

  document.getElementById('invTitle').addEventListener('input', function() {
    document.getElementById('titleCount').textContent = countWords(this.value);
  });

  document.getElementById('invDescription').addEventListener('input', function() {
    document.getElementById('descCount').textContent = this.value.length;
  });

  document.getElementById('invitationForm').addEventListener('submit', handlePostInvitation);

  document.getElementById('myInvSortSelect').addEventListener('change', () => {
    myInvitationsSort = document.getElementById('myInvSortSelect').value;
    loadMyInvitations();
  });

  document.getElementById('joinedInvSortSelect').addEventListener('change', () => {
    joinedInvitationsSort = document.getElementById('joinedInvSortSelect').value;
    loadJoinedInvitations();
  });

  loadMyInvitations();
  loadJoinedInvitations();
  });
}

function loadMyInvitations() {
  fetch(`/api/my-invitations?sort=${myInvitationsSort}`, { headers: getAuthHeader() })
    .then(res => res.json())
    .then(invitations => {
      const container = document.getElementById('myInvitationsList');
      if (!container) return;
      const countEl = document.getElementById('invitationCount');
      if (countEl) {
        countEl.textContent = `${invitations.length}/4 active invitations`;
      }
      if (invitations.length === 0) {
        container.innerHTML ='<p class="dashboard-empty">You haven\'t posted any invitations yet.</p>';
        return;
      }
      container.innerHTML = `
        <div class="dashboard-invitation-grid">
          ${invitations.map(inv => createInvitationCard({ ...inv, username: 'You' }, true, true, false)).join('')}
        </div>
      `;
      attachInvitationListeners(container);
    })
    .catch(err => {
      const container = document.getElementById('myInvitationsList');
      if (container) {
        container.innerHTML ='<p class="dashboard-empty">Error loading my invitations</p>';
      }
    });
}

function loadJoinedInvitations() {
  fetch(`/api/invitations/joined?sort=${joinedInvitationsSort}`, { headers: getAuthHeader() })
    .then(res => res.json())
    .then(invitations => {
      const container = document.getElementById('joinedInvitationsList');
      if (!container) return;
      if (invitations.length === 0) {
        container.innerHTML ='<p class="dashboard-empty">You haven\'t joined any invitations yet.</p>';
        return;
      }
      container.innerHTML = `
        <div class="dashboard-invitation-grid">
          ${invitations.map(inv => createInvitationCard({ ...inv, username: inv.username }, false, true, false)).join('')}
        </div>
      `;
      attachInvitationListeners(container);
    })
    .catch(err => {
      const container = document.getElementById('joinedInvitationsList');
      if (container) {
        container.innerHTML ='<p class="dashboard-empty">Error loading joined invitations</p>';
      }
    });
}

function handlePostInvitation(e) {
  e.preventDefault();
  const messageEl = document.getElementById('postMessage');
  const postBtn = document.getElementById('postBtn');
  const isPrivileged = currentUserType === 'verified' || currentUserType === 'organization';
  const title = document.getElementById('invTitle').value.trim();
  const description = document.getElementById('invDescription').value.trim();
  const type = document.getElementById('invType').value;
  const rawMaxParticipants = document.getElementById('invMaxParticipants').value;
  const max_participants = parseInt(rawMaxParticipants, 10);
  const event_start = document.getElementById('invEventStart').value;
  const event_end = document.getElementById('invEventEnd').value;

  if (!title || !description || !type) {
    messageEl.textContent = 'Please fill in all required fields';
    messageEl.className = 'form-message form-message-error';
    return;
  }

  if (!event_start || !event_end) {
    messageEl.textContent = 'Event start and end times are required';
    messageEl.className = 'form-message form-message-error';
    return;
  }

  const startDate = new Date(event_start + '+08:00');
  const endDate = new Date(event_end + '+08:00');

  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    messageEl.textContent = 'Invalid date format';
    messageEl.className = 'form-message form-message-error';
    return;
  }

  if (startDate <= new Date()) {
    messageEl.textContent = 'Event start time must be in the future';
    messageEl.className = 'form-message form-message-error';
    return;
  }

  if (endDate <= startDate) {
    messageEl.textContent = 'Event end time must be after start time';
    messageEl.className = 'form-message form-message-error';
    return;
  }

  const maxDurationMs = isPrivileged ? 7 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
  if (endDate - startDate > maxDurationMs) {
    messageEl.textContent = isPrivileged
      ? 'Event duration cannot exceed 7 days7'
      : 'Event duration cannot exceed 24 hours24';
    messageEl.className = 'form-message form-message-error';
    return;
  }

  if (isPrivileged) {
    if (!isNaN(max_participants) && max_participants < 1) {
      messageEl.textContent = 'Number of people must be at least 1 (leave blank for unlimited)1';
      messageEl.className = 'form-message form-message-error';
      return;
    }
  } else {
    if (isNaN(max_participants) || max_participants < 1 || max_participants > 10) {
      messageEl.textContent = 'Number of people must be between 1 and 10110';
      messageEl.className = 'form-message form-message-error';
      return;
    }
  }

  if (countWords(title) > 15) {
    messageEl.textContent = 'Title cannot exceed 15 words 15';
    messageEl.className = 'form-message form-message-error';
    return;
  }

  fetch('/api/account', { headers: getAuthHeader() })
    .then(res => res.json())
    .then(user => {
      postBtn.disabled = true;
      postBtn.textContent = 'Posting......';

      const submittedMaxParticipants = (max_participants === 0 || isNaN(max_participants)) ? null : max_participants;
      return fetch('/api/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({ title, description, type, max_participants: submittedMaxParticipants, event_start, event_end })
      });
    })
    .then(res => {
      if (!res) return;
      return res.json().then(data => ({ ok: res.ok, data }));
    })
    .then(result => {
      if (!result) return;
      if (!result.ok) {
        messageEl.textContent = result.data.error || 'Failed to post invitation';
        messageEl.className = 'form-message form-message-error';
        return;
      }
      const data = result.data;
      messageEl.textContent = 'Invitation posted successfully!';
      messageEl.className = 'form-message form-message-success';
      document.getElementById('invitationForm').reset();
      document.getElementById('titleCount').textContent = '0';
      document.getElementById('descCount').textContent = '0';
      document.getElementById('postForm').classList.add('hidden');
      document.getElementById('showPostForm').classList.remove('hidden');
      loadMyInvitations();

      document.querySelectorAll('.dashboard-rail-item').forEach(i => i.classList.remove('active'));
      document.querySelector('.dashboard-rail-item[data-page="joined"]').classList.add('active');
      document.getElementById('page-title').innerHTML = pages.joined.title;
      renderJoinedPage();
    })
    .catch(err => {
      messageEl.textContent = err.message || 'Failed to post invitation';
      messageEl.className = 'form-message form-message-error';
    })
    .finally(() => {
      postBtn.disabled = false;
      postBtn.textContent = 'Post Invitation';
    });
}

function showInviteModal(inv) {
  const modal = document.getElementById('inviteModal');
  const modalBody = document.getElementById('modalBody');
  const typeBadge = `<span class="badge ${typeBadgeClasses[inv.type] || 'badge-type-other'}">${getTypeLabel(inv.type)}</span>`;

  modalBody.innerHTML = `
    <p class="text-sm text-slate-500">@${inv.username || 'Unknown'} · ${renderUserTypeBadge(inv.user_type, inv.personality_type)}</p>
    <h3 class="modal-title mt-1">${inv.title}</h3>
    <p class="text-sm mt-3" style="word-break:break-word;">${inv.description}</p>
    <div class="mt-3">${typeBadge}</div>
    <button class="close-modal-btn mt-4 w-full btn btn-primary text-sm py-2">Close</button>
  `;
  modal.classList.remove('hidden');

  modal.querySelector('.close-modal-btn').addEventListener('click', hideInviteModal);

  document.getElementById('closeModal').onclick = hideInviteModal;
}

function hideInviteModal() {
  document.getElementById('inviteModal').classList.add('hidden');
}

function showMembersModal(invitationId, title) {
  const modal = document.getElementById('inviteModal');
  const modalBody = document.getElementById('modalBody');

  modalBody.innerHTML = `
    <h3 class="modal-title">${escapeHtml(title)} — Members</h3>
    <p class="text-xs text-slate-500 mt-1 mb-3">Loading members......</p>
  `;
  modal.classList.remove('hidden');
  document.getElementById('closeModal').onclick = hideInviteModal;

  fetch(`/api/invitations/${invitationId}/members`, { headers: getAuthHeader() })
    .then(res => {
      if (!res.ok) {
        return res.json().then(err => { throw new Error(err.error || 'Failed to load members'); });
      }
      return res.json();
    })
    .then(data => {
      let html = `<h3 class="modal-title">${escapeHtml(title)} — Members</h3>`;
      html += `<p class="text-xs text-slate-500 mt-1 mb-3">Creator: @${escapeHtml(data.creator.username)} (${escapeHtml(data.creator.full_name || 'N/A')}) · ${renderUserTypeBadge(data.creator.user_type, data.creator.personality_type)}</p>`;

      if (data.members.length === 0) {
        html +='<p class="dashboard-empty">No members have joined yet</p>';
      } else {
        html +='<div class="dashboard-members-list">';
        data.members.forEach(m => {
          const joinedTime = new Date(m.joined_at).toLocaleString();
          html += `
            <div class="dashboard-member-row">
              <div>
                <p class="font-medium">@${escapeHtml(m.username)} (${escapeHtml(m.full_name || 'N/A')})</p>
                <p class="text-xs text-slate-500">${renderUserTypeBadge(m.user_type, m.personality_type)}</p>
              </div>
              <p class="text-xs text-slate-400">${joinedTime}</p>
            </div>
          `;
        });
        html +='</div>';
      }

      html += `<button class="close-modal-btn mt-4 w-full btn btn-primary text-sm py-2">Close</button>`;
      modalBody.innerHTML = html;
      modalBody.querySelector('.close-modal-btn').addEventListener('click', hideInviteModal);
    })
    .catch(err => {
      modalBody.innerHTML = `
        <h3 class="modal-title">${escapeHtml(title)} — Members</h3>
        <p class="form-message-error text-sm mt-2">${escapeHtml(err.message)}</p>
        <button class="close-modal-btn mt-4 w-full btn btn-primary text-sm py-2">Close</button>
      `;
      modalBody.querySelector('.close-modal-btn').addEventListener('click', hideInviteModal);
    });
}

function renderAccountPage() {
  fetch('/api/account', { headers: getAuthHeader() })
    .then(res => {
      if (!res.ok) throw new Error('Failed to load account info');
      return res.json();
    })
    .then(user => {
      const mbtiOptions = MBTI_TYPES.map(t =>
        `<option value="${t}" ${user.personality_type === t ? 'selected' : ''}>${t}</option>`
      ).join('');

      document.getElementById('page-description').innerHTML = `
        <form id="accountForm" class="space-y-4 dashboard-account-form">
          <div class="dashboard-account-section">
            <h3>Account Info</h3>
            <div>
              <label class="form-label">Full Name (max 100 chars)</label>
              <input type="text" id="fullName" name="fullName" maxlength="100" value="${escapeHtml(user.full_name || '')}" class="form-input">
            </div>
            <div class="dashboard-account-row">
              <div>
                <label class="form-label">Grade (max 2 chars)</label>
                <input type="text" id="grade" name="grade" maxlength="2" value="${escapeHtml(user.grade || '')}" class="form-input">
              </div>
              <div>
                <label class="form-label">Class (max 2 chars)</label>
                <input type="text" id="classField" name="classField" maxlength="2" value="${escapeHtml(user.class || '')}" class="form-input">
              </div>
            </div>
            <div>
              <label class="form-label">Warning Count</label>
              <input type="text" value="${user.warning_count || 0}" disabled class="form-input">
            </div>
            <p class="form-hint italic mt-2">Contact admin for other inquiries.</p>
          </div>
          <div>
            <label class="form-label">Username (max ${MAX_CHARS} chars)</label>
            <input type="text" id="username" name="username" maxlength="${MAX_CHARS}" value="${user.username}" class="form-input">
          </div>
          <div>
            <label class="form-label">New password (max ${MAX_CHARS} chars, leave empty to keep current)</label>
            <input type="password" id="password" name="password" maxlength="${MAX_CHARS}" class="form-input">
          </div>
          <div>
            <label class="form-label">Personality Type (MBTI)</label>
            ${user.user_type === 'normal' ? `
            <select id="personalityType" name="personalityType" class="form-select">
              <option value="">Select type......</option>
              ${mbtiOptions}
            </select>` : `
            <div class="form-input">
              ${renderUserTypeBadge(user.user_type, user.personality_type)}
            </div>
            <p class="form-hint italic mt-1">Verified and organization accounts cannot change their type.</p>`}
          </div>
        <div>
          <label class="form-label">Current password (required to save)</label>
          <input type="password" id="currentPassword" name="currentPassword" required class="form-input">
        </div>
        <button type="submit" id="saveBtn" class="w-full btn btn-primary text-sm py-2">
          Save Changes
        </button>
        <p id="accountMessage" class="form-message"></p>
        </form>
        <div class="dashboard-account-delete">
          <button id="deleteAccountBtn">Delete Account</button>
        </div>
    `;

      document.getElementById('accountForm').addEventListener('submit', handleAccountSubmit);

      accountOriginalValues = {
        username: user.username,
        password: '',
        personalityType: user.personality_type || '',
        fullName: user.full_name || '',
        grade: user.grade || '',
        classField: user.class || ''
      };

      document.getElementById('username').addEventListener('input', checkForChanges);
      document.getElementById('password').addEventListener('input', checkForChanges);
      document.getElementById('fullName').addEventListener('input', checkForChanges);
      document.getElementById('grade').addEventListener('input', checkForChanges);
      document.getElementById('classField').addEventListener('input', checkForChanges);
      const personalityTypeEl = document.getElementById('personalityType');
      if (personalityTypeEl) {
        personalityTypeEl.addEventListener('change', checkForChanges);
      }

      document.getElementById('deleteAccountBtn').addEventListener('click', showDeleteAccountModal);
    })
    .catch(err => {
      document.getElementById('page-description').innerHTML = `<p class="text-red-400 text-sm">Error loading account info</p>`;
    });
}

async function handleAccountSubmit(e) {
  e.preventDefault();
  const messageEl = document.getElementById('accountMessage');
  const saveBtn = document.getElementById('saveBtn');

  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value;
  const personalityTypeEl = document.getElementById('personalityType');
  const personality_type = personalityTypeEl ? personalityTypeEl.value : undefined;
  const full_name = document.getElementById('fullName').value.trim();
  const grade = document.getElementById('grade').value.trim();
  const classValue = document.getElementById('classField').value.trim();
  const currentPassword = document.getElementById('currentPassword').value;

  if (!currentPassword) {
    messageEl.textContent = 'Please enter current password';
    messageEl.className = 'form-message form-message-error';
    return;
  }

  const usernameRegex = /^[a-zA-Z][a-zA-Z0-9_.]{0,19}$/;
  const passwordRegex = /^[a-zA-Z0-9!@#$%^&*()\-_=+\[\]{}|;:' ,./<>?]{5,}$/;

  if (username && !usernameRegex.test(username)) {
    messageEl.textContent = 'Username must start with a letter and contain only letters, numbers, underscores or dots (max 20 chars)';
    messageEl.className = 'form-message form-message-error';
    return;
  }

  if (password && !passwordRegex.test(password)) {
    messageEl.textContent = 'Password must be at least 5 characters, containing only letters, numbers, and common symbols 5';
    messageEl.className = 'form-message form-message-error';
    return;
  }

  saveBtn.disabled = true;
  saveBtn.textContent = 'Saving......';

  try {
    const res = await fetch('/api/account', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ username, password, personality_type, full_name, grade, class: classValue, currentPassword })
    });
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || 'Update failed');
    }

    messageEl.textContent = 'Account updated successfully!';
    messageEl.className = 'form-message form-message-success';
    document.getElementById('password').value = '';
    document.getElementById('currentPassword').value = '';
    accountOriginalValues.username = username;
    accountOriginalValues.password = '';
    accountOriginalValues.personalityType = personality_type;
    accountOriginalValues.fullName = full_name;
    accountOriginalValues.grade = grade;
    accountOriginalValues.classField = classValue;
    saveBtn.className = 'w-full btn btn-primary text-sm py-2';
    saveBtn.textContent = ' Save Changes';
  } catch (err) {
    messageEl.textContent = err.message;
    messageEl.className = 'form-message form-message-error';
  } finally {
    saveBtn.disabled = false;
    saveBtn.className = 'w-full btn btn-primary text-sm py-2';
    saveBtn.textContent = ' Save Changes';
    checkForChanges();
  }
}

function showDeleteAccountModal() {
  const modalOverlay = document.createElement('div');
  modalOverlay.className = 'modal-overlay z-50 bg-black-70';
  modalOverlay.innerHTML = `
    <div class="delete-modal">
      <h3 class="text-red-600 font-bold text-lg mb-2">Delete Account</h3>
      <p class="text-sm mb-4">Are you sure? This action cannot be undone. All your data will be permanently deleted.</p>
      <div class="mb-4">
        <label class="form-label">Current password</label>
        <input type="password" id="deleteConfirmPassword" class="form-input">
        <p id="deleteMessage" class="text-xs mt-1"></p>
      </div>
      <div class="flex gap-3">
        <button id="cancelDeleteBtn" class="flex-1 btn btn-secondary text-sm py-2">Cancel</button>
        <button id="confirmDeleteBtn" class="flex-1 btn btn-danger text-sm py-2">Delete</button>
      </div>
    </div>
  `;
  document.body.appendChild(modalOverlay);

  modalOverlay.querySelector('#cancelDeleteBtn').addEventListener('click', () => {
    modalOverlay.remove();
  });
  modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) modalOverlay.remove();
  });

  modalOverlay.querySelector('#confirmDeleteBtn').addEventListener('click', async () => {
    const password = document.getElementById('deleteConfirmPassword').value;
    const deleteMessage = document.getElementById('deleteMessage');
    const confirmBtn = document.getElementById('confirmDeleteBtn');

    if (!password) {
      deleteMessage.textContent = 'Please enter your current password';
      deleteMessage.className = 'form-message-error text-xs mt-1';
      return;
    }

    confirmBtn.disabled = true;
    confirmBtn.textContent = 'Deleting......';

    try {
      const res = await fetch('/api/account', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({ currentPassword: password })
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Delete failed');
      }

      localStorage.removeItem('token');
      localStorage.removeItem('username');
      window.location.href ='/';
    } catch (err) {
      deleteMessage.textContent = err.message;
      deleteMessage.className = 'form-message-error text-xs mt-1';
      confirmBtn.disabled = false;
      confirmBtn.textContent = 'Delete';
    }
  });
}

document.querySelectorAll('.dashboard-rail-item').forEach(item => {
  item.addEventListener('click', () => {
    document.querySelectorAll('.dashboard-rail-item').forEach(i => i.classList.remove('active'));
    item.classList.add('active');

    const page = item.dataset.page;
    document.getElementById('page-title').innerHTML = pages[page].title;

    if (pages[page].render) {
      pages[page].render();
    }
  });
});

document.getElementById('globalSortSelect').addEventListener('change', () => {
  invitationsSort = document.getElementById('globalSortSelect').value;
  myInvitationsSort = invitationsSort;
  joinedInvitationsSort = invitationsSort;

  const activeItem = document.querySelector('.dashboard-rail-item.active');
  const page = activeItem ? activeItem.dataset.page : 'invitations';

  if (page === 'invitations') {
    loadInvitationsList();
  } else if (page === 'joined') {
    loadMyInvitations();
    loadJoinedInvitations();
  }
});

document.querySelectorAll('.tagline-action').forEach(action => {
  action.addEventListener('click', (e) => {
    e.preventDefault();
    const filter = action.dataset.filter;
    invitationsFilter = filter === invitationsFilter ? null : filter;

    document.querySelectorAll('.tagline-action').forEach(a => a.classList.remove('active'));
    if (invitationsFilter) {
      action.classList.add('active');
    }

    document.querySelectorAll('.dashboard-rail-item').forEach(i => i.classList.remove('active'));
    document.querySelector('.dashboard-rail-item[data-page="invitations"]').classList.add('active');
    document.getElementById('page-title').innerHTML = pages.invitations.title;
    renderInvitationsPage();
  });
});

document.getElementById('logoutBtn').addEventListener('click', () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
  localStorage.removeItem('token');
  localStorage.removeItem('username');
  window.location.href ='/login.html';
});

let sessionWarningShown = false;

function forceLogout() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
  localStorage.removeItem('token');
  localStorage.removeItem('username');
  window.location.href ='/login.html';
}

function showSessionExpiryModal(timeLeft) {
  const modal = document.getElementById('sessionExpiryModal');
  const countdown = document.getElementById('sessionCountdown');
  const countdown2 = document.getElementById('sessionCountdown2');
  const remainingMins = Math.max(1, Math.ceil(timeLeft / 60000));
  countdown.textContent = remainingMins;
  countdown2.textContent = remainingMins;
  modal.classList.remove('hidden');

  let timeRemaining = timeLeft;

  const interval = setInterval(() => {
    timeRemaining -= 60000;
    if (timeRemaining <= 0) {
      clearInterval(interval);
      forceLogout();
    } else {
      const mins = Math.max(1, Math.ceil(timeRemaining / 60000));
      countdown.textContent = mins;
      countdown2.textContent = mins;
    }
  }, 60000);

  document.getElementById('sessionExtendBtn').onclick = async () => {
    modal.classList.add('hidden');
    clearInterval(interval);

    try {
      const res = await fetch('/api/extend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() }
      });

      if (res.ok) {
        const data = await res.json();
        localStorage.setItem('token', data.token);
        sessionWarningShown = false;
      } else {
        forceLogout();
      }
    } catch {
      forceLogout();
    }
  };
}

function checkSessionExpiry() {
  const token = localStorage.getItem('token');
  if (!token) return;

  const expiry = getTokenExpiry();
  if (!expiry) return;

  const now = Date.now();
  const timeLeft = expiry - now;
  const oneHour = 60 * 60 * 1000;

  if (timeLeft <= 0) {
    forceLogout();
    return;
  }

  if (timeLeft <= oneHour && !sessionWarningShown) {
    sessionWarningShown = true;
    showSessionExpiryModal(timeLeft);
  }
}

setInterval(checkSessionExpiry, 60000);
checkSessionExpiry();

renderInvitationsPage();

document.getElementById('closeModal').addEventListener('click', hideInviteModal);
document.getElementById('modalBackdrop').addEventListener('click', hideInviteModal);

document.getElementById('reportModalBackdrop').addEventListener('click', closeReportModal);
document.getElementById('reportCancelBtn').addEventListener('click', closeReportModal);
document.getElementById('reportConfirmBtn').addEventListener('click', submitReport);
document.getElementById('reportReason').addEventListener('input', function() {
  document.getElementById('reportReasonCount').textContent = this.value.length;
});
document.getElementById('reportReason').addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
    e.preventDefault();
    submitReport();
  }
  if (e.key === 'Escape') {
    closeReportModal();
  }
});

document.getElementById('closeChatModal').addEventListener('click', closeChatModal);
document.getElementById('chatModalBackdrop').addEventListener('click', closeChatModal);
document.getElementById('sendChatBtn').addEventListener('click', sendChatMessage);
document.getElementById('chatInput').addEventListener('keypress', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendChatMessage();
  }
});
document.getElementById('chatInput').addEventListener('input', function() {
  this.style.height = 'auto';
  this.style.height = this.scrollHeight + 'px';
});

function insertEmojiAtCursor(emoji) {
  const input = document.getElementById('chatInput');
  const start = input.selectionStart;
  const end = input.selectionEnd;
  const text = input.value;
  input.value = text.substring(0, start) + emoji + text.substring(end);
  input.selectionStart = input.selectionEnd = start + emoji.length;
  input.focus();
  input.dispatchEvent(new Event('input'));
}

document.getElementById('emojiToggleBtn').addEventListener('click', () => {
  document.getElementById('emojiPicker').classList.toggle('hidden');
});

document.querySelectorAll('.emoji-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    insertEmojiAtCursor(btn.dataset.emoji);
  });
});

document.addEventListener('click', (e) => {
  const picker = document.getElementById('emojiPicker');
  const toggle = document.getElementById('emojiToggleBtn');
  if (!picker.contains(e.target) && e.target !== toggle && !toggle.contains(e.target)) {
    picker.classList.add('hidden');
  }
});

getCurrentUser().then(user => {
  initSocket();
});
