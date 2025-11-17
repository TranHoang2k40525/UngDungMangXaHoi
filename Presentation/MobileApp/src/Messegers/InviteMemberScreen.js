import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  TextInput,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getFollowing, inviteToGroup, getProfile } from '../API/Api';
import { API_BASE_URL } from '../API/Api';

export default function InviteMemberScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { conversationId, groupName, currentMembers = [], currentUserId: navCurrentUserId = null } = route.params || {};

  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [allFollowing, setAllFollowing] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [invitingUserId, setInvitingUserId] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);

  useEffect(() => {
    loadFollowing();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [searchQuery, allFollowing]);

  const loadFollowing = async () => {
    try {
      setLoading(true);
      
      // Lấy current user ID
      let userId = null;

      // 1) Try route param (passed from GroupDetail)
      if (navCurrentUserId) {
        userId = navCurrentUserId;
      }

      // 2) Try AsyncStorage 'user'
      if (!userId) {
        const userStr = await AsyncStorage.getItem('user');
        if (userStr) {
          try {
            const user = JSON.parse(userStr);
            userId = user.user_id || user.userId || null;
          } catch { userId = null; }
        }
      }

      // 3) Try AsyncStorage 'userInfo'
      if (!userId) {
        const userInfoStr = await AsyncStorage.getItem('userInfo');
        if (userInfoStr) {
          try {
            const ui = JSON.parse(userInfoStr);
            userId = ui.user_id || ui.userId || ui.id || null;
          } catch { userId = null; }
        }
      }

      // 4) Try API getProfile using stored access token
      if (!userId) {
        try {
          const profile = await getProfile();
          if (profile) {
            userId = profile.user_id || profile.userId || profile.id || null;
          }
        } catch (e) {
          // ignore - we'll handle missing user below
        }
      }

      if (!userId) {
        // Could not resolve user id - allow opening screen but show empty list
        console.warn('[InviteMember] No current user id available; showing empty list');
        setCurrentUserId(null);
        setAllFollowing([]);
        setFilteredUsers([]);
        setLoading(false);
        return;
      }

      setCurrentUserId(userId);

      // Lấy danh sách đang theo dõi
      const followingData = await getFollowing(userId);
      
      // Lọc bỏ những người đã là thành viên
      const currentMemberIds = currentMembers.map(m => m.userId);
      const availableUsers = followingData.filter(
        user => !currentMemberIds.includes(user.userId || user.user_id)
      );

      setAllFollowing(availableUsers);
      setFilteredUsers(availableUsers);
    } catch (error) {
      console.error('Load following error:', error);
      Alert.alert('Lỗi', error.message || 'Không thể tải danh sách người theo dõi');
    } finally {
      setLoading(false);
    }
  };

  const filterUsers = () => {
    if (!searchQuery.trim()) {
      setFilteredUsers(allFollowing);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = allFollowing.filter(user => {
      const fullName = (user.fullName || '').toLowerCase();
      const username = (user.username || '').toLowerCase();
      return fullName.includes(query) || username.includes(query);
    });

    setFilteredUsers(filtered);
  };

  const handleInviteUser = async (user) => {
    try {
      setInvitingUserId(user.userId || user.user_id);

      // Xác nhận mời
      Alert.alert(
        'Xác nhận',
        `Bạn có chắc muốn mời ${user.fullName} vào nhóm "${groupName}"?`,
        [
          {
            text: 'Hủy',
            style: 'cancel',
            onPress: () => setInvitingUserId(null),
          },
          {
            text: 'Mời',
            onPress: async () => {
              try {
                const result = await inviteToGroup(conversationId, user.userId || user.user_id);
                
                // Thành công
                Alert.alert(
                  'Thành công',
                  `Đã mời ${user.fullName} vào nhóm`,
                  [
                    {
                      text: 'OK',
                      onPress: () => {
                        // Quay lại màn hình chi tiết nhóm và refresh
                        navigation.goBack();
                      },
                    },
                  ]
                );
              } catch (error) {
                console.error('Invite error:', error);
                
                // Parse error message
                let errorMessage = 'Không thể mời thành viên';
                if (error.message) {
                  if (error.message.includes('not follow each other')) {
                    errorMessage = 'Hai bạn chưa theo dõi lẫn nhau';
                  } else if (error.message.includes('blocked')) {
                    errorMessage = 'Không thể mời do bị chặn';
                  } else if (error.message.includes('message restriction')) {
                    errorMessage = 'Người dùng đã hạn chế nhận tin nhắn';
                  } else if (error.message.includes('maximum capacity')) {
                    errorMessage = 'Nhóm đã đạt giới hạn thành viên';
                  } else if (error.message.includes('already a member')) {
                    errorMessage = 'Người dùng đã là thành viên của nhóm';
                  } else if (error.message.includes('permission')) {
                    errorMessage = 'Bạn không có quyền mời thành viên';
                  } else {
                    errorMessage = error.message;
                  }
                }

                Alert.alert('Không thể mời', errorMessage);
              } finally {
                setInvitingUserId(null);
              }
            },
          },
        ]
      );
    } catch (error) {
      console.error('Invite preparation error:', error);
      setInvitingUserId(null);
    }
  };

  const renderUserItem = ({ item }) => {
    const isInviting = invitingUserId === (item.userId || item.user_id);

    return (
      <TouchableOpacity 
        style={styles.userItem}
        onPress={() => handleInviteUser(item)}
        disabled={isInviting}
      >
        <View style={styles.userAvatar}>
          {(() => {
            const avatar = item.avatarUrl || item.avatar_url || item.avatar || item.imageUrl || item.avatarUrlFull;
            if (avatar) {
              const uri = avatar.startsWith('http') || avatar.startsWith('file://') ? avatar : `${API_BASE_URL}${avatar}`;
              return (
                <Image source={{ uri }} style={styles.avatarImage} />
              );
            }
            return (
              <View style={styles.defaultAvatar}>
                <Text style={styles.avatarText}>
                  {item.fullName?.charAt(0)?.toUpperCase() || 'U'}
                </Text>
              </View>
            );
          })()}
        
        </View>
        
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{item.fullName}</Text>
          <Text style={styles.userUsername}>@{item.username}</Text>
        </View>
        
        {isInviting ? (
          <ActivityIndicator size="small" color="#3B82F6" />
        ) : (
          <TouchableOpacity 
            style={styles.inviteBtn}
            onPress={() => handleInviteUser(item)}
          >
            <Ionicons name="person-add" size={18} color="#3B82F6" />
            <Text style={styles.inviteBtnText}>Mời</Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="people-outline" size={64} color="#D1D5DB" />
      <Text style={styles.emptyTitle}>
        {searchQuery ? 'Không tìm thấy người dùng' : 'Không có người theo dõi'}
      </Text>
      <Text style={styles.emptySubtitle}>
        {searchQuery 
          ? 'Thử tìm kiếm với từ khóa khác' 
          : 'Bạn chưa theo dõi ai hoặc tất cả người theo dõi đã là thành viên'}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="chevron-back" size={24} color="#111827" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Mời thành viên</Text>
          <Text style={styles.headerSubtitle}>{groupName}</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#9CA3AF" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Tìm kiếm người theo dõi..."
          placeholderTextColor="#9CA3AF"
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity 
            style={styles.clearButton}
            onPress={() => setSearchQuery('')}
          >
            <Ionicons name="close-circle" size={20} color="#9CA3AF" />
          </TouchableOpacity>
        )}
      </View>

      {/* Info Banner */}
      <View style={styles.infoBanner}>
        <Ionicons name="information-circle" size={16} color="#3B82F6" />
        <Text style={styles.infoBannerText}>
          Chỉ hiển thị người bạn đang theo dõi chưa là thành viên
        </Text>
      </View>

      {/* User List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Đang tải...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredUsers}
          renderItem={renderUserItem}
          keyExtractor={(item) => (item.userId || item.user_id).toString()}
          contentContainerStyle={
            filteredUsers.length === 0 ? styles.emptyListContainer : styles.listContainer
          }
          ListEmptyComponent={renderEmptyState}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 8,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#111827',
  },
  clearButton: {
    padding: 4,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
  },
  infoBannerText: {
    flex: 1,
    fontSize: 13,
    color: '#3B82F6',
    marginLeft: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
  listContainer: {
    paddingVertical: 8,
  },
  emptyListContainer: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 48,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 8,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  userAvatar: {
    marginRight: 12,
  },
  avatarImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  defaultAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#9CA3AF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  userUsername: {
    fontSize: 13,
    color: '#6B7280',
  },
  inviteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  inviteBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#3B82F6',
    marginLeft: 4,
  },
});
