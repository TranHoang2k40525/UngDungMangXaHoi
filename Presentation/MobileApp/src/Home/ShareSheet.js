import React, { useState } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ScrollView,
  Image,
  Share as RNShare,
  FlatList,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

// Dữ liệu người dùng theo dõi (tương tự stories)
const followingUsers = [
  { id: "1", name: "Hoàng", avatar: require("../Assets/trai.png") },
  { id: "2", name: "Quân", avatar: require("../Assets/noo.png") },
  { id: "3", name: "Trang", avatar: require("../Assets/gai2.png") },
  { id: "4", name: "Vinh", avatar: require("../Assets/meo.png") },
  { id: "5", name: "Linh", avatar: require("../Assets/gai1.png") },
  { id: "6", name: "Việt", avatar: require("../Assets/embe.png") },
  { id: "7", name: "Tùng", avatar: require("../Assets/sontung.png") },
];

const ShareSheet = ({
  visible,
  onClose,
  post,
  onShareToFeed,
  onShareExternal,
}) => {
  const [caption, setCaption] = useState("");
  const [privacy, setPrivacy] = useState("public");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUsers, setSelectedUsers] = useState([]);

  const handleClose = () => {
    // Reset tất cả state khi đóng modal
    setSelectedUsers([]);
    setSearchQuery("");
    setCaption("");
    setPrivacy("public");
    onClose();
  };

  const handleShareToFeed = async () => {
    await onShareToFeed(post.id, caption, privacy);
    handleClose();
  };

  const handleShareExternal = async () => {
    await onShareExternal(post);
    handleClose();
  };

  const handleShareToStory = () => {
    // TODO: Implement share to story
    alert("Chức năng chia sẻ lên story đang phát triển");
    handleClose();
  };

  const toggleUserSelection = (userId) => {
    if (selectedUsers.includes(userId)) {
      setSelectedUsers(selectedUsers.filter((id) => id !== userId));
    } else {
      setSelectedUsers([...selectedUsers, userId]);
    }
  };

  const handleSendToUsers = () => {
    if (selectedUsers.length === 0) {
      alert("Vui lòng chọn ít nhất một người để gửi");
      return;
    }
    // TODO: Implement send to selected users
    alert(`Đã gửi cho ${selectedUsers.length} người`);
    handleClose();
  };

  const filteredUsers = followingUsers.filter((user) =>
    user.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!visible || !post) return null;

  const firstMedia = (post.media || [])[0];
  const mediaUrl = firstMedia?.url || "";
  const mediaType = firstMedia?.type || "image";

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={handleClose}
        />

        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Chia sẻ</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Ionicons name="close" size={28} color="#262626" />
            </TouchableOpacity>
          </View>

          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <Ionicons
              name="search"
              size={20}
              color="#999"
              style={styles.searchIcon}
            />
            <TextInput
              style={styles.searchInput}
              placeholder="Tìm kiếm"
              placeholderTextColor="#999"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          {/* Following Users List */}
          <View style={styles.usersSection}>
            <FlatList
              data={filteredUsers}
              keyExtractor={(item) => item.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.usersList}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.userItem}
                  onPress={() => toggleUserSelection(item.id)}
                >
                  <View style={styles.userAvatarContainer}>
                    <Image source={item.avatar} style={styles.userAvatar} />
                    {selectedUsers.includes(item.id) && (
                      <View style={styles.selectedBadge}>
                        <Ionicons
                          name="checkmark-circle"
                          size={24}
                          color="#0095f6"
                        />
                      </View>
                    )}
                  </View>
                  <Text style={styles.userName} numberOfLines={1}>
                    {item.name}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>

          {/* Send Button (if users selected) */}
          {selectedUsers.length > 0 && (
            <TouchableOpacity
              style={styles.sendButton}
              onPress={handleSendToUsers}
            >
              <Ionicons name="paper-plane" size={20} color="#fff" />
              <Text style={styles.sendButtonText}>
                Gửi cho {selectedUsers.length} người
              </Text>
            </TouchableOpacity>
          )}

          <ScrollView style={styles.content}>
            {/* Divider */}
            <View style={styles.divider} />

            {/* Other Share Options */}
            <View style={styles.otherOptions}>
              <TouchableOpacity
                style={styles.otherOption}
                onPress={handleShareToStory}
              >
                <View
                  style={[
                    styles.optionIconCircle,
                    { backgroundColor: "#e74c3c" },
                  ]}
                >
                  <Ionicons name="add-circle-outline" size={24} color="#fff" />
                </View>
                <Text style={styles.otherOptionText}>
                  Thêm vào story của bạn
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.otherOption}
                onPress={() => {
                  /* Navigate to share to feed */
                }}
              >
                <View
                  style={[styles.optionIconCircle, { backgroundColor: "#555" }]}
                >
                  <Ionicons name="reload-outline" size={24} color="#fff" />
                </View>
                <Text style={styles.otherOptionText}>Chia sẻ lên feed</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.otherOption}
                onPress={handleShareExternal}
              >
                <View
                  style={[
                    styles.optionIconCircle,
                    { backgroundColor: "#0095f6" },
                  ]}
                >
                  <Ionicons name="share-outline" size={24} color="#fff" />
                </View>
                <Text style={styles.otherOptionText}>Chia sẻ qua...</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.otherOption}>
                <View
                  style={[styles.optionIconCircle, { backgroundColor: "#555" }]}
                >
                  <Ionicons name="link-outline" size={24} color="#fff" />
                </View>
                <Text style={styles.otherOptionText}>Sao chép liên kết</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.otherOption}>
                <View
                  style={[styles.optionIconCircle, { backgroundColor: "#555" }]}
                >
                  <Ionicons name="bookmark-outline" size={24} color="#fff" />
                </View>
                <Text style={styles.otherOptionText}>Lưu bài viết</Text>
              </TouchableOpacity>
            </View>

            {/* Share to Feed Section (old, kept for reference) */}
            {/* Post Preview */}
            <View style={styles.postPreview}>
              {mediaType === "video" ? (
                <View style={styles.previewMedia}>
                  <Ionicons name="play-circle" size={40} color="#fff" />
                </View>
              ) : mediaUrl ? (
                <Image source={{ uri: mediaUrl }} style={styles.previewMedia} />
              ) : (
                <View
                  style={[styles.previewMedia, { backgroundColor: "#f0f0f0" }]}
                >
                  <Ionicons name="image-outline" size={40} color="#999" />
                </View>
              )}
              <View style={styles.previewInfo}>
                <Text style={styles.previewAuthor}>
                  @{post.username || "unknown"}
                </Text>
                <Text style={styles.previewCaption} numberOfLines={2}>
                  {post.caption || "Không có chú thích"}
                </Text>
              </View>
            </View>

            {/* Caption Input */}
            <TextInput
              style={styles.captionInput}
              placeholder="Viết gì đó..."
              placeholderTextColor="#999"
              value={caption}
              onChangeText={setCaption}
              multiline
              maxLength={500}
            />

            {/* Privacy Selector */}
            <View style={styles.privacySelector}>
              <Text style={styles.privacyLabel}>Ai có thể xem:</Text>
              <View style={styles.privacyOptions}>
                <TouchableOpacity
                  style={[
                    styles.privacyOption,
                    privacy === "public" && styles.privacyOptionActive,
                  ]}
                  onPress={() => setPrivacy("public")}
                >
                  <Ionicons
                    name="earth"
                    size={20}
                    color={privacy === "public" ? "#0095f6" : "#666"}
                  />
                  <Text
                    style={[
                      styles.privacyOptionText,
                      privacy === "public" && styles.privacyOptionTextActive,
                    ]}
                  >
                    Công khai
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.privacyOption,
                    privacy === "friends" && styles.privacyOptionActive,
                  ]}
                  onPress={() => setPrivacy("friends")}
                >
                  <Ionicons
                    name="people"
                    size={20}
                    color={privacy === "friends" ? "#0095f6" : "#666"}
                  />
                  <Text
                    style={[
                      styles.privacyOptionText,
                      privacy === "friends" && styles.privacyOptionTextActive,
                    ]}
                  >
                    Bạn bè
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.privacyOption,
                    privacy === "private" && styles.privacyOptionActive,
                  ]}
                  onPress={() => setPrivacy("private")}
                >
                  <Ionicons
                    name="lock-closed"
                    size={20}
                    color={privacy === "private" ? "#0095f6" : "#666"}
                  />
                  <Text
                    style={[
                      styles.privacyOptionText,
                      privacy === "private" && styles.privacyOptionTextActive,
                    ]}
                  >
                    Riêng tư
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Share Button */}
            <TouchableOpacity
              style={styles.shareButton}
              onPress={handleShareToFeed}
            >
              <Text style={styles.shareButtonText}>Chia sẻ lên feed</Text>
            </TouchableOpacity>

            {/* Other Options */}
            <View style={styles.otherOptions}>
              <TouchableOpacity style={styles.otherOption}>
                <Ionicons name="link-outline" size={24} color="#262626" />
                <Text style={styles.otherOptionText}>Sao chép liên kết</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.otherOption}>
                <Ionicons name="share-outline" size={24} color="#262626" />
                <Text style={styles.otherOptionText}>Chia sẻ qua...</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.otherOption}>
                <Ionicons name="bookmark-outline" size={24} color="#262626" />
                <Text style={styles.otherOptionText}>Lưu bài viết</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
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
    maxHeight: "90%",
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
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#f0f0f0",
    borderRadius: 10,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: "#262626",
    padding: 0,
  },
  usersSection: {
    paddingHorizontal: 8,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#efefef",
  },
  usersList: {
    paddingHorizontal: 8,
  },
  userItem: {
    alignItems: "center",
    marginHorizontal: 8,
    width: 70,
  },
  userAvatarContainer: {
    position: "relative",
    marginBottom: 6,
  },
  userAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: "#ddd",
  },
  selectedBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    backgroundColor: "#fff",
    borderRadius: 12,
  },
  userName: {
    fontSize: 12,
    color: "#262626",
    textAlign: "center",
  },
  sendButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 16,
    marginVertical: 12,
    paddingVertical: 14,
    backgroundColor: "#0095f6",
    borderRadius: 10,
    gap: 8,
  },
  sendButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#fff",
  },
  content: {
    flex: 1,
  },
  divider: {
    height: 1,
    backgroundColor: "#efefef",
    marginVertical: 8,
  },
  otherOptions: {
    paddingTop: 8,
    paddingBottom: 32,
  },
  otherOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
  },
  optionIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  otherOptionText: {
    fontSize: 15,
    color: "#262626",
  },
});

export default ShareSheet;
