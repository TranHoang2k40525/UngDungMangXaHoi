import axios from "axios";
import { API_BASE_URL } from "./Api";

const BASE_URL = `${API_BASE_URL}/api`;

const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("accessToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

const NotificationAPI = {
  // Lấy danh sách notifications
  getNotifications: async (page = 1, pageSize = 20) => {
    try {
      const response = await apiClient.get("/notifications", {
        params: { page, pageSize },
      });
      return response.data;
    } catch (error) {
      console.error("[NotificationAPI] Get notifications error:", error);
      throw error;
    }
  },

  // Đánh dấu notification đã đọc
  markAsRead: async (notificationId) => {
    try {
      const response = await apiClient.put(`/notifications/${notificationId}/read`);
      return response.data;
    } catch (error) {
      console.error("[NotificationAPI] Mark as read error:", error);
      throw error;
    }
  },

  // Đánh dấu tất cả đã đọc
  markAllAsRead: async () => {
    try {
      const response = await apiClient.put("/notifications/read-all");
      return response.data;
    } catch (error) {
      console.error("[NotificationAPI] Mark all as read error:", error);
      throw error;
    }
  },

  // Xóa notification
  deleteNotification: async (notificationId) => {
    try {
      const response = await apiClient.delete(`/notifications/${notificationId}`);
      return response.data;
    } catch (error) {
      console.error("[NotificationAPI] Delete notification error:", error);
      throw error;
    }
  },

  // Lấy số lượng notifications chưa đọc
  getUnreadCount: async () => {
    try {
      const response = await apiClient.get("/notifications/unread-count");
      return response.data;
    } catch (error) {
      console.error("[NotificationAPI] Get unread count error:", error);
      return { count: 0 };
    }
  },
};

export default NotificationAPI;
