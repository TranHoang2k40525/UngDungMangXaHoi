// HomePage.js - Xử lý logic cho trang chủ
class HomePage {
  constructor() {
    this.authService = new AuthService();
    this.userContext = new window.UserContext();
    this.init();
  }

  init() {
    this.bindEvents();
    this.checkAuthentication();
    this.loadUserInfo();
    this.hydrateLayoutProfile();
    this.loadFeed();
  }

  bindEvents() {
    // Logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => this.handleLogout());
    }

    // Profile button
    const profileBtn = document.getElementById('profileBtn');
    if (profileBtn) {
      profileBtn.addEventListener('click', () => this.handleProfile());
    }

    // Settings button
    const settingsBtn = document.getElementById('settingsBtn');
    if (settingsBtn) {
      settingsBtn.addEventListener('click', () => this.handleSettings());
    }
  }

  checkAuthentication() {
    if (!this.authService.isAuthenticated()) {
      UIUtils.redirect('login.html');
    }
  }

  loadUserInfo() {
    const user = this.authService.getCurrentUser();
    if (user) {
      // Hiển thị thông tin user
      const userNameElement = document.getElementById('userName');
      if (userNameElement) {
        userNameElement.textContent = user.email || 'User';
      }

      const userEmailElement = document.getElementById('userEmail');
      if (userEmailElement) {
        userEmailElement.textContent = user.email || '';
      }
    }
  }

  handleLogout() {
    if (UIUtils.showConfirm('Bạn có chắc chắn muốn đăng xuất?')) {
      this.authService.logout();
    }
  }

  handleProfile() {
    // Chuyển đến trang profile (chưa có)
    UIUtils.showAlert('Tính năng profile đang được phát triển');
  }

  handleSettings() {
    // Chuyển đến trang settings (chưa có)
    UIUtils.showAlert('Tính năng settings đang được phát triển');
  }

  async loadFeed() {
    const feedContainer = document.querySelector('.feed');
    if (!feedContainer) return;

    // Remove existing static posts
    feedContainer.querySelectorAll('.post').forEach(el => el.remove());

    // Show loading
    const loading = document.createElement('div');
    loading.textContent = 'Đang tải bài viết...';
    loading.style.padding = '12px 16px';
    loading.style.color = '#666';
    feedContainer.appendChild(loading);

    try {
      const json = await this.userContext.authedFetch(`/api/posts/feed?page=1&pageSize=20`, { method: 'GET' });
      const items = json?.data || json?.items || json?.results || json || [];

      loading.remove();

      if (!Array.isArray(items) || items.length === 0) {
        const empty = document.createElement('div');
        empty.textContent = 'Chưa có bài viết nào.';
        empty.style.padding = '12px 16px';
        empty.style.color = '#666';
        feedContainer.appendChild(empty);
        return;
      }

      for (const post of items) {
        feedContainer.appendChild(this.renderPostCard(post));
      }
    } catch (err) {
      console.error('Load feed error:', err);
      loading.textContent = `Lỗi tải bài viết: ${err?.message || err}`;
      loading.style.color = '#d00';
    }
  }

  async hydrateLayoutProfile() {
    try {
      const json = await this.userContext.authedFetch('/api/users/profile', { method: 'GET' });
      const user = json?.data || json || {};
      const username = user.username || user.userName || user.email || 'User';
      const fullName = user.fullName || '';
      const avatar = user.avatarUrl ? (user.avatarUrl.startsWith('http') ? user.avatarUrl : `${this.userContext.baseUrl()}${user.avatarUrl}`) : 'https://i.pravatar.cc/150';

      // Sidebar avatar
      const sideAvatar = document.querySelector('.sidebar .profile-avatar img');
      if (sideAvatar) sideAvatar.src = avatar;

      // Right panel user card
      const rightUserName = document.querySelector('.right-panel .user-info p');
      const rightDisplayName = document.querySelector('.right-panel .user-info span');
      const rightAvatar = document.querySelector('.right-panel .profile-avatar img');
      if (rightUserName) rightUserName.textContent = username;
      if (rightDisplayName) rightDisplayName.textContent = fullName || username;
      if (rightAvatar) rightAvatar.src = avatar;
    } catch (e) {
      // Non-blocking
      console.warn('Hydrate layout profile failed:', e);
    }
  }

  // Render a single post card based on existing styles
  renderPostCard(post) {
    const el = document.createElement('div');
    el.className = 'post';

    const authorName = post?.authorName || post?.author?.userName || post?.author?.email || 'user';
    const createdAt = post?.createdAt || post?.CreatedAt || post?.createdDate || new Date().toISOString();
    const caption = post?.caption || post?.Caption || '';

    // Detect media
    const imageUrls = post?.imageUrls || post?.Images || post?.images || [];
    const videoUrl = post?.videoUrl || post?.VideoUrl || post?.video?.url || post?.videoURL || null;
    const mediaUrl = videoUrl || (Array.isArray(imageUrls) && imageUrls.length ? imageUrls[0] : null);

    // Header
    const header = document.createElement('div');
    header.className = 'post-header';
    header.innerHTML = `
      <div class="header-left">
        <a href="profile.html" style="text-decoration: none">
          <div class="avatar">${(authorName||'u')[0].toString().toUpperCase()}</div>
        </a>
        <div class="author-info">
          <a href="profile.html" style="text-decoration: none; color: inherit">
            <h4>${authorName}</h4>
          </a>
          <p>${DateUtils?.timeAgo ? DateUtils.timeAgo(createdAt) : ''}</p>
        </div>
      </div>
      <button class="more-btn"><i class="fas fa-ellipsis-h"></i></button>
    `;
    el.appendChild(header);

    // Media (prefer original URL as-is)
    if (mediaUrl) {
      let mediaEl;
      if (videoUrl) {
        mediaEl = document.createElement('video');
        mediaEl.className = 'post-image';
        mediaEl.setAttribute('controls', '');
        mediaEl.setAttribute('preload', 'metadata');
        mediaEl.src = mediaUrl; // use original URL, no headers
      } else {
        mediaEl = document.createElement('img');
        mediaEl.className = 'post-image';
        mediaEl.alt = 'Post';
        mediaEl.src = mediaUrl;
      }
      el.appendChild(mediaEl);
    }

    // Actions
    const actions = document.createElement('div');
    actions.className = 'post-actions';
    actions.innerHTML = `
      <button class="action-btn" onclick="toggleLike(this)"><i class="far fa-heart"></i></button>
      <button class="action-btn"><i class="far fa-comment"></i></button>
      <button class="action-btn"><i class="far fa-paper-plane"></i></button>
      <button class="action-btn save-btn"><i class="far fa-bookmark"></i></button>
    `;
    el.appendChild(actions);

    // Caption
    const cap = document.createElement('div');
    cap.className = 'post-caption';
    cap.innerHTML = `<a href="profile.html" style="text-decoration:none; color:inherit"><strong>${authorName}</strong></a> <span>${(caption||'')}</span>`;
    el.appendChild(cap);

    // Timestamp
    const ts = document.createElement('div');
    ts.className = 'timestamp';
    ts.textContent = DateUtils?.timeAgo ? DateUtils.timeAgo(createdAt) : '';
    el.appendChild(ts);

    return el;
  }
}

// Khởi tạo khi DOM loaded
document.addEventListener('DOMContentLoaded', () => {
  new HomePage();
});
