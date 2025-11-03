// CreatePostPage.js - Upload images/video as original
class CreatePostPage {
  constructor() {
    this.uc = new window.UserContext();
    this.msg = document.getElementById('msg');
    this.init();
  }
  init() {
    if (!localStorage.getItem('accessToken')) { window.location.href = 'login.html'; return; }
    document.getElementById('btnCancel').addEventListener('click', () => history.back());
    document.getElementById('btnPost').addEventListener('click', () => this.handlePost());
    this.bindPreview('images', 'imagesPreview', true);
    this.bindPreview('video', 'videoPreview', false, true);
  }
  bindPreview(inputId, containerId, multiple=false, isVideo=false) {
    const input = document.getElementById(inputId);
    const container = document.getElementById(containerId);
    if (!input || !container) return;
    input.addEventListener('change', () => {
      container.innerHTML = '';
      const files = Array.from(input.files || []);
      files.forEach(file => {
        const url = URL.createObjectURL(file);
        const wrap = document.createElement('div'); wrap.className = 'preview-item';
        if (isVideo) { const v = document.createElement('video'); v.src=url; v.muted=true; v.controls=true; wrap.appendChild(v); }
        else { const img = document.createElement('img'); img.src=url; wrap.appendChild(img); }
        container.appendChild(wrap);
      });
    });
  }
  async handlePost() {
    const btn = document.getElementById('btnPost');
    btn.disabled = true; this.showInfo('Đang đăng...');
    try {
      const form = new FormData();
      const imgs = Array.from(document.getElementById('images').files || []);
      const video = document.getElementById('video').files?.[0] || null;
      const caption = document.getElementById('caption').value || '';
      const privacy = document.getElementById('privacy').value || 'public';
      form.append('Caption', caption);
      form.append('Privacy', privacy);
      imgs.forEach(f => form.append('Images', f));
      if (video) form.append('Video', video);

      const headers = { ...this.uc.authHeader(), Accept: 'application/json' };
      const res = await fetch(`${this.uc.baseUrl()}/api/posts`, { method: 'POST', headers, body: form });
      const text = await res.text(); let json=null; try{ json = text? JSON.parse(text): null }catch{}
      if (!res.ok) throw new Error(json?.message || `Upload thất bại (${res.status})`);
      this.showSuccess('Đăng bài thành công');
      setTimeout(()=> window.location.href = 'Home/index.html', 800);
    } catch (e) {
      this.showError(e?.message || String(e));
    } finally { btn.disabled = false; }
  }
  showInfo(msg){ this.msg.style.color='#444'; this.msg.textContent=msg; }
  showSuccess(msg){ this.msg.style.color='#0a0'; this.msg.textContent=msg; }
  showError(msg){ this.msg.style.color='#d00'; this.msg.textContent=msg; }
}

document.addEventListener('DOMContentLoaded', () => new CreatePostPage());
