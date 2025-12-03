import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  FlatList,
  Image,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { API_BASE_URL } from "../API/Api";
import AsyncStorage from "@react-native-async-storage/async-storage";

const REACTION_TYPES = [
  { type: null, label: "Tất cả" },
  { type: 1, emoji: "❤️", label: "Thích" },
  { type: 2, emoji: "😍", label: "Yêu thích" },
  { type: 3, emoji: "😂", label: "Haha" },
  { type: 4, emoji: "😮", label: "Wow" },
  { type: 5, emoji: "😢", label: "Buồn" },
  { type: 6, emoji: "😠", label: "Phẫn nộ" },
];

const getReactionEmoji = (reactionType) => {
  switch (reactionType) {
    case 1:
      return "❤️";
    case 2:
      return "😍";
    case 3:
      return "😂";
    case 4:
      return "😮";
    case 5:
      return "😢";
    case 6:
      return "😠";
    default:
      return "❤️";
  }
};

const ReactionsListModal = ({ visible, onClose, postId }) => {
  const navigation = useNavigation();
  const [reactions, setReactions] = useState([]);
  const [filteredReactions, setFilteredReactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedTab, setSelectedTab] = useState(null); // null = Tất cả
  const [reactionCounts, setReactionCounts] = useState({});
  const [currentUserId, setCurrentUserId] = useState(null);

  useEffect(() => {
    if (visible && postId) {
      loadReactions();
      loadCurrentUserId();
    }
  }, [visible, postId]);

  useEffect(() => {
    filterReactions();
  }, [selectedTab, reactions]);

  const loadCurrentUserId = async () => {
    try {
      const userId = await AsyncStorage.getItem("userId");
      setCurrentUserId(userId ? parseInt(userId) : null);
    } catch (error) {
      console.error("Error loading current user ID:", error);
    }
  };

  const loadReactions = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem("token");
      const response = await fetch(
        `${API_BASE_URL}/api/reactions/post/${postId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        }
      );

      const result = await response.json();
      console.log("[ReactionsListModal] API response:", result);

      if (result.data && Array.isArray(result.data)) {
        // Format avatar URLs
        const formattedReactions = result.data.map((r) => ({
          ...r,
          avatarUrl: r.avatarUrl
            ? r.avatarUrl.startsWith("http")
              ? r.avatarUrl
              : `${API_BASE_URL}${r.avatarUrl}`
            : null,
        }));

        console.log(
          "[ReactionsListModal] Formatted reactions:",
          formattedReactions
        );
        setReactions(formattedReactions);

        // Tính số lượng cho từng loại reaction
        const counts = {};
        result.data.forEach((r) => {
          counts[r.reactionType] = (counts[r.reactionType] || 0) + 1;
        });
        setReactionCounts(counts);
      }
    } catch (error) {
      console.error("[ReactionsListModal] Error loading reactions:", error);
    } finally {
      setLoading(false);
    }
  };

  const filterReactions = () => {
    if (selectedTab === null) {
      setFilteredReactions(reactions);
    } else {
      setFilteredReactions(
        reactions.filter((r) => r.reactionType === selectedTab)
      );
    }
  };

  const handleUserPress = (userId) => {
    onClose();
    console.log(
      "[ReactionsListModal] handleUserPress - userId:",
      userId,
      "currentUserId:",
      currentUserId
    );
    if (Number(userId) === Number(currentUserId)) {
      console.log("[ReactionsListModal] Navigating to Profile (own user)");
      navigation.navigate("Profile");
    } else {
      console.log("[ReactionsListModal] Navigating to UserProfilePublic");
      navigation.navigate("UserProfilePublic", {
        userId: userId,
      });
    }
  };

  const renderReactionItem = ({ item }) => {
    console.log(
      "[ReactionsListModal] Rendering user:",
      item.username,
      "avatar:",
      item.avatarUrl
    );

    return (
      <TouchableOpacity
        style={styles.reactionItem}
        onPress={() => handleUserPress(item.userId)}
        activeOpacity={0.7}
      >
        {item.avatarUrl ? (
          <Image source={{ uri: item.avatarUrl }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <Ionicons name="person" size={24} color="#999" />
          </View>
        )}
        <View style={styles.userInfo}>
          <Text style={styles.username}>{item.username}</Text>
        </View>
        <Text style={styles.reactionEmoji}>
          {getReactionEmoji(item.reactionType)}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderTabItem = (tabType) => {
    const reaction = REACTION_TYPES.find((r) => r.type === tabType);
    if (!reaction) return null;

    const count =
      tabType === null ? reactions.length : reactionCounts[tabType] || 0;

    if (count === 0 && tabType !== null) return null;

    const isSelected = selectedTab === tabType;

    return (
      <TouchableOpacity
        key={tabType === null ? "all" : tabType}
        style={[styles.tab, isSelected && styles.tabSelected]}
        onPress={() => setSelectedTab(tabType)}
        activeOpacity={0.7}
      >
        {reaction.emoji && (
          <Text style={styles.tabEmoji}>{reaction.emoji}</Text>
        )}
        <Text style={[styles.tabLabel, isSelected && styles.tabLabelSelected]}>
          {reaction.label}
        </Text>
        <Text style={[styles.tabCount, isSelected && styles.tabCountSelected]}>
          {count}
        </Text>
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
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>
              {filteredReactions.length} lượt thích
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={28} color="#262626" />
            </TouchableOpacity>
          </View>

          {/* Tabs */}
          <View style={styles.tabsContainer}>
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={REACTION_TYPES}
              keyExtractor={(item) =>
                item.type === null ? "all" : String(item.type)
              }
              renderItem={({ item }) => renderTabItem(item.type)}
              contentContainerStyle={styles.tabsList}
            />
          </View>

          {/* List */}
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#0095f6" />
            </View>
          ) : (
            <FlatList
              data={filteredReactions}
              keyExtractor={(item) => String(item.reactionId)}
              renderItem={renderReactionItem}
              contentContainerStyle={styles.listContent}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>Chưa có lượt thích nào</Text>
                </View>
              }
            />
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  container: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: "50%",
    paddingBottom: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#efefef",
    position: "relative",
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "600",
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
  },
  tabsList: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: "#f0f0f0",
  },
  tabSelected: {
    backgroundColor: "#e7f3ff",
  },
  tabEmoji: {
    fontSize: 18,
    marginRight: 6,
  },
  tabLabel: {
    fontSize: 14,
    color: "#262626",
    fontWeight: "500",
    marginRight: 4,
  },
  tabLabelSelected: {
    color: "#0095f6",
    fontWeight: "600",
  },
  tabCount: {
    fontSize: 14,
    color: "#8e8e8e",
    fontWeight: "500",
  },
  tabCountSelected: {
    color: "#0095f6",
    fontWeight: "600",
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  reactionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
    backgroundColor: "#f0f0f0",
  },
  avatarPlaceholder: {
    justifyContent: "center",
    alignItems: "center",
  },
  userInfo: {
    flex: 1,
  },
  username: {
    fontSize: 14,
    fontWeight: "600",
    color: "#262626",
  },
  reactionEmoji: {
    fontSize: 32,
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: "center",
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 14,
    color: "#8e8e8e",
  },
});

export default ReactionsListModal;
