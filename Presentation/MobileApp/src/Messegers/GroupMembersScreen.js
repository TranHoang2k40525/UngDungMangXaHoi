import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
  RefreshControl,
  TextInput,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getGroupMembers, API_BASE_URL, getGroupInfo } from '../API/Api';
import { removeGroupMember, changeMemberRole } from '../ServicesSingalR/groupChatService';

export default function GroupMembersScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { conversationId, groupName } = route.params;

  const [members, setMembers] = useState([]);
  const [filteredMembers, setFilteredMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentUserId, setCurrentUserId] = useState(null);
  const [currentUserRole, setCurrentUserRole] = useState(null);
  const [groupCreatedBy, setGroupCreatedBy] = useState(null);

  useEffect(() => {
    loadMembers();
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredMembers(members);
    } else {
      const filtered = members.filter(member =>
        (member.username || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (member.fullName || member.full_name || '').toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredMembers(filtered);
    }
  }, [searchQuery, members]);

  const loadMembers = async () => {
    try {
      setLoading(true);
      
      // Lấy current user ID và avatar - SỬA KEY TỪ 'user' THÀNH 'userInfo'
      const userStr = await AsyncStorage.getItem('userInfo');
      let currentUser = null;
      if (userStr) {
        currentUser = JSON.parse(userStr);
        const userId = currentUser.user_id || currentUser.userId || currentUser.UserId || currentUser.id;
        setCurrentUserId(userId);
        console.log('📌 Current user loaded:', { userId, username: currentUser.username });
      }

      // Lấy thông tin nhóm và danh sách thành viên
      const [groupData, membersData] = await Promise.all([
        getGroupInfo(conversationId),
        getGroupMembers(conversationId),
      ]);
      setGroupCreatedBy(groupData?.createdBy || groupData?.created_by || null);
      console.log('📋 Members loaded:', membersData.length);
      
      // Enhance ALL members with avatar - xử lý URI đúng
      const enhancedMembers = membersData.map(member => {
        let avatarUrl = member.avatar || member.avatarUrl;
        
        // Nếu member là current user, dùng avatar từ localStorage
        if (currentUser && (member.userId === currentUser.userId || member.userId === currentUser.user_id || member.userId === currentUser.UserId || member.userId === currentUser.id)) {
          avatarUrl = avatarUrl || currentUser.avatar || currentUser.avatarUrl;
        }
        
        // Xử lý URI: nếu có avatar path từ API, tạo full URL
        if (avatarUrl && !avatarUrl.startsWith('file://') && !avatarUrl.startsWith('http')) {
          avatarUrl = `${API_BASE_URL}${avatarUrl}`;
        }
        
        return {
          ...member,
          avatar: avatarUrl,
          fullName: member.fullName || member.full_name || member.username,
        };
      });
      
      // Sắp xếp: Admin lên đầu, sau đó theo tên
      const sortedMembers = enhancedMembers.sort((a, b) => {
        if (a.role === 'admin' && b.role !== 'admin') return -1;
        if (a.role !== 'admin' && b.role === 'admin') return 1;
        return (a.fullName || '').localeCompare(b.fullName || '');
      });

      setMembers(sortedMembers);
      setFilteredMembers(sortedMembers);
      // Determine current user's role in this group
      if (currentUser) {
        const me = sortedMembers.find(m => Number(m.userId) === Number(currentUser.user_id || currentUser.userId || currentUser.id));
        setCurrentUserRole(me?.role || null);
      }
    } catch (error) {
      console.error('Load members error:', error);
      Alert.alert('Lỗi', error.message || 'Không thể tải danh sách thành viên');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadMembers();
    setRefreshing(false);
  };

  const handleMemberPress = (member) => {
    console.log('========================================');
    console.log('🔍 Member pressed DEBUG:');
    console.log('   Member userId:', member.userId, typeof member.userId);
    console.log('   Member username:', member.username);
    console.log('   Current userId:', currentUserId, typeof currentUserId);
    console.log('   Are equal (===)?', member.userId === currentUserId);
    console.log('   Are equal (Number)?', Number(member.userId) === Number(currentUserId));
    console.log('========================================');
    
    // So sánh theo Number để tránh lỗi string/number
    const isOwnProfile = Number(member.userId) === Number(currentUserId);
    
    if (isOwnProfile) {
      // Nếu là chính mình, navigate đến MainTabs với Profile tab
      console.log('✅ OWN PROFILE DETECTED - Navigating to MainTabs/Profile');
      navigation.navigate('MainTabs', {
        screen: 'Profile'
      });
      return;
    }

    // Nếu current user là admin, hiển thị menu quản lý nhanh
    if (currentUserRole === 'admin') {
      const options = [];
      options.push('Xem hồ sơ');
      const isTargetCreator = groupCreatedBy && Number(member.userId) === Number(groupCreatedBy);
      if (isTargetCreator) {
        // Creator: only allow view profile (no demote/remove)
      } else {
        if (member.role !== 'admin') {
          options.push('Thăng làm Admin');
          options.push('Chuyển quyền Admin');
        } else {
          options.push('Hạ quyền Admin');
        }
        options.push('Xóa khỏi nhóm');
      }
      options.push('Hủy');

      // build buttons with async handlers wrapped in IIFE to allow await
      const buttons = options.map((opt) => {
        return {
          text: opt,
          onPress: () => {
            (async () => {
              try {
                if (opt === 'Xem hồ sơ') {
                  navigation.navigate('UserProfilePublic', { userId: member.userId, username: member.username });
                } else if (opt === 'Thăng làm Admin') {
                  await changeMemberRole(conversationId, member.userId, 'admin', false);
                  Alert.alert('Thành công', 'Đã thăng quyền Admin');
                  await loadMembers();
                } else if (opt === 'Chuyển quyền Admin') {
                  await changeMemberRole(conversationId, member.userId, 'admin', true);
                  Alert.alert('Thành công', 'Đã chuyển quyền Admin');
                  await loadMembers();
                } else if (opt === 'Hạ quyền Admin') {
                  await changeMemberRole(conversationId, member.userId, 'member', false);
                  Alert.alert('Thành công', 'Đã hạ quyền Admin');
                  await loadMembers();
                } else if (opt === 'Xóa khỏi nhóm') {
                  Alert.alert('Xác nhận', 'Bạn có chắc muốn xóa thành viên này khỏi nhóm?', [
                    { text: 'Hủy', style: 'cancel' },
                    { text: 'Xóa', style: 'destructive', onPress: () => {
                      (async () => {
                        try {
                          await removeGroupMember(conversationId, member.userId);
                          Alert.alert('Thành công', 'Đã xóa thành viên');
                          await loadMembers();
                        } catch (err) {
                          console.error('Remove member error:', err);
                          Alert.alert('Lỗi', err.message || 'Không thể xóa thành viên');
                        }
                      })();
                    }}
                  ]);
                }
              } catch (err) {
                console.error('Member action error:', err);
                Alert.alert('Lỗi', err.message || 'Hành động thất bại');
              }
            })();
          }
        };
      });

      Alert.alert(member.fullName || member.username, 'Chọn hành động', buttons, { cancelable: true });
      return;
    }

    // Nếu không phải admin, chỉ xem hồ sơ người đó
    console.log('👤 OTHER PROFILE - Navigating to UserProfilePublic');
    navigation.navigate('UserProfilePublic', { 
      userId: member.userId,
      username: member.username,
    });
  };

  const renderMemberItem = (member, index) => (
    <TouchableOpacity 
      key={member.id || index}
      style={styles.memberItem}
      onPress={() => handleMemberPress(member)}
      activeOpacity={0.7}
    >
      <View style={styles.memberAvatar}>
        {member.avatar || member.avatarUrl ? (
          <Image 
            source={{ uri: member.avatar || member.avatarUrl }} 
            style={styles.avatarImage}
          />
        ) : (
          <View style={styles.defaultMemberAvatar}>
            <Text style={styles.avatarText}>
              {(member.fullName || member.full_name || member.username)?.charAt(0)?.toUpperCase() || 'U'}
            </Text>
          </View>
        )}
        {member.role === 'admin' && (
          <View style={styles.adminBadge}>
            <Ionicons name="shield-checkmark" size={12} color="#fff" />
          </View>
        )}
      </View>
      
      <View style={styles.memberInfo}>
        <Text style={styles.memberName}>{member.fullName || member.full_name || member.username}</Text>
        <Text style={styles.memberUsername}>@{member.username}</Text>
      </View>
      
        {member.role === 'admin' && (
        <View style={styles.adminLabel}>
          <Text style={styles.adminLabelText}>Admin</Text>
        </View>
      )}
      {groupCreatedBy && Number(member.userId) === Number(groupCreatedBy) && (
        <View style={styles.creatorLabel}>
          <Text style={styles.creatorLabelText}>Creator</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Thành viên</Text>
          <Text style={styles.headerSubtitle}>{members.length} thành viên</Text>
        </View>
        <View style={styles.headerRight} />
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Tìm kiếm thành viên..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#999"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
            <Ionicons name="close-circle" size={20} color="#999" />
          </TouchableOpacity>
        )}
      </View>

      {/* Members List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0084ff" />
        </View>
      ) : (
        <ScrollView
          style={styles.membersList}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {filteredMembers.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="people-outline" size={48} color="#ccc" />
              <Text style={styles.emptyText}>
                {searchQuery ? 'Không tìm thấy thành viên' : 'Chưa có thành viên'}
              </Text>
            </View>
          ) : (
            filteredMembers.map((member, index) => renderMemberItem(member, index))
          )}
        </ScrollView>
      )}
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 4,
  },
  headerCenter: {
    flex: 1,
    marginLeft: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  headerRight: {
    width: 32,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#000',
    paddingVertical: 4,
  },
  clearButton: {
    padding: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  membersList: {
    flex: 1,
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  memberAvatar: {
    position: 'relative',
    marginRight: 12,
  },
  avatarImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#e0e0e0',
  },
  defaultMemberAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#0084ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
  },
  adminBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    backgroundColor: '#4CAF50',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
    marginBottom: 2,
  },
  memberUsername: {
    fontSize: 14,
    color: '#666',
  },
  adminLabel: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  adminLabelText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  creatorLabel: {
    backgroundColor: '#F59E0B',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  creatorLabelText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 12,
  },
});
