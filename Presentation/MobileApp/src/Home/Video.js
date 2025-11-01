import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  FlatList,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { getReels } from '../API/Api';
import { useIsFocused, useNavigation, useRoute } from '@react-navigation/native';
import { Video as ExpoVideo } from 'expo-av';

export default function Reels() {
  const insets = useSafeAreaInsets();
  const route = useRoute();
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  const [reels, setReels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const listRef = useRef(null);
  const playersRef = useRef({});
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const paramVideos = route?.params?.videos;
        if (Array.isArray(paramVideos) && paramVideos.length > 0) {
          if (mounted) setReels(paramVideos);
        } else {
          const data = await getReels();
          if (mounted) setReels(Array.isArray(data) ? data : []);
        }
      } catch (e) {
        console.warn('Reels error', e);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Determine initial index safely (avoid calling scrollToIndex to prevent RN param errors)
  const initialIndex = useMemo(() => {
    const raw = Number(route?.params?.initialIndex ?? 0);
    if (!Number.isFinite(raw)) return 0;
    return Math.max(0, Math.min(raw, Math.max(0, reels.length - 1)));
  }, [route?.params?.initialIndex, reels.length]);
  useEffect(() => {
    if (!loading && reels.length > 0) setActiveIndex(initialIndex);
  }, [loading, reels.length, initialIndex]);

  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    if (!viewableItems || viewableItems.length === 0) return;
    const idx = viewableItems[0]?.index ?? 0;
    setActiveIndex(idx);
    // Imperative control for stability
    try {
      Object.entries(playersRef.current).forEach(([k, v]) => {
        if (v && typeof v.pauseAsync === 'function') v.pauseAsync().catch(() => {});
      });
      const current = playersRef.current[idx];
      if (isFocused && current && typeof current.playAsync === 'function') current.playAsync().catch(() => {});
    } catch {}
  }).current;

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 80 }).current;

  const renderItem = ({ item, index }) => {
    const videoMedia = (item.media || []).find(
      (m) => (m.type || '').toLowerCase() === 'video'
    );
    const height = Dimensions.get('window').height - (insets.top + insets.bottom + 100);

    return (
      <View style={[styles.reel, { height }]}> 
        {videoMedia?.url ? (
          <ExpoVideo
            source={{ uri: videoMedia.url }}
            style={StyleSheet.absoluteFillObject}
            resizeMode="cover"
            isLooping
            useNativeControls={false}
            shouldPlay={isFocused && index === activeIndex}
            ref={(ref) => { if (ref) { playersRef.current[index] = ref; } }}
          />
        ) : (
          <View style={[StyleSheet.absoluteFill, styles.noVideo]}>
            <Text style={{ color: '#fff' }}>Không có video</Text>
          </View>
        )}
        {/* Instagram-like overlay */}
        <View style={styles.overlayBottom}>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection:'row', alignItems:'center', gap:8, marginBottom:6 }}>
              <View style={styles.avatarPlaceholder} />
              <Text style={styles.username}>@{item?.user?.username || 'user'}</Text>
              <TouchableOpacity style={styles.followBtn}><Text style={styles.followText}>Theo dõi</Text></TouchableOpacity>
            </View>
            {!!item.caption && (
              <Text style={styles.caption} numberOfLines={2}>{item.caption}</Text>
            )}
          </View>
          <View style={styles.sideActions}>
            <TouchableOpacity style={styles.sideBtn}><Ionicons name="heart-outline" size={28} color="#fff" /><Text style={styles.sideCount}>0</Text></TouchableOpacity>
            <TouchableOpacity style={styles.sideBtn}><Ionicons name="chatbubble-outline" size={28} color="#fff" /><Text style={styles.sideCount}>0</Text></TouchableOpacity>
            <TouchableOpacity style={styles.sideBtn}><Ionicons name="paper-plane-outline" size={28} color="#fff" /><Text style={styles.sideCount}>0</Text></TouchableOpacity>
            <TouchableOpacity style={[styles.sideBtn,{marginTop:6}]}><Ionicons name="ellipsis-vertical" size={24} color="#fff" /></TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  const onRefresh = async () => {
    try {
      setRefreshing(true);
      // chỉ fetch lại khi không được truyền danh sách videos từ Home
      if (!route?.params?.videos) {
        const data = await getReels();
        setReels(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.warn('Reels refresh error', e);
    } finally {
      setRefreshing(false);
    }
  };

  // Pause all when screen not focused
  useEffect(() => {
    if (!isFocused) {
      try {
        Object.values(playersRef.current).forEach((v) => {
          if (v && typeof v.pauseAsync === 'function') v.pauseAsync().catch(() => {});
        });
      } catch {}
    } else {
      // when refocus, ensure current item plays
      const current = playersRef.current[activeIndex];
      if (current && typeof current.playAsync === 'function') current.playAsync().catch(() => {});
    }
  }, [isFocused, activeIndex]);

  return (
    <SafeAreaView style={[styles.container, { paddingTop: insets.top, paddingBottom: Math.max(insets.bottom, 8) }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Videos</Text>
      </View>

      {loading ? (
        <View style={[styles.loading, { paddingBottom: insets.bottom }]}>
          <Text style={{ color: '#fff' }}>Đang tải...</Text>
        </View>
      ) : reels.length === 0 ? (
        <View style={[styles.loading, { paddingBottom: insets.bottom }]}>
          <Text style={{ color: '#fff' }}>Chưa có video</Text>
        </View>
      ) : (
        <FlatList
          data={reels}
          keyExtractor={(item) => String(item.id)}
          pagingEnabled
          showsVerticalScrollIndicator={false}
          ref={listRef}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          initialScrollIndex={initialIndex}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          renderItem={renderItem}
        />
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
  overlayBottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 12,
    paddingBottom: 18,
    paddingTop: 12,
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  sideActions: {
    width: 72,
    alignItems: 'center',
    marginLeft: 8,
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
});
 
