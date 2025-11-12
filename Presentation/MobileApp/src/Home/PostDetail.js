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
import { SafeAreaView } from "react-native-safe-area-context";
import {
    getUserPostsById,
    updatePostPrivacy,
    updatePostCaption,
    deletePost,
    followUser,
    unfollowUser,
    API_BASE_URL,
} from "../API/Api";
import { Ionicons } from "@expo/vector-icons";
import { VideoView, useVideoPlayer } from "expo-video";

const { width } = Dimensions.get("window");

export default function PostDetail() {
    const route = useRoute();
    const navigation = useNavigation();
    const { user: ctxUser } = useUser();
    const { markAsFollowed, markAsUnfollowed, isFollowed } = useFollow();
    const targetUserId = route.params?.post?.user?.id || route.params?.userId;
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
    const [currentUserId, setCurrentUserId] = useState(null);

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
        const result =
            Number.isFinite(uid) && Number.isFinite(pid) && uid === pid;
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
        const [currentIndex, setCurrentIndex] = useState(0);

        const onScroll = (event) => {
            const slideSize = event.nativeEvent.layoutMeasurement.width;
            const index = Math.round(
                event.nativeEvent.contentOffset.x / slideSize
            );
            setCurrentIndex(index);
        };

        return (
            <View style={styles.carouselContainer}>
                <FlatList
                    data={images}
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    onMomentumScrollEnd={onScroll}
                    keyExtractor={(_, idx) => `img-${idx}`}
                    renderItem={({ item }) => (
                        <Image
                            source={{ uri: item }}
                            style={styles.postImage}
                            resizeMode="cover"
                        />
                    )}
                />
                {images.length > 1 && (
                    <View style={styles.paginationDots}>
                        {images.map((_, idx) => (
                            <View
                                key={idx}
                                style={[
                                    styles.dot,
                                    idx === currentIndex && styles.activeDot,
                                ]}
                            />
                        ))}
                    </View>
                )}
            </View>
        );
    }

    // Initialize post states
    const initPostStates = (postsArray) => {
        const states = {};
        postsArray.forEach((p) => {
            states[p.id] = {
                liked: p.liked || false,
                likesCount: p.likesCount || 0,
                commentsCount: p.commentsCount || 0,
                sharesCount: p.sharesCount || 0,
            };
        });
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

            const newStates = initPostStates([processedPost]);
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
                const newStates = initPostStates(data);
                setPostStates((prev) => ({ ...prev, ...newStates }));

                if (append) {
                    setPosts((prev) => {
                        const merged = [...prev, ...data];
                        const unique = merged.filter(
                            (p, i, arr) =>
                                arr.findIndex((x) => x.id === p.id) === i
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

    // Toggle like
    const onToggleLike = (postId) => {
        setPostStates((prev) => {
            const current = prev[postId] || {};
            const newLiked = !current.liked;
            return {
                ...prev,
                [postId]: {
                    ...current,
                    liked: newLiked,
                    likesCount: newLiked
                        ? current.likesCount + 1
                        : current.likesCount - 1,
                },
            };
        });
    };

    // Handle repost
    const onRepost = async (post) => {
        try {
            const shareUrl = `https://yourapp.com/post/${post.id}`;
            await Share.share({
                message: post.caption || "Xem bài viết này!",
                url: shareUrl,
            });
            setPostStates((prev) => ({
                ...prev,
                [post.id]: {
                    ...prev[post.id],
                    sharesCount: (prev[post.id]?.sharesCount || 0) + 1,
                },
            }));
        } catch (error) {
            console.error("Error sharing:", error);
        }
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
                        setPosts((prev) =>
                            prev.filter((p) => p.id !== optionsPostId)
                        );
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

    return (
        <SafeAreaView edges={["top"]} style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back" size={28} color="#000" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>
                    {isSinglePostMode ? "Chi tiết bài viết" : "Bài viết"}
                </Text>
                <View style={{ width: 28 }} />
            </View>
            <FlatList
                data={posts}
                keyExtractor={(item) => `post-${item.id}`}
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
                                            navigation.navigate(
                                                "UserProfilePublic",
                                                {
                                                    userId: post.user?.id,
                                                    username:
                                                        post.user?.username,
                                                    avatarUrl:
                                                        post.user?.avatarUrl,
                                                }
                                            );
                                        }
                                    }}
                                >
                                    <Image
                                        source={{
                                            uri:
                                                post.user?.avatarUrl ||
                                                "https://i.pravatar.cc/150",
                                        }}
                                        style={styles.postAvatar}
                                    />
                                    <View>
                                        <Text style={styles.postUsername}>
                                            {post.user?.username || "User"}
                                        </Text>
                                        <View style={styles.postTimeContainer}>
                                            <Text style={styles.postLocation}>
                                                {new Date(
                                                    post.createdAt
                                                ).toLocaleString("vi-VN")}
                                            </Text>
                                            {post.privacy && (
                                                <View
                                                    style={styles.privacyPill}
                                                >
                                                    <Ionicons
                                                        name={
                                                            post.privacy ===
                                                            "private"
                                                                ? "lock-closed"
                                                                : post.privacy ===
                                                                  "followers"
                                                                ? "people"
                                                                : "earth"
                                                        }
                                                        size={12}
                                                        color="#374151"
                                                    />
                                                    <Text
                                                        style={
                                                            styles.privacyText
                                                        }
                                                    >
                                                        {post.privacy}
                                                    </Text>
                                                </View>
                                            )}
                                        </View>
                                    </View>
                                </TouchableOpacity>

                                <View style={styles.headerActions}>
                                    <TouchableOpacity
                                        onPress={() => openOptionsFor(post)}
                                    >
                                        <Text style={styles.moreIcon}>⋯</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>

                            {/* Media - hiển thị giống Home.js */}
                            <View style={styles.postImageContainer}>
                                {post.media && post.media.length > 0 ? (
                                    (() => {
                                        const images = (
                                            post.media || []
                                        ).filter(
                                            (m) =>
                                                (m.type || "").toLowerCase() ===
                                                "image"
                                        );
                                        const videos = (
                                            post.media || []
                                        ).filter(
                                            (m) =>
                                                (m.type || "").toLowerCase() ===
                                                "video"
                                        );

                                        if (images.length > 1) {
                                            return (
                                                <PostImagesCarousel
                                                    key={`car-${post.id}`}
                                                    images={images.map(
                                                        (img) => img.url
                                                    )}
                                                />
                                            );
                                        }
                                        if (images.length === 1) {
                                            return (
                                                <Image
                                                    source={{
                                                        uri: images[0].url,
                                                    }}
                                                    style={styles.postImage}
                                                />
                                            );
                                        }
                                        if (videos.length > 0) {
                                            const video = videos[0];
                                            return (
                                                <VideoThumbnail
                                                    videoUrl={video.url}
                                                    style={styles.postImage}
                                                    onPress={() =>
                                                        openVideoPlayerFor(post)
                                                    }
                                                />
                                            );
                                        }
                                        return (
                                            <View
                                                style={[
                                                    styles.postImage,
                                                    {
                                                        justifyContent:
                                                            "center",
                                                        alignItems: "center",
                                                    },
                                                ]}
                                            >
                                                <Text style={{ color: "#888" }}>
                                                    Không có media
                                                </Text>
                                            </View>
                                        );
                                    })()
                                ) : post.videoUrl ? (
                                    <VideoThumbnail
                                        videoUrl={post.videoUrl}
                                        style={styles.postImage}
                                        onPress={() => openVideoPlayerFor(post)}
                                    />
                                ) : post.imageUrls &&
                                  post.imageUrls.length > 0 ? (
                                    post.imageUrls.length > 1 ? (
                                        <PostImagesCarousel
                                            images={post.imageUrls}
                                        />
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
                                        <Text style={{ color: "#888" }}>
                                            Không có media
                                        </Text>
                                    </View>
                                )}
                            </View>

                            {/* Actions - giống Home.js */}
                            <View style={styles.postActions}>
                                <View style={styles.postActionsLeft}>
                                    <TouchableOpacity
                                        onPress={() => onToggleLike(post.id)}
                                    >
                                        <Ionicons
                                            name={
                                                state.liked
                                                    ? "heart"
                                                    : "heart-outline"
                                            }
                                            size={28}
                                            color={
                                                state.liked
                                                    ? "#ED4956"
                                                    : "#262626"
                                            }
                                        />
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={{
                                            flexDirection: "row",
                                            alignItems: "center",
                                        }}
                                        onPress={() =>
                                            setActiveCommentsPostId(post.id)
                                        }
                                    >
                                        <Ionicons
                                            name="chatbubble-outline"
                                            size={26}
                                            color="#262626"
                                        />
                                        <Text style={styles.commentCount}>
                                            {state.commentsCount || 0}
                                        </Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        onPress={() => onRepost(post)}
                                    >
                                        <Ionicons
                                            name="repeat-outline"
                                            size={28}
                                            color="#262626"
                                        />
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        onPress={() => onRepost(post)}
                                    >
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
                                <Text style={styles.likeCount}>
                                    {(state.likesCount || 0).toLocaleString()}{" "}
                                    lượt thích •{" "}
                                    {(state.sharesCount || 0).toLocaleString()}{" "}
                                    lượt chia sẻ
                                </Text>
                                {post.caption ? (
                                    <Text style={styles.captionText}>
                                        {post.caption}
                                    </Text>
                                ) : null}
                            </View>
                        </View>
                    );
                }}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                    />
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
                            <Text style={styles.emptyText}>
                                Chưa có bài viết nào
                            </Text>
                        </View>
                    ) : null
                }
            />

            {/* Comments Modal */}
            {activeCommentsPostId && (
                <CommentsModal
                    visible={!!activeCommentsPostId}
                    postId={activeCommentsPostId}
                    onClose={() => setActiveCommentsPostId(null)}
                    onCommentAdded={() => {
                        setPostStates((prev) => ({
                            ...prev,
                            [activeCommentsPostId]: {
                                ...prev[activeCommentsPostId],
                                commentsCount:
                                    (prev[activeCommentsPostId]
                                        ?.commentsCount || 0) + 1,
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
                                <Text style={styles.sheetTitle}>
                                    Chỉnh sửa caption
                                </Text>
                                <TouchableOpacity
                                    onPress={closeAllOverlays}
                                    style={styles.closeButton}
                                >
                                    <Text style={styles.closeButtonText}>
                                        ✕
                                    </Text>
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
                                    style={[
                                        styles.actionButton,
                                        styles.cancelButton,
                                    ]}
                                    onPress={closeAllOverlays}
                                >
                                    <Text style={styles.cancelButtonText}>
                                        Hủy
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[
                                        styles.actionButton,
                                        styles.saveButton,
                                    ]}
                                    onPress={submitCaptionEdit}
                                >
                                    <Text style={styles.saveButtonText}>
                                        Lưu
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </TouchableOpacity>
                    </TouchableOpacity>
                </KeyboardAvoidingView>
            </Modal>

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
                            const post = posts.find(
                                (x) => x.id === optionsPostId
                            );
                            if (post && isOwner(post)) {
                                return (
                                    <>
                                        <TouchableOpacity
                                            style={styles.sheetItem}
                                            onPress={() =>
                                                setShowPrivacySheet(true)
                                            }
                                        >
                                            <Text style={styles.sheetItemText}>
                                                Chỉnh sửa quyền riêng tư
                                            </Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={styles.sheetItem}
                                            onPress={() =>
                                                startEditCaption(post)
                                            }
                                        >
                                            <Text style={styles.sheetItemText}>
                                                Chỉnh sửa bài đăng
                                            </Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={[
                                                styles.sheetItem,
                                                { borderTopWidth: 0 },
                                            ]}
                                            onPress={confirmDelete}
                                        >
                                            <Text
                                                style={[
                                                    styles.sheetItemText,
                                                    { color: "#dc2626" },
                                                ]}
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
                                        <Text style={styles.sheetItemText}>
                                            Báo cáo
                                        </Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[
                                            styles.sheetItem,
                                            { borderTopWidth: 0 },
                                        ]}
                                        onPress={() => {
                                            setPosts((prev) =>
                                                prev.filter(
                                                    (p) =>
                                                        p.id !== optionsPostId
                                                )
                                            );
                                            closeAllOverlays();
                                        }}
                                    >
                                        <Text style={styles.sheetItemText}>
                                            Ẩn bài viết
                                        </Text>
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
                        <Text style={styles.sheetTitle}>
                            Chọn quyền riêng tư
                        </Text>
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
                                <Text style={styles.sheetItemText}>
                                    {opt.label}
                                </Text>
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
});
