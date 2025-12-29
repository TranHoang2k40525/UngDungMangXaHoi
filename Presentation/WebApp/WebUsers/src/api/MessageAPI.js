import axios from "axios";
import { API_BASE_URL } from "./Api";

const BASE_URL = `${API_BASE_URL}/api`;

// Create axios instance
const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor để thêm token
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

// Response interceptor để xử lý lỗi
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("accessToken");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

const MessageAPI = {
  // Lấy danh sách conversations
  getConversations: async () => {
    try {
      const response = await apiClient.get("/messages/conversations");
      return response.data;
    } catch (error) {
      console.error("[MessageAPI] Get conversations error:", error);
      throw error;
    }
  },

  // Lấy chi tiết conversation và messages
  getConversationDetail: async (otherUserId, page = 1, pageSize = 50) => {
    try {
      const response = await apiClient.get(`/messages/conversations/${otherUserId}`, {
        params: { page, pageSize },
      });
      return response.data;
    } catch (error) {
      console.error("[MessageAPI] Get conversation detail error:", error);
      throw error;
    }
  },

  // Gửi tin nhắn (HTTP fallback)
  sendMessage: async (receiverId, content, messageType = "Text", mediaUrl = null, thumbnailUrl = null) => {
    try {
      const response = await apiClient.post("/messages/send", {
        receiver_id: receiverId,
        content: content,
        message_type: messageType,
        media_url: mediaUrl,
        thumbnail_url: thumbnailUrl,
      });
      return response.data;
    } catch (error) {
      console.error("[MessageAPI] Send message error:", error);
      throw error;
    }
  },

  // Đánh dấu đã đọc
  markAsRead: async (conversationId) => {
    try {
      const response = await apiClient.put(`/messages/read/${conversationId}`);
      return response.data;
    } catch (error) {
      console.error("[MessageAPI] Mark as read error:", error);
      throw error;
    }
  },

  // Xóa tin nhắn
  deleteMessage: async (messageId) => {
    try {
      const response = await apiClient.delete(`/messages/${messageId}`);
      return response.data;
    } catch (error) {
      console.error("[MessageAPI] Delete message error:", error);
      throw error;
    }
  },

  // Lấy danh sách mutual followers
  getMutualFollowers: async () => {
    try {
      const response = await apiClient.get("/messages/mutual-followers");
      return response.data;
    } catch (error) {
      console.error("[MessageAPI] Get mutual followers error:", error);
      throw error;
    }
  },

  // Thu hồi tin nhắn
  recallMessage: async (messageId) => {
    try {
      const response = await apiClient.post(`/messages/recall/${messageId}`);
      return response.data;
    } catch (error) {
      console.error("[MessageAPI] Recall message error:", error);
      throw error;
    }
  },
};

export default MessageAPI;
