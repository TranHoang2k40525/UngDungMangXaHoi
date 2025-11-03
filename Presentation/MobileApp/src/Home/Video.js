import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  FlatList,
  RefreshControl,
  Image,
  TextInput,
  Platform,
  KeyboardAvoidingView,
  Modal,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { getReels, getFollowingReels, updatePostPrivacy, updatePostCaption, deletePost, getAuthHeaders, followUser, unfollowUser } from '../API/Api';
import { useIsFocused, useNavigation, useRoute } from '@react-navigation/native';
import { VideoView, useVideoPlayer } from 'expo-video';
import { Audio } from 'expo-av';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useUser } from '../Context/UserContext';
import { useFollow } from '../Context/FollowContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Component wrapper cho mỗi video item để dùng useVideoPlayer hook
const ReelVideoPlayer = React.memo(({ 
  videoUri, 
  authHeaders, 
  height, 
  isActive, 
  isFocused,
  onError,
  onPlaybackStatusUpdate,
  onTogglePlayPause,
  index
}) => {
  const player = useVideoPlayer(videoUri, (player) => {
    // Configure player
    player.loop = true;
    player.muted = false;
  });

  // Control play/pause based on active state
  useEffect(() => {
    if (!player) return;
    
    try {
      if (isActive && isFocused) {
        player.play();
      } else {
        player.pause();
      }
    } catch (error) {
      // Ignore errors from already released players
      console.log('[ReelVideoPlayer] Play/pause error (ignored):', error.message);
    }
  }, [isActive, isFocused, player]);

  return (
    <VideoView
      player={player}
      style={StyleSheet.absoluteFillObject}
      contentFit="contain"
      nativeControls={false}
      onError={onError}
    />
  );
});

export default function Reels() {
  const insets = useSafeAreaInsets();
  const route = useRoute();
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  const { markAsFollowed, markAsUnfollowed, isFollowed } = useFollow();
  
  // Tab state: 'reels' or 'following'
  const [activeTab, setActiveTab] = useState('reels');
  
  const [reels, setReels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const listRef = useRef(null);
  const [refreshing, setRefreshing] = useState(false);
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMoreReels, setHasMoreReels] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const selectedIdRef = useRef(null);
  const [headerHeight, setHeaderHeight] = useState(100); // Tăng height để chứa tabs
  const [showOptions, setShowOptions] = useState(false);
  const [showPrivacySheet, setShowPrivacySheet] = useState(false);
  const [editingCaption, setEditingCaption] = useState(false);
  const [captionDraft, setCaptionDraft] = useState('');
  const [busy, setBusy] = useState(false);
  // tap gesture helpers
  const tapTimerRef = useRef(null);
  const tapTimesRef = useRef([]);
  const [showBigHeart, setShowBigHeart] = useState(false);
  const [captionLinesShown, setCaptionLinesShown] = useState({}); // {index: number}
  const [captionTotalLines, setCaptionTotalLines] = useState({}); // {index: number}
  const tabBarHeight = useBottomTabBarHeight?.() || 56;
  const [viewportHeight, setViewportHeight] = useState(0); // chiều cao thực vùng cuộn giữa header và tab bar
  const WATCHED_KEY = 'watchedVideoIds';
  const REELS_CACHE_KEY = 'reelsCache_v1';
  const [authHeaders, setAuthHeaders] = useState(null);
  // Retry map for resilient playback after upload: { [postId]: { count: number, token: number } }
  const [retryMap, setRetryMap] = useState({});
  const retryTimersRef = useRef({}); // { [postId]: timeoutId }
  // Fallback source index per post: { [postId]: number }
  const [sourceIndexMap, setSourceIndexMap] = useState({});
  
  // Không giới hạn số lượng video - tải tất cả để đảm bảo chất lượng trải nghiệm

  // Build Cloudinary-safe fallback variants when possible
  const isCloudinaryUrl = useCallback((u) => {
    try { const x = new URL(u); return (x.hostname || '').includes('res.cloudinary.com'); } catch { return false; }
  }, []);

  const cloudinaryTransform = useCallback((u, transform, newExt) => {
    try {
      const x = new URL(u);
      const parts = x.pathname.split('/').filter(Boolean);
      const idxUpload = parts.findIndex(p => p === 'upload');
      if (idxUpload < 0) return null;
      const before = parts.slice(0, idxUpload + 1); // includes 'upload'
      const after = parts.slice(idxUpload + 1);
      if (!after.length) return null;
      const newParts = [...before, transform, ...after];
      // replace extension of last segment
      const lastIdx = newParts.length - 1;
      const last = newParts[lastIdx];
      const base = last.replace(/\.[^./]+$/, '');
      newParts[lastIdx] = `${base}.${newExt}`;
      const newPath = '/' + newParts.join('/');
      return `${x.origin}${newPath}`;
    } catch { return null; }
  }, []);

  const buildCandidates = useCallback((baseUrl) => {
    const arr = [baseUrl];
    if (baseUrl && isCloudinaryUrl(baseUrl)) {
      const v1 = cloudinaryTransform(baseUrl, 'q_auto:good,vc_h264:baseline:3.1,fps_30,w_720', 'mp4');
      const v2 = cloudinaryTransform(baseUrl, 'q_auto:eco,vc_h264:baseline:3.1,fps_30,w_540', 'mp4');
      const hls = cloudinaryTransform(baseUrl, 'q_auto:good,vc_h264:baseline:3.1,fps_30,w_720', 'm3u8');
      [v1, v2, hls].forEach(v => { if (v && !arr.includes(v)) arr.push(v); });
    }
    return arr;
  }, [isCloudinaryUrl, cloudinaryTransform]);

  // Load auth headers once (for protected video URLs)
  useEffect(() => {
    (async () => {
      try { const h = await getAuthHeaders(); setAuthHeaders(h || null); } catch {}
    })();
  }, []);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      try {
        Object.values(retryTimersRef.current || {}).forEach((t) => { try { clearTimeout(t); } catch {} });
        retryTimersRef.current = {};
      } catch {}
    };
  }, []);

  const scheduleRetry = useCallback((postId, index) => {
    if (postId == null) return;
    setRetryMap((prev) => {
      const current = prev[postId] || { count: 0, token: 0 };
      if (current.count >= 4) return prev; // max 4 retries
      const delay = Math.min(2000, 400 * Math.pow(2, current.count));
      try { if (retryTimersRef.current[postId]) clearTimeout(retryTimersRef.current[postId]); } catch {}
      retryTimersRef.current[postId] = setTimeout(async () => {
        // expo-video doesn't need manual unload; just bump retry token to force re-render
        setRetryMap((prev2) => {
          const cur2 = prev2[postId] || { count: 0, token: 0 };
          const next = { count: cur2.count + 1, token: (cur2.token || 0) + 1 };
          return { ...prev2, [postId]: next };
        });
      }, delay);
      return { ...prev, [postId]: { count: current.count, token: current.token } };
    });
  }, []);

  const clearRetry = useCallback((postId) => {
    if (postId == null) return;
    try { if (retryTimersRef.current[postId]) clearTimeout(retryTimersRef.current[postId]); } catch {}
    setRetryMap((prev) => {
      if (!(postId in prev)) return prev;
      const { [postId]: _omit, ...rest } = prev;
      return rest;
    });
  }, []);

  const bumpRetryTokenNow = useCallback((postId) => {
    if (postId == null) return;
    setRetryMap((prev) => {
      const cur = prev[postId] || { count: 0, token: 0 };
      return { ...prev, [postId]: { count: cur.count, token: (cur.token || 0) + 1 } };
    });
  }, []);

  const getWatchedSet = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(WATCHED_KEY);
      const arr = raw ? JSON.parse(raw) : [];
      return new Set(Array.isArray(arr) ? arr : []);
    } catch { return new Set(); }
  }, []);

  const markWatched = useCallback(async (postId) => {
    try {
      if (!postId) return;
      const set = await getWatchedSet();
      if (!set.has(postId)) {
        set.add(postId);
        await AsyncStorage.setItem(WATCHED_KEY, JSON.stringify(Array.from(set)));
      }
    } catch {}
  }, [getWatchedSet]);

  const reorderVideos = useCallback(async (selectedId, list) => {
    const watched = await getWatchedSet();
    const arr = Array.isArray(list) ? list.slice() : [];
    // unique by id
    const map = new Map();
    for (const p of arr) { if (p?.id != null && !map.has(p.id)) map.set(p.id, p); }
    const uniq = Array.from(map.values());
    const selected = selectedId != null ? uniq.find(p => p.id === selectedId) : null;
    const rest = uniq.filter(p => !selected || p.id !== selected.id);
    // sort: unseen first, then newest
    rest.sort((a,b) => {
      const aw = watched.has(a.id) ? 1 : 0; const bw = watched.has(b.id) ? 1 : 0;
      if (aw !== bw) return aw - bw; // unseen (0) comes before seen (1)
      const ad = new Date(a.createdAt || 0).getTime();
      const bd = new Date(b.createdAt || 0).getTime();
      return bd - ad; // newest first
    });
    return selected ? [selected, ...rest] : rest;
  }, [getWatchedSet]);

  // Tính sẵn chiều cao mỗi item để đồng bộ initialScrollIndex và âm thanh/hiển thị
  const itemHeight = useMemo(() => {
    // Ưu tiên dùng kích thước đo được của vùng hiển thị thực tế dưới header
    if (viewportHeight > 0) return Math.max(320, viewportHeight);
    // Fallback: ước lượng theo window
    const screenH = Dimensions.get('window').height;
    const safeTop = Math.max(0, insets.top || 0);
    const head = Math.max(44, headerHeight || 0) + safeTop;
    const bottom = Math.max(0, tabBarHeight || 0);
    return Math.max(320, screenH - head - bottom);
  }, [viewportHeight, headerHeight, tabBarHeight, insets.top]);

  // Current user id for ownership checks (mirror Home logic)
  const { user: ctxUser } = useUser();
  const [currentUserId, setCurrentUserId] = useState(null);
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const userStr = await AsyncStorage.getItem('userInfo');
        if (userStr && mounted) {
          const parsed = JSON.parse(userStr);
          const raw = parsed?.user_id ?? parsed?.userId ?? parsed?.UserId ?? parsed?.id ?? null;
          const n = raw != null ? Number(raw) : null;
          setCurrentUserId(Number.isFinite(n) ? n : null);
        }
      } catch {}
    })();
    return () => { mounted = false; };
  }, []);
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

  const handleFollow = async (post) => {
    const targetUserId = post?.user?.id;
    if (!targetUserId) return;
    
    try {
      await followUser(targetUserId);
      console.log('[REELS] Followed user:', targetUserId);
      // Mark as followed in global context (đồng bộ với Home và Profile)
      markAsFollowed(targetUserId);
    } catch (e) {
      console.warn('[REELS] Follow error:', e);
      Alert.alert('Lỗi', e.message || 'Không thể theo dõi người dùng');
    }
  };

  // Fetch a page from backend; if refresh=true, replace list; else append unique
  const mergeUniqueById = useCallback((prevArr, nextArr) => {
    const map = new Map();
    for (const p of prevArr) if (p?.id != null && !map.has(p.id)) map.set(p.id, p);
    for (const p of nextArr) if (p?.id != null && !map.has(p.id)) map.set(p.id, p);
    return Array.from(map.values());
  }, []);

  const fetchPage = useCallback(async (pageNo = 1, { refresh = false, ensureSelected = null, ensureFromParams = null, tab = 'reels' } = {}) => {
    console.log(`[REELS] fetchPage - page ${pageNo}, refresh: ${refresh}, tab: ${tab}`);
    // Load videos with pagination based on active tab
    const pageSize = 10;
    const fetchFn = tab === 'following' ? getFollowingReels : getReels;
    const data = await fetchFn(pageNo, pageSize).catch((e) => { console.warn(`${tab} fetch error`, e); return []; });
    let arr = Array.isArray(data) ? data : [];
    
    // If we must ensure a selected clip appears first and it's not in arr, try to inject from params fallback
    if (ensureSelected != null && pageNo === 1) {
      const foundIdx = arr.findIndex(p => p?.id === ensureSelected);
      if (foundIdx >= 0) {
        const sel = arr.splice(foundIdx, 1)[0];
        arr = [sel, ...arr];
      } else if (ensureFromParams) {
        const found = (Array.isArray(ensureFromParams) ? ensureFromParams : []).find(p => p?.id === ensureSelected);
        if (found) {
          arr = [found, ...arr];
        }
      }
    }
    
    if (refresh) {
      setReels(arr);
      setCurrentPage(1);
      setHasMoreReels(arr.length >= pageSize);
      // cache after refresh
      try { await AsyncStorage.setItem(`${REELS_CACHE_KEY}_${tab}`, JSON.stringify({ items: arr, ts: Date.now() })); } catch {}
    } else {
      setReels(prev => {
        const next = mergeUniqueById(prev, arr);
        // cache after append
        (async () => { try { await AsyncStorage.setItem(`${REELS_CACHE_KEY}_${tab}`, JSON.stringify({ items: next, ts: Date.now() })); } catch {} })();
        return next;
      });
      setCurrentPage(pageNo);
      setHasMoreReels(arr.length >= pageSize);
    }
  }, [mergeUniqueById]);

  // Initial load
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const selectedId = route?.params?.selectedId ?? null;
        selectedIdRef.current = selectedId;
        // try load cache first for instant UI
        try {
          const cacheKey = `${REELS_CACHE_KEY}_${activeTab}`;
          const raw = await AsyncStorage.getItem(cacheKey);
          if (raw && mounted) {
            const cache = JSON.parse(raw);
            if (Array.isArray(cache?.items) && cache.items.length > 0) {
              setReels(cache.items);
              setLoading(false);
            }
          }
        } catch {}
        // always fetch fresh
        await fetchPage(1, { refresh: true, ensureSelected: selectedId, ensureFromParams: route?.params?.videos, tab: activeTab });
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []); // Chỉ chạy 1 lần khi mount

  // Reload when tab changes
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        await fetchPage(1, { refresh: true, tab: activeTab });
      } finally {
        setLoading(false);
      }
    })();
  }, [activeTab]); // Chạy khi activeTab thay đổi

  // subscribe to triple-tap refresh
  useEffect(() => {
    const unsub = require('../Utils/TabRefreshEmitter').onTabTriple('Video', async () => {
      try {
        setLoading(true);
        await fetchPage(1, { refresh: true, tab: activeTab });
        // Scroll to top
        setTimeout(() => {
          listRef.current?.scrollToOffset?.({ offset: 0, animated: true });
        }, 100);
      } catch (e) { console.warn('[Video] triple refresh error', e); }
      finally { setLoading(false); }
    });
    return unsub;
  }, [fetchPage, activeTab]);

  // Load more reels when scroll to end
  const loadMoreReels = useCallback(async () => {
    if (loadingMore || !hasMoreReels || loading) return;
    
    try {
      setLoadingMore(true);
      const nextPage = currentPage + 1;
      await fetchPage(nextPage, { refresh: false, tab: activeTab });
    } catch (e) {
      console.warn('Load more reels error', e);
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasMoreReels, loading, currentPage, fetchPage, activeTab]);

  // Khi nhận được params từ Home/Profile (videos + selectedId) trong lúc đã mở tab Video,
  // hãy ưu tiên video được chọn và cuộn về đầu để đảm bảo hiển thị đúng clip người dùng vừa bấm.
  // When params change (navigate from Home/Profile), always re-request backend and ensure selected clip
  useEffect(() => {
    const pv = route?.params?.videos;
    const sid = route?.params?.selectedId ?? null;
    if (sid == null && (!Array.isArray(pv) || pv.length === 0)) return;
    selectedIdRef.current = sid;
    (async () => {
      try {
        console.log('[REELS] navigate with selectedId', sid);
        setLoading(true);
        await fetchPage(1, { refresh: true, ensureSelected: sid, ensureFromParams: pv });
        setActiveIndex(0);
        requestAnimationFrame(() => {
          try { listRef.current?.scrollToOffset?.({ offset: 0, animated: false }); } catch {}
          // expo-video tự động play thông qua isActive prop
        });
      } catch (e) {
        console.warn('[Video] apply new params error', e);
      } finally { setLoading(false); }
    })();
  }, [route?.params?.selectedId, route?.params?.videos]);

  // Determine initial index safely (avoid calling scrollToIndex to prevent RN param errors)
  const initialIndex = 0; // sau khi reorder, video được chọn luôn ở vị trí đầu
  useEffect(() => {
    if (!loading && reels.length > 0) setActiveIndex(initialIndex);
  }, [loading, reels.length, initialIndex]);

  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    if (!viewableItems || viewableItems.length === 0) return;
    const idx = viewableItems[0]?.index ?? 0;
    setActiveIndex(idx);
    // đánh dấu đã xem để ưu tiên video chưa xem ở lần mở sau
    try { const post = reels[idx]; if (post?.id) markWatched(post.id); } catch {}
    // expo-video tự động quản lý play/pause thông qua isActive prop, không cần imperative control
  }).current;

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 80 }).current;
  // Giảm ngưỡng viewability để bắt được item đang hiển thị dễ hơn (tránh miss do header/safe-area)
  useEffect(() => {
    // update at runtime to avoid re-mounting refs
    if (viewabilityConfig) {
      viewabilityConfig.viewAreaCoveragePercentThreshold = 60;
    }
  }, []);

  // Bật chế độ âm thanh phù hợp để video luôn phát được (kể cả iOS đang bật silent)
  useEffect(() => {
    (async () => {
      try {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
          allowsRecordingIOS: false,
          shouldDuckAndroid: true,
          interruptionModeAndroid: Audio.INTERRUPTION_MODE_ANDROID_DO_NOT_MIX,
          interruptionModeIOS: Audio.INTERRUPTION_MODE_IOS_DO_NOT_MIX,
        });
      } catch (e) { console.warn('[REELS] setAudioMode error', e?.message || e); }
    })();
  }, []);

  const renderItem = ({ item, index }) => {
    const videoMedia = (item.media || []).find(
      (m) => (m.type || '').toLowerCase() === 'video'
    );
  // Dùng itemHeight đã tính để đảm bảo FlatList đo lường chính xác
  const height = itemHeight;
  // Tạo danh sách nguồn ứng viên (gồm bản gốc và các biến thể Cloudinary an toàn hơn)
  const base = videoMedia?.url || '';
  const candidates = buildCandidates(base);
  const sIdx = sourceIndexMap[item?.id] ?? 0;
  const chosenBase = candidates[Math.min(Math.max(0, sIdx), Math.max(0, candidates.length - 1))] || base;
  // Cache-busting để tránh dùng lại buffer cũ
  const videoUri = (() => {
    if (!chosenBase) return chosenBase;
    const ts = (new Date(item?.createdAt || Date.now()).getTime()) || Date.now();
    const rt = retryMap[item?.id]?.token || 0;
    return chosenBase + (chosenBase.includes('?') ? '&' : '?') + 'ts=' + ts + '&rt=' + rt;
  })();

    return (
      <View style={[styles.reel, { height }]}> 
        {videoMedia?.url ? (
          <>
            <ReelVideoPlayer
              videoUri={videoUri}
              authHeaders={authHeaders}
              height={height}
              isActive={index === activeIndex}
              isFocused={isFocused}
              index={index}
              onError={(e) => {
                console.warn('[REELS] video error index', index, e);
                try {
                  // Nếu còn phương án nguồn kế tiếp, chuyển sang ngay để thử
                  const hasNext = (candidates && (sIdx + 1) < candidates.length);
                  if (hasNext) {
                    setSourceIndexMap((prev) => ({ ...prev, [item?.id]: sIdx + 1 }));
                    bumpRetryTokenNow(item?.id);
                  } else {
                    // Hết phương án → dùng cơ chế retry theo backoff
                    scheduleRetry(item?.id, index);
                  }
                } catch {
                  scheduleRetry(item?.id, index);
                }
              }}
              onPlaybackStatusUpdate={(status) => {
                try {
                  if (status?.isPlaying) clearRetry(item?.id);
                } catch {}
              }}
              onTogglePlayPause={() => {
                // Handled by tap gesture below
              }}
            />
            {/* Lớp chạm toàn màn hình: 1 chạm pause/play, 3 chạm thả cảm xúc */}
            <TouchableOpacity
              activeOpacity={1}
              style={StyleSheet.absoluteFill}
              onPress={() => {
                const now = Date.now();
                // lưu times trong 400ms
                tapTimesRef.current = (tapTimesRef.current || []).filter(t => now - t < 350);
                tapTimesRef.current.push(now);
                // nếu 3 tap trong cửa sổ -> thả cảm xúc
                if (tapTimesRef.current.length >= 3) {
                  tapTimesRef.current = [];
                  if (tapTimerRef.current) { clearTimeout(tapTimerRef.current); tapTimerRef.current = null; }
                  setShowBigHeart(true);
                  setTimeout(() => setShowBigHeart(false), 700);
                  return;
                }
                // Note: Tap-to-play/pause removed as expo-video doesn't support imperative control the same way
                // Users can still triple-tap for heart animation
              }}
            />
            {showBigHeart && (
              <View pointerEvents="none" style={styles.bigHeartWrap}>
                <Ionicons name="heart" size={96} color="#fff" style={{ opacity: 0.9 }} />
              </View>
            )}
          </>
        ) : (
          <View style={[StyleSheet.absoluteFill, styles.noVideo]}>
            <Text style={{ color: '#fff' }}>Không có video</Text>
          </View>
        )}
        {/* Overlay UI */}
  <View style={[styles.overlay, { paddingBottom: 12 }] }>
          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.userRow}
            onPress={() => navigation.navigate('UserProfilePublic', { userId: item?.user?.id, username: item?.user?.username, avatarUrl: item?.user?.avatarUrl })}
          >
            {item?.user?.avatarUrl ? (
              <Image source={{ uri: item.user.avatarUrl }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder} />
            )}
            <Text style={styles.username}>@{item?.user?.username || 'user'}</Text>
            {!isOwner(item) && !isFollowed(item?.user?.id) && (
              <TouchableOpacity style={styles.followBtn} onPress={() => handleFollow(item)}>
                <Text style={styles.followText}>Theo dõi</Text>
              </TouchableOpacity>
            )}
          </TouchableOpacity>
          {/* Caption hiển thị 2 dòng, bấm "Xem thêm" +10 dòng mỗi lần; khi đủ thì hiện "Ẩn nội dung" */}
          {!!item.caption && (
            <View style={styles.captionWrap}>
              {/* Hidden full-text to measure total lines accurately (avoid numberOfLines clipping) */}
              <Text
                style={[styles.captionText, styles.hiddenMeasure]}
                onTextLayout={(e) => {
                  const lines = e?.nativeEvent?.lines?.length || 0;
                  if ((captionTotalLines[index] || 0) !== lines) {
                    setCaptionTotalLines(prev => ({ ...prev, [index]: lines }));
                  }
                }}
              >
                {item.caption}
              </Text>

              {/* Visible caption with collapsible lines */}
              <Text
                style={styles.captionText}
                numberOfLines={captionLinesShown[index] ?? 2}
              >
                {item.caption}
              </Text>
              {(() => {
                const shown = captionLinesShown[index] ?? 2;
                const total = captionTotalLines[index] ?? 0;
                const heuristicLong = (item.caption || '').length > 80; // fallback while measuring
                if (total <= 2 && !heuristicLong) return null;
                const fullyShown = shown >= Math.max(total, 2);
                return (
                  <TouchableOpacity onPress={() => {
                    setCaptionLinesShown(prev => {
                      const current = prev[index] ?? 2;
                      const totalLines = captionTotalLines[index] ?? current + 10;
                      if (totalLines <= current) {
                        // collapse
                        return { ...prev, [index]: 2 };
                      }
                      // expand by 10 lines each tap
                      const next = Math.min(current + 10, totalLines);
                      return { ...prev, [index]: next };
                    });
                  }}>
                    <Text style={styles.seeMore}>{fullyShown ? 'Ẩn nội dung' : 'Xem thêm'}</Text>
                  </TouchableOpacity>
                );
              })()}
            </View>
          )}
        </View>

        {/* Right-side vertical actions, centered */}
        <View pointerEvents="box-none" style={styles.actionsColumn}>
          <TouchableOpacity style={styles.sideBtn}><Ionicons name="heart-outline" size={28} color="#fff" /><Text style={styles.sideCount}>0</Text></TouchableOpacity>
          <TouchableOpacity style={styles.sideBtn}><Ionicons name="chatbubble-outline" size={28} color="#fff" /><Text style={styles.sideCount}>0</Text></TouchableOpacity>
          <TouchableOpacity style={styles.sideBtn}><Ionicons name="paper-plane-outline" size={28} color="#fff" /><Text style={styles.sideCount}>0</Text></TouchableOpacity>
          <TouchableOpacity style={[styles.sideBtn,{marginTop:6}]} onPress={() => { 
            console.log('[REELS] Open options for index', index, 'postId', item?.id);
            setShowOptions(true); 
          }}>
            <Ionicons name="ellipsis-vertical" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const onRefresh = async () => {
    try {
      setRefreshing(true);
      await fetchPage(1, { refresh: true, ensureSelected: selectedIdRef.current, ensureFromParams: route?.params?.videos, tab: activeTab });
      // Scroll to top
      setTimeout(() => {
        listRef.current?.scrollToOffset?.({ offset: 0, animated: true });
        setActiveIndex(0);
      }, 100);
    } catch (e) {
      console.warn('Reels refresh error', e);
    } finally { setRefreshing(false); }
  };

  const closeAllOverlays = () => {
    setShowOptions(false);
    setShowPrivacySheet(false);
    setEditingCaption(false);
    setCaptionDraft('');
  };

  const pickPrivacy = async (privacyKey) => {
    try {
      const post = reels[activeIndex];
      if (!post) return;
      setBusy(true);
      console.log('[REELS] pickPrivacy', privacyKey, 'for postId', post.id);
      const updated = await updatePostPrivacy(post.id, privacyKey);
      setShowPrivacySheet(false);
      // update local copy
      setReels(prev => prev.map((p, i) => i===activeIndex ? { ...p, privacy: updated?.privacy || privacyKey } : p));
      setShowOptions(false);
    } catch (e) {
      console.warn('Update privacy error', e);
    } finally { setBusy(false); }
  };

  const submitCaptionEdit = async () => {
    try {
      const post = reels[activeIndex];
      if (!post) return;
      setBusy(true);
      console.log('[REELS] submitCaptionEdit for postId', post.id, 'captionDraft length', captionDraft?.length ?? 0);
      const updated = await updatePostCaption(post.id, captionDraft);
      setReels(prev => prev.map((p, i) => i===activeIndex ? { ...p, caption: updated?.caption ?? captionDraft } : p));
      closeAllOverlays();
    } catch (e) {
      console.warn('Update caption error', e);
    } finally { setBusy(false); }
  };

  // expo-video tự động quản lý play/pause thông qua isActive prop trong ReelVideoPlayer
  // không cần pause/play imperative khi focus thay đổi
  useEffect(() => {
    // Component ReelVideoPlayer sẽ tự động pause khi isFocused=false
  }, [isFocused, activeIndex]);

  return (
    // Với màn hình thuộc Tab Navigator, chỉ giữ safe-area cạnh trên để tránh dải đen nằm ngay trên tab bar
  <SafeAreaView edges={['top']} style={styles.container}>
      {/* Video content - full screen */}
      {loading ? (
        <View style={styles.loading}>
          <Text style={{ color: '#fff' }}>Đang tải...</Text>
        </View>
      ) : reels.length === 0 ? (
        <View style={styles.loading}>
          <Text style={{ color: '#fff' }}>
            {activeTab === 'following' ? 'Chưa có video từ người bạn theo dõi' : 'Chưa có video'}
          </Text>
        </View>
      ) : (
        <View style={{ flex: 1 }} onLayout={(e)=> setViewportHeight(e.nativeEvent.layout.height)}>
          <FlatList
            data={reels}
            keyExtractor={(item) => String(item.id)}
            pagingEnabled
            showsVerticalScrollIndicator={false}
            ref={listRef}
            onViewableItemsChanged={onViewableItemsChanged}
            viewabilityConfig={viewabilityConfig}
            initialScrollIndex={initialIndex}
            getItemLayout={(_, index) => ({ length: itemHeight, offset: itemHeight * index, index })}
            windowSize={5}
            removeClippedSubviews={false}
            initialNumToRender={2}
            maxToRenderPerBatch={5}
            updateCellsBatchingPeriod={50}
            onScrollToIndexFailed={(info) => {
              // Fallback khi RN cuộn sai vị trí ban đầu
              console.warn('[REELS] onScrollToIndexFailed, retry with offset', info.averageItemLength * info.index);
              listRef.current?.scrollToOffset({ offset: info.averageItemLength * info.index, animated: false });
              setTimeout(() => listRef.current?.scrollToIndex({ index: info.index, animated: false }), 50);
            }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            // Infinite scroll
            onEndReached={loadMoreReels}
            onEndReachedThreshold={1.5}
            ListFooterComponent={() => {
              if (!loadingMore) return null;
              return (
                <View style={{ height: itemHeight, justifyContent: 'center', alignItems: 'center' }}>
                  <Text style={{ color: '#fff' }}>Đang tải thêm...</Text>
                </View>
              );
            }}
            renderItem={renderItem}
          />
        </View>
      )}

      {/* Options overlay (giống Home) */}
      {showOptions && (
        <TouchableOpacity activeOpacity={1} style={styles.overlayDim} onPress={() => setShowOptions(false)}>
          <TouchableOpacity activeOpacity={0.95} style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.sheetTitle}>Tùy chọn</Text>
            {(() => {
              const post = reels[activeIndex];
              if (post && isOwner(post)) {
                return (
                  <>
                    <TouchableOpacity style={styles.sheetItem} onPress={() => setShowPrivacySheet(true)}>
                      <Text style={styles.sheetItemText}>Chỉnh sửa quyền riêng tư</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.sheetItem}
                      onPress={() => { setEditingCaption(true); setCaptionDraft(post.caption || ''); }}
                    >
                      <Text style={styles.sheetItemText}>Chỉnh sửa caption</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.sheetItem}
                      onPress={async ()=>{
                        try { setBusy(true); await deletePost(post.id); setShowOptions(false); setReels(prev => prev.filter(p => p.id !== post.id)); }
                        catch(e){ console.warn('Delete error', e); }
                        finally { setBusy(false); }
                      }}
                    >
                      <Text style={styles.sheetItemText}>Xóa bài viết</Text>
                    </TouchableOpacity>
                  </>
                );
              }
              // non-owner limited
              return (
                <>
                  <TouchableOpacity style={styles.sheetItem} onPress={() => setShowOptions(false)}>
                    <Text style={styles.sheetItemText}>Báo cáo</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.sheetItem, { borderTopWidth: 0 }]} onPress={() => setShowOptions(false)}>
                    <Text style={styles.sheetItemText}>Ẩn video</Text>
                  </TouchableOpacity>
                </>
              );
            })()}
          </TouchableOpacity>
        </TouchableOpacity>
      )}

      {showOptions && showPrivacySheet && (
        <TouchableOpacity activeOpacity={1} style={styles.overlayDim} onPress={closeAllOverlays}>
          <TouchableOpacity activeOpacity={0.95} style={styles.sheet} onPress={(e)=>e.stopPropagation()}>
            <Text style={styles.sheetTitle}>Chọn quyền riêng tư</Text>
            {[{k:'public',label:'Public'},{k:'followers',label:'Followers'},{k:'private',label:'Private'}].map(opt => (
              <TouchableOpacity key={opt.k} style={styles.sheetItem} onPress={() => pickPrivacy(opt.k)}>
                <Text style={styles.sheetItemText}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
          </TouchableOpacity>
        </TouchableOpacity>
      )}

      {/* Edit Caption Modal */}
      <Modal
        visible={editingCaption}
        transparent={true}
        animationType="slide"
        onRequestClose={closeAllOverlays}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
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
                <TouchableOpacity onPress={closeAllOverlays} style={styles.closeButton}>
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

      {busy && (
        <View style={styles.busyOverlay}><View style={styles.spinner} /></View>
      )}

      {/* Header overlay - transparent with tabs */}
      <View style={styles.header}>
        <View style={styles.tabContainer}>
          <TouchableOpacity 
            style={styles.tab} 
            onPress={() => setActiveTab('reels')}
          >
            <Text style={[styles.tabText, activeTab === 'reels' && styles.activeTabText]}>
              Reels
            </Text>
            {activeTab === 'reels' && <View style={styles.tabIndicator} />}
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.tab} 
            onPress={() => setActiveTab('following')}
          >
            <Text style={[styles.tabText, activeTab === 'following' && styles.activeTabText]}>
              Bạn bè
            </Text>
            {activeTab === 'following' && <View style={styles.tabIndicator} />}
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    backgroundColor: 'transparent', // Trong suốt
    position: 'absolute', // Đặt absolute để nằm trên video
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10, // Nằm trên video
    paddingTop: 8,
  },
  tabContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: '25%',
    right: '25%',
    height: 2,
    backgroundColor: '#fff', // Thanh trắng
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.6)', // Trắng mờ
  },
  activeTabText: {
    color: '#fff', // Trắng đậm
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff', // Trắng
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  reel: {
    width: '100%',
    backgroundColor: '#000',
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  caption: {
    color: '#fff',
    padding: 12,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  noVideo: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#111',
  },
  overlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 12,
    paddingTop: 12,
  },
  captionWrap: {
    marginTop: 4,
    paddingHorizontal: 4,
  },
  captionUser: {
    color: '#fff',
    fontWeight: '800',
    marginBottom: 2,
  },
  captionText: {
    color: '#fff',
    lineHeight: 18,
  },
  hiddenMeasure: {
    position: 'absolute',
    opacity: 0,
    zIndex: -1,
    left: -10000,
    right: 10000,
  },
  seeMore: {
    color: '#e5e7eb',
    marginTop: 4,
    fontWeight: '600',
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.6)'
  },
  actionsColumn: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 8,
    width: 72,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bigHeartWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sideBtn: {
    alignItems: 'center',
    marginBottom: 10,
  },
  sideCount: {
    color: '#fff',
    marginTop: 4,
    fontWeight: '600',
  },
  avatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.6)',
  },
  username: {
    color: '#fff',
    fontWeight: '700',
  },
  followBtn: {
    marginLeft: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  followText: {
    color: '#fff',
    fontWeight: '700',
  },
  overlayDim: {
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
  sheetTitle: { fontSize: 16, fontWeight: '700', marginBottom: 8 },
  sheetItem: { paddingVertical: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#e5e7eb' },
  sheetItemText: { fontSize: 16, color: '#111827' },
  busyOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  spinner: { width: 40, height: 40, borderRadius: 20, borderWidth: 4, borderColor: '#fff', borderTopColor: 'transparent' },
  // Edit Caption Modal Styles
  modalContainer: {
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  editCaptionSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    maxHeight: '80%',
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  closeButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
  },
  closeButtonText: {
    fontSize: 18,
    color: '#111827',
    fontWeight: '600',
  },
  editCaptionContent: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    minHeight: 200,
  },
  captionTextInput: {
    fontSize: 16,
    color: '#111827',
    textAlignVertical: 'top',
    minHeight: 150,
    maxHeight: 300,
    padding: 12,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    backgroundColor: '#f9fafb',
  },
  charCounter: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 8,
    textAlign: 'right',
  },
  editCaptionActions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#f3f4f6',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
  },
  saveButton: {
    backgroundColor: '#0095F6',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
});
 
