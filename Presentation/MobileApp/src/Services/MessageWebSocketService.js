import * as SignalR from '@microsoft/signalr';
import AsyncStorage from '@react-native-async-storage/async-storage';

class MessageWebSocketService {
  constructor() {
    this.connection = null;
    this.isConnected = false;
    this.listeners = {};
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
  }

  // Khởi tạo connection
  async initialize() {
    try {
      const token = await AsyncStorage.getItem('accessToken');
      
      if (!token) {
        console.error('[MessageWebSocket] No access token found');
        return false;
      }

        const baseURL = 'http://192.168.1.102:5297'; // Backend IP từ Api.js
      // const baseURL = 'http://10.0.2.2:5297'; // Android emulator
      // const baseURL = 'http://localhost:5297'; // iOS simulator
      
      this.connection = new SignalR.HubConnectionBuilder()
        .withUrl(`${baseURL}/hubs/messages`, {
          accessTokenFactory: () => token,
          transport: SignalR.HttpTransportType.WebSockets | SignalR.HttpTransportType.LongPolling,
        })
        .withAutomaticReconnect({
          nextRetryDelayInMilliseconds: (retryContext) => {
            if (retryContext.elapsedMilliseconds < 60000) {
              return Math.random() * 10000;
            } else {
              return null;
            }
          }
        })
        .configureLogging(SignalR.LogLevel.Information)
        .build();

      this.setupEventHandlers();
      
      await this.connect();
      return true;
    } catch (error) {
      console.error('[MessageWebSocket] Initialization error:', error);
      return false;
    }
  }

  // Kết nối
  async connect() {
    // Check actual connection state, not just flag
    if (this.connection && this.connection.state === SignalR.HubConnectionState.Connected) {
      console.log('[MessageWebSocket] Already connected');
      this.isConnected = true;
      return;
    }

    try {
      await this.connection.start();
      this.isConnected = true;
      this.reconnectAttempts = 0;
      console.log('[MessageWebSocket] Connected successfully');
      
      // Lấy danh sách users online
      await this.getOnlineUsers();
    } catch (error) {
      console.error('[MessageWebSocket] Connection error:', error);
      this.isConnected = false;
      this.handleReconnect();
    }
  }

  // Ngắt kết nối
  async disconnect() {
    if (this.connection && this.isConnected) {
      await this.connection.stop();
      this.isConnected = false;
      console.log('[MessageWebSocket] Disconnected');
    }
  }

  // Setup event handlers
  setupEventHandlers() {
    // Nhận tin nhắn mới
    this.connection.on('ReceiveMessage', (message) => {
      console.log('[MessageWebSocket] Received message:', message);
      this.emit('messageReceived', message);
    });

    // Xác nhận tin nhắn đã gửi
    this.connection.on('MessageSent', (message) => {
      console.log('[MessageWebSocket] Message sent confirmation:', message);
      this.emit('messageSent', message);
    });

    // Tin nhắn đã được đọc
    this.connection.on('MessagesRead', (data) => {
      console.log('[MessageWebSocket] Messages read:', data);
      this.emit('messagesRead', data);
    });

    // User đang typing
    this.connection.on('UserTyping', (data) => {
      console.log('[MessageWebSocket] User typing:', data);
      this.emit('userTyping', data);
    });

    // User online
    this.connection.on('UserOnline', (userId) => {
      console.log('[MessageWebSocket] User online:', userId);
      this.emit('userOnline', userId);
    });

    // User offline
    this.connection.on('UserOffline', (userId) => {
      console.log('[MessageWebSocket] User offline:', userId);
      this.emit('userOffline', userId);
    });

    // Danh sách users online
    this.connection.on('OnlineUsers', (userIds) => {
      console.log('[MessageWebSocket] Online users:', userIds);
      this.emit('onlineUsers', userIds);
    });

    // Tin nhắn đã xóa
    this.connection.on('MessageDeleted', (messageId) => {
      console.log('[MessageWebSocket] Message deleted:', messageId);
      this.emit('messageDeleted', messageId);
    });

    // Tin nhắn đã thu hồi
    this.connection.on('MessageRecalled', (message) => {
      console.log('[MessageWebSocket] Message recalled:', message);
      this.emit('messageRecalled', message);
    });

    // Lỗi
    this.connection.on('Error', (error) => {
      console.error('[MessageWebSocket] Server error:', error);
      this.emit('error', error);
    });

    // Reconnecting
    this.connection.onreconnecting((error) => {
      console.log('[MessageWebSocket] Reconnecting...', error);
      this.isConnected = false;
      this.emit('reconnecting');
    });

    // Reconnected
    this.connection.onreconnected((connectionId) => {
      console.log('[MessageWebSocket] Reconnected:', connectionId);
      this.isConnected = true;
      this.emit('reconnected');
    });

    // Closed
    this.connection.onclose((error) => {
      console.log('[MessageWebSocket] Connection closed:', error);
      this.isConnected = false;
      this.emit('disconnected');
      this.handleReconnect();
    });
  }

  // Gửi tin nhắn
  async sendMessage(receiverId, content, messageType = 'Text', mediaUrl = null, thumbnailUrl = null) {
    // Check actual connection state
    if (!this.connection || this.connection.state !== SignalR.HubConnectionState.Connected) {
      console.warn('[MessageWebSocket] Cannot send - not connected, reconnecting...');
      await this.connect();
      
      if (!this.connection || this.connection.state !== SignalR.HubConnectionState.Connected) {
        throw new Error('WebSocket not connected');
      }
    }

    try {
      await this.connection.invoke('SendMessage', {
        receiver_id: receiverId,
        content: content,
        message_type: messageType,
        media_url: mediaUrl,
        thumbnail_url: thumbnailUrl
      });
    } catch (error) {
      console.error('[MessageWebSocket] Send message error:', error);
      throw error;
    }
  }

  // Đánh dấu đã đọc
  async markAsRead(conversationId) {
    // Check actual connection state
    if (!this.connection || this.connection.state !== SignalR.HubConnectionState.Connected) {
      console.warn('[MessageWebSocket] Cannot mark as read - not connected');
      return; // Silently fail
    }

    try {
      await this.connection.invoke('MarkAsRead', conversationId);
    } catch (error) {
      console.error('[MessageWebSocket] Mark as read error:', error);
    }
  }

  // User typing
  async userTyping(receiverId, isTyping) {
    // Check actual connection state
    if (!this.connection || this.connection.state !== SignalR.HubConnectionState.Connected) {
      return; // Silently fail
    }

    try {
      await this.connection.invoke('UserTyping', receiverId, isTyping);
    } catch (error) {
      console.error('[MessageWebSocket] User typing error:', error);
    }
  }

  // Lấy danh sách users online
  async getOnlineUsers() {
    if (!this.isConnected) {
      return;
    }

    try {
      await this.connection.invoke('GetOnlineUsers');
    } catch (error) {
      console.error('[MessageWebSocket] Get online users error:', error);
    }
  }

  // Xóa tin nhắn
  async deleteMessage(messageId) {
    if (!this.isConnected) {
      throw new Error('WebSocket not connected');
    }

    try {
      await this.connection.invoke('DeleteMessage', messageId);
    } catch (error) {
      console.error('[MessageWebSocket] Delete message error:', error);
      throw error;
    }
  }

  // Thu hồi tin nhắn
  async recallMessage(messageId) {
    try {
      if (!this.connection || this.connection.state !== SignalR.HubConnectionState.Connected) {
        console.log('[MessageWebSocket] Cannot recall - not connected');
        return;
      }

      console.log('[MessageWebSocket] Recalling message:', messageId);
      await this.connection.invoke('RecallMessage', messageId);
    } catch (error) {
      console.error('[MessageWebSocket] Error recalling message:', error);
      throw error;
    }
  }

  // Handle reconnect
  handleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('[MessageWebSocket] Max reconnect attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    
    console.log(`[MessageWebSocket] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
    
    setTimeout(() => {
      this.connect();
    }, delay);
  }

  // Event listener management
  on(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  off(event, callback) {
    if (!this.listeners[event]) {
      return;
    }
    this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
  }

  emit(event, data) {
    if (!this.listeners[event]) {
      return;
    }
    this.listeners[event].forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`[MessageWebSocket] Listener error for event ${event}:`, error);
      }
    });
  }
}

// Export singleton instance
export default new MessageWebSocketService();
