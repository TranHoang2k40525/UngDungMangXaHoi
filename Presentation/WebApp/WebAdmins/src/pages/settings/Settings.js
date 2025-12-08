import { useState, useEffect } from 'react';
import { adminAPI, authAPI } from '../../services/api.js';
import { useAuth } from '../../contexts/AuthContext.js';
import { useAdmin } from '../../contexts/AdminContext.js';
import './Settings.css';

export default function Settings() {
  const { user } = useAuth();
  const { updateAdminData } = useAdmin();
  const [activeTab, setActiveTab] = useState('profile');
  const [profileData, setProfileData] = useState({
    fullName: '',
    email: '',
    phone: '',
    bio: '',
    address: '',
    hometown: '',
    job: '',
    website: '',
    dateOfBirth: '',
    gender: 'Nam',
    isPrivate: false,
    adminLevel: 'moderator',
    avatarUrl: '',
  });
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState('');
  const [passwordData, setPasswordData] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    loadAdminProfile();
  }, []);

  const loadAdminProfile = async () => {
    try {
      const response = await adminAPI.getProfile();
      const profile = response.data || response;
      
      setProfileData({
        fullName: profile.fullName || '',
        email: profile.email || user?.email || '',
        phone: profile.phone || '',
        bio: profile.bio || '',
        address: profile.address || '',
        hometown: profile.hometown || '',
        job: profile.job || '',
        website: profile.website || '',
        dateOfBirth: profile.dateOfBirth ? profile.dateOfBirth.split('T')[0] : '',
        gender: profile.gender || 'Nam',
        isPrivate: profile.isPrivate || false,
        adminLevel: profile.adminLevel || 'moderator',
        avatarUrl: profile.avatarUrl || '',
      });
      
      setAvatarPreview(profile.avatarUrl || '');
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setMessage({ type: 'error', text: 'Kích thước ảnh không được vượt quá 5MB' });
        return;
      }
      
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      let avatarUrl = profileData.avatarUrl;

      // Nếu có chọn avatar mới, dùng base64 từ preview
      if (avatarFile && avatarPreview) {
        avatarUrl = avatarPreview; // Base64 string
        console.log('Using avatar preview (base64)');
      }

      // Cập nhật profile với avatar URL
      const updateData = {
        FullName: profileData.fullName,
        Phone: profileData.phone || null,
        Bio: profileData.bio || null,
        Address: profileData.address || null,
        Hometown: profileData.hometown || null,
        Job: profileData.job || null,
        Website: profileData.website || null,
        DateOfBirth: profileData.dateOfBirth || null,
        Gender: profileData.gender,
        IsPrivate: profileData.isPrivate,
        AvatarUrl: avatarUrl || null,
      };

      console.log('Updating profile with data:', updateData);
      await adminAPI.updateProfile(updateData);
      
      // Cập nhật AdminContext để tất cả components tự động cập nhật
      updateAdminData({
        fullName: updateData.FullName,
        phone: updateData.Phone,
        bio: updateData.Bio,
        address: updateData.Address,
        hometown: updateData.Hometown,
        job: updateData.Job,
        website: updateData.Website,
        dateOfBirth: updateData.DateOfBirth,
        gender: updateData.Gender,
        isPrivate: updateData.IsPrivate,
        avatarUrl: avatarUrl
      });
      
      console.log('AdminContext updated with avatarUrl:', avatarUrl);
      
      // Cập nhật local state để preview hiển thị đúng
      setProfileData(prev => ({ ...prev, avatarUrl: avatarUrl }));
      setAvatarPreview(avatarUrl);
      
      setMessage({ type: 'success', text: 'Cập nhật thông tin thành công!' });
      setAvatarFile(null);
      setAvatarFile(null);
    } catch (error) {
      console.error('Profile update error:', error);
      console.error('Error response:', error.response);
      setMessage({ type: 'error', text: error.message || 'Cập nhật thất bại' });
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setMessage({ type: 'error', text: 'Mật khẩu xác nhận không khớp' });
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setMessage({ type: 'error', text: 'Mật khẩu mới phải có ít nhất 6 ký tự' });
      return;
    }

    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      await authAPI.changePassword({
        OldPassword: passwordData.oldPassword,
        NewPassword: passwordData.newPassword,
      });
      
      setMessage({ type: 'success', text: 'Đổi mật khẩu thành công!' });
      setPasswordData({ oldPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Đổi mật khẩu thất bại' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="settings-page">
      <div className="page-header">
        <h1>Cài đặt</h1>
        <p>Quản lý tài khoản và cài đặt hệ thống</p>
      </div>

      <div className="settings-container">
        <div className="settings-tabs">
          <button
            className={`tab-btn ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            👤 Thông tin cá nhân
          </button>
          <button
            className={`tab-btn ${activeTab === 'password' ? 'active' : ''}`}
            onClick={() => setActiveTab('password')}
          >
            🔒 Đổi mật khẩu
          </button>
          <button
            className={`tab-btn ${activeTab === 'system' ? 'active' : ''}`}
            onClick={() => setActiveTab('system')}
          >
            ⚙️ Hệ thống
          </button>
        </div>

        <div className="card settings-content">
          {activeTab === 'profile' && (
            <form onSubmit={handleProfileSubmit}>
              <h3>Chỉnh sửa thông tin Admin</h3>
              
              <div className="avatar-upload-section">
                <div className="avatar-preview">
                  <img
                    src={avatarPreview || `https://ui-avatars.com/api/?name=${encodeURIComponent(profileData.fullName || 'Admin')}&background=6366F1&color=fff&size=150`}
                    alt="Avatar"
                    className="profile-avatar-large"
                  />
                  <label htmlFor="avatar-input" className="avatar-upload-btn">
                    📷 Thay đổi ảnh
                  </label>
                  <input
                    id="avatar-input"
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    style={{ display: 'none' }}
                  />
                </div>
                <div className="avatar-info">
                  <h4>{profileData.fullName || 'Admin'}</h4>
                  <p className="badge-admin">{profileData.adminLevel === 'super_admin' ? '👑 Super Admin' : profileData.adminLevel === 'admin' ? '⭐ Admin' : '🛡️ Moderator'}</p>
                  <p><strong>Email:</strong> {profileData.email}</p>
                  <p className="text-muted">Email không thể thay đổi</p>
                </div>
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label>Họ và tên *</label>
                  <input
                    type="text"
                    value={profileData.fullName}
                    onChange={(e) => setProfileData({ ...profileData, fullName: e.target.value })}
                    className="input"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Số điện thoại</label>
                  <input
                    type="tel"
                    value={profileData.phone}
                    onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                    className="input"
                    placeholder="0123456789"
                  />
                </div>

                <div className="form-group">
                  <label>Ngày sinh *</label>
                  <input
                    type="date"
                    value={profileData.dateOfBirth}
                    onChange={(e) => setProfileData({ ...profileData, dateOfBirth: e.target.value })}
                    className="input"
                    max={new Date().toISOString().split('T')[0]}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Giới tính *</label>
                  <select
                    value={profileData.gender}
                    onChange={(e) => setProfileData({ ...profileData, gender: e.target.value })}
                    className="input"
                    required
                  >
                    <option value="Nam">Nam</option>
                    <option value="Nữ">Nữ</option>
                    <option value="Khác">Khác</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Địa chỉ</label>
                  <input
                    type="text"
                    value={profileData.address}
                    onChange={(e) => setProfileData({ ...profileData, address: e.target.value })}
                    className="input"
                    placeholder="123 Đường ABC, Quận 1, TP.HCM"
                  />
                </div>

                <div className="form-group">
                  <label>Quê quán</label>
                  <input
                    type="text"
                    value={profileData.hometown}
                    onChange={(e) => setProfileData({ ...profileData, hometown: e.target.value })}
                    className="input"
                    placeholder="TP. Hồ Chí Minh"
                  />
                </div>

                <div className="form-group">
                  <label>Công việc</label>
                  <input
                    type="text"
                    value={profileData.job}
                    onChange={(e) => setProfileData({ ...profileData, job: e.target.value })}
                    className="input"
                    placeholder="Quản trị viên hệ thống"
                  />
                </div>

                <div className="form-group">
                  <label>Website</label>
                  <input
                    type="url"
                    value={profileData.website}
                    onChange={(e) => setProfileData({ ...profileData, website: e.target.value })}
                    className="input"
                    placeholder="https://example.com"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Giới thiệu</label>
                <textarea
                  value={profileData.bio}
                  onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
                  className="input"
                  rows={4}
                  placeholder="Viết vài dòng giới thiệu về bản thân..."
                />
              </div>

              <div className="form-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={profileData.isPrivate}
                    onChange={(e) => setProfileData({ ...profileData, isPrivate: e.target.checked })}
                  />
                  <span>Tài khoản riêng tư</span>
                </label>
                <p className="text-muted">Ẩn thông tin cá nhân khỏi người dùng khác</p>
              </div>

              {message.text && (
                <div className={`message ${message.type}`}>{message.text}</div>
              )}

              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? <span className="loading"></span> : '💾 Lưu thay đổi'}
              </button>
            </form>
          )}

          {activeTab === 'password' && (
            <form onSubmit={handlePasswordSubmit}>
              <h3>Đổi mật khẩu</h3>

              <div className="form-group">
                <label>Mật khẩu hiện tại</label>
                <input
                  type="password"
                  value={passwordData.oldPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, oldPassword: e.target.value })}
                  className="input"
                  required
                />
              </div>

              <div className="form-group">
                <label>Mật khẩu mới</label>
                <input
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                  className="input"
                  required
                  minLength={6}
                />
              </div>

              <div className="form-group">
                <label>Xác nhận mật khẩu mới</label>
                <input
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                  className="input"
                  required
                />
              </div>

              {message.text && (
                <div className={`message ${message.type}`}>{message.text}</div>
              )}

              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? <span className="loading"></span> : 'Đổi mật khẩu'}
              </button>
            </form>
          )}

          {activeTab === 'system' && (
            <div>
              <h3>Cài đặt hệ thống</h3>
              
              <div className="system-section">
                <h4>🔧 Thông tin hệ thống</h4>
                <div className="system-info">
                  <div className="info-item">
                    <span className="label">Phiên bản:</span>
                    <span className="value">1.0.0</span>
                  </div>
                  <div className="info-item">
                    <span className="label">API Server:</span>
                    <span className="value">{import.meta.env.VITE_API_URL || 'http://localhost:5297'}</span>
                  </div>
                  <div className="info-item">
                    <span className="label">Môi trường:</span>
                    <span className="value badge">{import.meta.env.MODE === 'production' ? 'Production' : 'Development'}</span>
                  </div>
                  <div className="info-item">
                    <span className="label">Vai trò:</span>
                    <span className="value badge">Admin</span>
                  </div>
                </div>
              </div>

              <div className="system-section">
                <h4>📊 Thiết lập nội dung</h4>
                <div className="setting-group">
                  <label className="setting-item">
                    <div className="setting-info">
                      <strong>Tự động kiểm duyệt bài đăng</strong>
                      <p>Bật AI để tự động phát hiện nội dung vi phạm</p>
                    </div>
                    <input type="checkbox" defaultChecked className="switch" />
                  </label>

                  <label className="setting-item">
                    <div className="setting-info">
                      <strong>Chế độ phê duyệt trước</strong>
                      <p>Yêu cầu admin phê duyệt trước khi bài đăng hiển thị</p>
                    </div>
                    <input type="checkbox" className="switch" />
                  </label>

                  <label className="setting-item">
                    <div className="setting-info">
                      <strong>Cho phép bình luận ẩn danh</strong>
                      <p>Người dùng có thể bình luận mà không hiển thị tên</p>
                    </div>
                    <input type="checkbox" className="switch" />
                  </label>

                  <div className="setting-item">
                    <div className="setting-info">
                      <strong>Giới hạn độ dài bài đăng</strong>
                      <p>Số ký tự tối đa cho một bài đăng</p>
                    </div>
                    <input type="number" defaultValue="5000" className="input-small" />
                  </div>

                  <div className="setting-item">
                    <div className="setting-info">
                      <strong>Số lượng ảnh tối đa/bài</strong>
                      <p>Giới hạn số ảnh người dùng có thể đăng</p>
                    </div>
                    <input type="number" defaultValue="10" className="input-small" />
                  </div>
                </div>
              </div>

              <div className="system-section">
                <h4>👥 Quản lý người dùng</h4>
                <div className="setting-group">
                  <label className="setting-item">
                    <div className="setting-info">
                      <strong>Xác thực email bắt buộc</strong>
                      <p>Yêu cầu người dùng xác thực email khi đăng ký</p>
                    </div>
                    <input type="checkbox" defaultChecked className="switch" />
                  </label>

                  <label className="setting-item">
                    <div className="setting-info">
                      <strong>Cho phép đăng ký tài khoản doanh nghiệp</strong>
                      <p>Người dùng có thể đăng ký làm tài khoản kinh doanh</p>
                    </div>
                    <input type="checkbox" defaultChecked className="switch" />
                  </label>

                  <div className="setting-item">
                    <div className="setting-info">
                      <strong>Độ tuổi tối thiểu</strong>
                      <p>Độ tuổi tối thiểu để đăng ký tài khoản</p>
                    </div>
                    <input type="number" defaultValue="13" className="input-small" />
                  </div>

                  <div className="setting-item">
                    <div className="setting-info">
                      <strong>Thời gian chờ giữa các đăng ký</strong>
                      <p>Phút chờ giữa các lần tạo tài khoản từ cùng IP</p>
                    </div>
                    <input type="number" defaultValue="5" className="input-small" />
                  </div>
                </div>
              </div>

              <div className="system-section">
                <h4>⚠️ Kiểm duyệt & An toàn</h4>
                <div className="setting-group">
                  <label className="setting-item">
                    <div className="setting-info">
                      <strong>Chặn từ khóa nhạy cảm</strong>
                      <p>Tự động ẩn/xóa nội dung chứa từ cấm</p>
                    </div>
                    <input type="checkbox" defaultChecked className="switch" />
                  </label>

                  <label className="setting-item">
                    <div className="setting-info">
                      <strong>Phát hiện spam tự động</strong>
                      <p>AI phát hiện và chặn hoạt động spam</p>
                    </div>
                    <input type="checkbox" defaultChecked className="switch" />
                  </label>

                  <div className="setting-item">
                    <div className="setting-info">
                      <strong>Số báo cáo để tự động ẩn</strong>
                      <p>Số lượng báo cáo cần thiết để ẩn nội dung tự động</p>
                    </div>
                    <input type="number" defaultValue="5" className="input-small" />
                  </div>

                  <div className="setting-item">
                    <div className="setting-info">
                      <strong>Thời gian cấm tài khoản mặc định</strong>
                      <p>Số ngày cấm khi vi phạm lần đầu</p>
                    </div>
                    <input type="number" defaultValue="7" className="input-small" />
                  </div>
                </div>
              </div>

              <div className="system-section">
                <h4>📧 Thông báo & Email</h4>
                <div className="setting-group">
                  <label className="setting-item">
                    <div className="setting-info">
                      <strong>Gửi email thông báo vi phạm</strong>
                      <p>Gửi email khi người dùng bị xử lý vi phạm</p>
                    </div>
                    <input type="checkbox" defaultChecked className="switch" />
                  </label>

                  <label className="setting-item">
                    <div className="setting-info">
                      <strong>Thông báo admin về báo cáo mới</strong>
                      <p>Gửi email cho admin khi có báo cáo vi phạm mới</p>
                    </div>
                    <input type="checkbox" defaultChecked className="switch" />
                  </label>

                  <label className="setting-item">
                    <div className="setting-info">
                      <strong>Gửi báo cáo hàng ngày</strong>
                      <p>Email tổng hợp hoạt động hệ thống mỗi ngày</p>
                    </div>
                    <input type="checkbox" className="switch" />
                  </label>
                </div>
              </div>

              <div className="system-section">
                <h4>💰 Doanh nghiệp & Thanh toán</h4>
                <div className="setting-group">
                  <label className="setting-item">
                    <div className="setting-info">
                      <strong>Cho phép quảng cáo trả phí</strong>
                      <p>Doanh nghiệp có thể đăng bài quảng cáo có phí</p>
                    </div>
                    <input type="checkbox" defaultChecked className="switch" />
                  </label>

                  <div className="setting-item">
                    <div className="setting-info">
                      <strong>Phí xác thực doanh nghiệp (VNĐ)</strong>
                      <p>Chi phí để xác thực tài khoản doanh nghiệp</p>
                    </div>
                    <input type="number" defaultValue="500000" className="input-small" />
                  </div>

                  <div className="setting-item">
                    <div className="setting-info">
                      <strong>Phí quảng cáo/ngày (VNĐ)</strong>
                      <p>Chi phí để hiển thị quảng cáo mỗi ngày</p>
                    </div>
                    <input type="number" defaultValue="100000" className="input-small" />
                  </div>

                  <div className="setting-item">
                    <div className="setting-info">
                      <strong>Hoa hồng từ giao dịch (%)</strong>
                      <p>Phần trăm hoa hồng hệ thống từ thanh toán</p>
                    </div>
                    <input type="number" defaultValue="10" min="0" max="100" className="input-small" />
                  </div>
                </div>
              </div>

              <div className="system-actions">
                <button className="btn btn-primary">
                  💾 Lưu cài đặt hệ thống
                </button>
                <button className="btn btn-secondary">
                  🔄 Khôi phục mặc định
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
