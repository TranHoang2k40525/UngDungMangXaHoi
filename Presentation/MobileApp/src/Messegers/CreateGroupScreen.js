import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Image,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getFollowing, createGroup, API_BASE_URL } from '../API/Api';

export default function CreateGroupScreen() {
  const navigation = useNavigation();
  const [groupName, setGroupName] = useState(''); // Không có tên mặc định
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [allFollowing, setAllFollowing] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false); // State cho nút Tạo nhóm

  useEffect(() => {
    loadFollowing();
  }, []);

  const loadFollowing = async () => {
    try {
      setLoading(true);
      
      // Thử lấy từ nhiều key khác nhau
      let userId = null;
      
      // Thử lấy từ key 'user'
      const userStr = await AsyncStorage.getItem('user');
      if (userStr) {
        try {
          const user = JSON.parse(userStr);
          userId = user.user_id || user.userId || user.id;
        } catch (e) {
          console.log('Parse user error:', e);
        }
      }
      
      // Nếu chưa có, thử lấy từ key 'userInfo'
      if (!userId) {
        const userInfoStr = await AsyncStorage.getItem('userInfo');
        if (userInfoStr) {
          try {
            const userInfo = JSON.parse(userInfoStr);
            userId = userInfo.user_id || userInfo.userId || userInfo.id;
          } catch (e) {
            console.log('Parse userInfo error:', e);
          }
        }
      }
      
      if (!userId) {
        Alert.alert('Lỗi', 'Không tìm thấy thông tin người dùng. Vui lòng đăng nhập lại.');
        navigation.goBack();
        return;
      }
      
      const followingData = await getFollowing(userId);
      setAllFollowing(followingData || []);
    } catch (error) {
      console.error('Load following error:', error);
      Alert.alert('Lỗi', 'Không thể tải danh sách bạn bè: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = allFollowing.filter(user => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    const fullName = (user.fullName || '').toLowerCase();
    const username = (user.username || '').toLowerCase();
    return fullName.includes(query) || username.includes(query);
  });

  const toggleMember = (user) => {
    const userId = user.userId || user.user_id;
    const isSelected = selectedMembers.some(m => (m.userId || m.user_id) === userId);
    
    if (isSelected) {
      setSelectedMembers(selectedMembers.filter(m => (m.userId || m.user_id) !== userId));
    } else {
      setSelectedMembers([...selectedMembers, user]);
    }
  };

  const handleCreateGroup = async () => {
    // Validate tên nhóm
    if (!groupName.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập tên nhóm');
      return;
    }

    // Validate số lượng thành viên
    if (selectedMembers.length === 0) {
      Alert.alert('Thiếu thành viên', 'Vui lòng chọn ít nhất 1 thành viên');
      return;
    }

    try {
      setCreating(true);
      
      // Lấy danh sách ID của các thành viên đã chọn
      const memberIds = selectedMembers.map(m => m.userId || m.user_id);
      
      console.log('Creating group with:', {
        name: groupName,
        memberIds,
        invitePermission: 'all',
      });
      
      // Gọi API tạo nhóm
      const response = await createGroup(
        groupName.trim(),
        memberIds,
        'all', // Mặc định tất cả thành viên có thể mời
        null  // Không giới hạn số lượng thành viên
      );
      
      console.log('Create group response:', response);
      
        if (response.success && response.conversation) {
        Alert.alert(
          'Thành công',
          `Đã tạo nhóm "${groupName}" thành công!`,
          [
            {
              text: 'OK',
              onPress: () => {
                // Replace current CreateGroup screen with GroupDetail so Back goes to previous list
                navigation.replace('GroupDetail', {
                  conversationId: response.conversation.conversationId,
                  groupName: response.conversation.name,
                });
              },
            },
          ]
        );
      } else {
        throw new Error(response.message || 'Tạo nhóm thất bại');
      }
    } catch (error) {
      console.error('Create group error:', error);
      Alert.alert(
        'Lỗi',
        error.message || 'Không thể tạo nhóm. Vui lòng thử lại sau.'
      );
    } finally {
      setCreating(false);
    }
  };

  const renderUserItem = ({ item }) => {
    const userId = item.userId || item.user_id;
    const isSelected = selectedMembers.some(m => (m.userId || m.user_id) === userId);
    
    // Xử lý avatar URL
    const getAvatarUri = () => {
      const avatarUrl = item.avatarUrl || item.avatar_url;
      if (!avatarUrl) return null;
      
      // Nếu là URL đầy đủ
      if (avatarUrl.startsWith('http')) {
        return avatarUrl;
      }
      
      // Nếu là relative path
      return `${API_BASE_URL}${avatarUrl}`;
    };

    const avatarUri = getAvatarUri();

    return (
      <TouchableOpacity 
        style={styles.userItem}
        onPress={() => toggleMember(item)}
        activeOpacity={0.7}
      >
        <View style={styles.userLeft}>
          {avatarUri ? (
            <Image 
              source={{ uri: avatarUri }} 
              style={styles.avatar}
            />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Ionicons name="person" size={24} color="#FFFFFF" />
            </View>
          )}
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{item.fullName || item.full_name || 'User'}</Text>
            <Text style={styles.userUsername}>@{item.username || 'username'}</Text>
          </View>
        </View>
        
        <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
          {isSelected && <Ionicons name="checkmark" size={18} color="#FFFFFF" />}
        </View>
      </TouchableOpacity>
    );
  };

  const renderSelectedMember = (member) => {
    const userId = member.userId || member.user_id;
    return (
      <View key={userId} style={styles.selectedChip}>
        <Text style={styles.selectedChipText}>{member.fullName}</Text>
        <TouchableOpacity 
          onPress={() => toggleMember(member)}
          style={styles.removeChip}
        >
          <Ionicons name="close-circle" size={16} color="#6B7280" />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="chevron-back" size={24} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Tạo nhóm mới</Text>
          <TouchableOpacity 
            style={[styles.createButton, creating && styles.createButtonDisabled]}
            onPress={handleCreateGroup}
            disabled={creating}
          >
            {creating ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.createButtonText}>Tạo</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Group Name Input */}
        <View style={styles.groupNameSection}>
          <View style={styles.inputContainer}>
            <Ionicons name="people" size={20} color="#9CA3AF" />
            <TextInput
              style={styles.input}
              placeholder="Tên nhóm"
              placeholderTextColor="#9CA3AF"
              value={groupName}
              onChangeText={setGroupName}
              maxLength={50}
            />
          </View>
        </View>

        {/* Selected Members */}
        {selectedMembers.length > 0 && (
          <View style={styles.selectedSection}>
            <Text style={styles.selectedTitle}>
              Đã chọn ({selectedMembers.length})
            </Text>
            <View style={styles.selectedList}>
              {selectedMembers.map(member => renderSelectedMember(member))}
            </View>
          </View>
        )}

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#9CA3AF" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm kiếm người theo dõi..."
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>

        {/* User List */}
        <FlatList
          data={filteredUsers}
          renderItem={renderUserItem}
          keyExtractor={(item) => (item.userId || item.user_id).toString()}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      </KeyboardAvoidingView>
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
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  createButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  createButtonDisabled: {
    opacity: 0.5,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3B82F6',
  },
  groupNameSection: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#111827',
  },
  selectedSection: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  selectedTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 8,
  },
  selectedList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  selectedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  selectedChipText: {
    fontSize: 13,
    color: '#3B82F6',
    fontWeight: '500',
  },
  removeChip: {
    padding: 2,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
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
  listContent: {
    paddingVertical: 8,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  userLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#9CA3AF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
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
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
});
