import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Modal,
  FlatList,
  TextInput,
  Alert,
  ActivityIndicator,
  Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { getFollowing, getFollowers, createShare } from "../API/Api";
import MessageAPI from "../API/MessageAPI";

export default function SharePostModal({
  visible,
  onClose,
  post,
  onShareSuccess,
}) {
  const [loading, setLoading] = useState(false);
  const [friends, setFriends] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [sharedFriends, setSharedFriends] = useState(new Set()); // Track đã chia sẻ cho ai
  const [sendingFriends, setSendingFriends] = useState(new Set()); // Track đang gửi cho ai
  const spinAnimations = useRef({}); // Store animations cho từng friend

  useEffect(() => {
    if (visible) {
      loadFriends();
      setSharedFriends(new Set()); // Reset khi mở modal
      setSendingFriends(new Set());
      spinAnimations.current = {}; // Reset animations
    }
  }, [visible]);

  const loadFriends = async () => {
    try {
      setLoading(true);
      const [following, followers] = await Promise.all([
        getFollowing().catch(() => []),
        getFollowers().catch(() => []),
      ]);

      // Chỉ lấy những người mà mình follow và họ cũng follow mình lại (mutual friends)
      const followingIds = new Set();
      const followingMap = new Map();

      // Tạo map của những người mình đã follow
      (Array.isArray(following) ? following : []).forEach((u) => {
        if (!u) return;
        const id = u.id ?? u.userId ?? u.user_id ?? null;
        if (id != null) {
          followingIds.add(Number(id));
          followingMap.set(Number(id), u);
        }
      });

      // Lọc những người follow mình và mình cũng đã follow họ
      const mutualFriends = [];
      (Array.isArray(followers) ? followers : []).forEach((u) => {
        if (!u) return;
        const id = u.id ?? u.userId ?? u.user_id ?? null;
        const userId = Number(id);

        // Chỉ thêm vào danh sách nếu người này có trong cả following và followers
        if (id != null && followingIds.has(userId)) {
          const userData = followingMap.get(userId) || u;
          const username =
            userData.username ??
            userData.userName ??
            userData.user_name ??
            null;
          const fullName =
            userData.fullName ??
            userData.full_name ??
            userData.fullname ??
            null;
          const avatarUrl =
            userData.avatarUrl ??
            userData.avatar_url ??
            userData.avatar ??
            userData.AvatarUrl ??
            null;

          mutualFriends.push({
            id: userId,
            username: username || String(userId),
            fullName,
            // Đảm bảo avatarUrl không rỗng và có giá trị hợp lệ
            avatarUrl: avatarUrl && avatarUrl.trim() !== "" ? avatarUrl : null,
          });
        }
      });

      console.log(
        `[SharePostModal] Found ${mutualFriends.length} mutual friends`
      );
      setFriends(mutualFriends);
    } catch (error) {
      console.warn("Load friends error:", error);
      Alert.alert("Lỗi", "Không thể tải danh sách bạn bè");
    } finally {
      setLoading(false);
    }
  };

  const handleShareToMessenger = async (friendId) => {
    try {
      // Tạo animation nếu chưa có
      if (!spinAnimations.current[friendId]) {
        spinAnimations.current[friendId] = new Animated.Value(0);
      }

      const spinValue = spinAnimations.current[friendId];

      // Đánh dấu đang gửi
      setSendingFriends((prev) => new Set([...prev, friendId]));

      // Bắt đầu animation xoay
      const spinAnimation = Animated.loop(
        Animated.timing(spinValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        })
      );
      spinAnimation.start();

      // Lấy thông tin friend
      const friend = friends.find((f) => f.id === friendId);

      // Lấy thông tin media từ post
      const firstMedia =
        post?.media && post.media.length > 0 ? post.media[0] : null;
      const mediaUrl = firstMedia?.url || "";
      const mediaType = firstMedia?.type || "Image";

      // Tạo metadata của bài viết để gửi kèm
      const sharedPostData = {
        postId: post?.id,
        authorName: post?.user?.username || "Người dùng",
        authorAvatar: post?.user?.avatarUrl || "",
        content: post?.content || "",
        mediaUrl: mediaUrl,
        mediaType: mediaType,
        createdAt: post?.createdAt || new Date().toISOString(),
      };

      console.log("[SharePostModal] Sharing post data:", sharedPostData);
      console.log("[SharePostModal] Media URL:", mediaUrl);

      // Gửi tin nhắn với prefix đặc biệt để nhận diện shared post
      const messageContent = "SHARED_POST:" + JSON.stringify(sharedPostData);

      // Gửi tin nhắn qua MessageAPI với type Text
      await MessageAPI.sendMessage(
        friendId,
        messageContent,
        "Text", // Dùng Text type vì backend chưa hỗ trợ SharedPost
        sharedPostData.mediaUrl,
        null
      );

      // Gọi API để lưu lượt chia sẻ vào database
      try {
        await createShare({
          postId: post.id,
          caption: "",
          privacy: "public",
        });
        console.log("[SharePostModal] Share recorded in database");

        // Cập nhật UI ngay lập tức (Optimistic UI)
        if (onShareSuccess) {
          onShareSuccess(post.id);
        }
      } catch (shareError) {
        console.warn("[SharePostModal] Failed to record share:", shareError);
        // Vẫn tiếp tục vì tin nhắn đã gửi thành công
      }

      // Dừng animation và đánh dấu đã chia sẻ thành công
      spinAnimation.stop();
      spinValue.setValue(0);
      setSendingFriends((prev) => {
        const newSet = new Set(prev);
        newSet.delete(friendId);
        return newSet;
      });
      setSharedFriends((prev) => new Set([...prev, friendId]));
    } catch (error) {
      console.error("Share to messenger error:", error);
      const spinValue = spinAnimations.current[friendId];
      if (spinValue) {
        spinValue.setValue(0);
      }
      setSendingFriends((prev) => {
        const newSet = new Set(prev);
        newSet.delete(friendId);
        return newSet;
      });
      Alert.alert("Lỗi", error.message || "Không thể gửi tin nhắn");
    }
  };

  const filteredFriends = friends.filter(
    (friend) =>
      friend.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      friend.fullName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderFriend = ({ item }) => {
    const isShared = sharedFriends.has(item.id);
    const isSending = sendingFriends.has(item.id);

    // Lấy hoặc tạo animation value
    if (!spinAnimations.current[item.id]) {
      spinAnimations.current[item.id] = new Animated.Value(0);
    }

    const spin = spinAnimations.current[item.id].interpolate({
      inputRange: [0, 1],
      outputRange: ["0deg", "360deg"],
    });

    return (
      <TouchableOpacity
        style={styles.friendItem}
        onPress={() =>
          !isShared && !isSending && handleShareToMessenger(item.id)
        }
        disabled={isShared || isSending}
      >
        <Image
          source={{
            uri:
              item.avatarUrl && item.avatarUrl.trim() !== ""
                ? item.avatarUrl
                : "https://ui-avatars.com/api/?name=" +
                  encodeURIComponent(item.username || "User") +
                  "&background=0095F6&color=fff&size=200",
          }}
          style={styles.friendAvatar}
          onError={(e) => {
            console.warn(
              "[SharePostModal] Failed to load avatar for:",
              item.username,
              item.avatarUrl
            );
          }}
        />
        <View style={styles.friendInfo}>
          <Text style={styles.friendName}>
            {item.fullName || item.username}
          </Text>
          <Text style={styles.friendUsername}>@{item.username}</Text>
        </View>
        <View style={[styles.sendButton, isShared && styles.sentButton]}>
          {isShared ? (
            <Ionicons name="checkmark" size={20} color="#10B981" />
          ) : (
            <Animated.View style={{ transform: [{ rotate: spin }] }}>
              <Ionicons name="send" size={20} color="#0095F6" />
            </Animated.View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={28} color="#000" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Chia sẻ</Text>
            <View style={styles.placeholder} />
          </View>

          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#999" />
            <TextInput
              style={styles.searchInput}
              placeholder="Tìm kiếm..."
              placeholderTextColor="#999"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          {/* Friends List */}
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#0095F6" />
              <Text style={styles.loadingText}>Đang tải...</Text>
            </View>
          ) : (
            <FlatList
              data={filteredFriends}
              keyExtractor={(item) => String(item.id)}
              renderItem={renderFriend}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Ionicons name="people-outline" size={64} color="#ccc" />
                  <Text style={styles.emptyText}>
                    {searchQuery
                      ? "Không tìm thấy bạn bè"
                      : "Chưa có bạn bè nào"}
                  </Text>
                </View>
              }
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: "50%",
    paddingBottom: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: "#DBDBDB",
  },
  closeButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#000",
  },
  placeholder: {
    width: 40,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    margin: 16,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#F0F0F0",
    borderRadius: 10,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#000",
  },
  friendItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: "#F0F0F0",
  },
  friendAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  friendInfo: {
    flex: 1,
  },
  friendName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#000",
    marginBottom: 2,
  },
  friendUsername: {
    fontSize: 13,
    color: "#666",
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F0F0F0",
    justifyContent: "center",
    alignItems: "center",
  },
  sentButton: {
    backgroundColor: "#D1FAE5",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#666",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: "#999",
  },
});
