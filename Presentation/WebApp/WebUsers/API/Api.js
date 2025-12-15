// Tự động detect backend URL dựa trên hostname
// VD: Truy cập từ http://192.168.1.103:5173 → API: http://192.168.1.103:5297
// VD: Truy cập từ http://localhost:5173 → API: http://localhost:5297
const getApiBaseUrl = () => {
  // Production: Nếu có VITE_API_URL từ .env
  if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  
  // Development: Tự động dùng hostname
  const hostname = window.location.hostname;
  return `http://${hostname}:5297`;
};

export const API_BASE_URL = getApiBaseUrl();

// Normalize API base: if VITE_API_URL is '/api' (nginx proxy), use relative paths
const normalizeBase = (b) => {
  if (!b) return '';
  if (b === '/api') return '';
  return b.replace(/\/+$/, '');
};
const NORMALIZED_API_BASE = normalizeBase(API_BASE_URL);
const buildUrl = (path) => (NORMALIZED_API_BASE ? `${NORMALIZED_API_BASE}${path}` : path);

// Hàm helper để gọi API
export const apiCall = async (endpoint, options = {}) => {
  const doFetch = async (opts) => {
    // Normalize base URL to avoid double "/api/api" when VITE_API_URL is set to "/api"
    let base = API_BASE_URL || '';
    if (base === '/api') base = ''; // use relative path when proxying through nginx
    // strip trailing slash from base
    if (base.endsWith('/')) base = base.slice(0, -1);
    return fetch(`${base}${endpoint}`, {
      ...opts,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...(opts.headers || {}),
      },
    });
  };

  try {
    const res = await doFetch(options);

    // Auto refresh on 401 once
    if (res.status === 401 && !options._retry) {
      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (refreshToken) {
          const rf = await fetch(buildUrl('/api/auth/refresh'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify({ RefreshToken: refreshToken }),
          });
          const rfText = await rf.text();
          let rfJson = null; try { rfJson = rfText ? JSON.parse(rfText) : null; } catch {}
          if (rf.ok) {
            const newAccess = rfJson?.AccessToken || rfJson?.accessToken;
            const newRefresh = rfJson?.RefreshToken || rfJson?.refreshToken;
            if (newAccess && newRefresh) {
              localStorage.setItem('accessToken', newAccess);
              localStorage.setItem('refreshToken', newRefresh);
              const retryHeaders = {
                ...(options.headers || {}),
              };
              retryHeaders['Authorization'] = `Bearer ${newAccess}`;
              const retryRes = await doFetch({ ...options, _retry: true, headers: retryHeaders });
              if (!retryRes.ok) {
                const retryErr = await retryRes.text();
                let retryJson = null; try { retryJson = retryErr ? JSON.parse(retryErr) : null; } catch {}
                throw new Error(retryJson?.message || `HTTP error! status: ${retryRes.status}`);
              }
              const retryText = await retryRes.text();
              return retryText ? JSON.parse(retryText) : null;
            }
          }
        }
      } catch (rfErr) {
        console.error('[API] refresh on 401 failed:', rfErr);
      }
    }

    if (!res.ok) {
      const errorDataText = await res.text();
      let errorData = null; try { errorData = errorDataText ? JSON.parse(errorDataText) : null; } catch {}
      throw new Error(errorData?.message || `HTTP error! status: ${res.status}`);
    }

    const text = await res.text();
    return text ? JSON.parse(text) : null;
  } catch (error) {
    console.error('API Error:', error);
    // Network-friendly messages
    const msg = String(error?.message || error);
    if (msg.includes('Failed to fetch')) {
      throw new Error('Không thể kết nối đến server. Vui lòng kiểm tra mạng hoặc API_BASE_URL.');
    }
    throw error;
  }
};

// Auth API object
const authAPI = {
  // Register
  async register(userData) {
    return apiCall('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  },

  // Verify OTP
  async verifyOtp(data) {
    const result = await apiCall('/api/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify(data),
    });

    // Lưu token vào localStorage sau khi verify thành công
    if (result.AccessToken && result.RefreshToken) {
      localStorage.setItem('accessToken', result.AccessToken);
      localStorage.setItem('refreshToken', result.RefreshToken);
    }

    return result;
  },

  // Login
  async login(credentials) {
    const result = await apiCall('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });

    // Lưu token
    if (result.AccessToken && result.RefreshToken) {
      localStorage.setItem('accessToken', result.AccessToken);
      localStorage.setItem('refreshToken', result.RefreshToken);
    }

    return result;
  },

  // Helper để lấy token
  getAuthHeaders() {
    const token = localStorage.getItem('accessToken');
    return token ? { Authorization: `Bearer ${token}` } : {};
  },

  // Refresh token
  async refreshToken() {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) {
      throw new Error('Không có refresh token');
    }

    const result = await apiCall('/api/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ RefreshToken: refreshToken }),
    });

    if (result.AccessToken && result.RefreshToken) {
      localStorage.setItem('accessToken', result.AccessToken);
      localStorage.setItem('refreshToken', result.RefreshToken);
    }

    return result;
  },

  // Logout
  async logout() {
    const refreshToken = localStorage.getItem('refreshToken');
    if (refreshToken) {
      try {
        await apiCall('/api/auth/logout', {
          method: 'POST',
          body: JSON.stringify({ RefreshToken: refreshToken }),
        });
      } catch (error) {
        console.error('Logout error:', error);
      }
    }
    
    // Clear local storage
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('userInfo');
  },

  // Quên mật khẩu
  async forgotPassword(email) {
    return apiCall('/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ Email: email }),
    });
  },

  // Xác thực OTP quên mật khẩu
  async verifyForgotPasswordOtp(data) {
    return apiCall('/api/auth/verify-forgot-password-otp', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Reset mật khẩu
  async resetPassword(data) {
    return apiCall('/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Đổi mật khẩu
  async changePassword(data) {
    const headers = this.getAuthHeaders();
    return apiCall('/api/auth/change-password', {
      method: 'POST',
      body: JSON.stringify(data),
      headers,
    });
  },

  // Xác thực OTP đổi mật khẩu
  async verifyChangePasswordOtp(data) {
    const headers = this.getAuthHeaders();
    return apiCall('/api/auth/verify-change-password-otp', {
      method: 'POST',
      body: JSON.stringify(data),
      headers,
    });
  },

  // Kiểm tra authentication
  isAuthenticated() {
    const token = localStorage.getItem('accessToken');
    return !!token;
  }
};

// User/Profile APIs
const userAPI = {
  async getProfile() {
    const headers = authAPI.getAuthHeaders();
    const res = await apiCall('/api/users/profile', { method: 'GET', headers });
    return res?.data || null;
  },
  async updateProfile(payload) {
    const headers = authAPI.getAuthHeaders();
    return apiCall('/api/users/profile', { method: 'PUT', headers, body: JSON.stringify(payload) });
  }
};

// Posts APIs
const postsAPI = {
  async createPost({ images = [], video = null, caption = '', location = '', privacy = 'public' }) {
    const token = localStorage.getItem('accessToken');
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const form = new FormData();
    if (caption) form.append('Caption', caption);
    if (location) form.append('Location', location);
    form.append('Privacy', privacy);
    for (let i = 0; i < images.length; i++) {
      const img = images[i];
      form.append('Images', img);
    }
    if (video) form.append('Video', video);

    const res = await fetch(buildUrl('/api/posts'), {
      method: 'POST',
      headers: { ...headers, Accept: 'application/json' }, // do not set Content-Type for multipart
      body: form,
    });
    const text = await res.text();
    let json = null; try { json = text ? JSON.parse(text) : null; } catch {}
    if (!res.ok) throw new Error(json?.message || `Upload thất bại (${res.status})`);
    return json;
  },
  async getFeed(page = 1, pageSize = 20) {
    const headers = authAPI.getAuthHeaders();
    return apiCall(`/api/posts/feed?page=${page}&pageSize=${pageSize}`, { method: 'GET', headers });
  },
  async getReels(page = 1, pageSize = 20) {
    const headers = authAPI.getAuthHeaders();
    return apiCall(`/api/posts/reels?page=${page}&pageSize=${pageSize}`, { method: 'GET', headers });
  },
  async getAllReels() {
    const headers = authAPI.getAuthHeaders();
    return apiCall('/api/posts/reels/all', { method: 'GET', headers });
  },
  async getMyPosts(page = 1, pageSize = 20) {
    const headers = authAPI.getAuthHeaders();
    return apiCall(`/api/posts/me?page=${page}&pageSize=${pageSize}`, { method: 'GET', headers });
  },
  async getUserPostsById(userId, page = 1, pageSize = 20) {
    const headers = authAPI.getAuthHeaders();
    return apiCall(`/api/posts/user/${userId}?page=${page}&pageSize=${pageSize}`, { method: 'GET', headers });
  },
  async updatePostPrivacy(postId, privacy) {
    const headers = { ...authAPI.getAuthHeaders(), 'Content-Type': 'application/json', 'Accept': 'application/json' };
    return apiCall(`/api/posts/${postId}/privacy`, { method: 'PATCH', headers, body: JSON.stringify({ Privacy: privacy }) });
  },
  async updatePostCaption(postId, caption) {
    const headers = { ...authAPI.getAuthHeaders(), 'Content-Type': 'application/json', 'Accept': 'application/json' };
    return apiCall(`/api/posts/${postId}/caption`, { method: 'PATCH', headers, body: JSON.stringify({ Caption: caption }) });
  },
  async deletePost(postId) {
    const token = localStorage.getItem('accessToken');
    const res = await fetch(buildUrl(`/api/posts/${postId}`), {
      method: 'DELETE',
      headers: { Authorization: token ? `Bearer ${token}` : '', Accept: 'application/json' },
    });
    if (!res.ok && res.status !== 204) {
      const text = await res.text();
      let json = null; try { json = text ? JSON.parse(text) : null; } catch {}
      throw new Error(json?.message || 'Không thể xóa bài đăng');
    }
    return true;
  }
};

// Export
export { authAPI, userAPI, postsAPI };