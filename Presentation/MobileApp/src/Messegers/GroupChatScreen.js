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
  Modal,
  Linking,
  FlatList,
  Dimensions,
} from "react-native";
import {
  useNavigation,
  useRoute,
  useFocusEffect,
} from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SignalR from "@microsoft/signalr";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import * as Clipboard from "expo-clipboard";
import * as VideoThumbnails from "expo-video-thumbnails";
import { Video } from "expo-av";
import {
  getGroupInfo,
  getGroupMembers,
  API_BASE_URL,
  getProfile,
} from "../API/Api";
import groupChatService from "../ServicesSingalR/groupChatService.js";
import signalRService from "../ServicesSingalR/signalRService.js";

import ImageViewer from "../Components/ImageViewer";
//import { Video } from 'expo-av';

const EMOJI_LIST = [
  "❤️",
  "😂",
  "😮",
  "😢",
  "😡",
  "👍",
  "👎",
  "🔥",
  "🎉",
  "😍",
  "😘",
  "😊",
  "😎",
  "🤔",
  "😴",
  "😭",
  "🤗",
  "🙏",
  "👏",
  "💪",
  "✨",
  "🌟",
  "💯",
  "🎊",
  "🎈",
  "🌈",
  "☀️",
  "⭐",
  "💖",
  "💕",
];

const QUICK_REACTIONS = ["❤️", "😂", "😮", "😢", "😡", "👍"];

export default function GroupChatScreen() {
  // Helper: determine whether a message contains only emoji (and spaces)
  // We treat emoji-only messages specially (large display) but MUST exclude
  // numeric-only strings so numbers don't render as emoji.
  const isEmojiOnly = (txt) => {
    try {
      const s = String(txt ?? "").trim();
      if (!s) return false;
      // Exclude strings that contain digits
      if (/\d/.test(s)) return false;
      // Limit length so long sequences of emoji/text don't trigger
      if (s.length > 8) return false;
      // Unicode emoji detection (may throw on some engines, so wrapped)
      return /^[\p{Emoji_Presentation}\p{Emoji}\uFE0F\s]+$/u.test(s);
    } catch (e) {
      return false;
    }
  };

  // Normalize media URI: if absolute (http/file/content) return as-is, else prepend API_BASE_URL
  const getMediaUri = (uri) => {
    if (!uri) return null;
    try {
      const s = String(uri);
      if (
        s.startsWith("http") ||
        s.startsWith("file://") ||
        s.startsWith("content://")
      )
        return s;
      // Some backends return paths starting with /uploads, handle that
      if (s.startsWith("/")) return `${API_BASE_URL}${s}`;
      // If it's already a full URL-like value
      if (s.includes("://")) return s;
      return `${API_BASE_URL}/${s}`;
    } catch (e) {
      return uri;
    }
  };

  const handlePickFile = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: true,
      });
      if (res.type === "success" && res.uri) {
        setShowMediaPicker(false);
        await handleSend(res.uri, "file");
      }
    } catch (err) {
      console.error("[GroupChat] pick file error:", err);
      Alert.alert("Lỗi", "Không thể chọn tệp");
    }
  };

  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false); // ✅ NEW: Loading more messages
  const [page, setPage] = useState(1); // ✅ NEW: Current page
  const [hasMore, setHasMore] = useState(true); // ✅ NEW: Has more messages to load
  const [groupInfo, setGroupInfo] = useState(null);
  const [members, setMembers] = useState([]);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [pinnedModalVisible, setPinnedModalVisible] = useState(false);
  const [pinnedMessages, setPinnedMessages] = useState([]);
  const [showMoreOptions, setShowMoreOptions] = useState(false); // Menu cấp 2
  const [showMentionList, setShowMentionList] = useState(false); // Hiện danh sách mention
  const [mentionSearch, setMentionSearch] = useState(""); // Text sau @
  const [cursorPosition, setCursorPosition] = useState(0); // Vị trí con trỏ
  const [mentionStartIndex, setMentionStartIndex] = useState(-1); // Vị trí bắt đầu @
  const [selectedMentionedUser, setSelectedMentionedUser] = useState(null); // User được mention được chọn
  const [showMentionMenu, setShowMentionMenu] = useState(false); // Menu khi tap vào mention
  const [replyingTo, setReplyingTo] = useState(null); // Tin nhắn đang được reply
  const [highlightedMessageId, setHighlightedMessageId] = useState(null); // Message đang được highlight
  const [showImageViewer, setShowImageViewer] = useState(false); // Image viewer modal
  const [lastReadMap, setLastReadMap] = useState({}); // userId -> { messageId, readAt }
  const [selectedImageIndex, setSelectedImageIndex] = useState(0); // Image index for viewer
  const scrollViewRef = useRef();
  const messageInputRef = useRef();
  const messageRefs = useRef({}); // Refs cho từng tin nhắn để scroll
  const messagePositions = useRef({}); // store measured y offsets for messages
  const navigation = useNavigation();
  const route = useRoute();
  const { conversationId, groupName } = route.params;

  // If navigated from PinnedMessages with a messageId to scroll to
  useEffect(() => {
    const scrollToId = route.params?.scrollToMessageId;
    console.log("[GroupChat] useEffect scrollToMessageId:", {
      scrollToId,
      hasMessages: messages && messages.length > 0,
      messagesCount: messages?.length,
      routeParams: route.params,
      loading: loading,
    });

    if (scrollToId && messages && messages.length > 0 && !loading) {
      // delay để đảm bảo layout đã sẵn sàng
      setTimeout(async () => {
        console.log("[GroupChat] Attempting to scroll to message:", scrollToId);
        // don't show an alert if message not found via route param
        await scrollToMessage(scrollToId, { showNotFoundAlert: true });
      }, 800); // Tăng delay lên 800ms để đảm bảo layout đã render xong
    }
  }, [route.params?.scrollToMessageId, messages, loading]);

  useEffect(() => {
    loadGroupData();
  }, [conversationId]);

  // When opening the group, notify server to bulk-mark reads (OpenGroup)
  useEffect(() => {
    const doOpenGroup = async () => {
      try {
        // determine last message id (newest) in current messages
        const lastMsg =
          messages && messages.length > 0
            ? messages[messages.length - 1]
            : null;
        const lastId =
          lastMsg && (lastMsg.id || lastMsg.messageId)
            ? Number(lastMsg.id || lastMsg.messageId)
            : 0;
        if (
          signalRService &&
          signalRService.chatConnection &&
          signalRService.chatConnection.state === 1
        ) {
          try {
            await signalRService.invokeOpenGroup(
              String(conversationId),
              lastId
            );
            console.log(
              "[GroupChat] Invoked OpenGroup via SignalR",
              conversationId,
              lastId
            );
          } catch (e) {
            console.warn("[GroupChat] OpenGroup SignalR invoke failed", e);
          }
        } else {
          // Optionally call REST fallback if you have one
          try {
            if (
              groupChatService &&
              typeof groupChatService.openGroup === "function"
            ) {
              await groupChatService.openGroup(conversationId, lastId);
              console.log(
                "[GroupChat] OpenGroup REST fallback called",
                conversationId,
                lastId
              );
            }
          } catch (e) {
            /* ignore */
          }
        }
      } catch (err) {
        console.warn("[GroupChat] doOpenGroup failed", err);
      }
    };

    // Call once on mount / when conversation changes
    doOpenGroup();
  }, [conversationId, messages]);

  // Generate thumbnails for video messages and cache them
  useEffect(() => {
    let mounted = true;
    const generate = async () => {
      try {
        if (!messages || messages.length === 0) return;
        const need = messages.filter(
          (m) =>
            (m.mediaType === "video" || m.messageType === "video") &&
            !m.thumbnailUri &&
            (m.mediaUri || m.fileUrl)
        );
        if (need.length === 0) return;

        const updates = {};
        for (const m of need) {
          const uri = m.mediaUri || m.fileUrl;
          const key = `video_thumb_${encodeURIComponent(uri)}`;
          try {
            const cached = await AsyncStorage.getItem(key);
            if (cached) {
              updates[m.id] = cached;
              continue;
            }
          } catch {}

          try {
            const { uri: thumb } = await VideoThumbnails.getThumbnailAsync(
              uri,
              { time: 1000 }
            );
            if (thumb) {
              try {
                await AsyncStorage.setItem(key, thumb);
              } catch {}
              updates[m.id] = thumb;
            }
          } catch (err) {
            console.log(
              "[GroupChat] thumbnail error for",
              uri,
              err?.message || err
            );
          }
        }

        if (mounted && Object.keys(updates).length > 0) {
          setMessages((prev) =>
            prev.map((pm) => ({
              ...pm,
              ...(updates[pm.id] ? { thumbnailUri: updates[pm.id] } : {}),
            }))
          );
        }
      } catch (err) {
        console.error("[GroupChat] generate thumbnails error", err);
      }
    };
    generate();
    return () => {
      mounted = false;
    };
  }, [messages]);

  // DEBUG: Log khi showMentionList thay đổi
  useEffect(() => {
    console.log("[GroupChat] showMentionList changed:", showMentionList, {
      members: members.length,
      currentUserId: currentUserId,
      mentionSearch: mentionSearch,
      mentionStartIndex: mentionStartIndex,
    });
    if (showMentionList) {
      const mentionableMembers = getMentionableMembers();
      console.log(
        "[GroupChat] Mentionable members when list shows:",
        mentionableMembers.length,
        mentionableMembers.map((m) => m.username)
      );
    }
  }, [showMentionList]);

  // Reload khi screen được focus (để cập nhật khi đổi tài khoản)
  useFocusEffect(
    useCallback(() => {
      const checkAndReload = async () => {
        const userStr = await AsyncStorage.getItem("user");
        const userId = userStr
          ? JSON.parse(userStr).user_id || JSON.parse(userStr).userId
          : null;

        // Nếu userId thay đổi, reload lại
        if (userId && userId !== currentUserId) {
          console.log(
            "[GroupChat] User changed, reloading...",
            "old:",
            currentUserId,
            "new:",
            userId
          );
          loadGroupData();
        }
      };

      checkAndReload();
    }, [currentUserId])
  );

  // ✅ NEW: SignalR Setup - Connect and listen to real-time events
  useEffect(() => {
    let mounted = true;

    const setupSignalR = async () => {
      if (!currentUserId) {
        console.log(
          "[GroupChat] Skipping SignalR setup until currentUserId is available"
        );
        return;
      }
      try {
        console.log(
          "[GroupChat] Setting up SignalR for conversation:",
          conversationId
        );

        // Connect to chat hub
        await signalRService.connectToChat();

        // Join this group
        await signalRService.joinGroup(conversationId);

        // ✅ Listen for new messages (defensive)
        signalRService.onReceiveMessage((...args) => {
          if (!mounted) return;

          // Normalize payload: server may send (conversationId, message) or just (message)
          let payload = null;
          try {
            for (const a of args) {
              if (
                a &&
                typeof a === "object" &&
                (a.id || a.messageId || a.content || a.createdAt || a.fileUrl)
              ) {
                payload = a;
                break;
              }
            }
            if (!payload) payload = args[0] || null;
          } catch (e) {
            console.warn("[SignalR] ReceiveMessage normalization error", e);
            payload = args[0] || null;
          }

          console.log("[SignalR] ReceiveMessage payload:", payload);

          if (!payload || typeof payload !== "object") {
            console.warn(
              "[GroupChat] Ignoring invalid ReceiveMessage payload",
              payload
            );
            return;
          }

          // Build normalized message object (defensive parsing)
          const rawTimestamp =
            payload.timestamp ||
            payload.createdAt ||
            payload.created_at ||
            null;
          const parsedTs = rawTimestamp ? new Date(rawTimestamp) : null;
          const timestampValid = parsedTs && !isNaN(parsedTs.getTime());

          const newMessage = {
            id: payload.id || payload.messageId || null,
            userId: payload.userId || payload.user_id || null,
            userName:
              payload.userName || payload.user_name || payload.user || null,
            userAvatar: payload.userAvatar || payload.user_avatar || null,
            message: payload.content || payload.message || null,
            timestamp: timestampValid ? parsedTs.toISOString() : null,
            messageType: payload.messageType || payload.MessageType || null,
            mediaUri: payload.fileUrl || payload.file_url || null,
            mediaType:
              payload.messageType === "text" || payload.MessageType === "text"
                ? null
                : payload.messageType || payload.MessageType || null,
            fileUrl: payload.fileUrl || payload.file_url || null,
            replyTo: payload.replyTo || payload.ReplyTo || null,
            reactions: payload.reactions || payload.Reactions || {},
            readBy: payload.readBy || payload.ReadBy || [],
            isMine:
              String(payload.userId || payload.user_id) ===
              String(currentUserId),
          };

          // Skip malformed messages: empty sender, empty content and no media, or invalid timestamp
          const hasSender =
            newMessage.userId !== null &&
            newMessage.userId !== undefined &&
            String(newMessage.userId).trim() !== "";
          const hasContentOrMedia =
            (newMessage.message && String(newMessage.message).trim() !== "") ||
            newMessage.mediaUri ||
            newMessage.fileUrl;
          const hasValidTimestamp = newMessage.timestamp !== null;

          if (!hasSender || !hasContentOrMedia || !hasValidTimestamp) {
            console.warn(
              "[GroupChat] Skipping malformed message (sender/content/timestamp invalid):",
              { hasSender, hasContentOrMedia, hasValidTimestamp, payload }
            );
            return;
          }

          setMessages((prev) => {
            // If server provided clientTempId, reconcile optimistic message (replace temp)
            const tempId = payload.clientTempId || payload.clientTempID || null;
            if (tempId) {
              const idx = prev.findIndex(
                (m) => m.id === tempId || m.tempId === tempId
              );
              if (idx >= 0) {
                console.log('[SignalR] Replacing optimistic message:', tempId, '→', newMessage.id);
                const copy = [...prev];
                copy[idx] = { ...newMessage };
                try {
                  groupChatService
                    .removePendingMessage(conversationId, tempId)
                    .catch((e) =>
                      console.warn("[GroupChat] removePendingMessage failed", e)
                    );
                } catch (e) {
                  console.warn(
                    "[GroupChat] removePendingMessage sync error",
                    e
                  );
                }
                return copy;
              }
            }

            // ✅ Prevent duplicate by checking both id and tempId
            if (newMessage.id) {
              const exists = prev.find((m) => 
                String(m.id) === String(newMessage.id) || 
                String(m.tempId) === String(newMessage.id)
              );
              if (exists) {
                console.log('[SignalR] Message already exists, skipping:', newMessage.id);
                return prev;
              }
            }
            
            console.log('[SignalR] Adding new message:', newMessage.id);
            const combined = [...prev, newMessage];
            combined.sort(
              (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
            );
            return combined;
          });

          // If server included readBy info for this message, update lastReadMap so markers appear immediately
          try {
            const rb = payload.readBy || [];
            if (Array.isArray(rb) && rb.length > 0) {
              setLastReadMap((prev) => {
                const copy = { ...(prev || {}) };
                for (const r of rb) {
                  try {
                    const readerId = String(r.user_id || r.userId || r);
                    if (!readerId) continue;
                    // place this reader's last-read at this message (server sent this read info)
                    copy[readerId] = {
                      messageId: String(newMessage.id),
                      readAt: r.readAt || new Date().toISOString(),
                    };
                  } catch (e) {
                    /* ignore per-reader errors */
                  }
                }
                return copy;
              });
            }
          } catch (e) {
            console.warn(
              "[GroupChat] onReceiveMessage update lastReadMap failed",
              e
            );
          }

          // Scroll to bottom
          setTimeout(() => {
            scrollViewRef.current?.scrollToEnd({ animated: true });
          }, 100);
        });

        // ✅ Listen for read receipts
        signalRService.onMessageRead((data) => {
          if (!mounted) return;

          console.log("[SignalR] MessageRead:", data);

          // Update per-message readBy (keep for compatibility) and update lastReadMap to place
          // the user's read marker on their latest-read message.
          setMessages((prev) =>
            prev.map((msg) => {
              if (msg.id === data.messageId) {
                const newReadBy = [...(msg.readBy || [])];
                // Add if not already in list
                if (
                  !newReadBy.find(
                    (r) => String(r.userId) === String(data.userId)
                  )
                ) {
                  newReadBy.push({
                    userId: data.userId,
                    readAt: data.readAt,
                  });
                }
                return { ...msg, readBy: newReadBy };
              }
              return msg;
            })
          );

          try {
            setLastReadMap((prev) => {
              const copy = { ...(prev || {}) };
              const uid = String(data.userId);
              const existing = copy[uid];
              // Only advance forward (message ids assumed increasing)
              if (
                !existing ||
                (data.messageId &&
                  Number(data.messageId) >= Number(existing.messageId))
              ) {
                copy[uid] = {
                  messageId: data.messageId,
                  readAt: data.readAt || new Date().toISOString(),
                };
              }
              return copy;
            });
          } catch (e) {
            console.warn("[GroupChat] update lastReadMap failed", e);
          }
        });

        // ✅ Listen for reactions
        signalRService.onReactionAdded((data) => {
          if (!mounted) return;

          console.log("[SignalR] ReactionAdded:", data);

          setMessages((prev) =>
            prev.map((msg) => {
              if (msg.id === data.messageId) {
                return { ...msg, reactions: data.reactions || {} };
              }
              return msg;
            })
          );
        });

        signalRService.onReactionRemoved((data) => {
          if (!mounted) return;

          console.log("[SignalR] ReactionRemoved:", data);

          setMessages((prev) =>
            prev.map((msg) => {
              if (msg.id === data.messageId) {
                return { ...msg, reactions: data.reactions || {} };
              }
              return msg;
            })
          );
        });

        // ✅ Listen for server notification that a client-side optimistic message failed to save
        signalRService.onMessageSaveFailed((data) => {
          if (!mounted) return;
          try {
            console.log("[SignalR] MessageSaveFailed:", data);
            const clientTempId = data?.clientTempId || data?.clientTempID;
            if (!clientTempId) return;

            setMessages((prev) =>
              prev.filter(
                (m) => !(m.id === clientTempId || m.tempId === clientTempId)
              )
            );
          } catch (err) {
            console.error("Error handling MessageSaveFailed:", err);
          }
        });

        // Listen for group avatar updates so this chat header updates when changed elsewhere
        signalRService.onGroupAvatarUpdated(async (payload) => {
          try {
            if (!mounted || !payload) return;
            const convId = Number(
              payload.conversationId || payload.conversationId
            );
            const avatarUrl = payload.avatarUrl;
            if (String(convId) !== String(conversationId)) return; // only care about this conversation

            // Persist override locally so it survives reloads
            try {
              await AsyncStorage.setItem(`groupAvatar_${convId}`, avatarUrl);
            } catch (e) {
              console.warn("[GroupChat] save avatar override failed", e);
            }

            // Update local state
            setGroupInfo((prev) => ({ ...(prev || {}), avatarUrl }));
            console.log(
              "[GroupChat] Applied GroupAvatarUpdated payload",
              payload
            );
          } catch (e) {
            console.error("[GroupChat] onGroupAvatarUpdated handler error", e);
          }
        });

        // Listen for group name updates so this chat header updates when changed elsewhere
        signalRService.onGroupNameUpdated(async (payload) => {
          try {
            if (!mounted || !payload) return;
            const convId = Number(
              payload.conversationId || payload.conversationId
            );
            const newName = payload.newName || payload.name || payload.Name;
            if (String(convId) !== String(conversationId)) return;

            // Persist override locally so it survives reloads
            try {
              const key = `groupInfo_${convId}`;
              const saved = await AsyncStorage.getItem(key);
              const info = saved ? JSON.parse(saved) : {};
              info.name = newName;
              await AsyncStorage.setItem(key, JSON.stringify(info));
            } catch (e) {
              console.warn("[GroupChat] save group name override failed", e);
            }

            // Update local state
            setGroupInfo((prev) => ({ ...(prev || {}), name: newName }));
            console.log(
              "[GroupChat] Applied GroupNameUpdated payload",
              payload
            );
          } catch (e) {
            console.error("[GroupChat] onGroupNameUpdated handler error", e);
          }
        });

        console.log("[GroupChat] SignalR setup complete");
      } catch (error) {
        console.error("[GroupChat] SignalR setup error:", error);
      }
    };

    setupSignalR();

    // Cleanup
    return () => {
      mounted = false;
      console.log("[GroupChat] Cleaning up SignalR...");
      // Flush pending optimistic messages before leaving the group
      try {
        groupChatService
          .flushPendingMessages(conversationId)
          .catch((e) =>
            console.warn(
              "[GroupChat] flushPendingMessages failed on cleanup",
              e
            )
          );
      } catch (e) {
        console.warn("[GroupChat] flushPendingMessages sync error", e);
      }
      signalRService
        .leaveGroup(conversationId)
        .catch((err) => console.error("Error leaving group:", err));
    };
  }, [conversationId, currentUserId]);

  // Ensure pending optimistic messages are flushed when screen is unfocused
  useFocusEffect(
    useCallback(() => {
      return () => {
        try {
          groupChatService
            .flushPendingMessages(conversationId)
            .catch((e) =>
              console.warn("[GroupChat] flushPendingMessages failed on blur", e)
            );
        } catch (e) {
          console.warn(
            "[GroupChat] flushPendingMessages sync error on blur",
            e
          );
        }
      };
    }, [conversationId])
  );

  // Prevent leaving the screen while there are pending optimistic messages.
  useEffect(() => {
    const beforeRemoveHandler = (e) => {
      // If there are pending messages, block navigation and flush first
      e.preventDefault();

      (async () => {
        try {
          const pending = await groupChatService.getPendingMessages(
            conversationId
          );
          if (pending && pending.length > 0) {
            console.log(
              "[GroupChat] Pending messages detected on navigation - flushing",
              pending.length
            );
            await groupChatService.flushPendingMessages(conversationId);
            console.log("[GroupChat] Pending messages flushed");
          }
        } catch (err) {
          console.warn(
            "[GroupChat] Error flushing pending messages on beforeRemove",
            err
          );
        } finally {
          // Now allow the navigation to proceed
          navigation.dispatch(e.data.action);
        }
      })();
    };

    const unsub = navigation.addListener("beforeRemove", beforeRemoveHandler);
    return () => {
      try {
        unsub();
      } catch (e) {}
    };
  }, [conversationId, navigation]);

  // ✅ NEW: Auto-mark messages as read (after 1 second in viewport)
  useEffect(() => {
    if (!currentUserId || messages.length === 0) return;

    const timer = setTimeout(() => {
      // Find unread messages from others
      const unreadMessages = messages.filter((msg) => {
        if (msg.isMine) return false; // Skip own messages

        // Check if already read by current user
        let readBy = [];
        try {
          if (typeof msg.readBy === "string") {
            readBy = JSON.parse(msg.readBy);
          } else if (Array.isArray(msg.readBy)) {
            readBy = msg.readBy;
          }
        } catch (error) {
          readBy = [];
        }

        const alreadyRead = readBy.some((r) => {
          const readerId = r.user_id || r.userId || r;
          return Number(readerId) === Number(currentUserId);
        });

        return !alreadyRead;
      });

      // Mark unread messages as read using SignalR when available (real-time broadcast + persist)
      const idsToMark = unreadMessages.map((m) => m.id).filter(Boolean);
      if (idsToMark.length === 0) return;

      (async () => {
        try {
          if (
            signalRService &&
            signalRService.chatConnection &&
            signalRService.chatConnection.state === 1 /* Connected */
          ) {
            // Use SignalR to mark messages as read so server will broadcast to group
            await signalRService.markMessagesAsRead(conversationId, idsToMark);
            console.log(
              "[GroupChat] Marked messages as read via SignalR:",
              idsToMark
            );
            // Optimistically update lastReadMap for current user to the latest message marked
            try {
              const maxId = idsToMark
                .map((id) => Number(id))
                .filter((n) => !isNaN(n))
                .reduce((a, b) => Math.max(a, b), 0);
              if (maxId > 0 && currentUserId) {
                setLastReadMap((prev) => ({
                  ...(prev || {}),
                  [String(currentUserId)]: {
                    messageId: String(maxId),
                    readAt: new Date().toISOString(),
                  },
                }));
              }
            } catch (e) {
              console.warn(
                "[GroupChat] optimistic lastReadMap update failed",
                e
              );
            }
          } else {
            // Fallback to REST API if SignalR not connected
            for (const id of idsToMark) {
              try {
                await groupChatService.markMessageAsRead(id);
              } catch (err) {
                console.error(
                  "[GroupChat] markMessageAsRead fallback error for",
                  id,
                  err
                );
              }
            }
            console.log(
              "[GroupChat] Marked messages as read via REST fallback:",
              idsToMark
            );
          }
        } catch (error) {
          console.error("[GroupChat] Error marking messages as read:", error);
        }
      })();
    }, 1000); // Wait 1 second before marking as read

    return () => clearTimeout(timer);
  }, [messages, currentUserId]);

  const loadGroupData = async () => {
    try {
      setLoading(true);

      // Lấy current user ID TRƯỚC: try 'user', then 'userInfo', then fallback to API profile
      let userId = null;
      try {
        let userStr = await AsyncStorage.getItem("user");
        if (!userStr) userStr = await AsyncStorage.getItem("userInfo");
        if (userStr) {
          const user = JSON.parse(userStr);
          userId = user.user_id || user.userId;
          setCurrentUserId(userId);
          console.log(
            "[GroupChat] loadGroupData - Current userId from storage:",
            userId
          );
        } else {
          // Fallback: call profile API (may refresh token internally)
          try {
            const profile = await getProfile();
            if (profile) {
              await AsyncStorage.setItem("userInfo", JSON.stringify(profile));
              userId = profile.userId || profile.user_id;
              setCurrentUserId(userId);
              console.log(
                "[GroupChat] loadGroupData - Current userId from API profile:",
                userId
              );
            }
          } catch (err) {
            console.warn("[GroupChat] getProfile fallback failed:", err);
          }
        }
      } catch (err) {
        console.warn(
          "[GroupChat] Error reading user from storage or profile API:",
          err
        );
      }

      // Lấy thông tin nhóm và thành viên
      const [groupData, membersData] = await Promise.all([
        getGroupInfo(conversationId),
        getGroupMembers(conversationId),
      ]);

      // Check if there's a saved avatar in AsyncStorage
      const savedAvatarKey = `groupAvatar_${conversationId}`;
      const savedAvatar = await AsyncStorage.getItem(savedAvatarKey);

      if (savedAvatar) {
        groupData.avatarUrl = savedAvatar;
      }

      setGroupInfo(groupData);
      setMembers(membersData);

      // DEBUG: Log members để xem cấu trúc
      console.log(
        "[GroupChat] Members loaded:",
        JSON.stringify(membersData, null, 2)
      );
      if (membersData.length > 0) {
        console.log("[GroupChat] First member structure:", {
          userId: membersData[0].userId,
          username: membersData[0].username,
          fullName: membersData[0].fullName,
          avatarUrl: membersData[0].avatarUrl,
        });
      }

      // Xóa các tin nhắn cục bộ không tồn tại trên server (không có trong DB)
      try {
        await groupChatService.purgeLocalUnsavedMessages(conversationId);
        console.log(
          "[GroupChat] Purged local unsaved messages for conversation",
          conversationId
        );
      } catch (err) {
        console.warn("[GroupChat] purgeLocalUnsavedMessages failed:", err);
      }

      // Load messages từ server (PHẢI load SAU khi có userId và members)
      await loadMessages();
    } catch (error) {
      console.error("Load group data error:", error);
      Alert.alert("Lỗi", "Không thể tải dữ liệu nhóm");
    } finally {
      setLoading(false);
    }
  };

  // ✅ NEW: Load messages from API with pagination
  const loadMessages = async (pageNum = 1, append = false) => {
    try {
      // Set loading state
      if (pageNum === 1) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      // Get current user
      let userStr = await AsyncStorage.getItem("user");
      if (!userStr) {
        userStr = await AsyncStorage.getItem("userInfo");
      }

      if (!userStr) {
        console.error("[GroupChat] No user found in AsyncStorage");
        Alert.alert("Lỗi", "Vui lòng đăng nhập lại");
        navigation.navigate("Login");
        return;
      }

      const user = JSON.parse(userStr);
      const userId = user.userId || user.user_id;

      if (!userId) {
        console.error("[GroupChat] userId is null/undefined!");
        Alert.alert("Lỗi", "Thông tin người dùng không hợp lệ");
        return;
      }

      console.log(
        "[GroupChat] Loading messages from API, page:",
        pageNum,
        "userId:",
        userId
      );

      // ✅ Fetch from API
      const PAGE_SIZE = 10;
      let data = null;
      let usedPage = pageNum;

      if (pageNum === 1 && !append) {
        // initial load: ask for a tiny page to get totalCount then fetch the last page
        try {
          const meta = await groupChatService.getMessages(conversationId, 1, 1);
          const total = Number(meta?.totalCount ?? meta?.total ?? 0) || 0;
          const lastPage = Math.max(1, Math.ceil(total / PAGE_SIZE));
          usedPage = lastPage;
          data = await groupChatService.getMessages(
            conversationId,
            usedPage,
            PAGE_SIZE
          );
          if (
            (!data || !data.messages || data.messages.length === 0) &&
            total > 0 &&
            usedPage > 1
          ) {
            usedPage = Math.max(1, usedPage - 1);
            data = await groupChatService.getMessages(
              conversationId,
              usedPage,
              PAGE_SIZE
            );
          }
        } catch (err) {
          console.warn(
            "[GroupChat] initial last-page fetch failed, falling back",
            err
          );
          data = await groupChatService.getMessages(
            conversationId,
            pageNum,
            PAGE_SIZE
          );
          usedPage = pageNum;
        }
      } else {
        data = await groupChatService.getMessages(
          conversationId,
          pageNum,
          PAGE_SIZE
        );
        usedPage = pageNum;
      }

      console.log("[GroupChat] API Response:", data);
      
      // ✅ FIX: Handle wrapped response {success, data: {messages, totalCount}}
      const actualData = data?.data || data;
      const messagesList = actualData?.messages || actualData?.Messages || [];
      
      console.log(
        "[GroupChat] Loaded messages:",
        messagesList.length,
        "total:",
        actualData?.totalCount || actualData?.TotalCount
      );

      if (!messagesList || messagesList.length === 0) {
        console.log("[GroupChat] No messages returned from API");
        setMessages([]);
        setHasMore(false);
        return;
      }

      // Map API response to component state
      // Handle both PascalCase and camelCase from backend
      const mappedMessages = messagesList.map((msg) => ({
        id: msg.messageId || msg.MessageId, // DB ID (integer)
        userId: msg.userId || msg.UserId,
        userName: msg.userName || msg.UserName, // ✅ From API, not members array
        userAvatar: msg.userAvatar || msg.UserAvatar, // ✅ From API
        message: msg.content || msg.Content,
        timestamp: new Date(msg.createdAt || msg.CreatedAt),
        messageType: msg.messageType || msg.MessageType || "text",
        mediaUri: msg.fileUrl || msg.FileUrl, // Rename for compatibility
        mediaType:
          (msg.messageType || msg.MessageType) === "text"
            ? null
            : msg.messageType || msg.MessageType,
        fileUrl: msg.fileUrl || msg.FileUrl,
        replyTo:
          msg.replyTo || msg.ReplyTo
            ? {
                // ✅ Thread support
                id:
                  (msg.replyTo || msg.ReplyTo).messageId ||
                  (msg.replyTo || msg.ReplyTo).MessageId,
                userId:
                  (msg.replyTo || msg.ReplyTo).userId ||
                  (msg.replyTo || msg.ReplyTo).UserId,
                userName:
                  (msg.replyTo || msg.ReplyTo).userName ||
                  (msg.replyTo || msg.ReplyTo).UserName,
                message:
                  (msg.replyTo || msg.ReplyTo).content ||
                  (msg.replyTo || msg.ReplyTo).Content,
                mediaUri:
                  (msg.replyTo || msg.ReplyTo).fileUrl ||
                  (msg.replyTo || msg.ReplyTo).FileUrl,
                messageId:
                  (msg.replyTo || msg.ReplyTo).messageId ||
                  (msg.replyTo || msg.ReplyTo).MessageId,
              }
            : null,
        reactions: msg.reactions || msg.Reactions || {}, // ✅ Reactions from DB
        readBy: msg.readBy || msg.ReadBy || [], // ✅ Read receipts from DB
        isMine: (msg.userId || msg.UserId) === userId,
      }));

      console.log("[GroupChat] Mapped messages sample:", mappedMessages[0]);

      // Ensure chronological order (oldest first) and deduplicate by id
      mappedMessages.sort(
        (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
      );

      // If server returned the entire history in a single response (totalCount equals returned length),
      // trim to the last PAGE_SIZE messages so the UI opens at the newest messages and pagination still works.
      try {
        const totalReported = Number(data?.totalCount ?? data?.total ?? 0) || 0;
        if (
          totalReported > 0 &&
          Array.isArray(data.messages) &&
          data.messages.length === totalReported &&
          totalReported > PAGE_SIZE &&
          !append
        ) {
          console.warn(
            "[GroupChat] Server returned full history in one response; trimming to last PAGE_SIZE messages"
          );
          const start = Math.max(0, mappedMessages.length - PAGE_SIZE);
          const tail = mappedMessages.slice(start);
          // reflect trimmed list
          mappedMessages.length = 0;
          Array.prototype.push.apply(mappedMessages, tail);
          // mark that there are older pages available
          setHasMore(true);
          // compute usedPage as last page
          const inferredLastPage = Math.max(
            1,
            Math.ceil(totalReported / PAGE_SIZE)
          );
          usedPage = inferredLastPage;
        }
      } catch (e) {
        console.warn("[GroupChat] trimming fallback failed", e);
      }

      // Compute per-user last-read map: iterate chronologically so later messages override earlier reads
      try {
        const map = {};
        for (const m of mappedMessages) {
          const readList = m.readBy || [];
          if (readList && Array.isArray(readList)) {
            for (const r of readList) {
              try {
                const readerId = String(r.user_id || r.userId || r);
                if (!readerId) continue;
                // Always set/override since messages are chronological (later messages overwrite earlier)
                map[readerId] = {
                  messageId: String(m.id),
                  readAt: r.readAt || new Date().toISOString(),
                };
              } catch (e) {
                /* ignore malformed entries */
              }
            }
          }
        }
        setLastReadMap(map);
      } catch (e) {
        console.warn("[GroupChat] compute lastReadMap failed", e);
      }

      if (append) {
        // Append older messages at the start and keep chronological order
        setMessages((prev) => {
          const combined = [...mappedMessages, ...prev];
          const seen = new Map();
          
          // ✅ Deduplicate: prefer real messages over temp/pending messages
          combined.forEach((m) => {
            if (!m || m.id == null) return;
            
            const key = String(m.id);
            const existing = seen.get(key);
            
            // If existing is temp/pending, replace with real message
            if (existing && (existing.tempId || existing.pending) && !m.tempId && !m.pending) {
              console.log('[GroupChat] Replacing temp message with real:', key);
              seen.set(key, m);
            } else if (!existing) {
              seen.set(key, m);
            }
            // else keep existing real message
          });
          
          const result = Array.from(seen.values()).sort(
            (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
          );
          
          console.log('[GroupChat] After deduplication:', result.length, 'messages');
          return result;
        });
      } else {
        // Replace for initial load
        setMessages(mappedMessages);
        // Defensive one-time instant scroll to bottom after initial render so user lands at newest message
        setTimeout(() => {
          try {
            if (!initialScrollDoneRef.current) {
              // instant jump (no animation) on first render
              scrollViewRef.current?.scrollToEnd({ animated: false });
              initialScrollDoneRef.current = true;
            }
          } catch (e) {
            /* ignore */
          }
        }, 150);
      }

      try {
        if (typeof data.hasMore !== "undefined")
          setHasMore(Boolean(data.hasMore));
        else setHasMore(usedPage > 1);
      } catch (e) {
        setHasMore(usedPage > 1);
      }

      setPage(usedPage);

      console.log(
        "[GroupChat] Messages state updated, total:",
        append ? messages.length + mappedMessages.length : mappedMessages.length
      );
    } catch (error) {
      console.error("[GroupChat] Load messages error:", error);
      Alert.alert("Lỗi", "Không thể tải tin nhắn. Vui lòng thử lại.");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  // ✅ NEW: Handle load more messages (pagination)
  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      console.log("[GroupChat] Loading more messages, page:", page + 1);
      loadMessages(page + 1, true); // append=true
    }
  };

  const handleSend = async (mediaUri = null, mediaType = null) => {
    if (!message.trim() && !mediaUri) return;

    try {
      // Get current user
      let userStr = await AsyncStorage.getItem("user");
      if (!userStr) {
        userStr = await AsyncStorage.getItem("userInfo");
      }

      if (!userStr) {
        Alert.alert("Lỗi", "Vui lòng đăng nhập lại");
        return;
      }

      const currentUser = JSON.parse(userStr);
      const userId = currentUser?.userId || currentUser?.user_id;

      if (!userId) {
        Alert.alert("Lỗi", "Thông tin người dùng không hợp lệ");
        return;
      }

      console.log("[GroupChat] Sending message, userId:", userId);

      // Determine message type: prefer mediaType when sending media, detect link messages
      let sendType = mediaType || "text";
      if (!mediaUri && message && /^https?:\/\//i.test(message.trim())) {
        sendType = "link";
      }

      // Prefer sending via SignalR hub when connected (lower latency, server will persist and broadcast)
      const sendViaSignalR =
        signalRService &&
        signalRService.chatConnection &&
        signalRService.chatConnection.state ===
          SignalR.HubConnectionState.Connected;

      // Prepare DTO similar to SendGroupMessageDto
      const clientTempId = `temp-${Date.now()}`;
      // Server-side DTO uses PascalCase property names; SignalR hub deserializes using System.Text.Json
      // which is case-sensitive here, so send PascalCase keys to match SendGroupMessageDto
      const dto = {
        ConversationId: conversationId,
        Content: message.trim() || "",
        MessageType: sendType,
        FileUrl: mediaUri || null,
        ReplyToMessageId: replyingTo?.id || null,
        ClientTempId: clientTempId,
      };

      if (sendViaSignalR) {
        try {
          // Optimistic UI: add temp message to state (will be reconciled when ReceiveMessage arrives)
          const optimistic = {
            id: clientTempId,
            tempId: clientTempId,
            userId: userId,
            userName: currentUser?.fullName || currentUser?.username || "Bạn",
            userAvatar: null,
            message: message.trim(),
            timestamp: new Date().toISOString(),
            messageType: sendType,
            mediaUri: mediaUri,
            mediaType: mediaType,
            fileUrl: mediaUri,
            replyTo: replyingTo || null,
            reactions: {},
            readBy: [],
            isMine: true,
          };

          setMessages((prev) => [...prev, optimistic]);
          // Persist optimistic message in local pending queue so it won't be lost if user leaves
          try {
            await groupChatService.queuePendingMessage(
              conversationId,
              optimistic
            );
            console.log("[GroupChat] queued optimistic message", clientTempId);
          } catch (e) {
            console.warn("[GroupChat] queuePendingMessage failed", e);
          }

          // Invoke hub - server will persist and broadcast ReceiveMessage
          await signalRService.sendMessage(conversationId, dto);
          console.log(
            "[GroupChat] Sent message via SignalR, tempId:",
            clientTempId
          );
        } catch (err) {
          console.error(
            "[GroupChat] SignalR send failed, falling back to REST:",
            err
          );
          // Fallback to REST
          const savedMessage = await groupChatService.sendMessage(
            conversationId,
            message.trim(),
            sendType,
            mediaUri,
            replyingTo?.id || null,
            clientTempId
          );

          const newMessage = {
            id: savedMessage.messageId || savedMessage.MessageId,
            userId: savedMessage.userId || savedMessage.UserId,
            userName: savedMessage.userName || savedMessage.UserName,
            userAvatar: savedMessage.userAvatar || savedMessage.UserAvatar,
            message: savedMessage.content || savedMessage.Content,
            timestamp: new Date(
              savedMessage.createdAt || savedMessage.CreatedAt
            ),
            messageType:
              savedMessage.messageType || savedMessage.MessageType || "text",
            mediaUri: savedMessage.fileUrl || savedMessage.FileUrl,
            mediaType:
              (savedMessage.messageType || savedMessage.MessageType) === "text"
                ? null
                : savedMessage.messageType || savedMessage.MessageType,
            fileUrl: savedMessage.fileUrl || savedMessage.FileUrl,
            replyTo: savedMessage.replyTo || savedMessage.ReplyTo,
            reactions: savedMessage.reactions || savedMessage.Reactions || {},
            readBy: savedMessage.readBy || savedMessage.ReadBy || [],
            isMine: true,
          };
          setMessages((prev) => [...prev, newMessage]);
        }
      } else {
        // SignalR not connected => use REST API
        const savedMessage = await groupChatService.sendMessage(
          conversationId,
          message.trim(),
          sendType,
          mediaUri,
          replyingTo?.id || null,
          clientTempId
        );

        const newMessage = {
          id: savedMessage.messageId || savedMessage.MessageId,
          userId: savedMessage.userId || savedMessage.UserId,
          userName: savedMessage.userName || savedMessage.UserName,
          userAvatar: savedMessage.userAvatar || savedMessage.UserAvatar,
          message: savedMessage.content || savedMessage.Content,
          timestamp: new Date(savedMessage.createdAt || savedMessage.CreatedAt),
          messageType:
            savedMessage.messageType || savedMessage.MessageType || "text",
          mediaUri: savedMessage.fileUrl || savedMessage.FileUrl,
          mediaType:
            (savedMessage.messageType || savedMessage.MessageType) === "text"
              ? null
              : savedMessage.messageType || savedMessage.MessageType,
          fileUrl: savedMessage.fileUrl || savedMessage.FileUrl,
          replyTo: savedMessage.replyTo || savedMessage.ReplyTo,
          reactions: savedMessage.reactions || savedMessage.Reactions || {},
          readBy: savedMessage.readBy || savedMessage.ReadBy || [],
          isMine: true,
        };

        setMessages((prev) => [...prev, newMessage]);
      }

      // Clear input
      setMessage("");
      setReplyingTo(null);
      Keyboard.dismiss();

      // Scroll to bottom
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      console.error("[GroupChat] Send message error:", error);
      Alert.alert("Lỗi", "Không thể gửi tin nhắn. Vui lòng thử lại.");
    }
  };

  const handlePickMedia = async (type) => {
    try {
      const permissionResult =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permissionResult.granted) {
        Alert.alert("Thông báo", "Cần cấp quyền truy cập thư viện ảnh");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes:
          type === "video"
            ? ImagePicker.MediaTypeOptions.Videos
            : ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: type === "video" ? 0.8 : 0.9,
        videoMaxDuration: 30, // 30 seconds max
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];

        // Validate video duration
        if (type === "video" && asset.duration && asset.duration > 30000) {
          Alert.alert("Thông báo", "Video không được quá 30 giây");
          return;
        }

        setShowMediaPicker(false);
        await handleSend(asset.uri, type);
      }
    } catch (error) {
      console.error("Pick media error:", error);
      Alert.alert("Lỗi", "Không thể chọn file");
    }
  };

  const handleEmojiSelect = (emoji) => {
    setMessage(message + emoji);
    setShowEmojiPicker(false);
  };

  // Xử lý khi thay đổi text input
  const handleMessageChange = (text) => {
    setMessage(text);

    console.log(
      "[GroupChat] Text changed:",
      text,
      "Current members:",
      members.length,
      "currentUserId:",
      currentUserId
    );

    // Tìm @ gần nhất (tìm từ cuối về đầu)
    const lastAtIndex = text.lastIndexOf("@");

    if (lastAtIndex !== -1) {
      // Lấy text sau @ (đến cuối string)
      const textAfterAt = text.substring(lastAtIndex + 1);

      console.log(
        "[GroupChat] Found @ at index:",
        lastAtIndex,
        "Text after @:",
        textAfterAt
      );

      // Tìm space hoặc newline ĐẦU TIÊN sau @
      const spaceIndex = textAfterAt.search(/[\s\n]/);

      if (spaceIndex !== -1) {
        // Nếu có space SAU @, đóng mention list
        console.log("[GroupChat] Space found after @, closing mention list");
        setShowMentionList(false);
        setMentionStartIndex(-1);
        setMentionSearch("");
      } else {
        // Không có space, hiện mention list
        console.log("[GroupChat] No space after @, showing mention list");
        setShowMentionList(true);
        setMentionStartIndex(lastAtIndex);
        setMentionSearch(textAfterAt.toLowerCase());
      }
    } else {
      // Không có @, đóng mention list
      console.log("[GroupChat] No @ found, closing mention list");
      setShowMentionList(false);
      setMentionStartIndex(-1);
      setMentionSearch("");
    }
  };

  // Xử lý khi chọn mention
  const handleSelectMention = (user) => {
    if (mentionStartIndex === -1) return;

    const isAll = user.userId === "all";
    const mentionText = isAll ? "@All" : `@${user.username}`;

    // Thay thế text từ @ đến cuối string bằng mention
    const beforeMention = message.substring(0, mentionStartIndex);
    const afterMention = message.substring(
      mentionStartIndex + 1 + mentionSearch.length
    );
    const newMessage = beforeMention + mentionText + " " + afterMention;

    console.log(
      "[GroupChat] Selected mention:",
      mentionText,
      "New message:",
      newMessage
    );

    setMessage(newMessage);
    setShowMentionList(false);
    setMentionStartIndex(-1);
    setMentionSearch("");
  };

  // Lấy danh sách members để mention (trừ bản thân)
  const getMentionableMembers = () => {
    console.log(
      "[GroupChat] getMentionableMembers - All members:",
      members.length,
      "currentUserId:",
      currentUserId
    );

    // Filter trừ bản thân
    const filtered = members.filter((m) => {
      const isNotMe = Number(m.userId) !== Number(currentUserId);
      console.log(
        "[GroupChat] Checking member:",
        m.username,
        "userId:",
        m.userId,
        "isNotMe:",
        isNotMe
      );
      return isNotMe;
    });

    console.log("[GroupChat] After filtering self, members:", filtered.length);

    // Filter theo search text
    let result = filtered;
    if (mentionSearch) {
      result = filtered.filter((m) => {
        const name = (m.fullName || m.username || "").toLowerCase();
        const username = (m.username || "").toLowerCase();
        const matches =
          name.includes(mentionSearch) || username.includes(mentionSearch);
        console.log(
          "[GroupChat] Search filter:",
          m.username,
          "matches:",
          matches
        );
        return matches;
      });
    }

    console.log("[GroupChat] After search filter, members:", result.length);

    // Thêm @All ở cuối (chỉ hiện khi search rỗng hoặc search "all"/"mọi")
    if (
      !mentionSearch ||
      "all".includes(mentionSearch) ||
      "mọi người".includes(mentionSearch)
    ) {
      result.push({
        userId: "all",
        username: "All",
        fullName: "Mọi người",
        avatarUrl: null,
      });
      console.log("[GroupChat] Added @All option");
    }

    console.log("[GroupChat] Final mentionable members:", result.length);
    return result;
  };

  // Xử lý khi tap vào mention trong tin nhắn
  const handleTapMention = (mentionedUser) => {
    // Nếu là @All thì không hiện menu
    if (mentionedUser.userId === "all") {
      return;
    }

    setSelectedMentionedUser(mentionedUser);
    setShowMentionMenu(true);
  };

  const handleViewProfile = async () => {
    setShowMentionMenu(false);

    // Lấy userId của người dùng hiện tại để so sánh
    let userStr = await AsyncStorage.getItem("user");
    if (!userStr) {
      userStr = await AsyncStorage.getItem("userInfo");
    }

    if (userStr) {
      const currentUser = JSON.parse(userStr);
      const currentUserId = Number(currentUser?.userId || currentUser?.user_id);
      const targetUserId = Number(selectedMentionedUser?.userId);

      // Nếu là chính mình -> quay về MainTabs và chuyển sang tab Profile
      if (currentUserId === targetUserId) {
        navigation.navigate("MainTabs", { screen: "Profile" });
      } else {
        // Nếu là người khác -> chuyển đến UserProfilePublic
        navigation.navigate("UserProfilePublic", {
          userId: selectedMentionedUser.userId,
          username: selectedMentionedUser.username,
          avatarUrl: selectedMentionedUser.avatarUrl,
        });
      }
    } else {
      // Không tìm thấy user info -> mặc định chuyển đến UserProfilePublic
      navigation.navigate("UserProfilePublic", {
        userId: selectedMentionedUser.userId,
        username: selectedMentionedUser.username,
        avatarUrl: selectedMentionedUser.avatarUrl,
      });
    }
  };

  const handleDirectMessage = () => {
    setShowMentionMenu(false);
    // Navigate to DM
    Alert.alert("Thông báo", "Tính năng nhắn tin riêng đang được phát triển");
  };

  const handleBlockUser = () => {
    setShowMentionMenu(false);
    Alert.alert(
      "Chặn người dùng",
      `Bạn có chắc muốn chặn ${
        selectedMentionedUser?.fullName || selectedMentionedUser?.username
      }?`,
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Chặn",
          style: "destructive",
          onPress: () => {
            Alert.alert("Thành công", "Đã chặn người dùng");
          },
        },
      ]
    );
  };

  const handleImagePress = (message) => {
    try {
      if (!message) return;
      // If it's a video, open video modal
      if (message.mediaType === "video" || message.messageType === "video") {
        setVideoUri(message.mediaUri || message.fileUrl);
        setShowVideoModal(true);
        return;
      }

      // Otherwise open image viewer for images
      const allImages = messages.filter(
        (m) => m.mediaType === "image" && m.mediaUri
      );
      const imageIndex = allImages.findIndex((m) => m.id === message.id);
      if (imageIndex !== -1) {
        setSelectedImageIndex(imageIndex);
        setShowImageViewer(true);
      }
    } catch (err) {
      console.error("[GroupChat] handleImagePress error:", err);
    }
  };

  // Video modal state
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [videoUri, setVideoUri] = useState(null);

  const handleQuickLike = async () => {
    // Tạo tin nhắn chỉ có emoji like (không có nền)
    // Lấy thông tin user hiện tại - Thử cả 2 key
    let userStr = await AsyncStorage.getItem("user");
    if (!userStr) {
      userStr = await AsyncStorage.getItem("userInfo");
    }

    if (!userStr) {
      Alert.alert(
        "Lỗi",
        "Không tìm thấy thông tin người dùng. Vui lòng đăng nhập lại."
      );
      return;
    }

    const currentUser = JSON.parse(userStr);
    const userId = Number(currentUser?.userId || currentUser?.user_id);

    if (!userId || userId === 0) {
      Alert.alert("Lỗi", "userId không hợp lệ. Vui lòng đăng nhập lại.");
      return;
    }

    const newMessage = {
      id: Date.now(),
      userId: userId,
      userName: currentUser?.fullName || currentUser?.username || "Bạn",
      userAvatar: null,
      message: "👍", // Like message
      mediaUri: null,
      mediaType: null,
      timestamp: new Date().toISOString(),
      isMine: true,
    };

    const updatedMessages = [...messages, newMessage];
    setMessages(updatedMessages);
    // ❌ REMOVED: await saveMessages(updatedMessages); - Messages now saved via API

    // Scroll to bottom
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const handleLongPress = (msg) => {
    setSelectedMessage(msg);
    setShowContextMenu(true);
    setShowMoreOptions(false); // Reset về menu cấp 1
  };

  const handleShowMore = () => {
    setShowMoreOptions(true); // Chuyển sang menu cấp 2
  };

  const handleBackToMain = () => {
    setShowMoreOptions(false); // Quay về menu cấp 1
  };

  const handleReaction = async (emoji) => {
    setShowContextMenu(false);
    setShowMoreOptions(false);

    if (!selectedMessage) return;

    const messageId = selectedMessage.id;
    const reactionsMap = selectedMessage.reactions || {};
    const usersForEmoji = Array.isArray(reactionsMap[emoji])
      ? reactionsMap[emoji]
      : [];
    const reactedByMe = usersForEmoji.find(
      (u) => String(u) === String(currentUserId)
    );

    // Optimistic update: toggle current user's reaction in local state
    setMessages((prev) =>
      prev.map((m) => {
        if (String(m.id) !== String(messageId)) return m;
        try {
          const newReactions = { ...(m.reactions || {}) };
          const list = Array.isArray(newReactions[emoji])
            ? [...newReactions[emoji]]
            : [];
          if (reactedByMe) {
            // remove current user from list
            const filtered = list.filter(
              (u) => String(u) !== String(currentUserId)
            );
            if (filtered.length > 0) newReactions[emoji] = filtered;
            else delete newReactions[emoji];
          } else {
            // add current user
            if (!list.find((u) => String(u) === String(currentUserId)))
              list.push(currentUserId);
            newReactions[emoji] = list;
          }
          return { ...m, reactions: newReactions };
        } catch (e) {
          return m;
        }
      })
    );

    // Send to server: prefer SignalR realtime, fallback to REST
    try {
      const isConnected =
        signalRService &&
        signalRService.chatConnection &&
        signalRService.chatConnection.state === 1;
      if (isConnected) {
        // Hub method toggles reaction server-side and broadcasts
        await groupChatService.reactToMessageRealtime(
          conversationId,
          messageId,
          emoji
        );
      } else {
        if (reactedByMe) {
          // remove via REST
          await groupChatService.removeReaction(messageId, emoji);
        } else {
          // add via REST
          await groupChatService.addReaction(messageId, emoji);
        }
      }
    } catch (err) {
      console.error("[GroupChat] Reaction API error:", err);
      // On error we could reload messages to reflect authoritative state; for now, try to reload this message
      try {
        await loadMessages(1, false);
      } catch (e) {
        /* ignore */
      }
    }
  };

  const handleReply = () => {
    setShowContextMenu(false);
    setShowMoreOptions(false);
    setReplyingTo(selectedMessage);
    // Focus vào input để người dùng gõ reply
    setTimeout(() => {
      messageInputRef.current?.focus();
    }, 100);
  };

  const handleCopy = async () => {
    if (selectedMessage?.message) {
      await Clipboard.setStringAsync(selectedMessage.message);
      Alert.alert("Thành công", "Đã sao chép tin nhắn");
    }
    setShowContextMenu(false);
    setShowMoreOptions(false);
  };

  const handleDelete = async () => {
    Alert.alert(
      "Xóa tin nhắn",
      selectedMessage?.isMine
        ? "Bạn có chắc muốn xóa tin nhắn này?"
        : "Tin nhắn chỉ được xóa ở phía bạn, người khác vẫn có thể xem.",
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Xóa",
          style: "destructive",
          onPress: async () => {
            const updatedMessages = messages.filter(
              (m) => m.id !== selectedMessage.id
            );
            setMessages(updatedMessages);
            // ❌ REMOVED: await saveMessages(updatedMessages); - Delete will be handled via API later
            setShowContextMenu(false);
          },
        },
      ]
    );
  };

  const handleForward = () => {
    setShowContextMenu(false);
    setShowMoreOptions(false);
    Alert.alert("Thông báo", "Tính năng chuyển tiếp đang được phát triển");
  };

  const handleReport = () => {
    setShowContextMenu(false);
    setShowMoreOptions(false);
    Alert.alert("Báo cáo", "Bạn muốn báo cáo tin nhắn này?", [
      { text: "Hủy", style: "cancel" },
      {
        text: "Báo cáo",
        onPress: () => Alert.alert("Thành công", "Đã gửi báo cáo"),
      },
    ]);
  };

  const handlePin = async () => {
    setShowContextMenu(false);
    setShowMoreOptions(false);

    try {
      // Check if message is already pinned
      const isPinned = selectedMessage.isPinned === true;

      if (isPinned) {
        // Unpin message
        Alert.alert(
          "Bỏ ghim tin nhắn",
          "Bạn có chắc muốn bỏ ghim tin nhắn này?",
          [
            { text: "Hủy", style: "cancel" },
            {
              text: "Bỏ ghim",
              onPress: async () => {
                try {
                  // Call API to unpin
                  await groupChatService.unpinMessage(
                    conversationId,
                    selectedMessage.id
                  );
                  // Optimistically update local state
                  const updatedMessages = messages.map((m) => {
                    if (m.id === selectedMessage.id) {
                      return {
                        ...m,
                        isPinned: false,
                        pinnedAt: null,
                        pinnedBy: null,
                      };
                    }
                    return m;
                  });
                  setMessages(updatedMessages);
                  Alert.alert("Thành công", "Đã bỏ ghim tin nhắn");
                } catch (err) {
                  console.error("Unpin error:", err);
                  Alert.alert("Lỗi", "Không thể bỏ ghim tin nhắn");
                }
              },
            },
          ]
        );
      } else {
        // Pin message
        try {
          const result = await groupChatService.pinMessage(
            conversationId,
            selectedMessage.id
          );
          // result may contain pinnedAt/PinnedAt
          const pinnedAt =
            result?.pinnedAt || result?.PinnedAt || new Date().toISOString();

          const updatedMessages = messages.map((m) => {
            if (m.id === selectedMessage.id) {
              return {
                ...m,
                isPinned: true,
                pinnedAt: pinnedAt,
                pinnedBy: currentUserId,
              };
            }
            return m;
          });

          setMessages(updatedMessages);
          Alert.alert("Thành công", "Đã ghim tin nhắn");
        } catch (err) {
          console.error("Pin error:", err);
          Alert.alert("Lỗi", "Không thể ghim tin nhắn");
        }
      }
    } catch (error) {
      console.error("Pin message error:", error);
      Alert.alert("Lỗi", "Không thể ghim tin nhắn");
    }
  };

  const formatTime = (date) => {
    const dateObj = date instanceof Date ? date : new Date(date);
    if (!dateObj || isNaN(dateObj.getTime())) return "";
    const hours = dateObj.getHours().toString().padStart(2, "0");
    const minutes = dateObj.getMinutes().toString().padStart(2, "0");
    return `${hours}:${minutes}`;
  };

  const formatDate = (date) => {
    const today = new Date();
    const messageDate = date instanceof Date ? date : new Date(date);
    if (!messageDate || isNaN(messageDate.getTime())) return "";

    if (messageDate.toDateString() === today.toDateString()) {
      return "Hôm nay";
    }

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (messageDate.toDateString() === yesterday.toDateString()) {
      return "Hôm qua";
    }

    return messageDate.toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  // Scroll đến tin nhắn cụ thể và highlight
  // options: { showNotFoundAlert: boolean }
  const scrollToMessage = async (messageId, options = {}) => {
    const { showNotFoundAlert = false } = options;
    console.log("[GroupChat] scrollToMessage called with:", {
      messageId,
      messagesCount: messages.length,
    });

    // Try to find message by various id shapes (string/number/tempId/messageId)
    const findIndexById = (id) => {
      if (id == null) return -1;
      const sId = String(id);
      for (let i = 0; i < messages.length; i++) {
        const m = messages[i];
        if (!m) continue;
        const candidates = [m.id, m.messageId, m.MessageId, m.tempId];
        for (const c of candidates) {
          if (c != null && String(c) === sId) return i;
        }
      }
      return -1;
    };

    let messageIndex = findIndexById(messageId);
    console.log("[GroupChat] Message index found:", messageIndex);

    // Nếu không tìm thấy và còn messages để load, thử load thêm
    if (messageIndex === -1 && hasMore && !loadingMore) {
      console.log(
        "[GroupChat] Message not found, trying to load more messages..."
      );
      try {
        await loadMessages(page + 1, true);
        // Thử tìm lại sau khi load
        messageIndex = findIndexById(messageId);
        console.log(
          "[GroupChat] After loading more, message index:",
          messageIndex
        );
      } catch (err) {
        console.error("[GroupChat] Error loading more messages:", err);
      }
    }

    if (messageIndex === -1) {
      const msg = `scrollToMessage: message ${messageId} not found`;
      console.warn(msg);
      console.log(
        "[GroupChat] Available message IDs:",
        messages
          .slice(0, 10)
          .map((m) => ({ id: m.id, messageId: m.messageId, tempId: m.tempId }))
      );
      if (showNotFoundAlert) {
        // only show alert when explicitly requested (user action)
        Alert.alert("Thông báo", "Không tìm thấy tin nhắn");
      }
      return;
    }

    // Highlight tin nhắn (use the canonical id from state if possible)
    const canonical =
      messages[messageIndex]?.id ||
      messages[messageIndex]?.messageId ||
      messages[messageIndex]?.tempId;
    setHighlightedMessageId(canonical);
    console.log("[GroupChat] Highlighting message:", canonical);

    // Try to scroll to measured position using refs when available
    const targetId = String(canonical);
    // Prefer layout-measured positions captured via onLayout
    const pos = messagePositions.current && messagePositions.current[targetId];
    if (pos != null) {
      const offset = Math.max(pos - 120, 0);
      scrollViewRef.current?.scrollTo({ y: offset, animated: true });
      console.log("[GroupChat] Scrolled using measured position:", offset);

      // Tắt highlight sau 2 giây
      setTimeout(() => {
        setHighlightedMessageId(null);
      }, 2000);
      return;
    }

    // Fallback: try to measure the ref if available
    const ref = messageRefs.current && messageRefs.current[targetId];
    if (ref && typeof ref.measure === "function") {
      try {
        ref.measure((fx, fy, width, height, px, py) => {
          const offset = Math.max(py - 120, 0);
          scrollViewRef.current?.scrollTo({ y: offset, animated: true });
          console.log("[GroupChat] Scrolled using ref measure:", offset);
        });

        // Tắt highlight sau 2 giây
        setTimeout(() => {
          setHighlightedMessageId(null);
        }, 2000);
        return;
      } catch (err) {
        console.warn("[GroupChat] ref.measure error:", err);
        // continue to estimate
      }
    }

    // Last resort: estimate position by index
    const estimatedY = messageIndex * 80;
    scrollViewRef.current?.scrollTo({ y: estimatedY, animated: true });

    // Tắt highlight sau 2 giây
    setTimeout(() => {
      setHighlightedMessageId(null);
    }, 2000);
  };

  // Parse tin nhắn để tìm mentions và render
  const renderMessageText = (text, isMine) => {
    // ✅ FIX: Safe handling for text, numbers, mixed content
    // Convert to string first (handles numbers like 123)
    const textStr = String(text || "");

    console.log(
      "[GroupChat] renderMessageText - Input:",
      textStr,
      "Type:",
      typeof text
    );

    // ✅ If no mentions (@), render simple text (handles numbers correctly)
    if (!textStr.includes("@")) {
      // Also detect URLs and make them clickable
      const urlRegex = /(https?:\/\/[^\s]+)/g;
      const parts = textStr.split(urlRegex).filter(Boolean);
      return (
        <Text style={isMine ? styles.myMessageText : styles.otherMessageText}>
          {parts.map((part, i) => {
            if (urlRegex.test(part)) {
              return (
                <Text
                  key={i}
                  style={{ color: "#D1E9FF", textDecorationLine: "underline" }}
                  onPress={() => {
                    try {
                      Linking.openURL(part);
                    } catch (e) {
                      console.error("OpenURL error", e);
                    }
                  }}
                >
                  {part}
                </Text>
              );
            }
            return <Text key={i}>{part}</Text>;
          })}
        </Text>
      );
    }

    // ✅ Parse mentions (only if @ exists)
    const mentionRegex = /@(\w+)/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = mentionRegex.exec(textStr)) !== null) {
      console.log(
        "[GroupChat] Found mention:",
        match[0],
        "username:",
        match[1]
      );

      // Add text before mention
      if (match.index > lastIndex) {
        parts.push({
          type: "text",
          content: textStr.substring(lastIndex, match.index),
        });
      }

      // Add mention
      const username = match[1];
      const mentionedMember =
        username === "All"
          ? { userId: "all", username: "All", fullName: "Mọi người" }
          : members.find((m) => m.username === username);

      parts.push({
        type: "mention",
        content: match[0],
        user: mentionedMember,
      });

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < textStr.length) {
      parts.push({
        type: "text",
        content: textStr.substring(lastIndex),
      });
    }

    console.log("[GroupChat] Parsed parts:", parts.length);

    // Render parts with mentions
    return (
      <Text style={isMine ? styles.myMessageText : styles.otherMessageText}>
        {parts.map((part, index) => {
          if (part.type === "mention") {
            const isAll = part.user?.userId === "all";

            // Style mention khác nhau cho tin nhắn của mình vs người khác
            let mentionStyle;
            if (isMine) {
              // Tin nhắn của mình (nền xanh) - mention màu TRẮNG
              mentionStyle = isAll
                ? styles.mentionAllTextMine
                : styles.mentionTextMine;
            } else {
              // Tin nhắn người khác (nền xám) - mention màu xanh/tím
              mentionStyle = isAll ? styles.mentionAllText : styles.mentionText;
            }

            return (
              <Text
                key={index}
                style={mentionStyle}
                onPress={() => {
                  console.log(
                    "[GroupChat] Mention tapped:",
                    part.content,
                    part.user
                  );
                  if (part.user && !isAll) {
                    handleTapMention(part.user);
                  }
                }}
              >
                {part.content}
              </Text>
            );
          }
          // For plain text parts, detect URLs and make them clickable
          const urlRegexInner = /(https?:\/\/[^\s]+)/g;
          const partsInner = String(part.content || "")
            .split(urlRegexInner)
            .filter(Boolean);
          return (
            <Text key={index}>
              {partsInner.map((p, idx) => {
                if (urlRegexInner.test(p)) {
                  return (
                    <Text
                      key={`${index}-${idx}`}
                      style={{
                        color: isMine ? "#D1E9FF" : "#1D4ED8",
                        textDecorationLine: "underline",
                      }}
                      onPress={() => {
                        try {
                          Linking.openURL(p);
                        } catch (e) {
                          console.error("OpenURL error", e);
                        }
                      }}
                    >
                      {p}
                    </Text>
                  );
                }
                return <Text key={`${index}-${idx}`}>{p}</Text>;
              })}
            </Text>
          );
        })}
      </Text>
    );
  };

  // Render reply preview trong tin nhắn - MESSENGER STYLE (BÊN TRONG BUBBLE)
  const renderReplyPreview = (replyTo, isMine) => {
    if (!replyTo) return null;

    // Lấy text thuần túy, không parse mention - Xử lý an toàn
    let replyText = "Tin nhắn";
    try {
      const candidates = [
        replyTo.message,
        replyTo.content,
        replyTo.Content,
        replyTo.text,
      ];
      for (const c of candidates) {
        if (c !== null && c !== undefined) {
          const s = String(c).trim();
          if (s) {
            replyText = s;
            break;
          }
        }
      }
    } catch (error) {
      console.log("[GroupChat] Error parsing reply message:", error);
      replyText = "Tin nhắn";
    }

    return (
      <TouchableOpacity
        style={[
          styles.replyPreviewInMessage,
          isMine ? styles.replyPreviewMine : styles.replyPreviewOther,
        ]}
        onPress={() => {
          // Scroll đến tin nhắn được reply - try multiple id forms
          const targetId =
            replyTo?.id ||
            replyTo?.messageId ||
            replyTo?.MessageId ||
            replyTo?.messageId;
          scrollToMessage(targetId);
        }}
        activeOpacity={0.7}
      >
        <View style={styles.replyPreviewContent}>
          <Text
            style={[
              styles.replyPreviewName,
              isMine && styles.replyPreviewNameMine,
            ]}
            numberOfLines={1}
          >
            {replyTo.userName || "Người dùng"}
          </Text>
          {replyTo.mediaType ? (
            <View style={styles.replyPreviewMedia}>
              <Ionicons
                name={replyTo.mediaType === "image" ? "image" : "videocam"}
                size={14}
                color={isMine ? "rgba(255,255,255,0.9)" : "#6B7280"}
              />
              <Text
                style={[
                  styles.replyPreviewText,
                  isMine && styles.replyPreviewTextMine,
                ]}
                numberOfLines={1}
              >
                {replyTo.mediaType === "image" ? "Ảnh" : "Video"}
              </Text>
            </View>
          ) : (
            <Text
              style={[
                styles.replyPreviewText,
                isMine && styles.replyPreviewTextMine,
              ]}
              numberOfLines={2}
              ellipsizeMode="tail"
            >
              {replyText}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  // ✅ NEW: Render read markers (Messenger-style)
  // Each user appears exactly once in the chat at the last message they have read.
  // Only messages that match a user's lastRead entry will display that user's avatar.
  const renderReadReceipts = (msg) => {
    if (!msg || !msg.id) return null;

    // Build a list of users whose lastRead messageId equals this message id
    try {
      const entries = Object.entries(lastReadMap || {});
      if (!entries || entries.length === 0) return null;

      const readersForThisMsg = entries
        .map(([uid, info]) => {
          if (!info || !info.messageId) return null;
          if (String(info.messageId) !== String(msg.id)) return null;
          return String(uid);
        })
        .filter(Boolean);

      // Exclude current user (optionally) - keep it consistent with Messenger (you may hide your own marker)
      const otherReaders = readersForThisMsg.filter(
        (u) => String(u) !== String(currentUserId)
      );
      if (otherReaders.length === 0) return null;

      // Map to avatar objects and limit to 3 visible avatars
      const avatarObjs = otherReaders.slice(0, 3).map((uid) => {
        const member = members.find((m) => String(m.userId) === String(uid));
        const name = member?.fullName || member?.username || "User";
        const avatar = member?.avatarUrl || member?.avatar || null;
        return { id: uid, avatar, name };
      });

      const extra = Math.max(0, otherReaders.length - avatarObjs.length);

      // Position markers outside the bubble: for own messages align right, for others align near sender avatar
      const containerStyle = {
        position: "absolute",
        // place below the bubble (increase negative bottom to push it down)
        bottom: -12,
        right: msg.isMine ? -8 : undefined,
        left: msg.isMine ? undefined : 36,
        zIndex: 15,
      };

      return (
        <View style={[styles.readReceipts, containerStyle]}>
          {avatarObjs.map((r, idx) =>
            r.avatar ? (
              <Image
                key={r.id}
                source={{
                  uri:
                    r.avatar.startsWith("http") ||
                    r.avatar.startsWith("file://")
                      ? r.avatar
                      : `${API_BASE_URL}${r.avatar}`,
                }}
                style={[
                  styles.readReceiptAvatar,
                  { marginLeft: idx > 0 ? -8 : 0 },
                ]}
              />
            ) : (
              <View
                key={r.id}
                style={[
                  styles.readReceiptAvatarPlaceholder,
                  { marginLeft: idx > 0 ? -8 : 0 },
                ]}
              >
                <Text style={styles.readReceiptAvatarText}>
                  {(r.name || "U").charAt(0).toUpperCase()}
                </Text>
              </View>
            )
          )}
          {extra > 0 && <Text style={styles.readReceiptCount}>+{extra}</Text>}
        </View>
      );
    } catch (e) {
      console.warn("[GroupChat] renderReadReceipts error", e);
      return null;
    }
  };

  // Render reactions (map) into small pills showing emoji and count
  const renderReactions = (msg) => {
    try {
      const map = msg.reactions || msg.Reactions || {};
      const entries = Object.entries(map || {});
      if (!entries || entries.length === 0) return null;

      // Convert to array of { emoji, count, reactedByMe }
      const items = entries.map(([emoji, users]) => ({
        emoji,
        count: Array.isArray(users) ? users.length : 0,
        reactedByMe: Array.isArray(users)
          ? users.find((u) => String(u) === String(currentUserId)) != null
          : false,
      }));

      // Sort by count desc, show up to 4
      items.sort((a, b) => b.count - a.count);
      const visible = items.slice(0, 4);

      return (
        <View
          style={[
            styles.reactionBadge,
            { flexDirection: "row", paddingHorizontal: 6, paddingVertical: 4 },
          ]}
        >
          {visible.map((it, idx) => (
            <View
              key={it.emoji + idx}
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginLeft: idx === 0 ? 0 : 6,
              }}
            >
              <Text
                style={[
                  styles.reactionText,
                  it.reactedByMe ? { fontWeight: "700" } : null,
                ]}
              >
                {it.emoji}
              </Text>
              <Text style={{ fontSize: 12, marginLeft: 4 }}>
                {it.count > 1 ? it.count : ""}
              </Text>
            </View>
          ))}
        </View>
      );
    } catch (e) {
      return null;
    }
  };

  // Reply indicator đã bị xóa - Reply preview giờ nằm hoàn toàn bên TRONG bubble

  const renderMessage = (msg, index) => {
    const showDate =
      index === 0 ||
      formatDate(messages[index - 1].timestamp) !== formatDate(msg.timestamp);

    const isHighlighted = highlightedMessageId === msg.id;

    // Determine grouping: first / middle / last in a consecutive chain
    const prev = messages[index - 1];
    const next = messages[index + 1];
    const sameSender = (a, b) =>
      !!(a && b && String(a.userId) === String(b.userId));
    const within2Min = (a, b) => {
      if (!a || !b) return false;
      try {
        return (
          Math.abs(new Date(a.timestamp) - new Date(b.timestamp)) <
          2 * 60 * 1000
        );
      } catch (e) {
        return false;
      }
    };

    const isFirstInChain =
      !prev || !sameSender(prev, msg) || !within2Min(prev, msg);
    const isLastInChain =
      !next || !sameSender(next, msg) || !within2Min(msg, next);

    // Avatar visible only for messages from others and only on the last message in a chain
    const showAvatar = !msg.isMine && isLastInChain;

    // Vertical spacing: compact inside a chain, larger between chains/people
    const verticalSpacing = isLastInChain ? 12 : 4; // last message gets larger bottom margin

    // DEBUG: Log để kiểm tra
    console.log("[GroupChat] Rendering message:", {
      message: msg.message,
      userId: msg.userId,
      currentUserId: currentUserId,
      isMine: msg.isMine,
      userName: msg.userName,
      userAvatar: msg.userAvatar,
    });

    // Dynamic bubble style based on chain position
    const baseMyBubble = styles.myMessageBubble;
    const baseOtherBubble = styles.otherMessageBubble;

    const myBubbleDynamic = {};
    const otherBubbleDynamic = {};

    if (msg.isMine) {
      if (isFirstInChain && !isLastInChain) {
        // First in chain (has a following message from same sender):
        // round all except the corner that touches the next message (bottom-left)
        myBubbleDynamic.borderTopLeftRadius = 18;
        myBubbleDynamic.borderTopRightRadius = 18;
        myBubbleDynamic.borderBottomRightRadius = 18;
        myBubbleDynamic.borderBottomLeftRadius = 6;
      } else if (!isFirstInChain && !isLastInChain) {
        // Middle: round mostly, but reduce corner near next message (bottom-left)
        myBubbleDynamic.borderRadius = 14;
        myBubbleDynamic.borderBottomLeftRadius = 6;
      } else if (!isFirstInChain && isLastInChain) {
        // Last in chain: full rounded
        myBubbleDynamic.borderRadius = 18;
      } else {
        // Single message: full rounded
        myBubbleDynamic.borderRadius = 18;
      }
    } else {
      if (isFirstInChain && !isLastInChain) {
        // First in chain for other: reduce bottom-right corner (touches next)
        otherBubbleDynamic.borderTopLeftRadius = 18;
        otherBubbleDynamic.borderTopRightRadius = 18;
        otherBubbleDynamic.borderBottomLeftRadius = 18;
        otherBubbleDynamic.borderBottomRightRadius = 6;
      } else if (!isFirstInChain && !isLastInChain) {
        // Middle for others: reduce bottom-right corner
        otherBubbleDynamic.borderRadius = 14;
        otherBubbleDynamic.borderBottomRightRadius = 6;
      } else if (!isFirstInChain && isLastInChain) {
        otherBubbleDynamic.borderRadius = 18;
      } else {
        otherBubbleDynamic.borderRadius = 18;
      }
    }

    const verticalTop = isFirstInChain ? 12 : 4;

    // ✅ Generate unique key: prefer real id, fallback to tempId, ensure uniqueness
    const messageKey = msg.tempId ? `temp-${msg.tempId}` : `msg-${msg.id || index}`;

    return (
      <View
        key={messageKey}
        ref={(r) => {
          try {
            const keys = [msg.id, msg.messageId, msg.MessageId, msg.tempId];
            keys.forEach((k) => {
              if (k != null) messageRefs.current[String(k)] = r;
            });
          } catch (e) {}
        }}
        onLayout={(e) => {
          try {
            const y = e.nativeEvent.layout.y;
            const keys = [msg.id, msg.messageId, msg.MessageId, msg.tempId];
            keys.forEach((k) => {
              if (k != null) messagePositions.current[String(k)] = y;
            });
          } catch (e) {}
        }}
        style={[
          isHighlighted ? styles.highlightedMessageContainer : null,
          {
            marginTop: verticalTop,
            marginBottom: verticalSpacing,
            position: "relative",
          },
        ]}
      >
        {showDate && (
          <View style={styles.dateContainer}>
            <Text style={styles.dateText}>{formatDate(msg.timestamp)}</Text>
          </View>
        )}

        {msg.isMine ? (
          // Tin nhắn của mình - BÊN PHẢI, MÀU XANH
          <TouchableOpacity
            style={[
              styles.myMessageContainer,
              { marginBottom: verticalSpacing },
            ]}
            onLongPress={() => handleLongPress(msg)}
            delayLongPress={500}
          >
            {/* Nếu chỉ có media (không có text), không dùng bubble */}
            {msg.mediaType && !msg.message ? (
              <View>
                {msg.mediaType === "image" && (
                  <TouchableOpacity
                    onPress={() => handleImagePress(msg)}
                    onLongPress={() => handleLongPress(msg)}
                    delayLongPress={500}
                    activeOpacity={0.9}
                  >
                    <Image
                      source={{ uri: getMediaUri(msg.mediaUri || msg.fileUrl) }}
                      style={[styles.messageImage, styles.messageImageOnly]}
                      resizeMode="cover"
                    />
                  </TouchableOpacity>
                )}
                {msg.mediaType === "video" && (
                  <TouchableOpacity
                    onPress={() => handleImagePress(msg)}
                    onLongPress={() => handleLongPress(msg)}
                    delayLongPress={500}
                    activeOpacity={0.9}
                  >
                    <View
                      style={[styles.videoContainer, styles.messageImageOnly]}
                    >
                      <Image
                        source={{ uri: getMediaUri(msg.mediaUri || msg.fileUrl) }}
                        style={styles.messageImage}
                      />
                      <View style={styles.videoOverlay}>
                        <Ionicons
                          name="play-circle"
                          size={48}
                          color="#FFFFFF"
                        />
                      </View>
                    </View>
                  </TouchableOpacity>
                )}
                {renderReactions(msg)}
                <Text style={[styles.myMessageTime, styles.mediaTimeOnly]}>
                  {formatTime(msg.timestamp)}
                </Text>
              </View>
            ) : msg.message && !msg.mediaType && isEmojiOnly(msg.message) ? (
              // ✅ FIX: Chỉ có emoji (KHÔNG có @mention, KHÔNG có số), không có bubble
              (() => {
                console.log(
                  "[GroupChat] Rendering emoji-only message:",
                  msg.message
                );
                return (
                  <View>
                    <Text style={styles.emojiOnly}>{msg.message}</Text>
                    {renderReactions(msg)}
                    <Text style={[styles.myMessageTime, styles.mediaTimeOnly]}>
                      {formatTime(msg.timestamp)}
                    </Text>
                  </View>
                );
              })()
            ) : (
              // Có text, dùng bubble bình thường
              (() => {
                console.log(
                  "[GroupChat] Rendering text message with bubble:",
                  msg.message
                );
                return (
                  <View style={[styles.myMessageBubble, myBubbleDynamic]}>
                    {/* Reply Preview */}
                    {msg.replyTo && renderReplyPreview(msg.replyTo, true)}

                    {msg.mediaType === "image" && (
                      <TouchableOpacity
                        onPress={() => handleImagePress(msg)}
                        onLongPress={() => handleLongPress(msg)}
                        delayLongPress={500}
                        activeOpacity={0.9}
                      >
                        <Image
                          source={{
                            uri: getMediaUri(msg.mediaUri || msg.fileUrl),
                          }}
                          style={styles.messageImage}
                          resizeMode="cover"
                        />
                      </TouchableOpacity>
                    )}
                    {msg.mediaType === "file" && msg.fileUrl && (
                      <TouchableOpacity
                        onPress={() => {
                          try {
                            Linking.openURL(msg.fileUrl);
                          } catch (e) {
                            console.error("Open file URL error", e);
                          }
                        }}
                        onLongPress={() => handleLongPress(msg)}
                        delayLongPress={500}
                        activeOpacity={0.9}
                        style={{
                          padding: 12,
                          backgroundColor: "rgba(255,255,255,0.05)",
                          borderRadius: 8,
                          marginBottom: 6,
                        }}
                      >
                        <View
                          style={{ flexDirection: "row", alignItems: "center" }}
                        >
                          <Ionicons
                            name="document-text-outline"
                            size={28}
                            color="#FFFFFF"
                          />
                          <View style={{ marginLeft: 10, maxWidth: 200 }}>
                            <Text
                              style={{ color: "#FFFFFF", fontWeight: "600" }}
                              numberOfLines={1}
                              ellipsizeMode="tail"
                            >
                              {msg.fileName || msg.fileUrl}
                            </Text>
                            <Text style={{ color: "#E5F2FF", fontSize: 12 }}>
                              {msg.fileSize
                                ? `${(msg.fileSize / 1024).toFixed(1)} KB`
                                : ""}
                            </Text>
                          </View>
                        </View>
                      </TouchableOpacity>
                    )}
                    {msg.mediaType === "video" && (
                      <TouchableOpacity
                        onPress={() => handleImagePress(msg)}
                        onLongPress={() => handleLongPress(msg)}
                        delayLongPress={500}
                        activeOpacity={0.9}
                      >
                        <View style={styles.videoContainer}>
                          <Image
                            source={{
                              uri: getMediaUri(msg.mediaUri || msg.fileUrl),
                            }}
                            style={styles.messageImage}
                          />
                          <View style={styles.videoOverlay}>
                            <Ionicons
                              name="play-circle"
                              size={48}
                              color="#FFFFFF"
                            />
                          </View>
                        </View>
                      </TouchableOpacity>
                    )}
                    {msg.message && renderMessageText(msg.message, true)}
                    {renderReactions(msg)}
                    <Text style={styles.myMessageTime}>
                      {formatTime(msg.timestamp)}
                    </Text>
                    {/* ✅ Read Receipts */}
                    {renderReadReceipts(msg)}
                  </View>
                );
              })()
            )}
          </TouchableOpacity>
        ) : (
          // Tin nhắn của người khác
          <TouchableOpacity
            style={[
              styles.otherMessageContainer,
              { marginBottom: verticalSpacing },
            ]}
            onLongPress={() => handleLongPress(msg)}
            delayLongPress={500}
          >
            {/* Avatar: only render for last message in a chain; otherwise render spacer to align content */}
            <TouchableOpacity
              onPress={() => {
                const user = members.find(
                  (m) => Number(m.userId) === Number(msg.userId)
                );
                if (user) {
                  setSelectedMentionedUser(user);
                  setShowMentionMenu(true);
                }
              }}
              activeOpacity={showAvatar ? 0.7 : 1}
            >
              {showAvatar ? (
                (() => {
                  let avatarUri = msg.userAvatar;
                  if (!avatarUri) {
                    const user = members.find(
                      (m) => Number(m.userId) === Number(msg.userId)
                    );
                    avatarUri = user?.avatar || user?.avatarUrl;
                  }
                  // ✅ FIX: Ensure avatarUri is a string, not an object
                  if (avatarUri && typeof avatarUri === 'object') {
                    console.warn('[GroupChat] avatarUri is object, converting:', avatarUri);
                    avatarUri = avatarUri.uri || avatarUri.url || null;
                  }
                  const avatarUriStr = avatarUri ? String(avatarUri) : null;
                  return avatarUriStr ? (
                    <Image
                      source={{
                        uri:
                          avatarUriStr.startsWith("file://") ||
                          avatarUriStr.startsWith("http")
                            ? avatarUriStr
                            : `${API_BASE_URL}${avatarUriStr}`,
                      }}
                      style={styles.messageAvatar}
                      onError={(e) =>
                        console.log(
                          "[GroupChat] Avatar load error:",
                          e.nativeEvent.error
                        )
                      }
                    />
                  ) : (
                    <View style={styles.messageAvatarPlaceholder}>
                      <Text style={styles.messageAvatarText}>
                        {msg.userName?.charAt(0)?.toUpperCase() || "U"}
                      </Text>
                    </View>
                  );
                })()
              ) : (
                <View style={{ width: 28, height: 28, marginRight: 8 }} />
              )}
            </TouchableOpacity>
            <View style={styles.otherMessageContent}>
              <TouchableOpacity
                onPress={() => {
                  // Tìm user từ members array
                  const user = members.find(
                    (m) => Number(m.userId) === Number(msg.userId)
                  );
                  if (user) {
                    setSelectedMentionedUser(user);
                    setShowMentionMenu(true);
                  }
                }}
              >
                {isFirstInChain && (
                  <Text style={styles.messageSenderName}>{msg.userName}</Text>
                )}
              </TouchableOpacity>

              {/* Nếu chỉ có media (không có text), không dùng bubble */}
              {msg.mediaType && !msg.message ? (
                <View>
                  {msg.mediaType === "image" && (
                    <TouchableOpacity
                      onPress={() => handleImagePress(msg)}
                      onLongPress={() => handleLongPress(msg)}
                      delayLongPress={500}
                      activeOpacity={0.9}
                    >
                      <Image
                        source={{ uri: getMediaUri(msg.mediaUri || msg.fileUrl) }}
                        style={[styles.messageImage, styles.messageImageOnly]}
                        resizeMode="cover"
                      />
                    </TouchableOpacity>
                  )}
                  {msg.mediaType === "video" && (
                    <TouchableOpacity
                      onPress={() => handleImagePress(msg)}
                      onLongPress={() => handleLongPress(msg)}
                      delayLongPress={500}
                      activeOpacity={0.9}
                    >
                      <View
                        style={[styles.videoContainer, styles.messageImageOnly]}
                      >
                        <Image
                          source={{ uri: getMediaUri(msg.mediaUri || msg.fileUrl) }}
                          style={styles.messageImage}
                        />
                        <View style={styles.videoOverlay}>
                          <Ionicons
                            name="play-circle"
                            size={48}
                            color="#FFFFFF"
                          />
                        </View>
                      </View>
                    </TouchableOpacity>
                  )}
                  {renderReactions(msg)}
                  <Text style={[styles.otherMessageTime, styles.mediaTimeOnly]}>
                    {formatTime(msg.timestamp)}
                  </Text>
                  {renderReadReceipts(msg)}
                </View>
              ) : msg.message && !msg.mediaType && isEmojiOnly(msg.message) ? (
                // Chỉ có emoji (KHÔNG có @mention), không có bubble
                <View>
                  <Text style={styles.emojiOnly}>{msg.message}</Text>
                  {renderReactions(msg)}
                  <Text style={[styles.otherMessageTime, styles.mediaTimeOnly]}>
                    {formatTime(msg.timestamp)}
                  </Text>
                  {renderReadReceipts(msg)}
                </View>
              ) : (
                // Có text, dùng bubble bình thường
                <View>
                  <View style={[styles.otherMessageBubble, otherBubbleDynamic]}>
                    {/* Reply Preview */}
                    {msg.replyTo && renderReplyPreview(msg.replyTo, false)}

                    {msg.mediaType === "image" && (
                      <TouchableOpacity
                        onPress={() => handleImagePress(msg)}
                        activeOpacity={0.9}
                      >
                        <Image
                          source={{ uri: msg.mediaUri }}
                          style={styles.messageImage}
                          resizeMode="cover"
                        />
                      </TouchableOpacity>
                    )}
                    {msg.mediaType === "video" && (
                      <View style={styles.videoContainer}>
                        <Image
                          source={{ uri: msg.mediaUri }}
                          style={styles.messageImage}
                        />
                        <View style={styles.videoOverlay}>
                          <Ionicons
                            name="play-circle"
                            size={48}
                            color="#FFFFFF"
                          />
                        </View>
                      </View>
                    )}
                    {msg.mediaType === "file" && msg.fileUrl && (
                      <TouchableOpacity
                        onPress={() => {
                          try {
                            Linking.openURL(msg.fileUrl);
                          } catch (e) {
                            console.error("Open file URL error", e);
                          }
                        }}
                        activeOpacity={0.9}
                      >
                        <View
                          style={{
                            padding: 12,
                            backgroundColor: "#F3F4F6",
                            borderRadius: 8,
                            marginBottom: 6,
                          }}
                        >
                          <View
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                            }}
                          >
                            <Ionicons
                              name="document-text-outline"
                              size={28}
                              color="#111827"
                            />
                            <View style={{ marginLeft: 10, maxWidth: 200 }}>
                              <Text
                                style={{ color: "#111827", fontWeight: "600" }}
                                numberOfLines={1}
                                ellipsizeMode="tail"
                              >
                                {msg.fileName || msg.fileUrl}
                              </Text>
                              <Text style={{ color: "#6B7280", fontSize: 12 }}>
                                {msg.fileSize
                                  ? `${(msg.fileSize / 1024).toFixed(1)} KB`
                                  : ""}
                              </Text>
                            </View>
                          </View>
                        </View>
                      </TouchableOpacity>
                    )}
                    {msg.message && renderMessageText(msg.message, false)}
                  </View>
                  {renderReactions(msg)}
                  <Text style={styles.otherMessageTime}>
                    {formatTime(msg.timestamp)}
                  </Text>
                  {renderReadReceipts(msg)}
                </View>
              )}
            </View>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

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

        <TouchableOpacity
          style={styles.headerCenter}
          onPress={() =>
            navigation.navigate("GroupDetail", {
              conversationId,
              groupName: groupInfo?.name || groupName,
            })
          }
          activeOpacity={0.7}
        >
          {groupInfo?.avatarUrl ? (
            <Image
              source={{
                uri:
                  groupInfo.avatarUrl.startsWith("file://") ||
                  groupInfo.avatarUrl.startsWith("http")
                    ? groupInfo.avatarUrl
                    : `${API_BASE_URL}${groupInfo.avatarUrl}`,
              }}
              style={styles.headerAvatar}
            />
          ) : (
            <View style={styles.headerAvatarPlaceholder}>
              <Ionicons name="people" size={20} color="#FFFFFF" />
            </View>
          )}
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerName}>
              {groupInfo?.name || groupName}
            </Text>
            <Text style={styles.headerMemberCount}>
              {members.length} thành viên
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.headerIcon}
          onPress={() =>
            navigation.navigate("GroupDetail", {
              conversationId,
              groupName: groupInfo?.name || groupName,
            })
          }
        >
          <Ionicons
            name="information-circle-outline"
            size={24}
            color="#111827"
          />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.headerIcon, { marginLeft: 8 }]}
          onPress={() =>
            navigation.navigate("PinnedMessages", { conversationId })
          }
        >
          <Ionicons name="pin" size={22} color="#111827" />
        </TouchableOpacity>
      </View>

      {/* Chat Content */}
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView
          ref={scrollViewRef}
          style={styles.chatContent}
          contentContainerStyle={styles.chatContentContainer}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() => {
            try {
              if (!initialScrollDoneRef.current) {
                // instant jump (no animation) on first content size change
                scrollViewRef.current?.scrollToEnd({ animated: false });
                initialScrollDoneRef.current = true;
              }
            } catch (e) {
              /* ignore */
            }
          }}
          onScroll={(e) => {
            const { contentOffset } = e.nativeEvent;
            // ✅ Load more when scrolled to top
            if (contentOffset.y < 100 && !loadingMore && hasMore) {
              handleLoadMore();
            }
          }}
          scrollEventThrottle={400}
        >
          {/* ✅ Loading indicator for pagination */}
          {loadingMore && (
            <View style={{ padding: 16, alignItems: "center" }}>
              <ActivityIndicator size="small" color="#007AFF" />
              <Text style={{ fontSize: 12, color: "#999", marginTop: 8 }}>
                Đang tải thêm tin nhắn...
              </Text>
            </View>
          )}

          {messages.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="chatbubbles-outline" size={64} color="#D1D5DB" />
              <Text style={styles.emptyStateText}>Chưa có tin nhắn</Text>
              <Text style={styles.emptyStateSubtext}>
                Bắt đầu cuộc trò chuyện với nhóm
              </Text>
            </View>
          ) : (
            messages
              .filter((m) => {
                if (!m || typeof m !== "object") return false;
                // valid if has id/tempId
                if (m.id || m.tempId) return true;
                // or has media
                if (m.mediaUri || m.fileUrl) return true;
                // or has non-empty message text
                if (m.message && String(m.message).trim() !== "") return true;
                return false;
              })
              .map((msg, index) => renderMessage(msg, index))
          )}
        </ScrollView>
      </TouchableWithoutFeedback>

      {/* Mention List - Hiện phía trên input khi gõ @ */}
      {showMentionList &&
        (() => {
          const mentionableMembers = getMentionableMembers();
          console.log(
            "[GroupChat] Rendering mention list, members:",
            mentionableMembers.length
          );
          return (
            <View style={styles.mentionListContainer}>
              <ScrollView
                style={styles.mentionList}
                keyboardShouldPersistTaps="always"
              >
                {mentionableMembers.length > 0 ? (
                  mentionableMembers.map((member) => (
                    <TouchableOpacity
                      key={member.userId}
                      style={styles.mentionItem}
                      onPress={() => handleSelectMention(member)}
                    >
                      {member.userId === "all" ? (
                        <View style={styles.mentionAvatarAll}>
                          <Ionicons name="people" size={20} color="#FFFFFF" />
                        </View>
                      ) : member.avatarUrl ? (
                        <Image
                          source={{ uri: `${API_BASE_URL}${member.avatarUrl}` }}
                          style={styles.mentionAvatar}
                        />
                      ) : (
                        <View style={styles.mentionAvatarPlaceholder}>
                          <Ionicons name="person" size={20} color="#FFFFFF" />
                        </View>
                      )}
                      <View style={styles.mentionInfo}>
                        <Text style={styles.mentionName}>
                          {member.fullName || member.username}
                        </Text>
                        <Text style={styles.mentionUsername}>
                          @{member.username}
                          {member.userId === "all" &&
                            " • Tag toàn bộ thành viên"}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))
                ) : (
                  <View style={{ padding: 20, alignItems: "center" }}>
                    <Text style={{ color: "#6B7280" }}>
                      Không tìm thấy thành viên
                    </Text>
                    <Text
                      style={{ color: "#9CA3AF", fontSize: 12, marginTop: 4 }}
                    >
                      DEBUG: members={members.length}, currentUserId=
                      {currentUserId}
                    </Text>
                  </View>
                )}
              </ScrollView>
            </View>
          );
        })()}

      {/* Reply Input Bar - Hiển thị khi đang reply */}
      {replyingTo && (
        <View style={styles.replyInputBar}>
          <View style={styles.replyInputLeftLine} />
          <View style={styles.replyInputContent}>
            <View style={styles.replyInputIconContainer}>
              <Ionicons name="arrow-undo" size={18} color="#0084FF" />
            </View>
            <View style={styles.replyInputInfo}>
              <Text style={styles.replyInputName} numberOfLines={1}>
                Trả lời {replyingTo.userName || "Người dùng"}
              </Text>
              {replyingTo.mediaType ? (
                <View style={styles.replyInputMediaPreview}>
                  <Ionicons
                    name={
                      replyingTo.mediaType === "image" ? "image" : "videocam"
                    }
                    size={14}
                    color="#6B7280"
                  />
                  <Text style={styles.replyInputText} numberOfLines={1}>
                    {replyingTo.mediaType === "image" ? "Ảnh" : "Video"}
                  </Text>
                </View>
              ) : (
                <Text
                  style={styles.replyInputText}
                  numberOfLines={2}
                  ellipsizeMode="tail"
                >
                  {(() => {
                    try {
                      const msg = String(replyingTo.message || "").trim();
                      return msg || "Tin nhắn";
                    } catch (e) {
                      return "Tin nhắn";
                    }
                  })()}
                </Text>
              )}
            </View>
            <TouchableOpacity
              style={styles.replyInputClose}
              onPress={() => setReplyingTo(null)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close-circle" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Message Input */}
      <View style={styles.messageInputContainer}>
        <TouchableOpacity
          style={styles.attachButton}
          onPress={() => setShowMediaPicker(true)}
        >
          <Ionicons name="add-circle-outline" size={28} color="#3B82F6" />
        </TouchableOpacity>

        <View style={styles.inputWrapper}>
          <TextInput
            ref={messageInputRef}
            style={styles.messageInput}
            placeholder="Aa"
            placeholderTextColor="#9CA3AF"
            value={message}
            onChangeText={handleMessageChange}
            onSelectionChange={(e) =>
              setCursorPosition(e.nativeEvent.selection.end)
            }
            multiline
            maxLength={1000}
            secureTextEntry={false}
            keyboardType="default"
            textContentType="none"
            autoComplete="off"
            importantForAutofill="no"
            autoCorrect={true}
            spellCheck={true}
          />
          <TouchableOpacity
            style={styles.emojiButton}
            onPress={() => setShowEmojiPicker(!showEmojiPicker)}
          >
            <Ionicons name="happy-outline" size={24} color="#3B82F6" />
          </TouchableOpacity>
        </View>

        {message.trim() ? (
          <TouchableOpacity
            style={styles.sendButton}
            onPress={() => handleSend()}
          >
            <Ionicons name="send" size={24} color="#3B82F6" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={handleQuickLike} activeOpacity={0.8}>
            <LinearGradient
              colors={["#0084FF", "#0066CC"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.likeButton}
            >
              <Ionicons name="thumbs-up" size={20} color="#FFFFFF" />
            </LinearGradient>
          </TouchableOpacity>
        )}
      </View>

      {/* Emoji Picker Modal */}
      <Modal
        visible={showEmojiPicker}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowEmojiPicker(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowEmojiPicker(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.emojiPickerContainer}>
                <View style={styles.quickReactionsBar}>
                  {QUICK_REACTIONS.map((emoji, index) => (
                    <TouchableOpacity
                      key={index}
                      style={styles.quickReactionButton}
                      onPress={() => handleEmojiSelect(emoji)}
                    >
                      <Text style={styles.quickReactionEmoji}>{emoji}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <ScrollView
                  style={styles.emojiGrid}
                  showsVerticalScrollIndicator={false}
                >
                  <View style={styles.emojiGridContent}>
                    {EMOJI_LIST.map((emoji, index) => (
                      <TouchableOpacity
                        key={index}
                        style={styles.emojiButton}
                        onPress={() => handleEmojiSelect(emoji)}
                      >
                        <Text style={styles.emojiText}>{emoji}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Media Picker Modal */}
      <Modal
        visible={showMediaPicker}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowMediaPicker(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowMediaPicker(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.mediaPickerContainer}>
                <TouchableOpacity
                  style={styles.mediaOption}
                  onPress={() => handlePickMedia("image")}
                >
                  <Ionicons name="image" size={32} color="#3B82F6" />
                  <Text style={styles.mediaOptionText}>Chọn ảnh</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.mediaOption}
                  onPress={() => handlePickMedia("video")}
                >
                  <Ionicons name="videocam" size={32} color="#3B82F6" />
                  <Text style={styles.mediaOptionText}>Chọn video</Text>
                  <Text style={styles.mediaOptionSubtext}>
                    (Tối đa 30 giây)
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.mediaOption}
                  onPress={handlePickFile}
                >
                  <Ionicons name="document-text" size={32} color="#3B82F6" />
                  <Text style={styles.mediaOptionText}>Chọn tệp</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Context Menu Modal */}
      <Modal
        visible={showContextMenu}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowContextMenu(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowContextMenu(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.contextMenuContainer}>
                {/* Quick Reactions */}
                <View style={styles.quickReactionsBar}>
                  {QUICK_REACTIONS.map((emoji, index) => (
                    <TouchableOpacity
                      key={index}
                      style={styles.quickReactionButton}
                      onPress={() => handleReaction(emoji)}
                    >
                      <Text style={styles.quickReactionEmoji}>{emoji}</Text>
                    </TouchableOpacity>
                  ))}
                  <TouchableOpacity
                    style={styles.quickReactionButton}
                    onPress={() => {
                      setShowContextMenu(false);
                      // Có thể mở emoji picker để chọn thêm
                    }}
                  >
                    <Ionicons
                      name="add-circle-outline"
                      size={28}
                      color="#6B7280"
                    />
                  </TouchableOpacity>
                </View>

                {/* Context Menu Options */}
                <View style={styles.contextMenuOptions}>
                  {!showMoreOptions ? (
                    // MENU CÁP 1 - Ít option (giống Messenger)
                    selectedMessage?.isMine ? (
                      // Tin nhắn của mình - Cấp 1
                      <>
                        <TouchableOpacity
                          style={styles.contextMenuItem}
                          onPress={handleReply}
                        >
                          <Ionicons
                            name="arrow-undo"
                            size={22}
                            color="#111827"
                          />
                          <Text style={styles.contextMenuText}>Trả lời</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.contextMenuItem}
                          onPress={handleCopy}
                        >
                          <Ionicons
                            name="copy-outline"
                            size={22}
                            color="#111827"
                          />
                          <Text style={styles.contextMenuText}>Sao chép</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.contextMenuItem}
                          onPress={handleShowMore}
                        >
                          <Ionicons
                            name="ellipsis-horizontal-circle"
                            size={22}
                            color="#111827"
                          />
                          <Text style={styles.contextMenuText}>Khác</Text>
                        </TouchableOpacity>
                      </>
                    ) : (
                      // Tin nhắn người khác - Cấp 1
                      <>
                        <TouchableOpacity
                          style={styles.contextMenuItem}
                          onPress={handleReply}
                        >
                          <Ionicons
                            name="arrow-undo"
                            size={22}
                            color="#111827"
                          />
                          <Text style={styles.contextMenuText}>Trả lời</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.contextMenuItem}
                          onPress={handleCopy}
                        >
                          <Ionicons
                            name="copy-outline"
                            size={22}
                            color="#111827"
                          />
                          <Text style={styles.contextMenuText}>Sao chép</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.contextMenuItem}
                          onPress={handleShowMore}
                        >
                          <Ionicons
                            name="ellipsis-horizontal-circle"
                            size={22}
                            color="#111827"
                          />
                          <Text style={styles.contextMenuText}>Khác</Text>
                        </TouchableOpacity>
                      </>
                    )
                  ) : (
                    // MENU CẤP 2 - Đầy đủ options
                    <>
                      <TouchableOpacity
                        style={styles.contextMenuItem}
                        onPress={handleBackToMain}
                      >
                        <Ionicons name="arrow-back" size={22} color="#111827" />
                        <Text style={styles.contextMenuText}>Quay lại</Text>
                      </TouchableOpacity>

                      {selectedMessage?.isMine ? (
                        // Tin nhắn của mình - Cấp 2
                        <>
                          <TouchableOpacity
                            style={styles.contextMenuItem}
                            onPress={handleForward}
                          >
                            <Ionicons
                              name="arrow-forward"
                              size={22}
                              color="#111827"
                            />
                            <Text style={styles.contextMenuText}>
                              Chuyển tiếp
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.contextMenuItem}
                            onPress={handlePin}
                          >
                            <Ionicons
                              name={
                                selectedMessage?.isPinned
                                  ? "pin-outline"
                                  : "pin"
                              }
                              size={22}
                              color="#111827"
                            />
                            <Text style={styles.contextMenuText}>
                              {selectedMessage?.isPinned ? "Bỏ ghim" : "Ghim"}
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[
                              styles.contextMenuItem,
                              styles.contextMenuItemDanger,
                            ]}
                            onPress={handleDelete}
                          >
                            <Ionicons name="trash" size={22} color="#EF4444" />
                            <Text style={styles.contextMenuTextDanger}>
                              Xóa
                            </Text>
                          </TouchableOpacity>
                        </>
                      ) : (
                        // Tin nhắn người khác - Cấp 2
                        <>
                          <TouchableOpacity
                            style={styles.contextMenuItem}
                            onPress={handleForward}
                          >
                            <Ionicons
                              name="arrow-forward"
                              size={22}
                              color="#111827"
                            />
                            <Text style={styles.contextMenuText}>
                              Chuyển tiếp
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.contextMenuItem}
                            onPress={handleReport}
                          >
                            <Ionicons
                              name="warning"
                              size={22}
                              color="#F59E0B"
                            />
                            <Text style={styles.contextMenuText}>Báo cáo</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.contextMenuItem}
                            onPress={handlePin}
                          >
                            <Ionicons
                              name={
                                selectedMessage?.isPinned
                                  ? "pin-outline"
                                  : "pin"
                              }
                              size={22}
                              color="#111827"
                            />
                            <Text style={styles.contextMenuText}>
                              {selectedMessage?.isPinned ? "Bỏ ghim" : "Ghim"}
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[
                              styles.contextMenuItem,
                              styles.contextMenuItemDanger,
                            ]}
                            onPress={handleDelete}
                          >
                            <Ionicons name="trash" size={22} color="#EF4444" />
                            <Text style={styles.contextMenuTextDanger}>
                              Xóa (chỉ ở phía bạn)
                            </Text>
                          </TouchableOpacity>
                        </>
                      )}
                    </>
                  )}
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Mention Menu - Khi tap vào mention trong tin nhắn */}
      <Modal
        visible={showMentionMenu}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowMentionMenu(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowMentionMenu(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.mentionMenuContainer}>
                <View style={styles.mentionMenuHeader}>
                  {selectedMentionedUser?.avatarUrl ? (
                    <Image
                      source={{
                        uri: `${API_BASE_URL}${selectedMentionedUser.avatarUrl}`,
                      }}
                      style={styles.mentionMenuAvatar}
                    />
                  ) : (
                    <View style={styles.mentionMenuAvatarPlaceholder}>
                      <Ionicons name="person" size={32} color="#FFFFFF" />
                    </View>
                  )}
                  <Text style={styles.mentionMenuName}>
                    {selectedMentionedUser?.fullName ||
                      selectedMentionedUser?.username}
                  </Text>
                  <Text style={styles.mentionMenuUsername}>
                    @{selectedMentionedUser?.username}
                  </Text>
                </View>

                <View style={styles.mentionMenuOptions}>
                  <TouchableOpacity
                    style={styles.mentionMenuItem}
                    onPress={handleViewProfile}
                  >
                    <Ionicons
                      name="person-circle-outline"
                      size={24}
                      color="#111827"
                    />
                    <Text style={styles.mentionMenuText}>
                      Xem trang cá nhân
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.mentionMenuItem}
                    onPress={handleDirectMessage}
                  >
                    <Ionicons
                      name="chatbubble-outline"
                      size={24}
                      color="#111827"
                    />
                    <Text style={styles.mentionMenuText}>Nhắn tin</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.mentionMenuItem,
                      styles.mentionMenuItemDanger,
                    ]}
                    onPress={handleBlockUser}
                  >
                    <Ionicons name="ban-outline" size={24} color="#EF4444" />
                    <Text style={styles.mentionMenuTextDanger}>Chặn</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Image Viewer */}
      <ImageViewer
        visible={showImageViewer}
        images={messages.filter((m) => m.mediaType === "image" && m.mediaUri)}
        initialIndex={selectedImageIndex}
        onClose={() => setShowImageViewer(false)}
      />

      {/* Video Viewer Modal */}
      <Modal
        visible={showVideoModal}
        transparent={false}
        animationType="slide"
        onRequestClose={() => setShowVideoModal(false)}
      >
        <StatusBar barStyle="light-content" backgroundColor="#000" />
        <View style={{ flex: 1, backgroundColor: "#000" }}>
          <TouchableOpacity
            style={{ position: "absolute", top: 40, left: 16, zIndex: 20 }}
            onPress={() => setShowVideoModal(false)}
          >
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>
          {videoUri ? (
            <Video
              source={{ uri: videoUri }}
              style={{ flex: 1 }}
              useNativeControls
              resizeMode="contain"
              shouldPlay
            />
          ) : (
            <View
              style={{
                flex: 1,
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Text style={{ color: "#fff" }}>Không thể tải video</Text>
            </View>
          )}
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
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    paddingTop: Platform.OS === "ios" ? 50 : 12,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "flex-start",
  },
  headerCenter: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 8,
  },
  headerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 10,
  },
  headerAvatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#10B981",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },
  headerMemberCount: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },
  headerIcon: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "flex-end",
  },
  chatContent: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  chatContentContainer: {
    padding: 16,
    paddingBottom: 8,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 100,
    paddingHorizontal: 32,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#6B7280",
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: "#9CA3AF",
    marginTop: 8,
    textAlign: "center",
  },
  dateContainer: {
    alignItems: "center",
    marginVertical: 16,
  },
  dateText: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "500",
    backgroundColor: "#E5E7EB",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  myMessageContainer: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: 4,
    paddingLeft: 60, // Để cân đối với tin nhắn người khác có avatar
  },
  myMessageBubble: {
    backgroundColor: "#0084FF", // Màu xanh Messenger
    borderRadius: 18,
    // dynamic corner radii applied per-chain (do not hardcode top-right here)
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxWidth: "75%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  myMessageText: {
    fontSize: 15,
    color: "#FFFFFF",
    lineHeight: 20,
  },
  myMessageTime: {
    fontSize: 11,
    color: "#FFFFFF",
    opacity: 0.7,
    marginTop: 4,
    alignSelf: "flex-end",
  },
  // ✅ Read Receipts Styles
  readReceipts: {
    flexDirection: "row",
    alignItems: "center",
    // container will often be absolutely positioned relative to message container
    marginTop: 0,
  },
  readReceiptAvatar: {
    width: 21,
    height: 21,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#FFFFFF",
  },
  readReceiptAvatarPlaceholder: {
    width: 21,
    height: 21,
    borderRadius: 10,
    backgroundColor: "#9CA3AF",
    borderWidth: 1,
    borderColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
  },
  readReceiptAvatarText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  readReceiptCount: {
    fontSize: 10,
    color: "#FFFFFF",
    opacity: 0.9,
    marginLeft: 6,
    fontWeight: "650",
  },
  otherMessageContainer: {
    flexDirection: "row",
    marginBottom: 8,
    alignItems: "flex-start",
    paddingRight: 60, // Để cân đối
  },
  messageAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginRight: 8,
    marginTop: 2,
  },
  messageAvatarPlaceholder: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#9CA3AF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
    marginTop: 2,
  },
  messageAvatarText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  otherMessageContent: {
    flex: 1,
    maxWidth: "75%",
  },
  messageSenderName: {
    fontSize: 13,
    fontWeight: "600",
    color: "#050505", // Màu đen đậm hơn để dễ đọc
    marginBottom: 4,
    marginLeft: 12,
  },
  otherMessageBubble: {
    backgroundColor: "#F0F2F5", // Màu xám nhạt Messenger
    borderRadius: 18,
    // dynamic corner radii applied per-chain (do not hardcode top-left here)
    paddingHorizontal: 16,
    paddingVertical: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
    elevation: 1,
  },
  otherMessageText: {
    fontSize: 15,
    color: "#050505",
    lineHeight: 20,
  },
  otherMessageTime: {
    fontSize: 11,
    color: "#65676B",
    marginTop: 2,
    marginLeft: 12,
  },
  messageInputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  attachButton: {
    width: 36,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
    marginBottom: 2,
  },
  inputWrapper: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-end",
    backgroundColor: "#F3F4F6",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    minHeight: 40,
    maxHeight: 100,
  },
  messageInput: {
    flex: 1,
    fontSize: 15,
    color: "#111827",
    paddingVertical: 0,
    minHeight: 24,
  },
  emojiButton: {
    width: 28,
    height: 28,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
  },
  sendButton: {
    width: 36,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
    marginBottom: 2,
  },
  likeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
    marginBottom: 2,
    // Gradient sẽ được apply qua LinearGradient component
  },
  messageImage: {
    width: 200,
    height: 200,
    borderRadius: 12,
    marginBottom: 4,
  },
  messageImageOnly: {
    // Khi chỉ có ảnh/video, không có nền bubble
    marginBottom: 4,
    borderRadius: 18,
    overflow: "hidden",
  },
  mediaTimeOnly: {
    // Time cho media-only message
    marginLeft: 8,
    marginTop: 4,
  },
  reactionBadge: {
    position: "absolute",
    bottom: -8,
    right: 8,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  reactionText: {
    fontSize: 16,
  },
  emojiOnly: {
    fontSize: 48, // Emoji lớn khi không có bubble
    lineHeight: 56,
  },
  videoContainer: {
    position: "relative",
    marginBottom: 4,
  },
  videoOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.3)",
    borderRadius: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "flex-end",
  },
  emojiPickerContainer: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 16,
    paddingBottom: 32,
    maxHeight: "50%",
  },
  quickReactionsBar: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  quickReactionButton: {
    width: 48,
    height: 48,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 24,
    backgroundColor: "#F0F2F5",
  },
  quickReactionEmoji: {
    fontSize: 32,
  },
  emojiGrid: {
    flex: 1,
  },
  emojiGridContent: {
    flexDirection: "row",
    flexWrap: "wrap",
    padding: 16,
  },
  emojiButton: {
    width: "16.66%",
    aspectRatio: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emojiText: {
    fontSize: 32,
  },
  mediaPickerContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    marginHorizontal: 16,
    marginBottom: 32,
    padding: 24,
    flexDirection: "row",
    justifyContent: "space-around",
  },
  mediaOption: {
    alignItems: "center",
    padding: 20,
  },
  mediaOptionText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginTop: 12,
  },
  mediaOptionSubtext: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 4,
  },
  contextMenuContainer: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    marginBottom: 0,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 12,
  },
  contextMenuOptions: {
    paddingVertical: 4,
  },
  contextMenuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 16,
    gap: 16,
  },
  contextMenuItemDanger: {
    backgroundColor: "#FEF2F2",
  },
  contextMenuText: {
    fontSize: 16,
    color: "#111827",
    fontWeight: "500",
  },
  contextMenuTextDanger: {
    fontSize: 16,
    color: "#EF4444",
    fontWeight: "600",
  },
  // Mention styles
  mentionListContainer: {
    minHeight: 100,
    maxHeight: 250,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 2,
    borderTopColor: "#10B981", // DEBUG: Màu xanh lá để thấy rõ
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  mentionList: {
    flex: 1,
  },
  mentionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  mentionAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  mentionAvatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#9CA3AF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  mentionAvatarAll: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#0084FF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  mentionInfo: {
    flex: 1,
  },
  mentionName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 2,
  },
  mentionUsername: {
    fontSize: 14,
    color: "#6B7280",
  },
  mentionText: {
    color: "#0084FF",
    fontWeight: "700",
    textDecorationLine: "underline",
  },
  mentionAllText: {
    color: "#7C3AED", // Màu tím để phân biệt @All
    fontWeight: "700",
    textDecorationLine: "underline",
  },
  mentionTextMine: {
    // Style cho mention trong tin nhắn của mình (nền xanh)
    color: "#FFFFFF",
    fontWeight: "700",
    textDecorationLine: "underline",
    textDecorationColor: "#FFFFFF",
  },
  mentionAllTextMine: {
    // Style cho @All trong tin nhắn của mình (nền xanh)
    color: "#FFD700", // Màu vàng để nổi bật
    fontWeight: "700",
    textDecorationLine: "underline",
    textDecorationColor: "#FFD700",
  },
  mentionMenuContainer: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 20,
    overflow: "hidden",
  },
  mentionMenuHeader: {
    alignItems: "center",
    paddingVertical: 24,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  mentionMenuAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 12,
  },
  mentionMenuAvatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#9CA3AF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  mentionMenuName: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },
  mentionMenuUsername: {
    fontSize: 16,
    color: "#6B7280",
  },
  mentionMenuOptions: {
    paddingTop: 8,
  },
  mentionMenuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 16,
    gap: 16,
  },
  mentionMenuItemDanger: {
    backgroundColor: "#FEF2F2",
  },
  mentionMenuText: {
    fontSize: 16,
    color: "#111827",
    fontWeight: "500",
  },
  mentionMenuTextDanger: {
    fontSize: 16,
    color: "#EF4444",
    fontWeight: "600",
  },
  // Reply styles
  replyInputBar: {
    flexDirection: "row",
    alignItems: "stretch",
    paddingLeft: 12,
    paddingRight: 16,
    paddingVertical: 10,
    backgroundColor: "#F9FAFB",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  replyInputLeftLine: {
    width: 3,
    backgroundColor: "#0084FF",
    borderRadius: 2,
    marginRight: 12,
  },
  replyInputContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  replyInputIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#E0F2FE",
    justifyContent: "center",
    alignItems: "center",
  },
  replyInputInfo: {
    flex: 1,
  },
  replyInputName: {
    fontSize: 13,
    fontWeight: "600",
    color: "#0084FF",
    marginBottom: 3,
  },
  replyInputText: {
    fontSize: 13,
    color: "#6B7280",
    lineHeight: 18,
  },
  replyInputMediaPreview: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  replyInputClose: {
    padding: 4,
    justifyContent: "center",
    alignItems: "center",
  },
  // Highlight message animation
  highlightedMessageContainer: {
    backgroundColor: "#FEF3C7",
    borderRadius: 8,
    marginHorizontal: -4,
    paddingHorizontal: 4,
  },
  replyPreviewInMessage: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    paddingLeft: 8,
    paddingVertical: 6,
    paddingRight: 8,
    backgroundColor: "rgba(0, 0, 0, 0.05)",
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: "#0084FF",
    minWidth: 120,
    maxWidth: "85%",
  },
  replyPreviewLine: {
    // Line đã được thay thế bằng borderLeftWidth của replyPreviewInMessage
    // Không còn cần thiết nữa - để trống để tránh lỗi
    width: 0,
    height: 0,
  },
  replyPreviewMine: {
    // Reply trong tin nhắn của mình (nền xanh) - màu trắng đục
    backgroundColor: "rgba(255, 255, 255, 0.25)",
    borderLeftColor: "rgba(255, 255, 255, 0.7)",
  },
  replyPreviewOther: {
    // Reply trong tin nhắn người khác (nền xám) - màu xanh nhạt
    backgroundColor: "rgba(0, 132, 255, 0.1)",
    borderLeftColor: "#0084FF",
  },
  replyPreviewContent: {
    flex: 1,
  },
  replyPreviewName: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6B7280",
    marginBottom: 2,
  },
  replyPreviewNameMine: {
    color: "rgba(255, 255, 255, 0.9)",
  },
  replyPreviewText: {
    fontSize: 13,
    color: "#9CA3AF",
    lineHeight: 18,
    flexShrink: 1,
    flexWrap: "wrap",
    flex: 1,
  },
  replyPreviewTextMine: {
    color: "rgba(255, 255, 255, 0.8)",
  },
  replyPreviewMedia: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  // Reply Indicator - Messenger style (outside bubble)
  replyIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 4,
    paddingHorizontal: 8,
  },
  replyIndicatorMine: {
    justifyContent: "flex-end",
  },
  replyIndicatorOther: {
    justifyContent: "flex-start",
    marginLeft: 36, // Offset cho avatar
  },
  replyIndicatorText: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "500",
  },
});
