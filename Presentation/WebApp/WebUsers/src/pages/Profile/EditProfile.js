import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getProfile, updateProfile, API_BASE_URL } from '../../API/Api';
import './EditProfile.css';

export default function EditProfile() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [initialName, setInitialName] = useState('');
  const [fullName, setFullName] = useState('');
  const [dob, setDob] = useState('');
  const [address, setAddress] = useState('');
  const [gender, setGender] = useState('Khác');
  const [avatar, setAvatar] = useState(null);
  const [bio, setBio] = useState('');
  const [website, setWebsite] = useState('');
  const [hometown, setHometown] = useState('');
  const [job, setJob] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const me = await getProfile();
        if (me) {
          setName(me.username || '');
          setInitialName(me.username || '');
          setFullName(me.fullName || '');
          setDob(me.dateOfBirth ? new Date(me.dateOfBirth).toISOString().slice(0,10) : '');
          setAddress(me.address || '');
          const g = (me.gender || '').toLowerCase();
          setGender(g.includes('nam') ? 'Male' : g.includes('nữ') || g.includes('nu') || g.includes('female') ? 'Female' : 'Khác');
          const rawAvatar = me.avatarUrl;
          const avatarUri = rawAvatar ? (rawAvatar.startsWith('http') ? rawAvatar : `${API_BASE_URL}${rawAvatar}`) : null;
          setAvatar(avatarUri);
          setBio(me.bio || '');
          setWebsite(me.website || '');
          setHometown(me.hometown || '');
          setJob(me.job || '');
        }
      } catch (e) {
        console.warn('Load profile error', e);
      }
    })();
  }, []);

  const handleSave = async () => {
    try {
      setSaving(true);
      const serverGender = gender === 'Male' ? 'Nam' : gender === 'Female' ? 'Nữ' : 'Khác';
      const payload = {
        FullName: fullName,
        Gender: serverGender,
        Bio: bio,
        DateOfBirth: dob ? new Date(dob).toISOString() : null,
        Address: address,
        Hometown: hometown,
        Job: job,
        Website: website,
      };
      
      if (name && initialName && name !== initialName) {
        console.log('[EditProfile] Username change is not supported by current endpoint.');
      }
      
      await updateProfile(payload);
      
      try {
        const refreshed = await getProfile();
        if (refreshed) {
          setName(refreshed.username || name);
          setFullName(refreshed.fullName || fullName);
          setDob(refreshed.dateOfBirth ? new Date(refreshed.dateOfBirth).toISOString().slice(0,10) : dob);
          setAddress(refreshed.address ?? address);
          const g = (refreshed.gender || '').toLowerCase();
          setGender(g.includes('nam') ? 'Male' : g.includes('nữ') || g.includes('nu') ? 'Female' : 'Khác');
          setBio(refreshed.bio ?? bio);
          setWebsite(refreshed.website ?? website);
          setHometown(refreshed.hometown ?? hometown);
          setJob(refreshed.job ?? job);
        }
      } catch {}
      
      navigate('/profile');
    } catch (e) {
      console.warn('Update profile error', e);
      alert('Cập nhật hồ sơ thất bại');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    navigate('/profile');
  };

  const pickImage = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          setAvatar(event.target.result);
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  };

  return (
    <div className="edit-profile-container">
      <div className="edit-profile-header">
        <button className="cancel-button" onClick={handleCancel}>
          Hủy
        </button>
        <h1 className="edit-profile-title">Chỉnh sửa hồ sơ</h1>
        <button 
          className={`done-button ${saving ? 'disabled' : ''}`}
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? 'Đang lưu…' : 'Lưu'}
        </button>
      </div>

      <div className="edit-profile-content">
        <div className="profile-section">
          {avatar ? (
            <img src={avatar} alt="Avatar" className="profile-image" />
          ) : (
            <div className="profile-image-placeholder">
              <i className="icon-person-large"></i>
            </div>
          )}
          <button className="change-photo-button" onClick={pickImage}>
            Tải ảnh từ thiết bị
          </button>
          <p className="avatar-hint">Mẹo: Bạn có thể đổi avatar nhanh ở trang Hồ sơ bằng cách chạm vào ảnh.</p>
        </div>

        <div className="form-container">
          <div className="form-group">
            <label className="input-label">Họ và tên</label>
            <input
              type="text"
              className="form-input"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Nhập họ và tên"
            />
          </div>

          <div className="form-group">
            <label className="input-label">Tên người dùng</label>
            <input
              type="text"
              className="form-input disabled"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled
              placeholder="Ví dụ: hoangtest"
            />
            <p className="hint-text">Tên người dùng hiện chưa thể đổi tại màn hình này.</p>
          </div>

          <div className="form-group">
            <label className="input-label">Ngày sinh (YYYY-MM-DD)</label>
            <input
              type="date"
              className="form-input"
              value={dob}
              onChange={(e) => setDob(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="input-label">Giới tính</label>
            <div className="gender-row">
              <button
                className={`gender-pill ${gender === 'Male' ? 'active' : ''}`}
                onClick={() => setGender('Male')}
              >
                Nam
              </button>
              <button
                className={`gender-pill ${gender === 'Female' ? 'active' : ''}`}
                onClick={() => setGender('Female')}
              >
                Nữ
              </button>
              <button
                className={`gender-pill ${gender !== 'Male' && gender !== 'Female' ? 'active' : ''}`}
                onClick={() => setGender('Khác')}
              >
                Khác
              </button>
            </div>
          </div>

          <div className="form-group">
            <label className="input-label">Website</label>
            <input
              type="text"
              className="form-input"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://example.com"
            />
          </div>

          <div className="form-group">
            <label className="input-label">Nghề nghiệp</label>
            <input
              type="text"
              className="form-input"
              value={job}
              onChange={(e) => setJob(e.target.value)}
              placeholder="VD: Lập trình viên"
            />
          </div>

          <div className="form-group">
            <label className="input-label">Quê quán</label>
            <input
              type="text"
              className="form-input"
              value={hometown}
              onChange={(e) => setHometown(e.target.value)}
              placeholder="VD: TP.HCM"
            />
          </div>

          <div className="form-group">
            <label className="input-label">Địa chỉ</label>
            <input
              type="text"
              className="form-input"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Địa chỉ hiện tại"
            />
          </div>

          <div className="form-group">
            <label className="input-label">Tiểu sử</label>
            <textarea
              className="form-textarea"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Giới thiệu ngắn về bạn"
              rows="4"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
