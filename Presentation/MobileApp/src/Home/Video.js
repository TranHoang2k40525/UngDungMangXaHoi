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
  PixelRatio,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { getReels, getFeed, updatePostPrivacy, updatePostCaption, deletePost } from '../API/Api';
import { useIsFocused, useNavigation, useRoute } from '@react-navigation/native';
import { Video as ExpoVideo, ResizeMode } from 'expo-av';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useUser } from '../Context/UserContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function Reels() {
  const insets = useSafeAreaInsets();
  const route = useRoute();
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  const [reels, setReels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const listRef = useRef(null);
  const [manualPauseMap, setManualPauseMap] = useState({}); // { [postId]: boolean }
  const [refreshing, setRefreshing] = useState(false);
  // Pagination state
  const PAGE_SIZE = 5;
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const selectedIdRef = useRef(null);
  const [headerHeight, setHeaderHeight] = useState(60);
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
  // Global maps for per-post playback watchdog
  

  // Phát video từ URL gốc (không encode/sanitize, không headers)

  // No quality ladder: always use original URL only

  // Using backend-provided original URLs without client-side quality fallback

  // Gỡ cấu hình thiết bị & header: phát trực tiếp từ URL gốc

  // No retry/fallback logic as requested

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

  // Fetch a page from backend; if refresh=true, replace list; else append unique
  const mergeUniqueById = useCallback((prevArr, nextArr) => {
    const map = new Map();
    for (const p of prevArr) if (p?.id != null && !map.has(p.id)) map.set(p.id, p);
    for (const p of nextArr) if (p?.id != null && !map.has(p.id)) map.set(p.id, p);
    return Array.from(map.values());
  }, []);

  const fetchPage = useCallback(async (pageNo = 1, { refresh = false, ensureSelected = null, ensureFromParams = null } = {}) => {
    console.log('[REELS] fetchPage', { pageNo, PAGE_SIZE, refresh, ensureSelected });
    // Dùng feed giống Home: lấy page, lọc các post có video
    const data = await getFeed(pageNo, PAGE_SIZE).catch((e) => { console.warn('getFeed error', e); return []; });
    let arr = Array.isArray(data) ? data.filter(p => (p.media||[]).some(m => (m.type||'').toLowerCase()==='video')) : [];
    // If we must ensure a selected clip appears first and it's not in arr, try to inject from params fallback
    if (ensureSelected != null) {
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
      setPage(1);
      setHasMore(arr.length === PAGE_SIZE);
      // cache after refresh
      try { await AsyncStorage.setItem(REELS_CACHE_KEY, JSON.stringify({ items: arr, ts: Date.now() })); } catch {}
    } else {
      setReels(prev => {
        const next = mergeUniqueById(prev, arr);
        // cache after append
        (async () => { try { await AsyncStorage.setItem(REELS_CACHE_KEY, JSON.stringify({ items: next, ts: Date.now() })); } catch {} })();
        return next;
      });
      setHasMore(arr.length === PAGE_SIZE);
      setPage(pageNo);
    }
  }, [PAGE_SIZE, mergeUniqueById]);

  // Initial load
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const selectedId = route?.params?.selectedId ?? null;
        selectedIdRef.current = selectedId;
        // try load cache first for instant UI
        try {
          const raw = await AsyncStorage.getItem(REELS_CACHE_KEY);
          if (raw && mounted) {
            const cache = JSON.parse(raw);
            if (Array.isArray(cache?.items) && cache.items.length > 0) {
              setReels(cache.items);
              setLoading(false);
            }
          }
        } catch {}
        // always fetch fresh
        await fetchPage(1, { refresh: true, ensureSelected: selectedId, ensureFromParams: route?.params?.videos });
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // subscribe to triple-tap refresh
  useEffect(() => {
    const unsub = require('../Utils/TabRefreshEmitter').onTabTriple('Video', async () => {
      try {
        setLoading(true);
        const data = await getReels();
        setReels(Array.isArray(data) ? data : []);
      } catch (e) { console.warn('[Video] triple refresh error', e); }
      finally { setLoading(false); }
    });
    return unsub;
  }, []);

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
  }).current;

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 80 }).current;
  // Giảm ngưỡng viewability để bắt được item đang hiển thị dễ hơn (tránh miss do header/safe-area)
  useEffect(() => {
    // update at runtime to avoid re-mounting refs
    if (viewabilityConfig) {
      viewabilityConfig.viewAreaCoveragePercentThreshold = 60;
    }
  }, []);

  // Playback is handled via expo-av only; audio mode configured above

  // Track per-post active URI for fast fallback
  const [activeUris, setActiveUris] = useState({}); // { [postId]: uri }

  const renderItem = ({ item, index }) => {
    const videoMedia = (item.media || []).find(
      (m) => (m.type || '').toLowerCase() === 'video'
    );
    const height = itemHeight;
  const baseUri = videoMedia?.url || '';
  const currentUri = baseUri;
    const shouldPlay = isFocused && index === activeIndex && !manualPauseMap[item?.id];

    return (
      <View style={[styles.reel, { height }]}> 
        {videoMedia?.url ? (
          <>
            <ExpoVideo
              key={`${item?.id ?? 'v'}:${currentUri}`}
              source={{ uri: currentUri }}
              style={StyleSheet.absoluteFillObject}
              resizeMode={ResizeMode.CONTAIN}
              isLooping
              useNativeControls={false}
              shouldPlay={shouldPlay}
              isMuted={false}
              volume={1.0}
              progressUpdateIntervalMillis={250}
              usePoster={!!item?.thumbnailUrl}
              posterSource={item?.thumbnailUrl ? { uri: item.thumbnailUrl } : undefined}
              posterStyle={StyleSheet.absoluteFillObject}
              onLoad={() => { try { console.log('[REELS] video loaded', { index, postId: item?.id }); } catch {} }}
              onError={(e) => {
                try { console.warn('[REELS] video error (original only)', { index, postId: item?.id, currentUri, e }); } catch {}
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
                // nếu chưa đạt 3 tap, đợi 220ms để phân biệt với tap kế
                if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
                tapTimerRef.current = setTimeout(() => {
                  try {
                    const id = item?.id;
                    if (!id) return;
                    setManualPauseMap(prev => ({ ...prev, [id]: !prev[id] }));
                  } catch {}
                }, 220);
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
        <View style={[styles.overlay, { paddingBottom: 12 }]}>
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
            {!isOwner(item) && (
              <TouchableOpacity style={styles.followBtn}><Text style={styles.followText}>Theo dõi</Text></TouchableOpacity>
            )}
          </TouchableOpacity>

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
                const heuristicLong = (item.caption || '').length > 80;
                if (total <= 2 && !heuristicLong) return null;
                const fullyShown = shown >= Math.max(total, 2);
                return (
                  <TouchableOpacity onPress={() => {
                    setCaptionLinesShown(prev => {
                      const current = prev[index] ?? 2;
                      const totalLines = captionTotalLines[index] ?? current + 10;
                      if (totalLines <= current) {
                        return { ...prev, [index]: 2 };
                      }
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
      await fetchPage(1, { refresh: true, ensureSelected: selectedIdRef.current, ensureFromParams: route?.params?.videos });
    } catch (e) {
      console.warn('Reels refresh error', e);
    } finally { setRefreshing(false); }
  };

  const onEndReached = async () => {
    if (loadingMore || !hasMore) return;
    try {
      setLoadingMore(true);
      await fetchPage(page + 1, { refresh: false });
    } finally {
      setLoadingMore(false);
    }
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
      const updated = await updatePostPrivacy(post.id, privacyKey);
      setShowPrivacySheet(false);
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

  // Playback is controlled declaratively by 'shouldPlay' prop on ExpoVideo

  return (
    // Với màn hình thuộc Tab Navigator, chỉ giữ safe-area cạnh trên để tránh dải đen nằm ngay trên tab bar
  <SafeAreaView edges={['top']} style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header} onLayout={(e)=> setHeaderHeight(e.nativeEvent.layout.height)}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Videos</Text>
      </View>

      {loading ? (
        <View style={styles.loading}>
          <Text style={{ color: '#fff' }}>Đang tải...</Text>
        </View>
      ) : reels.length === 0 ? (
        <View style={styles.loading}>
          <Text style={{ color: '#fff' }}>Chưa có video</Text>
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
            windowSize={3}
            removeClippedSubviews={false}
            initialNumToRender={1}
            maxToRenderPerBatch={2}
            updateCellsBatchingPeriod={60}
            onEndReached={onEndReached}
            onEndReachedThreshold={0.6}
            onScrollToIndexFailed={(info) => {
              // Fallback khi RN cuộn sai vị trí ban đầu
              console.warn('[REELS] onScrollToIndexFailed, retry with offset', info.averageItemLength * info.index);
              listRef.current?.scrollToOffset({ offset: info.averageItemLength * info.index, animated: false });
              setTimeout(() => listRef.current?.scrollToIndex({ index: info.index, animated: false }), 50);
            }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
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

      {showOptions && editingCaption && (
        <TouchableOpacity activeOpacity={1} style={styles.overlayDim} onPress={closeAllOverlays}>
          <TouchableOpacity activeOpacity={0.95} style={styles.sheet} onPress={(e)=>e.stopPropagation()}>
            <Text style={styles.sheetTitle}>Chỉnh sửa caption</Text>
            <View style={{ borderWidth:1, borderColor:'#e5e7eb', borderRadius:8 }}>
              <TextInput
                style={{ padding: 10, minHeight: 80, color:'#111827' }}
                value={captionDraft}
                onChangeText={setCaptionDraft}
                placeholder="Nhập caption..."
                multiline
              />
            </View>
            <View style={{ flexDirection:'row', gap: 12, marginTop: 10 }}>
              <TouchableOpacity style={{ backgroundColor:'#111827', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 8 }} onPress={submitCaptionEdit}>
                <Text style={{ color:'#fff', fontWeight:'700' }}>Lưu</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{ backgroundColor:'#f3f4f6', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 8 }} onPress={closeAllOverlays}>
                <Text style={{ color:'#111827', fontWeight:'700' }}>Hủy</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      )}

      {busy && (
        <View style={styles.busyOverlay}><View style={styles.spinner} /></View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#DBDBDB',
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
    color: '#111827',
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
});
 
