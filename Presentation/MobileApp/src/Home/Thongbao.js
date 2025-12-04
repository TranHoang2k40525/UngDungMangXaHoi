import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { Swipeable } from "react-native-gesture-handler";
import { Ionicons } from "@expo/vector-icons";
import NotificationAPI from "../API/NotificationAPI";
import notificationSignalRService from "../ServicesSingalR/notificationService";
import { API_BASE_URL, getPostById } from "../API/Api";

/**
 * Component hiển thị từng notification item
 */
const NotificationItem = ({
  notification,
  onPress,
  onMarkAsRead,
  onDelete,
}) => {
  const swipeableRef = useRef(null);

  const getNotificationIcon = (type, reactionType) => {
    switch (type) {
      case 1: // Reaction - sử dụng reactionType để hiển thị đúng emoji
        if (reactionType) {
          switch (reactionType) {
            case 1:
              return "❤️"; // Like
            case 2:
              return "😍"; // Love
            case 3:
              return "😂"; // Haha
            case 4:
              return "😮"; // Wow
            case 5:
              return "😢"; // Sad
            case 6:
              return "😠"; // Angry
            default:
              return "❤️";
          }
        }
        return "❤️"; // Default nếu không có reactionType
      case 2:
        return "🔄"; // Share
      case 3:
        return "💬"; // Comment
      case 4:
        return "👤"; // Follow
      case 5:
        return "@"; // Mention
      case 6:
        return "💬"; // CommentReply
      case 7:
        return "✉️"; // Message
      case 8:
        return "👥"; // GroupMessage
      default:
        return "🔔";
    }
  };

  const formatTime = (dateString) => {
    const now = new Date();
    const notifDate = new Date(dateString);
    const diffMs = now - notifDate;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Vừa xong";
    if (diffMins < 60) return `${diffMins} phút trước`;
    if (diffHours < 24) return `${diffHours} giờ trước`;
    if (diffDays < 7) return `${diffDays} ngày trước`;

    return notifDate.toLocaleDateString("vi-VN");
  };

  const avatarUrl = notification.senderAvatar
    ? `${API_BASE_URL}${notification.senderAvatar}`
    : "https://i.pravatar.cc/150?img=8";

  // Render action khi swipe từ phải qua trái
  const renderRightActions = (progress, dragX) => {
    const scale = dragX.interpolate({
      inputRange: [-100, 0],
      outputRange: [1, 0],
      extrapolate: "clamp",
    });

    return (
      <TouchableOpacity
        style={styles.deleteAction}
        onPress={() => {
          swipeableRef.current?.close();
          onDelete(notification.notificationId);
        }}
      >
        <Animated.View style={{ transform: [{ scale }] }}>
          <Ionicons name="trash-outline" size={24} color="#FFFFFF" />
        </Animated.View>
      </TouchableOpacity>
    );
  };

  return (
    <Swipeable
      ref={swipeableRef}
      renderRightActions={renderRightActions}
      overshootRight={false}
      friction={2}
    >
      <TouchableOpacity
        style={[
          styles.notificationItem,
          !notification.isRead && styles.unreadNotification,
        ]}
        onPress={() => onPress(notification)}
        onLongPress={() => onMarkAsRead(notification.notificationId)}
      >
        <Image source={{ uri: avatarUrl }} style={styles.notificationAvatar} />
        <View style={styles.notificationContent}>
          <Text style={styles.notificationMessage}>
            <Text style={styles.notificationIcon}>
              {getNotificationIcon(
                notification.type,
                notification.reactionType
              )}{" "}
            </Text>
            {notification.content}
          </Text>
          <Text style={styles.notificationTime}>
            {formatTime(notification.createdAt)}
          </Text>
        </View>
        {!notification.isRead && <View style={styles.unreadDot} />}
      </TouchableOpacity>
    </Swipeable>
  );
};

export default function Thongbao() {
  const navigation = useNavigation();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  /**
   * Load danh sách thông báo
   */
  const loadNotifications = async () => {
    try {
      const data = await NotificationAPI.getNotifications(0, 50);
      setNotifications(data);

      // Lấy số lượng chưa đọc
      const count = await NotificationAPI.getUnreadCount();
      setUnreadCount(count);
    } catch (error) {
      console.error("[Thongbao] Load notifications error:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  /**
   * Kết nối SignalR và lắng nghe thông báo real-time
   */
  const connectSignalR = async () => {
    try {
      await notificationSignalRService.connect();

      // Lắng nghe thông báo mới
      notificationSignalRService.onReceiveNotification((notification) => {
        console.log("[Thongbao] Received new notification:", notification);

        // Thêm vào đầu danh sách
        setNotifications((prev) => [notification, ...prev]);
        setUnreadCount((prev) => prev + 1);
      });
    } catch (error) {
      console.error("[Thongbao] SignalR connection error:", error);
    }
  };

  /**
   * Xử lý khi click vào notification
   */
  const handleNotificationPress = async (notification) => {
    try {
      console.log("[Thongbao] Notification pressed:", {
        type: notification.type,
        conversationId: notification.conversationId,
        messageId: notification.messageId,
        senderId: notification.senderId,
        content: notification.content,
        fullNotification: notification,
      });

      // Đánh dấu đã đọc nếu chưa đọc
      if (!notification.isRead) {
        await NotificationAPI.markAsRead(notification.notificationId);
        setNotifications((prev) =>
          prev.map((n) =>
            n.notificationId === notification.notificationId
              ? { ...n, isRead: true }
              : n
          )
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }

      // Navigate dựa vào loại thông báo
      switch (notification.type) {
        case 1: // Reaction
        case 2: // Share
          if (notification.postId) {
            // Load post data và navigate to post detail
            try {
              const postData = await getPostById(notification.postId);
              navigation.navigate("PostDetail", {
                singlePost: postData,
                openComments: false,
              });
            } catch (error) {
              console.error("[Thongbao] Failed to load post:", error);
              Alert.alert("Lỗi", "Không thể tải bài viết");
            }
          }
          break;
        case 5: // Mention - Mở comment modal để thấy chỗ được nhắc
        case 3: // Comment
        case 6: // CommentReply
          if (notification.postId) {
            // Load post data và navigate to post detail với comment modal
            try {
              console.log(
                "[Thongbao] Navigating to PostDetail from Thongbao screen"
              );
              const postData = await getPostById(notification.postId);
              navigation.navigate("PostDetail", {
                singlePost: postData,
                openComments: true,
                from: "Thongbao", // Track màn hình trước
                highlightCommentId: notification.commentId, // Highlight comment có mention
              });
            } catch (error) {
              console.error("[Thongbao] Failed to load post:", error);
              Alert.alert("Lỗi", "Không thể tải bài viết");
            }
          }
          break;
        case 4: // Follow
          if (notification.senderId) {
            navigation.navigate("UserProfilePublic", {
              userId: notification.senderId,
            });
          }
          break;
        case 7: // Message - Mở chat với người gửi
          if (notification.senderId) {
            navigation.navigate("Doanchat", {
              userId: notification.senderId,
              userName: notification.senderUsername || "User",
              userAvatar: notification.senderAvatar,
              messageId: notification.messageId, // Scroll đến tin nhắn cụ thể nếu có
            });
          }
          break;
        case 8: // GroupMessage - Mở nhóm chat cụ thể
          if (notification.conversationId) {
            // Lấy tên nhóm từ content notification (có dạng: "username trong nhóm \"GroupName\": message")
            const groupNameMatch = notification.content.match(
              /trong nhóm "([^"]+)":/
            );
            const groupName = groupNameMatch ? groupNameMatch[1] : "Nhóm chat";

            console.log("[Thongbao] Navigating to GroupChat:", {
              conversationId: notification.conversationId,
              groupName: groupName,
              messageId: notification.messageId,
              scrollToMessageId: notification.messageId,
            });

            navigation.navigate("GroupChat", {
              conversationId: notification.conversationId,
              groupName: groupName,
              scrollToMessageId: notification.messageId, // Scroll đến tin nhắn cụ thể nếu có
            });
          } else {
            console.log(
              "[Thongbao] No conversationId, navigating to Messenger"
            );
            // Fallback nếu không có conversationId
            navigation.navigate("Messenger");
          }
          break;
      }
    } catch (error) {
      console.error("[Thongbao] Handle notification error:", error);
    }
  };

  /**
   * Đánh dấu một thông báo đã đọc (long press)
   */
  const handleMarkAsRead = async (notificationId) => {
    try {
      await NotificationAPI.markAsRead(notificationId);
      setNotifications((prev) =>
        prev.map((n) =>
          n.notificationId === notificationId ? { ...n, isRead: true } : n
        )
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error("[Thongbao] Mark as read error:", error);
    }
  };

  /**
   * Đánh dấu tất cả đã đọc
   */
  const handleMarkAllAsRead = async () => {
    try {
      await NotificationAPI.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error("[Thongbao] Mark all as read error:", error);
      Alert.alert("Lỗi", "Không thể đánh dấu tất cả đã đọc");
    }
  };

  /**
   * Xóa thông báo
   */
  const handleDeleteNotification = async (notificationId) => {
    Alert.alert("Xóa thông báo", "Bạn có chắc muốn xóa thông báo này?", [
      { text: "Hủy", style: "cancel" },
      {
        text: "Xóa",
        style: "destructive",
        onPress: async () => {
          try {
            await NotificationAPI.deleteNotification(notificationId);
            setNotifications((prev) =>
              prev.filter((n) => n.notificationId !== notificationId)
            );
            // Giảm unread count nếu notification chưa đọc
            const notification = notifications.find(
              (n) => n.notificationId === notificationId
            );
            if (notification && !notification.isRead) {
              setUnreadCount((prev) => Math.max(0, prev - 1));
            }
          } catch (error) {
            console.error("[Thongbao] Delete notification error:", error);
            Alert.alert("Lỗi", "Không thể xóa thông báo");
          }
        },
      },
    ]);
  };

  /**
   * Refresh danh sách
   */
  const handleRefresh = () => {
    setRefreshing(true);
    loadNotifications();
  };

  // Load notifications khi component mount
  useEffect(() => {
    loadNotifications();
    connectSignalR();

    return () => {
      // Cleanup: disconnect SignalR khi unmount
      // notificationSignalRService.disconnect();
    };
  }, []);

  // Reload khi màn hình được focus
  useFocusEffect(
    useCallback(() => {
      loadNotifications();
    }, [])
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => navigation.goBack()}
        >
          <Image
            source={require("../Assets/icons8-back-24.png")}
            style={[styles.cameraIconImage, { width: 29, height: 29 }]}
          />
        </TouchableOpacity>

        <Text style={styles.logo}>Thông báo</Text>

        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.headerIconWrapper}
            onPress={handleMarkAllAsRead}
          >
            <Text style={styles.markAllText}>Đánh dấu đã đọc</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.navItem}
            onPress={() => navigation.navigate("Messenger")}
          >
            <Image
              source={require("../Assets/icons8-facebook-messenger-50.png")}
              style={[styles.homeIconImage, { width: 30, height: 30 }]}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Unread Count Badge */}
      {unreadCount > 0 && (
        <View style={styles.unreadBanner}>
          <Text style={styles.unreadBannerText}>
            {unreadCount} thông báo chưa đọc
          </Text>
        </View>
      )}

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0095F6" />
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={["#0095F6"]}
            />
          }
        >
          {/* Notifications List */}
          <View style={styles.notificationsContainer}>
            {notifications.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>Chưa có thông báo</Text>
              </View>
            ) : (
              notifications.map((item) => (
                <NotificationItem
                  key={item.notificationId}
                  notification={item}
                  onPress={handleNotificationPress}
                  onMarkAsRead={handleMarkAsRead}
                  onDelete={handleDeleteNotification}
                />
              ))
            )}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: "#DBDBDB",
  },
  logo: {
    fontSize: 24,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  headerRight: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },
  headerIconWrapper: {
    paddingHorizontal: 8,
  },
  markAllText: {
    fontSize: 12,
    color: "#0095F6",
    fontWeight: "600",
  },
  cameraIconImage: {
    width: 29,
    height: 29,
  },
  homeIconImage: {
    width: 30,
    height: 30,
    borderRadius: 0,
  },
  unreadBanner: {
    backgroundColor: "#E3F2FD",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#BBDEFB",
  },
  unreadBannerText: {
    fontSize: 13,
    color: "#1976D2",
    fontWeight: "600",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  notificationsContainer: {
    paddingVertical: 8,
  },
  notificationItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: "#EFEFEF",
    backgroundColor: "#FFFFFF",
  },
  unreadNotification: {
    backgroundColor: "#F0F8FF",
  },
  notificationAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
    backgroundColor: "#E1E8ED",
  },
  notificationContent: {
    flex: 1,
    paddingRight: 8,
  },
  notificationMessage: {
    fontSize: 14,
    color: "#262626",
    lineHeight: 18,
  },
  notificationIcon: {
    fontSize: 16,
  },
  notificationTime: {
    fontSize: 12,
    color: "#8E8E8E",
    marginTop: 4,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#0095F6",
  },
  emptyContainer: {
    paddingVertical: 60,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 16,
    color: "#8E8E8E",
  },
  bottomNav: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingVertical: 10,
    borderTopWidth: 0.5,
    borderTopColor: "#DBDBDB",
    backgroundColor: "#FFFFFF",
  },
  navItem: {
    padding: 6,
    justifyContent: "center",
    alignItems: "center",
  },
  searchIconWrapper: {
    width: 26,
    height: 26,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  searchCircle: {
    width: 18,
    height: 18,
    borderWidth: 2.5,
    borderColor: "#000",
    borderRadius: 9,
    position: "absolute",
    top: 2,
    left: 2,
  },
  searchHandle: {
    width: 8,
    height: 2.5,
    backgroundColor: "#000",
    position: "absolute",
    bottom: 2,
    right: 2,
    transform: [{ rotate: "45deg" }],
    borderRadius: 2,
  },
  addIconWrapper: {
    width: 26,
    height: 26,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  addSquare: {
    width: 24,
    height: 24,
    borderWidth: 2.5,
    borderColor: "#000",
    borderRadius: 3,
  },
  addHorizontal: {
    width: 12,
    height: 2.5,
    backgroundColor: "#000",
    position: "absolute",
    borderRadius: 2,
  },
  addVertical: {
    width: 2.5,
    height: 12,
    backgroundColor: "#000",
    position: "absolute",
    borderRadius: 2,
  },
  reelsIconWrapper: {
    width: 26,
    height: 26,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  reelsSquare: {
    width: 24,
    height: 24,
    borderWidth: 2.5,
    borderColor: "#000",
    borderRadius: 4,
  },
  reelsPlay: {
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderTopWidth: 5,
    borderBottomWidth: 5,
    borderLeftColor: "#000",
    borderTopColor: "transparent",
    borderBottomColor: "transparent",
    position: "absolute",
    left: 10,
  },
  profileIcon: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: "#000",
  },
  deleteAction: {
    backgroundColor: "#FF3B30",
    justifyContent: "center",
    alignItems: "center",
    width: 80,
    height: "100%",
  },
});
