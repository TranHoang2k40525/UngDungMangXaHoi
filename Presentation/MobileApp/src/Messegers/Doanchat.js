import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Image,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
  ActivityIndicator,
  Alert,
  Animated,
  Modal,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import MessageAPI from "../API/MessageAPI";
import MessageWebSocketService from "../Services/MessageWebSocketService";

// Component TypingDot với animation nhấp nháy lên xuống (sóng biển)
const TypingDot = ({ delay }) => {
  const translateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(translateY, {
          toValue: -6, // Di chuyển lên 6px
          duration: 400,
          delay: delay,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0, // Trở về vị trí ban đầu
          duration: 400,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();

    return () => animation.stop();
  }, []);

  return (
    <Animated.View
      style={[styles.typingDot, { transform: [{ translateY }] }]}
    />
  );
};

export default function Doanchat() {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [conversationDetail, setConversationDetail] = useState(null);
  const [loading, setLoading] = useState(false); // Start with false to avoid flickering
  const [sending, setSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const [isOtherUserOnline, setIsOtherUserOnline] = useState(false); // Track online status
  const [otherUserLastSeen, setOtherUserLastSeen] = useState(null); // Track last seen
  const [currentUserId, setCurrentUserId] = useState(null); // Load from AsyncStorage
  const [selectedMessage, setSelectedMessage] = useState(null); // Message được chọn để thu hồi
  const [showActionModal, setShowActionModal] = useState(false); // Modal action menu
  const [showConfirmModal, setShowConfirmModal] = useState(false); // Confirm dialog
  const [highlightedMessageId, setHighlightedMessageId] = useState(null); // Message đang được highlight
  const [actionMenuPosition, setActionMenuPosition] = useState({ x: 0, y: 0 }); // Vị trí menu action
  const [selectedImage, setSelectedImage] = useState(null); // Ảnh được chọn để gửi
  const [uploadingImage, setUploadingImage] = useState(false); // Đang upload ảnh
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const modalAnim = useRef(new Animated.Value(0)).current;
  const scrollViewRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const navigation = useNavigation();
  const route = useRoute();

  const { userId, userName, userAvatar, username } = route.params || {};

  // Add render counter to debug
  const renderCount = useRef(0);
  renderCount.current++;
  console.log(
    `[Doanchat] RENDER #${renderCount.current} - userId: ${userId}, currentUserId: ${currentUserId}`
  );

  // Load current user ID from AsyncStorage
  useEffect(() => {
    const loadCurrentUser = async () => {
      try {
        const userInfoStr = await AsyncStorage.getItem("userInfo");
        if (userInfoStr) {
          const userInfo = JSON.parse(userInfoStr);
          const myUserId = userInfo.userId || userInfo.user_id || userInfo.id;
          setCurrentUserId(myUserId);
          console.log("[Doanchat] Current user loaded:", myUserId);
        }
      } catch (error) {
        console.error("[Doanchat] Error loading current user:", error);
      }
    };

    loadCurrentUser();
  }, []);

  // Load conversation và messages
  const loadConversation = async () => {
    try {
      setLoading(true);
      const response = await MessageAPI.getConversationDetail(userId);

      if (response.success && response.data) {
        setConversationDetail(response.data);
        setMessages(response.data.messages.reverse()); // Reverse để tin nhắn cũ nhất ở trên
      }
    } catch (error) {
      console.error("Error loading conversation:", error);

      // Nếu conversation chưa tồn tại (400/404), tạo conversation mới
      if (error.response?.status === 400 || error.response?.status === 404) {
        console.log(
          "[Doanchat] No conversation yet, will create on first message"
        );
        setMessages([]); // Empty messages cho conversation mới
        setConversationDetail(null);
      } else {
        Alert.alert("Lỗi", "Không thể tải tin nhắn");
      }
    } finally {
      setLoading(false);
    }
  };

  // Load conversation ONLY ONCE when component mounts
  useEffect(() => {
    console.log("[Doanchat] Component mounted - loading conversation");
    loadConversation();
  }, [userId]); // Only depend on userId - load once per user

  // Setup WebSocket listeners - SEPARATE from loading
  useEffect(() => {
    console.log("[Doanchat] Setting up WebSocket listeners");

    // Listen for new messages
    const handleMessageReceived = (newMessage) => {
      console.log("[Doanchat] Message received:", newMessage);

      // Check if message is for this conversation
      if (newMessage.sender_id === userId) {
        setMessages((prev) => [...prev, newMessage]);
        scrollToBottom();

        // Mark as read if conversation exists
        if (newMessage.conversation_id) {
          console.log("[Doanchat] Marking message as read");
          MessageWebSocketService.markAsRead(newMessage.conversation_id);
        }
      }
    };

    const handleMessageSent = (newMessage) => {
      console.log("[Doanchat] Message sent confirmation:", newMessage);
      setMessages((prev) => {
        // Avoid duplicates - check if message already exists
        const exists = prev.some((m) => m.message_id === newMessage.message_id);
        if (exists) {
          return prev;
        }
        return [...prev, newMessage];
      });
      scrollToBottom();
    };

    const handleUserTyping = (data) => {
      if (data.userId === userId) {
        setOtherUserTyping(data.isTyping);
      }
    };

    // Listen for online/offline status
    const handleOnlineUsers = (userIds) => {
      console.log("[Doanchat] Online users:", userIds);
      setIsOtherUserOnline(userIds.includes(userId));
    };

    const handleUserOnline = (onlineUserId) => {
      console.log("[Doanchat] User online:", onlineUserId);
      if (onlineUserId === userId) {
        setIsOtherUserOnline(true);
      }
    };

    const handleUserOffline = (offlineUserId) => {
      console.log("[Doanchat] User offline:", offlineUserId);
      if (offlineUserId === userId) {
        setIsOtherUserOnline(false);
        // Có thể load lastSeen từ API nếu cần
      }
    };

    // Listen for message recalled
    const handleMessageRecalled = (recalledMessage) => {
      console.log("[Doanchat] Message recalled:", recalledMessage);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.message_id === recalledMessage.message_id ? recalledMessage : msg
        )
      );
    };

    MessageWebSocketService.on("messageReceived", handleMessageReceived);
    MessageWebSocketService.on("messageSent", handleMessageSent);
    MessageWebSocketService.on("userTyping", handleUserTyping);
    MessageWebSocketService.on("onlineUsers", handleOnlineUsers);
    MessageWebSocketService.on("userOnline", handleUserOnline);
    MessageWebSocketService.on("userOffline", handleUserOffline);
    MessageWebSocketService.on("messageRecalled", handleMessageRecalled);

    return () => {
      console.log("[Doanchat] Cleaning up WebSocket listeners");
      MessageWebSocketService.off("messageReceived", handleMessageReceived);
      MessageWebSocketService.off("messageSent", handleMessageSent);
      MessageWebSocketService.off("userTyping", handleUserTyping);
      MessageWebSocketService.off("onlineUsers", handleOnlineUsers);
      MessageWebSocketService.off("userOnline", handleUserOnline);
      MessageWebSocketService.off("userOffline", handleUserOffline);
      MessageWebSocketService.off("messageRecalled", handleMessageRecalled);
    };
  }, [userId]); // Only depend on userId - stable

  // Mark as read when screen opened - ONLY ONCE on mount, AFTER WebSocket connected
  useEffect(() => {
    if (conversationDetail?.conversation_id) {
      // Wait for WebSocket to be ready
      const markAsReadWhenReady = async () => {
        const isConnected = await MessageWebSocketService.initialize();
        if (isConnected) {
          console.log(
            "[Doanchat] Marking conversation as read:",
            conversationDetail.conversation_id
          );
          MessageWebSocketService.markAsRead(
            conversationDetail.conversation_id
          );
        } else {
          console.warn(
            "[Doanchat] Cannot mark as read - WebSocket not connected"
          );
        }
      };

      markAsReadWhenReady();
    }
  }, [conversationDetail?.conversation_id]); // Only trigger when conversation_id changes, not entire object

  // Scroll to bottom - use useCallback to prevent re-creating function
  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, []);

  // Format offline time
  const formatOfflineTime = (lastSeen) => {
    if (!lastSeen) return "Offline";

    const lastSeenDate = new Date(lastSeen);
    const now = new Date();
    const diffMs = now - lastSeenDate;
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return "Active now";
    if (diffMins < 60) return `Active ${diffMins}m ago`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `Active ${diffHours}h ago`;

    const diffDays = Math.floor(diffHours / 24);
    return `Active ${diffDays}d ago`;
  };

  // Thu hồi tin nhắn
  const handleRecallMessage = async () => {
    console.log("[Doanchat] handleRecallMessage called!");
    console.log("[Doanchat] selectedMessage:", selectedMessage);

    if (!selectedMessage) {
      console.log("[Doanchat] No selectedMessage, returning...");
      return;
    }

    try {
      console.log("[Doanchat] Closing confirm modal...");
      setShowConfirmModal(false);
      setHighlightedMessageId(null);
      console.log("[Doanchat] Recalling message:", selectedMessage.message_id);

      await MessageWebSocketService.recallMessage(selectedMessage.message_id);
      console.log("[Doanchat] Message recalled successfully via WebSocket");

      // Update local state immediately
      setMessages((prev) =>
        prev.map((msg) =>
          msg.message_id === selectedMessage.message_id
            ? { ...msg, is_recalled: true, content: "Tin nhắn đã bị thu hồi" }
            : msg
        )
      );
      console.log("[Doanchat] Local state updated");

      setSelectedMessage(null);
    } catch (error) {
      console.error("[Doanchat] Error recalling message:", error);
      Alert.alert("Lỗi", "Không thể thu hồi tin nhắn: " + error.message);
      setHighlightedMessageId(null);
    }
  };

  // Long press handler với animation và lấy vị trí
  const handleLongPress = (msg, event) => {
    // Chỉ cho phép thu hồi tin nhắn của mình
    if (msg.sender_id === currentUserId && !msg.is_recalled) {
      setSelectedMessage(msg);
      setHighlightedMessageId(msg.message_id);

      // Lấy vị trí touch
      const { pageX, pageY } = event.nativeEvent;
      setActionMenuPosition({ x: pageX, y: pageY });

      // Animation fade in modal
      Animated.timing(modalAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();

      setShowActionModal(true);
    }
  };

  // Đóng modal và reset animation
  const closeActionModal = () => {
    Animated.timing(modalAnim, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      setShowActionModal(false);
      setHighlightedMessageId(null);
      // Do NOT clear selectedMessage here - we want the confirm dialog to
      // still have access to the selected message if user confirms.
    });
  };

  // Mở confirm dialog
  const openConfirmModal = () => {
    closeActionModal();
    setTimeout(() => setShowConfirmModal(true), 200);
  };

  // Đóng confirm dialog
  const closeConfirmModal = () => {
    setShowConfirmModal(false);
    setHighlightedMessageId(null);
    setSelectedMessage(null);
  };

  // Pick image from gallery
  const pickImage = async () => {
    try {
      // Request permissions
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Cần quyền truy cập",
          "Vui lòng cấp quyền truy cập thư viện ảnh"
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setSelectedImage(result.assets[0]);
        await sendImageMessage(result.assets[0]);
      }
    } catch (error) {
      console.error("[Doanchat] Error picking image:", error);
      Alert.alert("Lỗi", "Không thể chọn ảnh");
    }
  };

  // Send image message
  const sendImageMessage = async (imageAsset) => {
    try {
      setUploadingImage(true);
      console.log("[Doanchat] Uploading image:", imageAsset.uri);

      // Create FormData
      const formData = new FormData();
      formData.append("file", {
        uri: imageAsset.uri,
        type: "image/jpeg",
        name: "photo.jpg",
      });

      // Get token
      const token = await AsyncStorage.getItem("token");
      const apiUrl = await AsyncStorage.getItem("API_URL");

      // Upload image
      const uploadResponse = await fetch(`${apiUrl}/api/upload/image`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        console.error("[Doanchat] Upload error:", errorText);
        throw new Error("Upload failed");
      }

      const { imageUrl } = await uploadResponse.json();
      console.log("[Doanchat] Image uploaded:", imageUrl);

      // Send message with image via WebSocket
      await MessageWebSocketService.sendMessage(
        userId,
        "", // No text content
        "Image",
        imageUrl
      );

      setSelectedImage(null);
      setUploadingImage(false);
    } catch (error) {
      console.error("[Doanchat] Error sending image:", error);
      Alert.alert("Lỗi", "Không thể gửi ảnh");
      setUploadingImage(false);
    }
  };

  // Handle send message
  const handleSend = async () => {
    if (!message.trim() || sending) {
      return;
    }

    const messageText = message.trim();
    setMessage(""); // Clear input immediately
    setSending(true);
    Keyboard.dismiss();

    // Stop typing indicator
    handleTyping(false);

    console.log("[Doanchat] Sending message:", messageText);

    try {
      // Send via WebSocket - DON'T add to messages here, wait for messageSent event
      await MessageWebSocketService.sendMessage(userId, messageText);
      console.log("[Doanchat] Message sent via WebSocket");
    } catch (error) {
      console.error("[Doanchat] WebSocket send error:", error);

      // Fallback to HTTP ONLY if WebSocket fails
      try {
        const response = await MessageAPI.sendMessage(userId, messageText);
        if (response.success && response.data) {
          // Add message manually only if HTTP fallback succeeds
          setMessages((prev) => {
            const exists = prev.some(
              (m) => m.message_id === response.data.message_id
            );
            if (!exists) {
              return [...prev, response.data];
            }
            return prev;
          });
          scrollToBottom();
        }
      } catch (httpError) {
        console.error("[Doanchat] HTTP fallback error:", httpError);
        Alert.alert("Lỗi", "Không thể gửi tin nhắn");
        setMessage(messageText); // Restore message on complete failure
      }
    } finally {
      setSending(false);
    }
  };

  // Handle typing
  const handleTyping = (typing) => {
    if (typing === isTyping) return;

    setIsTyping(typing);
    MessageWebSocketService.userTyping(userId, typing);

    if (typing) {
      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Set timeout to stop typing after 3 seconds
      typingTimeoutRef.current = setTimeout(() => {
        setIsTyping(false);
        MessageWebSocketService.userTyping(userId, false);
      }, 3000);
    }
  };

  // Handle text input change
  const handleTextChange = (text) => {
    setMessage(text);

    if (text.trim()) {
      handleTyping(true);
    } else {
      handleTyping(false);
    }
  };

  // Format time - backend already returns Vietnam timezone (UTC+7)
  const formatTime = (dateString) => {
    if (!dateString) return "";

    // Backend returns Vietnam time, just format it
    const date = new Date(dateString);

    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");

    return `${hours}:${minutes}`;
  };

  // currentUserId is now loaded from AsyncStorage in useEffect above

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
    >
      <StatusBar
        barStyle="dark-content"
        backgroundColor="#FFFFFF"
        translucent={false}
      />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="chevron-back" size={24} color="#111827" />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <View style={styles.headerAvatarContainer}>
            {userAvatar ? (
              <Image source={{ uri: userAvatar }} style={styles.headerAvatar} />
            ) : (
              <View style={[styles.headerAvatar, styles.defaultAvatar]}>
                <Text style={styles.defaultAvatarText}>
                  {userName ? userName.charAt(0).toUpperCase() : "U"}
                </Text>
              </View>
            )}
            {/* Online indicator */}
            {isOtherUserOnline && <View style={styles.headerOnlineIndicator} />}
          </View>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerName}>{userName || "User"}</Text>
            {!isOtherUserOnline && otherUserLastSeen && (
              <Text style={styles.headerStatus}>
                {formatOfflineTime(otherUserLastSeen)}
              </Text>
            )}
          </View>
        </View>

        <TouchableOpacity style={styles.headerIcon}>
          <Ionicons
            name="information-circle-outline"
            size={24}
            color="#111827"
          />
        </TouchableOpacity>
      </View>

      {/* Chat Content */}
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView
          ref={scrollViewRef}
          style={styles.chatContent}
          contentContainerStyle={styles.chatContentContainer}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={scrollToBottom}
        >
          {loading || !currentUserId ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#3B82F6" />
            </View>
          ) : messages.length === 0 ? (
            <View style={styles.profileSection}>
              {userAvatar ? (
                <Image
                  source={{ uri: userAvatar }}
                  style={styles.profileAvatar}
                />
              ) : (
                <View style={[styles.profileAvatar, styles.defaultAvatar]}>
                  <Text style={[styles.defaultAvatarText, { fontSize: 40 }]}>
                    {userName ? userName.charAt(0).toUpperCase() : "U"}
                  </Text>
                </View>
              )}
              <Text style={styles.profileName}>{userName || "User"}</Text>
              <Text style={styles.profileUsername}>{username || "@user"}</Text>
              <Text style={styles.profileInfo}>
                {conversationDetail?.other_user_bio ||
                  "Các bạn đang theo dõi nhau"}
              </Text>
              <Text style={styles.profileBio}>Bắt đầu trò chuyện ngay!</Text>
            </View>
          ) : (
            <View style={styles.messagesContainer}>
              {messages.map((msg, index) => {
                const isOwnMessage = msg.sender_id === currentUserId;
                const isHighlighted = highlightedMessageId === msg.message_id;

                // Debug logging
                if (index === 0) {
                  console.log(
                    `[Doanchat] Rendering messages - currentUserId: ${currentUserId}`
                  );
                }
                console.log(
                  `[Doanchat] Message #${index}: sender_id=${
                    msg.sender_id
                  }, isOwnMessage=${isOwnMessage}, content="${msg.content.substring(
                    0,
                    20
                  )}"`
                );

                return (
                  <View
                    key={msg.message_id || index}
                    style={[
                      styles.messageWrapper,
                      isOwnMessage
                        ? styles.ownMessageWrapper
                        : styles.otherMessageWrapper,
                    ]}
                  >
                    {/* Always show avatar for other user's messages */}
                    {!isOwnMessage &&
                      (userAvatar ? (
                        <Image
                          source={{ uri: userAvatar }}
                          style={styles.messageAvatar}
                        />
                      ) : (
                        <View
                          style={[styles.messageAvatar, styles.defaultAvatar]}
                        >
                          <Text
                            style={[styles.defaultAvatarText, { fontSize: 12 }]}
                          >
                            {userName ? userName.charAt(0).toUpperCase() : "U"}
                          </Text>
                        </View>
                      ))}
                    {/* No placeholder needed - avatar always shows for other user */}

                    <TouchableOpacity
                      style={[
                        styles.messageBubble,
                        isOwnMessage
                          ? styles.ownMessageBubble
                          : styles.otherMessageBubble,
                        isHighlighted && styles.highlightedMessage,
                      ]}
                      onLongPress={(event) => handleLongPress(msg, event)}
                      delayLongPress={500}
                      activeOpacity={0.7}
                    >
                      {msg.is_recalled ? (
                        <View style={styles.recalledMessageContainer}>
                          <Ionicons
                            name="ban-outline"
                            size={14}
                            color="#9CA3AF"
                          />
                          <Text style={styles.recalledMessage}>
                            {" Tin nhắn đã bị thu hồi"}
                          </Text>
                        </View>
                      ) : msg.content &&
                        msg.content.startsWith("SHARED_POST:") ? (
                        // Hiển thị card preview cho bài viết được chia sẻ
                        <TouchableOpacity
                          style={styles.sharedPostCard}
                          onPress={() => {
                            try {
                              const jsonContent = msg.content.substring(
                                "SHARED_POST:".length
                              );
                              const postData = JSON.parse(jsonContent);

                              // Navigate đến PostDetail với postId
                              navigation.navigate("PostDetail", {
                                singlePost: {
                                  id: postData.postId,
                                  content: postData.content,
                                  user: {
                                    username: postData.authorName,
                                    avatarUrl: postData.authorAvatar,
                                  },
                                  media: postData.mediaUrl
                                    ? [
                                        {
                                          url: postData.mediaUrl,
                                          type: postData.mediaType || "Image",
                                        },
                                      ]
                                    : [],
                                  createdAt: postData.createdAt,
                                },
                              });
                            } catch (e) {
                              console.error("Navigate to post error:", e);
                              Alert.alert("Lỗi", "Không thể mở bài viết");
                            }
                          }}
                          activeOpacity={0.7}
                        >
                          {(() => {
                            try {
                              const jsonContent = msg.content.substring(
                                "SHARED_POST:".length
                              );
                              const postData = JSON.parse(jsonContent);
                              console.log(
                                "[Doanchat] Rendering shared post:",
                                postData
                              );
                              console.log(
                                "[Doanchat] Media URL:",
                                postData.mediaUrl
                              );
                              return (
                                <>
                                  <View style={styles.sharedPostHeader}>
                                    <Ionicons
                                      name="arrow-redo"
                                      size={16}
                                      color="#6B7280"
                                    />
                                    <Text style={styles.sharedPostLabel}>
                                      Bài viết được chia sẻ
                                    </Text>
                                  </View>

                                  <View style={styles.sharedPostContent}>
                                    <View style={styles.sharedPostAuthor}>
                                      {postData.authorAvatar ? (
                                        <Image
                                          source={{
                                            uri: postData.authorAvatar,
                                          }}
                                          style={styles.sharedPostAvatar}
                                        />
                                      ) : (
                                        <View
                                          style={[
                                            styles.sharedPostAvatar,
                                            styles.defaultAvatar,
                                          ]}
                                        >
                                          <Text
                                            style={styles.defaultAvatarText}
                                          >
                                            {postData.authorName
                                              .charAt(0)
                                              .toUpperCase()}
                                          </Text>
                                        </View>
                                      )}
                                      <Text style={styles.sharedPostAuthorName}>
                                        {postData.authorName}
                                      </Text>
                                    </View>

                                    {postData.content && (
                                      <Text
                                        style={styles.sharedPostText}
                                        numberOfLines={3}
                                      >
                                        {postData.content}
                                      </Text>
                                    )}

                                    {postData.mediaUrl &&
                                      postData.mediaUrl.trim() !== "" &&
                                      (postData.mediaType === "Video" ? (
                                        // Hiển thị placeholder cho video
                                        <View
                                          style={[
                                            styles.sharedPostImage,
                                            styles.videoPlaceholder,
                                          ]}
                                        >
                                          <Ionicons
                                            name="play-circle"
                                            size={48}
                                            color="#FFFFFF"
                                          />
                                          <Text style={styles.videoLabel}>
                                            Video
                                          </Text>
                                        </View>
                                      ) : (
                                        // Hiển thị ảnh
                                        <Image
                                          source={{ uri: postData.mediaUrl }}
                                          style={styles.sharedPostImage}
                                          resizeMode="cover"
                                          onError={(error) => {
                                            console.error(
                                              "[Doanchat] Image load error:",
                                              error.nativeEvent.error
                                            );
                                            console.error(
                                              "[Doanchat] Failed URL:",
                                              postData.mediaUrl
                                            );
                                          }}
                                          onLoad={() => {
                                            console.log(
                                              "[Doanchat] Image loaded successfully:",
                                              postData.mediaUrl
                                            );
                                          }}
                                        />
                                      ))}
                                  </View>
                                </>
                              );
                            } catch (e) {
                              return (
                                <Text style={styles.messageText}>
                                  Bài viết được chia sẻ
                                </Text>
                              );
                            }
                          })()}
                        </TouchableOpacity>
                      ) : msg.message_type === "Image" && msg.media_url ? (
                        <TouchableOpacity
                          onPress={() => {
                            // TODO: Open image in fullscreen
                            Alert.alert("Xem ảnh", msg.media_url);
                          }}
                        >
                          <Image
                            source={{ uri: msg.media_url }}
                            style={styles.messageImage}
                            resizeMode="cover"
                          />
                          {msg.content && (
                            <Text
                              style={[
                                styles.messageText,
                                isOwnMessage
                                  ? styles.ownMessageText
                                  : styles.otherMessageText,
                                { marginTop: 8 },
                              ]}
                            >
                              {msg.content}
                            </Text>
                          )}
                        </TouchableOpacity>
                      ) : (
                        <Text
                          style={[
                            styles.messageText,
                            isOwnMessage
                              ? styles.ownMessageText
                              : styles.otherMessageText,
                          ]}
                        >
                          {msg.content}
                        </Text>
                      )}
                      <Text
                        style={[
                          styles.messageTime,
                          isOwnMessage
                            ? styles.ownMessageTime
                            : styles.otherMessageTime,
                        ]}
                      >
                        {formatTime(msg.created_at)}
                      </Text>
                    </TouchableOpacity>
                  </View>
                );
              })}

              {otherUserTyping && (
                <View style={styles.typingIndicatorContainer}>
                  {userAvatar ? (
                    <Image
                      source={{ uri: userAvatar }}
                      style={styles.messageAvatar}
                    />
                  ) : (
                    <View style={[styles.messageAvatar, styles.defaultAvatar]}>
                      <Text
                        style={[styles.defaultAvatarText, { fontSize: 12 }]}
                      >
                        {userName ? userName.charAt(0).toUpperCase() : "U"}
                      </Text>
                    </View>
                  )}
                  <View style={styles.typingBubble}>
                    <View style={styles.typingDots}>
                      <TypingDot delay={0} />
                      <TypingDot delay={200} />
                      <TypingDot delay={400} />
                    </View>
                  </View>
                </View>
              )}
            </View>
          )}
        </ScrollView>
      </TouchableWithoutFeedback>

      {/* Message Input */}
      <View style={styles.messageInputContainer}>
        <TouchableOpacity style={styles.cameraButton}>
          <Ionicons name="camera-outline" size={24} color="#111827" />
        </TouchableOpacity>

        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.messageInput}
            value={message}
            onChangeText={handleTextChange}
            placeholder="Nhắn tin..."
            placeholderTextColor="#9CA3AF"
            multiline
            editable={!sending}
          />
        </View>

        {message.trim() ? (
          <TouchableOpacity
            style={[styles.sendButton, sending && styles.sendButtonDisabled]}
            onPress={handleSend}
            disabled={sending}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Ionicons name="arrow-up" size={20} color="#FFFFFF" />
            )}
          </TouchableOpacity>
        ) : (
          <>
            <TouchableOpacity style={styles.micButton}>
              <Ionicons name="mic-outline" size={24} color="#111827" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.imageButton}
              onPress={pickImage}
              disabled={uploadingImage}
            >
              {uploadingImage ? (
                <ActivityIndicator size="small" color="#3B82F6" />
              ) : (
                <Ionicons name="image-outline" size={24} color="#111827" />
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.likeButton}>
              <Ionicons name="add-circle-outline" size={24} color="#111827" />
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* Action Modal - Hiện action khi long press */}
      <Modal
        visible={showActionModal}
        transparent={true}
        animationType="none"
        onRequestClose={closeActionModal}
      >
        <TouchableOpacity
          style={styles.actionModalOverlay}
          activeOpacity={1}
          onPress={closeActionModal}
        >
          <Animated.View
            style={[
              styles.actionModalContent,
              {
                position: "absolute",
                top: actionMenuPosition.y - 50,
                left: actionMenuPosition.x - 50,
                opacity: modalAnim,
                transform: [
                  {
                    scale: modalAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.8, 1],
                    }),
                  },
                ],
              },
            ]}
          >
            <TouchableOpacity
              style={styles.actionButton}
              onPress={openConfirmModal}
            >
              <Text style={styles.actionButtonText}>Thu hồi</Text>
            </TouchableOpacity>
          </Animated.View>
        </TouchableOpacity>
      </Modal>

      {/* Confirm Modal - Xác nhận thu hồi */}
      <Modal
        visible={showConfirmModal}
        transparent={true}
        animationType="fade"
        onRequestClose={closeConfirmModal}
      >
        <View style={styles.confirmModalOverlay}>
          <View style={styles.confirmModalContent}>
            <Text style={styles.confirmTitle}>Thu hồi tin nhắn?</Text>
            <Text style={styles.confirmMessage}>
              Tin nhắn này sẽ bị xóa với mọi người trong đoạn chat
            </Text>

            <View style={styles.confirmButtons}>
              <TouchableOpacity
                style={[styles.confirmButton, styles.cancelButton]}
                onPress={closeConfirmModal}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelButtonText}>Hủy</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.confirmButton, styles.recallButton]}
                onPress={handleRecallMessage}
                activeOpacity={0.7}
              >
                <Text style={styles.recallButtonText}>Thu hồi</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    paddingTop: Platform.OS === "ios" ? 60 : 20,
    paddingBottom: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  headerCenter: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 8,
  },
  headerAvatarContainer: {
    position: "relative",
    marginRight: 8,
  },
  headerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  headerOnlineIndicator: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#10B981",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  defaultAvatar: {
    backgroundColor: "#1DA1F2",
    justifyContent: "center",
    alignItems: "center",
  },
  defaultAvatarText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  headerTextContainer: {
    flex: 1,
  },
  headerName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
  },
  headerStatus: {
    fontSize: 12,
    color: "#6B7280",
  },
  headerIcon: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  chatContent: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  chatContentContainer: {
    flexGrow: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 100,
  },
  messagesContainer: {
    padding: 16,
  },
  messageWrapper: {
    flexDirection: "row",
    marginBottom: 12,
    alignItems: "flex-end",
  },
  ownMessageWrapper: {
    justifyContent: "flex-end",
  },
  otherMessageWrapper: {
    justifyContent: "flex-start",
  },
  messageAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginRight: 8,
  },
  avatarPlaceholder: {
    width: 28,
    marginRight: 8,
  },
  messageBubble: {
    maxWidth: "70%",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  ownMessageBubble: {
    backgroundColor: "#3B82F6",
    borderBottomRightRadius: 4,
  },
  otherMessageBubble: {
    backgroundColor: "#FFFFFF",
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  ownMessageText: {
    color: "#FFFFFF",
  },
  otherMessageText: {
    color: "#111827",
  },
  messageTime: {
    fontSize: 11,
    marginTop: 4,
  },
  ownMessageTime: {
    color: "#DBEAFE",
    textAlign: "right",
  },
  otherMessageTime: {
    color: "#9CA3AF",
  },
  typingIndicatorContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginBottom: 12,
  },
  typingBubble: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderBottomLeftRadius: 4,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  typingDots: {
    flexDirection: "row",
    alignItems: "center",
  },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#9CA3AF",
    marginHorizontal: 2,
  },
  profileSection: {
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 60,
  },
  profileAvatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    marginBottom: 16,
  },
  profileName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 4,
  },
  profileUsername: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 8,
  },
  profileInfo: {
    fontSize: 13,
    color: "#6B7280",
    marginBottom: 8,
  },
  profileBio: {
    fontSize: 13,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 4,
  },
  sendButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#3B82F6",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 4,
  },
  sendButtonDisabled: {
    opacity: 0.6,
  },
  messageInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    paddingBottom: Platform.OS === "ios" ? 34 : 8,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  cameraButton: {
    width: 36,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
  },
  inputWrapper: {
    flex: 1,
    backgroundColor: "#F3F4F6",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 8,
    minHeight: 36,
    justifyContent: "center",
  },
  messageInput: {
    fontSize: 14,
    color: "#111827",
    maxHeight: 100,
  },
  sendButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#3B82F6",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 4,
  },
  micButton: {
    width: 36,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 4,
  },
  imageButton: {
    width: 36,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 4,
  },
  likeButton: {
    width: 36,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
  },
  // Highlighted message (khi long press)
  highlightedMessage: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  // Action Modal styles (menu nhỏ khi long press)
  actionModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
  },
  actionModalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingVertical: 6,
    paddingHorizontal: 4,
    minWidth: 90,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  actionButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  actionButtonText: {
    fontSize: 14,
    color: "#EF4444",
    fontWeight: "600",
  },
  // Confirm Modal styles (xác nhận thu hồi)
  confirmModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  confirmModalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 24,
    width: "100%",
    maxWidth: 340,
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
  },
  confirmTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 12,
    textAlign: "center",
  },
  confirmMessage: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 24,
    textAlign: "center",
    lineHeight: 20,
  },
  confirmButtons: {
    flexDirection: "row",
    gap: 12,
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButton: {
    backgroundColor: "#F3F4F6",
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#6B7280",
  },
  recallButton: {
    backgroundColor: "#EF4444",
  },
  recallButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  // Recalled message styles
  recalledMessageContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  recalledMessage: {
    fontSize: 14,
    color: "#9CA3AF",
    fontStyle: "italic",
  },
  // Image message styles
  messageImage: {
    width: 200,
    height: 200,
    borderRadius: 12,
  },
  sharedPostCard: {
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    overflow: "hidden",
    maxWidth: 280,
  },
  sharedPostHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    backgroundColor: "#F3F4F6",
    gap: 6,
  },
  sharedPostLabel: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "500",
  },
  sharedPostContent: {
    padding: 12,
  },
  sharedPostAuthor: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 8,
  },
  sharedPostAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#E5E7EB",
  },
  sharedPostAuthorName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
  },
  sharedPostText: {
    fontSize: 14,
    color: "#374151",
    marginBottom: 8,
    lineHeight: 20,
  },
  sharedPostImage: {
    width: "100%",
    height: 180,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
  },
  videoPlaceholder: {
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#1F2937",
  },
  videoLabel: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
    marginTop: 8,
  },
});
