import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Platform,
  Share,
  KeyboardAvoidingView,
  Modal,
  Alert,
  Dimensions,
  TextInput,
} from "react-native";
import { RefreshControl } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useUser } from "../Context/UserContext";
import { useFollow } from "../Context/FollowContext";
import CommentsModal from "./CommentsModal";
import ReactionPicker from "./ReactionPicker";
import ReactionsListModal from "./ReactionsListModal";
import SharePostModal from "./SharePostModal";
import { SafeAreaView } from "react-native-safe-area-context";
import notificationSignalRService from "../ServicesSingalR/notificationService";
import {
  getUserPostsById,
  updatePostPrivacy,
  updatePostCaption,
  deletePost,
  followUser,
  unfollowUser,
  getFollowing,
  getFollowers,
  updatePostTags,
  API_BASE_URL,
  addReaction,
  getReactionSummary,
} from "../API/Api";
import { Ionicons } from "@expo/vector-icons";
import { VideoView, useVideoPlayer } from "expo-video";
import ImageViewer from "react-native-image-zoom-viewer";

const { width } = Dimensions.get("window");

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

export default function PostDetail() {
  const route = useRoute();
  const navigation = useNavigation();
  // State cho modal xem ảnh đơn
  const [singleViewerVisible, setSingleViewerVisible] = useState(false);
  const [singleViewerUrl, setSingleViewerUrl] = useState(null);
  // State cho SharePostModal
  const [showShareModal, setShowShareModal] = useState(false);
  const [sharePost, setSharePost] = useState(null);
  const { user: ctxUser } = useUser();
  // Ensure user/tag objects used in chips have consistent shape
  const normalizeUser = (u) => {
    if (!u) return { id: null, username: "", avatarUrl: null, fullName: "" };
    const rawId = u?.id ?? u?.userId ?? u?.user_id ?? u?.UserId ?? null;
    const id = Number(rawId);
    const username = u?.username ?? u?.userName ?? u?.name ?? "";
    const rawAvatar = u?.avatarUrl ?? u?.avatar_url ?? u?.userAvatar ?? null;
    const avatarUrl = rawAvatar
      ? String(rawAvatar).startsWith("http")
        ? rawAvatar
        : `${API_BASE_URL}${rawAvatar}`
      : null;
    const fullName = u?.fullName ?? u?.full_name ?? "";
    return {
      id: Number.isFinite(id) ? id : null,
      username,
      avatarUrl,
      fullName,
    };
  };
  const { markAsFollowed, markAsUnfollowed, isFollowed } = useFollow();
  const flatListRef = React.useRef(null);
  const targetUserId = route.params?.post?.user?.id || route.params?.userId;
  // Nhận index truyền từ Profile/UserProfilePublic
  const initialIndex = route.params?.initialIndex ?? 0;
  const singlePostData = route.params?.singlePost; // Post data từ search
  const isSinglePostMode = !!singlePostData; // Chế độ hiển thị 1 post
  const [postStates, setPostStates] = useState({});
  const [activeCommentsPostId, setActiveCommentsPostId] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMorePosts, setHasMorePosts] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [optionsPostId, setOptionsPostId] = useState(null);
  const [showOptions, setShowOptions] = useState(false);
  const [showPrivacySheet, setShowPrivacySheet] = useState(false);
  const [captionDraft, setCaptionDraft] = useState("");
  const [editingCaptionPostId, setEditingCaptionPostId] = useState(null);
  const [busy, setBusy] = useState(false);
  // Edit tags state
  const [showEditTags, setShowEditTags] = useState(false);
  const [editTagsList, setEditTagsList] = useState([]);
  const [availableTagUsers, setAvailableTagUsers] = useState([]);
  const [availableTagUsersAll, setAvailableTagUsersAll] = useState([]);
  const [tagChangeQueue, setTagChangeQueue] = useState({
    toAdd: [],
    toRemove: [],
  });
  const [showAddTagList, setShowAddTagList] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);
  // Reaction states
  const [showReactionPicker, setShowReactionPicker] = useState(null);
  const [reactionPickerPosition, setReactionPickerPosition] = useState({
    top: 0,
    left: 0,
  });
  const likeButtonRefs = React.useRef({});
  const [showReactionsList, setShowReactionsList] = useState(false);
  const [showReactionsListPostId, setShowReactionsListPostId] = useState(null);
  const recentReactionChanges = React.useRef({});

  // Ensure FlatList scrolls to correct index after posts are loaded
  useEffect(() => {
    if (
      flatListRef.current &&
      initialIndex > 0 &&
      posts.length > initialIndex
    ) {
      setTimeout(() => {
        try {
          flatListRef.current.scrollToIndex({
            index: initialIndex,
            animated: false,
          });
        } catch (e) {
          // ignore
        }
      }, 300);
    }
  }, [posts, initialIndex]);

  // Tự động mở comment modal khi có param openComments
  useEffect(() => {
    const shouldOpenComments = route.params?.openComments;
    if (shouldOpenComments && posts.length > 0) {
      // Mở comment cho post đầu tiên (trong single post mode)
      const firstPost = posts[0];
      if (firstPost?.id) {
        setTimeout(() => {
          setActiveCommentsPostId(firstPost.id);
        }, 500);
      }
    }
  }, [posts, route.params?.openComments]);

  // Helper functions
  const getOwnerId = () => {
    // Ưu tiên dùng context user
    if (ctxUser?.id) return Number(ctxUser.id);
    if (ctxUser?.userId) return Number(ctxUser.userId);
    // Fallback về currentUserId từ AsyncStorage
    return currentUserId;
  };

  const isOwner = (post) => {
    const uid = getOwnerId();
    const pid = post?.user?.id != null ? Number(post.user.id) : null;
    const result = Number.isFinite(uid) && Number.isFinite(pid) && uid === pid;
    console.log("[PostDetail] isOwner check:", {
      uid,
      pid,
      result,
      postId: post?.id,
    });
    return result;
  };
  const openOptionsFor = (post) => {
    const uid = getOwnerId();
    const pid = post?.user?.id != null ? Number(post.user.id) : null;
    console.log(
      "[PostDetail] Open options for post",
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

  // Open tag list modal and preload followers/following
  const openTagListModal = async (post) => {
    try {
      setOptionsPostId(post.id);
      // normalize existing tags into safe objects
      setEditTagsList((post.tags ? post.tags : []).map(normalizeUser));
      setShowAddTagList(false);
      setShowEditTags(true);

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
      setAvailableTagUsers(all.slice(0, 50));
      setTagChangeQueue({ toAdd: [], toRemove: [] });
    } catch (e) {
      console.warn("[PostDetail] openEditTags error", e);
      setAvailableTagUsers([]);
      setAvailableTagUsersAll([]);
      setTagChangeQueue({ toAdd: [], toRemove: [] });
    }
  };

  // Helper function để build media URL từ search data
  const buildMediaUrl = (mediaUrl) => {
    if (!mediaUrl) return null;

    if (mediaUrl.startsWith("http")) {
      return mediaUrl;
    }

    // Build relative URL
    let cleanUrl = mediaUrl;
    if (!cleanUrl.startsWith("/uploads/")) {
      if (!cleanUrl.startsWith("/")) {
        cleanUrl = `/uploads/${cleanUrl}`;
      }
    }

    return `${API_BASE_URL}${cleanUrl}`;
  };

  const closeAllOverlays = () => {
    setShowOptions(false);
    setShowPrivacySheet(false);
    setOptionsPostId(null);
    setEditingCaptionPostId(null);
    setCaptionDraft("");
  };

  // VideoThumbnail Component - giống Home.js
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

  // PostImagesCarousel Component
  function PostImagesCarousel({ images }) {
    const [index, setIndex] = useState(0);
    const [viewerVisible, setViewerVisible] = useState(false);
    const [viewerIndex, setViewerIndex] = useState(0);
    // Use screen width for slides
    const imageWidth = Math.min(width, 420);

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
          snapToInterval={imageWidth}
          decelerationRate={"fast"}
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

        {/* Counter top-right */}
        <View
          style={{
            position: "absolute",
            top: 12,
            right: 16,
            backgroundColor: "rgba(0,0,0,0.5)",
            borderRadius: 12,
            paddingHorizontal: 10,
            paddingVertical: 4,
            zIndex: 10,
          }}
        >
          <Text style={{ color: "#fff", fontWeight: "bold" }}>
            {index + 1}/{images.length}
          </Text>
        </View>

        {/* Dots bottom */}
        <View style={styles.dotsContainer}>
          {images.map((_, i) => (
            <View
              key={i}
              style={[styles.dot, i === index && styles.dotActive]}
            />
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
  }

  // Initialize post states
  const initPostStates = async (postsArray) => {
    const states = {};
    for (const p of postsArray) {
      try {
        console.log(`[PostDetail] Loading reactions for post ${p.id}...`);
        const reactionData = await getReactionSummary(p.id);
        console.log(`[PostDetail] Post ${p.id} reaction data:`, reactionData);
        const topReactions = (reactionData?.reactionCounts || [])
          .sort((a, b) => b.count - a.count)
          .slice(0, 3)
          .map((r) => r.reactionType);
        states[p.id] = {
          liked: reactionData?.userReaction != null,
          likes: Number(reactionData?.totalReactions ?? 0),
          shares: Number(p.sharesCount ?? 0),
          comments: Number(p.commentsCount ?? 0),
          reactionType: reactionData?.userReaction,
          topReactions: topReactions,
          reactionCounts: reactionData?.reactionCounts || [],
        };
        console.log(`[PostDetail] Post ${p.id} final state:`, states[p.id]);
      } catch (err) {
        console.error(
          `[PostDetail] Error loading reactions for post ${p.id}:`,
          err
        );
        states[p.id] = {
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
    return states;
  }; // Load user posts
  const loadUserPosts = async (page = 1, append = false) => {
    // Nếu là single post mode, sử dụng data có sẵn
    if (isSinglePostMode && singlePostData) {
      // Process media URLs for single post from search
      const processedPost = { ...singlePostData };

      // Convert media URLs using buildMediaUrl
      if (processedPost.media && processedPost.media.length > 0) {
        processedPost.media = processedPost.media.map((mediaItem) => ({
          ...mediaItem,
          url: buildMediaUrl(mediaItem.url),
        }));
      }

      // Handle legacy fields
      if (processedPost.videoUrl) {
        processedPost.videoUrl = buildMediaUrl(processedPost.videoUrl);
      }

      const newStates = await initPostStates([processedPost]);
      setPostStates(newStates);
      setPosts([processedPost]);
      setHasMorePosts(false); // Không có thêm posts
      setLoading(false);
      setRefreshing(false);
      return;
    }

    if (!targetUserId) return;

    if (page === 1) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }

    try {
      const pageSize = 10;
      const data = await getUserPostsById(targetUserId, page, pageSize);

      if (data && Array.isArray(data)) {
        const newStates = await initPostStates(data);
        setPostStates((prev) => ({ ...prev, ...newStates }));

        if (append) {
          setPosts((prev) => {
            const merged = [...prev, ...data];
            const unique = merged.filter(
              (p, i, arr) => arr.findIndex((x) => x.id === p.id) === i
            );
            return unique;
          });
        } else {
          setPosts(data);
        }

        setHasMorePosts(data.length >= pageSize);
        setCurrentPage(page);
      } else {
        setHasMorePosts(false);
      }
    } catch (error) {
      console.error("Error loading user posts:", error);
      Alert.alert("Lỗi", "Không thể tải bài viết");
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  };

  // Get current user ID
  useEffect(() => {
    const fetchUserId = async () => {
      try {
        const storedUser = await AsyncStorage.getItem("currentUser");
        if (storedUser) {
          const parsed = JSON.parse(storedUser);
          setCurrentUserId(parsed.id || parsed.userId);
        }
      } catch (err) {
        console.error("Error fetching user ID:", err);
      }
    };
    fetchUserId();
  }, []);

  // Initial load
  useEffect(() => {
    if (targetUserId) {
      loadUserPosts(1, false);
    }
  }, [targetUserId]);

  // Reload reactions when screen focuses (to sync with Home)
  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", async () => {
      console.log("[PostDetail] Screen focused, reloading reactions...");
      // Reload reactions for all visible posts
      if (posts.length > 0) {
        const updatedStates = await initPostStates(posts);
        setPostStates(updatedStates);
      }
    });
    return unsubscribe;
  }, [navigation, posts]);

  // SignalR listener for real-time share updates
  useEffect(() => {
    if (!currentUserId) return;

    const handleShareUpdate = (data) => {
      console.log("[PostDetail] 🔔 Received share update:", data);
      const { PostId, ShareCount } = data;

      if (PostId) {
        setPostStates((prev) => {
          if (prev[PostId]) {
            return {
              ...prev,
              [PostId]: {
                ...prev[PostId],
                shares: Number(ShareCount ?? 0),
              },
            };
          }
          return prev;
        });
      }
    };

    notificationSignalRService.onReceiveShareUpdate(handleShareUpdate);

    return () => {
      notificationSignalRService.off("ReceiveShareUpdate", handleShareUpdate);
    };
  }, [currentUserId]);

  // Handle refresh
  const onRefresh = () => {
    setRefreshing(true);
    setCurrentPage(1);
    setHasMorePosts(true);
    loadUserPosts(1, false);
  };

  // Handle load more
  const handleLoadMore = () => {
    if (!loadingMore && hasMorePosts && !loading) {
      loadUserPosts(currentPage + 1, true);
    }
  };

  // Toggle like - now uses reaction
  const onToggleLike = (postId) => {
    const currentReactionType = postStates[postId]?.reactionType || 1;
    handleReaction(postId, currentReactionType);
  };

  // Long press like button to show reaction picker
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

  // Handle reaction
  const handleReaction = async (postId, reactionType) => {
    console.log(
      `[PostDetail] 🎯 handleReaction called - postId: ${postId}, reactionType: ${reactionType}`
    );

    // Close reaction picker immediately
    setShowReactionPicker(null);

    // Mark this post as recently changed
    recentReactionChanges.current[postId] = Date.now();
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

        let likes = cur.likes;
        if (!cur.reactionType) {
          likes = cur.likes + 1;
        } else if (isSameType) {
          likes = Math.max(0, cur.likes - 1);
        }

        console.log(
          `[PostDetail] Optimistic update - postId: ${postId}, liked: ${liked}, likes: ${likes}, reactionType: ${
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
      console.log(`[PostDetail] Calling addReaction API...`);
      const addResult = await addReaction(postId, reactionType);
      console.log(`[PostDetail] ✅ addReaction API success:`, addResult);

      // Sync with server after delay
      await new Promise((resolve) => setTimeout(resolve, 500));

      try {
        console.log(`[PostDetail] Fetching getReactionSummary for sync...`);
        const reactionData = await getReactionSummary(postId);
        console.log(
          `[PostDetail] ✅ getReactionSummary success:`,
          reactionData
        );

        const topReactions = (reactionData?.reactionCounts || [])
          .sort((a, b) => b.count - a.count)
          .slice(0, 3)
          .map((r) => r.reactionType);

        const timeSinceThisChange =
          Date.now() - (recentReactionChanges.current[postId] || 0);
        if (timeSinceThisChange > 4000) {
          console.log(
            `[PostDetail] ⚠️ Another reaction happened during sync, keeping optimistic state`
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
        console.error("[PostDetail] ❌ Error loading reaction summary:", err);
      }
    } catch (error) {
      console.error("[PostDetail] ❌ Error adding reaction:", error);
      Alert.alert("Lỗi", "Không thể thả cảm xúc. Vui lòng thử lại.", [
        { text: "OK" },
      ]);
      // Rollback on error
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

  // Handle share
  const onShare = (post) => {
    setSharePost(post);
    setShowShareModal(true);
  };

  // Handle share success - Optimistic UI update
  const handleShareSuccess = (postId) => {
    setPostStates((prev) => ({
      ...prev,
      [postId]: {
        ...prev[postId],
        shares: (prev[postId]?.shares ?? 0) + 1,
      },
    }));
  };

  // Handle follow toggle
  const handleFollowToggle = async (userId) => {
    if (!currentUserId) return;

    try {
      const alreadyFollowing = isFollowed(userId);
      if (alreadyFollowing) {
        await unfollowUser(currentUserId, userId);
        markAsUnfollowed(userId);
      } else {
        await followUser(currentUserId, userId);
        markAsFollowed(userId);
      }
    } catch (error) {
      console.error("Error toggling follow:", error);
      Alert.alert("Lỗi", "Không thể thực hiện thao tác");
    }
  };

  // Open video player - điều hướng như UserProfilePublic
  const openVideoPlayerFor = (post) => {
    navigation.navigate("MainTabs", {
      screen: "Video",
      params: {
        selectedId: post.id,
        userId: post.user?.id || targetUserId,
        username: post.user?.username || "user",
      },
    });
  };

  // Open options
  const openOptions = (postId) => {
    setOptionsPostId(postId);
  };

  // Pick privacy
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

  // Handle edit caption
  const startEditCaption = (post) => {
    setEditingCaptionPostId(post.id);
    setCaptionDraft(post.caption || "");
    // Keep options open to allow cancel by tapping outside
  };

  // Save caption
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

  // Handle delete post
  const confirmDelete = async () => {
    if (!optionsPostId) return;
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

  const closeEditTags = () => {
    setShowEditTags(false);
    setEditTagsList([]);
    setAvailableTagUsers([]);
    setAvailableTagUsersAll([]);
    setTagChangeQueue({ toAdd: [], toRemove: [] });
    setShowAddTagList(false);
  };

  const submitEditTags = async () => {
    if (!optionsPostId) return;
    try {
      setBusy(true);
      // Normalize tag ids and filter invalid
      const tagIds = (editTagsList || [])
        .map((t) => Number(t?.id))
        .filter((x) => Number.isFinite(x) && x > 0);
      console.log("[PostDetail] submitEditTags payload:", {
        postId: optionsPostId,
        tagIds,
        queue: tagChangeQueue,
      });
      const updated = await updatePostTags(optionsPostId, tagIds);
      setPosts((prev) =>
        prev.map((p) => {
          try {
            if (Number(p.id) === Number(optionsPostId)) {
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
      console.warn("[PostDetail] update tags error", e);
      Alert.alert("Lỗi", e?.message || "Không thể cập nhật gắn thẻ");
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView edges={["top"]} style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => {
            // Luôn dùng goBack() để giữ nguyên navigation stack
            navigation.goBack();
          }}
        >
          <Ionicons name="arrow-back" size={28} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isSinglePostMode ? "Chi tiết bài viết" : "Bài viết"}
        </Text>
        <View style={{ width: 28 }} />
      </View>
      <FlatList
        ref={flatListRef}
        data={posts}
        keyExtractor={(item) => `post-${item.id}`}
        initialScrollIndex={initialIndex}
        getItemLayout={(data, index) => ({
          length: 520,
          offset: 520 * index,
          index,
        })}
        renderItem={({ item: post }) => {
          const state = postStates[post.id] || {};
          const isOwnPost = isOwner(post);

          return (
            <View style={styles.post}>
              {/* Header */}
              <View style={styles.postHeader}>
                <TouchableOpacity
                  style={styles.postHeaderLeft}
                  onPress={() => {
                    if (isOwnPost) {
                      navigation.navigate("Profile");
                    } else {
                      navigation.navigate("UserProfilePublic", {
                        userId: post.user?.id,
                        username: post.user?.username,
                        avatarUrl: post.user?.avatarUrl,
                      });
                    }
                  }}
                >
                  {(() => {
                    const rawAvatar =
                      post.user?.avatarUrl ?? post.user?.avatar_url ?? null;
                    const avatarUri = rawAvatar
                      ? String(rawAvatar).startsWith("http")
                        ? rawAvatar
                        : `${API_BASE_URL}${rawAvatar}`
                      : null;
                    if (avatarUri)
                      return (
                        <Image
                          source={{ uri: avatarUri }}
                          style={styles.postAvatar}
                        />
                      );
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
                    <View
                      style={{ flexDirection: "row", alignItems: "center" }}
                    >
                      <Text style={styles.postUsername}>
                        {post.user?.username || "User"}
                      </Text>
                      {post.tags && post.tags.length > 0 && (
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            marginLeft: 8,
                          }}
                        >
                          {(() => {
                            const first = post.tags[0];
                            const rest = post.tags.length - 1;
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
                                      ? "bạn"
                                      : ` @${first.username}`}
                                  </Text>
                                </TouchableOpacity>
                                {rest > 0 && (
                                  <TouchableOpacity
                                    onPress={() => openTagListModal(post)}
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
                    <View style={styles.postTimeContainer}>
                      <Text style={styles.postLocation}>
                        {new Date(post.createdAt).toLocaleString("vi-VN")}
                      </Text>
                      {post.privacy && (
                        <View style={styles.privacyPill}>
                          <Ionicons
                            name={
                              post.privacy === "private"
                                ? "lock-closed"
                                : post.privacy === "followers"
                                ? "people"
                                : "earth"
                            }
                            size={12}
                            color="#374151"
                          />
                          <Text style={styles.privacyText}>{post.privacy}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>

                <View style={styles.headerActions}>
                  <TouchableOpacity onPress={() => openOptionsFor(post)}>
                    <Text style={styles.moreIcon}>⋯</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Media - hiển thị giống Home.js */}
              <View style={styles.postImageContainer}>
                {post.media && post.media.length > 0 ? (
                  (() => {
                    const images = (post.media || []).filter(
                      (m) => (m.type || "").toLowerCase() === "image"
                    );
                    const videos = (post.media || []).filter(
                      (m) => (m.type || "").toLowerCase() === "video"
                    );

                    if (images.length > 1) {
                      return (
                        <PostImagesCarousel
                          key={`car-${post.id}`}
                          images={images.map((img) => img.url)}
                        />
                      );
                    }
                    if (images.length === 1) {
                      return (
                        <TouchableOpacity
                          activeOpacity={0.95}
                          onPress={() => {
                            setSingleViewerUrl(images[0].url);
                            setSingleViewerVisible(true);
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
                          onPress={() => openVideoPlayerFor(post)}
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
                        <Text style={{ color: "#888" }}>Không có media</Text>
                      </View>
                    );
                  })()
                ) : post.videoUrl ? (
                  <VideoThumbnail
                    videoUrl={post.videoUrl}
                    style={styles.postImage}
                    onPress={() => openVideoPlayerFor(post)}
                  />
                ) : post.imageUrls && post.imageUrls.length > 0 ? (
                  post.imageUrls.length > 1 ? (
                    <PostImagesCarousel images={post.imageUrls} />
                  ) : (
                    <Image
                      source={{ uri: post.imageUrls[0] }}
                      style={styles.postImage}
                    />
                  )
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
                    <Text style={{ color: "#888" }}>Không có media</Text>
                  </View>
                )}
              </View>

              {/* Actions - giống Home.js */}
              <View style={styles.postActions}>
                <View style={styles.postActionsLeft}>
                  <View
                    ref={(ref) => {
                      if (ref) likeButtonRefs.current[post.id] = ref;
                    }}
                    collapsable={false}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                    }}
                  >
                    <TouchableOpacity
                      onPress={() => onToggleLike(post.id)}
                      onLongPress={() => onLongPressLike(post.id)}
                      delayLongPress={500}
                    >
                      {state.reactionType ? (
                        <Text style={{ fontSize: 28 }}>
                          {getReactionEmoji(state.reactionType)}
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
                    onPress={() => setActiveCommentsPostId(post.id)}
                  >
                    <Ionicons
                      name="chatbubble-outline"
                      size={26}
                      color="#262626"
                    />
                    <Text style={styles.commentCount}>
                      {state.comments || 0}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity onPress={() => onShare(post)}>
                    <Ionicons
                      name="paper-plane-outline"
                      size={26}
                      color="#262626"
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Stats */}
              <View style={styles.postStats}>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    marginBottom: 4,
                  }}
                >
                  {state.topReactions?.length > 0 && (
                    <View
                      style={{
                        flexDirection: "row",
                        marginRight: 6,
                      }}
                    >
                      {state.topReactions.map((type, idx) => (
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
                      setShowReactionsListPostId(post.id);
                      setShowReactionsList(true);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.likeCount}>
                      {(state.likes || 0).toLocaleString()} lượt thích
                      {" • "}
                      {(state.shares || 0).toLocaleString()} lượt chia sẻ
                    </Text>
                  </TouchableOpacity>
                </View>
                {post.caption ? (
                  <Text style={styles.captionText}>
                    {post.caption.split(/(@\w+)/g).map((part, index) => {
                      if (part.startsWith("@")) {
                        const username = part.substring(1);
                        const mentionedUser = post.mentions?.find(
                          (m) => m.username === username
                        );
                        const uid = getOwnerId();
                        const isCurrentUser =
                          mentionedUser &&
                          Number(mentionedUser.id) === Number(uid);
                        return (
                          <Text
                            key={index}
                            style={styles.mentionText}
                            onPress={() => {
                              if (mentionedUser) {
                                if (isCurrentUser)
                                  navigation.navigate("Profile");
                                else
                                  navigation.navigate("UserProfilePublic", {
                                    userId: mentionedUser.id,
                                    username: mentionedUser.username,
                                    avatarUrl: mentionedUser.avatarUrl,
                                  });
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
                ) : null}
              </View>
            </View>
          );
        }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        contentContainerStyle={{
          paddingBottom: Platform.OS === "ios" ? 90 : 70,
        }}
        ListFooterComponent={
          loadingMore ? (
            <View style={styles.loadingMore}>
              <Text>Đang tải...</Text>
            </View>
          ) : null
        }
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Chưa có bài viết nào</Text>
            </View>
          ) : null
        }
      />

      {/* Comments Modal */}
      {activeCommentsPostId && (
        <CommentsModal
          visible={!!activeCommentsPostId}
          postId={activeCommentsPostId}
          highlightCommentId={route.params?.highlightCommentId}
          onClose={() => setActiveCommentsPostId(null)}
          onCommentAdded={() => {
            setPostStates((prev) => ({
              ...prev,
              [activeCommentsPostId]: {
                ...prev[activeCommentsPostId],
                commentsCount:
                  (prev[activeCommentsPostId]?.commentsCount || 0) + 1,
              },
            }));
          }}
        />
      )}

      {/* Edit Caption Modal */}
      <Modal
        visible={!!editingCaptionPostId}
        transparent
        animationType="fade"
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

      {/* Edit tags modal */}
      {showEditTags && (
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

            {/* Selected tags chips */}
            {editTagsList && editTagsList.length > 0 && (
              <View
                style={{
                  flexDirection: "row",
                  flexWrap: "wrap",
                  marginBottom: 8,
                }}
              >
                {editTagsList.map((t) => (
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
                      {t.username ? `@${t.username}` : t.id}
                    </Text>
                    <TouchableOpacity
                      style={styles.tagChipClose}
                      onPress={() => {
                        setEditTagsList((prev) =>
                          (prev || []).filter(
                            (x) => Number(x.id) !== Number(t.id)
                          )
                        );
                        setTagChangeQueue((prev) => {
                          const toAdd = new Set(prev.toAdd || []);
                          const toRemove = new Set(prev.toRemove || []);
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
            )}

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
                  const selected = !!editTagsList.find(
                    (x) => Number(x.id) === Number(item.id)
                  );
                  return (
                    <TouchableOpacity
                      style={styles.userItem}
                      onPress={() => {
                        if (selected) {
                          // remove
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
                          // add
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
                onPress={submitEditTags}
              >
                <Text style={styles.saveButtonText}>Lưu</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      )}

      {/* Options overlay - giống Home.js */}
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
                      onPress={() => openTagListModal(post)}
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
              // Not owner: show limited actions
              return (
                <>
                  <TouchableOpacity
                    style={styles.sheetItem}
                    onPress={() => {
                      closeAllOverlays();
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

      {/* Privacy choices overlay - giống Home.js */}
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

      {/* Busy spinner overlay */}
      {busy && (
        <View style={styles.busyOverlay}>
          <View style={styles.spinner} />
        </View>
      )}

      {/* Reaction Picker Modal */}
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

      {/* Reactions List Modal */}
      <SharePostModal
        visible={showShareModal}
        onClose={() => {
          setShowShareModal(false);
          setSharePost(null);
        }}
        post={sharePost}
        onShareSuccess={handleShareSuccess}
      />

      <ReactionsListModal
        visible={showReactionsList}
        onClose={() => setShowReactionsList(false)}
        postId={showReactionsListPostId}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#DBDBDB",
    backgroundColor: "#fff",
  },
  headerTitle: { fontSize: 18, fontWeight: "600", color: "#262626" },
  post: {
    backgroundColor: "#fff",
    marginBottom: 8,
  },
  postHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  postHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  postAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  postUsername: {
    fontSize: 14,
    fontWeight: "600",
    color: "#262626",
  },
  postTimeContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 2,
  },
  postLocation: {
    fontSize: 12,
    color: "#8E8E8E",
  },
  privacyPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: "#f3f4f6",
  },
  privacyText: {
    fontSize: 10,
    color: "#374151",
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  moreIcon: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#262626",
  },
  postImageContainer: {
    width: "100%",
    aspectRatio: 1,
    backgroundColor: "#000",
  },
  postImage: {
    width: "100%",
    height: "100%",
  },
  playOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.1)",
  },
  carouselContainer: {
    width: "100%",
    aspectRatio: 1,
    backgroundColor: "#000",
  },
  paginationDots: {
    position: "absolute",
    bottom: 16,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.5)",
    marginHorizontal: 3,
  },
  activeDot: {
    backgroundColor: "#fff",
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  postActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  postActionsLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  commentCount: {
    marginLeft: 6,
    color: "#262626",
    fontWeight: "600",
    fontSize: 14,
  },
  postStats: {
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  likeCount: {
    fontSize: 14,
    fontWeight: "600",
    color: "#262626",
    marginBottom: 4,
  },
  captionText: {
    fontSize: 14,
    color: "#262626",
    lineHeight: 18,
  },
  mentionText: {
    color: "#0095F6",
    fontWeight: "600",
  },
  inlineTagsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    flexWrap: "wrap",
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
  captionUsername: {
    fontWeight: "600",
    color: "#262626",
  },
  loadingMore: {
    paddingVertical: 20,
    alignItems: "center",
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: "#8E8E8E",
  },
  // Overlay styles - giống Home.js
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
    paddingBottom: Platform.OS === "ios" ? 34 : 20,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 8,
    textAlign: "center",
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
  // Edit Caption Modal Styles
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
    padding: 4,
  },
  closeButtonText: {
    fontSize: 24,
    color: "#666",
    fontWeight: "300",
  },
  editCaptionContent: {
    padding: 20,
  },
  captionTextInput: {
    fontSize: 16,
    color: "#111827",
    minHeight: 120,
    textAlignVertical: "top",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    padding: 12,
  },
  charCounter: {
    fontSize: 12,
    color: "#999",
    textAlign: "right",
    marginTop: 8,
  },
  editCaptionActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 12,
  },
  actionButton: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
  },
  cancelButton: {
    backgroundColor: "#f3f4f6",
  },
  cancelButtonText: {
    color: "#111827",
    fontWeight: "600",
    fontSize: 14,
  },
  saveButton: {
    backgroundColor: "#111827",
  },
  saveButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
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
  reactionOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
  },
});
