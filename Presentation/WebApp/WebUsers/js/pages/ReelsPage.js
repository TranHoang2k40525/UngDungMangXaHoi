// ReelsPage.js - Vertical video viewer with original URLs
class ReelsPage {
  constructor() {
    this.uc = new window.UserContext();
    this.container = document.getElementById('container');
    this.init();
  }
  init(){
    if (!localStorage.getItem('accessToken')) { window.location.href='login.html'; return; }
    this.loadReels();
  }
  async loadReels(){
    try {
      const json = await this.uc.authedFetch('/api/posts/reels?page=1&pageSize=50', { method:'GET' });
      const items = json?.data || json?.items || json || [];
      if (!Array.isArray(items) || items.length===0) {
        const info=document.createElement('div'); info.style.color='#aaa'; info.style.padding='12px'; info.textContent='Chưa có reels.'; this.container.appendChild(info); return;
      }
      for (const post of items) {
        const videoUrl = post?.videoUrl || post?.VideoUrl || post?.video?.url || null;
        if (!videoUrl) continue;
        const el = document.createElement('div'); el.className='reel';
        const v = document.createElement('video'); v.src=videoUrl; v.controls=true; v.playsInline=true; v.preload='metadata';
        el.appendChild(v);
        const meta=document.createElement('div'); meta.className='meta'; meta.textContent=post?.caption || post?.Caption || '';
        el.appendChild(meta);
        const actions=document.createElement('div'); actions.className='actions';
        actions.innerHTML = '<button title="Like">❤</button><button title="Comment">💬</button><button title="Share">↗</button>';
        el.appendChild(actions);
        this.container.appendChild(el);
      }
    } catch(e) {
      const err = document.createElement('div'); err.style.color='#f88'; err.style.padding='12px'; err.textContent='Lỗi tải reels: ' + (e?.message || e);
      this.container.appendChild(err);
    }
  }
}

document.addEventListener('DOMContentLoaded', ()=> new ReelsPage());
