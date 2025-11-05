import React, { useEffect, useState } from "react";import React, { useEffect, useMemo, useState } from "react";import React, { useEffect, useMemo, useState } from 'react';

import {

    View,import {import { View, Text, Image, StyleSheet, Dimensions, TouchableOpacity, FlatList, TextInput, RefreshControl } from 'react-native';

    Text,

    Image,    View,import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

    TouchableOpacity,

    StyleSheet,    Text,import { Ionicons } from '@expo/vector-icons';

    FlatList,

    Platform,    Image,import { useNavigation, useRoute } from '@react-navigation/native';

    Share,

    KeyboardAvoidingView,    TouchableOpacity,import { VideoView, useVideoPlayer } from 'expo-video';

    Modal,

    Alert,    StyleSheet,import { getUserPostsById, updatePostCaption, updatePostPrivacy, deletePost } from '../API/Api';

    Dimensions,

    TextInput,    FlatList,import { useUser } from '../Context/UserContext';

} from "react-native";

import { RefreshControl } from 'react-native';    Platform,import AsyncStorage from '@react-native-async-storage/async-storage';

import AsyncStorage from '@react-native-async-storage/async-storage';

import { useNavigation, useRoute } from "@react-navigation/native";    Share,

import { useUser } from "../Context/UserContext";

import { useFollow } from "../Context/FollowContext";    KeyboardAvoidingView,const { width, height } = Dimensions.get('window');

import CommentsModal from "./CommentsModal";

import { SafeAreaView } from 'react-native-safe-area-context';    Modal,

import { getUserPostsById, updatePostPrivacy, updatePostCaption, deletePost, followUser, unfollowUser } from "../API/Api";

import { Ionicons } from "@expo/vector-icons";    Alert,export default function PostDetail() {

import { VideoView, useVideoPlayer } from "expo-video";

    Dimensions,  const route = useRoute();

const { width } = Dimensions.get('window');

    TextInput,  const navigation = useNavigation();

// Component wrapper cho video thumbnail trong feed

const VideoThumbnail = React.memo(({ videoUrl, style, onPress }) => {} from "react-native";  const insets = useSafeAreaInsets();

    const player = useVideoPlayer(videoUrl, (p) => {

        if (p) {import { RefreshControl } from 'react-native';  const initialPost = route.params?.post;

            p.muted = true;

            p.loop = false;import AsyncStorage from '@react-native-async-storage/async-storage';  const [post, setPost] = useState(initialPost);

        }

    });import { useNavigation, useRoute } from "@react-navigation/native";  const [otherPosts, setOtherPosts] = useState([]);

    

    return (import { useUser } from "../Context/UserContext";  const [refreshing, setRefreshing] = useState(false);

        <TouchableOpacity activeOpacity={0.9} onPress={onPress}>

            <VideoViewimport { useFollow } from "../Context/FollowContext";  const [showOptions, setShowOptions] = useState(false);

                style={style}

                player={player}import CommentsModal from "./CommentsModal";  const [showPrivacySheet, setShowPrivacySheet] = useState(false);

                contentFit="cover"

                nativeControls={false}import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';  const [editingCaption, setEditingCaption] = useState(false);

            />

            <View style={styles.playOverlay} pointerEvents="none">import { getUserPostsById, updatePostPrivacy, updatePostCaption, deletePost, followUser, unfollowUser } from "../API/Api";  const [captionDraft, setCaptionDraft] = useState('');

                <Ionicons name="play" size={36} color="#fff" />

            </View>import { Ionicons } from "@expo/vector-icons";  const [busy, setBusy] = useState(false);

        </TouchableOpacity>

    );import { VideoView, useVideoPlayer } from "expo-video";  const { user: ctxUser } = useUser();

});

  const [currentUserId, setCurrentUserId] = useState(null);

// Component hiển thị nhiều ảnh trong post

const PostImagesCarousel = ({ images = [] }) => {const { width } = Dimensions.get('window');

    const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {

    if (!images || images.length === 0) return null;

// Component wrapper cho video thumbnail trong feed    let alive = true;

    return (

        <View style={styles.carouselContainer}>const VideoThumbnail = React.memo(({ videoUrl, style, onPress }) => {    (async () => {

            <FlatList

                data={images}    const player = useVideoPlayer(videoUrl, (p) => {      try {

                horizontal

                pagingEnabled        if (p) {        const userStr = await AsyncStorage.getItem('userInfo');

                showsHorizontalScrollIndicator={false}

                keyExtractor={(item, idx) => `img-${idx}`}            p.muted = true;        if (userStr && alive) {

                onMomentumScrollEnd={(e) => {

                    const index = Math.round(e.nativeEvent.contentOffset.x / width);            p.loop = false;          const parsed = JSON.parse(userStr);

                    setCurrentImageIndex(index);

                }}        }          const raw = parsed?.user_id ?? parsed?.userId ?? parsed?.UserId ?? parsed?.id ?? null;

                renderItem={({ item }) => (

                    <Image source={{ uri: item.url }} style={styles.carouselImage} />    });          const n = raw != null ? Number(raw) : null;

                )}

            />              setCurrentUserId(Number.isFinite(n) ? n : null);

            {images.length > 1 && (

                <View style={styles.paginationDots}>    return (        }

                    {images.map((_, idx) => (

                        <View        <TouchableOpacity activeOpacity={0.9} onPress={onPress}>      } catch {}

                            key={idx}

                            style={[            <VideoView    })();

                                styles.dot,

                                idx === currentImageIndex && styles.activeDot,                style={style}    return () => { alive = false; };

                            ]}

                        />                player={player}  }, []);

                    ))}

                </View>                contentFit="cover"

            )}

        </View>                nativeControls={false}  const getOwnerId = () => {

    );

};            />    const fromCtx = ctxUser?.user_id ?? ctxUser?.userId ?? ctxUser?.UserId ?? ctxUser?.id;



export default function PostDetail() {            <View style={styles.playOverlay} pointerEvents="none">    const n1 = fromCtx != null ? Number(fromCtx) : null;

    const route = useRoute();

    const navigation = useNavigation();                <Ionicons name="play" size={36} color="#fff" />    if (Number.isFinite(n1)) return n1;

    const { user: ctxUser } = useUser();

    const { markAsFollowed, markAsUnfollowed, isFollowed } = useFollow();            </View>    const n2 = currentUserId != null ? Number(currentUserId) : null;

    

    // Get userId from route params        </TouchableOpacity>    return Number.isFinite(n2) ? n2 : null;

    const targetUserId = route.params?.post?.user?.id || route.params?.userId;

    );  };

    const [postStates, setPostStates] = useState({});

    const [activeCommentsPostId, setActiveCommentsPostId] = useState(null);});  const isOwner = (p) => {

    const [posts, setPosts] = useState([]);

    const [loading, setLoading] = useState(false);    const uid = getOwnerId();

    const [refreshing, setRefreshing] = useState(false);

    const [currentPage, setCurrentPage] = useState(1);// Component hiển thị nhiều ảnh trong post    const pidRaw = p?.user?.id;

    const [hasMorePosts, setHasMorePosts] = useState(true);

    const [loadingMore, setLoadingMore] = useState(false);const PostImagesCarousel = ({ images = [] }) => {    const pid = pidRaw != null ? Number(pidRaw) : null;

    const [optionsPostId, setOptionsPostId] = useState(null);

    const [showPrivacySheet, setShowPrivacySheet] = useState(false);    const [currentImageIndex, setCurrentImageIndex] = useState(0);    return Number.isFinite(uid) && Number.isFinite(pid) && uid === pid;

    const [captionDraft, setCaptionDraft] = useState('');

    const [editingCaptionPostId, setEditingCaptionPostId] = useState(null);  };

    const [busy, setBusy] = useState(false);

    const [currentUserId, setCurrentUserId] = useState(null);    if (!images || images.length === 0) return null;



    // Get current user ID  // Load other posts of this user (excluding current)

    useEffect(() => {

        let alive = true;    return (  useEffect(() => {

        (async () => {

            try {        <View style={styles.carouselContainer}>    let alive = true;

                const userStr = await AsyncStorage.getItem('userInfo');

                if (userStr && alive) {            <FlatList    (async () => {

                    const parsed = JSON.parse(userStr);

                    const raw = parsed?.user_id ?? parsed?.userId ?? parsed?.UserId ?? parsed?.id ?? null;                data={images}      const uid = post?.user?.id;

                    const n = raw != null ? Number(raw) : null;

                    setCurrentUserId(Number.isFinite(n) ? n : null);                horizontal      if (!uid) return;

                }

            } catch {}                pagingEnabled      try {

        })();

        return () => { alive = false; };                showsHorizontalScrollIndicator={false}        const list = await getUserPostsById(uid);

    }, []);

                keyExtractor={(item, idx) => `img-${idx}`}        const others = (Array.isArray(list) ? list : []).filter(x => x.id !== post.id);

    const getOwnerId = () => {

        const fromCtx = ctxUser?.user_id ?? ctxUser?.userId ?? ctxUser?.UserId ?? ctxUser?.id;                onMomentumScrollEnd={(e) => {        if (alive) setOtherPosts(others);

        const n1 = fromCtx != null ? Number(fromCtx) : null;

        if (Number.isFinite(n1)) return n1;                    const index = Math.round(e.nativeEvent.contentOffset.x / width);      } catch {}

        const n2 = currentUserId != null ? Number(currentUserId) : null;

        return Number.isFinite(n2) ? n2 : null;                    setCurrentImageIndex(index);    })();

    };

                }}    return () => { alive = false; };

    const isOwnPost = (post) => {

        const oid = getOwnerId();                renderItem={({ item }) => (  }, [post?.user?.id, post?.id]);

        if (!oid) return false;

        const pid = post?.user?.id != null ? Number(post.user.id) : null;                    <Image source={{ uri: item.url }} style={styles.carouselImage} />

        return pid != null && pid === oid;

    };                )}  const onRefreshOthers = async () => {



    // Initialize post states            />    try {

    const initPostStates = (postsArr) => {

        const states = {};            {images.length > 1 && (      setRefreshing(true);

        for (const p of postsArr) {

            if (p?.id != null) {                <View style={styles.paginationDots}>      const uid = post?.user?.id;

                states[p.id] = {

                    liked: p.isLiked ?? false,                    {images.map((_, idx) => (      if (!uid) return;

                    likes: p.likesCount ?? 0,

                    shares: p.sharesCount ?? 0,                        <View      const list = await getUserPostsById(uid);

                    comments: p.commentsCount ?? 0,

                };                            key={idx}      const others = (Array.isArray(list) ? list : []).filter(x => x.id !== post.id);

            }

        }                            style={[      setOtherPosts(others);

        setPostStates(prev => ({ ...prev, ...states }));

    };                                styles.dot,    } finally { setRefreshing(false); }



    // Load user posts                                idx === currentImageIndex && styles.activeDot,  };

    const loadUserPosts = async (page = 1, refresh = false) => {

        if (!targetUserId) return;                            ]}

        

        try {                        />  const image = useMemo(() => (post?.media||[]).find(m => (m.type||'').toLowerCase()==='image'), [post]);

            if (refresh) {

                setRefreshing(true);                    ))}  const video = useMemo(() => (post?.media||[]).find(m => (m.type||'').toLowerCase()==='video'), [post]);

            } else {

                setLoading(true);                </View>

            }

            )}  // Tạo video player cho main post nếu có video

            const pageSize = 10;

            const data = await getUserPostsById(targetUserId, page, pageSize);        </View>  const videoPlayer = useVideoPlayer(video?.url || null, (player) => {

            const arr = Array.isArray(data) ? data : [];

    );    if (player && video) {

            if (refresh) {

                setPosts(arr);};      player.loop = false;

                setCurrentPage(1);

                setHasMorePosts(arr.length >= pageSize);      player.muted = false;

                initPostStates(arr);

            } else {export default function PostDetail() {    }

                setPosts(prev => {

                    const combined = [...prev, ...arr];    const route = useRoute();  });

                    const unique = Array.from(new Map(combined.map(p => [p.id, p])).values());

                    return unique;    const navigation = useNavigation();

                });

                setCurrentPage(page);    const insets = useSafeAreaInsets();  const closeAllOverlays = () => {

                setHasMorePosts(arr.length >= pageSize);

                initPostStates(arr);    const { user: ctxUser } = useUser();    setShowOptions(false);

            }

        } catch (e) {    const { markAsFollowed, markAsUnfollowed, isFollowed } = useFollow();    setShowPrivacySheet(false);

            console.warn('Load user posts error:', e);

        } finally {        setEditingCaption(false);

            setLoading(false);

            setRefreshing(false);    // Get userId from route params    setCaptionDraft('');

            setLoadingMore(false);

        }    const targetUserId = route.params?.post?.user?.id || route.params?.userId;  };

    };

    const initialPost = route.params?.post;

    // Initial load

    useEffect(() => {  const pickPrivacy = async (privacyKey) => {

        if (targetUserId) {

            loadUserPosts(1, false);    const [postStates, setPostStates] = useState({}); // { [postId]: { liked, likes, shares, comments } }    try {

        }

    }, [targetUserId]);    const [activeCommentsPostId, setActiveCommentsPostId] = useState(null);      if (!post) return;



    // Refresh    const [posts, setPosts] = useState([]);      setBusy(true);

    const onRefreshFeed = async () => {

        await loadUserPosts(1, true);    const [loading, setLoading] = useState(false);      const updated = await updatePostPrivacy(post.id, privacyKey);

    };

    const [refreshing, setRefreshing] = useState(false);      setPost(prev => ({ ...prev, privacy: updated?.privacy ?? privacyKey }));

    // Load more

    const loadMorePosts = async () => {    const [currentPage, setCurrentPage] = useState(1);      setShowPrivacySheet(false);

        if (loadingMore || !hasMorePosts || loading) return;

            const [hasMorePosts, setHasMorePosts] = useState(true);      setShowOptions(false);

        setLoadingMore(true);

        await loadUserPosts(currentPage + 1, false);    const [loadingMore, setLoadingMore] = useState(false);    } catch (e) { console.warn('Update privacy error', e); } finally { setBusy(false); }

    };

    const [optionsPostId, setOptionsPostId] = useState(null);  };

    // Toggle like

    const onToggleLike = (postId) => {    const [showPrivacySheet, setShowPrivacySheet] = useState(false);

        setPostStates(prev => {

            const curr = prev[postId] || { liked: false, likes: 0, shares: 0, comments: 0 };    const [captionDraft, setCaptionDraft] = useState('');  const submitCaptionEdit = async () => {

            const newLiked = !curr.liked;

            const newLikes = newLiked ? curr.likes + 1 : Math.max(0, curr.likes - 1);    const [editingCaptionPostId, setEditingCaptionPostId] = useState(null);    try {

            return {

                ...prev,    const [busy, setBusy] = useState(false);      if (!post) return;

                [postId]: { ...curr, liked: newLiked, likes: newLikes }

            };    const [currentUserId, setCurrentUserId] = useState(null);      setBusy(true);

        });

    };      const updated = await updatePostCaption(post.id, captionDraft);



    // Share    // Get current user ID      setPost(prev => ({ ...prev, caption: updated?.caption ?? captionDraft }));

    const onRepost = (postId) => {

        setPostStates(prev => {    useEffect(() => {      closeAllOverlays();

            const curr = prev[postId] || { liked: false, likes: 0, shares: 0, comments: 0 };

            return {        let alive = true;    } catch (e) { console.warn('Update caption error', e); } finally { setBusy(false); }

                ...prev,

                [postId]: { ...curr, shares: curr.shares + 1 }        (async () => {  };

            };

        });            try {



        const post = posts.find(p => p.id === postId);                const userStr = await AsyncStorage.getItem('userInfo');  return (

        if (post) {

            Share.share({                if (userStr && alive) {    <SafeAreaView edges={['top']} style={styles.container}>

                message: `Check out this post: ${post.caption || ''}`,

            });                    const parsed = JSON.parse(userStr);      <View style={[styles.header,{ paddingTop: insets.top }]}>

        }

    };                    const raw = parsed?.user_id ?? parsed?.userId ?? parsed?.UserId ?? parsed?.id ?? null;        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 8 }}>



    // Follow/Unfollow                    const n = raw != null ? Number(raw) : null;          <Ionicons name="chevron-back" size={24} color="#111827" />

    const handleFollowToggle = async (userId, username) => {

        try {                    setCurrentUserId(Number.isFinite(n) ? n : null);        </TouchableOpacity>

            const followed = isFollowed(userId);

            if (followed) {                }        <Text style={styles.title}>Bài đăng</Text>

                await unfollowUser(userId);

                markAsUnfollowed(userId);            } catch {}        <View style={{ width: 32 }} />

            } else {

                await followUser(userId);        })();      </View>

                markAsFollowed(userId, username || 'user');

            }        return () => { alive = false; };

        } catch (e) {

            console.warn('Follow error:', e);    }, []);      {/* Post content like Home */}

            Alert.alert('Lỗi', e.message || 'Không thể theo dõi người dùng');

        }      <View style={styles.post}>

    };

    const getOwnerId = () => {        <View style={styles.postHeader}>

    // Open video player

    const openVideoPlayerFor = (post) => {        const fromCtx = ctxUser?.user_id ?? ctxUser?.userId ?? ctxUser?.UserId ?? ctxUser?.id;          <View style={styles.postHeaderLeft}>

        navigation.navigate('Video', { 

            selectedId: post.id,        const n1 = fromCtx != null ? Number(fromCtx) : null;            <Image source={{ uri: post?.user?.avatarUrl || 'https://i.pravatar.cc/150' }} style={styles.postAvatar} />

            userId: post.user?.id,

            username: post.user?.username         if (Number.isFinite(n1)) return n1;            <View>

        });

    };        const n2 = currentUserId != null ? Number(currentUserId) : null;              <Text style={styles.postUsername}>{post?.user?.username || 'user'}</Text>



    // Options menu        return Number.isFinite(n2) ? n2 : null;              <View style={{ flexDirection:'row', alignItems:'center', gap:6 }}>

    const openOptions = (postId) => {

        setOptionsPostId(postId);    };                <Text style={styles.postLocation}>{new Date(post?.createdAt).toLocaleString()}</Text>

    };

                {!!post?.privacy && (

    const closeOptions = () => {

        setOptionsPostId(null);    const isOwnPost = (post) => {                  <View style={styles.privacyPill}>

        setShowPrivacySheet(false);

        setEditingCaptionPostId(null);        const oid = getOwnerId();                    <Ionicons name={post.privacy==='private' ? 'lock-closed' : post.privacy==='followers' ? 'people' : 'earth'} size={12} color="#374151" />

        setCaptionDraft('');

    };        if (!oid) return false;                    <Text style={styles.privacyText}>{post.privacy}</Text>



    const pickPrivacy = async (privacyKey) => {        const pid = post?.user?.id != null ? Number(post.user.id) : null;                  </View>

        try {

            const post = posts.find(p => p.id === optionsPostId);        return pid != null && pid === oid;                )}

            if (!post) return;

            setBusy(true);    };              </View>

            await updatePostPrivacy(post.id, privacyKey);

            setPosts(prev => prev.map(p => p.id === post.id ? { ...p, privacy: privacyKey } : p));            </View>

            setShowPrivacySheet(false);

            closeOptions();    // Initialize post states          </View>

        } catch (e) {

            console.warn('Update privacy error', e);    const initPostStates = (postsArr) => {          <TouchableOpacity onPress={() => setShowOptions(true)}>

        } finally {

            setBusy(false);        const states = {};            <Text style={styles.moreIcon}>⋯</Text>

        }

    };        for (const p of postsArr) {          </TouchableOpacity>



    const handleEditCaption = (postId) => {            if (p?.id != null) {        </View>

        const post = posts.find(p => p.id === postId);

        if (post) {                states[p.id] = {

            setCaptionDraft(post.caption || '');

            setEditingCaptionPostId(postId);                    liked: p.isLiked ?? false,        <View style={styles.postImageContainer}>

            setOptionsPostId(null);

        }                    likes: p.likesCount ?? 0,          {image ? (

    };

                    shares: p.sharesCount ?? 0,            <Image source={{ uri: image.url }} style={styles.postImage} />

    const submitCaptionEdit = async () => {

        if (!editingCaptionPostId) return;                    comments: p.commentsCount ?? 0,          ) : video && videoPlayer ? (

        try {

            setBusy(true);                };            <View>

            await updatePostCaption(editingCaptionPostId, captionDraft);

            setPosts(prev => prev.map(p => p.id === editingCaptionPostId ? { ...p, caption: captionDraft } : p));            }              <VideoView 

            setEditingCaptionPostId(null);

            setCaptionDraft('');        }                style={styles.postImage} 

        } catch (e) {

            console.warn('Update caption error', e);        setPostStates(prev => ({ ...prev, ...states }));                player={videoPlayer}

        } finally {

            setBusy(false);    };                contentFit="cover"

        }

    };                nativeControls={true}



    const handleDeletePost = async (postId) => {    // Load user posts              />

        Alert.alert(

            'Xác nhận xóa',    const loadUserPosts = async (page = 1, refresh = false) => {            </View>

            'Bạn có chắc chắn muốn xóa bài đăng này?',

            [        if (!targetUserId) return;          ) : (

                { text: 'Hủy', style: 'cancel' },

                {                    <View style={[styles.postImage,{justifyContent:'center', alignItems:'center'}]}><Text style={{color:'#fff'}}>Không có media</Text></View>

                    text: 'Xóa',

                    style: 'destructive',        try {          )}

                    onPress: async () => {

                        try {            if (refresh) {        </View>

                            setBusy(true);

                            await deletePost(postId);                setRefreshing(true);

                            setPosts(prev => prev.filter(p => p.id !== postId));

                            closeOptions();            } else {        <View style={styles.postStats}>

                        } catch (e) {

                            console.warn('Delete post error', e);                setLoading(true);          {editingCaption ? (

                        } finally {

                            setBusy(false);            }            <View style={{ marginTop: 6 }}>

                        }

                    }              <Text style={[styles.captionText, { marginBottom: 8 }]}>Chỉnh sửa caption</Text>

                }

            ]            const pageSize = 10;              <View style={{ borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8 }}>

        );

    };            const data = await getUserPostsById(targetUserId, page, pageSize);                <TextInput style={{ padding: 10, color: '#111827', maxHeight: 120 }} value={captionDraft} onChangeText={setCaptionDraft} multiline placeholder="Nhập caption..." />



    // Render post item            const arr = Array.isArray(data) ? data : [];              </View>

    const renderPost = ({ item: p }) => {

        const images = (p.media || []).filter(m => (m.type||'').toLowerCase() === 'image');              <View style={{ flexDirection:'row', gap: 12, marginTop: 8 }}>

        const videos = (p.media || []).filter(m => (m.type||'').toLowerCase() === 'video');

        const isVideo = videos.length > 0;            if (refresh) {                <TouchableOpacity style={styles.primaryBtn} onPress={submitCaptionEdit}><Text style={styles.primaryBtnText}>Lưu</Text></TouchableOpacity>

        const st = postStates[p.id] || { liked: false, likes: 0, shares: 0, comments: 0 };

        const userIsFollowed = p.user?.id ? isFollowed(p.user.id) : false;                setPosts(arr);                <TouchableOpacity style={styles.secondaryBtn} onPress={closeAllOverlays}><Text style={styles.secondaryBtnText}>Hủy</Text></TouchableOpacity>

        const ownPost = isOwnPost(p);

                setCurrentPage(1);              </View>

        return (

            <View style={styles.postCard}>                setHasMorePosts(arr.length >= pageSize);            </View>

                {/* Header */}

                <View style={styles.postHeader}>                initPostStates(arr);          ) : (

                    <TouchableOpacity 

                        style={styles.userInfo}            } else {            !!post?.caption && <Text style={styles.captionText}>{post.caption}</Text>

                        onPress={() => {

                            if (p.user?.id) {                setPosts(prev => {          )}

                                if (ownPost) {

                                    navigation.navigate('Profile');                    const combined = [...prev, ...arr];        </View>

                                } else {

                                    navigation.navigate('UserProfilePublic', { userId: p.user.id });                    const unique = Array.from(new Map(combined.map(p => [p.id, p])).values());      </View>

                                }

                            }                    return unique;

                        }}

                    >                });      {/* Other posts of this user (grid) */}

                        <Image 

                            source={{ uri: p.user?.avatarUrl || 'https://via.placeholder.com/40' }}                 setCurrentPage(page);      <FlatList

                            style={styles.avatar} 

                        />                setHasMorePosts(arr.length >= pageSize);        data={otherPosts}

                        <View style={styles.userDetails}>

                            <Text style={styles.userName}>{p.user?.username || 'Unknown'}</Text>                initPostStates(arr);        keyExtractor={(item) => String(item.id)}

                            <Text style={styles.postTime}>{p.createdAt || 'Recently'}</Text>

                        </View>            }        numColumns={3}

                    </TouchableOpacity>

        } catch (e) {        contentContainerStyle={{ paddingBottom: 16 }}

                    <View style={styles.headerActions}>

                        {!ownPost && (            console.warn('Load user posts error:', e);        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefreshOthers} />}

                            <TouchableOpacity 

                                onPress={() => handleFollowToggle(p.user?.id, p.user?.username)}        } finally {        renderItem={({ item }) => {

                                style={styles.followBtn}

                            >            setLoading(false);          const img = (item.media||[]).find(m => (m.type||'').toLowerCase()==='image');

                                <Text style={[styles.followBtnText, userIsFollowed && styles.followingText]}>

                                    {userIsFollowed ? 'Đang theo dõi' : 'Theo dõi'}            setRefreshing(false);          const vid = (item.media||[]).find(m => (m.type||'').toLowerCase()==='video');

                                </Text>

                            </TouchableOpacity>            setLoadingMore(false);          return (

                        )}

                                }            <TouchableOpacity style={styles.gridTile} onPress={() => {

                        {ownPost && (

                            <TouchableOpacity onPress={() => openOptions(p.id)}>    };              if (vid) {

                                <Ionicons name="ellipsis-horizontal" size={24} color="#000" />

                            </TouchableOpacity>                const videoPosts = otherPosts.filter(pp => (pp.media||[]).some(mm => (mm.type||'').toLowerCase()==='video'));

                        )}

                    </View>    // Initial load                navigation.navigate('Video', { videos: videoPosts.length ? videoPosts : [item], selectedId: item.id });

                </View>

    useEffect(() => {              } else {

                {/* Caption */}

                {p.caption && (        if (targetUserId) {                setPost(item);

                    <Text style={styles.postCaption}>{p.caption}</Text>

                )}            loadUserPosts(1, false);              }



                {/* Media */}        }            }}>

                {isVideo && videos[0] ? (

                    <VideoThumbnail    }, [targetUserId]);              {img ? (<Image source={{ uri: img.url }} style={styles.gridImg} />) : vid ? (

                        videoUrl={videos[0].url}

                        style={styles.postMedia}                <View style={[styles.gridImg, {backgroundColor:'#000', alignItems:'center', justifyContent:'center'}]}>

                        onPress={() => openVideoPlayerFor(p)}

                    />    // Refresh                  <Ionicons name="play" size={24} color="#fff" />

                ) : images.length > 0 ? (

                    <PostImagesCarousel images={images} />    const onRefreshFeed = async () => {                </View>

                ) : null}

        await loadUserPosts(1, true);              ) : (

                {/* Actions */}

                <View style={styles.postActions}>    };                <View style={[styles.gridImg,{backgroundColor:'#f3f4f6'}]} />

                    <TouchableOpacity 

                        style={styles.actionBtn}              )}

                        onPress={() => onToggleLike(p.id)}

                    >    // Load more            </TouchableOpacity>

                        <Ionicons 

                            name={st.liked ? "heart" : "heart-outline"}     const loadMorePosts = async () => {          );

                            size={24} 

                            color={st.liked ? "#FF3B30" : "#000"}         if (loadingMore || !hasMorePosts || loading) return;        }}

                        />

                        <Text style={styles.actionText}>{st.likes}</Text>                ListHeaderComponent={<View />}

                    </TouchableOpacity>

        setLoadingMore(true);      />

                    <TouchableOpacity 

                        style={styles.actionBtn}        await loadUserPosts(currentPage + 1, false);

                        onPress={() => setActiveCommentsPostId(p.id)}

                    >    };      {/* Options overlay */}

                        <Ionicons name="chatbubble-outline" size={24} color="#000" />

                        <Text style={styles.actionText}>{st.comments}</Text>      {showOptions && (

                    </TouchableOpacity>

    // Toggle like        <TouchableOpacity activeOpacity={1} style={styles.overlay} onPress={() => setShowOptions(false)}>

                    <TouchableOpacity 

                        style={styles.actionBtn}    const onToggleLike = (postId) => {          <TouchableOpacity activeOpacity={0.95} style={styles.sheet} onPress={(e)=>e.stopPropagation()}>

                        onPress={() => onRepost(p.id)}

                    >        setPostStates(prev => {            <Text style={styles.sheetTitle}>Tùy chọn</Text>

                        <Ionicons name="arrow-redo-outline" size={24} color="#000" />

                        <Text style={styles.actionText}>{st.shares}</Text>            const curr = prev[postId] || { liked: false, likes: 0, shares: 0, comments: 0 };            {isOwner(post) ? (

                    </TouchableOpacity>

                </View>            const newLiked = !curr.liked;              <>

            </View>

        );            const newLikes = newLiked ? curr.likes + 1 : Math.max(0, curr.likes - 1);                <TouchableOpacity style={styles.sheetItem} onPress={() => setShowPrivacySheet(true)}>

    };

            return {                  <Text style={styles.sheetItemText}>Chỉnh sửa quyền riêng tư</Text>

    return (

        <SafeAreaView edges={['top']} style={styles.container}>                ...prev,                </TouchableOpacity>

            {/* Header */}

            <View style={styles.header}>                [postId]: { ...curr, liked: newLiked, likes: newLikes }                <TouchableOpacity style={styles.sheetItem} onPress={() => { setEditingCaption(true); setCaptionDraft(post?.caption || ''); }}>

                <TouchableOpacity onPress={() => navigation.goBack()}>

                    <Ionicons name="arrow-back" size={28} color="#000" />            };                  <Text style={styles.sheetItemText}>Chỉnh sửa bài đăng</Text>

                </TouchableOpacity>

                <Text style={styles.headerTitle}>Bài viết</Text>        });                </TouchableOpacity>

                <View style={{ width: 28 }} />

            </View>                <TouchableOpacity style={styles.sheetItem} onPress={async ()=>{ try { setBusy(true); await deletePost(post.id); setShowOptions(false); navigation.goBack(); } catch(e){ console.warn('Delete error', e); } finally { setBusy(false); } }}>



            {/* Posts List */}        // TODO: Call API to update like status                  <Text style={[styles.sheetItemText,{ color:'#dc2626' }]}>Xóa bài đăng</Text>

            <FlatList

                data={posts}        // await toggleLike(postId);                </TouchableOpacity>

                renderItem={renderPost}

                keyExtractor={(item) => `post-${item.id}`}    };              </>

                refreshControl={

                    <RefreshControl refreshing={refreshing} onRefresh={onRefreshFeed} />            ) : (

                }

                onEndReached={loadMorePosts}    // Share              <>

                onEndReachedThreshold={0.5}

                ListEmptyComponent={    const onRepost = (postId) => {                <TouchableOpacity style={styles.sheetItem} onPress={() => setShowOptions(false)}>

                    !loading && (

                        <View style={styles.emptyContainer}>        setPostStates(prev => {                  <Text style={styles.sheetItemText}>Báo cáo</Text>

                            <Text style={styles.emptyText}>Chưa có bài đăng nào</Text>

                        </View>            const curr = prev[postId] || { liked: false, likes: 0, shares: 0, comments: 0 };                </TouchableOpacity>

                    )

                }            return {                <TouchableOpacity style={styles.sheetItem} onPress={() => setShowOptions(false)}>

            />

                ...prev,                  <Text style={styles.sheetItemText}>Ẩn bài đăng</Text>

            {/* Comments Modal */}

            {activeCommentsPostId && (                [postId]: { ...curr, shares: curr.shares + 1 }                </TouchableOpacity>

                <CommentsModal

                    postId={activeCommentsPostId}            };              </>

                    visible={true}

                    onClose={() => setActiveCommentsPostId(null)}        });            )}

                />

            )}          </TouchableOpacity>



            {/* Options Modal */}        const post = posts.find(p => p.id === postId);        </TouchableOpacity>

            <Modal visible={optionsPostId !== null} transparent animationType="slide">

                <TouchableOpacity         if (post) {      )}

                    style={styles.modalOverlay} 

                    activeOpacity={1}             Share.share({

                    onPress={closeOptions}

                >                message: `Check out this post: ${post.caption || ''}`,      {showOptions && showPrivacySheet && (

                    <View style={styles.optionsSheet}>

                        <TouchableOpacity             });        <TouchableOpacity activeOpacity={1} style={styles.overlay} onPress={() => { setShowPrivacySheet(false); }}>

                            style={styles.optionItem}

                            onPress={() => {        }          <TouchableOpacity activeOpacity={0.95} style={styles.sheet} onPress={(e)=>e.stopPropagation()}>

                                setShowPrivacySheet(true);

                                setOptionsPostId(null);    };            <Text style={styles.sheetTitle}>Chọn quyền riêng tư</Text>

                            }}

                        >            {[{k:'public',label:'Public'},{k:'followers',label:'Followers'},{k:'private',label:'Private'}].map(opt => (

                            <Ionicons name="lock-closed-outline" size={24} color="#000" />

                            <Text style={styles.optionText}>Chỉnh sửa quyền riêng tư</Text>    // Follow/Unfollow              <TouchableOpacity key={opt.k} style={styles.sheetItem} onPress={() => pickPrivacy(opt.k)}>

                        </TouchableOpacity>

    const handleFollowToggle = async (userId, username) => {                <Text style={styles.sheetItemText}>{opt.label}</Text>

                        <TouchableOpacity 

                            style={styles.optionItem}        try {              </TouchableOpacity>

                            onPress={() => handleEditCaption(optionsPostId)}

                        >            const followed = isFollowed(userId);            ))}

                            <Ionicons name="create-outline" size={24} color="#000" />

                            <Text style={styles.optionText}>Chỉnh sửa caption</Text>            if (followed) {          </TouchableOpacity>

                        </TouchableOpacity>

                await unfollowUser(userId);        </TouchableOpacity>

                        <TouchableOpacity 

                            style={[styles.optionItem, styles.deleteOption]}                markAsUnfollowed(userId);      )}

                            onPress={() => handleDeletePost(optionsPostId)}

                        >            } else {

                            <Ionicons name="trash-outline" size={24} color="#FF3B30" />

                            <Text style={[styles.optionText, styles.deleteText]}>Xóa bài đăng</Text>                await followUser(userId);      {busy && (

                        </TouchableOpacity>

                markAsFollowed(userId, username || 'user');        <View style={styles.busyOverlay}><View style={styles.spinner} /></View>

                        <TouchableOpacity style={styles.cancelBtn} onPress={closeOptions}>

                            <Text style={styles.cancelText}>Hủy</Text>            }      )}

                        </TouchableOpacity>

                    </View>        } catch (e) {    </SafeAreaView>

                </TouchableOpacity>

            </Modal>            console.warn('Follow error:', e);  );



            {/* Privacy Sheet */}            Alert.alert('Lỗi', e.message || 'Không thể theo dõi người dùng');}

            <Modal visible={showPrivacySheet} transparent animationType="slide">

                <TouchableOpacity         }

                    style={styles.modalOverlay} 

                    activeOpacity={1}     };const styles = StyleSheet.create({

                    onPress={() => setShowPrivacySheet(false)}

                >  container: { flex: 1, backgroundColor:'#fff' },

                    <View style={styles.optionsSheet}>

                        <Text style={styles.sheetTitle}>Chọn quyền riêng tư</Text>    // Open video player  header: { flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor:'#e5e7eb' },

                        

                        <TouchableOpacity     const openVideoPlayerFor = (post) => {  title: { fontSize: 18, fontWeight:'700', color:'#111827' },

                            style={styles.optionItem}

                            onPress={() => pickPrivacy('public')}        const videos = posts.filter(pp => (pp.media||[]).some(m => (m.type||'').toLowerCase()==='video'));  post: { marginBottom: 8 },

                        >

                            <Ionicons name="globe-outline" size={24} color="#000" />        navigation.navigate('Video', {   postHeader: { flexDirection:'row', justifyContent:'space-between', alignItems:'center', paddingHorizontal: 12, paddingVertical: 10 },

                            <Text style={styles.optionText}>Công khai</Text>

                        </TouchableOpacity>            selectedId: post.id,  postHeaderLeft: { flexDirection:'row', alignItems:'center', gap: 10 },



                        <TouchableOpacity             userId: post.user?.id,  postAvatar: { width: 32, height: 32, borderRadius: 16 },

                            style={styles.optionItem}

                            onPress={() => pickPrivacy('friends')}            username: post.user?.username   postUsername: { fontSize: 13, fontWeight:'600', color:'#262626' },

                        >

                            <Ionicons name="people-outline" size={24} color="#000" />        });  postLocation: { fontSize: 11, color:'#262626' },

                            <Text style={styles.optionText}>Bạn bè</Text>

                        </TouchableOpacity>    };  privacyPill: { flexDirection:'row', alignItems:'center', gap:4, paddingHorizontal:6, paddingVertical:2, borderRadius:8, backgroundColor:'#F3F4F6' },



                        <TouchableOpacity   privacyText: { color:'#374151', fontSize:11, textTransform:'capitalize' },

                            style={styles.optionItem}

                            onPress={() => pickPrivacy('private')}    // Options menu  moreIcon: { fontSize:24, fontWeight:'700', color:'#262626' },

                        >

                            <Ionicons name="lock-closed-outline" size={24} color="#000" />    const openOptions = (postId) => {  postImageContainer: { position:'relative' },

                            <Text style={styles.optionText}>Chỉ mình tôi</Text>

                        </TouchableOpacity>        setOptionsPostId(postId);  postImage: { width: '100%', height: 400, backgroundColor:'#F0F0F0' },



                        <TouchableOpacity     };  postStats: { paddingHorizontal: 12, paddingVertical: 8 },

                            style={styles.cancelBtn} 

                            onPress={() => setShowPrivacySheet(false)}  captionText: { fontSize: 14, color:'#111827', lineHeight:20 },

                        >

                            <Text style={styles.cancelText}>Hủy</Text>    const closeOptions = () => {  gridTile: { width: width/3 - 2, height: width/3 - 2, margin: 1 },

                        </TouchableOpacity>

                    </View>        setOptionsPostId(null);  gridImg: { width: '100%', height: '100%' },

                </TouchableOpacity>

            </Modal>        setShowPrivacySheet(false);  overlay: { position:'absolute', top:0, left:0, right:0, bottom:0, backgroundColor:'rgba(0,0,0,0.4)', justifyContent:'flex-end' },



            {/* Edit Caption Modal */}        setEditingCaptionPostId(null);  sheet: { backgroundColor:'#fff', padding:16, borderTopLeftRadius:16, borderTopRightRadius:16 },

            <Modal visible={editingCaptionPostId !== null} transparent animationType="slide">

                <KeyboardAvoidingView         setCaptionDraft('');  sheetTitle: { fontSize:16, fontWeight:'700', marginBottom:8 },

                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}

                    style={styles.modalOverlay}    };  sheetItem: { paddingVertical:12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor:'#e5e7eb' },

                >

                    <TouchableOpacity   sheetItemText: { fontSize:16, color:'#111827' },

                        style={styles.modalOverlay} 

                        activeOpacity={1}     const pickPrivacy = async (privacyKey) => {  primaryBtn: { backgroundColor:'#111827', paddingHorizontal:16, paddingVertical:10, borderRadius:8 },

                        onPress={() => setEditingCaptionPostId(null)}

                    >        try {  primaryBtnText: { color:'#fff', fontWeight:'600' },

                        <View style={styles.editSheet}>

                            <Text style={styles.sheetTitle}>Chỉnh sửa caption</Text>            const post = posts.find(p => p.id === optionsPostId);  secondaryBtn: { backgroundColor:'#f3f4f6', paddingHorizontal:16, paddingVertical:10, borderRadius:8 },

                            

                            <TextInput            if (!post) return;  secondaryBtnText: { color:'#111827', fontWeight:'600' },

                                style={styles.captionInput}

                                value={captionDraft}            setBusy(true);  busyOverlay: { position:'absolute', top:0, left:0, right:0, bottom:0, backgroundColor:'rgba(255,255,255,0.5)', justifyContent:'center', alignItems:'center' },

                                onChangeText={setCaptionDraft}

                                placeholder="Nhập caption mới..."            await updatePostPrivacy(post.id, privacyKey);  spinner: { width:40, height:40, borderRadius:20, borderWidth:4, borderColor:'#111827', borderTopColor:'transparent' },

                                multiline

                                autoFocus            setPosts(prev => prev.map(p => p.id === post.id ? { ...p, privacy: privacyKey } : p));});

                            />

            setShowPrivacySheet(false);

                            <View style={styles.editActions}>            closeOptions();

                                <TouchableOpacity         } catch (e) {

                                    style={styles.editCancelBtn}            console.warn('Update privacy error', e);

                                    onPress={() => setEditingCaptionPostId(null)}        } finally {

                                >            setBusy(false);

                                    <Text style={styles.editCancelText}>Hủy</Text>        }

                                </TouchableOpacity>    };



                                <TouchableOpacity     const handleEditCaption = (postId) => {

                                    style={styles.editSaveBtn}        const post = posts.find(p => p.id === postId);

                                    onPress={submitCaptionEdit}        if (post) {

                                    disabled={busy}            setCaptionDraft(post.caption || '');

                                >            setEditingCaptionPostId(postId);

                                    <Text style={styles.editSaveText}>            setOptionsPostId(null);

                                        {busy ? 'Đang lưu...' : 'Lưu'}        }

                                    </Text>    };

                                </TouchableOpacity>

                            </View>    const submitCaptionEdit = async () => {

                        </View>        if (!editingCaptionPostId) return;

                    </TouchableOpacity>        try {

                </KeyboardAvoidingView>            setBusy(true);

            </Modal>            await updatePostCaption(editingCaptionPostId, captionDraft);

        </SafeAreaView>            setPosts(prev => prev.map(p => p.id === editingCaptionPostId ? { ...p, caption: captionDraft } : p));

    );            setEditingCaptionPostId(null);

}            setCaptionDraft('');

        } catch (e) {

const styles = StyleSheet.create({            console.warn('Update caption error', e);

    container: {        } finally {

        flex: 1,            setBusy(false);

        backgroundColor: '#fff',        }

    },    };

    header: {

        flexDirection: 'row',    const handleDeletePost = async (postId) => {

        alignItems: 'center',        Alert.alert(

        justifyContent: 'space-between',            'Xác nhận xóa',

        paddingHorizontal: 16,            'Bạn có chắc chắn muốn xóa bài đăng này?',

        paddingVertical: 12,            [

        borderBottomWidth: 1,                { text: 'Hủy', style: 'cancel' },

        borderBottomColor: '#e0e0e0',                {

    },                    text: 'Xóa',

    headerTitle: {                    style: 'destructive',

        fontSize: 18,                    onPress: async () => {

        fontWeight: '600',                        try {

        color: '#000',                            setBusy(true);

    },                            await deletePost(postId);

    postCard: {                            setPosts(prev => prev.filter(p => p.id !== postId));

        backgroundColor: '#fff',                            closeOptions();

        marginBottom: 12,                        } catch (e) {

        paddingBottom: 12,                            console.warn('Delete post error', e);

        borderBottomWidth: 1,                        } finally {

        borderBottomColor: '#e0e0e0',                            setBusy(false);

    },                        }

    postHeader: {                    }

        flexDirection: 'row',                }

        alignItems: 'center',            ]

        justifyContent: 'space-between',        );

        paddingHorizontal: 16,    };

        paddingVertical: 12,

    },    // Render post item

    userInfo: {    const renderPost = ({ item: p }) => {

        flexDirection: 'row',        const images = (p.media || []).filter(m => (m.type||'').toLowerCase() === 'image');

        alignItems: 'center',        const videos = (p.media || []).filter(m => (m.type||'').toLowerCase() === 'video');

        flex: 1,        const isVideo = videos.length > 0;

    },        const st = postStates[p.id] || { liked: false, likes: 0, shares: 0, comments: 0 };

    avatar: {        const userIsFollowed = p.user?.id ? isFollowed(p.user.id) : false;

        width: 40,        const ownPost = isOwnPost(p);

        height: 40,

        borderRadius: 20,        return (

        marginRight: 12,            <View style={styles.postCard}>

    },                {/* Header */}

    userDetails: {                <View style={styles.postHeader}>

        flex: 1,                    <TouchableOpacity 

    },                        style={styles.userInfo}

    userName: {                        onPress={() => {

        fontSize: 15,                            if (p.user?.id) {

        fontWeight: '600',                                if (ownPost) {

        color: '#000',                                    navigation.navigate('Profile');

    },                                } else {

    postTime: {                                    navigation.navigate('UserProfilePublic', { userId: p.user.id });

        fontSize: 12,                                }

        color: '#666',                            }

        marginTop: 2,                        }}

    },                    >

    headerActions: {                        <Image 

        flexDirection: 'row',                            source={{ uri: p.user?.avatarUrl || 'https://via.placeholder.com/40' }} 

        alignItems: 'center',                            style={styles.avatar} 

        gap: 12,                        />

    },                        <View style={styles.userDetails}>

    followBtn: {                            <Text style={styles.userName}>{p.user?.username || 'Unknown'}</Text>

        paddingHorizontal: 12,                            <Text style={styles.postTime}>{p.createdAt || 'Recently'}</Text>

        paddingVertical: 6,                        </View>

        borderRadius: 6,                    </TouchableOpacity>

        backgroundColor: '#007AFF',

    },                    <View style={styles.headerActions}>

    followBtnText: {                        {!ownPost && (

        fontSize: 13,                            <TouchableOpacity 

        fontWeight: '600',                                onPress={() => handleFollowToggle(p.user?.id, p.user?.username)}

        color: '#fff',                                style={styles.followBtn}

    },                            >

    followingText: {                                <Text style={[styles.followBtnText, userIsFollowed && styles.followingText]}>

        color: '#000',                                    {userIsFollowed ? 'Đang theo dõi' : 'Theo dõi'}

    },                                </Text>

    postCaption: {                            </TouchableOpacity>

        fontSize: 14,                        )}

        color: '#000',                        

        paddingHorizontal: 16,                        {ownPost && (

        marginBottom: 12,                            <TouchableOpacity onPress={() => openOptions(p.id)}>

        lineHeight: 20,                                <Ionicons name="ellipsis-horizontal" size={24} color="#000" />

    },                            </TouchableOpacity>

    carouselContainer: {                        )}

        width: '100%',                    </View>

        height: width,                </View>

        position: 'relative',

    },                {/* Caption */}

    carouselImage: {                {p.caption && (

        width: width,                    <Text style={styles.postCaption}>{p.caption}</Text>

        height: width,                )}

        resizeMode: 'cover',

    },                {/* Media */}

    paginationDots: {                {isVideo && videos[0] ? (

        position: 'absolute',                    <VideoThumbnail

        bottom: 12,                        videoUrl={videos[0].url}

        alignSelf: 'center',                        style={styles.postMedia}

        flexDirection: 'row',                        onPress={() => openVideoPlayerFor(p)}

        gap: 6,                    />

    },                ) : images.length > 0 ? (

    dot: {                    <PostImagesCarousel images={images} />

        width: 6,                ) : null}

        height: 6,

        borderRadius: 3,                {/* Actions */}

        backgroundColor: 'rgba(255,255,255,0.5)',                <View style={styles.postActions}>

    },                    <TouchableOpacity 

    activeDot: {                        style={styles.actionBtn}

        backgroundColor: '#fff',                        onPress={() => onToggleLike(p.id)}

        width: 20,                    >

    },                        <Ionicons 

    postMedia: {                            name={st.liked ? "heart" : "heart-outline"} 

        width: '100%',                            size={24} 

        height: width,                            color={st.liked ? "#FF3B30" : "#000"} 

        backgroundColor: '#000',                        />

    },                        <Text style={styles.actionText}>{st.likes}</Text>

    playOverlay: {                    </TouchableOpacity>

        ...StyleSheet.absoluteFillObject,

        justifyContent: 'center',                    <TouchableOpacity 

        alignItems: 'center',                        style={styles.actionBtn}

        backgroundColor: 'rgba(0,0,0,0.3)',                        onPress={() => setActiveCommentsPostId(p.id)}

    },                    >

    postActions: {                        <Ionicons name="chatbubble-outline" size={24} color="#000" />

        flexDirection: 'row',                        <Text style={styles.actionText}>{st.comments}</Text>

        alignItems: 'center',                    </TouchableOpacity>

        paddingHorizontal: 16,

        paddingTop: 12,                    <TouchableOpacity 

        gap: 24,                        style={styles.actionBtn}

    },                        onPress={() => onRepost(p.id)}

    actionBtn: {                    >

        flexDirection: 'row',                        <Ionicons name="arrow-redo-outline" size={24} color="#000" />

        alignItems: 'center',                        <Text style={styles.actionText}>{st.shares}</Text>

        gap: 6,                    </TouchableOpacity>

    },                </View>

    actionText: {            </View>

        fontSize: 14,        );

        color: '#000',    };

        fontWeight: '500',

    },    return (

    emptyContainer: {        <SafeAreaView edges={['top']} style={styles.container}>

        flex: 1,            {/* Header */}

        alignItems: 'center',            <View style={styles.header}>

        justifyContent: 'center',                <TouchableOpacity onPress={() => navigation.goBack()}>

        paddingVertical: 40,                    <Ionicons name="arrow-back" size={28} color="#000" />

    },                </TouchableOpacity>

    emptyText: {                <Text style={styles.headerTitle}>Bài viết</Text>

        fontSize: 16,                <View style={{ width: 28 }} />

        color: '#666',            </View>

    },

    modalOverlay: {            {/* Posts List */}

        flex: 1,            <FlatList

        backgroundColor: 'rgba(0,0,0,0.5)',                data={posts}

        justifyContent: 'flex-end',                renderItem={renderPost}

    },                keyExtractor={(item) => `post-${item.id}`}

    optionsSheet: {                refreshControl={

        backgroundColor: '#fff',                    <RefreshControl refreshing={refreshing} onRefresh={onRefreshFeed} />

        borderTopLeftRadius: 20,                }

        borderTopRightRadius: 20,                onEndReached={loadMorePosts}

        paddingTop: 12,                onEndReachedThreshold={0.5}

        paddingBottom: Platform.OS === 'ios' ? 34 : 12,                ListEmptyComponent={

    },                    !loading && (

    sheetTitle: {                        <View style={styles.emptyContainer}>

        fontSize: 16,                            <Text style={styles.emptyText}>Chưa có bài đăng nào</Text>

        fontWeight: '600',                        </View>

        color: '#000',                    )

        textAlign: 'center',                }

        paddingVertical: 12,            />

        borderBottomWidth: 1,

        borderBottomColor: '#e0e0e0',            {/* Comments Modal */}

    },            {activeCommentsPostId && (

    optionItem: {                <CommentsModal

        flexDirection: 'row',                    postId={activeCommentsPostId}

        alignItems: 'center',                    visible={true}

        paddingHorizontal: 20,                    onClose={() => setActiveCommentsPostId(null)}

        paddingVertical: 16,                />

        gap: 12,            )}

    },

    optionText: {            {/* Options Modal */}

        fontSize: 16,            <Modal visible={optionsPostId !== null} transparent animationType="slide">

        color: '#000',                <TouchableOpacity 

    },                    style={styles.modalOverlay} 

    deleteOption: {                    activeOpacity={1} 

        borderTopWidth: 1,                    onPress={closeOptions}

        borderTopColor: '#e0e0e0',                >

    },                    <View style={styles.optionsSheet}>

    deleteText: {                        <TouchableOpacity 

        color: '#FF3B30',                            style={styles.optionItem}

    },                            onPress={() => {

    cancelBtn: {                                setShowPrivacySheet(true);

        paddingVertical: 16,                                setOptionsPostId(null);

        borderTopWidth: 1,                            }}

        borderTopColor: '#e0e0e0',                        >

        marginTop: 8,                            <Ionicons name="lock-closed-outline" size={24} color="#000" />

    },                            <Text style={styles.optionText}>Chỉnh sửa quyền riêng tư</Text>

    cancelText: {                        </TouchableOpacity>

        fontSize: 16,

        fontWeight: '600',                        <TouchableOpacity 

        color: '#007AFF',                            style={styles.optionItem}

        textAlign: 'center',                            onPress={() => handleEditCaption(optionsPostId)}

    },                        >

    editSheet: {                            <Ionicons name="create-outline" size={24} color="#000" />

        backgroundColor: '#fff',                            <Text style={styles.optionText}>Chỉnh sửa caption</Text>

        borderTopLeftRadius: 20,                        </TouchableOpacity>

        borderTopRightRadius: 20,

        paddingTop: 12,                        <TouchableOpacity 

        paddingBottom: Platform.OS === 'ios' ? 34 : 12,                            style={[styles.optionItem, styles.deleteOption]}

        paddingHorizontal: 16,                            onPress={() => handleDeletePost(optionsPostId)}

    },                        >

    captionInput: {                            <Ionicons name="trash-outline" size={24} color="#FF3B30" />

        borderWidth: 1,                            <Text style={[styles.optionText, styles.deleteText]}>Xóa bài đăng</Text>

        borderColor: '#e0e0e0',                        </TouchableOpacity>

        borderRadius: 8,

        padding: 12,                        <TouchableOpacity style={styles.cancelBtn} onPress={closeOptions}>

        fontSize: 15,                            <Text style={styles.cancelText}>Hủy</Text>

        minHeight: 100,                        </TouchableOpacity>

        marginVertical: 16,                    </View>

        textAlignVertical: 'top',                </TouchableOpacity>

    },            </Modal>

    editActions: {

        flexDirection: 'row',            {/* Privacy Sheet */}

        gap: 12,            <Modal visible={showPrivacySheet} transparent animationType="slide">

    },                <TouchableOpacity 

    editCancelBtn: {                    style={styles.modalOverlay} 

        flex: 1,                    activeOpacity={1} 

        paddingVertical: 12,                    onPress={() => setShowPrivacySheet(false)}

        borderRadius: 8,                >

        borderWidth: 1,                    <View style={styles.optionsSheet}>

        borderColor: '#e0e0e0',                        <Text style={styles.sheetTitle}>Chọn quyền riêng tư</Text>

    },                        

    editCancelText: {                        <TouchableOpacity 

        fontSize: 16,                            style={styles.optionItem}

        fontWeight: '600',                            onPress={() => pickPrivacy('public')}

        color: '#000',                        >

        textAlign: 'center',                            <Ionicons name="globe-outline" size={24} color="#000" />

    },                            <Text style={styles.optionText}>Công khai</Text>

    editSaveBtn: {                        </TouchableOpacity>

        flex: 1,

        paddingVertical: 12,                        <TouchableOpacity 

        borderRadius: 8,                            style={styles.optionItem}

        backgroundColor: '#007AFF',                            onPress={() => pickPrivacy('friends')}

    },                        >

    editSaveText: {                            <Ionicons name="people-outline" size={24} color="#000" />

        fontSize: 16,                            <Text style={styles.optionText}>Bạn bè</Text>

        fontWeight: '600',                        </TouchableOpacity>

        color: '#fff',

        textAlign: 'center',                        <TouchableOpacity 

    },                            style={styles.optionItem}

});                            onPress={() => pickPrivacy('private')}

                        >
                            <Ionicons name="lock-closed-outline" size={24} color="#000" />
                            <Text style={styles.optionText}>Chỉ mình tôi</Text>
                        </TouchableOpacity>

                        <TouchableOpacity 
                            style={styles.cancelBtn} 
                            onPress={() => setShowPrivacySheet(false)}
                        >
                            <Text style={styles.cancelText}>Hủy</Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>

            {/* Edit Caption Modal */}
            <Modal visible={editingCaptionPostId !== null} transparent animationType="slide">
                <KeyboardAvoidingView 
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.modalOverlay}
                >
                    <TouchableOpacity 
                        style={styles.modalOverlay} 
                        activeOpacity={1} 
                        onPress={() => setEditingCaptionPostId(null)}
                    >
                        <View style={styles.editSheet}>
                            <Text style={styles.sheetTitle}>Chỉnh sửa caption</Text>
                            
                            <TextInput
                                style={styles.captionInput}
                                value={captionDraft}
                                onChangeText={setCaptionDraft}
                                placeholder="Nhập caption mới..."
                                multiline
                                autoFocus
                            />

                            <View style={styles.editActions}>
                                <TouchableOpacity 
                                    style={styles.editCancelBtn}
                                    onPress={() => setEditingCaptionPostId(null)}
                                >
                                    <Text style={styles.editCancelText}>Hủy</Text>
                                </TouchableOpacity>

                                <TouchableOpacity 
                                    style={styles.editSaveBtn}
                                    onPress={submitCaptionEdit}
                                    disabled={busy}
                                >
                                    <Text style={styles.editSaveText}>
                                        {busy ? 'Đang lưu...' : 'Lưu'}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </TouchableOpacity>
                </KeyboardAvoidingView>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#000',
    },
    postCard: {
        backgroundColor: '#fff',
        marginBottom: 12,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
    },
    postHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    userInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginRight: 12,
    },
    userDetails: {
        flex: 1,
    },
    userName: {
        fontSize: 15,
        fontWeight: '600',
        color: '#000',
    },
    postTime: {
        fontSize: 12,
        color: '#666',
        marginTop: 2,
    },
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    followBtn: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 6,
        backgroundColor: '#007AFF',
    },
    followBtnText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#fff',
    },
    followingText: {
        color: '#000',
    },
    postCaption: {
        fontSize: 14,
        color: '#000',
        paddingHorizontal: 16,
        marginBottom: 12,
        lineHeight: 20,
    },
    carouselContainer: {
        width: '100%',
        height: width,
        position: 'relative',
    },
    carouselImage: {
        width: width,
        height: width,
        resizeMode: 'cover',
    },
    paginationDots: {
        position: 'absolute',
        bottom: 12,
        alignSelf: 'center',
        flexDirection: 'row',
        gap: 6,
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: 'rgba(255,255,255,0.5)',
    },
    activeDot: {
        backgroundColor: '#fff',
        width: 20,
    },
    postMedia: {
        width: '100%',
        height: width,
        backgroundColor: '#000',
    },
    playOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.3)',
    },
    postActions: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: 12,
        gap: 24,
    },
    actionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    actionText: {
        fontSize: 14,
        color: '#000',
        fontWeight: '500',
    },
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 40,
    },
    emptyText: {
        fontSize: 16,
        color: '#666',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    optionsSheet: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingTop: 12,
        paddingBottom: Platform.OS === 'ios' ? 34 : 12,
    },
    sheetTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#000',
        textAlign: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
    },
    optionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
        gap: 12,
    },
    optionText: {
        fontSize: 16,
        color: '#000',
    },
    deleteOption: {
        borderTopWidth: 1,
        borderTopColor: '#e0e0e0',
    },
    deleteText: {
        color: '#FF3B30',
    },
    cancelBtn: {
        paddingVertical: 16,
        borderTopWidth: 1,
        borderTopColor: '#e0e0e0',
        marginTop: 8,
    },
    cancelText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#007AFF',
        textAlign: 'center',
    },
    editSheet: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingTop: 12,
        paddingBottom: Platform.OS === 'ios' ? 34 : 12,
        paddingHorizontal: 16,
    },
    captionInput: {
        borderWidth: 1,
        borderColor: '#e0e0e0',
        borderRadius: 8,
        padding: 12,
        fontSize: 15,
        minHeight: 100,
        marginVertical: 16,
        textAlignVertical: 'top',
    },
    editActions: {
        flexDirection: 'row',
        gap: 12,
    },
    editCancelBtn: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#e0e0e0',
    },
    editCancelText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#000',
        textAlign: 'center',
    },
    editSaveBtn: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 8,
        backgroundColor: '#007AFF',
    },
    editSaveText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff',
        textAlign: 'center',
    },
});
