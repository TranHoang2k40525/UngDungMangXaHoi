import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL = 'http://192.168.0.109:5297/api'; // Backend IP từ Api.js
// const BASE_URL = 'http://10.0.2.2:5297/api'; // Android emulator
// const BASE_URL = 'http://localhost:5297/api'; // iOS simulator

// Create axios instance
const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor để thêm token
apiClient.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('accessToken');
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
      // Token expired, redirect to login
      await AsyncStorage.removeItem('accessToken');
      // Navigation.navigate('Login');
    }
    return Promise.reject(error);
  }
);

const MessageAPI = {
  // Lấy danh sách conversations
  getConversations: async () => {
    try {
      console.log('[MessageAPI] Calling GET /messages/conversations');
      const response = await apiClient.get('/messages/conversations');
      console.log('[MessageAPI] Conversations response:', JSON.stringify(response.data, null, 2));
      return response.data;
    } catch (error) {
      console.error('[MessageAPI] Get conversations error:', error);
      throw error;
    }
  },

  // Lấy chi tiết conversation và messages
  getConversationDetail: async (otherUserId, page = 1, pageSize = 50) => {
    try {
      const response = await apiClient.get(`/messages/conversations/${otherUserId}`, {
        params: { page, pageSize }
      });
      return response.data;
    } catch (error) {
      console.error('[MessageAPI] Get conversation detail error:', error);
      throw error;
    }
  },

  // Gửi tin nhắn (HTTP fallback)
  sendMessage: async (receiverId, content, messageType = 'Text', mediaUrl = null, thumbnailUrl = null) => {
    try {
      const response = await apiClient.post('/messages/send', {
        receiver_id: receiverId,
        content: content,
        message_type: messageType,
        media_url: mediaUrl,
        thumbnail_url: thumbnailUrl
      });
      return response.data;
    } catch (error) {
      console.error('[MessageAPI] Send message error:', error);
      throw error;
    }
  },

  // Đánh dấu đã đọc
  markAsRead: async (conversationId) => {
    try {
      const response = await apiClient.put(`/messages/read/${conversationId}`);
      return response.data;
    } catch (error) {
      console.error('[MessageAPI] Mark as read error:', error);
      throw error;
    }
  },

  // Xóa tin nhắn
  deleteMessage: async (messageId) => {
    try {
      const response = await apiClient.delete(`/messages/${messageId}`);
      return response.data;
    } catch (error) {
      console.error('[MessageAPI] Delete message error:', error);
      throw error;
    }
  },

  // Lấy danh sách mutual followers (những người có thể nhắn tin)
  getMutualFollowers: async () => {
    try {
      console.log('[MessageAPI] Calling GET /messages/mutual-followers');
      const token = await AsyncStorage.getItem('accessToken');
      console.log('[MessageAPI] Token exists:', !!token);
      
      const response = await apiClient.get('/messages/mutual-followers');
      console.log('[MessageAPI] Response status:', response.status);
      console.log('[MessageAPI] Response data:', JSON.stringify(response.data, null, 2));
      return response.data;
    } catch (error) {
      console.error('[MessageAPI] Get mutual followers error:', error);
      console.error('[MessageAPI] Error response:', error.response?.data);
      console.error('[MessageAPI] Error status:', error.response?.status);
      throw error;
    }
  },

  // Thu hồi tin nhắn
  recallMessage: async (messageId) => {
    try {
      console.log('[MessageAPI] Calling POST /messages/recall/' + messageId);
      const response = await apiClient.post(`/messages/recall/${messageId}`);
      console.log('[MessageAPI] Recall response:', response.data);
      return response.data;
    } catch (error) {
      console.error('[MessageAPI] Recall message error:', error);
      console.error('[MessageAPI] Error response:', error.response?.data);
      throw error;
    }
  },
};

export default MessageAPI;
