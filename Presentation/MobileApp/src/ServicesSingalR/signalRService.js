import * as SignalR from '@microsoft/signalr';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = 'http://172.20.10.6:5297';

class SignalRService {
  constructor() {
    this.chatConnection = null;
    this.commentConnection = null;
    this.notificationConnection = null;
    this.isConnecting = false;
    this._handlers = {}; // eventName -> Set(callbacks)
    this._joinedPostRooms = new Set(); // track joined post rooms for auto-rejoin
    this._joinedChatRooms = new Set(); // track joined chat groups for auto-rejoin
    this._reconnectHandlers = new Set();
  }

  /**
   * Remove a previously registered handler for an event.
   * Detaches from any active connections and removes from internal registry.
   */
  removeHandler(eventName, cb) {
    try {
      if (this._handlers && this._handlers[eventName]) {
        this._handlers[eventName].delete(cb);
        if (this._handlers[eventName].size === 0) delete this._handlers[eventName];
      }

      try {
        if (this.chatConnection) this.chatConnection.off(eventName, cb);
      } catch (e) { /* ignore */ }
      try {
        if (this.commentConnection) this.commentConnection.off(eventName, cb);
      } catch (e) { /* ignore */ }
      try {
        if (this.notificationConnection) this.notificationConnection.off(eventName, cb);
      } catch (e) { /* ignore */ }
    } catch (e) {
      console.error('[SignalR] removeHandler error', eventName, e);
    }
  }

  /**
   * Lấy token từ AsyncStorage
   */
  async getToken() {
    try {
      // ✅ FIX: Token key is 'accessToken' not 'token'
      return await AsyncStorage.getItem('accessToken');
    } catch (error) {
      console.error('Error getting token:', error);
      return null;
    }
  }

  /**
   * Tạo connection với authentication
   */
  createConnection(hubUrl) {
    return new SignalR.HubConnectionBuilder()
      .withUrl(hubUrl, {
        accessTokenFactory: async () => {
          const token = await this.getToken();
          return token || '';
        },
        // ✅ FIX: Bỏ skipNegotiation để SignalR tự negotiate transport
        // skipNegotiation: true,
        // transport: SignalR.HttpTransportType.WebSockets,
      })
      .withAutomaticReconnect({
        nextRetryDelayInMilliseconds: retryContext => {
          // Exponential backoff: 0s, 2s, 10s, 30s
          if (retryContext.elapsedMilliseconds < 60000) {
            return Math.random() * 10000;
          } else {
            return null; // Stop retrying after 1 minute
          }
        }
      })
      .configureLogging(SignalR.LogLevel.Information)
      .build();
  }

  // ==========================================
  // CHAT CONNECTION (Group Chat)
  // ==========================================

  /**
   * Kết nối đến Chat Hub
   */
  async connectToChat() {
    if (this.chatConnection?.state === SignalR.HubConnectionState.Connected) {
      console.log('✅ Chat already connected');
      return this.chatConnection;
    }

    if (this.isConnecting) {
      console.log('⏳ Chat connection in progress...');
      return null;
    }

    try {
      this.isConnecting = true;
      this.chatConnection = this.createConnection(`${API_BASE_URL}/hubs/chat`);

      // Setup reconnection handlers
      this.chatConnection.onreconnecting((error) => {
        console.warn('🔄 Chat reconnecting...', error?.message);
      });

      this.chatConnection.onreconnected((connectionId) => {
        console.log('✅ Chat reconnected:', connectionId);
        try {
          for (const cb of this._reconnectHandlers) {
            try { cb(connectionId); } catch (e) { console.error('[SignalR] onReconnected handler error', e); }
          }

          // Auto re-join previously joined chat groups after reconnect
          try {
            for (const convId of this._joinedChatRooms) {
              try {
                this.chatConnection.invoke('JoinGroup', convId.toString());
                console.log('[SignalR] Re-joined chat group after reconnect:', convId);
              } catch (e) {
                console.warn('[SignalR] Failed to re-join chat group', convId, e);
              }
            }
          } catch (e) {
            console.error('[SignalR] Error during chat auto re-join after reconnect', e);
          }
        } catch (e) {
          console.error('[SignalR] Error running reconnect handlers', e);
        }
      });

      this.chatConnection.onclose((error) => {
        console.log('❌ Chat connection closed:', error?.message);
      });

      await this.chatConnection.start();
      // Attach any previously registered handlers so listeners survive across reconnects
      try {
        for (const [event, cbs] of Object.entries(this._handlers)) {
          for (const cb of cbs) {
            try { this.chatConnection.on(event, cb); } catch (e) { console.error('[SignalR] attach handler error', event, e); }
          }
        }
      } catch (e) {
        console.error('[SignalR] Error attaching handlers after start:', e);
      }

      console.log('✅ Connected to Chat Hub');

      return this.chatConnection;
    } catch (error) {
      console.error('❌ Chat connection error:', error);
      this.chatConnection = null;
      throw error;
    } finally {
      this.isConnecting = false;
    }
  }

  /**
   * Join nhóm chat
   */
  async joinGroup(conversationId) {
    try {
      // Track the intention to join this group so reconnect handlers can re-join later
      try { this._joinedChatRooms.add(String(conversationId)); } catch (e) { /* ignore */ }

      if (!this.chatConnection || this.chatConnection.state !== SignalR.HubConnectionState.Connected) {
        await this.connectToChat();
      }

      try {
        await this.chatConnection.invoke('JoinGroup', conversationId.toString());
        console.log(`✅ Joined group: ${conversationId}`);
      } catch (invokeErr) {
        console.warn('[SignalR] joinGroup invoke failed, will retry on reconnect:', conversationId, invokeErr);
      }
    } catch (error) {
      console.error('Error joining group:', error);
      throw error;
    }
  }

  /**
   * Leave nhóm chat
   */
  async leaveGroup(conversationId) {
    try {
      if (this.chatConnection?.state === SignalR.HubConnectionState.Connected) {
        await this.chatConnection.invoke('LeaveGroup', conversationId.toString());
        this._joinedChatRooms.delete(conversationId);
        console.log(`✅ Left group: ${conversationId}`);
      }
    } catch (error) {
      console.error('Error leaving group:', error);
    }
  }

  /**
   * Gửi tin nhắn
   */
  async sendMessage(conversationId, messageData) {
    try {
      if (!this.chatConnection || this.chatConnection.state !== SignalR.HubConnectionState.Connected) {
        throw new Error('Not connected to chat hub');
      }
      
      await this.chatConnection.invoke('SendMessage', conversationId.toString(), messageData);
      console.log('✅ Message sent');
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  /**
   * Mark a message as read via hub
   */
  async markMessageAsRead(conversationId, messageId) {
    try {
      if (!this.chatConnection || this.chatConnection.state !== SignalR.HubConnectionState.Connected) {
        await this.connectToChat();
      }
      await this.chatConnection.invoke('MarkMessageAsRead', conversationId.toString(), messageId);
    } catch (error) {
      console.error('Error invoking MarkMessageAsRead:', error);
      throw error;
    }
  }

  /**
   * Notify server that user opened a group conversation (bulk mark-as-read helper)
   * @param {string|number} conversationId
   * @param {number|null} lastReadMessageId - last message id client has (optional)
   */
  async invokeOpenGroup(conversationId, lastReadMessageId = null) {
    try {
      if (!this.chatConnection || this.chatConnection.state !== SignalR.HubConnectionState.Connected) {
        await this.connectToChat();
      }
      const lastId = lastReadMessageId == null ? 0 : lastReadMessageId;
      await this.chatConnection.invoke('OpenGroup', conversationId.toString(), lastId);
      console.log('[SignalR] OpenGroup invoked', conversationId, lastId);
    } catch (error) {
      console.error('Error invoking OpenGroup:', error);
      throw error;
    }
  }

  /**
   * Mark multiple messages as read (helper that calls MarkMessageAsRead per id)
   */
  async markMessagesAsRead(conversationId, messageIds = []) {
    if (!Array.isArray(messageIds)) messageIds = [messageIds];
    for (const id of messageIds) {
      try {
        await this.markMessageAsRead(conversationId, id);
      } catch (e) {
        console.error('[SignalR] markMessagesAsRead error for', id, e);
      }
    }
  }

  /**
   * React to a message via hub
   */
  async reactToMessage(conversationId, messageId, emoji) {
    try {
      if (!this.chatConnection || this.chatConnection.state !== SignalR.HubConnectionState.Connected) {
        await this.connectToChat();
      }
      await this.chatConnection.invoke('ReactToMessage', conversationId.toString(), messageId, emoji);
    } catch (error) {
      console.error('Error invoking ReactToMessage:', error);
      throw error;
    }
  }

  /**
   * Pin a message via hub
   */
  async pinMessage(conversationId, messageId, messageData) {
    try {
      if (!this.chatConnection || this.chatConnection.state !== SignalR.HubConnectionState.Connected) {
        await this.connectToChat();
      }
      await this.chatConnection.invoke('PinMessage', conversationId.toString(), messageId, messageData);
    } catch (error) {
      console.error('Error invoking PinMessage:', error);
      throw error;
    }
  }

  /**
   * Unpin a message via hub
   */
  async unpinMessage(conversationId, messageId) {
    try {
      if (!this.chatConnection || this.chatConnection.state !== SignalR.HubConnectionState.Connected) {
        await this.connectToChat();
      }
      await this.chatConnection.invoke('UnpinMessage', conversationId.toString(), messageId);
    } catch (error) {
      console.error('Error invoking UnpinMessage:', error);
      throw error;
    }
  }

  /**
   * Update group avatar via hub
   */
  async updateGroupAvatar(conversationId, avatarUrl) {
    try {
      if (!this.chatConnection || this.chatConnection.state !== SignalR.HubConnectionState.Connected) {
        await this.connectToChat();
      }
      await this.chatConnection.invoke('UpdateGroupAvatar', conversationId.toString(), avatarUrl);
    } catch (error) {
      console.error('Error invoking UpdateGroupAvatar:', error);
      throw error;
    }
  }

  /**
   * Update group name via hub
   */
  async updateGroupName(conversationId, newName) {
    try {
      if (!this.chatConnection || this.chatConnection.state !== SignalR.HubConnectionState.Connected) {
        await this.connectToChat();
      }
      await this.chatConnection.invoke('UpdateGroupName', conversationId.toString(), newName);
    } catch (error) {
      console.error('Error invoking UpdateGroupName:', error);
      throw error;
    }
  }

  /**
   * Đăng ký lắng nghe tin nhắn mới
   */
  onReceiveMessage(callback) {
    this._addHandler('ReceiveMessage', callback);
  }

  /**
   * Listen for message save failures (server tells caller to remove optimistic message)
   */
  onMessageSaveFailed(callback) {
    this._addHandler('MessageSaveFailed', callback);
  }

  /**
   * ✅ NEW: Đăng ký lắng nghe tin nhắn được đánh dấu đã đọc
   */
  onMessageRead(callback) {
    this._addHandler('MessageRead', callback);
  }

  /**
   * ✅ NEW: Đăng ký lắng nghe reaction được thêm vào
   */
  onReactionAdded(callback) {
    this._addHandler('ReactionAdded', callback);
  }

  /**
   * ✅ NEW: Đăng ký lắng nghe reaction bị xóa
   */
  onReactionRemoved(callback) {
    this._addHandler('ReactionRemoved', callback);
  }

  /**
   * Đăng ký lắng nghe avatar nhóm thay đổi
   */
  onGroupAvatarUpdated(callback) {
    this._addHandler('GroupAvatarUpdated', callback);
  }

  /**
   * Đăng ký lắng nghe tên nhóm thay đổi
   */
  onGroupNameUpdated(callback) {
    this._addHandler('GroupNameUpdated', callback);
  }

  /**
   * Đăng ký lắng nghe khi nhóm bị xóa (admin đã xóa nhóm)
   */
  onGroupDeleted(callback) {
    this._addHandler('GroupDeleted', callback);
  }

  /**
   * Đăng ký lắng nghe khi một thành viên bị xóa/rời nhóm (persisted removal)
   */
  onMemberRemoved(callback) {
    this._addHandler('MemberRemoved', callback);
  }

  /**
   * Đăng ký lắng nghe tin nhắn được ghim
   */
  onMessagePinned(callback) {
    this._addHandler('MessagePinned', callback);
  }

  /**
   * Đăng ký lắng nghe tin nhắn bỏ ghim
   */
  onMessageUnpinned(callback) {
    this._addHandler('MessageUnpinned', callback);
  }

  /**
   * Đăng ký lắng nghe tin nhắn bị xóa
   */
  onMessageDeleted(callback) {
    this._addHandler('MessageDeleted', callback);
  }

  /**
   * Đăng ký lắng nghe user typing
   */
  onUserTyping(callback) {
    this._addHandler('UserTyping', callback);
  }

  /**
   * Đăng ký lắng nghe user stopped typing
   */
  onUserStoppedTyping(callback) {
    this._addHandler('UserStoppedTyping', callback);
  }

  /**
   * Đăng ký lắng nghe reconnection hoàn tất
   */
  onReconnected(callback) {
    if (!this._reconnectHandlers) this._reconnectHandlers = new Set();
    this._reconnectHandlers.add(callback);
  }

  // Internal helper: register handler and attach immediately if connection exists
  _addHandler(eventName, cb) {
    if (!this._handlers[eventName]) this._handlers[eventName] = new Set();
    this._handlers[eventName].add(cb);
    try {
      // Attach to any existing connections (chat/comment/notification)
      if (this.chatConnection) this.chatConnection.on(eventName, cb);
      if (this.commentConnection) this.commentConnection.on(eventName, cb);
      if (this.notificationConnection) this.notificationConnection.on(eventName, cb);
    } catch (e) {
      console.error('[SignalR] _addHandler attach error', eventName, e);
    }
  }

  /**
   * Gửi typing indicator
   */
  async sendTyping(conversationId, username) {
    try {
      if (this.chatConnection?.state === SignalR.HubConnectionState.Connected) {
        await this.chatConnection.invoke('UserTyping', conversationId.toString(), username);
      }
    } catch (error) {
      console.error('Error sending typing indicator:', error);
    }
  }

  /**
   * Gửi stop typing indicator
   */
  async sendStopTyping(conversationId, username) {
    try {
      if (this.chatConnection?.state === SignalR.HubConnectionState.Connected) {
        await this.chatConnection.invoke('UserStoppedTyping', conversationId.toString(), username);
      }
    } catch (error) {
      console.error('Error sending stop typing indicator:', error);
    }
  }

  /**
   * Disconnect chat
   */
  async disconnectChat() {
    try {
      if (this.chatConnection) {
        await this.chatConnection.stop();
        this.chatConnection = null;
        console.log('✅ Chat disconnected');
      }
    } catch (error) {
      console.error('Error disconnecting chat:', error);
    }
  }

  // ==========================================
  // COMMENT CONNECTION
  // ==========================================

  /**
   * Kết nối đến Comment Hub
   */
  async connectToComments() {
    if (this.commentConnection?.state === SignalR.HubConnectionState.Connected) {
      console.log('✅ Comment already connected');
      return this.commentConnection;
    }

    try {
      this.commentConnection = this.createConnection(`${API_BASE_URL}/hubs/comments`);

      this.commentConnection.onreconnecting((error) => {
        console.warn('🔄 Comment reconnecting...', error?.message);
      });

      this.commentConnection.onreconnected((connectionId) => {
        console.log('✅ Comment reconnected:', connectionId);
        // Auto re-join previously joined post rooms after reconnect
        try {
          for (const postId of this._joinedPostRooms) {
            try {
              this.commentConnection.invoke('JoinPostRoom', postId);
              console.log('[SignalR] Re-joined post room after reconnect:', postId);
            } catch (e) {
              console.warn('[SignalR] Failed to re-join post room', postId, e);
            }
          }
        } catch (e) {
          console.error('[SignalR] Error during auto re-join after reconnect', e);
        }
      });

      this.commentConnection.onclose((error) => {
        console.log('❌ Comment connection closed:', error?.message);
      });

      await this.commentConnection.start();
      console.log('✅ Connected to Comment Hub');
      // Attach any previously registered handlers so comment listeners survive across reconnects
      try {
        for (const [event, cbs] of Object.entries(this._handlers)) {
          for (const cb of cbs) {
            try { this.commentConnection.on(event, cb); } catch (e) { console.error('[SignalR] attach comment handler error', event, e); }
          }
        }
      } catch (e) {
        console.error('[SignalR] Error attaching comment handlers after start:', e);
      }

      return this.commentConnection;
    } catch (error) {
      console.error('❌ Comment connection error:', error);
      this.commentConnection = null;
      throw error;
    }
  }

  /**
   * Join post room để nhận comment real-time
   */
  async joinPostRoom(postId) {
    try {
      if (!this.commentConnection || this.commentConnection.state !== SignalR.HubConnectionState.Connected) {
        await this.connectToComments();
      }
      
      await this.commentConnection.invoke('JoinPostRoom', postId);
      this._joinedPostRooms.add(postId);
      console.log(` ✅ Joined post room: ${postId}`);
    } catch (error) {
      console.error('Error joining post room:', error);
      throw error;
    }
  }

  /**
   * Leave post room
   */
  async leavePostRoom(postId) {
    try {
      if (this.commentConnection?.state === SignalR.HubConnectionState.Connected) {
        await this.commentConnection.invoke('LeavePostRoom', postId);
        this._joinedPostRooms.delete(postId);
        console.log(` ✅ Left post room: ${postId}`);
      }
    } catch (error) {
      console.error('Error leaving post room:', error);
    }
  }

  /**
   * Đăng ký lắng nghe comment mới
   */
  onReceiveComment(callback) {
    this._addHandler('ReceiveComment', callback);
  }

  /**
   * Đăng ký lắng nghe comment updated
   */
  onCommentUpdated(callback) {
    this._addHandler('CommentUpdated', callback);
  }

  /**
   * Đăng ký lắng nghe comment deleted
   */
  onCommentDeleted(callback) {
    this._addHandler('CommentDeleted', callback);
  }

  /**
   * Đăng ký lắng nghe comment reply
   */
  onCommentReplyAdded(callback) {
    this._addHandler('CommentReplyAdded', callback);
  }

  /**
   * Disconnect comment
   */
  async disconnectComments() {
    try {
      if (this.commentConnection) {
        await this.commentConnection.stop();
        this.commentConnection = null;
        console.log(' Comment disconnected');
      }
    } catch (error) {
      console.error('Error disconnecting comment:', error);
    }
  }

  // ==========================================
  // CLEANUP
  // ==========================================

  /**
   * Disconnect tất cả connections
   */
  async disconnectAll() {
    await Promise.all([
      this.disconnectChat(),
      this.disconnectComments(),
    ]);
  }

  /**
   * Remove tất cả event listeners
   */
  removeAllListeners() {
    if (this.chatConnection) {
      try {
        for (const [event, cbs] of Object.entries(this._handlers)) {
          for (const cb of cbs) {
            try { this.chatConnection.off(event, cb); } catch (e) { /* ignore */ }
          }
        }
      } catch (e) {
        console.error('[SignalR] removeAllListeners chat error', e);
      }
    }

    if (this.commentConnection) {
      this.commentConnection.off('ReceiveComment');
      this.commentConnection.off('CommentUpdated');
      this.commentConnection.off('CommentDeleted');
      this.commentConnection.off('CommentReplyAdded');
    }
  }
}

// Export singleton instance
export default new SignalRService();
