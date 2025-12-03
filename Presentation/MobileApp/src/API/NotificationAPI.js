import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_BASE_URL } from "./Api";

/**
 * API Service cho Notifications
 */
class NotificationAPI {
  /**
   * Lấy danh sách thông báo
   * @param {number} skip - Số thông báo bỏ qua (pagination)
   * @param {number} take - Số thông báo lấy
   */
  static async getNotifications(skip = 0, take = 20) {
    try {
      const token = await AsyncStorage.getItem("accessToken");
      if (!token) {
        console.error("[NotificationAPI] No access token found");
        throw new Error("No access token");
      }

      console.log(
        "[NotificationAPI] Fetching notifications with token:",
        token.substring(0, 20) + "..."
      );

      const response = await fetch(
        `${API_BASE_URL}/api/notifications?skip=${skip}&take=${take}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      console.log("[NotificationAPI] Response status:", response.status);
      const responseText = await response.text();
      console.log("[NotificationAPI] Response text:", responseText);

      let result;
      try {
        result = JSON.parse(responseText);
      } catch (e) {
        console.error("[NotificationAPI] Failed to parse JSON:", e);
        throw new Error("Invalid JSON response");
      }

      if (!response.ok) {
        console.error("[NotificationAPI] Error response:", result);
        throw new Error(
          result.error || result.message || "Failed to get notifications"
        );
      }

      return result.data || [];
    } catch (error) {
      console.error("[NotificationAPI] getNotifications error:", error);
      throw error;
    }
  }

  /**
   * Lấy tổng hợp thông báo (số chưa đọc + thông báo gần đây)
   */
  static async getNotificationSummary() {
    try {
      const token = await AsyncStorage.getItem("accessToken");
      if (!token) throw new Error("No access token");

      const response = await fetch(
        `${API_BASE_URL}/api/notifications/summary`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to get notification summary");
      }

      return result.data;
    } catch (error) {
      console.error("[NotificationAPI] getNotificationSummary error:", error);
      throw error;
    }
  }

  /**
   * Lấy danh sách thông báo chưa đọc
   */
  static async getUnreadNotifications() {
    try {
      const token = await AsyncStorage.getItem("accessToken");
      if (!token) throw new Error("No access token");

      const response = await fetch(`${API_BASE_URL}/api/notifications/unread`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to get unread notifications");
      }

      return result.data || [];
    } catch (error) {
      console.error("[NotificationAPI] getUnreadNotifications error:", error);
      throw error;
    }
  }

  /**
   * Lấy số lượng thông báo chưa đọc
   */
  static async getUnreadCount() {
    try {
      const token = await AsyncStorage.getItem("accessToken");
      if (!token) throw new Error("No access token");

      const response = await fetch(
        `${API_BASE_URL}/api/notifications/unread-count`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to get unread count");
      }

      return result.count || 0;
    } catch (error) {
      console.error("[NotificationAPI] getUnreadCount error:", error);
      return 0;
    }
  }

  /**
   * Đánh dấu một thông báo là đã đọc
   * @param {number} notificationId
   */
  static async markAsRead(notificationId) {
    try {
      const token = await AsyncStorage.getItem("accessToken");
      if (!token) throw new Error("No access token");

      const response = await fetch(
        `${API_BASE_URL}/api/notifications/${notificationId}/read`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to mark as read");
      }

      return result;
    } catch (error) {
      console.error("[NotificationAPI] markAsRead error:", error);
      throw error;
    }
  }

  /**
   * Đánh dấu tất cả thông báo là đã đọc
   */
  static async markAllAsRead() {
    try {
      const token = await AsyncStorage.getItem("accessToken");
      if (!token) throw new Error("No access token");

      const response = await fetch(
        `${API_BASE_URL}/api/notifications/read-all`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to mark all as read");
      }

      return result;
    } catch (error) {
      console.error("[NotificationAPI] markAllAsRead error:", error);
      throw error;
    }
  }

  /**
   * Xóa một thông báo
   * @param {number} notificationId
   */
  static async deleteNotification(notificationId) {
    try {
      const token = await AsyncStorage.getItem("accessToken");
      if (!token) throw new Error("No access token");

      const response = await fetch(
        `${API_BASE_URL}/api/notifications/${notificationId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to delete notification");
      }

      return result;
    } catch (error) {
      console.error("[NotificationAPI] deleteNotification error:", error);
      throw error;
    }
  }
}

export default NotificationAPI;
