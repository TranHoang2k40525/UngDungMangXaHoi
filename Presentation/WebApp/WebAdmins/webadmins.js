// Full local mock (stores users & OTPs in localStorage) — no backend needed

const USE_MOCK = true;
const apiBase = 'http://localhost:5297/api/auth'; // ignored in mock

function _read(key){ try{return JSON.parse(localStorage.getItem(key) || '{}');}catch{return{};} }
function _write(key, v){ localStorage.setItem(key, JSON.stringify(v)); }

async function postJson(url, body){
  if(USE_MOCK){
    // LOGIN
    if(url.endsWith('/login')){
      // admin shortcut
      if(body.username === 'admin' && body.password === 'admin') return { ok:true, data:{ accessToken: 'mock-token', username:'admin' } };
      const users = _read('mock_users');
      // allow login by username or email
      for(const k of Object.keys(users)){
        const u = users[k];
        if((u.username === body.username || k === body.username || u.email === body.username) && u.password === body.password){
          return { ok:true, data:{ accessToken:'mock-token', username: u.username } };
        }
      }
      return { ok:false, data:{ message: 'Invalid credentials (mock)' } };
    }

    // REGISTER
    if(url.endsWith('/register')){
      const users = _read('mock_users');
      const key = body.email || body.username;
      // simple uniqueness check by email or username
      for(const k of Object.keys(users)){
        const u = users[k];
        if(u.username === body.username || k === body.email) return { ok:false, data:{ message: 'User already exists (mock)' } };
      }
      users[key] = {
        username: body.username,
        fullName: body.fullName,
        dateOfBirth: body.dateOfBirth,
        email: body.email,
        phone: body.phone,
        password: body.password,
        gender: body.gender
      };
      _write('mock_users', users);
      return { ok:true, data:{ message: 'registered (mock)' } };
    }

    // REQUEST OTP
    if(url.endsWith('/request-otp')){
      const email = body.email;
      if(!email) return { ok:false, data:{ message:'Email required (mock)' } };
      const otp = Math.floor(100000 + Math.random()*900000).toString();
      const otps = _read('mock_otps');
      otps[email] = { otp, expiry: Date.now() + 10*60*1000 };
      _write('mock_otps', otps);
      // return otp in response so UI can be tested without email
      return { ok:true, data:{ message:'otp-sent (mock)', otp } };
    }

    // RESET PASSWORD
    if(url.endsWith('/reset-password')){
      const { email, otp, newPassword } = body;
      if(!email || !otp || !newPassword) return { ok:false, data:{ message:'Missing fields (mock)' } };
      const otps = _read('mock_otps');
      const rec = otps[email];
      if(!rec || rec.otp !== otp || Date.now() > rec.expiry) return { ok:false, data:{ message:'Invalid or expired OTP (mock)' } };
      const users = _read('mock_users');
      // find user by email (key)
      const key = Object.keys(users).find(k => k === email || users[k].email === email);
      if(key){
        users[key].password = newPassword;
        _write('mock_users', users);
        delete otps[email];
        _write('mock_otps', otps);
        return { ok:true, data:{ message:'password-changed (mock)' } };
      } else {
        // if no existing user, create one with email as username
        users[email] = { username: email, email, password: newPassword };
        _write('mock_users', users);
        delete otps[email];
        _write('mock_otps', otps);
        return { ok:true, data:{ message:'password-changed (mock)' } };
      }
    }

    return { ok:true, data:{} };
  }

  // real backend branch (unused when USE_MOCK=true)
  const res = await fetch(url, {
    method:'POST',
    headers:{ 'Content-Type':'application/json' },
    body: JSON.stringify(body)
  });
  const text = await res.text();
  try { return { ok: res.ok, data: JSON.parse(text) }; } catch { return { ok: res.ok, data: text }; }
}

function showMessage(el, msg, isError = false){
  el.textContent = msg;
  el.style.color = isError ? '#c00' : '#0a0';
  setTimeout(()=> el.textContent = '', 6000);
}

// Login handler
async function handleLogin(form, msgEl){
  const username = form.username.value.trim();
  const password = form.password.value;
  if(!username || !password){ showMessage(msgEl, 'Nhập username và password', true); return; }
  const r = await postJson(`${apiBase}/login`, { username, password });
  if(r.ok){
    const token = r.data?.accessToken || r.data?.access_token || 'mock-token';
    localStorage.setItem('accessToken', token);
    localStorage.setItem('currentUser', r.data.username || username);
    window.location.href = 'home.html';
  } else showMessage(msgEl, r.data?.message || 'Đăng nhập thất bại', true);
}

// Register handler
async function handleRegister(form, msgEl){
  const body = {
    username: form.username.value.trim(),
    fullName: form.fullName.value.trim(),
    dateOfBirth: form.dateOfBirth.value,
    email: form.email.value.trim(),
    phone: form.phone.value.trim(),
    password: form.password.value,
    gender: Number(form.gender.value || 0)
  };
  const r = await postJson(`${apiBase}/register`, body);
  if(r.ok) { showMessage(msgEl, 'Đăng ký thành công — (mock)'); setTimeout(()=>window.location.href='login.html',1200); }
  else showMessage(msgEl, r.data?.message || 'Đăng ký thất bại', true);
}

// Request OTP
async function handleRequestOtp(form, msgEl){
  const email = form.email.value.trim();
  if(!email){ showMessage(msgEl, 'Nhập email', true); return; }
  const r = await postJson(`${apiBase}/request-otp`, { email, purpose: 'reset-password' });
  if(r.ok) {
    showMessage(msgEl, 'OTP đã gửi (mock). Mã OTP: ' + (r.data?.otp || '')); 
    setTimeout(()=>window.location.href='reset-password.html?email='+encodeURIComponent(email),2000);
  }
  else showMessage(msgEl, r.data?.message || 'Gửi OTP thất bại', true);
}

// Reset password with OTP
async function handleResetPassword(form, msgEl){
  const email = form.email.value.trim();
  const otp = form.otp.value.trim();
  const password = form.password.value;
  if(!email || !otp || !password){ showMessage(msgEl, 'Điền đủ thông tin', true); return; }
  const r = await postJson(`${apiBase}/reset-password`, { email, otp, newPassword: password });
  if(r.ok){ showMessage(msgEl, 'Đổi mật khẩu thành công (mock)'); setTimeout(()=>window.location.href='login.html',1200); }
  else showMessage(msgEl, r.data?.message || 'Đổi mật khẩu thất bại', true);
}

// Logout
function logout(){
  localStorage.removeItem('accessToken');
  localStorage.removeItem('currentUser');
  window.location.href = 'login.html';
}
