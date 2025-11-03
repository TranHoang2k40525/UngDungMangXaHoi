// EditProfilePage.js - Update user profile (text fields)
class EditProfilePage {
  constructor(){
    this.uc = new window.UserContext();
    this.msg = document.getElementById('msg');
    this.init();
  }
  init(){
    if (!localStorage.getItem('accessToken')) { window.location.href='login.html'; return; }
    document.getElementById('btnCancel').addEventListener('click', ()=> history.back());
    document.getElementById('btnSave').addEventListener('click', ()=> this.save());
    this.load();
  }
  async load(){
    try {
      const json = await this.uc.authedFetch('/api/users/profile', { method:'GET' });
      const u = json?.data || json || {};
      document.getElementById('fullName').value = u.fullName || '';
      document.getElementById('dob').value = u.dateOfBirth ? new Date(u.dateOfBirth).toISOString().slice(0,10) : '';
      document.getElementById('gender').value = (u.gender || 'Khác');
      document.getElementById('address').value = u.address || '';
      document.getElementById('hometown').value = u.hometown || '';
      document.getElementById('job').value = u.job || '';
      document.getElementById('website').value = u.website || '';
      document.getElementById('bio').value = u.bio || '';
    } catch(e){ this.showError(e?.message || String(e)); }
  }
  async save(){
    const btn = document.getElementById('btnSave');
    btn.disabled = true; this.showInfo('Đang lưu...');
    try {
      const payload = {
        FullName: document.getElementById('fullName').value || null,
        DateOfBirth: document.getElementById('dob').value ? new Date(document.getElementById('dob').value).toISOString() : null,
        Gender: document.getElementById('gender').value || 'Khác',
        Address: document.getElementById('address').value || null,
        Hometown: document.getElementById('hometown').value || null,
        Job: document.getElementById('job').value || null,
        Website: document.getElementById('website').value || null,
        Bio: document.getElementById('bio').value || null,
      };
      const res = await this.uc.authedFetch('/api/users/profile', { method:'PUT', headers: this.uc.jsonHeaders(), body: JSON.stringify(payload) });
      this.showSuccess('Cập nhật thành công');
      setTimeout(()=> window.location.href='profile.html', 800);
    } catch(e){ this.showError(e?.message || String(e)); }
    finally{ btn.disabled=false; }
  }
  showInfo(m){ this.msg.style.color='#444'; this.msg.textContent=m; }
  showSuccess(m){ this.msg.style.color='#0a0'; this.msg.textContent=m; }
  showError(m){ this.msg.style.color='#d00'; this.msg.textContent=m; }
}

document.addEventListener('DOMContentLoaded', ()=> new EditProfilePage());
