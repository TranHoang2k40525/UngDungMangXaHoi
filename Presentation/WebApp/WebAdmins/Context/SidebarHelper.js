/**
 * SidebarHelper.js
 * Utility để cập nhật thông tin avatar + tên tài khoản trong sidebar
 */

export async function updateSidebarProfile(adminAPI) {
  try {
    const profile = await adminAPI.getProfile();
    
    const sidebarAvatar = document.getElementById('sidebarAvatar');
    const sidebarFullName = document.getElementById('sidebarFullName');
    const sidebarEmail = document.getElementById('sidebarEmail');
    
    // Generate default avatar SVG với chữ cái đầu tên
    const firstLetter = (profile.fullName || 'A').charAt(0).toUpperCase();
    const defaultAvatar = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40'%3E%3Crect fill='%236366F1' width='40' height='40' rx='20'/%3E%3Ctext fill='%23fff' x='50%25' y='50%25' text-anchor='middle' dy='.3em' font-size='18' font-weight='700'%3E${firstLetter}%3C/text%3E%3C/svg%3E`;
    
    if (sidebarAvatar) {
      sidebarAvatar.src = profile.avatarUrl || defaultAvatar;
      // Fallback nếu ảnh lỗi
      sidebarAvatar.onerror = () => {
        sidebarAvatar.src = defaultAvatar;
      };
    }
    
    if (sidebarFullName) {
      sidebarFullName.textContent = profile.fullName || 'Admin User';
    }
    
    if (sidebarEmail) {
      sidebarEmail.textContent = profile.email || '';
    }
  } catch (error) {
    console.error('Lỗi khi cập nhật sidebar profile:', error);
  }
}

/**
 * Tạo HTML cho sidebar footer với avatar + account info
 */
export function createSidebarFooterHTML() {
  return `
    <!-- Avatar + Account Info -->
    <div style="padding: 16px; border-top: 1px solid rgba(255,255,255,0.1); margin-bottom: 8px;">
      <div style="display: flex; align-items: center; gap: 12px;">
        <img id="sidebarAvatar" src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40'%3E%3Crect fill='%236366F1' width='40' height='40' rx='20'/%3E%3Ctext fill='%23fff' x='50%25' y='50%25' text-anchor='middle' dy='.3em' font-size='18' font-weight='700'%3E...%3C/text%3E%3C/svg%3E" 
             alt="Avatar" 
             style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover; border: 2px solid #fff;">
        <div style="flex: 1; min-width: 0;">
          <div id="sidebarFullName" style="color: #fff; font-weight: 600; font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
            Loading...
          </div>
          <div id="sidebarEmail" style="color: rgba(255,255,255,0.7); font-size: 12px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
            ...
          </div>
        </div>
      </div>
    </div>
    <a class="nav-item" href="#" id="logoutBtn">Logout</a>
  `;
}
