import * as SignalR from '@microsoft/signalr';

const API_BASE_URL = "http://localhost:5297";

class SignalRService {
  constructor() {
    this.chatConnection = null;
    this.messageConnection = null;
    this.commentConnection = null;
    this.notificationConnection = null;
    this.isConnecting = false;
    this.isMessageConnecting = false;
    this._handlers = {};
    this._joinedPostRooms = new Set();
    this._joinedChatRooms = new Set();
    this._reconnectHandlers = new Set();
  }

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

  getToken() {
    return localStorage.getItem('accessToken') || '';
  }

  createConnection(hubUrl) {
    return new SignalR.HubConnectionBuilder()
      .withUrl(hubUrl, {
        accessTokenFactory: () => this.getToken(),
      })
      .withAutomaticReconnect({
        nextRetryDelayInMilliseconds: retryContext => {
          if (retryContext.elapsedMilliseconds < 60000) {
            return Math.random() * 10000;
          } else {
            return null;
          }
        }
      })
      .configureLogging(SignalR.LogLevel.Information)
      .build();
  }

  // CHAT CONNECTION
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

      this.chatConnection.onreconnecting((error) => {
        console.warn('🔄 Chat reconnecting...', error?.message);
      });

      this.chatConnection.onreconnected((connectionId) => {
        console.log('✅ Chat reconnected:', connectionId);
        try {
          for (const cb of this._reconnectHandlers) {
            try { cb(connectionId); } catch (e) { console.error('[SignalR] onReconnected handler error', e); }
          }

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
      
      try {
        for (const [event, cbs] of Object.entries(this._handlers)) {
          for (const cb of cbs) {
            try { this.chatConnection.on(event, cb); } catch (e) { console.error('[SignalR] attach handler error', event, e); }
          }
        }
      } catch (e) {
        console.error('[SignalR] Error attaching handlers after start:', e);
      }

      console.log('✅ Chat connected successfully');
      return this.chatConnection;
    } catch (error) {
      console.error('❌ Chat connection error:', error);
      throw error;
    } finally {
      this.isConnecting = false;
    }
  }

  // MESSAGE CONNECTION for 1:1 chat
  async connectToMessage() {
    if (this.messageConnection?.state === SignalR.HubConnectionState.Connected) {
      console.log('✅ Message already connected');
      return this.messageConnection;
    }

    if (this.isMessageConnecting) {
      console.log('⏳ Message connection in progress...');
      return null;
    }

    try {
      this.isMessageConnecting = true;
      this.messageConnection = this.createConnection(`${API_BASE_URL}/hubs/messages`);

      this.messageConnection.onreconnecting((error) => {
        console.warn('🔄 Message reconnecting...', error?.message);
      });

      this.messageConnection.onreconnected((connectionId) => {
        console.log('✅ Message reconnected:', connectionId);
      });

      this.messageConnection.onclose((error) => {
        console.log('❌ Message connection closed:', error?.message);
      });

      await this.messageConnection.start();
      console.log('✅ Message connected successfully');
      return this.messageConnection;
    } catch (error) {
      console.error('❌ Message connection error:', error);
      throw error;
    } finally {
      this.isMessageConnecting = false;
    }
  }

  async joinGroup(conversationId) {
    try {
      await this.connectToChat();
      if (this.chatConnection?.state === SignalR.HubConnectionState.Connected) {
        await this.chatConnection.invoke('JoinGroup', conversationId.toString());
        this._joinedChatRooms.add(conversationId);
        console.log('[SignalR] Joined group:', conversationId);
      }
    } catch (error) {
      console.error('[SignalR] Join group error:', error);
      throw error;
    }
  }

  async leaveGroup(conversationId) {
    try {
      if (this.chatConnection?.state === SignalR.HubConnectionState.Connected) {
        await this.chatConnection.invoke('LeaveGroup', conversationId.toString());
        this._joinedChatRooms.delete(conversationId);
        console.log('[SignalR] Left group:', conversationId);
      }
    } catch (error) {
      console.error('[SignalR] Leave group error:', error);
      throw error;
    }
  }

  onChatMessage(callback) {
    if (!this._handlers['ReceiveMessage']) {
      this._handlers['ReceiveMessage'] = new Set();
    }
    this._handlers['ReceiveMessage'].add(callback);

    if (this.chatConnection?.state === SignalR.HubConnectionState.Connected) {
      this.chatConnection.on('ReceiveMessage', callback);
    }
  }

  // COMMENT CONNECTION
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
          console.error('[SignalR] Error during comment auto re-join after reconnect', e);
        }
      });

      this.commentConnection.onclose((error) => {
        console.log('❌ Comment connection closed:', error?.message);
      });

      await this.commentConnection.start();
      console.log('✅ Connected to Comment Hub');
      
      // Attach previously registered handlers
      try {
        for (const [event, cbs] of Object.entries(this._handlers)) {
          for (const cb of cbs) {
            try { 
              this.commentConnection.on(event, cb); 
            } catch (e) { 
              console.error('[SignalR] attach comment handler error', event, e); 
            }
          }
        }
      } catch (e) {
        console.error('[SignalR] Error attaching handlers after connect', e);
      }

      return this.commentConnection;
    } catch (error) {
      console.error('❌ Comment connection error:', error);
      throw error;
    }
  }

  // Legacy alias for backward compatibility
  async connectToComment() {
    return this.connectToComments();
  }

  async joinPostRoom(postId) {
    try {
      await this.connectToComments();
      if (this.commentConnection?.state === SignalR.HubConnectionState.Connected) {
        await this.commentConnection.invoke('JoinPostRoom', postId);
        this._joinedPostRooms.add(postId);
        console.log('[SignalR] Joined post room:', postId);
      }
    } catch (error) {
      console.error('[SignalR] Join post room error:', error);
      throw error;
    }
  }

  // Legacy alias
  async joinPostComments(postId) {
    return this.joinPostRoom(postId);
  }

  async leavePostRoom(postId) {
    try {
      if (this.commentConnection?.state === SignalR.HubConnectionState.Connected) {
        await this.commentConnection.invoke('LeavePostRoom', postId);
        this._joinedPostRooms.delete(postId);
        console.log('[SignalR] Left post room:', postId);
      }
    } catch (error) {
      console.error('[SignalR] Leave post room error:', error);
    }
  }

  onNewComment(callback) {
    if (!this._handlers['ReceiveComment']) {
      this._handlers['ReceiveComment'] = new Set();
    }
    this._handlers['ReceiveComment'].add(callback);

    if (this.commentConnection?.state === SignalR.HubConnectionState.Connected) {
      this.commentConnection.on('ReceiveComment', callback);
    }
  }

  onReceiveComment(callback) {
    if (!this._handlers['ReceiveComment']) {
      this._handlers['ReceiveComment'] = new Set();
    }
    this._handlers['ReceiveComment'].add(callback);

    if (this.commentConnection?.state === SignalR.HubConnectionState.Connected) {
      this.commentConnection.on('ReceiveComment', callback);
    }
  }

  onCommentUpdated(callback) {
    if (!this._handlers['CommentUpdated']) {
      this._handlers['CommentUpdated'] = new Set();
    }
    this._handlers['CommentUpdated'].add(callback);

    if (this.commentConnection?.state === SignalR.HubConnectionState.Connected) {
      this.commentConnection.on('CommentUpdated', callback);
    }
  }

  onCommentDeleted(callback) {
    if (!this._handlers['CommentDeleted']) {
      this._handlers['CommentDeleted'] = new Set();
    }
    this._handlers['CommentDeleted'].add(callback);

    if (this.commentConnection?.state === SignalR.HubConnectionState.Connected) {
      this.commentConnection.on('CommentDeleted', callback);
    }
  }

  onCommentReplyAdded(callback) {
    if (!this._handlers['CommentReplyAdded']) {
      this._handlers['CommentReplyAdded'] = new Set();
    }
    this._handlers['CommentReplyAdded'].add(callback);

    if (this.commentConnection?.state === SignalR.HubConnectionState.Connected) {
      this.commentConnection.on('CommentReplyAdded', callback);
    }
  }

  onCommentReactionChanged(callback) {
    if (!this._handlers['CommentReactionChanged']) {
      this._handlers['CommentReactionChanged'] = new Set();
    }
    this._handlers['CommentReactionChanged'].add(callback);

    if (this.commentConnection?.state === SignalR.HubConnectionState.Connected) {
      this.commentConnection.on('CommentReactionChanged', callback);
    }
  }

  // NOTIFICATION CONNECTION
  async connectToNotification() {
    if (this.notificationConnection?.state === SignalR.HubConnectionState.Connected) {
      console.log('✅ Notification already connected');
      return this.notificationConnection;
    }

    try {
      this.notificationConnection = this.createConnection(`${API_BASE_URL}/hubs/notifications`);
      await this.notificationConnection.start();
      console.log('✅ Notification connected successfully');
      return this.notificationConnection;
    } catch (error) {
      console.error('❌ Notification connection error:', error);
      throw error;
    }
  }

  onNotification(callback) {
    if (!this._handlers['ReceiveNotification']) {
      this._handlers['ReceiveNotification'] = new Set();
    }
    this._handlers['ReceiveNotification'].add(callback);

    if (this.notificationConnection?.state === SignalR.HubConnectionState.Connected) {
      this.notificationConnection.on('ReceiveNotification', callback);
    }
  }

  // Disconnect all
  async disconnectAll() {
    try {
      if (this.chatConnection) {
        await this.chatConnection.stop();
        this.chatConnection = null;
      }
      if (this.commentConnection) {
        await this.commentConnection.stop();
        this.commentConnection = null;
      }
      if (this.notificationConnection) {
        await this.notificationConnection.stop();
        this.notificationConnection = null;
      }
      this._joinedPostRooms.clear();
      this._joinedChatRooms.clear();
      this._handlers = {};
      console.log('✅ All SignalR connections closed');
    } catch (error) {
      console.error('❌ Error disconnecting:', error);
    }
  }
}

const signalRService = new SignalRService();
export default signalRService;
