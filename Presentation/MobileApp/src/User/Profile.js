import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  StatusBar,
  Dimensions,
  RefreshControl,
  
} from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import * as VideoThumbnails from 'expo-video-thumbnails';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getMyPosts, getProfile, updateAvatar, API_BASE_URL, getBlockedUsers, unblockUser } from '../API/Api';
import { useUser } from '../Context/UserContext';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { onTabTriple } from '../Utils/TabRefreshEmitter';

const { width } = Dimensions.get('window');
const imageSize = (width - 6) / 3;

const Profile = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { logout, user } = useUser();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [blockedListVisible, setBlockedListVisible] = useState(false);
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [hasStory, setHasStory] = useState(false);
  const [storyData, setStoryData] = useState(null);
  const [isStoryViewed, setIsStoryViewed] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [showAvatarMenu, setShowAvatarMenu] = useState(false);
  const [videoThumbs, setVideoThumbs] = useState({}); // { [postId]: uri }

  // Build full URL for avatar when API returns relative path
  // Return null when missing so callers can render a consistent placeholder
  const getAvatarUri = useMemo(() => {
    return (p) => {
      const raw = p?.avatarUrl;
      console.log('[Profile] getAvatarUri - raw avatarUrl:', raw, 'type:', typeof raw);
      if (!raw) return null;
      // ✅ FIX: Handle object avatarUrl
      if (typeof raw === 'object') {
        const extracted = raw.uri || raw.url || null;
        if (!extracted) return null;
        const str = String(extracted);
        if (str.startsWith('http')) return str;
        const fullUrl = `${API_BASE_URL}${str}`;
        console.log('[Profile] Object avatarUrl converted to:', fullUrl);
        return fullUrl;
      }
      const rawStr = String(raw);
      if (rawStr.startsWith('http')) {
        console.log('[Profile] Already full URL:', rawStr);
        return rawStr;
      }
      const fullUrl = `${API_BASE_URL}${rawStr}`;
      console.log('[Profile] Relative URL converted to:', fullUrl);
      return fullUrl;
    };
  }, []);

  // Memoize avatar URI để tránh tính toán lại mỗi lần render
  const avatarUri = useMemo(() => getAvatarUri(profile), [profile, getAvatarUri]);

  // Check user story from AsyncStorage
  const checkUserStory = async (userId) => {
    try {
      const savedStories = await AsyncStorage.getItem('currentUserStories');
      if (savedStories) {
        let storiesArray = JSON.parse(savedStories);
        
        // Filter expired stories (24h)
        const now = Date.now();
        const validStories = storiesArray.filter(s => {
          const age = now - new Date(s.createdAt).getTime();
          return age < 24 * 60 * 60 * 1000;
        });
        
        if (validStories.length > 0) {
          setHasStory(true);
          setStoryData(validStories);
          
          // Check if viewed
          const viewedStories = await AsyncStorage.getItem('viewedStories');
          const viewedList = viewedStories ? JSON.parse(viewedStories) : [];
          const allViewed = validStories.every(story => 
            viewedList.some(v => v.storyId === story.id && v.userId === 'me')
          );
          setIsStoryViewed(allViewed);
        } else {
          setHasStory(false);
          setStoryData(null);
          await AsyncStorage.removeItem('currentUserStories');
        }
      } else {
        setHasStory(false);
        setStoryData(null);
      }
    } catch (e) {
      console.warn('[Profile] Error checking story:', e);
    }
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        // Load user ID
        const userStr = await AsyncStorage.getItem('userInfo');
        if (userStr) {
          const user = JSON.parse(userStr);
          const uid = user?.user_id ?? user?.userId ?? user?.UserId ?? user?.id;
          if (mounted && uid) {
            setCurrentUserId(uid);
            await checkUserStory(uid);
          }
        }

        const [p, me] = await Promise.all([
          getMyPosts(),
          getProfile(),
        ]);
        console.log('[Profile] Loaded profile data:', JSON.stringify(me, null, 2));
        if (mounted) {
          setPosts(Array.isArray(p) ? p : []);
          setProfile(me || null);
        }
      } catch (e) {
        console.warn('My posts error', e);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // Listen for screen focus to refresh story
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', async () => {
      if (currentUserId) {
        await checkUserStory(currentUserId);
      }
    });
    return unsubscribe;
  }, [navigation, currentUserId]);

  // subscribe to triple-tap refresh on Profile tab
  useEffect(() => {
    const unsub = onTabTriple('Profile', async () => {
      try {
        setRefreshing(true);
        const [p, me] = await Promise.all([getMyPosts(), getProfile()]);
        setPosts(Array.isArray(p) ? p : []);
        setProfile(me || null);
        if (currentUserId) await checkUserStory(currentUserId);
      } catch (e) { console.warn('[Profile] triple refresh', e); }
      finally { setRefreshing(false); }
    });
    return unsub;
  }, [currentUserId]);

  // Tạo thumbnail cho các bài video để lưới không hiển thị màu đen
  useEffect(() => {
    let alive = true;
    (async () => {
      // Lọc danh sách bài video chưa có thumbnail
      const targets = (posts || []).filter(
        (p) => (p.media || []).some((m) => (m.type || '').toLowerCase() === 'video') && !videoThumbs[p.id]
      );
      
      if (targets.length === 0) return; // Không có video mới cần tạo thumbnail
      
      // Tạo thumbnail tuần tự với delay để tránh blocking UI
      for (let i = 0; i < targets.length; i++) {
        if (!alive) break;
        
        const post = targets[i];
        try {
          const vid = (post.media || []).find((m) => (m.type || '').toLowerCase() === 'video');
          if (!vid?.url) continue;
          
          const { uri } = await VideoThumbnails.getThumbnailAsync(vid.url, { time: 1000 });
          if (alive && uri) {
            setVideoThumbs((prev) => ({ ...prev, [post.id]: uri }));
          }
          
          // Delay nhỏ giữa các video để không block UI
          if (i < targets.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        } catch (e) {
          console.warn('[PROFILE] generate thumbnail failed for', post.id, e);
        }
      }
    })();
    return () => { alive = false; };
  }, [posts]); // Chỉ chạy khi posts thay đổi, không phụ thuộc videoThumbs

  // Load blocked users when the blocked list sheet is opened
  useEffect(() => {
    let alive = true;
    if (!blockedListVisible) return;
    (async () => {
      try {
        const list = await getBlockedUsers();
        if (!alive) return;
        setBlockedUsers(Array.isArray(list) ? list : []);
      } catch (e) {
        console.warn('[Profile] fetch blocked users failed', e);
      }
    })();
    return () => { alive = false; };
  }, [blockedListVisible]);

  const handleUnblock = async (userId) => {
    try {
      await unblockUser(userId);
      setBlockedUsers(prev => prev.filter(u => u.userId !== userId && u.userId !== u.id));
    } catch (e) {
      console.warn('Unblock failed', e);
      alert('Không thể bỏ chặn');
    }
  };

  const handleAvatarPress = () => {
    if (hasStory) {
      // Có story -> hiện menu chọn
      setShowAvatarMenu(true);
    } else {
      // Không có story -> đổi avatar luôn
      handlePickAvatar();
    }
  };

  const handleViewStory = async () => {
    setShowAvatarMenu(false);
    if (hasStory && storyData) {
      navigation.navigate('StoryViewer', { 
        paramStories: storyData 
      });

      // Mark as viewed
      try {
        const viewedStories = await AsyncStorage.getItem('viewedStories');
        const viewedList = viewedStories ? JSON.parse(viewedStories) : [];
        
        storyData.forEach(story => {
          const exists = viewedList.some(v => v.storyId === story.id && v.userId === 'me');
          if (!exists) {
            viewedList.push({
              storyId: story.id,
              userId: 'me',
              viewedAt: new Date().toISOString()
            });
          }
        });
        
        await AsyncStorage.setItem('viewedStories', JSON.stringify(viewedList));
        setIsStoryViewed(true);
      } catch (e) {
        console.warn('[Profile] Error saving view status:', e);
      }
    }
  };

  const handlePickAvatar = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      alert('Cần quyền truy cập thư viện ảnh để đổi avatar');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1,1],
      quality: 0.9,
    });
    if (result.canceled) return;
    const asset = result.assets?.[0];
    if (!asset?.uri) return;
    try {
      const res = await updateAvatar({ uri: asset.uri, name: 'avatar.jpg', type: 'image/jpeg', createPost: false });
      const newUrl = res?.data?.avatarUrl;
      if (newUrl) setProfile(prev => (prev ? { ...prev, avatarUrl: newUrl } : prev));
    } catch (e) {
      console.warn('Update avatar error', e);
      alert('Đổi avatar thất bại');
    }
  };

  return (
    <SafeAreaView edges={['top']} style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          {profile?.isPrivate ? (
            <Ionicons name="lock-closed" size={16} color="#000" />
          ) : null}
          <Text style={styles.username}>{profile?.username || 'username'}</Text>
          {profile?.accountType === "Business" && (
            <Ionicons name="checkmark-circle" size={16} color="#0095f6" style={{ marginLeft: 4 }} />
          )}
          <Ionicons name="chevron-down" size={16} color="#000" style={styles.chevron} />
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.headerIcon} onPress={() => setMenuOpen(v => !v)}>
            <Feather name="menu" size={24} color="#000" />
          </TouchableOpacity>
        </View>
      </View>
      {/* Menu modal - tap outside to dismiss */}
      <Modal visible={menuOpen} transparent animationType="fade" onRequestClose={() => setMenuOpen(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setMenuOpen(false)}>
          <View style={styles.menuSheet}>
            <TouchableOpacity style={styles.menuItem} onPress={() => { setMenuOpen(false); navigation.navigate('Editprofile'); }}>
              <Text style={styles.menuText}>Xem/Chỉnh sửa thông tin</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={() => { setMenuOpen(false); navigation.navigate('ChangePassword'); }}>
              <Text style={styles.menuText}>Đổi mật khẩu</Text>
            </TouchableOpacity>
            {/* CHỈ hiển thị nút đăng ký Business nếu tài khoản hiện tại là User */}
            {profile?.accountType !== "Business" && (
              <TouchableOpacity style={styles.menuItem} onPress={() => { setMenuOpen(false); navigation.navigate('BusinessUpgradeTerms'); }}>
                <Text style={styles.menuText}>Đăng ký tài khoản doanh nghiệp</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.menuItem} onPress={() => { setMenuOpen(false); setBlockedListVisible(true); }}>
              <Text style={styles.menuText}>Danh sách chặn</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={() => { setMenuOpen(false); logout(); }}>
              <Text style={[styles.menuText, { color: '#ef4444' }]}>Đăng xuất</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Blocked users modal */}
      <Modal visible={blockedListVisible} transparent animationType="slide" onRequestClose={() => setBlockedListVisible(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setBlockedListVisible(false)}>
          {/* inner sheet stops propagation so presses inside don't close the modal */}
          <TouchableOpacity activeOpacity={1} style={styles.blockedListModal} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.sheetTitle}>Danh sách chặn</Text>
            {blockedUsers.length === 0 ? (
              <View style={{ padding: 20 }}>
                <Text style={{ color: '#6b7280' }}>Chưa có người bị chặn</Text>
              </View>
            ) : (
              blockedUsers.map((u) => {
                const uid = u.userId || u.id;
                const av = getAvatarUri(u);
                return (
                  <TouchableOpacity
                    key={uid}
                    style={styles.blockedRow}
                    activeOpacity={0.8}
                    onPress={() => {
                      // Open public profile so the user can optionally unblock there
                      navigation.navigate('UserProfilePublic', { userId: uid });
                      setBlockedListVisible(false);
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      {av ? (
                        <Image source={{ uri: av }} style={styles.blockedAvatar} />
                      ) : (
                        <View style={[styles.blockedAvatar, { justifyContent: 'center', alignItems: 'center', backgroundColor: '#f3f4f6' }]}>
                          <Ionicons name="person" size={20} color="#9ca3af" />
                        </View>
                      )}
                      <View style={{ marginLeft: 12 }}>
                        <Text style={styles.blockedName}>{u.username || u.fullName || u.name}</Text>
                        {u.fullName ? <Text style={{ color: '#6b7280', fontSize: 12 }}>{u.fullName}</Text> : null}
                      </View>
                    </View>

                    <TouchableOpacity onPress={() => handleUnblock(uid)} style={styles.unblockButton}>
                      <Text style={styles.unblockText}>Bỏ chặn</Text>
                    </TouchableOpacity>
                  </TouchableOpacity>
                );
              })
            )}

            <TouchableOpacity style={[styles.menuItem, { marginTop: 8 }]} onPress={() => setBlockedListVisible(false)}>
              <Text style={styles.menuText}>Đóng</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      <ScrollView 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={{ paddingBottom: 16 }}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing}
            onRefresh={async () => {
              try {
                setRefreshing(true);
                const [p, me] = await Promise.all([
                  getMyPosts(),
                  getProfile(),
                ]);
                setPosts(Array.isArray(p) ? p : []);
                setProfile(me || null);
                if (currentUserId) await checkUserStory(currentUserId);
              } catch (e) { 
                console.warn('Profile refresh error', e); 
              } finally { 
                setRefreshing(false); 
              }
            }}
          />
        }
      >
        {/* Profile Info */}
        <View style={styles.profileSection}>
          <View style={styles.profileHeader}>
            <TouchableOpacity 
              onPress={handleAvatarPress} 
              activeOpacity={0.8}
              style={{ position: 'relative' }}
            >
              {/* Story ring container */}
              <View style={[
                styles.avatarRingContainer,
                hasStory && styles.avatarRingActive,
                hasStory && !isStoryViewed && styles.avatarRingUnviewed
              ]}>
                {avatarUri ? (
                  <Image
                    source={{ uri: avatarUri }}
                    style={styles.profileImage}
                  />
                ) : (
                  <View style={[styles.profileImage, { justifyContent: 'center', alignItems: 'center', backgroundColor: '#e5e7eb' }]}>
                    <Ionicons name="person" size={40} color="#9ca3af" />
                  </View>
                )}
              </View>
              
              {/* Story indicator dot */}
              {hasStory && !isStoryViewed && (
                <View style={styles.storyIndicator} />
              )}
            </TouchableOpacity>
            
            <View style={styles.statsContainer}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{profile?.postCount ?? posts.length ?? 0}</Text>
                <Text style={styles.statLabel}>Posts</Text>
              </View>
              <TouchableOpacity 
                style={styles.statItem}
                onPress={() => navigation.navigate('FollowList', { 
                  userId: profile?.userId, 
                  type: 'followers',
                  username: profile?.username 
                })}
              >
                <Text style={styles.statNumber}>{profile?.followerCount ?? 0}</Text>
                <Text style={styles.statLabel}>Followers</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.statItem}
                onPress={() => navigation.navigate('FollowList', { 
                  userId: profile?.userId, 
                  type: 'following',
                  username: profile?.username 
                })}
              >
                <Text style={styles.statNumber}>{profile?.followingCount ?? 0}</Text>
                <Text style={styles.statLabel}>Following</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.bioSection}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={styles.bioName}>{profile?.fullName || ''}</Text>
              {/* Verified badge for Business accounts */}
              {profile?.accountType === "Business" && (
                <Ionicons name="checkmark-circle" size={18} color="#0095f6" style={{ marginLeft: 6 }} />
              )}
            </View>
            {!!profile?.bio && <Text style={styles.bioText}>{profile.bio}</Text>}
            {!!profile?.website && <Text style={styles.bioText}>{profile.website}</Text>}
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity 
              style={styles.editButton}
              onPress={() => navigation.navigate('Editprofile')}
            >
              <Text style={styles.editButtonText}>Edit Profile</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Tab Bar */}
        <View style={styles.tabBar}>
          <TouchableOpacity style={[styles.tabButton, styles.activeTab]}>
            <Ionicons name="grid-outline" size={24} color="#000" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.tabButton}>
            <Ionicons name="person-outline" size={24} color="#8e8e8e" />
          </TouchableOpacity>
        </View>

        {/* Posts Grid */}
        <View style={styles.postsGrid}>
          {loading ? (
            <Text style={{padding:16, color:'#666'}}>Đang tải...</Text>
          ) : posts.length === 0 ? (
            <Text style={{padding:16}}>Chưa có bài đăng</Text>
          ) : (
            posts.map((post) => {
              const images = (post.media || []).filter(m => (m.type||'').toLowerCase() === 'image');
              const videos = (post.media || []).filter(m => (m.type||'').toLowerCase() === 'video');
              const isVideo = videos.length > 0 && images.length === 0;
              const firstImage = images[0];
              
              const onPress = () => {
                if (isVideo) {
                  navigation.navigate('Video', {
                    selectedId: post.id,
                    userId: post.user?.id || user?.id,
                    username: post.user?.username || user?.username,
                    avatarUrl: post.user?.avatarUrl || user?.avatarUrl
                  });
                } else {
                  // Truyền index của post vào PostDetail
                  const index = posts.findIndex(p => p.id === post.id);
                  navigation.navigate('PostDetail', { post, initialIndex: index });
                }
              };
              
              if (isVideo) {
                return (
                  <TouchableOpacity key={post.id} style={styles.postContainer} onPress={onPress}>
                    <View style={{flex:1}}>
                      {videoThumbs[post.id] ? (
                        <Image source={{ uri: videoThumbs[post.id] }} style={styles.postImage} />
                      ) : (
                        <View style={[styles.postImage, { backgroundColor:'#000' }]} />
                      )}
                      <Ionicons name="play" size={22} color="#fff" style={{ position:'absolute', right:6, bottom:6, opacity:0.9 }} />
                    </View>
                  </TouchableOpacity>
                );
              }
              
              return (
                <TouchableOpacity key={post.id} style={styles.postContainer} onPress={onPress}>
                  <Image source={{ uri: firstImage?.url }} style={styles.postImage} />
                </TouchableOpacity>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* Avatar Action Menu */}
      {showAvatarMenu && (
        <TouchableOpacity 
          activeOpacity={1} 
          style={styles.modalOverlay} 
          onPress={() => setShowAvatarMenu(false)}
        >
          <TouchableOpacity 
            activeOpacity={0.95} 
            style={styles.avatarMenuSheet} 
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={styles.sheetTitle}>Tùy chọn</Text>
            
            <TouchableOpacity 
              style={styles.sheetItem} 
              onPress={handleViewStory}
            >
              <Ionicons name="play-circle-outline" size={20} color="#000" />
              <Text style={styles.sheetItemText}>Xem Story</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.sheetItem, { borderTopWidth: 0 }]} 
              onPress={() => {
                setShowAvatarMenu(false);
                handlePickAvatar();
              }}
            >
              <Ionicons name="camera-outline" size={20} color="#000" />
              <Text style={styles.sheetItemText}>Đổi Avatar</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: '#DBDBDB',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  username: {
    fontSize: 20,
    fontWeight: '600',
    marginLeft: 8,
  },
  chevron: {
    marginLeft: 4,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuSheet: {
    position: 'absolute',
    right: 12,
    top: 56,
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
    zIndex: 10,
  },
  menuItem: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    minWidth: 200,
  },
  menuText: {
    fontSize: 14,
    color: '#111827',
  },
  headerIcon: {
    marginLeft: 16,
  },
  profileSection: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarRingContainer: {
    width: 90,
    height: 90,
    borderRadius: 45,
    padding: 2,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarRingActive: {
    borderWidth: 2.5,
    borderColor: '#FF3B30',
  },
  avatarRingUnviewed: {
    shadowColor: '#FF3B30',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 3,
  },
  profileImage: {
    width: 86,
    height: 86,
    borderRadius: 43,
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  storyIndicator: {
    position: 'absolute',
    top: -2,
    right: 2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#FF3B30',
    borderWidth: 2.5,
    borderColor: '#fff',
  },
  statsContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginLeft: 20,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 18,
    fontWeight: '600',
  },
  statLabel: {
    fontSize: 13,
    color: '#262626',
    marginTop: 2,
  },
  bioSection: {
    marginTop: 12,
  },
  bioName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  bioText: {
    fontSize: 14,
    color: '#262626',
    lineHeight: 18,
  },
  buttonContainer: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 8,
  },
  editButton: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dbdbdb',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  shareButton: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dbdbdb',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  shareButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  storiesSection: {
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: '#DBDBDB',
  },
  storiesContent: {
    paddingHorizontal: 12,
  },
  storyItem: {
    alignItems: 'center',
    marginHorizontal: 8,
    width: 70,
  },
  addStoryCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#dbdbdb',
  },
  storyImageContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    padding: 2,
    borderWidth: 2,
    borderColor: '#dbdbdb',
  },
  storyImage: {
    width: '100%',
    height: '100%',
    borderRadius: 30,
  },
  storyName: {
    fontSize: 12,
    marginTop: 6,
    color: '#262626',
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: '#DBDBDB',
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
  },
  activeTab: {
    borderBottomWidth: 1,
    borderBottomColor: '#000',
  },
  postsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  postContainer: {
    width: imageSize,
    height: imageSize,
    borderWidth: 1,
    borderColor: '#fff',
  },
  postImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#f0f0f0',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },

  blockedListModal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    paddingBottom: 24,
    paddingHorizontal: 16,
    maxHeight: '60%'
  },
  blockedRow: {
    paddingVertical: 12,
    paddingHorizontal: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#eaeaea',
  },
  blockedAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f3f4f6',
  },
  blockedName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  unblockButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  unblockText: {
    color: '#2563eb',
    fontWeight: '600',
  },
  avatarMenuSheet: {
    backgroundColor: '#fff',
    padding: 16,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
    color: '#111827',
  },
  sheetItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    gap: 12,
  },
  sheetItemText: {
    fontSize: 16,
    color: '#111827',
  },
});

export default Profile;
