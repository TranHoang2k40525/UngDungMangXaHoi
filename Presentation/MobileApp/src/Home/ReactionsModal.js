import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Image,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { getReactionsByPost, API_BASE_URL } from "../API/Api";

// Helper function to get emoji from reaction type
const getReactionEmoji = (reactionType) => {
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
};

const getReactionName = (reactionType) => {
  switch (reactionType) {
    case 1:
      return "Thích";
    case 2:
      return "Yêu thích";
    case 3:
      return "Haha";
    case 4:
      return "Wow";
    case 5:
      return "Buồn";
    case 6:
      return "Phẫn nộ";
    default:
      return "Thích";
  }
};

const ReactionsModal = ({ visible, onClose, postId, reactionCounts = [] }) => {
  const [selectedTab, setSelectedTab] = useState("all");
  const [reactions, setReactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const navigation = useNavigation();

  useEffect(() => {
    if (visible && postId) {
      loadReactions();
    }
  }, [visible, postId, selectedTab]);

  const loadReactions = async () => {
    try {
      setLoading(true);
      const response = await getReactionsByPost(postId);
      const data = response?.data || response || [];

      console.log("[ReactionsModal] Loaded reactions:", data);

      let filtered = data;
      if (selectedTab !== "all") {
        const tabType = parseInt(selectedTab);
        filtered = data.filter((r) => {
          const rType = r.ReactionType || r.reactionType;
          return rType === tabType;
        });
      }

      setReactions(filtered);
    } catch (error) {
      console.error("Error loading reactions:", error);
      setReactions([]);
    } finally {
      setLoading(false);
    }
  };

  const getTotalCount = () => {
    return reactionCounts.reduce((sum, r) => sum + r.count, 0);
  };

  const getCountForType = (type) => {
    if (type === "all") return getTotalCount();
    const found = reactionCounts.find((r) => r.reactionType === type);
    return found ? found.count : 0;
  };

  // Build tabs: All + each reaction type that has count > 0
  const tabs = [
    { id: "all", label: "Tất cả", emoji: null, count: getTotalCount() },
    ...reactionCounts
      .filter((r) => r.count > 0)
      .sort((a, b) => b.count - a.count)
      .map((r) => ({
        id: r.reactionType.toString(),
        label: getReactionName(r.reactionType),
        emoji: getReactionEmoji(r.reactionType),
        count: r.count,
      })),
  ];

  const renderReactionItem = ({ item }) => {
    // Backend returns: { reactionId, postId, userId, username, avatarUrl, reactionType, createdAt }
    // Note: all lowercase from API

    const userId = item.userId || item.UserId || item.User?.user_id;
    const userName =
      item.username ||
      item.Username ||
      item.userName ||
      item.User?.username?.Value ||
      item.User?.username;
    const userAvatar =
      item.avatarUrl ||
      item.AvatarUrl ||
      item.userAvatar ||
      item.User?.avatar_url?.Value ||
      item.User?.avatar_url;
    const reactionType =
      item.reactionType || item.ReactionType || item.reaction_type;

    // Debug log để kiểm tra dữ liệu
    console.log("[ReactionsModal] Render item:", {
      raw: item,
      userId,
      userName,
      userAvatar,
      reactionType,
    });

    const handleUserPress = () => {
      onClose(); // Đóng modal trước
      navigation.navigate("Profile", { userId: userId });
    };

    // Build full avatar URL if it's a relative path
    const fullAvatarUrl = userAvatar?.startsWith("http")
      ? userAvatar
      : userAvatar
      ? `${API_BASE_URL}${userAvatar}`
      : null;

    console.log("[ReactionsModal] Avatar URL:", {
      userAvatar,
      fullAvatarUrl,
      API_BASE_URL,
    });

    return (
      <TouchableOpacity
        style={styles.reactionItem}
        onPress={handleUserPress}
        activeOpacity={0.7}
      >
        <Image
          source={
            fullAvatarUrl
              ? { uri: fullAvatarUrl }
              : require("../Assets/trai.png")
          }
          style={styles.avatar}
          onError={(e) =>
            console.log("[ReactionsModal] Image load error:", e.nativeEvent)
          }
        />
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{userName || "Unknown"}</Text>
        </View>
        <Text style={styles.reactionEmoji}>
          {getReactionEmoji(reactionType)}
        </Text>
      </TouchableOpacity>
    );
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        />

        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>{getTotalCount()} lượt thích</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={28} color="#262626" />
            </TouchableOpacity>
          </View>

          {/* Tabs */}
          <View style={styles.tabsContainer}>
            <FlatList
              data={tabs}
              keyExtractor={(item) => item.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.tabsList}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.tab,
                    selectedTab === item.id && styles.tabActive,
                  ]}
                  onPress={() => setSelectedTab(item.id)}
                >
                  {item.emoji && (
                    <Text style={styles.tabEmoji}>{item.emoji}</Text>
                  )}
                  <Text
                    style={[
                      styles.tabText,
                      selectedTab === item.id && styles.tabTextActive,
                    ]}
                  >
                    {item.label}
                  </Text>
                  <Text
                    style={[
                      styles.tabCount,
                      selectedTab === item.id && styles.tabCountActive,
                    ]}
                  >
                    {item.count}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>

          {/* Reactions List */}
          <View style={styles.listContainer}>
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#0095f6" />
              </View>
            ) : reactions.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>Chưa có lượt thích nào</Text>
              </View>
            ) : (
              <FlatList
                data={reactions}
                keyExtractor={(item, index) =>
                  `${item.UserId || item.userId}-${
                    item.ReactionType || item.reactionType
                  }-${index}`
                }
                renderItem={renderReactionItem}
                showsVerticalScrollIndicator={false}
              />
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  container: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "80%",
    minHeight: "50%",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#efefef",
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#262626",
  },
  closeButton: {
    position: "absolute",
    right: 16,
    padding: 4,
  },
  tabsContainer: {
    borderBottomWidth: 1,
    borderBottomColor: "#efefef",
    paddingVertical: 8,
  },
  tabsList: {
    paddingHorizontal: 12,
  },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 4,
    borderRadius: 20,
    backgroundColor: "#f0f0f0",
    gap: 4,
  },
  tabActive: {
    backgroundColor: "#e7f3ff",
  },
  tabEmoji: {
    fontSize: 18,
  },
  tabText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#666",
  },
  tabTextActive: {
    color: "#0095f6",
    fontWeight: "600",
  },
  tabCount: {
    fontSize: 12,
    color: "#999",
    marginLeft: 2,
  },
  tabCountActive: {
    color: "#0095f6",
    fontWeight: "600",
  },
  listContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 15,
    color: "#999",
  },
  reactionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f5f5f5",
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#f0f0f0",
  },
  userInfo: {
    flex: 1,
    marginLeft: 12,
  },
  userName: {
    fontSize: 15,
    fontWeight: "500",
    color: "#262626",
  },
  reactionEmoji: {
    fontSize: 24,
    marginLeft: 8,
  },
});

export default ReactionsModal;
