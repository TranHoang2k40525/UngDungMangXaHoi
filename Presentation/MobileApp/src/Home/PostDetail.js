import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, Image, StyleSheet, Dimensions, TouchableOpacity, FlatList, TextInput, RefreshControl } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { VideoView, useVideoPlayer } from 'expo-video';
import { getUserPostsById, updatePostCaption, updatePostPrivacy, deletePost } from '../API/Api';
import { useUser } from '../Context/UserContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');

export default function PostDetail() {
  const route = useRoute();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const initialPost = route.params?.post;
  const [post, setPost] = useState(initialPost);
  const [otherPosts, setOtherPosts] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [showPrivacySheet, setShowPrivacySheet] = useState(false);
  const [editingCaption, setEditingCaption] = useState(false);
  const [captionDraft, setCaptionDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const { user: ctxUser } = useUser();
  const [currentUserId, setCurrentUserId] = useState(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const userStr = await AsyncStorage.getItem('userInfo');
        if (userStr && alive) {
          const parsed = JSON.parse(userStr);
          const raw = parsed?.user_id ?? parsed?.userId ?? parsed?.UserId ?? parsed?.id ?? null;
          const n = raw != null ? Number(raw) : null;
          setCurrentUserId(Number.isFinite(n) ? n : null);
        }
      } catch {}
    })();
    return () => { alive = false; };
  }, []);

  const getOwnerId = () => {
    const fromCtx = ctxUser?.user_id ?? ctxUser?.userId ?? ctxUser?.UserId ?? ctxUser?.id;
    const n1 = fromCtx != null ? Number(fromCtx) : null;
    if (Number.isFinite(n1)) return n1;
    const n2 = currentUserId != null ? Number(currentUserId) : null;
    return Number.isFinite(n2) ? n2 : null;
  };
  const isOwner = (p) => {
    const uid = getOwnerId();
    const pidRaw = p?.user?.id;
    const pid = pidRaw != null ? Number(pidRaw) : null;
    return Number.isFinite(uid) && Number.isFinite(pid) && uid === pid;
  };

  // Load other posts of this user (excluding current)
  useEffect(() => {
    let alive = true;
    (async () => {
      const uid = post?.user?.id;
      if (!uid) return;
      try {
        const list = await getUserPostsById(uid);
        const others = (Array.isArray(list) ? list : []).filter(x => x.id !== post.id);
        if (alive) setOtherPosts(others);
      } catch {}
    })();
    return () => { alive = false; };
  }, [post?.user?.id, post?.id]);

  const onRefreshOthers = async () => {
    try {
      setRefreshing(true);
      const uid = post?.user?.id;
      if (!uid) return;
      const list = await getUserPostsById(uid);
      const others = (Array.isArray(list) ? list : []).filter(x => x.id !== post.id);
      setOtherPosts(others);
    } finally { setRefreshing(false); }
  };

  const image = useMemo(() => (post?.media||[]).find(m => (m.type||'').toLowerCase()==='image'), [post]);
  const video = useMemo(() => (post?.media||[]).find(m => (m.type||'').toLowerCase()==='video'), [post]);

  // Tạo video player cho main post nếu có video
  const videoPlayer = useVideoPlayer(video?.url || null, (player) => {
    if (player && video) {
      player.loop = false;
      player.muted = false;
    }
  });

  const closeAllOverlays = () => {
    setShowOptions(false);
    setShowPrivacySheet(false);
    setEditingCaption(false);
    setCaptionDraft('');
  };

  const pickPrivacy = async (privacyKey) => {
    try {
      if (!post) return;
      setBusy(true);
      const updated = await updatePostPrivacy(post.id, privacyKey);
      setPost(prev => ({ ...prev, privacy: updated?.privacy ?? privacyKey }));
      setShowPrivacySheet(false);
      setShowOptions(false);
    } catch (e) { console.warn('Update privacy error', e); } finally { setBusy(false); }
  };

  const submitCaptionEdit = async () => {
    try {
      if (!post) return;
      setBusy(true);
      const updated = await updatePostCaption(post.id, captionDraft);
      setPost(prev => ({ ...prev, caption: updated?.caption ?? captionDraft }));
      closeAllOverlays();
    } catch (e) { console.warn('Update caption error', e); } finally { setBusy(false); }
  };

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      <View style={[styles.header,{ paddingTop: insets.top }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 8 }}>
          <Ionicons name="chevron-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.title}>Bài đăng</Text>
        <View style={{ width: 32 }} />
      </View>

      {/* Post content like Home */}
      <View style={styles.post}>
        <View style={styles.postHeader}>
          <View style={styles.postHeaderLeft}>
            <Image source={{ uri: post?.user?.avatarUrl || 'https://i.pravatar.cc/150' }} style={styles.postAvatar} />
            <View>
              <Text style={styles.postUsername}>{post?.user?.username || 'user'}</Text>
              <View style={{ flexDirection:'row', alignItems:'center', gap:6 }}>
                <Text style={styles.postLocation}>{new Date(post?.createdAt).toLocaleString()}</Text>
                {!!post?.privacy && (
                  <View style={styles.privacyPill}>
                    <Ionicons name={post.privacy==='private' ? 'lock-closed' : post.privacy==='followers' ? 'people' : 'earth'} size={12} color="#374151" />
                    <Text style={styles.privacyText}>{post.privacy}</Text>
                  </View>
                )}
              </View>
            </View>
          </View>
          <TouchableOpacity onPress={() => setShowOptions(true)}>
            <Text style={styles.moreIcon}>⋯</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.postImageContainer}>
          {image ? (
            <Image source={{ uri: image.url }} style={styles.postImage} />
          ) : video && videoPlayer ? (
            <View>
              <VideoView 
                style={styles.postImage} 
                player={videoPlayer}
                contentFit="cover"
                nativeControls={true}
              />
            </View>
          ) : (
            <View style={[styles.postImage,{justifyContent:'center', alignItems:'center'}]}><Text style={{color:'#fff'}}>Không có media</Text></View>
          )}
        </View>

        <View style={styles.postStats}>
          {editingCaption ? (
            <View style={{ marginTop: 6 }}>
              <Text style={[styles.captionText, { marginBottom: 8 }]}>Chỉnh sửa caption</Text>
              <View style={{ borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8 }}>
                <TextInput style={{ padding: 10, color: '#111827', maxHeight: 120 }} value={captionDraft} onChangeText={setCaptionDraft} multiline placeholder="Nhập caption..." />
              </View>
              <View style={{ flexDirection:'row', gap: 12, marginTop: 8 }}>
                <TouchableOpacity style={styles.primaryBtn} onPress={submitCaptionEdit}><Text style={styles.primaryBtnText}>Lưu</Text></TouchableOpacity>
                <TouchableOpacity style={styles.secondaryBtn} onPress={closeAllOverlays}><Text style={styles.secondaryBtnText}>Hủy</Text></TouchableOpacity>
              </View>
            </View>
          ) : (
            !!post?.caption && <Text style={styles.captionText}>{post.caption}</Text>
          )}
        </View>
      </View>

      {/* Other posts of this user (grid) */}
      <FlatList
        data={otherPosts}
        keyExtractor={(item) => String(item.id)}
        numColumns={3}
        contentContainerStyle={{ paddingBottom: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefreshOthers} />}
        renderItem={({ item }) => {
          const img = (item.media||[]).find(m => (m.type||'').toLowerCase()==='image');
          const vid = (item.media||[]).find(m => (m.type||'').toLowerCase()==='video');
          return (
            <TouchableOpacity style={styles.gridTile} onPress={() => {
              if (vid) {
                const videoPosts = otherPosts.filter(pp => (pp.media||[]).some(mm => (mm.type||'').toLowerCase()==='video'));
                navigation.navigate('Video', { videos: videoPosts.length ? videoPosts : [item], selectedId: item.id });
              } else {
                setPost(item);
              }
            }}>
              {img ? (<Image source={{ uri: img.url }} style={styles.gridImg} />) : vid ? (
                <View style={[styles.gridImg, {backgroundColor:'#000', alignItems:'center', justifyContent:'center'}]}>
                  <Ionicons name="play" size={24} color="#fff" />
                </View>
              ) : (
                <View style={[styles.gridImg,{backgroundColor:'#f3f4f6'}]} />
              )}
            </TouchableOpacity>
          );
        }}
        ListHeaderComponent={<View />}
      />

      {/* Options overlay */}
      {showOptions && (
        <TouchableOpacity activeOpacity={1} style={styles.overlay} onPress={() => setShowOptions(false)}>
          <TouchableOpacity activeOpacity={0.95} style={styles.sheet} onPress={(e)=>e.stopPropagation()}>
            <Text style={styles.sheetTitle}>Tùy chọn</Text>
            {isOwner(post) ? (
              <>
                <TouchableOpacity style={styles.sheetItem} onPress={() => setShowPrivacySheet(true)}>
                  <Text style={styles.sheetItemText}>Chỉnh sửa quyền riêng tư</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.sheetItem} onPress={() => { setEditingCaption(true); setCaptionDraft(post?.caption || ''); }}>
                  <Text style={styles.sheetItemText}>Chỉnh sửa bài đăng</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.sheetItem} onPress={async ()=>{ try { setBusy(true); await deletePost(post.id); setShowOptions(false); navigation.goBack(); } catch(e){ console.warn('Delete error', e); } finally { setBusy(false); } }}>
                  <Text style={[styles.sheetItemText,{ color:'#dc2626' }]}>Xóa bài đăng</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <TouchableOpacity style={styles.sheetItem} onPress={() => setShowOptions(false)}>
                  <Text style={styles.sheetItemText}>Báo cáo</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.sheetItem} onPress={() => setShowOptions(false)}>
                  <Text style={styles.sheetItemText}>Ẩn bài đăng</Text>
                </TouchableOpacity>
              </>
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      )}

      {showOptions && showPrivacySheet && (
        <TouchableOpacity activeOpacity={1} style={styles.overlay} onPress={() => { setShowPrivacySheet(false); }}>
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

      {busy && (
        <View style={styles.busyOverlay}><View style={styles.spinner} /></View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor:'#fff' },
  header: { flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor:'#e5e7eb' },
  title: { fontSize: 18, fontWeight:'700', color:'#111827' },
  post: { marginBottom: 8 },
  postHeader: { flexDirection:'row', justifyContent:'space-between', alignItems:'center', paddingHorizontal: 12, paddingVertical: 10 },
  postHeaderLeft: { flexDirection:'row', alignItems:'center', gap: 10 },
  postAvatar: { width: 32, height: 32, borderRadius: 16 },
  postUsername: { fontSize: 13, fontWeight:'600', color:'#262626' },
  postLocation: { fontSize: 11, color:'#262626' },
  privacyPill: { flexDirection:'row', alignItems:'center', gap:4, paddingHorizontal:6, paddingVertical:2, borderRadius:8, backgroundColor:'#F3F4F6' },
  privacyText: { color:'#374151', fontSize:11, textTransform:'capitalize' },
  moreIcon: { fontSize:24, fontWeight:'700', color:'#262626' },
  postImageContainer: { position:'relative' },
  postImage: { width: '100%', height: 400, backgroundColor:'#F0F0F0' },
  postStats: { paddingHorizontal: 12, paddingVertical: 8 },
  captionText: { fontSize: 14, color:'#111827', lineHeight:20 },
  gridTile: { width: width/3 - 2, height: width/3 - 2, margin: 1 },
  gridImg: { width: '100%', height: '100%' },
  overlay: { position:'absolute', top:0, left:0, right:0, bottom:0, backgroundColor:'rgba(0,0,0,0.4)', justifyContent:'flex-end' },
  sheet: { backgroundColor:'#fff', padding:16, borderTopLeftRadius:16, borderTopRightRadius:16 },
  sheetTitle: { fontSize:16, fontWeight:'700', marginBottom:8 },
  sheetItem: { paddingVertical:12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor:'#e5e7eb' },
  sheetItemText: { fontSize:16, color:'#111827' },
  primaryBtn: { backgroundColor:'#111827', paddingHorizontal:16, paddingVertical:10, borderRadius:8 },
  primaryBtnText: { color:'#fff', fontWeight:'600' },
  secondaryBtn: { backgroundColor:'#f3f4f6', paddingHorizontal:16, paddingVertical:10, borderRadius:8 },
  secondaryBtnText: { color:'#111827', fontWeight:'600' },
  busyOverlay: { position:'absolute', top:0, left:0, right:0, bottom:0, backgroundColor:'rgba(255,255,255,0.5)', justifyContent:'center', alignItems:'center' },
  spinner: { width:40, height:40, borderRadius:20, borderWidth:4, borderColor:'#111827', borderTopColor:'transparent' },
});
