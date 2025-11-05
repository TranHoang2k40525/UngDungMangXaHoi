import React, { useEffect, useMemo, useState } from "react";
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
    PermissionsAndroid,
    Share,
} from "react-native";
import { StoryItem, StoryAddItem } from './StoryComponents';
import { RefreshControl } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useRoute } from "@react-navigation/native";
import { useUser } from "../Context/UserContext";
import * as ImagePicker from "expo-image-picker";
import CommentsModal from "./CommentsModal";
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { getFeed, updatePostPrivacy, updatePostCaption, deletePost, getProfile, API_BASE_URL } from "../API/Api";
import { Ionicons } from "@expo/vector-icons";
import { Video } from "expo-av";
import { Alert } from 'react-native';

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
    const BOTTOM_NAV_HEIGHT = 0;
    const [postStates, setPostStates] = useState({});
    const [activeCommentsPostId, setActiveCommentsPostId] = useState(null);
    const [showComments, setShowComments] = useState(false);
    const [posts, setPosts] = useState([]);
    const [myStorySlot, setMyStorySlot] = useState({ 
        id: 'me', 
        name: 'Tin của bạn', 
        avatar: require('../Assets/trai.png'), 
        hasStory: false,
        storyData: null 
    });
    const [loading, setLoading] = useState(true);
    const [currentUserId, setCurrentUserId] = useState(null);
    const [refreshing, setRefreshing] = useState(false);
    const [optionsPostId, setOptionsPostId] = useState(null);
    const [showOptions, setShowOptions] = useState(false);
    const [showPrivacySheet, setShowPrivacySheet] = useState(false);
    const [busy, setBusy] = useState(false);
    const [editingCaptionPostId, setEditingCaptionPostId] = useState(null);
    const [captionDraft, setCaptionDraft] = useState("");
    const navigation = useNavigation();
    const route = useRoute();
    const { user: ctxUser } = useUser();

    // Function to load user avatar and info
    const loadUserAvatar = async () => {
        try {
            const userStr = await AsyncStorage.getItem('userInfo');
            if (userStr) {
                const user = JSON.parse(userStr);
                const rawAvatar = user?.avatarUrl ?? user?.avatar_url ?? null;
                const avatarUri = rawAvatar ? 
                    (String(rawAvatar).startsWith('http') ? rawAvatar : `${API_BASE_URL}${rawAvatar}`) 
                    : null;
                
                setMyStorySlot(prev => ({ 
                    ...prev, 
                    name: user?.username || prev.name, 
                    avatar: avatarUri ? { uri: avatarUri } : require('../Assets/trai.png')
                }));
                
                console.log('[HOME] Avatar updated:', avatarUri);
                
                // Also update story data with new avatar
                const savedStories = await AsyncStorage.getItem('currentUserStories');
                if (savedStories) {
                    let storiesArray = JSON.parse(savedStories);
                    // Update userAvatar in all stories
                    storiesArray = storiesArray.map(story => ({
                        ...story,
                        userAvatar: avatarUri,
                        userName: user?.username || story.userName
                    }));
                    await AsyncStorage.setItem('currentUserStories', JSON.stringify(storiesArray));
                    
                    setMyStorySlot(prev => ({
                        ...prev,
                        storyData: storiesArray
                    }));
                }
            }
        } catch (e) {
            console.warn('[HOME] Error loading user avatar:', e);
        }
    };

    // Function to check and update current user's story status
    const checkUserStory = async (userId) => {
        try {
            console.log('[HOME] Checking stories for user:', userId);
            
            // ✅ Load array stories từ AsyncStorage
            const savedStories = await AsyncStorage.getItem('currentUserStories');
            if (savedStories) {
                let storiesArray = JSON.parse(savedStories);
                
                // Lọc bỏ stories đã hết hạn 24h
                const now = Date.now();
                const validStories = storiesArray.filter(s => {
                    const age = now - new Date(s.createdAt).getTime();
                    return age < 24 * 60 * 60 * 1000;
                });
                
                if (validStories.length > 0) {
                    console.log('[HOME] Found', validStories.length, 'valid stories from AsyncStorage');
                    
                    // Update lại AsyncStorage nếu đã lọc bỏ stories cũ
                    if (validStories.length !== storiesArray.length) {
                        await AsyncStorage.setItem('currentUserStories', JSON.stringify(validStories));
                    }
                    
                    setMyStorySlot(prev => ({
                        ...prev,
                        hasStory: true,
                        id: 'me',
                        storyData: validStories
                    }));
                    return;
                } else {
                    // Tất cả stories đã hết hạn
                    console.log('[HOME] All stories expired, removing from AsyncStorage');
                    await AsyncStorage.removeItem('currentUserStories');
                    setMyStorySlot(prev => ({ 
                        ...prev, 
                        hasStory: false,
                        storyData: null 
                    }));
                    return;
                }
            }
            
            // ✅ Nếu không có trong AsyncStorage, gọi API
            const response = await fetch(`${API_BASE_URL}/api/stories/user/${userId}/active`);
            
            if (!response.ok) {
                console.log('[HOME] No active stories found from API');
                setMyStorySlot(prev => ({ 
                    ...prev, 
                    hasStory: false,
                    storyData: null 
                }));
                return;
            }

            const data = await response.json();
            console.log('[HOME] Stories from API:', data);
            
            // ✅ API có thể trả về array hoặc single object
            let storiesFromAPI = [];
            if (data?.data) {
                storiesFromAPI = Array.isArray(data.data) ? data.data : [data.data];
            }
            
            if (storiesFromAPI.length > 0) {
                const storyDataArray = storiesFromAPI.map(story => ({
                    id: story.id,
                    mediaUrl: story.mediaUrl,
                    mediaType: story.mediaType,
                    userName: story.userName,
                    userAvatar: story.userAvatar,
                    createdAt: story.createdAt,
                    viewCount: story.viewCount || 0
                }));
                
                setMyStorySlot(prev => ({
                    ...prev,
                    hasStory: true,
                    id: 'me',
                    storyData: storyDataArray
                }));
                
                // Lưu vào AsyncStorage
                await AsyncStorage.setItem('currentUserStories', JSON.stringify(storyDataArray));
                console.log('[HOME] Loaded', storyDataArray.length, 'stories from API');
            } else {
                setMyStorySlot(prev => ({ 
                    ...prev, 
                    hasStory: false,
                    storyData: null 
                }));
            }
        } catch (error) {
            console.error('[HOME] Error checking user stories:', error);
        }
    };



    // Load user info and initial data
    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                // Load current user id from storage
                try {
                    const userStr = await AsyncStorage.getItem('userInfo');
                    if (userStr) {
                        const user = JSON.parse(userStr);
                        const raw = user?.user_id ?? user?.userId ?? user?.UserId ?? user?.id ?? null;
                        const uidNum = raw != null ? Number(raw) : null;
                        
                        if (mounted && Number.isFinite(uidNum)) {
                            setCurrentUserId(uidNum);
                            console.log('[HOME] User ID set from AsyncStorage:', uidNum);
                            
                            // Load user's story
                            await checkUserStory(uidNum);
                        }
                        
                        // Update myStorySlot avatar/name
                        if (mounted) {
                            await loadUserAvatar();
                        }
                    }
                } catch (e) {
                    console.warn('[HOME] Error loading user from AsyncStorage:', e);
                }
                
                // Cross-check with profile API
                try {
                    const prof = await getProfile();
                    const profId = prof?.userId ?? prof?.UserId;
                    if (profId != null) {
                        const uid = Number(profId);
                        if (Number.isFinite(uid) && mounted) {
                            setCurrentUserId(uid);
                            console.log('[HOME] User ID set from getProfile:', uid);
                        }
                    }
                } catch (e) {
                    console.log('[HOME] getProfile() failed (non-fatal):', e?.message || e);
                }
                
                // Load feed
                const data = await getFeed();
                if (mounted) {
                    let arr = Array.isArray(data) ? data : [];
                    arr = arr.slice().sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
                    setPosts(arr);
                    
                    // Seed per-post state
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
                }
            } catch (e) {
                console.warn('[HOME] Feed error', e);
            } finally {
                if (mounted) setLoading(false);
            }
        })();
        return () => { mounted = false; };
    }, []);

    // Listen for story creation from CreateStory screen
    useEffect(() => {
        if (route.params?.createdStory && route.params?.newStory) {
            const story = route.params.newStory;
            console.log('[HOME] Received new story from CreateStory:', story);
            
            const newStoryData = {
                id: story.id,
                mediaUrl: story.mediaUrl,
                mediaType: story.mediaType,
                createdAt: story.createdAt,
                userName: story.userName,
                userAvatar: story.userAvatar,
                viewCount: 0
            };
            
            // ✅ Thêm story mới vào array thay vì ghi đè
            (async () => {
                try {
                    const savedStories = await AsyncStorage.getItem('currentUserStories');
                    let storiesArray = savedStories ? JSON.parse(savedStories) : [];
                    
                    // Loại bỏ stories đã hết hạn 24h
                    const now = Date.now();
                    storiesArray = storiesArray.filter(s => {
                        const age = now - new Date(s.createdAt).getTime();
                        return age < 24 * 60 * 60 * 1000;
                    });
                    
                    // Thêm story mới vào đầu array
                    storiesArray.unshift(newStoryData);
                    
                    // Lưu lại
                    await AsyncStorage.setItem('currentUserStories', JSON.stringify(storiesArray));
                    console.log('[HOME] Added new story to array, total:', storiesArray.length);
                    
                    // Update UI
                    setMyStorySlot(prev => ({
                        ...prev,
                        id: 'me',
                        hasStory: true,
                        storyData: storiesArray
                    }));
                } catch (e) {
                    console.warn('[HOME] Failed to save story array:', e);
                }
            })();

            // Clear params
            navigation.setParams({
                createdStory: undefined,
                newStory: undefined,
                timestamp: undefined
            });
        }
    }, [route.params?.timestamp]);

    // Refresh feed when screen focuses + reload avatar
    useEffect(() => {
        const unsubscribe = navigation.addListener('focus', async () => {
            console.log('[HOME] Screen focused');
            
            // ✅ Reload avatar mỗi khi focus (để cập nhật nếu đổi từ Profile)
            await loadUserAvatar();
            
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

    // Reload story whenever currentUserId changes
    useEffect(() => {
        if (currentUserId != null && Number.isFinite(currentUserId)) {
            console.log('[HOME] CurrentUserId changed, reloading story:', currentUserId);
            checkUserStory(currentUserId);
        }
    }, [currentUserId]);

    const handleCameraPress = async () => {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== "granted") {
            console.log("Camera permission not granted");
            return;
        }

        try {
            const cameraOpts = {
                quality: 1,
                allowsEditing: false,
                exif: false,
                mediaTypes: ImagePicker.MediaTypeOptions.Images
            };

            const result = await ImagePicker.launchCameraAsync(cameraOpts);

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
        setPostStates((prev) => {
            const cur = prev[postId] || { liked: false, likes: 0, shares: 0, comments: 0 };
            return { ...prev, [postId]: { ...cur, shares: cur.shares + 1 } };
        });
    };

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
        console.log('[HOME] Open options for post', post.id, 'ownerId:', uid, 'postUserId:', pid);
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
        Alert.alert(
            'Xóa bài đăng',
            'Bạn có chắc muốn xóa bài đăng này?',
            [
                { text: 'Hủy', style: 'cancel' },
                {
                    text: 'Xóa', 
                    style: 'destructive', 
                    onPress: async () => {
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
            console.log('[HOME] Refreshing feed...');
            
            // Reload feed
            const data = await getFeed();
            let arr = Array.isArray(data) ? data : [];
            arr = arr.slice().sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
            setPosts(arr);

            // ✅ Reload avatar khi refresh
            await loadUserAvatar();
            
            console.log('[HOME] Feed refreshed successfully');
        } catch (e) {
            console.warn('[HOME] Refresh feed error', e);
        } finally {
            setRefreshing(false);
        }
    };

    const openVideoPlayerFor = (post) => {
        const videos = posts.filter(pp => (pp.media||[]).some(m => (m.type||'').toLowerCase()==='video'));
        const initialIndex = videos.findIndex(v => v.id === post.id);
        navigation.navigate('Video', { videos, initialIndex: Math.max(0, initialIndex) });
    };

    const handleAddStory = async () => {
        try {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
                console.log('Media library permission not granted');
                return;
            }

            const libOpts = {
                quality: 0.9,
                mediaTypes: ImagePicker.MediaTypeOptions.Videos
            };

            const result = await ImagePicker.launchImageLibraryAsync(libOpts);
            if (result.canceled) return;
            
            const asset = result.assets && result.assets.length > 0 ? result.assets[0] : null;
            const uri = asset?.uri || result.uri;
            if (!uri) return;

            // Check video duration
            let durationSec = null;
            if (asset?.duration != null) {
                durationSec = asset.duration > 1000 ? Math.round(asset.duration / 1000) : asset.duration;
            } else if (asset?.durationMillis != null) {
                durationSec = Math.round(asset.durationMillis / 1000);
            } else if (result.duration != null) {
                durationSec = result.duration > 1000 ? Math.round(result.duration / 1000) : result.duration;
            } else if (result.durationMillis != null) {
                durationSec = Math.round(result.durationMillis / 1000);
            }
            
            console.log('[HOME] Video duration:', durationSec, 'seconds');
            
            if (durationSec != null && durationSec > 30) {
                Alert.alert(
                    'Video quá dài', 
                    `Video dài ${Math.floor(durationSec/60)}:${String(durationSec%60).padStart(2,'0')}. Vui lòng chọn video có độ dài tối đa 30 giây.`
                );
                return;
            }

            const filename = asset?.fileName || uri.split('/').pop();
            const fileObj = { 
                uri, 
                name: filename, 
                type: asset?.type === 'video' || asset?.mediaType === 'video' ? 'video/mp4' : (asset?.type || 'application/octet-stream') 
            };

            navigation.navigate('CreateStory', { media: fileObj });
        } catch (e) {
            console.warn('[HOME] handleAddStory error', e?.message || e);
        }
    };

    return (
        <SafeAreaView style={[styles.container, { paddingTop: insets.top }]}>
            {/* Header */}
            <View style={[styles.header, { paddingTop: 4 }]}> 
                <TouchableOpacity
                    style={styles.navItem}
                    onPress={handleCameraPress}
                >
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
                        onPress={() => navigation.navigate("Thongbao")}
                    >
                        <Image
                            source={require("../Assets/icons8-notification-48.png")}
                            style={[styles.homeIconImage, { width: 30, height: 30 }]}
                        />
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

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 0 }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefreshFeed} />}
            >
                {/* Stories */}
                <View style={styles.storiesContainer}>
                    <FlatList
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        data={[{ id: 'add' }, myStorySlot]}
                        keyExtractor={(item) => String(item.id)}
                        renderItem={({ item }) => (
                            item.id === 'add' ? (
                                <StoryAddItem onPress={handleAddStory} />
                            ) : (
                                <StoryItem
                                    id={item.id}
                                    name={item.name || myStorySlot.name}
                                    avatar={item.avatar || myStorySlot.avatar}
                                    hasStory={Boolean(item.hasStory)}
                                    storyData={item.storyData || myStorySlot.storyData}
                                    navigation={navigation}
                                />
                            )
                        )}
                    />
                </View>

                {/* Feed posts */}
                {loading ? (
                    <Text style={{ padding: 16, color: '#666' }}>Đang tải...</Text>
                ) : (
                    posts.map((p) => (
                        <View key={p.id} style={styles.post}>
                            <View style={styles.postHeader}>
                                <TouchableOpacity 
                                    style={styles.postHeaderLeft} 
                                    onPress={() => navigation.navigate('Profile')}
                                >
                                    <Image
                                        source={{ uri: p.user?.avatarUrl || 'https://i.pravatar.cc/150' }}
                                        style={styles.postAvatar}
                                    />
                                    <View>
                                        <Text style={styles.postUsername}>{p.user?.username || 'user'}</Text>
                                        <View style={{ flexDirection:'row', alignItems:'center', gap:6 }}>
                                            <Text style={styles.postLocation}>
                                                {new Date(p.createdAt).toLocaleString(undefined, { hour12: false })}
                                            </Text>
                                            {!!p.privacy && (
                                                <View style={styles.privacyPill}>
                                                    <Ionicons 
                                                        name={p.privacy==='private' ? 'lock-closed' : p.privacy==='followers' ? 'people' : 'earth'} 
                                                        size={12} 
                                                        color="#374151" 
                                                    />
                                                    <Text style={styles.privacyText}>{p.privacy}</Text>
                                                </View>
                                            )}
                                        </View>
                                    </View>
                                </TouchableOpacity>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                    <TouchableOpacity style={styles.followBtn}>
                                        <Text style={styles.followBtnText}>Theo dõi</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={() => openOptionsFor(p)}>
                                        <Text style={styles.moreIcon}>⋮</Text>
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
                                            return (
                                                <TouchableOpacity activeOpacity={0.9} onPress={() => openVideoPlayerFor(p)}>
                                                    <Video
                                                        source={{ uri: video.url }}
                                                        style={styles.postImage}
                                                        resizeMode="cover"
                                                        isLooping
                                                        shouldPlay={false}
                                                        useNativeControls={false}
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
                                    <TouchableOpacity 
                                        style={{flexDirection:'row', alignItems:'center'}} 
                                        onPress={() => onOpenComments(p.id)}
                                    >
                                        <Ionicons name="chatbubble-outline" size={26} color="#262626" />
                                        <Text style={{ marginLeft: 6, color:'#262626', fontWeight:'600' }}>
                                            {postStates[p.id]?.comments ?? 0}
                                        </Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={() => onRepost(p.id)}>
                                        <Ionicons name="repeat-outline" size={28} color="#262626" />
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={() => onShare(p)}>
                                        <Ionicons name="paper-plane-outline" size={26} color="#262626" />
                                    </TouchableOpacity>
                                </View>
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
                    ))
                )}
            </ScrollView>

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
                            // Not owner: show limited actions
                            return (
                                <>
                                    <TouchableOpacity style={styles.sheetItem} onPress={() => { closeAllOverlays(); }}>
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
    },
    addStoryAvatar: {
        backgroundColor: '#fff',
        width: 62,
        height: 62,
        borderRadius: 31,
        justifyContent: 'center',
        alignItems: 'center',
    },
    plusCircle: {
        width: 34,
        height: 34,
        borderRadius: 17,
        backgroundColor: '#111827',
        justifyContent: 'center',
        alignItems: 'center',
    },
    plusText: {
        color: '#fff',
        fontSize: 22,
        lineHeight: 22,
        fontWeight: '700',
    },
});
