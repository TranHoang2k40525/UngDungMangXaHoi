import axios from 'axios';

// Tự động detect backend URL
// Priority (runtime): window.__ENV.VITE_API_URL (injected at container start)
// Build-time: import.meta.env.VITE_API_URL (baked by Vite)
// Fallback (dev): use current hostname with default WebAPI port 5297
const getApiBaseUrl = () => {
  try {
    // Runtime override injected into the page by the container (env-config)
    // e.g. window.__ENV = { VITE_API_URL: 'http://webapi:5297' }
    if (window && window.__ENV && window.__ENV.VITE_API_URL) {
      return window.__ENV.VITE_API_URL;
    }
  } catch (e) {
    // ignore when window not available
  }

  // Nếu có VITE_API_URL từ build-time env thì dùng (Production build)
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }

  // Development: Tự động dùng hostname hiện tại
  const hostname = window.location.hostname;
  return `http://${hostname}:5297`;
};

const API_BASE_URL = getApiBaseUrl();

// Normalize API base for axios: if set to '/api' (nginx proxy), use relative paths
const normalizeBase = (b) => {
  if (!b) return '';
  if (b === '/api') return '';
  return b.replace(/\/+$/, '');
};

const NORMALIZED_API_BASE = normalizeBase(API_BASE_URL);

// Tạo axios instance
const apiClient = axios.create({
  baseURL: NORMALIZED_API_BASE || undefined,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - Tự động thêm token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - Xử lý lỗi
apiClient.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    const originalRequest = error.config;

    // Nếu lỗi 401 và chưa retry
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (refreshToken) {
          const refreshUrl = (NORMALIZED_API_BASE ? `${NORMALIZED_API_BASE}/api/auth/refresh` : '/api/auth/refresh');
          const response = await axios.post(refreshUrl, {
            RefreshToken: refreshToken,
          });

          const { AccessToken, RefreshToken } = response.data;
          localStorage.setItem('accessToken', AccessToken);
          localStorage.setItem('refreshToken', RefreshToken);

          originalRequest.headers.Authorization = `Bearer ${AccessToken}`;
          return apiClient(originalRequest);
        }
      } catch (refreshError) {
        // Refresh thất bại -> logout
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error.response?.data || error.message);
  }
);

// ============= AUTH API =============
export const authAPI = {
  async registerAdmin(data) {
    return apiClient.post('/api/auth/register-admin', data);
  },

  async verifyAdminOtp(data) {
    const result = await apiClient.post('/api/auth/verify-admin-otp', data);
    // Backend may return { AccessToken, RefreshToken } or { accessToken, refreshToken }
    const access = result?.AccessToken || result?.accessToken || result?.access || null;
    const refresh = result?.RefreshToken || result?.refreshToken || result?.refresh || null;
    if (access && refresh) {
      localStorage.setItem('accessToken', access);
      localStorage.setItem('refreshToken', refresh);
    }
    return result;
  },

  async login(credentials) {
    const result = await apiClient.post('/api/auth/login', credentials);

    // Accept various casing from backend
    const access = result?.AccessToken || result?.accessToken || result?.access || null;
    const refresh = result?.RefreshToken || result?.refreshToken || result?.refresh || null;

    if (access && refresh) {
      localStorage.setItem('accessToken', access);
      localStorage.setItem('refreshToken', refresh);

      // Kiểm tra account type inside token
      try {
        const payload = JSON.parse(atob(access.split('.')[1]));
        const accountType = payload.account_type || payload.role;
        if (accountType !== 'Admin') {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          throw new Error('Chỉ tài khoản Admin mới có thể đăng nhập');
        }
      } catch (e) {
        // If token parsing fails, clear tokens to force re-login
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        throw new Error('Token không hợp lệ');
      }
    }

    return result;
  },

  async logout() {
    const refreshToken = localStorage.getItem('refreshToken');
    if (refreshToken) {
      try {
        await apiClient.post('/api/auth/logout', { RefreshToken: refreshToken });
      } catch (error) {
        console.error('Logout error:', error);
      }
    }
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  },

  async forgotPassword(email) {
    return apiClient.post('/api/auth/forgot-password', { Email: email });
  },

  async verifyForgotPasswordOtp(data) {
    return apiClient.post('/api/auth/verify-forgot-password-otp', data);
  },

  async resetPassword(data) {
    return apiClient.post('/api/auth/reset-password', data);
  },

  async changePassword(data) {
    return apiClient.post('/api/auth/change-password', data);
  },

  isAuthenticated() {
    return !!localStorage.getItem('accessToken');
  },
};

// ============= ADMIN API =============
export const adminAPI = {
  async getProfile() {
    return apiClient.get('/api/admin/profile');
  },

  async uploadAvatar(file) {
    const formData = new FormData();
    formData.append('avatar', file);
    return apiClient.post('/api/admin/upload-avatar', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  async updateProfile(data) {
    return apiClient.put('/api/admin/update-profile', data);
  },

  async changePassword(data) {
    return apiClient.post('/api/admin/change-password', data);
  },
};

// ============= DASHBOARD API =============
export const dashboardAPI = {
  // ✅ API thật từ backend
  async getNewUserStats(fromDate, toDate, sortOption = 'Day') {
    const from = fromDate.toISOString().split('T')[0];
    const to = toDate.toISOString().split('T')[0];
    return apiClient.get(`/api/DashBoard/new-user-stats?fromDate=${from}&toDate=${to}&options=${sortOption}`);
  },

  // ✅ API thật từ backend
  async getActiveUsers() {
    return apiClient.get('/api/DashBoard/activeUser');
  },

  // ✅ API thật từ backend
  async getBusinessGrowth(fromDate, toDate, sortOption = 'Day') {
    const from = fromDate.toISOString().split('T')[0];
    const to = toDate.toISOString().split('T')[0];
    return apiClient.get(`/api/DashBoard/business-growth-chart?startDate=${from}&endDate=${to}&group=${sortOption}`);
  },

  // ✅ API thật từ backend
  async getRevenue(fromDate, toDate, sortOption = 'Day') {
    const from = fromDate.toISOString().split('T')[0];
    const to = toDate.toISOString().split('T')[0];
    return apiClient.get(`/api/DashBoard/revenue-chart?startDate=${from}&endDate=${to}&group=${sortOption}`);
  },

  // ✅ API thật từ backend
  async getPostGrowth(fromDate, toDate, sortOption = 'Day') {
    const from = fromDate.toISOString().split('T')[0];
    const to = toDate.toISOString().split('T')[0];
    return apiClient.get(`/api/DashBoard/post-growth-chart?startDate=${from}&endDate=${to}&group=${sortOption}`);
  },

  // ✅ API thật từ backend
  async getTopKeywords(fromDate, toDate, topN = 10) {
    const from = fromDate.toISOString().split('T')[0];
    const to = toDate.toISOString().split('T')[0];
    return apiClient.get(`/api/DashBoard/keyword-top?topN=${topN}&startDate=${from}&endDate=${to}`);
  },

  // ✅ API thật từ backend
  async getTopPosts(fromDate, toDate, topN = 10) {
    const from = fromDate.toISOString().split('T')[0];
    const to = toDate.toISOString().split('T')[0];
    return apiClient.get(`/api/DashBoard/posts-top?topN=${topN}&startDate=${from}&endDate=${to}`);
  },

  // ✅ API thật từ backend - Dashboard summary endpoint
  async getDashboardSummary(fromDate, toDate, chartGroupBy = 'Day') {
    const from = fromDate.toISOString().split('T')[0];
    const to = toDate.toISOString().split('T')[0];
    return apiClient.get(`/api/DashBoard/summary?startDate=${from}&endDate=${to}&chartGroupBy=${chartGroupBy}`);
  },
};

// ============= USER API (Mock - sẽ kết nối API thật sau) =============
export const userAPI = {
  async getUsers(page = 1, pageSize = 20, search = '', filter = 'all') {
    // Mock data
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          data: Array.from({ length: pageSize }, (_, i) => ({
            id: (page - 1) * pageSize + i + 1,
            username: `user${(page - 1) * pageSize + i + 1}`,
            email: `user${(page - 1) * pageSize + i + 1}@example.com`,
            fullName: `Nguyễn Văn ${String.fromCharCode(65 + i)}`,
            status: i % 3 === 0 ? 'banned' : 'active',
            createdAt: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000).toISOString(),
          })),
          total: 100,
          page,
          pageSize,
        });
      }, 300);
    });
  },

  async banUser(userId) {
    return new Promise((resolve) => setTimeout(() => resolve({ success: true }), 300));
  },

  async unbanUser(userId) {
    return new Promise((resolve) => setTimeout(() => resolve({ success: true }), 300));
  },
};

// ============= MODERATION API (Mock) =============
export const moderationAPI = {
  async getPendingPosts(page = 1, pageSize = 20) {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          data: Array.from({ length: 10 }, (_, i) => ({
            id: i + 1,
            content: `Nội dung bài đăng ${i + 1} đang chờ kiểm duyệt. Đây là một đoạn text mẫu để kiểm tra giao diện.`,
            author: `user${i + 1}`,
            createdAt: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000).toISOString(),
            reports: Math.floor(Math.random() * 5),
          })),
        });
      }, 300);
    });
  },

  async approvePost(postId) {
    return new Promise((resolve) => setTimeout(() => resolve({ success: true }), 300));
  },

  async rejectPost(postId, reason) {
    return new Promise((resolve) => setTimeout(() => resolve({ success: true }), 300));
  },

  async deletePost(postId) {
    return new Promise((resolve) => setTimeout(() => resolve({ success: true }), 300));
  },
};

// ============= REPORTS API (Mock) =============
export const reportsAPI = {
  async getReports(page = 1, pageSize = 20, status = 'pending') {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          data: Array.from({ length: 10 }, (_, i) => ({
            id: i + 1,
            type: i % 2 === 0 ? 'post' : 'comment',
            contentId: i + 100,
            reporter: `user${i + 10}`,
            reason: ['Nội dung không phù hợp', 'Spam', 'Ngôn từ thù địch', 'Vi phạm bản quyền'][i % 4],
            status: status,
            createdAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
          })),
        });
      }, 300);
    });
  },

  async resolveReport(reportId, action, note) {
    return new Promise((resolve) => setTimeout(() => resolve({ success: true }), 300));
  },
};

export default apiClient;
