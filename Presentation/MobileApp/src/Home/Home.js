import React, { useEffect, useState, useCallback, useRef } from "react";
import {
    View,
    Text,
    Image,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    FlatList,
    Platform,
    Share,
    KeyboardAvoidingView,
} from "react-native";
import { RefreshControl } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useRoute } from "@react-navigation/native";
import { onTabTriple } from '../Utils/TabRefreshEmitter';
import { useUser } from "../Context/UserContext";
import * as ImagePicker from "expo-image-picker";
import CommentsModal from "./CommentsModal";
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { getFeed, updatePostPrivacy, updatePostCaption, deletePost, getProfile, getAuthHeaders } from "../API/Api";
import { Ionicons } from "@expo/vector-icons";
import { Audio, Video, ResizeMode } from "expo-av";

// Dữ liệu stories
const storiesData = [
    {
        id: "1",
        name: "Hoàng",
        avatar: require("../Assets/trai.png"),
        hasStory: true,
    },
    {
        id: "2",
        name: "Quân",
        avatar: require("../Assets/noo.png"),
        hasStory: true,
    },
    {
        id: "3",
        name: "Trang",
        avatar: require("../Assets/gai2.png"),
        hasStory: true,
    },
    {
        id: "4",
        name: "Vinh",
        avatar: require("../Assets/meo.png"),
        hasStory: true,
    },
    {
        id: "5",
        name: "Linh",
        avatar: require("../Assets/gai1.png"),
        hasStory: false,
    },
    {
        id: "6",
        name: "Việt",
        avatar: require("../Assets/embe.png"),
        hasStory: true,
    },
    {
        id: "7",
        name: "Tùng",
        avatar: require("../Assets/sontung.png"),
        hasStory: false,
    },
];

// Component Story Item
const StoryItem = ({ id, name, avatar, hasStory, navigation }) => {
    const handleStoryPress = () => {
        if (hasStory) {
            navigation.navigate("StoryViewer", {
                storyId: id,
                userName: name,
                userAvatar: avatar,
            });
        }
    };

    return (
        <TouchableOpacity style={styles.storyItem} onPress={handleStoryPress}>
            <View
                style={[
                    styles.storyAvatarContainer,
                    hasStory && styles.storyAvatarBorder,
                ]}
            >
                <Image source={avatar} style={styles.storyAvatar} />
            </View>
            <Text style={styles.storyName}>{name}</Text>
        </TouchableOpacity>
    );
};

// Carousel for multiple images like Instagram
const PostImagesCarousel = ({ images = [] }) => {
    const [index, setIndex] = useState(0);
    return (
        <View style={{ position:'relative' }}>
            <FlatList
                data={images}
                keyExtractor={(it, i) => String(i)}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                renderItem={({ item }) => (
                    <Image source={{ uri: item.url }} style={styles.postImage} />
                )}
                onMomentumScrollEnd={(e) => {
                    const w = e.nativeEvent.layoutMeasurement.width || 1;
                    const x = e.nativeEvent.contentOffset.x || 0;
                    setIndex(Math.max(0, Math.round(x / w)));
                }}
            />
            {/* Counter top-right */}
            <View style={styles.imageCounter}>
                <Text style={styles.imageCounterText}>{index + 1}/{images.length}</Text>
            </View>
            {/* Dots bottom */}
            <View style={styles.dotsContainer}>
                {images.map((_, i) => (
                    <View key={i} style={[styles.dot, i === index && styles.dotActive]} />
                ))}
            </View>
        </View>
    );
};

export default function Home() {
    const insets = useSafeAreaInsets();
    const BOTTOM_NAV_HEIGHT = 0; // dùng tab bar toàn cục, không thêm padding dưới
    // Per-post local UI state (likes/shares/comments counts)
    const [postStates, setPostStates] = useState({}); // { [postId]: { liked, likes, shares, comments } }
    const [activeCommentsPostId, setActiveCommentsPostId] = useState(null);
    const [showComments, setShowComments] = useState(false);
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentUserId, setCurrentUserId] = useState(null); // lưu dạng number khi có thể
    const [refreshing, setRefreshing] = useState(false);
    // 3-dots menu & privacy sheet
    const [optionsPostId, setOptionsPostId] = useState(null);
    const [showOptions, setShowOptions] = useState(false);
    const [showPrivacySheet, setShowPrivacySheet] = useState(false);
    const [busy, setBusy] = useState(false);
    // Inline caption edit state
    const [editingCaptionPostId, setEditingCaptionPostId] = useState(null);
    const [captionDraft, setCaptionDraft] = useState("");
    const navigation = useNavigation();
    const route = useRoute();
    const FEED_CACHE_KEY = 'feedCache_v1';
    const PAGE_SIZE = 5;
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const listRef = useRef(null);
    const [authHeaders, setAuthHeaders] = useState(null);
    // Cấu hình audio để không mất tiếng (kể cả khi iOS ở chế độ im lặng)
    useEffect(() => {
        (async () => {
            try {
                // Load auth headers once for protected media fetches
                try { const h = await getAuthHeaders(); setAuthHeaders(h || null); } catch {}
                await Audio.setAudioModeAsync({
                    allowsRecordingIOS: false,
                    staysActiveInBackground: false,
                    playsInSilentModeIOS: true,
                    shouldDuckAndroid: true,
                    playThroughEarpieceAndroid: false,
                });
            } catch {}
        })();
    }, []);

    // Use original video only: simple URL sanitizer
    const sanitizeUri = useCallback((u) => {
        if (!u || typeof u !== 'string') return '';
        const trimmed = u.trim();
        try { return encodeURI(trimmed); } catch { return trimmed; }
    }, []);

    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                // Load current user id from storage to enable owner-only options
                try {
                    const userStr = await AsyncStorage.getItem('userInfo');
                    if (userStr) {
                        const user = JSON.parse(userStr);
                        const raw = user?.user_id ?? user?.userId ?? user?.UserId ?? user?.id ?? null;
                        const uidNum = raw != null ? Number(raw) : null;
                        if (mounted) setCurrentUserId(Number.isFinite(uidNum) ? uidNum : null);
                        console.log('[HOME] AsyncStorage userInfo ->', { raw, uidNum });
                    }
                } catch {}
                // Attempt to cross-check with profile API (best-effort)
                try {
                    const prof = await getProfile();
                    // API trả camelCase (userId). Fallback: UserId.
                    const profId = prof?.userId ?? prof?.UserId;
                    if (profId != null) {
                        const uid = Number(profId);
                        if (Number.isFinite(uid)) {
                            if (mounted) setCurrentUserId(uid);
                            console.log('[HOME] getProfile() -> userId set:', uid);
                        } else {
                            console.log('[HOME] getProfile() -> invalid userId:', profId);
                        }
                    } else {
                        console.log('[HOME] getProfile() -> no userId on payload');
                    }
                } catch (e) {
                    console.log('[HOME] getProfile() failed (non-fatal):', e?.message || e);
                }
                // Try load cache first for instant UI
                try {
                    const raw = await AsyncStorage.getItem(FEED_CACHE_KEY);
                    if (raw && mounted) {
                        const cache = JSON.parse(raw);
                        if (Array.isArray(cache?.items) && cache.items.length > 0) {
                            const arr = cache.items;
                            setPosts(arr);
                            const next = {};
                            for (const p of arr) {
                                next[p.id] = {
                                    liked: false,
                                    likes: Number(p.likesCount ?? 0),
                                    shares: Number(p.sharesCount ?? 0),
                                    comments: Number(p.commentsCount ?? 0),
                                };
                            }
                            setPostStates(next);
                            setLoading(false);
                        }
                    }
                } catch {}

                // Always fetch fresh page 1
                const data = await getFeed(1, PAGE_SIZE);
                if (mounted) {
                    let arr = Array.isArray(data) ? data : [];
                    arr = arr.slice().sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
                    setPosts(arr);
                    setPage(1);
                    setHasMore(arr.length === PAGE_SIZE);
                    const next = {};
                    for (const p of arr) {
                        next[p.id] = {
                            liked: false,
                            likes: Number(p.likesCount ?? 0),
                            shares: Number(p.sharesCount ?? 0),
                            comments: Number(p.commentsCount ?? 0),
                        };
                    }
                    setPostStates(next);
                    try { await AsyncStorage.setItem(FEED_CACHE_KEY, JSON.stringify({ items: arr, ts: Date.now() })); } catch {}
                }
            } catch (e) {
                console.warn('Feed error', e);
            } finally {
                if (mounted) setLoading(false);
            }
        })();
        return () => { mounted = false; };
    }, []);

    // Refresh feed if a parent navigates with { refresh: true }
    useEffect(() => {
        const unsubscribe = navigation.addListener('focus', () => {
            if (route?.params?.refresh) {
                onRefreshFeed();
                try { navigation.setParams({ refresh: false }); } catch {}
            }
        });
        return unsubscribe;
    }, [navigation, route?.params?.refresh]);

    // Log ownership mapping whenever posts or user changes
    useEffect(() => {
        const uid = getOwnerId();
        console.log('[HOME] Current userId used for ownership:', uid, 'Context:', ctxUser?.user_id ?? ctxUser?.UserId ?? ctxUser?.id, 'State:', currentUserId);
        posts.forEach(p => {
            const pid = p?.user?.id != null ? Number(p.user.id) : null;
            const own = Number.isFinite(uid) && Number.isFinite(pid) && uid === pid;
            console.log('[HOME] Post ownership check ->', { postId: p.id, postUserId: pid, isOwner: own });
        });
    }, [posts, currentUserId, ctxUser]);

    const handleCameraPress = async () => {
        // Request camera permissions using Expo ImagePicker
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== "granted") {
            console.log("Camera permission not granted");
            return;
        }

        try {
            const result = await ImagePicker.launchCameraAsync({
                mediaTypes: ImagePicker.MediaTypeOptions?.Images,
                quality: 1,
                allowsEditing: false,
                exif: false,
            });

            // Newer Expo ImagePicker returns { canceled, assets }
            if (result.canceled) return;
            const uri = result.assets && result.assets.length > 0 ? result.assets[0].uri : result.uri;
            if (uri) {
                navigation.navigate("PhotoPreview", { photoUri: uri });
            }
        } catch (err) {
            console.log("Camera error:", err);
        }
    };

    const onToggleLike = (postId) => {
        setPostStates((prev) => {
            const cur = prev[postId] || { liked: false, likes: 0, shares: 0, comments: 0 };
            const liked = !cur.liked;
            const likes = Math.max(0, cur.likes + (liked ? 1 : -1));
            return { ...prev, [postId]: { ...cur, liked, likes } };
        });
    };

    const onOpenComments = (postId) => {
        setActiveCommentsPostId(postId);
        setShowComments(true);
    };

    const onShare = async (post) => {
        try {
            const firstMedia = (post.media || [])[0];
            const url = firstMedia?.url || '';
            await Share.share({
                message: post.caption ? `${post.caption}${url ? `\n${url}` : ''}` : url || 'Xem bài viết',
                url,
                title: 'Chia sẻ bài đăng',
            });
            setPostStates((prev) => {
                const cur = prev[post.id] || { liked: false, likes: 0, shares: 0, comments: 0 };
                return { ...prev, [post.id]: { ...cur, shares: cur.shares + 1 } };
            });
        } catch (e) {
            // ignore
        }
    };

    const onRepost = (postId) => {
        // Stub: later hook to real repost flow
        setPostStates((prev) => {
            const cur = prev[postId] || { liked: false, likes: 0, shares: 0, comments: 0 };
            return { ...prev, [postId]: { ...cur, shares: cur.shares + 1 } };
        });
    };

    // Ưu tiên lấy user id từ UserContext, fallback sang state đọc từ AsyncStorage
    const { user: ctxUser } = useUser();
    const getOwnerId = () => {
        const fromCtx = ctxUser?.user_id ?? ctxUser?.userId ?? ctxUser?.UserId ?? ctxUser?.id;
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

    const openOptionsFor = (post) => {
        const uid = getOwnerId();
        const pid = post?.user?.id != null ? Number(post.user.id) : null;
        console.log('[HOME] Open options for post', post.id, 'ownerId:', uid, 'postUserId:', pid, 'isOwner:', Number.isFinite(uid) && Number.isFinite(pid) && uid === pid);
        setOptionsPostId(post.id);
        setShowOptions(true);
        setShowPrivacySheet(false);
        setEditingCaptionPostId(null);
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
            setPosts((prev) => prev.map(p => p.id === optionsPostId ? { ...p, privacy: updated?.privacy ?? privacyKey } : p));
            closeAllOverlays();
        } catch (e) {
            console.warn('Update privacy error', e);
        } finally {
            setBusy(false);
        }
    };

    const startEditCaption = (post) => {
        setEditingCaptionPostId(post.id);
        setCaptionDraft(post.caption || "");
        // Keep options open to allow cancel by tapping outside
    };

    const submitCaptionEdit = async () => {
        if (!editingCaptionPostId) return;
        try {
            setBusy(true);
            const updated = await updatePostCaption(editingCaptionPostId, captionDraft);
            setPosts((prev) => prev.map(p => p.id === editingCaptionPostId ? { ...p, caption: updated?.caption ?? captionDraft } : p));
            closeAllOverlays();
        } catch (e) {
            console.warn('Update caption error', e);
        } finally {
            setBusy(false);
        }
    };

    const confirmDelete = async () => {
        if (!optionsPostId) return;
        const { Alert } = require('react-native');
        Alert.alert(
            'Xóa bài đăng',
            'Bạn có chắc muốn xóa bài đăng này?',
            [
                { text: 'Hủy', style: 'cancel' },
                {
                    text: 'Xóa', style: 'destructive', onPress: async () => {
                        try {
                            setBusy(true);
                            await deletePost(optionsPostId);
                            setPosts((prev) => prev.filter(p => p.id !== optionsPostId));
                            closeAllOverlays();
                        } catch (e) {
                            console.warn('Delete post error', e);
                        } finally {
                            setBusy(false);
                        }
                    }
                }
            ]
        );
    };

    const onRefreshFeed = async () => {
        try {
            setRefreshing(true);
            const data = await getFeed(1, PAGE_SIZE);
            let arr = Array.isArray(data) ? data : [];
            arr = arr.slice().sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
            setPosts(arr);
            setPage(1);
            setHasMore(arr.length === PAGE_SIZE);
            try { await AsyncStorage.setItem(FEED_CACHE_KEY, JSON.stringify({ items: arr, ts: Date.now() })); } catch {}
        } catch (e) {
            console.warn('Refresh feed error', e);
        } finally {
            setRefreshing(false);
        }
    };

    // Subscribe to triple-tap refresh from tab bar
    useEffect(() => {
        const unsub = onTabTriple('Home', () => {
            try { onRefreshFeed(); } catch (e) { console.warn('[Home] triple-tap refresh error', e); }
        });
        return unsub;
    }, [onRefreshFeed]);

    const onEndReached = useCallback(async () => {
        if (loadingMore || !hasMore) return;
        try {
            setLoadingMore(true);
            const data = await getFeed(page + 1, PAGE_SIZE);
            const arr = Array.isArray(data) ? data : [];
            setPosts((prev) => {
                const ids = new Set(prev.map(p => p.id));
                const merged = [...prev, ...arr.filter(p => !ids.has(p.id))];
                (async () => { try { await AsyncStorage.setItem(FEED_CACHE_KEY, JSON.stringify({ items: merged, ts: Date.now() })); } catch {} })();
                return merged;
            });
            setPage(prev => prev + 1);
            setHasMore(arr.length === PAGE_SIZE);
        } finally {
            setLoadingMore(false);
        }
    }, [loadingMore, hasMore, page]);

    // Navigate to full-screen video page with proper initial index
    const openVideoPlayerFor = (post) => {
        // Danh sách video gốc (chưa sắp xếp) để màn Video tự ưu tiên selectedId + chưa xem + mới nhất
        const videos = posts.filter(pp => (pp.media||[]).some(m => (m.type||'').toLowerCase()==='video'));
        // Navigate to nested tab if needed
        navigation.navigate('Video', { videos, selectedId: post.id });
    };

    return (
        // Chỉ tôn trọng safe-area ở cạnh trên; bỏ cạnh dưới để không tạo dải trắng/đen nằm ngay trên tab bar
        <SafeAreaView edges={['top']} style={[styles.container, { paddingTop: insets.top }] }>
            {/* Header */}
            <View style={[styles.header, { paddingTop: 4 }]}> 
                <TouchableOpacity
                    style={styles.navItem}
                    onPress={handleCameraPress}
                >
                    <Image
                        source={require("../Assets/icons8-camera-50.png")}
                        style={[
                            styles.cameraIconImage,
                            { width: 29, height: 29 },
                        ]}
                    />
                </TouchableOpacity>

                <Text style={styles.logo}>MediaLite</Text>

                <View style={styles.headerRight}>
                    <TouchableOpacity style={styles.headerIconWrapper}>
                        <View style={styles.heartIconHeader} />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.navItem}
                        onPress={() => navigation.navigate("Thongbao")}
                    >
                        <Image
                            source={require("../Assets/icons8-notification-48.png")}
                            style={[
                                styles.homeIconImage,
                                { width: 30, height: 30 },
                            ]}
                        />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.navItem}
                        onPress={() => navigation.navigate("Messenger")}
                    >
                        <Image
                            source={require("../Assets/icons8-facebook-messenger-50.png")}
                            style={[
                                styles.homeIconImage,
                                { width: 30, height: 30 },
                            ]}
                        />
                    </TouchableOpacity>
                </View>
            </View>

            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={(insets?.top || 0) + 56}
            >
            <FlatList
                ref={listRef}
                data={posts}
                keyExtractor={(item) => String(item.id)}
                showsVerticalScrollIndicator={false}
                onEndReached={onEndReached}
                onEndReachedThreshold={0.6}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefreshFeed} />}
                ListHeaderComponent={
                    <>
                        {/* Stories */}
                        <View style={styles.storiesContainer}>
                            <FlatList
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                data={storiesData}
                                keyExtractor={(item) => item.id}
                                renderItem={({ item }) => (
                                    <StoryItem
                                        id={item.id}
                                        name={item.name}
                                        avatar={item.avatar}
                                        hasStory={item.hasStory}
                                        navigation={navigation}
                                    />
                                )}
                            />
                        </View>
                        {loading && (<Text style={{ padding: 16, color: '#666' }}>Đang tải...</Text>)}
                    </>
                }
                renderItem={({ item: p }) => (
                    <View style={styles.post}>
                            <View style={styles.postHeader}>
                                <TouchableOpacity style={styles.postHeaderLeft} onPress={() => {
                                    const uid = getOwnerId();
                                    const pid = p?.user?.id != null ? Number(p.user.id) : null;
                                    if (Number.isFinite(uid) && Number.isFinite(pid) && uid === pid) {
                                        navigation.navigate('Profile');
                                    } else {
                                        navigation.navigate('UserProfilePublic', { userId: pid, username: p.user?.username, avatarUrl: p.user?.avatarUrl });
                                    }
                                }}>
                                    <Image
                                        source={{ uri: p.user?.avatarUrl || 'https://i.pravatar.cc/150' }}
                                        style={styles.postAvatar}
                                    />
                                    <View>
                                        <TouchableOpacity onPress={() => {
                                            const uid = getOwnerId();
                                            const pid = p?.user?.id != null ? Number(p.user.id) : null;
                                            if (Number.isFinite(uid) && Number.isFinite(pid) && uid === pid) {
                                                navigation.navigate('Profile');
                                            } else {
                                                navigation.navigate('UserProfilePublic', { userId: pid, username: p.user?.username, avatarUrl: p.user?.avatarUrl });
                                            }
                                        }}>
                                            <Text style={styles.postUsername}>{p.user?.username || 'user'}</Text>
                                        </TouchableOpacity>
                                        <View style={{ flexDirection:'row', alignItems:'center', gap:6 }}>
                                            <Text style={styles.postLocation}>{new Date(p.createdAt).toLocaleString()}</Text>
                                            {!!p.privacy && (
                                                <View style={styles.privacyPill}>
                                                    <Ionicons name={p.privacy==='private' ? 'lock-closed' : p.privacy==='followers' ? 'people' : 'earth'} size={12} color="#374151" />
                                                    <Text style={styles.privacyText}>{p.privacy}</Text>
                                                </View>
                                            )}
                                        </View>
                                    </View>
                                </TouchableOpacity>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                    <TouchableOpacity style={styles.followBtn} onPress={() => { /* TODO: follow */ }}>
                                        <Text style={styles.followBtnText}>Theo dõi</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={() => openOptionsFor(p)}>
                                        <Text style={styles.moreIcon}>⋯</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>

                            <View style={styles.postImageContainer}>
                                {p.media && p.media.length > 0 ? (
                                    (() => {
                                        const images = (p.media||[]).filter(m => (m.type||'').toLowerCase()==='image');
                                        const videos = (p.media||[]).filter(m => (m.type||'').toLowerCase()==='video');
                                        if (images.length > 1) {
                                            return <PostImagesCarousel key={`car-${p.id}`} images={images} />;
                                        }
                                        if (images.length === 1) {
                                            return <Image source={{ uri: images[0].url }} style={styles.postImage} />;
                                        }
                                        if (videos.length > 0) {
                                            const video = videos[0];
                                            const currentUri = sanitizeUri(video?.url || '');
                                            return (
                                                <TouchableOpacity activeOpacity={0.9} onPress={() => openVideoPlayerFor(p)}>
                                                    <Video
                                                        key={`${p?.id ?? 'v'}:${currentUri}`}
                                                        source={{ uri: currentUri, headers: authHeaders || undefined }}
                                                        style={styles.postImage}
                                                        resizeMode={ResizeMode.COVER}
                                                        isLooping
                                                        shouldPlay={false}
                                                        useNativeControls={false}
                                                        isMuted={false}
                                                        volume={1.0}
                                                        progressUpdateIntervalMillis={250}
                                                        usePoster={!!video?.thumbnailUrl}
                                                        posterSource={video?.thumbnailUrl ? { uri: video.thumbnailUrl } : undefined}
                                                        onLoad={() => { console.log('[HOME] video preview loaded:', { postId: p.id }); }}
                                                        onError={(e) => { console.warn('[HOME] video preview error (original only):', { postId: p.id, err: e?.nativeEvent?.error }); }}
                                                    />
                                                    <View style={styles.playOverlay} pointerEvents="none">
                                                        <Ionicons name="play" size={36} color="#fff" />
                                                    </View>
                                                </TouchableOpacity>
                                            );
                                        }
                                        return (
                                            <View style={[styles.postImage, {justifyContent:'center', alignItems:'center'}]}>
                                                <Text style={{ color: '#fff' }}>Không có media</Text>
                                            </View>
                                        );
                                    })()
                                ) : (
                                    <View style={[styles.postImage, {justifyContent:'center', alignItems:'center'}]}>
                                        <Text style={{ color: '#fff' }}>Không có media</Text>
                                    </View>
                                )}
                            </View>

                            {/* Actions */}
                            <View style={styles.postActions}>
                                <View style={styles.postActionsLeft}>
                                    <TouchableOpacity onPress={() => onToggleLike(p.id)}>
                                        <Ionicons
                                            name={(postStates[p.id]?.liked ? 'heart' : 'heart-outline')}
                                            size={28}
                                            color={postStates[p.id]?.liked ? '#ED4956' : '#262626'}
                                        />
                                    </TouchableOpacity>
                                    <TouchableOpacity style={{flexDirection:'row', alignItems:'center'}} onPress={() => onOpenComments(p.id)}>
                                        <Ionicons name="chatbubble-outline" size={26} color="#262626" />
                                        <Text style={{ marginLeft: 6, color:'#262626', fontWeight:'600' }}>{postStates[p.id]?.comments ?? 0}</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={() => onRepost(p.id)}>
                                        <Ionicons name="repeat-outline" size={28} color="#262626" />
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={() => onShare(p)}>
                                        <Ionicons name="paper-plane-outline" size={26} color="#262626" />
                                    </TouchableOpacity>
                                </View>
                                {/* Right-side placeholder (bookmark, etc.) could go here */}
                            </View>

                            <View style={styles.postStats}>
                                {/* Likes and shares summary */}
                                <Text style={styles.likeCount}>
                                    {(postStates[p.id]?.likes ?? 0).toLocaleString()} lượt thích • {(postStates[p.id]?.shares ?? 0).toLocaleString()} lượt chia sẻ
                                </Text>
                                {editingCaptionPostId === p.id ? (
                                    <View style={{ marginTop: 6 }}>
                                        <Text
                                            style={[styles.captionText, { marginBottom: 8 }]}
                                        >Chỉnh sửa caption</Text>
                                        <View style={{ borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8 }}>
                                            <TextInput
                                                style={{ padding: 10, color: '#111827', maxHeight: 120 }}
                                                value={captionDraft}
                                                onChangeText={setCaptionDraft}
                                                multiline
                                                placeholder="Nhập caption..."
                                            />
                                        </View>
                                        {/* Simple inline controls */}
                                        <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
                                            <TouchableOpacity style={styles.primaryBtn} onPress={submitCaptionEdit}>
                                                <Text style={styles.primaryBtnText}>Lưu</Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity style={styles.secondaryBtn} onPress={closeAllOverlays}>
                                                <Text style={styles.secondaryBtnText}>Hủy</Text>
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                ) : (
                                    !!p.caption && (
                                        <Text style={styles.captionText}>{p.caption}</Text>
                                    )
                                )}
                            </View>
                        </View>
                )}
                ListFooterComponent={hasMore ? (
                    <View style={{ paddingVertical: 16, alignItems:'center' }}>
                        <Text style={{ color:'#666' }}>{loadingMore ? 'Đang tải...' : 'Kéo lên để tải thêm'}</Text>
                    </View>
                ) : (
                    <View style={{ height: 8 }} />
                )}
                contentContainerStyle={{ paddingBottom: 0 }}
            />
            </KeyboardAvoidingView>

            {/* Comments Modal */}
            <CommentsModal
                visible={showComments}
                onClose={() => setShowComments(false)}
                commentsCount={activeCommentsPostId ? (postStates[activeCommentsPostId]?.comments ?? 0) : 0}
            />

            {/* Options overlay */}
            {showOptions && (
                <TouchableOpacity activeOpacity={1} style={styles.overlay} onPress={closeAllOverlays}>
                    <TouchableOpacity activeOpacity={0.95} style={styles.sheet} onPress={(e) => e.stopPropagation()}>
                        <Text style={styles.sheetTitle}>Tùy chọn</Text>
                        {(() => {
                            const post = posts.find(x => x.id === optionsPostId);
                            if (post && isOwner(post)) {
                                return (
                                    <>
                                        <TouchableOpacity style={styles.sheetItem} onPress={() => setShowPrivacySheet(true)}>
                                            <Text style={styles.sheetItemText}>Chỉnh sửa quyền riêng tư</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity style={styles.sheetItem} onPress={() => startEditCaption(post)}>
                                            <Text style={styles.sheetItemText}>Chỉnh sửa bài đăng</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity style={[styles.sheetItem, { borderTopWidth: 0 }]} onPress={confirmDelete}>
                                            <Text style={[styles.sheetItemText, { color: '#dc2626' }]}>Xóa bài đăng</Text>
                                        </TouchableOpacity>
                                    </>
                                );
                            }
                            // Not owner: show limited actions (UI only)
                            return (
                                <>
                                    <TouchableOpacity style={styles.sheetItem} onPress={() => { /* TODO: report */ closeAllOverlays(); }}>
                                        <Text style={styles.sheetItemText}>Báo cáo</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={[styles.sheetItem, { borderTopWidth: 0 }]} onPress={() => { setPosts(prev => prev.filter(p => p.id !== optionsPostId)); closeAllOverlays(); }}>
                                        <Text style={styles.sheetItemText}>Ẩn bài viết</Text>
                                    </TouchableOpacity>
                                </>
                            );
                        })()}
                    </TouchableOpacity>
                </TouchableOpacity>
            )}

            {/* Privacy choices overlay */}
            {showOptions && showPrivacySheet && (
                <TouchableOpacity activeOpacity={1} style={styles.overlay} onPress={closeAllOverlays}>
                    <TouchableOpacity activeOpacity={0.95} style={styles.sheet} onPress={(e) => e.stopPropagation()}>
                        <Text style={styles.sheetTitle}>Chọn quyền riêng tư</Text>
                        {[
                            { k: 'public', label: 'Public' },
                            { k: 'followers', label: 'Followers' },
                            { k: 'private', label: 'Private' },
                        ].map(opt => (
                            <TouchableOpacity key={opt.k} style={styles.sheetItem} onPress={() => pickPrivacy(opt.k)}>
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

            {/* Bottom tab bar is now global in App.js */}
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
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 8,
        backgroundColor: '#F3F4F6',
    },
    privacyText: {
        color: '#374151',
        fontSize: 11,
        textTransform: 'capitalize',
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
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0,0,0,0.15)'
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
        borderColor: '#dbdbdb',
        borderRadius: 6,
    },
    followBtnText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#111827',
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
        color: '#111827',
        lineHeight: 20,
    },
    commentCountText: {
        fontSize: 12,
        color: "#8E8E8E",
    },
    // bottom nav styles removed (now handled by tab navigator)
    overlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'flex-end',
    },
    sheet: {
        backgroundColor: '#fff',
        padding: 16,
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
    },
    sheetTitle: {
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 8,
    },
    sheetItem: {
        paddingVertical: 12,
        borderTopWidth: 1,
        borderTopColor: '#e5e7eb',
    },
    sheetItemText: {
        fontSize: 16,
        color: '#111827',
    },
    primaryBtn: {
        backgroundColor: '#111827',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 8,
    },
    primaryBtnText: {
        color: '#fff',
        fontWeight: '600',
    },
    secondaryBtn: {
        backgroundColor: '#f3f4f6',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 8,
    },
    secondaryBtnText: {
        color: '#111827',
        fontWeight: '600',
    },
    busyOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(255,255,255,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    spinner: {
        width: 40,
        height: 40,
        borderRadius: 20,
        borderWidth: 4,
        borderColor: '#111827',
        borderTopColor: 'transparent',
        // simple CSS-like spinner animation is not available; this is a placeholder
    }
});
