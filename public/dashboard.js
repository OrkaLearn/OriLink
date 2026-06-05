const MBTI_TYPES = ['INFJ', 'INFP', 'INTJ', 'INTP', 'ISFJ', 'ISFP', 'ISTJ', 'ISTP', 'ENFJ', 'ENFP', 'ENTJ', 'ENTP', 'ESFJ', 'ESFP', 'ESTJ', 'ESTP'];
const MAX_CHARS = 20;
const INVITATION_TYPES = [
  { value: 'play/sports', label: 'Sports/Play 运动/玩耍' },
  { value: 'teammate finding', label: 'Teammate Finding 寻找队友' },
  { value: 'tutoring', label: 'Tutoring 辅导' },
  { value: 'other', label: 'Other 其他' }
];
const MAX_TITLE_LENGTH = 100;
const MAX_DESCRIPTION_LENGTH = 300;
const DESCRIPTION_TRUNCATE_LENGTH = 50;

const typeColors = {
  'play/sports': 'bg-emerald-500/80',
  'teammate finding': 'bg-blue-500/80',
  'tutoring': 'bg-violet-500/80',
  'other': 'bg-gray-500/80'
};

function getTypeLabel(type) {
  const t = INVITATION_TYPES.find(x => x.value === type);
  return t ? t.label : type;
}

const pages = {
  invitations: {
    title: "Others' Invitations 他人邀请",
    render: renderInvitationsPage
  },
  joined: {
    title: "Joined Invitations 参与邀请",
    render: renderJoinedPage
  },
  account: {
    title: "My Account 账号",
    render: renderAccountPage
  },
  about: {
    title: "About OriLink 关于元联",
    description: `OriLink or 元联 is an in-school 
    online social platform founded and developed by a student who sought the need to 
    develop a more efficient method to connect students with similar needs/wants and interests to promote 
    socializing and build a stronger community. Whether it's finding someone to play sports with, 
    finding a student tutor or seeking teammates for competitions, you can do all these things on this platform. 
    <br></br>
    Founder & Maintainer: Kevin Chai <br>
    Past Contributors: Jiayi Xiao, Maoyuan Sun, Renyong Huang, 
    <br></br>
    <h3 class="text-white font-semibold text-sm mt-4 mb-2">Terms and Conditions</h3>
    <div id="aboutTermsText" class="text-white/70 text-xs whitespace-pre-wrap"></div>`
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

function createInvitationCard(invitation, isOwn = false, showChat = false) {
  const { text: truncatedDesc, truncated } = truncateText(invitation.description, DESCRIPTION_TRUNCATE_LENGTH);
  const typeBadge = `<span class="inline-block px-2 py-0.5 rounded-full text-xs font-medium text-white ${typeColors[invitation.type] || 'bg-gray-500/80'}">${getTypeLabel(invitation.type)}</span>`;
  
  const descriptionHtml = truncated 
    ? `<p class="text-white text-sm mt-1 cursor-pointer expand-desc" data-inv='${JSON.stringify(invitation).replace(/'/g, "&#39;")}'>${truncatedDesc} <span class="text-white/50 hover:text-white">View More 查看更多</span></p>`
    : `<p class="text-white text-sm mt-1">${truncatedDesc}</p>`;
  
  let metaInfo = '';
  if (invitation.max_participants || invitation.event_start || invitation.event_end) {
    metaInfo += '<div class="mt-2 flex flex-wrap gap-2">';
    if (invitation.max_participants) {
      const joinedCount = (invitation.joined_count || 0) + 1;
      const isFull = joinedCount >= invitation.max_participants;
      metaInfo += `<span class="text-white/60 text-xs">👤 ${joinedCount}/${invitation.max_participants}${isFull ? ' (Full 已满)' : ''}</span>`;
    }
    if (invitation.event_start && invitation.event_end) {
      const startDate = new Date(invitation.event_start);
      const endDate = new Date(invitation.event_end);
      const startStr = `${startDate.toLocaleDateString()} ${startDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
      const endStr = `${endDate.toLocaleDateString()} ${endDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
      metaInfo += `<span class="text-white/60 text-xs">📅 Start 开始: ${startStr} - End 结束: ${endStr}</span>`;
    }
    metaInfo += '</div>';
  }
  
  let actionButtons = '';
  if (isOwn) {
    actionButtons = `
      <div class="flex gap-2 mt-3">
        <button class="chat-btn flex-1 px-3 py-1.5 rounded-lg bg-blue-500/60 hover:bg-blue-500/80 text-white text-xs font-medium transition-all" onclick="openChatModal({target: this})" data-id="${invitation.id}" data-title="${invitation.title}">Chat 聊天</button>
        <button class="delete-btn flex-1 px-3 py-1.5 rounded-lg bg-red-500/60 hover:bg-red-500/80 text-white text-xs font-medium transition-all" data-id="${invitation.id}">Delete 删除</button>
      </div>`;
  } else if (showChat) {
    actionButtons = `<button class="chat-btn mt-3 px-3 py-1.5 rounded-lg bg-blue-500/60 hover:bg-blue-500/80 text-white text-xs font-medium transition-all w-full" onclick="openChatModal({target: this})" data-id="${invitation.id}" data-title="${invitation.title}">Chat 聊天</button>`;
  } else {
    const joinedCount = (invitation.joined_count || 0) + 1;
    const isFull = joinedCount >= invitation.max_participants;
    actionButtons = isFull
      ? `<button class="join-btn mt-3 px-3 py-1.5 rounded-lg bg-gray-500/40 text-white/50 text-xs font-medium cursor-not-allowed w-full" disabled data-id="${invitation.id}">Full 已满</button>`
      : `<button class="join-btn mt-3 px-3 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white text-xs font-medium transition-all w-full" data-id="${invitation.id}">Join 加入</button>`;
  }

  return `
    <div class="invitation-card glass-panel rounded-xl p-4 mb-3">
      <div class="flex items-start justify-between gap-2">
        <div class="flex-1 min-w-0">
          <h3 class="text-white font-semibold text-sm truncate">${invitation.title}</h3>
          ${descriptionHtml}
          <div class="mt-2">${typeBadge}</div>
          ${metaInfo}
        </div>
        <p class="text-white text-xs whitespace-nowrap">@${invitation.username || 'Unknown 未知'}</p>
      </div>
      ${actionButtons}
    </div>
  `;
}

let currentUserId = null;
let currentUsername = null;
let socket = null;
let currentChatInvitationId = null;

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
  socket.on('error', (data) => {
    console.error('Socket error:', data.message);
    alert(data.message || 'Chat error 聊天出错');
  });
}

function getCurrentUser() {
  if (currentUserId) return Promise.resolve({ id: currentUserId, username: currentUsername });
  return fetch('/api/account', { headers: getAuthHeader() })
    .then(res => res.json())
    .then(user => {
      currentUserId = user.id;
      currentUsername = user.username;
      return user;
    });
}

function renderInvitationsPage() {
  const container = document.getElementById('page-description');
  container.innerHTML = '<div class="flex justify-center py-4"><p class="text-white/60 text-sm">Loading invitations... 加载邀请中...</p></div>';

  Promise.all([
    fetch('/api/invitations', { headers: getAuthHeader() }).then(res => res.json()),
    getCurrentUser()
  ])
    .then(([invitations, user]) => {
      if (invitations.length === 0) {
        container.innerHTML = '<p class="text-white text-sm text-center py-4">No invitations yet. Be the first to post one! 暂无邀请。来做第一个发布邀请的人吧！</p>';
        return;
      }
      container.innerHTML = invitations.map(inv => {
        const isOwn = inv.username === user.username;
        return createInvitationCard(inv, isOwn);
      }).join('');
      
      document.querySelectorAll('.join-btn').forEach(btn => {
        btn.addEventListener('click', handleJoin);
      });
      
      document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => handleDelete(e, 'invitations'));
      });
      
      document.querySelectorAll('.expand-desc').forEach(el => {
        el.addEventListener('click', function() {
          const inv = JSON.parse(this.dataset.inv.replace(/&#39;/g, "'"));
          showInviteModal(inv);
        });
      });
    })
    .catch(err => {
      console.error(err);
      container.innerHTML = '<p class="text-red-400 text-sm">Error loading invitations 加载邀请出错</p>';
    });
}

function handleDelete(e, pageContext) {
  const btn = e.target;
  const invitationId = btn.dataset.id;
  if (!confirm('Sure to delete this invitation? 确定要删除此邀请吗？')) return;
  
  btn.disabled = true;
  btn.textContent = 'Deleting... 删除中...';

  fetch(`/api/invitations/${invitationId}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json', ...getAuthHeader() }
  })
    .then(res => res.json())
    .then(data => {
      if (pageContext === 'joined') {
        loadMyInvitations();
      } else if (pageContext === 'invitations') {
        renderInvitationsPage();
      } else {
        renderInvitationsPage();
        loadMyInvitations();
      }
    })
    .catch(err => {
      btn.textContent = '删除 Delete';
      btn.disabled = false;
    });
}

function handleJoin(e) {
  const btn = e.target;
  const invitationId = btn.dataset.id;
  
  if (btn.disabled) return;

  fetch('/api/account', { headers: getAuthHeader() })
    .then(res => res.json())
    .then(user => {
      if (!user.email_verified) {
        showEmailVerifyModal();
        return;
      }

      btn.disabled = true;
      btn.textContent = 'Joining... 加入中...';

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
      btn.textContent = 'Joined! 已加入！';
      btn.classList.add('bg-green-500/80');
      
      setTimeout(() => {
        document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
        document.querySelector('[data-page="joined"]').classList.add('active');
        document.getElementById('page-title').innerHTML = pages.joined.title;
        renderJoinedPage();
      }, 1000);
    })
    .catch(err => {
      const btn = e.target;
      btn.textContent = 'Join 加入';
      btn.disabled = false;
    });
}

function openChatModal(e) {
  const btn = e.target;
  const invitationId = btn.dataset.id;
  const title = btn.dataset.title || 'Chat 聊天';
  currentChatInvitationId = invitationId;
  
  const modal = document.getElementById('chatModal');
  const modalTitle = document.getElementById('chatModalTitle');
  const chatMessages = document.getElementById('chatMessages');
  
  modalTitle.textContent = title;
  chatMessages.innerHTML = '<div class="text-white/60 text-sm text-center py-4">Loading messages... 加载消息中...</div>';
  modal.classList.remove('hidden');
  
  if (socket) {
    socket.emit('join_invitation', invitationId);
  }
  
  loadChatMessages(invitationId);
}

function loadChatMessages(invitationId) {
  fetch(`/api/messages/${invitationId}`, { headers: getAuthHeader() })
    .then(res => {
      if (!res.ok) {
        return res.json().then(err => { throw new Error(err.error || 'Failed to load messages 加载消息失败'); });
      }
      return res.json();
    })
    .then(messages => {
      const container = document.getElementById('chatMessages');
      if (!container) return;
      
      if (messages.length === 0) {
        container.innerHTML = '<p class="text-white/60 text-sm text-center py-4">No messages yet. Start chatting! 暂无消息。开始聊天吧！</p>';
        return;
      }
      
      container.innerHTML = messages.map(msg => {
        const isOwn = msg.user_id == currentUserId;
        const time = new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        return `
          <div class="mb-3 ${isOwn ? 'text-right' : 'text-left'}">
            <div class="inline-block max-w-[80%]">
              <p class="text-white/50 text-xs">${isOwn ? 'You 你' : '@' + msg.username} · ${time}</p>
              <p class="text-white text-sm bg-white/10 rounded-lg px-3 py-2 break-words ${isOwn ? 'bg-blue-500/40' : ''}">${msg.content}</p>
            </div>
          </div>
        `;
      }).join('');
      
      container.scrollTop = container.scrollHeight;
    })
    .catch(err => {
      const container = document.getElementById('chatMessages');
      if (container) {
        container.innerHTML = `<p class="text-red-400 text-sm">${err.message || 'Error loading messages 加载消息出错'}</p>`;
      }
    });
}

function appendMessageToChat(data) {
  const container = document.getElementById('chatMessages');
  if (!container) return;
  
  const isOwn = data.userId == currentUserId;
  const time = new Date(data.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const html = `
    <div class="mb-3 ${isOwn ? 'text-right' : 'text-left'}">
      <div class="inline-block max-w-[80%]">
        <p class="text-white/50 text-xs">${isOwn ? 'You 你' : '@' + data.username} · ${time}</p>
        <p class="text-white text-sm bg-white/10 rounded-lg px-3 py-2 break-words ${isOwn ? 'bg-blue-500/40' : ''}">${data.content}</p>
      </div>
    </div>
  `;
  
  const placeholder = container.querySelector('p.text-white\\/60');
  if (placeholder) {
    container.innerHTML = '';
  }
  container.innerHTML += html;
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
        return res.json().then(err => { throw new Error(err.error || 'Failed to send message 发送消息失败'); });
      }
      return res.json();
    })
    .catch(err => {
      console.error('Error sending message:', err || '发送消息出错');
      input.value = originalValue;
      alert(err.message || 'Failed to send message 发送消息失败');
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
  container.innerHTML = `
    <button id="showPostForm" class="w-full py-2.5 rounded-lg bg-white/20 hover:bg-white/30 text-white text-sm font-medium transition-all mb-4">
      Post Invitation 发布邀请
    </button>
    <div id="emailVerifyMessage" class="hidden mb-4 p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/30">
      <p class="text-yellow-300 text-sm mb-3">Please verify your email to post invitations. 请验证邮箱以发布邀请。</p>
      <button id="goVerifyEmail" class="w-full py-2 rounded-lg bg-yellow-500/30 hover:bg-yellow-500/50 text-white text-sm font-medium transition-all">
        Verify Email 验证邮箱
      </button>
    </div>
    <div id="postForm" class="hidden mb-4 p-4 rounded-xl bg-white/10 border border-white/20 relative">
      <button id="closePostForm" class="absolute top-3 right-3 text-white/60 hover:text-white">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
      </button>
      <form id="invitationForm" class="space-y-3">
        <div>
          <label class="block text-white/80 text-xs mb-1">Title (max 15 words) 标题（最多 15 个字）</label>
          <input type="text" id="invTitle" required
            class="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white text-sm focus:outline-none focus:border-white/40"
            placeholder="e.g., Need tennis partner 例如：需要网球搭档">
          <p class="text-white/40 text-xs text-right mt-1"><span id="titleCount">0</span>/15 words 字</p>
        </div>
        <div>
          <label class="block text-white/80 text-xs mb-1">Description (max ${MAX_DESCRIPTION_LENGTH} chars) 描述（最多${MAX_DESCRIPTION_LENGTH}字）</label>
          <textarea id="invDescription" required maxlength="${MAX_DESCRIPTION_LENGTH}" rows="3"
            class="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white text-sm focus:outline-none focus:border-white/40 resize-none"
            placeholder="Describe your invitation... 描述你的邀请..."></textarea>
          <p class="text-white/40 text-xs text-right mt-1"><span id="descCount">0</span>/${MAX_DESCRIPTION_LENGTH}</p>
        </div>
        <div>
          <label class="block text-white/80 text-xs mb-1">Type 类型</label>
          <select id="invType" required
            class="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white text-sm focus:outline-none focus:border-white/40">
            <option value="">Select type... 选择类型...</option>
            ${INVITATION_TYPES.map(t => `<option value="${t.value}">${t.label}</option>`).join('')}
          </select>
        </div>
        <div>
          <label class="block text-white/80 text-xs mb-1">Participants (incl. yourself) 所需人数（含自己）</label>
          <select id="invMaxParticipants"
            class="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white text-sm focus:outline-none focus:border-white/40">
            ${[1,2,3,4,5,6,7,8,9,10].map(n => `<option value="${n}">${n} people 人</option>`).join('')}
          </select>
        </div>
        <div class="grid grid-cols-2 gap-2">
          <div>
            <label class="block text-white/80 text-xs mb-1">Event Start Time (Required) 活动开始时间（必填）</label>
            <input type="datetime-local" id="invEventStart" required
              class="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white text-sm focus:outline-none focus:border-white/40">
          </div>
          <div>
            <label class="block text-white/80 text-xs mb-1">Event End Time (Required) 活动结束时间（必填）</label>
            <input type="datetime-local" id="invEventEnd" required
              class="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white text-sm focus:outline-none focus:border-white/40">
          </div>
        </div>
        <button type="submit" id="postBtn"
          class="w-full py-2 rounded-lg bg-white/20 hover:bg-white/30 text-white text-sm font-medium transition-all">
          Post Invitation 发布邀请
        </button>
        <p id="postMessage" class="text-center text-xs mt-2"></p>
      </form>
    </div>
    <div id="myInvitations">
      <p class="text-white text-xs mb-2">My Invitations 我的邀请</p>
      <div id="myInvitationsList"></div>
    </div>
    <div id="joinedInvitations" class="mt-6">
      <p class="text-white text-xs mb-2">Joined Invitations 已参与的邀请</p>
      <div id="joinedInvitationsList"></div>
    </div>
  `;

  document.getElementById('showPostForm').addEventListener('click', async () => {
    try {
      const res = await fetch('/api/account', { headers: getAuthHeader() });
      const user = await res.json();
      if (!user.email_verified) {
        document.getElementById('emailVerifyMessage').classList.remove('hidden');
        return;
      }
      document.getElementById('postForm').classList.remove('hidden');
      document.getElementById('showPostForm').classList.add('hidden');
    } catch (err) {
      console.error('Error checking email verification:', err);
    }
  });

  document.getElementById('closePostForm').addEventListener('click', () => {
    document.getElementById('postForm').classList.add('hidden');
    document.getElementById('showPostForm').classList.remove('hidden');
  });

  document.getElementById('goVerifyEmail').addEventListener('click', () => {
    document.getElementById('emailVerifyMessage').classList.add('hidden');
    document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
    document.querySelector('[data-page="account"]').classList.add('active');
    document.getElementById('page-title').innerHTML = pages.account.title;
    renderAccountPage();
  });

  document.getElementById('invTitle').addEventListener('input', function() {
    document.getElementById('titleCount').textContent = countWords(this.value);
  });

  document.getElementById('invDescription').addEventListener('input', function() {
    document.getElementById('descCount').textContent = this.value.length;
  });

  document.getElementById('invitationForm').addEventListener('submit', handlePostInvitation);
  loadMyInvitations();
  loadJoinedInvitations();
}

function loadMyInvitations() {
  fetch('/api/my-invitations', { headers: getAuthHeader() })
    .then(res => res.json())
    .then(invitations => {
      const container = document.getElementById('myInvitationsList');
      if (invitations.length === 0) {
        container.innerHTML = '<p class="text-white text-sm text-center py-4">You haven\'t posted any invitations yet. 你还没有发布任何邀请。</p>';
        return;
      }
      container.innerHTML = invitations.map(inv => createInvitationCard({ ...inv, username: 'You 你' }, true, true)).join('');
      
      document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => handleDelete(e, 'joined'));
      });
      
      document.querySelectorAll('.chat-btn').forEach(btn => {
        btn.addEventListener('click', (e) => openChatModal(e));
      });
      
      document.querySelectorAll('.expand-desc').forEach(el => {
        el.addEventListener('click', function() {
          const inv = JSON.parse(this.dataset.inv.replace(/&#39;/g, "'"));
          showInviteModal(inv);
        });
      });
    })
    .catch(err => {
      document.getElementById('myInvitationsList').innerHTML = '<p class="text-red-400 text-sm">Error loading my invitations 加载我的邀请出错</p>';
    });
}

function loadJoinedInvitations() {
  fetch('/api/invitations/joined', { headers: getAuthHeader() })
    .then(res => res.json())
    .then(invitations => {
      const container = document.getElementById('joinedInvitationsList');
      if (!container) return;
      if (invitations.length === 0) {
        container.innerHTML = '<p class="text-white text-sm text-center py-4">You haven\'t joined any invitations yet. 你还没有参与任何邀请。</p>';
        return;
      }
      container.innerHTML = invitations.map(inv => createInvitationCard({ ...inv, username: inv.username }, false, true)).join('');
      
      document.querySelectorAll('.chat-btn').forEach(btn => {
        btn.addEventListener('click', (e) => openChatModal(e));
      });
      
      document.querySelectorAll('.expand-desc').forEach(el => {
        el.addEventListener('click', function() {
          const inv = JSON.parse(this.dataset.inv.replace(/&#39;/g, "'"));
          showInviteModal(inv);
        });
      });
    })
    .catch(err => {
      const container = document.getElementById('joinedInvitationsList');
      if (container) {
        container.innerHTML = '<p class="text-red-400 text-sm">Error loading joined invitations 加载已参与的邀请出错</p>';
      }
    });
}

function handlePostInvitation(e) {
  e.preventDefault();
  const messageEl = document.getElementById('postMessage');
  const postBtn = document.getElementById('postBtn');
  const title = document.getElementById('invTitle').value.trim();
  const description = document.getElementById('invDescription').value.trim();
  const type = document.getElementById('invType').value;
  const max_participants = parseInt(document.getElementById('invMaxParticipants').value);
  const event_start = document.getElementById('invEventStart').value;
  const event_end = document.getElementById('invEventEnd').value;

  if (!title || !description || !type) {
    messageEl.textContent = 'Please fill in all required fields 请填写所有必填字段';
    messageEl.className = 'text-center text-xs mt-2 text-red-400';
    return;
  }

  if (!event_start || !event_end) {
    messageEl.textContent = 'Event start and end times are required 活动开始和结束时间为必填项';
    messageEl.className = 'text-center text-xs mt-2 text-red-400';
    return;
  }

  const startDate = new Date(event_start);
  const endDate = new Date(event_end);

  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    messageEl.textContent = 'Invalid date format 日期格式无效';
    messageEl.className = 'text-center text-xs mt-2 text-red-400';
    return;
  }

  if (endDate <= startDate) {
    messageEl.textContent = 'Event end time must be after start time 活动结束时间必须在开始时间之后';
    messageEl.className = 'text-center text-xs mt-2 text-red-400';
    return;
  }

  if (countWords(title) > 15) {
    messageEl.textContent = 'Title cannot exceed 15 words 标题不能超过 15 个字';
    messageEl.className = 'text-center text-xs mt-2 text-red-400';
    return;
  }

  fetch('/api/account', { headers: getAuthHeader() })
    .then(res => res.json())
    .then(user => {
      if (!user.email_verified) {
        showEmailVerifyModal();
        return;
      }

      postBtn.disabled = true;
      postBtn.textContent = 'Posting... 发布中...';

      return fetch('/api/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({ title, description, type, max_participants, event_start, event_end })
      });
    })
    .then(res => {
      if (!res) return;
      return res.json();
    })
    .then(data => {
      if (!data) return;
      messageEl.textContent = 'Invitation posted successfully! 邀请发布成功！';
      messageEl.className = 'text-center text-xs mt-2 text-green-400';
      document.getElementById('invitationForm').reset();
      document.getElementById('titleCount').textContent = '0';
      document.getElementById('descCount').textContent = '0';
      document.getElementById('postForm').classList.add('hidden');
      document.getElementById('showPostForm').classList.remove('hidden');
      loadMyInvitations();
      
      document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
      document.querySelector('[data-page="joined"]').classList.add('active');
      document.getElementById('page-title').innerHTML = pages.joined.title;
      renderJoinedPage();
    })
    .catch(err => {
      messageEl.textContent = err.message || 'Failed to post invitation 发布邀请失败';
      messageEl.className = 'text-center text-xs mt-2 text-red-400';
    })
    .finally(() => {
      postBtn.disabled = false;
      postBtn.textContent = 'Post Invitation 发布邀请';
    });
}

function showInviteModal(inv) {
  const modal = document.getElementById('inviteModal');
  const modalBody = document.getElementById('modalBody');
  const typeBadge = `<span class="inline-block px-2 py-0.5 rounded-full text-xs font-medium text-white ${typeColors[inv.type] || 'bg-gray-500/80'}">${getTypeLabel(inv.type)}</span>`;
  
  modalBody.innerHTML = `
    <p class="text-white/50 text-xs">@${inv.username || 'Unknown 未知'}</p>
    <h3 class="text-white font-bold text-lg mt-1">${inv.title}</h3>
    <p class="text-white text-sm mt-3 break-words">${inv.description}</p>
    <div class="mt-3">${typeBadge}</div>
    <button class="close-modal-btn mt-4 w-full py-2 rounded-lg bg-white/20 hover:bg-white/30 text-white text-sm font-medium transition-all">Close 关闭</button>
  `;
  modal.classList.remove('hidden');
  
  modal.querySelector('.close-modal-btn').addEventListener('click', hideInviteModal);
  
  document.getElementById('closeModal').onclick = hideInviteModal;
}

function hideInviteModal() {
  document.getElementById('inviteModal').classList.add('hidden');
}

function showEmailVerifyModal() {
  document.getElementById('emailVerifyModal').classList.remove('hidden');
}

function hideEmailVerifyModal() {
  document.getElementById('emailVerifyModal').classList.add('hidden');
}

function checkEmailVerified(callback) {
  fetch('/api/account', { headers: getAuthHeader() })
    .then(res => res.json())
    .then(user => {
      if (!user.email_verified) {
        showEmailVerifyModal();
        return false;
      }
      if (callback) callback();
      return true;
    })
    .catch(err => {
      console.error('Error checking email verification:', err);
      return false;
    });
}

function renderAccountPage() {
  fetch('/api/account', { headers: getAuthHeader() })
    .then(res => {
      if (!res.ok) throw new Error('Failed to load account info 加载账号信息失败');
      return res.json();
    })
    .then(user => {
      const mbtiOptions = MBTI_TYPES.map(t => 
        `<option value="${t}" ${user.personality_type === t ? 'selected' : ''}>${t}</option>`
      ).join('');

      const emailVerifiedBadge = user.email_verified 
        ? '<span class="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-green-500/20 text-green-400">Verified 已验证</span>'
        : '<span class="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-red-500/20 text-red-400">Not Verified 未验证</span>';

      document.getElementById('page-description').innerHTML = `
        <form id="accountForm" class="space-y-4">
          <div class="bg-white/5 border border-white/10 rounded-lg p-4 space-y-3">
            <h3 class="text-white/60 text-xs font-semibold uppercase tracking-wide">Account Info 账号信息</h3>
            <div>
              <label class="block text-white/30 text-xs mb-1">Full Name 姓名</label>
              <input type="text" value="${user.full_name || 'N/A 无'}" disabled
                class="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white/30 text-sm cursor-not-allowed">
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-white/30 text-xs mb-1">Grade 年级</label>
                <input type="text" value="${user.grade || 'N/A 无'}" disabled
                  class="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white/30 text-sm cursor-not-allowed">
              </div>
              <div>
                <label class="block text-white/30 text-xs mb-1">Class 班级</label>
                <input type="text" value="${user.class || 'N/A 无'}" disabled
                  class="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white/30 text-sm cursor-not-allowed">
              </div>
            </div>
            <p class="text-white/40 text-xs italic mt-2">Contact admin to change these info. 请联系管理员修改这些信息。</p>
          </div>
          <div class="bg-white/5 border border-white/10 rounded-lg p-4 space-y-3">
            <h3 class="text-white/60 text-xs font-semibold uppercase tracking-wide flex items-center gap-2">Email Verification 邮箱验证 ${emailVerifiedBadge}</h3>
            ${user.email_verified 
              ? `<p class="text-green-400/70 text-sm">Your email has been verified. 您的邮箱已验证。</p>
                 <div>
                   <label class="block text-white/30 text-xs mb-1">Email Address 邮箱地址</label>
                   <input type="email" value="${user.email || ''}" disabled
                     class="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white/30 text-sm cursor-not-allowed">
                 </div>`
              : `<div>
                   <label class="block text-white/80 text-xs mb-1">Email Address 邮箱地址</label>
                   <input type="email" id="emailInput" value="${user.email || ''}" placeholder="Enter email 输入邮箱"
                     class="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white text-sm focus:outline-none focus:border-white/40">
                 </div>
                 <button type="button" id="sendCodeBtn"
                   class="w-full py-2 rounded-lg bg-blue-500/40 hover:bg-blue-500/60 text-white text-sm font-medium transition-all">
                   Send Verification Code 发送验证码
                 </button>
                 <div id="verifyCodeSection" class="hidden space-y-3">
                   <div>
                     <label class="block text-white/80 text-xs mb-1">Verification Code 验证码</label>
                     <input type="text" id="verifyCodeInput" maxlength="6" placeholder="Enter 6-digit code 输入6位验证码"
                       class="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white text-sm focus:outline-none focus:border-white/40">
                   </div>
                   <button type="button" id="verifyCodeBtn"
                     class="w-full py-2 rounded-lg bg-green-500/40 hover:bg-green-500/60 text-white text-sm font-medium transition-all">
                     Verify 验证
                   </button>
                 </div>
                 <p id="emailMessage" class="text-center text-xs"></p>`
            }
          </div>
          <div>
            <label class="block text-white/80 text-xs mb-1">Username (max ${MAX_CHARS} chars) 用户名（最多${MAX_CHARS}字）</label>
            <input type="text" id="username" name="username" maxlength="${MAX_CHARS}" value="${user.username}"
              class="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white text-sm focus:outline-none focus:border-white/40">
          </div>
          <div>
            <label class="block text-white/80 text-xs mb-1">New password (max ${MAX_CHARS} chars, leave empty to keep current) 新密码（最多${MAX_CHARS}字，留空保持当前密码）</label>
            <input type="password" id="password" name="password" maxlength="${MAX_CHARS}"
              class="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white text-sm focus:outline-none focus:border-white/40">
          </div>
          <div>
            <label class="block text-white/80 text-xs mb-1">Personality Type (MBTI) 性格类型（MBTI）</label>
            <select id="personalityType" name="personalityType"
              class="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white text-sm focus:outline-none focus:border-white/40">
<option value="">Select type... 选择类型...</option>
            ${mbtiOptions}
          </select>
        </div>
        <div>
          <label class="block text-white/80 text-xs mb-1">Current password (required to save) 当前密码（保存时必填）</label>
          <input type="password" id="currentPassword" name="currentPassword" required
            class="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white text-sm focus:outline-none focus:border-white/40">
        </div>
        <button type="submit" id="saveBtn"
          class="w-full py-2 rounded-lg bg-white/20 hover:bg-white/30 text-white text-sm font-medium transition-all">
保存更改 Save Changes
        </button>
        <p id="accountMessage" class="text-center text-xs mt-2"></p>
      </form>
    `;

      document.getElementById('accountForm').addEventListener('submit', handleAccountSubmit);
      const sendCodeBtn = document.getElementById('sendCodeBtn');
      const verifyCodeBtn = document.getElementById('verifyCodeBtn');
      if (sendCodeBtn) sendCodeBtn.addEventListener('click', handleSendCode);
      if (verifyCodeBtn) verifyCodeBtn.addEventListener('click', handleVerifyCode);
    })
    .catch(err => {
      document.getElementById('page-description').innerHTML = `<p class="text-red-400 text-sm">Error loading account info 加载账号信息出错</p>`;
    });
}

async function handleAccountSubmit(e) {
  e.preventDefault();
  const messageEl = document.getElementById('accountMessage');
  const saveBtn = document.getElementById('saveBtn');
  
  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value;
  const personality_type = document.getElementById('personalityType').value;
  const currentPassword = document.getElementById('currentPassword').value;

  if (!currentPassword) {
    messageEl.textContent = 'Please enter current password 请输入当前密码';
    messageEl.className = 'text-center text-xs mt-2 text-red-400';
    return;
  }

  const usernameRegex = /^[a-zA-Z][a-zA-Z0-9_.]{0,19}$/;
  const passwordRegex = /^[a-zA-Z0-9!@#$%^&*()\-_=+\[\]{}|;:' ,./<>?]{5,}$/;

  if (username && !usernameRegex.test(username)) {
    messageEl.textContent = 'Username must start with a letter and contain only letters, numbers, underscores or dots (max 20 chars) 用户名必须以字母开头，只能包含字母、数字、下划线或点（最多 20 个字符）';
    messageEl.className = 'text-center text-xs mt-2 text-red-400';
    return;
  }

  if (password && !passwordRegex.test(password)) {
    messageEl.textContent = 'Password must be at least 5 characters, containing only letters, numbers, and common symbols 密码至少 5 个字符，只能包含字母、数字和常用符号';
    messageEl.className = 'text-center text-xs mt-2 text-red-400';
    return;
  }

  saveBtn.disabled = true;
  saveBtn.textContent = 'Saving... 保存中...';

  try {
    const res = await fetch('/api/account', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ username, password, personality_type, currentPassword })
    });
    const data = await res.json();
    
    if (!res.ok) {
      throw new Error(data.error || 'Update failed 更新失败');
    }
    
    messageEl.textContent = 'Account updated successfully! 账号更新成功！';
    messageEl.className = 'text-center text-xs mt-2 text-green-400';
    document.getElementById('password').value = '';
    document.getElementById('currentPassword').value = '';
  } catch (err) {
    messageEl.textContent = err.message;
    messageEl.className = 'text-center text-xs mt-2 text-red-400';
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = '保存更改 Save Changes';
  }
}

async function handleSendCode() {
  const emailInput = document.getElementById('emailInput');
  const messageEl = document.getElementById('emailMessage');
  const sendBtn = document.getElementById('sendCodeBtn');
  const email = emailInput.value.trim();

  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !EMAIL_REGEX.test(email)) {
    messageEl.textContent = 'Please enter a valid email address 请输入有效的邮箱地址';
    messageEl.className = 'text-center text-xs mt-2 text-red-400';
    return;
  }

  sendBtn.disabled = true;
  sendBtn.textContent = 'Sending... 发送中...';
  messageEl.textContent = '';

  try {
    const res = await fetch('/api/email/send-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ email })
    });
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || 'Failed to send code 发送验证码失败');
    }

    messageEl.textContent = 'Verification code sent! Check your email. 验证码已发送！请检查邮箱';
    messageEl.className = 'text-center text-xs mt-2 text-green-400';
    document.getElementById('verifyCodeSection').classList.remove('hidden');
  } catch (err) {
    messageEl.textContent = err.message;
    messageEl.className = 'text-center text-xs mt-2 text-red-400';
  } finally {
    sendBtn.disabled = false;
    sendBtn.textContent = 'Send Verification Code 发送验证码';
  }
}

async function handleVerifyCode() {
  const codeInput = document.getElementById('verifyCodeInput');
  const messageEl = document.getElementById('emailMessage');
  const verifyBtn = document.getElementById('verifyCodeBtn');
  const code = codeInput.value.trim();

  if (!code || code.length !== 6) {
    messageEl.textContent = 'Please enter a 6-digit verification code 请输入6位验证码';
    messageEl.className = 'text-center text-xs mt-2 text-red-400';
    return;
  }

  verifyBtn.disabled = true;
  verifyBtn.textContent = 'Verifying... 验证中...';
  messageEl.textContent = '';

  try {
    const res = await fetch('/api/email/verify-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ code })
    });
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || 'Verification failed 验证失败');
    }

    messageEl.textContent = 'Email verified successfully! 邮箱验证成功！';
    messageEl.className = 'text-center text-xs mt-2 text-green-400';
    document.getElementById('verifyCodeSection').classList.add('hidden');
    setTimeout(() => renderAccountPage(), 1500);
  } catch (err) {
    messageEl.textContent = err.message;
    messageEl.className = 'text-center text-xs mt-2 text-red-400';
  } finally {
    verifyBtn.disabled = false;
    verifyBtn.textContent = 'Verify 验证';
  }
}

document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', () => {
    document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
    item.classList.add('active');
    
    const page = item.dataset.page;
    document.getElementById('page-title').innerHTML = pages[page].title;
    
    if (pages[page].render) {
      pages[page].render();
    } else {
      document.getElementById('page-description').innerHTML = pages[page].description;
      if (page === 'about') {
        const currentDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
        const termsText = `Effective Date: ${currentDate}

Welcome to the OriLink 元联 social platform. By creating an account, you agree to follow these rules. This platform is built for our community, and staying on it is a privilege, not a right.

1. Security and "No Hacking" Policy
We take the security of our community seriously. By using this site, you agree to the following:

No Unauthorized Access: You may not attempt to access, "hack," or bypass any security features of this website. This includes trying to guess passwords, using automated "brute force" tools, or exploiting bugs.

No Data Mining: You are prohibited from using scripts, crawlers, or "scrapers" to extract user data or site content.

Reporting Vulnerabilities: If you find a security flaw or a "glitch," you must report it to the Site Administrator immediately. Exploiting a known flaw for fun or profit will result in an immediate permanent ban and referral to school administration.

Account Integrity: You are responsible for your login credentials. Sharing your password or "lending" your account to others is strictly prohibited.

2. Intellectual Property
This website, including its layout, design, custom code, and graphics, is the property of OriLink 元联.

No Cloning: You may not copy the source code, CSS, or design elements to create a "clone" or a competing site.

Content Ownership: While you own the posts you make, the "look and feel" of the platform belongs to us. Redistribution of any site assets without written permission is a violation of these terms.

3. User Conduct
Since this is a school-only platform, the school's Student Code of Conduct applies here 24/7.

No Harassment: Cyberbullying, hate speech, and harassment will not be tolerated.

School Use Only: This site is for Shanghai New Epoch Bilingual School students and staff. Do not invite or share access with people outside of our school.

4. Consequences
Failure to follow these rules—especially those regarding hacking or intellectual property theft—may result in:

Immediate account suspension or deletion.

Disciplinary action through the School Administration.

Legal action, if the "hacking" results in data breaches or significant damage to the system.

Note: By clicking "Sign Up," you acknowledge that you have read and agreed to these terms. Stay safe and be respectful!`;
        const termsEl = document.getElementById('aboutTermsText');
        if (termsEl) {
          termsEl.textContent = termsText;
        }
      }
    }
  });
});

document.getElementById('logoutBtn').addEventListener('click', () => {
  localStorage.removeItem('token');
  localStorage.removeItem('username');
  window.location.href = '/login.html';
});

renderInvitationsPage();

document.getElementById('closeModal').addEventListener('click', hideInviteModal);
document.getElementById('modalBackdrop').addEventListener('click', hideInviteModal);

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

document.getElementById('emailVerifyGoToAccountBtn').addEventListener('click', () => {
  hideEmailVerifyModal();
  document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
  document.querySelector('[data-page="account"]').classList.add('active');
  document.getElementById('page-title').innerHTML = pages.account.title;
  renderAccountPage();
});

document.getElementById('emailVerifyBackdrop').addEventListener('click', hideEmailVerifyModal);

getCurrentUser().then(user => {
  initSocket();
});
