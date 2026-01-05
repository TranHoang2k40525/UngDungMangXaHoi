import axios from "axios";

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
    if (!b) return "";
    if (b === "/api") return "";
    return b.replace(/\/+$/, "");
};

const NORMALIZED_API_BASE = normalizeBase(API_BASE_URL);

// Tạo axios instance
const apiClient = axios.create({
    baseURL: NORMALIZED_API_BASE || undefined,
    headers: {
        "Content-Type": "application/json",
    },
});

// Request interceptor - Tự động thêm token
apiClient.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem("accessToken");
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
                const refreshToken = localStorage.getItem("refreshToken");
                if (refreshToken) {
                    const refreshUrl = NORMALIZED_API_BASE
                        ? `${NORMALIZED_API_BASE}/api/auth/refresh`
                        : "/api/auth/refresh";
                    const response = await axios.post(refreshUrl, {
                        RefreshToken: refreshToken,
                    });

                    const { AccessToken, RefreshToken } = response.data;
                    localStorage.setItem("accessToken", AccessToken);
                    localStorage.setItem("refreshToken", RefreshToken);

                    originalRequest.headers.Authorization = `Bearer ${AccessToken}`;
                    return apiClient(originalRequest);
                }
            } catch (refreshError) {
                // Refresh thất bại -> logout
                localStorage.removeItem("accessToken");
                localStorage.removeItem("refreshToken");
                window.location.href = "/login";
                return Promise.reject(refreshError);
            }
        }

        return Promise.reject(error.response?.data || error.message);
    }
);

// ============= AUTH API =============
export const authAPI = {
    async registerAdmin(data) {
        return apiClient.post("/api/auth/register-admin", data);
    },

    async verifyAdminOtp(data) {
        const result = await apiClient.post("/api/auth/verify-admin-otp", data);
        // Backend may return { AccessToken, RefreshToken } or { accessToken, refreshToken }
        const access =
            result?.AccessToken ||
            result?.accessToken ||
            result?.access ||
            null;
        const refresh =
            result?.RefreshToken ||
            result?.refreshToken ||
            result?.refresh ||
            null;
        if (access && refresh) {
            localStorage.setItem("accessToken", access);
            localStorage.setItem("refreshToken", refresh);
        }
        return result;
    },

    async login(credentials) {
        const result = await apiClient.post("/api/auth/login", credentials);

        // Accept various casing from backend
        const access =
            result?.AccessToken ||
            result?.accessToken ||
            result?.access ||
            null;
        const refresh =
            result?.RefreshToken ||
            result?.refreshToken ||
            result?.refresh ||
            null;

        if (access && refresh) {
            localStorage.setItem("accessToken", access);
            localStorage.setItem("refreshToken", refresh);

      // Kiểm tra account type inside token
      try {
        const payload = JSON.parse(atob(access.split('.')[1]));
        // Backend RBAC giờ dùng "role" array và "primary_role"
        const roles = payload.role || [];
        const primaryRole = payload.primary_role;
        const isAdmin = roles.includes('Admin') || primaryRole === 'Admin';
        if (!isAdmin) {
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
            // Kiểm tra account type inside token
            try {
                const payload = JSON.parse(atob(access.split(".")[1]));
                const accountType = payload.account_type || payload.role;
                if (accountType !== "Admin") {
                    localStorage.removeItem("accessToken");
                    localStorage.removeItem("refreshToken");
                    throw new Error("Chỉ tài khoản Admin mới có thể đăng nhập");
                }
            } catch (e) {
                // If token parsing fails, clear tokens to force re-login
                localStorage.removeItem("accessToken");
                localStorage.removeItem("refreshToken");
                throw new Error("Token không hợp lệ");
            }
        }

        return result;
    },

    async logout() {
        const refreshToken = localStorage.getItem("refreshToken");
        if (refreshToken) {
            try {
                await apiClient.post("/api/auth/logout", {
                    RefreshToken: refreshToken,
                });
            } catch (error) {
                console.error("Logout error:", error);
            }
        }
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
    },

  async forgotPassword(email) {
    return apiClient.post('/api/auth/forgot-password', { Email: email });
  },

  async verifyForgotPasswordOtp(data) {
    return apiClient.post('/api/auth/verify-forgot-password-otp', data);
  },
    async forgotPassword(email) {
        return apiClient.post("/api/auth/forgot-password", { Email: email });
    },

    async resetPassword(data) {
        return apiClient.post("/api/auth/reset-password", data);
    },

    async changePassword(data) {
        return apiClient.post("/api/auth/change-password", data);
    },

    isAuthenticated() {
        return !!localStorage.getItem("accessToken");
    },
};

// ============= ADMIN API =============
export const adminAPI = {
    async getProfile() {
        return apiClient.get("/api/admin/profile");
    },

    async uploadAvatar(file) {
        const formData = new FormData();
        formData.append("avatar", file);
        return apiClient.post("/api/admin/upload-avatar", formData, {
            headers: {
                "Content-Type": "multipart/form-data",
            },
        });
    },

    async updateProfile(data) {
        return apiClient.put("/api/admin/update-profile", data);
    },

    async changePassword(data) {
        return apiClient.post("/api/admin/change-password", data);
    },
};

// ============= DASHBOARD API =============
export const dashboardAPI = {
    // ✅ API thật từ backend
    async getNewUserStats(fromDate, toDate, sortOption = "Day") {
        const from = fromDate.toISOString().split("T")[0];
        const to = toDate.toISOString().split("T")[0];
        return apiClient.get(
            `/api/DashBoard/new-user-stats?fromDate=${from}&toDate=${to}&options=${sortOption}`
        );
    },

    // ✅ API thật từ backend
    async getActiveUsers() {
        return apiClient.get("/api/DashBoard/activeUser");
    },

    // ✅ API thật từ backend
    async getBusinessGrowth(fromDate, toDate, sortOption = "Day") {
        const from = fromDate.toISOString().split("T")[0];
        const to = toDate.toISOString().split("T")[0];
        return apiClient.get(
            `/api/DashBoard/business-growth-chart?startDate=${from}&endDate=${to}&group=${sortOption}`
        );
    },

    // ✅ API thật từ backend
    async getRevenue(fromDate, toDate, sortOption = "Day") {
        const from = fromDate.toISOString().split("T")[0];
        const to = toDate.toISOString().split("T")[0];
        return apiClient.get(
            `/api/DashBoard/revenue-chart?startDate=${from}&endDate=${to}&group=${sortOption}`
        );
    },

    // ✅ API thật từ backend
    async getPostGrowth(fromDate, toDate, sortOption = "Day") {
        const from = fromDate.toISOString().split("T")[0];
        const to = toDate.toISOString().split("T")[0];
        return apiClient.get(
            `/api/DashBoard/post-growth-chart?startDate=${from}&endDate=${to}&group=${sortOption}`
        );
    },

    // ✅ API thật từ backend
    async getTopKeywords(fromDate, toDate, topN = 10) {
        const from = fromDate.toISOString().split("T")[0];
        const to = toDate.toISOString().split("T")[0];
        return apiClient.get(
            `/api/DashBoard/keyword-top?topN=${topN}&startDate=${from}&endDate=${to}`
        );
    },

  // ✅ API thật từ backend
  async getTopPosts(fromDate, toDate, topN = 10) {
    const from = fromDate.toISOString().split('T')[0];
    const to = toDate.toISOString().split('T')[0];
    return apiClient.get(`/api/DashBoard/posts-top?topN=${topN}&startDate=${from}&endDate=${to}`);
  },

  // Lấy chi tiết bài đăng (dùng khi Admin click xem chi tiết trong dashboard)
  async getPostDetail(postId) {
    return apiClient.get(`/api/posts/${postId}`);
  },
    // ✅ API thật từ backend
    async getTopPosts(fromDate, toDate, topN = 10) {
        const from = fromDate.toISOString().split("T")[0];
        const to = toDate.toISOString().split("T")[0];
        return apiClient.get(
            `/api/DashBoard/posts-top?topN=${topN}&startDate=${from}&endDate=${to}`
        );
    },

    // ✅ API thật từ backend - Dashboard summary endpoint
    async getDashboardSummary(fromDate, toDate, chartGroupBy = "Day") {
        const from = fromDate.toISOString().split("T")[0];
        const to = toDate.toISOString().split("T")[0];
        return apiClient.get(
            `/api/DashBoard/summary?startDate=${from}&endDate=${to}&chartGroupBy=${chartGroupBy}`
        );
    },
};

// ============= USERS API =============
export const userAPI = {
    /**
     * Lấy danh sách người dùng với search và filter
     */
    async getUsers(page = 1, pageSize = 20, search = "", filter = "all") {
        const params = new URLSearchParams({
            page: page.toString(),
            pageSize: pageSize.toString(),
        });

        if (search) params.append("search", search);
        if (filter && filter !== "all") params.append("filter", filter);

        return apiClient.get(`/api/users?${params.toString()}`);
    },

    /**
     * Lấy thông tin chi tiết một người dùng
     */
    async getUserById(userId) {
        return apiClient.get(`/api/users/${userId}`);
    },

    /**
     * Khóa tài khoản người dùng
     */
    async banUser(userId) {
        return apiClient.post(`/api/users/${userId}/ban`);
    },

    /**
     * Mở khóa tài khoản người dùng
     */
    async unbanUser(userId) {
        return apiClient.post(`/api/users/${userId}/unban`);
    },
};

// ============= CONTENT MODERATION API =============
export const moderationAPI = {
    /**
     * Lấy danh sách nội dung cần kiểm duyệt
     * @param {string} type - "post" hoặc "comment"
     * @param {string} status - "pending", "approved", "rejected"
     * @param {number} page
     * @param {number} pageSize
     */
    async getPendingContent(
        type = "post",
        status = "pending",
        page = 1,
        pageSize = 20
    ) {
        const params = new URLSearchParams({
            type,
            status,
            page: page.toString(),
            pageSize: pageSize.toString(),
        });
        return apiClient.get(`/api/content-moderation?${params.toString()}`);
    },

    /**
     * Duyệt nội dung
     */
    async approveContent(id) {
        return apiClient.post(`/api/content-moderation/${id}/approve`);
    },

    /**
     * Từ chối nội dung
     */
    async rejectContent(id, reason) {
        return apiClient.post(`/api/content-moderation/${id}/reject`, {
            reason,
        });
    },

    /**
     * Xóa nội dung
     */
    async deleteContent(id) {
        return apiClient.delete(`/api/content-moderation/${id}`);
    },

    /**
     * Lấy chi tiết nội dung
     */
    async getContentDetail(id) {
        return apiClient.get(`/api/content-moderation/${id}`);
    },
};

// ============= AI MODERATION API =============
export const aiModerationAPI = {
    /**
     * Lấy thống kê tổng quan về AI Moderation
     */
    async getStatistics(startDate = null, endDate = null) {
        // Backend endpoint không hỗ trợ filter theo date, trả về toàn bộ statistics
        return apiClient.get(`/api/ai-moderation/statistics`);
    },

    /**
     * Lấy danh sách người dùng vi phạm nhiều lần
     */
    async getFrequentViolators(minViolations = 5, page = 1, pageSize = 20) {
        return apiClient.get(
            `/api/ai-moderation/frequent-violators?minViolations=${minViolations}&page=${page}&pageSize=${pageSize}`
        );
    },
    /**
     * Lấy danh sách báo cáo vi phạm
     */ async getViolationReports(
        type = "all",
        riskLevel = "all",
        toxicLabel = "all",
        page = 1,
        pageSize = 20
    ) {
        return apiClient.get(
            `/api/ai-moderation/violation-reports?type=${type}&riskLevel=${riskLevel}&toxicLabel=${toxicLabel}&page=${page}&pageSize=${pageSize}`
        );
    },

    /**
     * Lấy chi tiết lịch sử vi phạm của người dùng
     */
    async getUserViolations(accountId) {
        return apiClient.get(`/api/ai-moderation/user-violations/${accountId}`);
    },

    /**
     * Xóa tài khoản vi phạm và gửi email thông báo
     */
    async deleteViolator(accountId, reason = "") {
        return apiClient.delete(
            `/api/ai-moderation/delete-violator/${accountId}`,
            {
                data: { Reason: reason },
            }
        );
    },
};

// ============= REACTIONS API =============
export const reactionsAPI = {
  async getSummary(postId) {
    return apiClient.get(`/api/reactions/post/${postId}/summary`);
  },
  async getByPost(postId) {
    return apiClient.get(`/api/reactions/post/${postId}`);
  }
};

// ============= REPORTS API (Mock) =============
export const reportsAPI = {
    async getReports(page = 1, pageSize = 20, status = "pending") {
        const params = new URLSearchParams({
            status: status || "pending",
            page: page.toString(),
            pageSize: pageSize.toString(),
        });
        return apiClient.get(`/api/reports?${params}`);
    },

    async getReportById(reportId) {
        return apiClient.get(`/api/reports/${reportId}`);
    },

    async resolveReport(reportId, options = {}) {
        const {
            adminNote = "",
            deleteContent = false,
            banUser = false,
            banDuration = null,
        } = options;

        return apiClient.post(`/api/reports/${reportId}/resolve`, {
            adminNote,
            deleteContent,
            banUser,
            banDuration,
        });
    },

    async rejectReport(reportId, adminNote = "") {
        return apiClient.post(`/api/reports/${reportId}/reject`, {
            adminNote,
        });
    },

    async getUserViolationStats(userId) {
        return apiClient.get(`/api/reports/user/${userId}/stats`);
    },
};

// ============= BUSINESS VERIFICATION API =============
export const businessAPI = {
    /**
     * Lấy danh sách yêu cầu xác thực doanh nghiệp
     */
    async getVerificationRequests(
        page = 1,
        pageSize = 20,
        status = "pending",
        search = ""
    ) {
        const params = new URLSearchParams({
            status: status || "pending",
            page: page.toString(),
            pageSize: pageSize.toString(),
        });

        if (search) {
            params.append("search", search);
        }

        return apiClient.get(`/api/BusinessVerification?${params}`);
    },

    /**
     * Lấy chi tiết yêu cầu xác thực
     */
    async getVerificationRequestById(requestId) {
        return apiClient.get(`/api/BusinessVerification/${requestId}`);
    },

    /**
     * Phê duyệt yêu cầu xác thực
     */
    async approveRequest(requestId, adminNote = "") {
        return apiClient.post(
            `/api/BusinessVerification/${requestId}/approve`,
            {
                adminNote,
            }
        );
    },

    /**
     * Từ chối yêu cầu xác thực
     */
    async rejectRequest(requestId, adminNote = "") {
        return apiClient.post(`/api/BusinessVerification/${requestId}/reject`, {
            adminNote,
        });
    },

    /**
     * Lấy thống kê yêu cầu xác thực
     */
    async getStats() {
        return apiClient.get("/api/BusinessVerification/stats");
    },
};

// ============= ADMIN ACTIVITY LOGS API =============
export const activityLogsAPI = {
    /**
     * Lấy danh sách nhật ký hoạt động của admin
     * @param {number} page - Trang hiện tại
     * @param {number} pageSize - Số lượng bản ghi mỗi trang
     * @param {string} actionType - Loại hành động (all, user, post, business, comment, report, system)
     * @param {string} adminEmail - Email admin để lọc theo admin cụ thể
     * @param {string} dateFilter - Lọc theo thời gian (1, 7, 30, 90 ngày)
     * @param {string} searchTerm - Tìm kiếm theo action hoặc admin name
     */
    async getActivityLogs(
        page = 1,
        pageSize = 20,
        actionType = "all",
        adminEmail = "",
        dateFilter = "7",
        searchTerm = ""
    ) {
        const params = new URLSearchParams({
            page: page.toString(),
            pageSize: pageSize.toString(),
        });

        if (actionType && actionType !== "all") {
            params.append("actionType", actionType);
        }

        if (adminEmail) {
            params.append("adminEmail", adminEmail);
        }

        if (dateFilter) {
            params.append("days", dateFilter);
        }

        if (searchTerm) {
            params.append("search", searchTerm);
        }

        return apiClient.get(`/api/admin/activity-logs?${params.toString()}`);
    },

    /**
     * Lấy thống kê tổng quan về hoạt động của admin
     */
    async getActivityStats(days = 7) {
        return apiClient.get(`/api/admin/activity-logs/stats?days=${days}`);
    },

    /**
     * Lấy danh sách admin đang hoạt động
     */
    async getActiveAdmins(days = 7) {
        return apiClient.get(
            `/api/admin/activity-logs/active-admins?days=${days}`
        );
    },

    /**
     * Xuất báo cáo nhật ký hoạt động
     */
    async exportActivityLogs(startDate, endDate, format = "csv") {
        const params = new URLSearchParams({
            startDate: startDate.toISOString().split("T")[0],
            endDate: endDate.toISOString().split("T")[0],
            format,
        });

        return apiClient.get(
            `/api/admin/activity-logs/export?${params.toString()}`,
            {
                responseType: "blob",
            }
        );
    },
};

export default apiClient;
