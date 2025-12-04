import * as SignalR from "@microsoft/signalr";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_BASE_URL } from "../API/Api";

/**
 * Service để kết nối SignalR Hub cho Notifications
 */
class NotificationSignalRService {
  constructor() {
    this.connection = null;
    this.isConnecting = false;
    this.handlers = new Map();
    this.reconnectHandlers = new Set();
  }

  /**
   * Lấy token từ AsyncStorage
   */
  async getToken() {
    try {
      return await AsyncStorage.getItem("accessToken");
    } catch (error) {
      console.error("[NotificationSignalR] Error getting token:", error);
      return null;
    }
  }

  /**
   * Kết nối đến Notification Hub
   */
  async connect() {
    if (this.connection?.state === SignalR.HubConnectionState.Connected) {
      console.log("✅ [NotificationSignalR] Already connected");
      return this.connection;
    }

    if (this.isConnecting) {
      console.log("⏳ [NotificationSignalR] Connection in progress...");
      return null;
    }

    try {
      this.isConnecting = true;
      const token = await this.getToken();

      if (!token) {
        console.error("❌ [NotificationSignalR] No token available");
        this.isConnecting = false;
        return null;
      }

      const hubUrl = `${API_BASE_URL}/hubs/notifications`;
      console.log(`🔌 [NotificationSignalR] Connecting to: ${hubUrl}`);

      this.connection = new SignalR.HubConnectionBuilder()
        .withUrl(hubUrl, {
          accessTokenFactory: () => token,
        })
        .withAutomaticReconnect({
          nextRetryDelayInMilliseconds: (retryContext) => {
            if (retryContext.elapsedMilliseconds < 60000) {
              return Math.random() * 10000;
            }
            return null;
          },
        })
        .configureLogging(SignalR.LogLevel.Information)
        .build();

      // Setup reconnection handlers
      this.connection.onreconnecting((error) => {
        console.log("🔄 [NotificationSignalR] Reconnecting...", error);
      });

      this.connection.onreconnected((connectionId) => {
        console.log("✅ [NotificationSignalR] Reconnected:", connectionId);
        this.reconnectHandlers.forEach((handler) => handler());
      });

      this.connection.onclose((error) => {
        console.log("❌ [NotificationSignalR] Connection closed", error);
        this.isConnecting = false;
      });

      // Reattach all registered handlers
      this.handlers.forEach((callbacks, eventName) => {
        callbacks.forEach((callback) => {
          this.connection.on(eventName, callback);
        });
      });

      await this.connection.start();
      console.log("✅ [NotificationSignalR] Connected successfully");
      this.isConnecting = false;

      return this.connection;
    } catch (error) {
      console.error("❌ [NotificationSignalR] Connection failed:", error);
      this.isConnecting = false;
      this.connection = null;
      return null;
    }
  }

  /**
   * Ngắt kết nối
   */
  async disconnect() {
    try {
      if (this.connection) {
        await this.connection.stop();
        this.connection = null;
        console.log("🔌 [NotificationSignalR] Disconnected");
      }
    } catch (error) {
      console.error("[NotificationSignalR] Disconnect error:", error);
    }
  }

  /**
   * Đăng ký handler cho event
   */
  on(eventName, callback) {
    if (!this.handlers.has(eventName)) {
      this.handlers.set(eventName, new Set());
    }
    this.handlers.get(eventName).add(callback);

    // Nếu đã kết nối, attach ngay
    if (this.connection?.state === SignalR.HubConnectionState.Connected) {
      this.connection.on(eventName, callback);
    }
  }

  /**
   * Hủy đăng ký handler
   */
  off(eventName, callback) {
    if (this.handlers.has(eventName)) {
      this.handlers.get(eventName).delete(callback);
      if (this.handlers.get(eventName).size === 0) {
        this.handlers.delete(eventName);
      }
    }

    try {
      if (this.connection) {
        this.connection.off(eventName, callback);
      }
    } catch (error) {
      console.error("[NotificationSignalR] off error:", error);
    }
  }

  /**
   * Đăng ký handler được gọi khi reconnect
   */
  onReconnect(handler) {
    this.reconnectHandlers.add(handler);
  }

  /**
   * Lắng nghe thông báo mới
   */
  onReceiveNotification(callback) {
    this.on("ReceiveNotification", callback);
  }

  /**
   * Lắng nghe cập nhật comment
   */
  onReceiveCommentUpdate(callback) {
    this.on("ReceiveCommentUpdate", callback);
  }

  /**
   * Lắng nghe cập nhật reaction
   */
  onReceiveReactionUpdate(callback) {
    this.on("ReceiveReactionUpdate", callback);
  }

  /**
   * Lắng nghe cập nhật share
   */
  onReceiveShareUpdate(callback) {
    this.on("ReceiveShareUpdate", callback);
  }

  /**
   * Lắng nghe thông báo tin nhắn mới
   */
  onReceiveMessageNotification(callback) {
    this.on("ReceiveMessageNotification", callback);
  }
}

// Export singleton instance
const notificationSignalRService = new NotificationSignalRService();
export default notificationSignalRService;
