import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, Image, StyleSheet, ScrollView, TouchableOpacity, Dimensions, RefreshControl, FlatList, Modal, Alert } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { getUserPostsById, getUserProfile, followUser, unfollowUser, API_BASE_URL, blockUser, unblockUser, getBlockedUsers } from '../API/Api';
import { useFollow } from '../Context/FollowContext';
import { Ionicons } from '@expo/vector-icons';
import * as VideoThumbnails from 'expo-video-thumbnails';
import * as Clipboard from 'expo-clipboard';

const { width } = Dimensions.get('window');
const imageSize = (width - 6) / 3;

export default function UserProfilePublic() {
  const route = useRoute();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const userId = route.params?.userId;
  const { markAsFollowed, markAsUnfollowed, isFollowed: isFollowedGlobal } = useFollow();
  const [posts, setPosts] = useState([]);
  const [profile, setProfile] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [videoThumbs, setVideoThumbs] = useState({});
  const [isFollowing, setIsFollowing] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [userInfoModalVisible, setUserInfoModalVisible] = useState(false);

  // Format number helper function (phải định nghĩa trước khi dùng trong useMemo)
  const formatNumber = (num) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1).replace('.0', '') + ' triệu';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1).replace('.0', '') + 'K';
    }
    return num.toString();
  };

  // Build full URL for avatar when API returns relative path
  const getAvatarUri = useMemo(() => {
    return (avatarUrl) => {
      if (!avatarUrl) return null;
      if (avatarUrl.startsWith('http')) return avatarUrl;
      return `${API_BASE_URL}${avatarUrl}`;
    };
  }, []);

  // Memoize avatar URI
  const avatarUri = useMemo(() => getAvatarUri(profile?.avatarUrl), [profile?.avatarUrl, getAvatarUri]);

  // Memoize formatted stats để tránh tính toán lại
  const formattedStats = useMemo(() => ({
    posts: formatNumber(profile?.postsCount || 0),
    followers: formatNumber(profile?.followersCount || 0),
    following: formatNumber(profile?.followingCount || 0),
  }), [profile?.postsCount, profile?.followersCount, profile?.followingCount]);

  // Load profile and posts
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [profileData, postsData] = await Promise.all([
          getUserProfile(userId),
          getUserPostsById(userId),
        ]);
        if (alive) {
          setProfile(profileData || null);
          setPosts(Array.isArray(postsData) ? postsData : []);
          // Đồng bộ với global context
          const isFollowingFromAPI = profileData?.isFollowing || false;
          const isFollowingFromGlobal = isFollowedGlobal(userId);
          // Ưu tiên global context nếu khác với API (vì user có thể đã follow/unfollow ở trang khác)
          const finalFollowStatus = isFollowingFromGlobal !== undefined ? isFollowingFromGlobal : isFollowingFromAPI;
          setIsFollowing(finalFollowStatus);
          
          // Đồng bộ ngược lại vào global context nếu API trả về isFollowing
          if (isFollowingFromAPI && !isFollowingFromGlobal) {
            markAsFollowed(userId);
          }
        }
      } catch (e) {
        console.warn('User profile/posts error', e);
      }
    })();
    // check if this user is in our blocked list
    (async () => {
      try {
        const list = await getBlockedUsers();
        const found = Array.isArray(list) && list.some(u => u.userId === userId);
        setIsBlocked(!!found);
      } catch (e) {
        console.warn('Failed to fetch blocked list', e);
      }
    })();
    return () => { alive = false; };
  }, [userId, isFollowedGlobal, markAsFollowed]);

  // Tạo thumbnail cho các bài video của user
  useEffect(() => {
    let alive = true;
    (async () => {
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
          console.warn('[USER-PROFILE] gen thumbnail failed', post.id, e);
        }
      }
    })();
    return () => { alive = false; };
  }, [posts]); // Chỉ chạy khi posts thay đổi, không phụ thuộc videoThumbs

  const handleFollow = async () => {
    try {
      if (isFollowing) {
        // Show unfollow confirmation
        Alert.alert(
          'Hủy theo dõi',
          `Bạn có chắc muốn hủy theo dõi ${profile?.username || 'người dùng này'}?`,
          [
            { text: 'Không', style: 'cancel' },
            {
              text: 'Hủy theo dõi',
              style: 'destructive',
              onPress: async () => {
                await unfollowUser(userId);
                setIsFollowing(false);
                // Update global follow context (đồng bộ với Home và Video)
                markAsUnfollowed(userId);
                // Refresh profile to update follower count
                const updatedProfile = await getUserProfile(userId);
                setProfile(updatedProfile);
              },
            },
          ]
        );
      } else {
        await followUser(userId);
        setIsFollowing(true);
        // Update global follow context (đồng bộ với Home và Video)
        markAsFollowed(userId);
        // Refresh profile to update follower count
        const updatedProfile = await getUserProfile(userId);
        setProfile(updatedProfile);
      }
    } catch (e) {
      Alert.alert('Lỗi', e.message || 'Không thể thực hiện thao tác');
    }
  };

  const handleMessage = () => {
    navigation.navigate('Messenger');
    // TODO: Navigate to specific chat with this user
  };

  const handleMenuPress = () => {
    setMenuVisible(true);
  };

  const handleBlock = () => {
    setMenuVisible(false);
    if (isBlocked) {
      // Unblock flow
      Alert.alert(
        'Bỏ chặn',
        `Bạn có muốn bỏ chặn ${profile?.username || 'người dùng này'}?`,
        [
          { text: 'Không', style: 'cancel' },
          {
            text: 'Bỏ chặn',
            onPress: async () => {
              try {
                await unblockUser(userId);
                setIsBlocked(false);
                Alert.alert('Đã bỏ chặn', 'Người dùng đã được bỏ chặn');
              } catch (e) {
                Alert.alert('Lỗi', e.message || 'Không thể bỏ chặn');
              }
            }
          }
        ]
      );
      return;
    }

    // Block flow
    Alert.alert(
      'Chặn người dùng',
      `Bạn có chắc muốn chặn ${profile?.username || 'người dùng này'}?`,
      [
        { text: 'Không', style: 'cancel' },
        {
          text: 'Chặn',
          style: 'destructive',
          onPress: async () => {
            try {
              await blockUser(userId);
              setIsBlocked(true);
              // Update global follow state
              markAsUnfollowed(userId);
              // Navigate back to home/main feed
              navigation.navigate('MainTabs', { screen: 'Home' });
            } catch (e) {
              Alert.alert('Lỗi', e.message || 'Không thể chặn user');
            }
          },
        },
      ]
    );
  };

  const handleCopyUsername = async () => {
    if (profile?.username) {
      await Clipboard.setStringAsync('@' + profile.username);
      Alert.alert('Đã sao chép', `@${profile.username}`);
    }
  };

  const onPressPost = (post) => {
    const isVideo = (post.media||[]).some(m => (m.type||'').toLowerCase()==='video');
    if (isVideo) {
      navigation.navigate('MainTabs', { 
        screen: 'Video',
        params: {
          selectedId: post.id,
          userId: profile?.userId || userId,
          username: profile?.username || 'user',
          avatarUrl: profile?.avatarUrl || null
        }
      });
    } else {
      // Truyền index của post vào PostDetail
      const index = posts.findIndex(p => p.id === post.id);
      navigation.navigate('PostDetail', { post, initialIndex: index });
    }
  };

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={28} color="#111827" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={styles.headerUsername}>{profile?.username || 'user'}</Text>
            {/* Verified badge cho Business accounts */}
            {profile?.accountType === "Business" && (
              <Ionicons name="checkmark-circle" size={16} color="#0095f6" style={{ marginLeft: 4 }} />
            )}
          </View>
        </View>
        <TouchableOpacity style={styles.moreButton} onPress={handleMenuPress}>
          <Ionicons name="ellipsis-vertical" size={24} color="#111827" />
        </TouchableOpacity>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={async()=>{ 
              setRefreshing(true); 
              try { 
                const [profileData, postsData] = await Promise.all([
                  getUserProfile(userId),
                  getUserPostsById(userId),
                ]);
                setProfile(profileData || null);
                setPosts(Array.isArray(postsData)?postsData:[]);
                setIsFollowing(profileData?.isFollowing || false);
              } finally { 
                setRefreshing(false);
              } 
            }} 
          />
        }
      >
        {/* Profile Info Section */}
        <View style={styles.profileSection}>
          {/* Avatar and Stats Row */}
          <View style={styles.profileTopRow}>
            {/* Avatar */}
            <View style={styles.avatarContainer}>
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, { backgroundColor:'#e5e7eb' }]}>
                  <Ionicons name="person" size={40} color="#9ca3af" />
                </View>
              )}
            </View>

            {/* Stats */}
            <View style={styles.statsContainer}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{formattedStats.posts}</Text>
                <Text style={styles.statLabel}>bài viết</Text>
              </View>
              <TouchableOpacity 
                style={styles.statItem}
                onPress={() => navigation.navigate('FollowList', { 
                  userId: userId, 
                  type: 'followers',
                  username: profile?.username 
                })}
              >
                <Text style={styles.statNumber}>{formattedStats.followers}</Text>
                <Text style={styles.statLabel}>người theo dõi</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.statItem}
                onPress={() => navigation.navigate('FollowList', { 
                  userId: userId, 
                  type: 'following',
                  username: profile?.username 
                })}
              >
                <Text style={styles.statNumber}>{formattedStats.following}</Text>
                <Text style={styles.statLabel}>đang theo dõi</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Display Name and Bio */}
          <View style={styles.bioSection}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={styles.displayName}>{profile?.fullName || profile?.username || ''}</Text>
              {/* Verified badge for Business accounts */}
              {profile?.accountType === "Business" && (
                <Ionicons name="checkmark-circle" size={18} color="#0095f6" style={{ marginLeft: 6 }} />
              )}
            </View>
            {profile?.bio && (
              <Text style={styles.bioText}>{profile.bio}</Text>
            )}
            {profile?.website && (
              <TouchableOpacity>
                <Text style={styles.websiteLink}>{profile.website}</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtonsRow}>
            {/* Hide follow button if this user is blocked; only show follow when not blocked */}
            {!isBlocked && (
              <TouchableOpacity 
                style={[styles.actionButton, styles.followButton, isFollowing && styles.followingButton]} 
                onPress={handleFollow}
              >
                <Text style={[styles.actionButtonText, isFollowing && styles.followingButtonText]}>
                  {isFollowing ? 'Đang theo dõi' : 'Theo dõi'}
                </Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity 
              style={[styles.actionButton, styles.messageButton]} 
              onPress={handleMessage}
            >
              <Text style={styles.actionButtonText}>Nhắn tin</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.shareButton}>
              <Ionicons name="person-add-outline" size={18} color="#111827" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Posts Grid */}
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

      {/* Menu Modal (3 dots) */}
      <Modal
        visible={menuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setMenuVisible(false)}
        >
          <View style={styles.menuModal}>
            <TouchableOpacity 
              style={styles.menuItem} 
              onPress={() => {
                setMenuVisible(false);
                handleFollow();
              }}
            >
              <Text style={styles.menuItemText}>
                {isFollowing ? 'Hủy theo dõi' : 'Theo dõi'}
              </Text>
            </TouchableOpacity>
            
            <View style={styles.menuDivider} />
            
            <TouchableOpacity 
              style={styles.menuItem}
              onPress={() => {
                setMenuVisible(false);
                setUserInfoModalVisible(true);
              }}
            >
              <Text style={styles.menuItemText}>Xem thông tin người dùng</Text>
            </TouchableOpacity>
            
            <View style={styles.menuDivider} />
            
            <TouchableOpacity 
              style={styles.menuItem}
              onPress={handleBlock}
            >
              <Text style={[styles.menuItemText, { color: isBlocked ? '#2563eb' : '#ef4444' }]}>{isBlocked ? 'Bỏ chặn' : 'Chặn'}</Text>
            </TouchableOpacity>
            
            <View style={styles.menuDivider} />
            
            <TouchableOpacity 
              style={styles.menuItem}
              onPress={() => setMenuVisible(false)}
            >
              <Text style={styles.menuItemText}>Hủy</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* User Info Modal */}
      <Modal
        visible={userInfoModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setUserInfoModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.userInfoModal}>
            <View style={styles.userInfoHeader}>
              <Text style={styles.userInfoTitle}>Thông tin người dùng</Text>
              <TouchableOpacity onPress={() => setUserInfoModalVisible(false)}>
                <Ionicons name="close" size={28} color="#111827" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.userInfoContent} showsVerticalScrollIndicator={false}>
              {/* Avatar */}
              <View style={styles.infoSection}>
                <Text style={styles.infoLabel}>Ảnh đại diện</Text>
                <View style={styles.infoAvatarContainer}>
                  {avatarUri ? (
                    <Image source={{ uri: avatarUri }} style={styles.infoAvatar} />
                  ) : (
                    <View style={[styles.infoAvatar, { backgroundColor:'#e5e7eb', justifyContent:'center', alignItems:'center' }]}>
                      <Ionicons name="person" size={50} color="#9ca3af" />
                    </View>
                  )}
                </View>
              </View>

              {/* Full Name */}
              <View style={styles.infoSection}>
                <Text style={styles.infoLabel}>Tên</Text>
                <Text style={styles.infoValue}>{profile?.fullName || 'Chưa cập nhật'}</Text>
              </View>

              {/* Username (copyable) */}
              <View style={styles.infoSection}>
                <Text style={styles.infoLabel}>Tên người dùng</Text>
                <TouchableOpacity onPress={handleCopyUsername} style={styles.copyableRow}>
                  <Text style={styles.infoValue}>@{profile?.username || ''}</Text>
                  <Ionicons name="copy-outline" size={20} color="#6b7280" style={{marginLeft:8}} />
                </TouchableOpacity>
              </View>

              {/* Gender */}
              <View style={styles.infoSection}>
                <Text style={styles.infoLabel}>Giới tính</Text>
                <Text style={styles.infoValue}>{profile?.gender || 'Chưa cập nhật'}</Text>
              </View>

              {/* Website */}
              <View style={styles.infoSection}>
                <Text style={styles.infoLabel}>Website</Text>
                <Text style={styles.infoValue}>{profile?.website || 'Chưa cập nhật'}</Text>
              </View>

              {/* Hometown */}
              <View style={styles.infoSection}>
                <Text style={styles.infoLabel}>Quê quán</Text>
                <Text style={styles.infoValue}>{profile?.hometown || 'Chưa cập nhật'}</Text>
              </View>

              {/* Bio */}
              <View style={styles.infoSection}>
                <Text style={styles.infoLabel}>Tiểu sử</Text>
                <Text style={styles.infoValue}>{profile?.bio || 'Chưa cập nhật'}</Text>
              </View>

              {/* Address */}
              <View style={styles.infoSection}>
                <Text style={styles.infoLabel}>Địa chỉ</Text>
                <Text style={styles.infoValue}>{profile?.address || 'Chưa cập nhật'}</Text>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor:'#fff' 
  },
  header: {
    flexDirection:'row', 
    alignItems:'center', 
    justifyContent:'space-between',
    paddingHorizontal: 12, 
    paddingVertical: 8, 
    borderBottomWidth: StyleSheet.hairlineWidth, 
    borderBottomColor:'#e5e7eb'
  },
  backButton: {
    padding: 4,
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerUsername: { 
    fontSize: 18, 
    fontWeight:'700', 
    color:'#111827' 
  },
  moreButton: {
    padding: 4,
  },
  profileSection: {
    paddingTop: 16,
  },
  profileTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  avatarContainer: {
    marginRight: 20,
  },
  avatar: { 
    width: 88, 
    height: 88, 
    borderRadius: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  statLabel: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
  },
  bioSection: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  displayName: { 
    fontSize: 14,
    fontWeight:'700', 
    color:'#111827',
    marginBottom: 4,
  },
  bioText: {
    fontSize: 14,
    color: '#111827',
    lineHeight: 20,
    marginBottom: 4,
  },
  bioLink: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  websiteLink: {
    fontSize: 14,
    color: '#00376b',
    fontWeight: '600',
  },
  actionButtonsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 12,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  followButton: {
    backgroundColor: '#0095F6',
  },
  followingButton: {
    backgroundColor: '#e5e7eb',
  },
  messageButton: {
    backgroundColor: '#e5e7eb',
  },
  shareButton: {
    backgroundColor: '#e5e7eb',
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  followingButtonText: {
    color: '#111827',
  },
  highlightsSection: {
    marginBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e7eb',
    paddingBottom: 16,
  },
  highlightItem: {
    alignItems: 'center',
    marginRight: 16,
    width: 64,
  },
  highlightCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    padding: 2,
    marginBottom: 4,
  },
  highlightImage: {
    width: '100%',
    height: '100%',
    borderRadius: 28,
  },
  highlightName: {
    fontSize: 12,
    color: '#111827',
    textAlign: 'center',
  },
  grid: { 
    flexDirection:'row', 
    flexWrap:'wrap' 
  },
  tile: { 
    width: imageSize, 
    height: imageSize, 
    borderWidth: 1, 
    borderColor:'#fff' 
  },
  tileImage: { 
    width: '100%', 
    height: '100%' 
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  menuModal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 40,
  },
  menuItem: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  menuItemText: {
    fontSize: 16,
    color: '#111827',
    fontWeight: '500',
  },
  menuDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#e5e7eb',
    marginHorizontal: 16,
  },
  userInfoModal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    height: '85%',
    paddingTop: 16,
  },
  userInfoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e7eb',
  },
  userInfoTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  userInfoContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  infoSection: {
    marginBottom: 20,
  },
  infoLabel: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 6,
    fontWeight: '600',
  },
  infoValue: {
    fontSize: 16,
    color: '#111827',
  },
  infoAvatarContainer: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  infoAvatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  copyableRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
