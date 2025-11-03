// ProfilePage.js - Load user profile and posts
class ProfilePage {
  constructor() {
    this.uc = new window.UserContext();
    this.init();
  }

  init() {
    this.guard();
    this.loadProfile();
    this.loadMyPosts();
  const btn = document.getElementById('btnEdit');
  if (btn) btn.addEventListener('click', () => window.location.href = 'edit-profile.html');
  }

  guard() {
    const token = localStorage.getItem('accessToken');
    if (!token) window.location.href = 'login.html';
  }

  async loadProfile() {
    try {
      const json = await this.uc.authedFetch('/api/users/profile', { method: 'GET' });
      const user = json?.data || json;
      const avatar = user?.avatarUrl ? (user.avatarUrl.startsWith('http') ? user.avatarUrl : `${this.uc.baseUrl()}${user.avatarUrl}`) : 'https://i.pravatar.cc/150';
      const username = user?.username || user?.userName || user?.email || 'user';
      document.getElementById('navAvatar').src = avatar;
      document.getElementById('profileAvatar').src = avatar;
      document.getElementById('profileUsername').textContent = username;
      document.getElementById('profileFullName').textContent = user?.fullName || '';
      document.getElementById('profileBio').textContent = user?.bio || '';
      const websiteEl = document.getElementById('profileWebsite');
      if (user?.website) { websiteEl.textContent = user.website; websiteEl.href = user.website; } else { websiteEl.style.display = 'none'; }
    } catch (e) {
      console.error('Load profile error', e);
    }
  }

  async loadMyPosts() {
    const grid = document.getElementById('postsGrid');
    if (!grid) return;
    grid.innerHTML = '';
    const loading = document.createElement('div');
    loading.textContent = 'Đang tải bài viết...';
    loading.style.padding = '12px'; loading.style.color = '#666';
    grid.parentElement.insertBefore(loading, grid);

    try {
      const json = await this.uc.authedFetch('/api/posts/me?page=1&pageSize=60', { method: 'GET' });
      const items = json?.data || json?.items || json || [];
      loading.remove();
      document.getElementById('postsCount').textContent = Array.isArray(items) ? items.length : 0;

      if (!Array.isArray(items) || items.length === 0) {
        const empty = document.createElement('div');
        empty.textContent = 'Bạn chưa có bài đăng nào.';
        empty.style.padding = '12px'; empty.style.color = '#666';
        grid.appendChild(empty);
        return;
      }

      for (const post of items) {
        const imageUrls = post?.imageUrls || post?.Images || post?.images || [];
        const videoUrl = post?.videoUrl || post?.VideoUrl || post?.video?.url || null;
        const mediaUrl = videoUrl || (imageUrls[0] || null);
        const cell = document.createElement('div');
        cell.className = 'post-item';
        if (mediaUrl) {
          if (videoUrl) {
            const video = document.createElement('video');
            video.src = mediaUrl; video.muted = true; video.playsInline = true; video.preload = 'metadata';
            video.style.position = 'absolute'; video.style.width = '100%'; video.style.height = '100%'; video.style.objectFit = 'cover';
            cell.appendChild(video);
          } else {
            const img = document.createElement('img');
            img.src = mediaUrl; img.alt = 'Post';
            cell.appendChild(img);
          }
        }
        grid.appendChild(cell);
      }
    } catch (e) {
      loading.textContent = 'Lỗi tải bài đăng.';
      loading.style.color = '#d00';
    }
  }

  
}

document.addEventListener('DOMContentLoaded', () => new ProfilePage());
