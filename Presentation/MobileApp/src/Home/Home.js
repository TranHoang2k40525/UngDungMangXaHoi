// Home.js (Fixed: No duplicate friends, proper mutual follow detection)
import React, { useEffect, useMemo, useState, useRef } from "react";
import {
  View,
  Text,
  Image,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Platform,
  PermissionsAndroid,
  Share,
  KeyboardAvoidingView,
  Modal,
  Alert,
  ScrollView,
} from "react-native";
import { RefreshControl } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation, useRoute } from "@react-navigation/native";
import { onTabTriple } from "../Utils/TabRefreshEmitter";
import { StoryItem, StoryAddItem } from "./StoryComponents";
import { useUser } from "../Context/UserContext";
import { useFollow } from "../Context/FollowContext";
import * as ImagePicker from "expo-image-picker";
import CommentsModal from "./CommentsModal";
import ReactionPicker, { getReactionEmoji } from "./ReactionPicker";
import ReactionsListModal from "./ReactionsListModal";
import SharePostModal from "./SharePostModal";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import {
  getFeed,
  updatePostPrivacy,
  updatePostCaption,
  deletePost,
  getProfile,
  getFollowing,
  getFollowers,
  updatePostTags,
  followUser,
  unfollowUser,
  addReaction,
  getReactionSummary,
  getCommentCount,
  API_BASE_URL,
  getFeedStories,
} from "../API/Api";
import { Ionicons } from "@expo/vector-icons";
import { VideoView, useVideoPlayer } from "expo-video";
import NotificationAPI from "../API/NotificationAPI";
import notificationSignalRService from "../ServicesSingalR/notificationService";

// Component wrapper cho video thumbnail trong feed
const VideoThumbnail = React.memo(({ videoUrl, style, onPress }) => {
  const player = useVideoPlayer(videoUrl, (p) => {
    if (p) {
      p.muted = true;
      p.loop = false;
    }
  });
  return (
    <TouchableOpacity activeOpacity={0.9} onPress={onPress}>
      <VideoView
        style={style}
        player={player}
        contentFit="cover"
        nativeControls={false}
      />
      <View style={styles.playOverlay} pointerEvents="none">
        <Ionicons name="play" size={36} color="#fff" />
      </View>
    </TouchableOpacity>
  );
});

const PostImagesCarousel = ({ images = [] }) => {
  const [index, setIndex] = useState(0);
  const [viewerVisible, setViewerVisible] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);
  const imageWidth = 400;
  const openViewer = (idx) => {
    setViewerIndex(idx);
    setViewerVisible(true);
  };
  return (
    <View style={{ position: "relative" }}>
      <FlatList
        data={images}
        keyExtractor={(it, i) => String(i)}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        style={{ width: imageWidth }}
        renderItem={({ item, index: idx }) => (
          <TouchableOpacity
            activeOpacity={0.95}
            onPress={() => openViewer(idx)}
          >
            <Image
              source={{ uri: item }}
              style={[styles.postImage, { width: imageWidth }]}
            />
          </TouchableOpacity>
        )}
        onMomentumScrollEnd={(e) => {
          const w = e.nativeEvent.layoutMeasurement.width || imageWidth;
          const x = e.nativeEvent.contentOffset.x || 0;
          setIndex(Math.max(0, Math.round(x / w)));
        }}
      />
      <View style={styles.imageCounter}>
        <Text style={styles.imageCounterText}>
          {index + 1}/{images.length}
        </Text>
      </View>
      <View style={styles.dotsContainer}>
        {images.map((_, i) => (
          <View key={i} style={[styles.dot, i === index && styles.dotActive]} />
        ))}
      </View>
      {/* ImageViewer modal */}
      {viewerVisible && (
        <Modal
          visible={viewerVisible}
          transparent
          onRequestClose={() => setViewerVisible(false)}
        >
          <ImageViewer
            imageUrls={images.map((url) => ({ url }))}
            index={viewerIndex}
            enableSwipeDown
            onSwipeDown={() => setViewerVisible(false)}
            onCancel={() => setViewerVisible(false)}
            saveToLocalByLongPress={false}
            enablePreload={true}
            renderIndicator={(currentIndex, allSize) => (
              <View
                style={{
                  position: "absolute",
                  top: 40,
                  right: 20,
                  backgroundColor: "rgba(0,0,0,0.5)",
                  borderRadius: 12,
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                }}
              >
                <Text style={{ color: "#fff", fontWeight: "bold" }}>
                  {currentIndex}/{allSize}
                </Text>
              </View>
            )}
          />
        </Modal>
      )}
    </View>
  );
};

export default function Home() {
  const insets = useSafeAreaInsets();
  const BOTTOM_NAV_HEIGHT = 0;
  const { markAsFollowed, markAsUnfollowed, isFollowed } = useFollow();
  // Per-post local UI state (likes/shares/comments counts)
  const [postStates, setPostStates] = useState({}); // { [postId]: { liked, likes, shares, comments } }

  // Track posts that recently had reaction changes (to prevent refresh overwrite)
  const recentReactionChanges = useRef({});

  const renderSingleImageViewer = () =>
    singleViewerVisible && singleViewerUrl ? (
      <Modal
        visible={singleViewerVisible}
        transparent
        onRequestClose={() => setSingleViewerVisible(false)}
      >
        <ImageViewer
          imageUrls={[{ url: singleViewerUrl }]}
          index={0}
          enableSwipeDown
          onSwipeDown={() => setSingleViewerVisible(false)}
          onCancel={() => setSingleViewerVisible(false)}
          saveToLocalByLongPress={false}
          enablePreload={true}
          renderIndicator={(currentIndex, allSize) => (
            <View
              style={{
                position: "absolute",
                top: 40,
                right: 20,
                backgroundColor: "rgba(0,0,0,0.5)",
                borderRadius: 12,
                paddingHorizontal: 10,
                paddingVertical: 4,
              }}
            >
              <Text style={{ color: "#fff", fontWeight: "bold" }}>
                {currentIndex}/{allSize}
              </Text>
            </View>
          )}
        />
      </Modal>
    ) : null;
  const [activeCommentsPostId, setActiveCommentsPostId] = useState(null);
  const [showComments, setShowComments] = useState(false);
  const [showReactionsListPostId, setShowReactionsListPostId] = useState(null);
  const [showReactionsList, setShowReactionsList] = useState(false);
  const [posts, setPosts] = useState([]);
  const [myStorySlot, setMyStorySlot] = useState({
    id: "me",
    name: "Tin của bạn",
    avatar: null,
    hasStory: false,
    storyData: null,
  });
  const [friendStories, setFriendStories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState(null); // lưu dạng number khi có thể
  const [refreshing, setRefreshing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMorePosts, setHasMorePosts] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const flatListRef = React.useRef(null);
  const [optionsPostId, setOptionsPostId] = useState(null);
  const [showOptions, setShowOptions] = useState(false);
  const [showPrivacySheet, setShowPrivacySheet] = useState(false);
  const [busy, setBusy] = useState(false);
  // Modal for viewing tags list
  const [showTagListPostId, setShowTagListPostId] = useState(null);
  const [tagListForModal, setTagListForModal] = useState([]);
  // Edit tags UI
  const [showEditTagsPostId, setShowEditTagsPostId] = useState(null);
  const [editTagsList, setEditTagsList] = useState([]);
  const [availableTagUsers, setAvailableTagUsers] = useState([]);
  const [availableTagUsersAll, setAvailableTagUsersAll] = useState([]);
  const [tagChangeQueue, setTagChangeQueue] = useState({
    toAdd: [],
    toRemove: [],
  });
  const [showAddTagList, setShowAddTagList] = useState(false);
  // Inline caption edit state
  const [editingCaptionPostId, setEditingCaptionPostId] = useState(null);
  const [captionDraft, setCaptionDraft] = useState("");
  const [showReactionPicker, setShowReactionPicker] = useState(null);
  const [reactionPickerPosition, setReactionPickerPosition] = useState({
    top: 0,
    left: 0,
  });
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [showShareModal, setShowShareModal] = useState(false);
  const [sharePost, setSharePost] = useState(null);
  const longPressTimer = useRef(null);
  const navigation = useNavigation();
  const route = useRoute();
  const { user: ctxUser } = useUser();
  // Normalize user/tag objects used in tag lists and chips so they always contain `id`, `username`, and `avatarUrl`.
  const normalizeUser = (u) => {
    if (!u) return { id: null, username: "", avatarUrl: null, fullName: "" };
    const rawId = u?.id ?? u?.userId ?? u?.user_id ?? u?.UserId ?? u?.user_id;
    const id = Number(rawId);
    const username =
      u?.username ?? u?.userName ?? u?.user_name ?? u?.name ?? "";
    const rawAvatar = u?.avatarUrl ?? u?.avatar_url ?? u?.userAvatar ?? null;
    const avatarUrl = rawAvatar
      ? String(rawAvatar).startsWith("http")
        ? rawAvatar
        : `${API_BASE_URL}${rawAvatar}`
      : null;
    const fullName = u?.fullName ?? u?.full_name ?? u?.displayName ?? "";
    return {
      id: Number.isFinite(id) ? id : null,
      username,
      avatarUrl,
      fullName,
    };
  };
  // Stories storage key helper (per-user)
  const storiesStorageKey = (userId) => {
    if (userId == null) return "currentUserStories";
    return `currentUserStories_${userId}`;
  };
  // Stories data for header: add slot + my story + friend stories
  const storiesData = useMemo(
    () => [
      {
        id: "add",
        name: "Thêm vào chuyện của bạn",
        avatar: null,
        hasStory: false,
        storyData: null,
      },
      myStorySlot,
      ...friendStories,
    ],
    [myStorySlot, friendStories]
  );
  // Function to load user avatar and info
  const loadUserAvatar = async () => {
    try {
      const userStr = await AsyncStorage.getItem("userInfo");
      if (userStr) {
        const user = JSON.parse(userStr);
        const rawAvatar = user?.avatarUrl ?? user?.avatar_url ?? null;
        const avatarUri = rawAvatar
          ? String(rawAvatar).startsWith("http")
            ? rawAvatar
            : `${API_BASE_URL}${rawAvatar}`
          : null;

        setMyStorySlot((prev) => ({
          ...prev,
          name: user?.username || prev.name,
          avatar: avatarUri
            ? { uri: avatarUri }
            : require("../Assets/trai.png"),
        }));

        const key = storiesStorageKey(
          user?.user_id ?? user?.userId ?? user?.UserId ?? null
        );
        const savedStoriesStr = await AsyncStorage.getItem(key);
        if (savedStoriesStr) {
          try {
            let storiesArray = JSON.parse(savedStoriesStr);
            storiesArray = storiesArray.map((story) => ({
              ...story,
              userAvatar: avatarUri,
              userName: user?.username || story.userName,
            }));
            await AsyncStorage.setItem(key, JSON.stringify(storiesArray));
            setMyStorySlot((prev) => ({
              ...prev,
              storyData: storiesArray,
            }));
          } catch (e) {
            console.warn("[HOME] Failed updating saved stories avatars:", e);
          }
        }
      }
    } catch (e) {
      console.warn("[HOME] Error loading user avatar:", e);
    }
  };

  // Check user story (per-user storage + API fallback)
  const checkUserStory = async (userId) => {
    try {
      const key = storiesStorageKey(userId);
      const savedStories = await AsyncStorage.getItem(key);
      if (savedStories) {
        let storiesArray = JSON.parse(savedStories);
        const storedOwnerId =
          storiesArray && storiesArray.length > 0
            ? storiesArray[0].userId ?? storiesArray[0].user_id ?? null
            : null;
        if (storedOwnerId != null && Number(storedOwnerId) !== Number(userId)) {
          await AsyncStorage.removeItem(key);
        } else {
          const now = Date.now();
          const validStories = storiesArray.filter((s) => {
            const age = now - new Date(s.createdAt).getTime();
            return age < 24 * 60 * 60 * 1000;
          });

          if (validStories.length > 0) {
            if (validStories.length !== storiesArray.length) {
              await AsyncStorage.setItem(key, JSON.stringify(validStories));
            }

            setMyStorySlot((prev) => ({
              ...prev,
              hasStory: true,
              id: "me",
              storyData: validStories,
            }));
            return;
          } else {
            await AsyncStorage.removeItem(key);
            setMyStorySlot((prev) => ({
              ...prev,
              hasStory: false,
              storyData: null,
            }));
            return;
          }
        }
      }

      // API fallback for current user's stories
      const response = await fetch(
        `${API_BASE_URL}/api/stories/user/${userId}/active`
      );
      if (!response.ok) {
        console.log("[HOME] No active stories found from API");
        setMyStorySlot((prev) => ({
          ...prev,
          hasStory: false,
          storyData: null,
        }));
        return;
      }

      const data = await response.json();
      let storiesFromAPI = [];
      if (data?.data) {
        storiesFromAPI = Array.isArray(data.data) ? data.data : [data.data];
      }

      if (storiesFromAPI.length > 0) {
        const storyDataArray = storiesFromAPI.map((story) => ({
          id: story.id,
          mediaUrl: story.mediaUrl,
          mediaType: story.mediaType,
          userName: story.userName,
          userAvatar: story.userAvatar,
          createdAt: story.createdAt,
          viewCount: story.viewCount || 0,
          userId: story.userId ?? userId,
        }));

        setMyStorySlot((prev) => ({
          ...prev,
          hasStory: true,
          id: "me",
          storyData: storyDataArray,
        }));

        await AsyncStorage.setItem(key, JSON.stringify(storyDataArray));
      } else {
        setMyStorySlot((prev) => ({
          ...prev,
          hasStory: false,
          storyData: null,
        }));
      }
    } catch (error) {
      console.error("[HOME] Error checking user stories:", error);
    }
  };

  // ✅ Load friend stories - API now returns grouped by user
  const loadFeedStories = async () => {
    try {
      console.log("[Home] ===== Loading feed stories =====");
      console.log("[Home] Current user ID:", currentUserId);

      const res = await getFeedStories();
      console.log("[Home] API Response:", JSON.stringify(res, null, 2));

      const raw = res?.data ?? res ?? [];
      const list = Array.isArray(raw) ? raw : [];

      console.log(
        "[Home] Raw feed stories (grouped by user) count:",
        list.length
      );
      console.log("[Home] Raw data structure:", JSON.stringify(list, null, 2));

      // Map from API format (UserStoriesGroupDto) to component format
      // HIỂN THỊ TẤT CẢ BẠN BÈ (kể cả không có story)
      const mapped = list
        .filter((userGroup) => {
          // Skip current user
          const shouldSkip = Number(userGroup.userId) === Number(currentUserId);
          console.log(
            `[Home] User ${userGroup.userId} (${userGroup.userName}): Skip=${shouldSkip}`
          );
          return !shouldSkip;
        })
        .map((userGroup) => {
          const stories = Array.isArray(userGroup.stories)
            ? userGroup.stories
            : [];

          // Process avatar URL
          let avatarUrl = userGroup.userAvatar || userGroup.avatarUrl;
          if (avatarUrl && !avatarUrl.startsWith("http")) {
            avatarUrl = `${API_BASE_URL}${avatarUrl}`;
          }

          const result = {
            id: String(userGroup.userId),
            name: userGroup.userName || userGroup.username || "user",
            avatar: avatarUrl,
            hasStory: stories.length > 0, // true nếu có story, false nếu chưa có
            storyData:
              stories.length > 0
                ? stories.map((s) => ({
                    id: s.id,
                    mediaUrl: s.mediaUrl,
                    mediaType: s.mediaType,
                    userName: userGroup.userName,
                    userAvatar: avatarUrl,
                    createdAt: s.createdAt,
                    userId: userGroup.userId,
                    privacy: s.privacy || "public",
                    viewCount: s.viewCount || 0,
                  }))
                : [], // Bạn bè chưa có story thì storyData = []
          };

          console.log(
            `[Home] Mapped user: ${result.name}, hasStory: ${result.hasStory}, stories count: ${result.storyData.length}`
          );
          return result;
        });

      console.log("[Home] Final mapped friends with stories:", mapped.length);
      console.log("[Home] Mapped data:", JSON.stringify(mapped, null, 2));
      setFriendStories(mapped);
    } catch (e) {
      console.warn("[HOME] loadFeedStories error:", e);
      console.error("[HOME] Error stack:", e.stack);
    }
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        try {
          const userStr = await AsyncStorage.getItem("userInfo");
          if (userStr) {
            const user = JSON.parse(userStr);
            const raw =
              user?.user_id ?? user?.userId ?? user?.UserId ?? user?.id ?? null;
            const uidNum = raw != null ? Number(raw) : null;
            if (mounted)
              setCurrentUserId(Number.isFinite(uidNum) ? uidNum : null);

            if (Number.isFinite(uidNum)) {
              await checkUserStory(uidNum);
            }
            await loadUserAvatar();
          }
        } catch (e) {
          console.warn("[HOME] Error loading user from AsyncStorage:", e);
        }

        try {
          const prof = await getProfile();
          const profId = prof?.userId ?? prof?.UserId;
          if (profId != null) {
            const uid = Number(profId);
            if (Number.isFinite(uid)) {
              if (mounted) setCurrentUserId(uid);
              console.log("[HOME] getProfile() -> userId set:", uid);
            } else {
              console.log("[HOME] getProfile() -> invalid userId:", profId);
            }
          } else {
            console.log("[HOME] getProfile() -> no userId on payload");
          }
        } catch (e) {
          console.log(
            "[HOME] getProfile() failed (non-fatal):",
            e?.message || e
          );
        }

        const data = await getFeed(1, 10);
        if (mounted) {
          let arr = Array.isArray(data) ? data : [];
          console.log(`[HOME] 📥 Initial feed loaded - ${arr.length} posts`);
          // KHÔNG sort lại - backend đã trả về thứ tự đúng (prioritized + Business injected)
          setPosts(arr);
          setCurrentPage(1);
          setHasMorePosts(arr.length >= 10);
          const next = {};
          for (const p of arr) {
            try {
              console.log(`[HOME] Loading reactions for post ${p.id}...`);
              const reactionData = await getReactionSummary(p.id);
              console.log(`[HOME] Post ${p.id} reaction data:`, reactionData);
              const topReactions = (reactionData?.reactionCounts || [])
                .sort((a, b) => b.count - a.count)
                .slice(0, 3)
                .map((r) => r.reactionType);
              next[p.id] = {
                liked: reactionData?.userReaction != null,
                likes: Number(reactionData?.totalReactions ?? 0),
                shares: Number(p.sharesCount ?? 0),
                comments: Number(p.commentsCount ?? 0),
                reactionType: reactionData?.userReaction,
                topReactions: topReactions, // Top 3 most used reactions
                reactionCounts: reactionData?.reactionCounts || [],
              };
              console.log(`[HOME] Post ${p.id} final state:`, next[p.id]);
            } catch (err) {
              console.error(
                `[HOME] ❌ Error loading reactions for post ${p.id}:`,
                err
              );
              next[p.id] = {
                liked: false,
                likes: Number(p.likesCount ?? 0),
                shares: Number(p.sharesCount ?? 0),
                comments: Number(p.commentsCount ?? 0),
                reactionType: null,
                topReactions: [],
                reactionCounts: [],
              };
            }
          }
          setPostStates(next);
          console.log(`[HOME] ✅ All post states initialized:`, next);
        }
      } catch (e) {
        console.warn("Feed error", e);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", async () => {
      await loadUserAvatar();
      if (route?.params?.refresh) {
        await onRefreshFeed();
        try {
          navigation.setParams({ refresh: false });
        } catch {}
      }
      await loadFeedStories();
    });
    return unsubscribe;
  }, [navigation, route?.params?.refresh, currentUserId]);

  useEffect(() => {
    if (currentUserId != null && Number.isFinite(currentUserId)) {
      checkUserStory(currentUserId);
    } else {
      setMyStorySlot((prev) => ({
        ...prev,
        hasStory: false,
        storyData: null,
      }));
    }
  }, [currentUserId]);

  useEffect(() => {
    if (route.params?.createdStory && route.params?.newStory) {
      const story = route.params.newStory;
      const ownerId = story.userId ?? story.user_id ?? currentUserId ?? null;
      const newStoryData = {
        id: story.id,
        mediaUrl: story.mediaUrl,
        mediaType: story.mediaType,
        createdAt: story.createdAt,
        userName: story.userName,
        userAvatar: story.userAvatar,
        viewCount: 0,
        userId: ownerId,
      };
      (async () => {
        try {
          const key = storiesStorageKey(ownerId);
          const savedStories = await AsyncStorage.getItem(key);
          let storiesArray = savedStories ? JSON.parse(savedStories) : [];
          const now = Date.now();
          storiesArray = storiesArray.filter((s) => {
            const age = now - new Date(s.createdAt).getTime();
            return age < 24 * 60 * 60 * 1000;
          });
          storiesArray.unshift(newStoryData);
          await AsyncStorage.setItem(key, JSON.stringify(storiesArray));
          if (Number(ownerId) === Number(currentUserId)) {
            setMyStorySlot((prev) => ({
              ...prev,
              id: "me",
              hasStory: true,
              storyData: storiesArray,
            }));
          }
          await loadFeedStories();
        } catch (e) {
          console.warn("[HOME] Failed to save story array:", e);
        }
      })();
      navigation.setParams({
        createdStory: undefined,
        newStory: undefined,
        timestamp: undefined,
      });
    }
  }, [route.params?.timestamp]);
  // Refresh feed when screen focuses + reload avatar
  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", async () => {
      console.log("[HOME] Screen focused");
      // ✅ Reload avatar mỗi khi focus (để cập nhật nếu đổi từ Profile)
      await loadUserAvatar();
      // Load notification count
      await loadUnreadNotificationCount();
      // Refresh feed if requested
      if (route?.params?.refresh) {
        await onRefreshFeed();
        try {
          navigation.setParams({ refresh: false });
        } catch {}
      }
    });
    return unsubscribe;
  }, [navigation, route?.params?.refresh]);

  // Load unread notification count và kết nối SignalR
  useEffect(() => {
    loadUnreadNotificationCount();

    // Kết nối SignalR để nhận thông báo real-time
    const connectSignalR = async () => {
      try {
        await notificationSignalRService.connect();

        // Lắng nghe khi có thông báo mới
        notificationSignalRService.onReceiveNotification((notification) => {
          console.log("[HOME] New notification received:", notification);
          setUnreadNotificationCount((prev) => prev + 1);
        });
      } catch (error) {
        console.error("[HOME] SignalR connection error:", error);
      }
    };

    connectSignalR();

    return () => {
      notificationSignalRService.disconnect();
    };
  }, []);

  const loadUnreadNotificationCount = async () => {
    try {
      const count = await NotificationAPI.getUnreadCount();
      setUnreadNotificationCount(count);
    } catch (error) {
      console.error("[HOME] Load unread notification count error:", error);
    }
  };
  // Reload story whenever currentUserId changes
  useEffect(() => {
    if (currentUserId != null && Number.isFinite(currentUserId)) {
      console.log(
        "[HOME] CurrentUserId changed, reloading story:",
        currentUserId
      );
      // ✅ Load friend stories when currentUserId is available
      loadFeedStories();
      checkUserStory(currentUserId);
    }
  }, [currentUserId]);
  // Log ownership mapping whenever posts or user changes
  useEffect(() => {
    const uid = getOwnerId();
    console.log(
      "[HOME] Current userId used for ownership:",
      uid,
      "Context:",
      ctxUser?.user_id ?? ctxUser?.UserId ?? ctxUser?.id,
      "State:",
      currentUserId
    );
    posts.forEach((p) => {
      const pid = p?.user?.id != null ? Number(p.user.id) : null;
      const own = Number.isFinite(uid) && Number.isFinite(pid) && uid === pid;
      console.log("[HOME] Post ownership check ->", {
        postId: p.id,
        postUserId: pid,
        isOwner: own,
      });
    });
  }, [posts, currentUserId, ctxUser]);
  const handleCameraPress = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      console.log("Camera permission not granted");
      return;
    }
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 1,
        allowsEditing: false,
        exif: false,
      });
      if (result.canceled) return;
      const uri =
        result.assets && result.assets.length > 0
          ? result.assets[0].uri
          : result.uri;
      if (uri) {
        navigation.navigate("PhotoPreview", { photoUri: uri });
      }
    } catch (err) {
      console.log("Camera error:", err);
    }
  };

  const handleAddStory = async () => {
    try {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        console.log("Media library permission not granted");
        return;
      }
      const libOpts = {
        quality: 0.9,
        mediaTypes: ImagePicker.MediaTypeOptions.All,
      };
      const result = await ImagePicker.launchImageLibraryAsync(libOpts);
      if (result.canceled) return;
      const asset =
        result.assets && result.assets.length > 0 ? result.assets[0] : null;
      const uri = asset?.uri || result.uri;
      if (!uri) return;
      let durationSec = null;
      if (asset?.duration != null) {
        durationSec =
          asset.duration > 1000
            ? Math.round(asset.duration / 1000)
            : asset.duration;
      } else if (asset?.durationMillis != null) {
        durationSec = Math.round(asset.durationMillis / 1000);
      } else if (result.duration != null) {
        durationSec =
          result.duration > 1000
            ? Math.round(result.duration / 1000)
            : result.duration;
      } else if (result.durationMillis != null) {
        durationSec = Math.round(result.durationMillis / 1000);
      }
      if (durationSec != null && durationSec > 30) {
        Alert.alert(
          "Video quá dài",
          `Video dài ${Math.floor(durationSec / 60)}:${String(
            durationSec % 60
          ).padStart(2, "0")}. Vui lòng chọn video có độ dài tối đa 30 giây.`
        );
        return;
      }
      const filename = asset?.fileName || uri.split("/").pop();
      const fileObj = {
        uri,
        name: filename,
        type:
          asset?.type === "video" || asset?.mediaType === "video"
            ? "video/mp4"
            : asset?.type || "application/octet-stream",
      };
      navigation.navigate("CreateStory", { media: fileObj });
    } catch (e) {
      console.warn("[HOME] handleAddStory error", e?.message || e);
    }
  };

  const onToggleLike = (postId) => {
    // Get current reaction type, default to Like (1) if no reaction
    const currentReactionType = postStates[postId]?.reactionType || 1;
    handleReaction(postId, currentReactionType);
  };

  const handleReaction = async (postId, reactionType) => {
    console.log(
      `[HOME] 🎯 handleReaction called - postId: ${postId}, reactionType: ${reactionType}`
    );

    // Close reaction picker immediately for better UX
    setShowReactionPicker(null);

    // Mark this post as recently changed to prevent refresh overwrite
    recentReactionChanges.current[postId] = Date.now();
    // Clear the mark after 3 seconds
    setTimeout(() => {
      delete recentReactionChanges.current[postId];
    }, 3000);

    try {
      // Optimistic UI update
      setPostStates((prev) => {
        const cur = prev[postId] || {
          liked: false,
          likes: 0,
          shares: 0,
          comments: 0,
          reactionType: null,
          topReactions: [],
          reactionCounts: [],
        };
        const isSameType = cur.reactionType === reactionType;
        const liked = !isSameType;

        // Calculate likes change correctly:
        // - No reaction before -> add 1
        // - Same reaction type -> remove (subtract 1)
        // - Different reaction type -> keep same count (just change type)
        let likes = cur.likes;
        if (!cur.reactionType) {
          likes = cur.likes + 1;
        } else if (isSameType) {
          likes = Math.max(0, cur.likes - 1);
        }

        console.log(
          `[HOME] Optimistic update - postId: ${postId}, liked: ${liked}, likes: ${likes}, reactionType: ${
            liked ? reactionType : null
          }`
        );
        return {
          ...prev,
          [postId]: {
            ...cur,
            liked,
            likes,
            reactionType: liked ? reactionType : null,
          },
        };
      });

      // Call API
      console.log(`[HOME] Calling addReaction API...`);
      const addResult = await addReaction(postId, reactionType);
      console.log(`[HOME] ✅ addReaction API success:`, addResult);

      // Fetch latest reaction data from server to sync
      // Add a delay to ensure DB transaction is committed
      await new Promise((resolve) => setTimeout(resolve, 500));

      try {
        console.log(`[HOME] Fetching getReactionSummary for sync...`);
        const reactionData = await getReactionSummary(postId);
        console.log(`[HOME] ✅ getReactionSummary success:`, reactionData);

        const topReactions = (reactionData?.reactionCounts || [])
          .sort((a, b) => b.count - a.count)
          .slice(0, 3)
          .map((r) => r.reactionType);

        console.log(
          `[HOME] Setting final synced state - liked: ${
            reactionData?.userReaction != null
          }, likes: ${reactionData?.totalReactions}, userReaction: ${
            reactionData?.userReaction
          }`
        );

        // Double-check: only update if post hasn't had another reaction change
        const timeSinceThisChange =
          Date.now() - (recentReactionChanges.current[postId] || 0);
        if (timeSinceThisChange > 4000) {
          console.log(
            `[HOME] ⚠️ Another reaction happened during sync, keeping optimistic state`
          );
          return;
        }

        setPostStates((prev) => ({
          ...prev,
          [postId]: {
            ...prev[postId],
            liked: reactionData?.userReaction != null,
            likes: Number(reactionData?.totalReactions ?? 0),
            reactionType: reactionData?.userReaction,
            topReactions: topReactions,
            reactionCounts: reactionData?.reactionCounts || [],
          },
        }));
      } catch (err) {
        console.error("[HOME] ❌ Error loading reaction summary:", err);
        // Keep optimistic update even if sync fails
      }
    } catch (error) {
      console.error("[HOME] ❌ Error adding reaction:", error);
      Alert.alert("Lỗi", "Không thể thả cảm xúc. Vui lòng thử lại.", [
        { text: "OK" },
      ]);
      // Rollback optimistic update on error
      setPostStates((prev) => {
        const cur = prev[postId] || {
          liked: false,
          likes: 0,
          shares: 0,
          comments: 0,
        };
        return {
          ...prev,
          [postId]: {
            ...cur,
            liked: false,
            likes: Math.max(0, cur.likes - 1),
            reactionType: null,
          },
        };
      });
    }
  };

  const likeButtonRefs = useRef({});

  const onLongPressLike = (postId) => {
    const buttonRef = likeButtonRefs.current[postId];
    if (buttonRef) {
      buttonRef.measure((x, y, width, height, pageX, pageY) => {
        setReactionPickerPosition({
          top: pageY - 70,
          left: pageX - 10,
        });
        setShowReactionPicker(postId);
      });
    }
  };

  const onOpenComments = (postId) => {
    setActiveCommentsPostId(postId);
    setShowComments(true);
  };

  const onShare = async (post) => {
    // Mở modal chia sẻ với danh sách bạn bè
    setSharePost(post);
    setShowShareModal(true);
  };

  const handleShareSuccess = (postId) => {
    // Cập nhật số lượt share trong UI (Optimistic UI)
    setPostStates((prev) => ({
      ...prev,
      [postId]: {
        ...prev[postId],
        shares: (prev[postId]?.shares ?? 0) + 1,
      },
    }));
  };

  const getOwnerId = () => {
    const fromCtx =
      ctxUser?.user_id ?? ctxUser?.userId ?? ctxUser?.UserId ?? ctxUser?.id;
    const n1 = fromCtx != null ? Number(fromCtx) : null;
    if (Number.isFinite(n1)) return n1;
    const n2 = currentUserId != null ? Number(currentUserId) : null;
    return Number.isFinite(n2) ? n2 : null;
  };

  const isOwner = (post) => {
    const uid = getOwnerId();
    const pidRaw = post?.user?.id;
    const pid = pidRaw != null ? Number(pidRaw) : null;
    return Number.isFinite(uid) && Number.isFinite(pid) && uid === pid;
  };

  const handleFollow = async (post) => {
    const targetUserId = post?.user?.id;
    if (!targetUserId) return;
    try {
      await followUser(targetUserId);
      markAsFollowed(targetUserId);
      await loadFeedStories();
    } catch (e) {
      console.warn("[HOME] Follow error:", e);
      Alert.alert("Lỗi", e.message || "Không thể theo dõi người dùng");
    }
  };

  const openOptionsFor = (post) => {
    const uid = getOwnerId();
    const pid = post?.user?.id != null ? Number(post.user.id) : null;
    console.log(
      "[HOME] Open options for post",
      post.id,
      "ownerId:",
      uid,
      "postUserId:",
      pid,
      "isOwner:",
      Number.isFinite(uid) && Number.isFinite(pid) && uid === pid
    );
    setOptionsPostId(post.id);
    setShowOptions(true);
    setShowPrivacySheet(false);
    setEditingCaptionPostId(null);
  };

  const openTagListModal = (post) => {
    setTagListForModal(post.tags || []);
    setShowTagListPostId(post.id);
  };

  const closeTagListModal = () => {
    setShowTagListPostId(null);
    setTagListForModal([]);
  };

  const openEditTags = async (post) => {
    // Owner only
    if (!isOwner(post)) return;
    setShowEditTagsPostId(post.id);
    // Normalize existing tagged users into editTagsList (ensure id present)
    setEditTagsList((post.tags ? post.tags : []).map(normalizeUser));
    setShowAddTagList(false);
    // Load available users (following + followers) for suggestion
    try {
      const [following, followers] = await Promise.all([
        getFollowing().catch(() => []),
        getFollowers().catch(() => []),
      ]);
      const map = new Map();
      (Array.isArray(following) ? following : []).forEach((u) => {
        const nu = normalizeUser(u);
        if (nu.id != null) map.set(nu.id, nu);
      });
      (Array.isArray(followers) ? followers : []).forEach((u) => {
        const nu = normalizeUser(u);
        if (nu.id != null) map.set(nu.id, nu);
      });
      const all = Array.from(map.values());
      setAvailableTagUsersAll(all);
      setAvailableTagUsers(all);
      // reset change queue
      setTagChangeQueue({ toAdd: [], toRemove: [] });
    } catch (e) {
      setAvailableTagUsersAll([]);
      setAvailableTagUsers([]);
      setTagChangeQueue({ toAdd: [], toRemove: [] });
    }
  };

  const closeEditTags = () => {
    setShowEditTagsPostId(null);
    setEditTagsList([]);
    setAvailableTagUsers([]);
    setAvailableTagUsersAll([]);
    setTagChangeQueue({ toAdd: [], toRemove: [] });
    setShowAddTagList(false);
  };

  const submitEditTags = async (postId) => {
    try {
      setBusy(true);
      // Normalize tag IDs to integers and filter invalid
      const tagIds = (editTagsList || [])
        .map((t) => Number(t?.id))
        .filter((x) => Number.isFinite(x) && x > 0);
      console.log("[HOME] submitEditTags payload:", {
        postId,
        tagIds,
        queue: tagChangeQueue,
      });
      const updated = await updatePostTags(postId, tagIds);
      // Update local posts list: compare numeric ids and prefer server-returned tags when available
      setPosts((prev) =>
        prev.map((p) => {
          try {
            if (Number(p.id) === Number(postId)) {
              const newTags =
                updated && Array.isArray(updated.tags)
                  ? updated.tags
                  : editTagsList || [];
              return { ...p, tags: newTags };
            }
          } catch {}
          return p;
        })
      );
      closeEditTags();
    } catch (e) {
      console.warn("Update tags error", e);
      Alert.alert("Lỗi", e.message || "Không thể cập nhật tags");
    } finally {
      setBusy(false);
    }
  };
  const closeAllOverlays = () => {
    setShowOptions(false);
    setShowPrivacySheet(false);
    setOptionsPostId(null);
    setEditingCaptionPostId(null);
    setCaptionDraft("");
  };

  const pickPrivacy = async (privacyKey) => {
    if (!optionsPostId) return;
    try {
      setBusy(true);
      const updated = await updatePostPrivacy(optionsPostId, privacyKey);
      setPosts((prev) =>
        prev.map((p) =>
          p.id === optionsPostId
            ? { ...p, privacy: updated?.privacy ?? privacyKey }
            : p
        )
      );
      closeAllOverlays();
    } catch (e) {
      console.warn("Update privacy error", e);
    } finally {
      setBusy(false);
    }
  };

  const startEditCaption = (post) => {
    setEditingCaptionPostId(post.id);
    setCaptionDraft(post.caption || "");
  };

  const submitCaptionEdit = async () => {
    if (!editingCaptionPostId) return;
    try {
      setBusy(true);
      const updated = await updatePostCaption(
        editingCaptionPostId,
        captionDraft
      );
      setPosts((prev) =>
        prev.map((p) =>
          p.id === editingCaptionPostId
            ? { ...p, caption: updated?.caption ?? captionDraft }
            : p
        )
      );
      closeAllOverlays();
    } catch (e) {
      console.warn("Update caption error", e);
    } finally {
      setBusy(false);
    }
  };

  const confirmDelete = async () => {
    if (!optionsPostId) return;
    const { Alert } = require("react-native");
    Alert.alert("Xóa bài đăng", "Bạn có chắc muốn xóa bài đăng này?", [
      { text: "Hủy", style: "cancel" },
      {
        text: "Xóa",
        style: "destructive",
        onPress: async () => {
          try {
            setBusy(true);
            await deletePost(optionsPostId);
            setPosts((prev) => prev.filter((p) => p.id !== optionsPostId));
            closeAllOverlays();
          } catch (e) {
            console.warn("Delete post error", e);
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  };

  const onRefreshFeed = async () => {
    // Prevent concurrent refreshes
    if (refreshing) {
      console.log("[HOME] ⚠️ Already refreshing, skipping...");
      return;
    }

    try {
      setRefreshing(true);
      console.log("[HOME] 🔄 Starting refresh feed...");
      const data = await getFeed(1, 10);
      let arr = Array.isArray(data) ? data : data?.data ?? [];
      // KHÔNG sort lại - giữ nguyên thứ tự từ backend
      setPosts(arr);
      setCurrentPage(1);
      setHasMorePosts(arr.length >= 10);
      const next = {};
      for (const p of arr) {
        // Skip posts that recently had reaction changes (within 3 seconds)
        const timeSinceChange =
          Date.now() - (recentReactionChanges.current[p.id] || 0);
        if (timeSinceChange < 3000) {
          console.log(
            `[HOME REFRESH] ⏭️ Skipping post ${p.id} - recent reaction change (${timeSinceChange}ms ago)`
          );
          // Keep existing state for this post
          next[p.id] = postStates[p.id] || {
            liked: false,
            likes: Number(p.likesCount ?? 0),
            shares: Number(p.sharesCount ?? 0),
            comments: Number(p.commentsCount ?? 0),
            reactionType: null,
            topReactions: [],
            reactionCounts: [],
          };
          continue;
        }

        try {
          console.log(
            `[HOME REFRESH] 📊 Loading reactions for post ${p.id}...`
          );
          const reactionData = await getReactionSummary(p.id);
          console.log(
            `[HOME REFRESH] Post ${p.id} reaction data:`,
            JSON.stringify(reactionData)
          );
          const topReactions = (reactionData?.reactionCounts || [])
            .sort((a, b) => b.count - a.count)
            .slice(0, 3)
            .map((r) => r.reactionType);
          next[p.id] = {
            liked: reactionData?.userReaction != null,
            likes: Number(reactionData?.totalReactions ?? 0),
            shares: Number(p.sharesCount ?? 0),
            comments: Number(p.commentsCount ?? 0),
            reactionType: reactionData?.userReaction,
            topReactions: topReactions,
            reactionCounts: reactionData?.reactionCounts || [],
          };
          console.log(
            `[HOME REFRESH] Post ${p.id} state will be:`,
            JSON.stringify(next[p.id])
          );
        } catch (err) {
          console.error(`[HOME REFRESH] ❌ Error for post ${p.id}:`, err);
          next[p.id] = {
            liked: false,
            likes: Number(p.likesCount ?? 0),
            shares: Number(p.sharesCount ?? 0),
            comments: Number(p.commentsCount ?? 0),
            reactionType: null,
            topReactions: [],
            reactionCounts: [],
          };
        }
      }
      console.log(
        "[HOME REFRESH] 📝 Setting all new states:",
        JSON.stringify(next)
      );
      setPostStates(next);
      setTimeout(() => {
        flatListRef.current?.scrollToOffset?.({
          offset: 0,
          animated: true,
        });
      }, 100);
      await loadUserAvatar();
      await loadFeedStories();
    } catch (e) {
      console.warn("Refresh feed error", e);
    } finally {
      setRefreshing(false);
    }
  };

  const loadMorePosts = async () => {
    if (loadingMore || !hasMorePosts) return;
    try {
      setLoadingMore(true);
      const nextPage = currentPage + 1;
      const data = await getFeed(nextPage, 10);
      let arr = Array.isArray(data) ? data : data?.data ?? [];
      if (arr.length === 0) {
        setHasMorePosts(false);
        return;
      }
      // KHÔNG sort lại - giữ nguyên thứ tự từ backend
      setPosts((prev) => [...prev, ...arr]);
      setCurrentPage(nextPage);
      setHasMorePosts(arr.length >= 10);
      const newStates = {};
      for (const p of arr) {
        try {
          const reactionData = await getReactionSummary(p.id);
          const topReactions = (reactionData?.reactionCounts || [])
            .sort((a, b) => b.count - a.count)
            .slice(0, 3)
            .map((r) => r.reactionType);
          newStates[p.id] = {
            liked: reactionData?.userReaction != null,
            likes: Number(reactionData?.totalReactions ?? 0),
            shares: Number(p.sharesCount ?? 0),
            comments: Number(p.commentsCount ?? 0),
            reactionType: reactionData?.userReaction,
            topReactions: topReactions,
            reactionCounts: reactionData?.reactionCounts || [],
          };
        } catch (err) {
          newStates[p.id] = {
            liked: false,
            likes: Number(p.likesCount ?? 0),
            shares: Number(p.sharesCount ?? 0),
            comments: Number(p.commentsCount ?? 0),
            reactionType: null,
            topReactions: [],
            reactionCounts: [],
          };
        }
      }
      setPostStates((prev) => ({ ...prev, ...newStates }));
    } catch (e) {
      console.warn("Load more posts error", e);
    } finally {
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    const unsub = onTabTriple("Home", () => {
      try {
        onRefreshFeed();
      } catch (e) {
        console.warn("[Home] triple-tap refresh error", e);
      }
    });
    return unsub;
  }, [onRefreshFeed]);

  const openVideoPlayerFor = (post) => {
    const videos = posts.filter((pp) =>
      (pp.media || []).some((m) => (m.type || "").toLowerCase() === "video")
    );
    navigation.navigate("Video", {
      videos,
      selectedId: post.id,
      userId: post.user?.id,
      username: post.user?.username,
    });
  };

  return (
    <SafeAreaView edges={["top"]} style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.navItem} onPress={handleCameraPress}>
          <Image
            source={require("../Assets/icons8-camera-50.png")}
            style={[styles.cameraIconImage, { width: 29, height: 29 }]}
          />
        </TouchableOpacity>
        <Text style={styles.logo}>MediaLite</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.headerIconWrapper}>
            <View style={styles.heartIconHeader} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.navItem}
            onPress={() => {
              navigation.navigate("Thongbao");
              setUnreadNotificationCount(0); // Reset count khi vào trang thông báo
            }}
          >
            <View>
              <Image
                source={require("../Assets/icons8-notification-48.png")}
                style={[styles.homeIconImage, { width: 30, height: 30 }]}
              />
              {unreadNotificationCount > 0 && (
                <View style={styles.notificationBadge}>
                  <Text style={styles.notificationBadgeText}>
                    {unreadNotificationCount > 99
                      ? "99+"
                      : unreadNotificationCount}
                  </Text>
                </View>
              )}
            </View>
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

      <FlatList
        ref={flatListRef}
        showsVerticalScrollIndicator={false}
        data={posts}
        keyExtractor={(item, index) => `post-${item.id}-${index}`}
        contentContainerStyle={{ paddingBottom: 0 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefreshFeed} />
        }
        windowSize={5}
        initialNumToRender={3}
        maxToRenderPerBatch={3}
        removeClippedSubviews={true}
        updateCellsBatchingPeriod={50}
        onEndReached={loadMorePosts}
        onEndReachedThreshold={0.5}
        ListFooterComponent={() => {
          if (!loadingMore) return null;
          return (
            <View
              style={{
                paddingVertical: 20,
                alignItems: "center",
              }}
            >
              <Text style={{ color: "#999" }}>Đang tải thêm...</Text>
            </View>
          );
        }}
        ListHeaderComponent={() => (
          <View style={styles.storiesContainer}>
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={storiesData}
              keyExtractor={(item) => String(item.id)}
              renderItem={({ item }) =>
                item.id === "add" ? (
                  <StoryAddItem onPress={handleAddStory} />
                ) : (
                  <StoryItem
                    id={item.id}
                    name={item.name}
                    avatar={item.avatar}
                    hasStory={item.hasStory}
                    storyData={item.storyData}
                    navigation={navigation}
                  />
                )
              }
            />
          </View>
        )}
        ListEmptyComponent={() =>
          loading ? (
            <Text style={{ padding: 16, color: "#666" }}>Đang tải...</Text>
          ) : (
            <Text style={{ padding: 16, color: "#666" }}>
              Chưa có bài viết nào
            </Text>
          )
        }
        renderItem={({ item: p }) => (
          <View style={styles.post}>
            <View style={styles.postHeader}>
              <TouchableOpacity
                style={styles.postHeaderLeft}
                onPress={() => {
                  const uid = getOwnerId();
                  const pid = p?.user?.id != null ? Number(p.user.id) : null;
                  if (
                    Number.isFinite(uid) &&
                    Number.isFinite(pid) &&
                    uid === pid
                  ) {
                    navigation.navigate("Profile");
                  } else {
                    navigation.navigate("UserProfilePublic", {
                      userId: pid,
                      username: p.user?.username,
                      avatarUrl: p.user?.avatarUrl,
                    });
                  }
                }}
              >
                {(() => {
                  const rawAvatar =
                    p.user?.avatarUrl ?? p.user?.avatar_url ?? null;
                  const avatarUri = rawAvatar
                    ? String(rawAvatar).startsWith("http")
                      ? rawAvatar
                      : `${API_BASE_URL}${rawAvatar}`
                    : null;
                  if (avatarUri) {
                    return (
                      <Image
                        source={{ uri: avatarUri }}
                        style={styles.postAvatar}
                      />
                    );
                  }
                  return (
                    <View
                      style={[
                        styles.postAvatar,
                        {
                          backgroundColor: "#e5e7eb",
                          justifyContent: "center",
                          alignItems: "center",
                        },
                      ]}
                    >
                      <Ionicons name="person" size={18} color="#9ca3af" />
                    </View>
                  );
                })()}
                <View>
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <TouchableOpacity
                      onPress={() => {
                        const uid = getOwnerId();
                        const pid =
                          p?.user?.id != null ? Number(p.user.id) : null;
                        if (
                          Number.isFinite(uid) &&
                          Number.isFinite(pid) &&
                          uid === pid
                        ) {
                          navigation.navigate("Profile");
                        } else {
                          navigation.navigate("UserProfilePublic", {
                            userId: pid,
                            username: p.user?.username,
                            avatarUrl: p.user?.avatarUrl,
                          });
                        }
                      }}
                    >
                      <Text style={styles.postUsername}>
                        {p.user?.username || "user"}
                      </Text>
                    </TouchableOpacity>

                    {/* Verified badge for Business accounts (Sponsored) */}
                    {(p.isSponsored || p.user?.accountType === "Business") && (
                      <Ionicons
                        name="checkmark-circle"
                        size={16}
                        color="#0095f6"
                        style={{ marginLeft: 4 }}
                      />
                    )}

                    {/* Inline compact tag: show first tagged user's name inline (no avatar) + +N indicator when more */}
                    {p.tags && p.tags.length > 0 && (
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          marginLeft: 8,
                        }}
                      >
                        {(() => {
                          const first = p.tags[0];
                          const rest = p.tags.length - 1;
                          const uid = getOwnerId();
                          const isCurrentUser =
                            Number(first.id) === Number(uid);
                          return (
                            <>
                              <TouchableOpacity
                                onPress={() => {
                                  if (isCurrentUser)
                                    navigation.navigate("Profile");
                                  else
                                    navigation.navigate("UserProfilePublic", {
                                      userId: first.id,
                                      username: first.username,
                                      avatarUrl: first.avatarUrl,
                                    });
                                }}
                                style={{ marginLeft: 8 }}
                              >
                                <Text style={styles.inlineTagText}>
                                  {isCurrentUser
                                    ? " bạn"
                                    : ` @${first.username}`}
                                </Text>
                              </TouchableOpacity>
                              {rest > 0 && (
                                <TouchableOpacity
                                  onPress={() => openTagListModal(p)}
                                  style={styles.moreTagsTouch}
                                >
                                  <Text style={styles.moreTagsText}>
                                    +{rest}
                                  </Text>
                                </TouchableOpacity>
                              )}
                            </>
                          );
                        })()}
                      </View>
                    )}
                  </View>

                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 6,
                      marginTop: 2,
                    }}
                  >
                    <Text style={styles.postLocation}>
                      {new Date(p.createdAt).toLocaleString()}
                    </Text>
                    {!!p.privacy && (
                      <View style={styles.privacyPill}>
                        <Ionicons
                          name={
                            p.privacy === "private"
                              ? "lock-closed"
                              : p.privacy === "followers"
                              ? "people"
                              : "earth"
                          }
                          size={12}
                          color="#374151"
                        />
                        <Text style={styles.privacyText}>{p.privacy}</Text>
                      </View>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                {!isOwner(p) && !isFollowed(p?.user?.id) && (
                  <TouchableOpacity
                    style={styles.followBtn}
                    onPress={() => handleFollow(p)}
                  >
                    <Text style={styles.followBtnText}>Theo dõi</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={() => openOptionsFor(p)}>
                  <Text style={styles.moreIcon}>⋯</Text>
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.postImageContainer}>
              {p.media && p.media.length > 0 ? (
                (() => {
                  const images = (p.media || []).filter(
                    (m) => (m.type || "").toLowerCase() === "image"
                  );
                  const videos = (p.media || []).filter(
                    (m) => (m.type || "").toLowerCase() === "video"
                  );
                  if (images.length > 1) {
                    return (
                      <PostImagesCarousel key={`car-${p.id}`} images={images} />
                    );
                  }
                  if (images.length === 1) {
                    return (
                      <TouchableOpacity
                        activeOpacity={0.95}
                        onPress={() => {
                          if (
                            typeof setSingleViewerUrl === "function" &&
                            typeof setSingleViewerVisible === "function"
                          ) {
                            setSingleViewerUrl(images[0].url);
                            setSingleViewerVisible(true);
                          } else if (
                            window.setSingleViewerUrl &&
                            window.setSingleViewerVisible
                          ) {
                            window.setSingleViewerUrl(images[0].url);
                            window.setSingleViewerVisible(true);
                          }
                        }}
                      >
                        <Image
                          source={{ uri: images[0].url }}
                          style={styles.postImage}
                        />
                      </TouchableOpacity>
                    );
                  }
                  if (videos.length > 0) {
                    const video = videos[0];
                    return (
                      <VideoThumbnail
                        videoUrl={video.url}
                        style={styles.postImage}
                        onPress={() => openVideoPlayerFor(p)}
                      />
                    );
                  }
                  return (
                    <View
                      style={[
                        styles.postImage,
                        {
                          justifyContent: "center",
                          alignItems: "center",
                        },
                      ]}
                    >
                      <Text style={{ color: "#fff" }}>Không có media</Text>
                    </View>
                  );
                })()
              ) : (
                <View
                  style={[
                    styles.postImage,
                    {
                      justifyContent: "center",
                      alignItems: "center",
                    },
                  ]}
                >
                  <Text style={{ color: "#fff" }}>Không có media</Text>
                </View>
              )}
            </View>
            <View style={styles.postActions}>
              <View style={styles.postActionsLeft}>
                <View
                  ref={(ref) => {
                    if (ref) likeButtonRefs.current[p.id] = ref;
                  }}
                  collapsable={false}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                  }}
                >
                  <TouchableOpacity
                    onPress={() => onToggleLike(p.id)}
                    onLongPress={() => onLongPressLike(p.id)}
                    delayLongPress={500}
                  >
                    {postStates[p.id]?.reactionType ? (
                      <Text style={{ fontSize: 28 }}>
                        {getReactionEmoji(postStates[p.id].reactionType)}
                      </Text>
                    ) : (
                      <Ionicons
                        name="heart-outline"
                        size={28}
                        color="#262626"
                      />
                    )}
                  </TouchableOpacity>
                </View>
                <TouchableOpacity
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                  }}
                  onPress={() => onOpenComments(p.id)}
                >
                  <Ionicons
                    name="chatbubble-outline"
                    size={26}
                    color="#262626"
                  />
                  <Text
                    style={{
                      marginLeft: 6,
                      color: "#262626",
                      fontWeight: "600",
                    }}
                  >
                    {postStates[p.id]?.comments ?? 0}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => onShare(p)}>
                  <Ionicons
                    name="paper-plane-outline"
                    size={26}
                    color="#262626"
                  />
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.postStats}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginBottom: 4,
                }}
              >
                {postStates[p.id]?.topReactions?.length > 0 && (
                  <View
                    style={{
                      flexDirection: "row",
                      marginRight: 6,
                    }}
                  >
                    {postStates[p.id].topReactions.map((type, idx) => (
                      <Text
                        key={idx}
                        style={{
                          fontSize: 16,
                          marginRight: -4,
                        }}
                      >
                        {getReactionEmoji(type)}
                      </Text>
                    ))}
                  </View>
                )}
                <TouchableOpacity
                  onPress={() => {
                    setShowReactionsListPostId(p.id);
                    setShowReactionsList(true);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.likeCount}>
                    {(postStates[p.id]?.likes ?? 0).toLocaleString()} lượt thích
                    • {(postStates[p.id]?.shares ?? 0).toLocaleString()} lượt
                    chia sẻ
                  </Text>
                </TouchableOpacity>
              </View>
              {p.tags && p.tags.length > 0 && (
                <View style={styles.taggedUsersContainer}>
                  <Text style={styles.taggedLabel}>với </Text>
                  {p.tags.map((tag, index) => {
                    const uid = getOwnerId();
                    const isCurrentUser = Number(tag.id) === Number(uid);
                    return (
                      <React.Fragment key={tag.id}>
                        <TouchableOpacity
                          onPress={() => {
                            if (isCurrentUser) {
                              navigation.navigate("Profile");
                            } else {
                              navigation.navigate("UserProfilePublic", {
                                userId: tag.id,
                                username: tag.username,
                                avatarUrl: tag.avatarUrl,
                              });
                            }
                          }}
                        >
                          <Text style={styles.taggedUsername}>
                            {isCurrentUser ? "bạn" : `@${tag.username}`}
                          </Text>
                        </TouchableOpacity>
                        {index < p.tags.length - 1 && (
                          <Text style={styles.taggedLabel}>, </Text>
                        )}
                      </React.Fragment>
                    );
                  })}
                </View>
              )}
              {!!p.caption && (
                <Text style={styles.captionText}>
                  {p.caption.split(/(@\w+)/g).map((part, index) => {
                    if (part.startsWith("@")) {
                      const username = part.substring(1);
                      const uid = getOwnerId();
                      // Check if mentioned user is current user
                      const mentionedUser = p.mentions?.find(
                        (m) => m.username === username
                      );
                      const isCurrentUser =
                        mentionedUser &&
                        Number(mentionedUser.id) === Number(uid);
                      return (
                        <Text
                          key={index}
                          style={styles.mentionText}
                          onPress={() => {
                            if (mentionedUser) {
                              if (isCurrentUser) {
                                navigation.navigate("Profile");
                              } else {
                                navigation.navigate("UserProfilePublic", {
                                  userId: mentionedUser.id,
                                  username: mentionedUser.username,
                                  avatarUrl: mentionedUser.avatarUrl,
                                });
                              }
                            }
                          }}
                        >
                          {isCurrentUser ? "bạn" : part}
                        </Text>
                      );
                    }
                    return part;
                  })}
                </Text>
              )}
            </View>
          </View>
        )}
      />

      <Modal
        visible={editingCaptionPostId !== null}
        transparent={true}
        animationType="slide"
        onRequestClose={closeAllOverlays}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalContainer}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={styles.modalOverlay}
            onPress={closeAllOverlays}
          >
            <TouchableOpacity
              activeOpacity={1}
              style={styles.editCaptionSheet}
              onPress={(e) => e.stopPropagation()}
            >
              <View style={styles.sheetHeader}>
                <Text style={styles.sheetTitle}>Chỉnh sửa caption</Text>
                <TouchableOpacity
                  onPress={closeAllOverlays}
                  style={styles.closeButton}
                >
                  <Text style={styles.closeButtonText}>✕</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.editCaptionContent}>
                <TextInput
                  style={styles.captionTextInput}
                  value={captionDraft}
                  onChangeText={setCaptionDraft}
                  multiline
                  placeholder="Nhập caption..."
                  placeholderTextColor="#999"
                  autoFocus
                  maxLength={2200}
                />
                <Text style={styles.charCounter}>
                  {captionDraft.length}/2200
                </Text>
              </View>
              <View style={styles.editCaptionActions}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.cancelButton]}
                  onPress={closeAllOverlays}
                >
                  <Text style={styles.cancelButtonText}>Hủy</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.saveButton]}
                  onPress={submitCaptionEdit}
                >
                  <Text style={styles.saveButtonText}>Lưu</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>

      <CommentsModal
        visible={showComments}
        onClose={() => setShowComments(false)}
        postId={activeCommentsPostId}
        navigation={navigation}
        onCommentAdded={async (postId) => {
          try {
            const newCount = await getCommentCount(postId);
            setPostStates((prev) => ({
              ...prev,
              [postId]: {
                ...prev[postId],
                comments: newCount,
              },
            }));
          } catch (error) {
            console.error("[Home] Update comment count error:", error);
          }
        }}
      />
      {/* Tag list modal - show list of tagged users when +N tapped */}
      {showTagListPostId && (
        <TouchableOpacity
          activeOpacity={1}
          style={styles.overlay}
          onPress={closeTagListModal}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={styles.sheet}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={styles.sheetTitle}>Những người được gắn thẻ</Text>
            {Array.isArray(tagListForModal) && tagListForModal.length > 0 ? (
              tagListForModal.map((t) => (
                <TouchableOpacity
                  key={`taglist-${t.id}`}
                  style={styles.tagListItem}
                  onPress={() => {
                    const uid = getOwnerId();
                    const isCurrentUser = Number(t.id) === Number(uid);
                    if (isCurrentUser) navigation.navigate("Profile");
                    else
                      navigation.navigate("UserProfilePublic", {
                        userId: t.id,
                        username: t.username,
                        avatarUrl: t.avatarUrl,
                      });
                  }}
                >
                  {t.avatarUrl ? (
                    <Image
                      source={{ uri: t.avatarUrl }}
                      style={styles.tagListAvatar}
                    />
                  ) : (
                    <View
                      style={[
                        styles.tagListAvatar,
                        {
                          backgroundColor: "#e5e7eb",
                          justifyContent: "center",
                          alignItems: "center",
                        },
                      ]}
                    >
                      <Ionicons name="person" size={16} color="#9ca3af" />
                    </View>
                  )}
                  <Text style={styles.tagListName}>{t.username || "user"}</Text>
                </TouchableOpacity>
              ))
            ) : (
              <Text style={{ color: "#666", paddingVertical: 8 }}>
                Không có người được gắn thẻ
              </Text>
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      )}

      {/* Edit tags modal (owner only) */}
      {showEditTagsPostId && (
        <TouchableOpacity
          activeOpacity={1}
          style={styles.overlay}
          onPress={closeEditTags}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={styles.sheet}
            onPress={(e) => e.stopPropagation()}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Text style={styles.sheetTitle}>Chỉnh sửa gắn thẻ</Text>
              <TouchableOpacity
                style={styles.addButtonHeader}
                onPress={() => setShowAddTagList((prev) => !prev)}
              >
                <Text style={styles.addButtonText}>
                  {showAddTagList ? "×" : "+"}
                </Text>
              </TouchableOpacity>
            </View>
            <Text style={{ color: "#666", marginBottom: 8 }}>
              Nhấn ✕ trên chip để gỡ; nhấn + để thêm người chưa được gắn
            </Text>

            {/* Selected tags shown as chips */}
            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                marginBottom: 8,
              }}
            >
              {(editTagsList || []).map((t) => (
                <View
                  key={`chip-${String(t.id ?? t.username ?? "")}`}
                  style={styles.tagChip}
                >
                  {t.avatarUrl ? (
                    <Image
                      source={{ uri: t.avatarUrl }}
                      style={styles.tagChipAvatar}
                    />
                  ) : (
                    <View
                      style={[
                        styles.tagChipAvatar,
                        {
                          backgroundColor: "#e5e7eb",
                          justifyContent: "center",
                          alignItems: "center",
                        },
                      ]}
                    >
                      <Ionicons name="person" size={14} color="#9ca3af" />
                    </View>
                  )}
                  <Text style={styles.tagChipText}>
                    {t.username || t.fullName || "user"}
                  </Text>
                  <TouchableOpacity
                    style={styles.tagChipClose}
                    onPress={() => {
                      // Remove from chips and add to untagged list (tracked by availableTagUsersAll)
                      setEditTagsList((prev) =>
                        (prev || []).filter(
                          (x) => Number(x.id) !== Number(t.id)
                        )
                      );
                      setTagChangeQueue((prev) => {
                        const toAdd = new Set(prev.toAdd || []);
                        const toRemove = new Set(prev.toRemove || []);
                        // If this id was in toAdd, cancel that add
                        if (toAdd.has(Number(t.id))) {
                          toAdd.delete(Number(t.id));
                        } else {
                          toRemove.add(Number(t.id));
                        }
                        return {
                          toAdd: Array.from(toAdd),
                          toRemove: Array.from(toRemove),
                        };
                      });
                    }}
                  >
                    <Text style={styles.tagChipCloseText}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>

            <View style={{ maxHeight: 260 }}>
              <FlatList
                data={
                  (showAddTagList
                    ? (availableTagUsersAll || []).filter(
                        (u) =>
                          !(editTagsList || []).find(
                            (x) => Number(x.id) === Number(u.id)
                          )
                      )
                    : availableTagUsersAll) || []
                }
                keyExtractor={(it) => String(it.id)}
                renderItem={({ item }) => {
                  const selected = !!(editTagsList || []).find(
                    (x) => Number(x.id) === Number(item.id)
                  );
                  return (
                    <TouchableOpacity
                      style={styles.userItem}
                      onPress={() => {
                        // Add or toggle selection
                        if (selected) {
                          // Remove
                          setEditTagsList((prev) =>
                            (prev || []).filter(
                              (x) => Number(x.id) !== Number(item.id)
                            )
                          );
                          setTagChangeQueue((prev) => {
                            const toAdd = new Set(prev.toAdd || []);
                            const toRemove = new Set(prev.toRemove || []);
                            if (toAdd.has(Number(item.id))) {
                              toAdd.delete(Number(item.id));
                            } else {
                              toRemove.add(Number(item.id));
                            }
                            return {
                              toAdd: Array.from(toAdd),
                              toRemove: Array.from(toRemove),
                            };
                          });
                        } else {
                          // Add
                          setEditTagsList((prev) => [
                            ...(prev || []),
                            normalizeUser(item),
                          ]);
                          setTagChangeQueue((prev) => {
                            const toAdd = new Set(prev.toAdd || []);
                            const toRemove = new Set(prev.toRemove || []);
                            if (toRemove.has(Number(item.id))) {
                              toRemove.delete(Number(item.id));
                            } else {
                              toAdd.add(Number(item.id));
                            }
                            return {
                              toAdd: Array.from(toAdd),
                              toRemove: Array.from(toRemove),
                            };
                          });
                        }
                      }}
                    >
                      {item.avatarUrl ? (
                        <Image
                          source={{ uri: item.avatarUrl }}
                          style={styles.userAvatar}
                        />
                      ) : (
                        <View
                          style={[
                            styles.userAvatar,
                            {
                              backgroundColor: "#e5e7eb",
                              justifyContent: "center",
                              alignItems: "center",
                            },
                          ]}
                        >
                          <Ionicons name="person" size={16} color="#9ca3af" />
                        </View>
                      )}
                      <View style={styles.userInfo}>
                        <Text style={styles.userUsername}>
                          @{item.username}
                        </Text>
                        <Text style={styles.userFullname}>
                          {item.fullName || item.username}
                        </Text>
                      </View>
                      {selected && (
                        <Ionicons
                          name="checkmark-circle"
                          size={22}
                          color="#0095F6"
                        />
                      )}
                    </TouchableOpacity>
                  );
                }}
              />
            </View>
            <View style={{ flexDirection: "row", gap: 12, marginTop: 12 }}>
              <TouchableOpacity
                style={[styles.actionButton, styles.cancelButton]}
                onPress={closeEditTags}
              >
                <Text style={styles.cancelButtonText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.saveButton]}
                onPress={() => submitEditTags(showEditTagsPostId)}
              >
                <Text style={styles.saveButtonText}>Lưu</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      )}
      {/* Options overlay */}
      {showOptions && (
        <TouchableOpacity
          activeOpacity={1}
          style={styles.overlay}
          onPress={closeAllOverlays}
        >
          <TouchableOpacity
            activeOpacity={0.95}
            style={styles.sheet}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={styles.sheetTitle}>Tùy chọn</Text>
            {(() => {
              const post = posts.find((x) => x.id === optionsPostId);
              if (post && isOwner(post)) {
                return (
                  <>
                    <TouchableOpacity
                      style={styles.sheetItem}
                      onPress={() => {
                        // Open edit tags modal for this post
                        setShowOptions(false);
                        openEditTags(post);
                      }}
                    >
                      <Text style={styles.sheetItemText}>
                        Chỉnh sửa gắn thẻ
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.sheetItem}
                      onPress={() => setShowPrivacySheet(true)}
                    >
                      <Text style={styles.sheetItemText}>
                        Chỉnh sửa quyền riêng tư
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.sheetItem}
                      onPress={() => startEditCaption(post)}
                    >
                      <Text style={styles.sheetItemText}>
                        Chỉnh sửa bài đăng
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.sheetItem, { borderTopWidth: 0 }]}
                      onPress={confirmDelete}
                    >
                      <Text
                        style={[styles.sheetItemText, { color: "#dc2626" }]}
                      >
                        Xóa bài đăng
                      </Text>
                    </TouchableOpacity>
                  </>
                );
              }
              return (
                <>
                  <TouchableOpacity
                    style={styles.sheetItem}
                    onPress={() => {
                      /* TODO: report */ closeAllOverlays();
                    }}
                  >
                    <Text style={styles.sheetItemText}>Báo cáo</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.sheetItem, { borderTopWidth: 0 }]}
                    onPress={() => {
                      setPosts((prev) =>
                        prev.filter((p) => p.id !== optionsPostId)
                      );
                      closeAllOverlays();
                    }}
                  >
                    <Text style={styles.sheetItemText}>Ẩn bài viết</Text>
                  </TouchableOpacity>
                </>
              );
            })()}
          </TouchableOpacity>
        </TouchableOpacity>
      )}

      {showOptions && showPrivacySheet && (
        <TouchableOpacity
          activeOpacity={1}
          style={styles.overlay}
          onPress={closeAllOverlays}
        >
          <TouchableOpacity
            activeOpacity={0.95}
            style={styles.sheet}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={styles.sheetTitle}>Chọn quyền riêng tư</Text>
            {[
              { k: "public", label: "Public" },
              { k: "followers", label: "Followers" },
              { k: "private", label: "Private" },
            ].map((opt) => (
              <TouchableOpacity
                key={opt.k}
                style={styles.sheetItem}
                onPress={() => pickPrivacy(opt.k)}
              >
                <Text style={styles.sheetItemText}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
          </TouchableOpacity>
        </TouchableOpacity>
      )}

      {busy && (
        <View style={styles.busyOverlay}>
          <View style={styles.spinner} />
        </View>
      )}

      {showReactionPicker && (
        <TouchableOpacity
          activeOpacity={1}
          style={styles.reactionOverlay}
          onPress={() => setShowReactionPicker(null)}
        >
          <ReactionPicker
            visible={showReactionPicker !== null}
            position={reactionPickerPosition}
            onSelectReaction={(reactionType) =>
              handleReaction(showReactionPicker, reactionType)
            }
          />
        </TouchableOpacity>
      )}

      <ReactionsListModal
        visible={showReactionsList}
        onClose={() => setShowReactionsList(false)}
        postId={showReactionsListPostId}
      />

      {/* Share Post Modal */}
      <SharePostModal
        visible={showShareModal}
        onClose={() => {
          setShowShareModal(false);
          setSharePost(null);
        }}
        post={sharePost}
        onShareSuccess={handleShareSuccess}
      />
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
    zIndex: 1,
  },
  logo: {
    fontSize: 24,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  headerRight: {
    flexDirection: "row",
    gap: 20,
  },
  headerIconWrapper: {
    width: 26,
    height: 26,
    justifyContent: "center",
    alignItems: "center",
  },
  heartIconHeader: {
    width: 24,
    height: 24,
    position: "relative",
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
  navItem: {
    padding: 4,
    position: "relative",
  },
  notificationBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: "#FF3B30",
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  notificationBadgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
  },
  storiesContainer: {
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: "#DBDBDB",
  },
  storyItem: {
    alignItems: "center",
    marginLeft: 12,
  },
  storyAvatarContainer: {
    padding: 2,
    borderRadius: 40,
  },
  storyAvatarBorder: {
    borderWidth: 2.5,
    borderColor: "#E1306C",
  },
  storyAvatar: {
    width: 62,
    height: 62,
    borderRadius: 31,
    borderWidth: 3,
    borderColor: "#FFFFFF",
  },
  storyName: {
    fontSize: 12,
    marginTop: 4,
    color: "#262626",
  },
  post: {
    marginBottom: 16,
  },
  postHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  postHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  postAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  postUsername: {
    fontSize: 13,
    fontWeight: "600",
    color: "#262626",
  },
  postLocation: {
    fontSize: 11,
    color: "#262626",
  },
  privacyPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
  },
  privacyText: {
    color: "#374151",
    fontSize: 11,
    textTransform: "capitalize",
  },
  moreIcon: {
    fontSize: 24,
    fontWeight: "700",
    color: "#262626",
  },
  postImageContainer: {
    position: "relative",
  },
  postImage: {
    width: "100%",
    height: 400,
    backgroundColor: "#F0F0F0",
  },
  playOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.15)",
  },
  imageCounter: {
    position: "absolute",
    top: 12,
    right: 12,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  imageCounterText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
  },
  dotsContainer: {
    position: "absolute",
    bottom: 12,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255, 255, 255, 0.5)",
  },
  dotActive: {
    backgroundColor: "#FFFFFF",
  },
  postActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  postActionsLeft: {
    flexDirection: "row",
    gap: 16,
    alignItems: "center",
  },
  heartIconPost: {
    fontSize: 35,
    color: "#DEDED6",
    marginTop: -4,
  },
  heartIconPostFilled: {
    fontSize: 35,
    color: "#ED4956",
    marginTop: -4,
  },
  followBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "#dbdbdb",
    borderRadius: 6,
  },
  followBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#111827",
  },
  commentIconWrapper: {
    width: 26,
    height: 26,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  commentBubble: {
    width: 24,
    height: 24,
    borderWidth: 2.5,
    borderColor: "#000",
    borderRadius: 12,
    borderTopLeftRadius: 0,
  },
  commentCount: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: "#ED4956",
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "600",
    borderRadius: 6,
    paddingHorizontal: 3,
    paddingVertical: 1,
  },
  postStats: {
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  likeCount: {
    fontSize: 14,
    fontWeight: "600",
    color: "#262626",
    marginBottom: 4,
  },
  captionText: {
    fontSize: 14,
    color: "#111827",
    lineHeight: 20,
  },
  taggedUsersContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 4,
  },
  taggedLabel: {
    fontSize: 14,
    color: "#666",
  },
  taggedUsername: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0095F6",
  },
  captionText: {
    fontSize: 14,
    color: "#111827",
    lineHeight: 20,
  },
  mentionText: {
    color: "#0095F6",
    fontWeight: "600",
  },
  inlineTagsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
    flexWrap: "wrap",
  },
  inlineTagAvatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginRight: 6,
  },
  moreTagsTouch: {
    marginLeft: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: "#f3f4f6",
    borderRadius: 8,
  },
  moreTagsText: {
    color: "#111827",
    fontWeight: "600",
  },
  inlineTagTouchable: {
    marginLeft: 6,
  },
  inlineTagText: {
    color: "#111827",
    fontWeight: "700",
    fontSize: 13,
    marginLeft: 2,
  },
  commentCountText: {
    fontSize: 12,
    color: "#8E8E8E",
  },
  // bottom nav styles removed (now handled by tab navigator)
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#fff",
    padding: 16,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: Platform.OS === "ios" ? 50 : 30,
  },
  tagListItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
  },
  tagListAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 12,
  },
  tagListName: {
    fontSize: 16,
    color: "#111827",
  },
  userItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  userInfo: {
    flex: 1,
  },
  userUsername: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
  },
  userFullname: {
    fontSize: 12,
    color: "#6b7280",
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 8,
  },
  sheetItem: {
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
  },
  sheetItemText: {
    fontSize: 16,
    color: "#111827",
  },
  primaryBtn: {
    backgroundColor: "#111827",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  primaryBtnText: {
    color: "#fff",
    fontWeight: "600",
  },
  secondaryBtn: {
    backgroundColor: "#f3f4f6",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  secondaryBtnText: {
    color: "#111827",
    fontWeight: "600",
  },
  busyOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(255,255,255,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  spinner: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 4,
    borderColor: "#111827",
    borderTopColor: "transparent",
  },
  modalContainer: {
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  editCaptionSheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: Platform.OS === "ios" ? 34 : 20,
    maxHeight: "80%",
  },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  closeButton: {
    width: 32,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 16,
    backgroundColor: "#f3f4f6",
  },
  closeButtonText: {
    fontSize: 18,
    color: "#111827",
    fontWeight: "600",
  },
  editCaptionContent: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    minHeight: 200,
  },
  captionTextInput: {
    fontSize: 16,
    color: "#111827",
    textAlignVertical: "top",
    minHeight: 150,
    maxHeight: 300,
    padding: 12,
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 12,
    backgroundColor: "#f9fafb",
  },
  charCounter: {
    fontSize: 12,
    color: "#9ca3af",
    marginTop: 8,
    textAlign: "right",
  },
  editCaptionActions: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButton: {
    backgroundColor: "#f3f4f6",
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#6b7280",
  },
  saveButton: {
    backgroundColor: "#0095F6",
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
  },
  reactionOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "transparent",
    zIndex: 999,
  },
  addStoryAvatar: {
    backgroundColor: "#fff",
    width: 62,
    height: 62,
    borderRadius: 31,
    justifyContent: "center",
    alignItems: "center",
  },
  plusCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#111827",
    justifyContent: "center",
    alignItems: "center",
  },
  plusText: {
    color: "#fff",
    fontSize: 22,
    lineHeight: 22,
    fontWeight: "700",
  },
  addButtonHeader: {
    width: 36,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#f3f4f6",
    justifyContent: "center",
    alignItems: "center",
  },
  addButtonText: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
  },
  tagChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "#f3f4f6",
    marginRight: 8,
    marginBottom: 8,
  },
  tagChipAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginRight: 8,
  },
  tagChipText: {
    fontSize: 13,
    color: "#111827",
    fontWeight: "600",
  },
  tagChipClose: {
    marginLeft: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  tagChipCloseText: {
    color: "#dc2626",
    fontWeight: "700",
    fontSize: 14,
  },
});
