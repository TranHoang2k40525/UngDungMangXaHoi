import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, Image, StyleSheet, ScrollView, TouchableOpacity, Dimensions, RefreshControl } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { getUserPostsById } from '../API/Api';
import { Ionicons } from '@expo/vector-icons';
import * as VideoThumbnails from 'expo-video-thumbnails';

const { width } = Dimensions.get('window');
const imageSize = (width - 6) / 3;

export default function UserProfilePublic() {
  const route = useRoute();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const userId = route.params?.userId;
  const presetName = route.params?.username;
  const presetAvatar = route.params?.avatarUrl;
  const [posts, setPosts] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [videoThumbs, setVideoThumbs] = useState({});

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const data = await getUserPostsById(userId);
        if (alive) setPosts(Array.isArray(data) ? data : []);
      } catch (e) { console.warn('User posts error', e); }
    })();
    return () => { alive = false; };
  }, [userId]);

  // Tạo thumbnail cho các bài video của user
  useEffect(() => {
    let alive = true;
    (async () => {
      const targets = (posts || []).filter(
        (p) => (p.media || []).some((m) => (m.type || '').toLowerCase() === 'video') && !videoThumbs[p.id]
      );
      for (const post of targets) {
        try {
          const vid = (post.media || []).find((m) => (m.type || '').toLowerCase() === 'video');
          if (!vid?.url) continue;
          console.log('[USER-PROFILE] gen thumbnail for', post.id);
          const { uri } = await VideoThumbnails.getThumbnailAsync(vid.url, { time: 1000 });
          if (alive && uri) setVideoThumbs((prev) => ({ ...prev, [post.id]: uri }));
        } catch (e) {
          console.warn('[USER-PROFILE] gen thumbnail failed', post.id, e);
        }
      }
    })();
    return () => { alive = false; };
  }, [posts, videoThumbs]);

  const headerUser = useMemo(() => {
    const first = posts[0];
    return {
      username: presetName || first?.user?.username || 'user',
      avatarUrl: presetAvatar || first?.user?.avatarUrl || null,
    };
  }, [posts, presetName, presetAvatar]);

  const onPressPost = (post) => {
    const isVideo = (post.media||[]).some(m => (m.type||'').toLowerCase()==='video');
    if (isVideo) {
      const videoPosts = posts.filter(pp => (pp.media||[]).some(mm => (mm.type||'').toLowerCase()==='video'));
  navigation.navigate('MainTabs', { screen: 'Video', params: { videos: videoPosts, selectedId: post.id } });
    } else {
      navigation.navigate('PostDetail', { post });
    }
  };

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{padding:8}}>
          <Ionicons name="chevron-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.username}>@{headerUser.username}</Text>
        <View style={{width:32}} />
      </View>

      <View style={styles.profileInfo}>
        {headerUser.avatarUrl ? (
          <Image source={{ uri: headerUser.avatarUrl }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, { backgroundColor:'#eee' }]} />
        )}
        <Text style={styles.displayName}>@{headerUser.username}</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async()=>{ setRefreshing(true); try { const data = await getUserPostsById(userId); setPosts(Array.isArray(data)?data:[]);} finally { setRefreshing(false);} }} />}
      >
        <View style={styles.grid}>
          {posts.map((post) => (
            <TouchableOpacity key={post.id} style={styles.tile} onPress={() => onPressPost(post)}>
              {(() => {
                const img = (post.media||[]).find(m => (m.type||'').toLowerCase()==='image');
                const vid = (post.media||[]).find(m => (m.type||'').toLowerCase()==='video');
                if (img) return <Image source={{ uri: img.url }} style={styles.tileImage} />;
                if (vid) {
                  const thumb = videoThumbs[post.id];
                  return (
                    <View style={{flex:1}}>
                      {thumb ? (
                        <Image source={{ uri: thumb }} style={styles.tileImage} />
                      ) : (
                        <View style={[styles.tileImage,{backgroundColor:'#000'}]} />
                      )}
                      <Ionicons name="play" size={22} color="#fff" style={{ position:'absolute', right:6, bottom:6, opacity:0.9 }} />
                    </View>
                  );
                }
                return <View style={[styles.tileImage,{backgroundColor:'#f3f4f6'}]} />;
              })()}
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor:'#fff' },
  header: {
    flexDirection:'row', alignItems:'center', justifyContent:'space-between',
    paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor:'#e5e7eb'
  },
  username: { fontSize: 18, fontWeight:'700', color:'#111827' },
  profileInfo: { alignItems:'center', paddingVertical: 12 },
  avatar: { width: 88, height: 88, borderRadius: 44 },
  displayName: { marginTop: 8, fontWeight:'600', color:'#111827' },
  grid: { flexDirection:'row', flexWrap:'wrap' },
  tile: { width: imageSize, height: imageSize, borderWidth: 1, borderColor:'#fff' },
  tileImage: { width: '100%', height: '100%' },
});
