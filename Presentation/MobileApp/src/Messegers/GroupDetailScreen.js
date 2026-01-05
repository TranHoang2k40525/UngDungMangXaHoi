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
  Modal,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { getGroupInfo, getGroupMembers, uploadGroupAvatar } from '../API/Api';
import * as groupChatService from '../ServicesSingalR/groupChatService';
import signalRService from '../ServicesSingalR/signalRService';

export default function GroupDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { conversationId, groupName } = route.params;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [groupInfo, setGroupInfo] = useState(null);
  const [members, setMembers] = useState([]);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isCreator, setIsCreator] = useState(false);
  const [showEditNameModal, setShowEditNameModal] = useState(false);
  const [editedGroupName, setEditedGroupName] = useState('');

  useEffect(() => {
    loadData();
  }, [conversationId]);

  // Ensure we join the SignalR group for this conversation and listen for avatar updates
  useEffect(() => {
    let mounted = true;

    const onAvatarUpdated = async (data) => {
      try {
        if (!mounted || !data) return;

        console.log('[GroupDetail] GroupAvatarUpdated payload received:', data);

        const convIdRaw = data.conversationId ?? data.conversation_id ?? data.id ?? conversationId;
        const convIdStr = convIdRaw != null ? String(convIdRaw) : null;
        if (!convIdStr || String(conversationId) !== convIdStr) return;

        const avatarUrl = data.avatarUrl || data.avatar_url || data.avatar || null;
        if (!avatarUrl) return;

        const cacheBusted = `${avatarUrl}${avatarUrl.includes('?') ? '&' : '?'}t=${Date.now()}`;

        try {
          await AsyncStorage.setItem(`groupAvatar_${convIdStr}`, cacheBusted);
        } catch (e) {
          console.warn('[GroupDetail] Failed to persist avatar override locally', e);
        }

        // Update UI
        setGroupInfo(prev => ({ ...(prev || {}), avatarUrl: cacheBusted }));
      } catch (e) {
        console.error('[GroupDetail] onAvatarUpdated handler error', e);
      }
    };

    // Connect and join group, attach handler
    (async () => {
      try {
        await signalRService.connectToChat();
        try {
          await signalRService.joinGroup(conversationId);
          console.log('[GroupDetail] Joined group for realtime avatar updates:', conversationId);
        } catch (e) {
          console.warn('[GroupDetail] joinGroup failed', e);
        }
        // attach handler
        signalRService.onGroupAvatarUpdated(onAvatarUpdated);
      } catch (e) {
        console.warn('[GroupDetail] Failed to connect/join SignalR for avatar updates', e);
      }
    })();

    return () => {
      mounted = false;
      try {
        if (signalRService && typeof signalRService.removeHandler === 'function') {
          signalRService.removeHandler('GroupAvatarUpdated', onAvatarUpdated);
        } else if (signalRService && signalRService.chatConnection && signalRService.chatConnection.off) {
          signalRService.chatConnection.off('GroupAvatarUpdated', onAvatarUpdated);
        }
      } catch (e) {
        /* ignore */
      }

      try {
        signalRService.leaveGroup(conversationId).catch(() => {});
      } catch (e) { /* ignore */ }
    };
  }, [conversationId]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Lấy current user ID
      const userStr = await AsyncStorage.getItem('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        setCurrentUserId(user.user_id || user.userId);
      }

      // Lấy thông tin nhóm và danh sách thành viên
      const [groupData, membersData] = await Promise.all([
        getGroupInfo(conversationId),
        getGroupMembers(conversationId),
      ]);

      // Check if there's a saved avatar in AsyncStorage
      const savedAvatarKey = `groupAvatar_${conversationId}`;
      const savedAvatar = await AsyncStorage.getItem(savedAvatarKey);
      
      if (savedAvatar) {
        groupData.avatarUrl = savedAvatar;
      }

      setGroupInfo(groupData);
      setMembers(membersData);

      // Kiểm tra xem user hiện tại có phải admin không
      if (userStr) {
        const user = JSON.parse(userStr);
        const currentMember = membersData.find(m => m.userId === (user.user_id || user.userId));
        setIsAdmin(currentMember?.role === 'admin');
        // Identify creator: member with role 'admin' and joined_at === conversation.created_at
        try {
          // Use groupData.createdBy when available
          if (groupData && (groupData.createdBy || groupData.createdBy === 0)) {
            setIsCreator((groupData.createdBy) === (user.user_id || user.userId));
          } else {
            const adminMembers = membersData.filter(m => m.role === 'admin').sort((a,b) => new Date(a.joined_at) - new Date(b.joined_at));
            if (adminMembers.length > 0) {
              setIsCreator(adminMembers[0].userId === (user.user_id || user.userId));
            }
          }
        } catch (e) {
          console.warn('Error determining creator:', e);
        }
      }
    } catch (error) {
      console.error('Load group data error:', error);
      Alert.alert('Lỗi', error.message || 'Không thể tải thông tin nhóm');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleInviteMember = () => {
    // Kiểm tra quyền mời
    // If group requires admin to invite, enforce it — but allow opening the invite
    // screen when member list is empty (possible data/load edge-case).
    if (groupInfo?.invitePermission === 'admin' && !isAdmin) {
      // If we do have members info and it's non-empty, block non-admins.
      if (members && members.length > 0) {
        Alert.alert('Thông báo', 'Chỉ admin mới có quyền mời thành viên vào nhóm này');
        return;
      }
      // Otherwise (members list empty), allow navigation: maybe data not loaded yet
      // and the current user should still be able to invite.
    }

    // Kiểm tra nhóm đã đầy chưa
    if (groupInfo?.maxMembers && groupInfo?.currentMemberCount >= groupInfo?.maxMembers) {
      Alert.alert('Thông báo', `Nhóm đã đạt giới hạn ${groupInfo.maxMembers} thành viên`);
      return;
    }

    navigation.navigate('InviteMember', { 
      conversationId,
      groupName: groupInfo?.name || groupName,
      currentMembers: members,
      currentUserId,
    });
  };

  const handleChangeAvatar = async () => {
    Alert.alert(
      'Đổi ảnh nhóm',
      'Chọn nguồn ảnh',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Chọn từ thư viện',
          onPress: () => pickImage('library'),
        },
        {
          text: 'Chụp ảnh',
          onPress: () => pickImage('camera'),
        },
      ]
    );
  };

  const pickImage = async (source) => {
    try {
      let result;
      
      if (source === 'camera') {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Thông báo', 'Cần quyền truy cập camera');
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
        });
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Thông báo', 'Cần quyền truy cập thư viện ảnh');
          return;
        }
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
        });
      }

      if (!result.canceled && result.assets && result.assets[0]) {
        const newAvatarUri = result.assets[0].uri;
        
        // Update local state
        setGroupInfo(prev => ({ ...prev, avatarUrl: newAvatarUri }));
        
        // Save to AsyncStorage to persist
        try {
          const storageKey = `groupAvatar_${conversationId}`;
          await AsyncStorage.setItem(storageKey, newAvatarUri);
          
          // Also update groupInfo in storage
          const groupInfoKey = `groupInfo_${conversationId}`;
          const savedGroupInfo = await AsyncStorage.getItem(groupInfoKey);
          if (savedGroupInfo) {
            const info = JSON.parse(savedGroupInfo);
            info.avatarUrl = newAvatarUri;
            await AsyncStorage.setItem(groupInfoKey, JSON.stringify(info));
          } else {
            // Create new groupInfo in storage
            await AsyncStorage.setItem(groupInfoKey, JSON.stringify({
              ...groupInfo,
              avatarUrl: newAvatarUri,
            }));
          }
          
          Alert.alert('Thành công', 'Đã cập nhật ảnh nhóm');
        } catch (storageError) {
          console.error('Save avatar error:', storageError);
          Alert.alert('Thành công', 'Đã cập nhật ảnh nhóm (chỉ local)');
        }
        
        // Upload to server so the avatar is persisted and broadcast to other clients.
        try {
          const res = await uploadGroupAvatar(conversationId, { uri: newAvatarUri });
          // Response shape may be { success: true, data: { avatarUrl } }
          const serverUrl = res?.data?.avatarUrl || res?.data?.avatar_url || res?.avatarUrl || null;
          if (serverUrl) {
            // Persist server URL locally so UI stays consistent
            try {
              const storageKey = `groupAvatar_${conversationId}`;
              await AsyncStorage.setItem(storageKey, serverUrl);

              const groupInfoKey = `groupInfo_${conversationId}`;
              const savedGroupInfo = await AsyncStorage.getItem(groupInfoKey);
              if (savedGroupInfo) {
                const info = JSON.parse(savedGroupInfo);
                info.avatarUrl = serverUrl;
                await AsyncStorage.setItem(groupInfoKey, JSON.stringify(info));
              } else {
                await AsyncStorage.setItem(groupInfoKey, JSON.stringify({ ...(groupInfo || {}), avatarUrl: serverUrl }));
              }

              // Update state to use server URL
              setGroupInfo(prev => ({ ...prev, avatarUrl: serverUrl }));
              // Also notify via SignalR explicitly to ensure realtime broadcast
              try {
                await signalRService.updateGroupAvatar(conversationId, serverUrl);
                console.log('[GroupDetail] Notified server of avatar change via SignalR after upload:', serverUrl);
              } catch (e) {
                console.warn('[GroupDetail] SignalR notify after upload failed (server should have broadcast via API):', e);
              }
            } catch (sErr) {
              console.warn('[GroupDetail] Failed to persist server avatar locally:', sErr);
            }
          } else {
            console.warn('[GroupDetail] uploadGroupAvatar returned no avatar URL', res);
          }
        } catch (uploadErr) {
          console.warn('[GroupDetail] uploadGroupAvatar failed, falling back to SignalR notify:', uploadErr);
          // Fallback: still try to notify server via SignalR with local URI for immediate sync (non-persistent)
          try {
            await signalRService.updateGroupAvatar(conversationId, newAvatarUri);
            console.log('[GroupDetail] Notified server of avatar change via SignalR (fallback)');
          } catch (e) {
            console.warn('[GroupDetail] Failed to notify server via SignalR (fallback):', e);
          }
        }
      }
    } catch (error) {
      console.error('Pick image error:', error);
      Alert.alert('Lỗi', 'Không thể chọn ảnh');
    }
  };

  const handleLeaveGroup = () => {
    // If current user is admin (including creator), offer Delete Group instead
    if (isAdmin) {
      Alert.alert(
        'Xóa nhóm',
        'Bạn là quản trị viên nhóm. Xóa nhóm sẽ xóa toàn bộ cuộc trò chuyện cho tất cả thành viên. Bạn có chắc muốn xóa?',
        [
          { text: 'Hủy', style: 'cancel' },
          {
            text: 'Xóa nhóm',
            style: 'destructive',
            onPress: async () => {
              try {
                // Call API to delete group
                const result = await groupChatService.deleteGroup(conversationId);
                console.log('Delete group result:', result);
                Alert.alert('Thành công', 'Đã xóa nhóm', [
                  {
                    text: 'OK',
                    onPress: () => {
                      navigation.reset({
                        index: 0,
                        routes: [{ name: 'MainTabs', params: { screen: 'ChatList' } }],
                      });
                    }
                  }
                ]);
              } catch (error) {
                console.error('Delete group error:', error);
                Alert.alert('Lỗi', error.message || 'Không thể xóa nhóm');
              }
            }
          }
        ]
      );
      return;
    }

    // Non-creator default: Leave group
    Alert.alert(
      'Rời khỏi nhóm',
      'Bạn có chắc muốn rời khỏi nhóm này? Bạn sẽ không thể xem tin nhắn của nhóm nữa.',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Rời nhóm',
          style: 'destructive',
            onPress: async () => {
            try {
              // Call backend leave endpoint for self removal
              const res = await groupChatService.leaveGroup(conversationId);
              console.log('Leave group response:', res);

              // Clean up local caches related to this group
              try {
                await AsyncStorage.removeItem(`groupMembers_${conversationId}`);
                await AsyncStorage.removeItem(`groupInfo_${conversationId}`);
                await AsyncStorage.removeItem(`group_messages_${conversationId}`);
                await AsyncStorage.removeItem(`groupAvatar_${conversationId}`);
              } catch (cleanupErr) {
                console.warn('Failed to clean local group cache after leaving', cleanupErr);
              }

              Alert.alert('Thành công', 'Đã rời khỏi nhóm', [
                {
                  text: 'OK',
                  onPress: () => {
                    navigation.reset({
                      index: 0,
                      routes: [{ name: 'MainTabs', params: { screen: 'ChatList' } }],
                    });
                  }
                }
              ]);
            } catch (error) {
              console.error('Leave group error:', error);
              Alert.alert('Lỗi', error?.message || 'Không thể rời khỏi nhóm');
            }
          }
        }
      ]
    );
  };

  const handleSaveGroupName = async () => {
    const newName = (editedGroupName || '').trim();
    if (!newName) {
      Alert.alert('Lỗi', 'Tên nhóm không được để trống');
      return;
    }

    try {
      // Update local state immediately for responsiveness
      setGroupInfo(prev => ({ ...(prev || {}), name: newName }));

      // Persist locally so UI stays consistent
      const groupInfoKey = `groupInfo_${conversationId}`;
      try {
        const saved = await AsyncStorage.getItem(groupInfoKey);
        let info = {};
        if (saved) {
          info = JSON.parse(saved) || {};
        }
        info.name = newName;
        await AsyncStorage.setItem(groupInfoKey, JSON.stringify(info));
      } catch (storageErr) {
        console.warn('Failed to save group name locally', storageErr);
      }

      // Call backend API to persist and broadcast the change. If API fails, fallback to SignalR invoke.
      try {
        const res = await (await import('../API/Api')).updateGroupName(conversationId, newName);
        // server returns { success: true, data: { name } }
        if (res && (res.success || res.data)) {
          console.log('[GroupDetail] updateGroupName success', res);
        }
      } catch (apiErr) {
        console.warn('[GroupDetail] updateGroupName API failed, falling back to SignalR:', apiErr);
        try {
          await signalRService.updateGroupName(conversationId, newName);
          console.log('[GroupDetail] Notified server of name change via SignalR (fallback)');
        } catch (e) {
          console.warn('[GroupDetail] Failed to notify server via SignalR (fallback):', e);
        }
      }

      setShowEditNameModal(false);
      Alert.alert('Thành công', 'Tên nhóm đã được cập nhật');
    } catch (err) {
      console.error('Save group name error', err);
      Alert.alert('Lỗi', 'Không thể cập nhật tên nhóm');
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="chevron-back" size={24} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Chi tiết nhóm</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Đang tải...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="chevron-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chi tiết nhóm</Text>
        <TouchableOpacity style={styles.moreButton}>
          <Ionicons name="ellipsis-horizontal" size={24} color="#111827" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#3B82F6']}
            tintColor="#3B82F6"
          />
        }
      >
        {/* Group Info Section */}
        <View style={styles.groupInfoSection}>
          <TouchableOpacity 
            style={styles.groupAvatar}
            onPress={handleChangeAvatar}
            activeOpacity={0.7}
          >
            {(() => {
              // ✅ FIX: Handle object avatarUrl
              let avatarValue = groupInfo?.avatarUrl;
              if (avatarValue && typeof avatarValue === 'object') {
                avatarValue = avatarValue.uri || avatarValue.url || null;
              }
              const avatarStr = avatarValue ? String(avatarValue) : null;
              
              return avatarStr ? (
                <Image 
                  source={{ uri: avatarStr }} 
                  style={styles.groupAvatarImage}
                />
              ) : (
                <View style={styles.defaultGroupAvatar}>
                  <Ionicons name="people" size={48} color="#ffffff" />
                </View>
              );
            })()}
            <View style={styles.cameraIconBadge}>
              <Ionicons name="camera" size={18} color="#FFFFFF" />
            </View>
          </TouchableOpacity>
          
          <Text style={styles.groupName}>{groupInfo?.name || groupName}</Text>
          <View style={styles.groupActionsRow}>
            <TouchableOpacity
              style={styles.addMemberButton}
              onPress={handleInviteMember}
              activeOpacity={0.8}
            >
              <Ionicons name="person-add" size={18} color="#FFFFFF" />
              <Text style={styles.addMemberText}>Thêm thành viên</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.editNameButton}
              onPress={() => {
                setEditedGroupName(groupInfo?.name || groupName || '');
                setShowEditNameModal(true);
              }}
              activeOpacity={0.8}
            >
              <Ionicons name="pencil" size={18} color="#3B82F6" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.groupStats}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{groupInfo?.currentMemberCount || members.length}</Text>
              <Text style={styles.statLabel}>Thành viên</Text>
            </View>
            {groupInfo?.maxMembers && (
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{groupInfo.maxMembers}</Text>
                <Text style={styles.statLabel}>Giới hạn</Text>
              </View>
            )}
          </View>

          {/* Invite Permission Info */}
          <View style={styles.permissionInfo}>
            <Ionicons 
              name={groupInfo?.invitePermission === 'admin' ? 'shield-checkmark' : 'people'} 
              size={16} 
              color="#6B7280" 
            />
            <Text style={styles.permissionText}>
              {groupInfo?.invitePermission === 'admin' 
                ? 'Chỉ admin mới có thể mời thành viên' 
                : 'Tất cả thành viên có thể mời'}
            </Text>
          </View>
        </View>

        {/* Menu Options */}
        <View style={styles.menuSection}>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('GroupMembers', { 
              conversationId, 
              groupName: groupInfo?.name || groupName 
            })}
            activeOpacity={0.7}
          >
            <View style={styles.menuIconContainer}>
              <Ionicons name="people" size={24} color="#3B82F6" />
            </View>
            <View style={styles.menuTextContainer}>
              <Text style={styles.menuTitle}>Xem thành viên</Text>
              <Text style={styles.menuSubtitle}>{members.length} thành viên</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('PinnedMessages', { 
              conversationId, 
              groupName: groupInfo?.name || groupName 
            })}
            activeOpacity={0.7}
          >
            <View style={styles.menuIconContainer}>
              <Ionicons name="pin" size={24} color="#10B981" />
            </View>
            <View style={styles.menuTextContainer}>
              <Text style={styles.menuTitle}>Tin nhắn đã ghim</Text>
              <Text style={styles.menuSubtitle}>Xem các tin nhắn quan trọng</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('MediaLinks', { 
              conversationId, 
              groupName: groupInfo?.name || groupName 
            })}
            activeOpacity={0.7}
          >
            <View style={styles.menuIconContainer}>
              <Ionicons name="images" size={24} color="#8B5CF6" />
            </View>
            <View style={styles.menuTextContainer}>
              <Text style={styles.menuTitle}>Phương tiện & liên kết</Text>
              <Text style={styles.menuSubtitle}>Ảnh, video, file, liên kết</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>
        </View>

        {/* Leave Group Button */}
        {/* Edit Group Name Modal */}
        <Modal
          visible={showEditNameModal}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowEditNameModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Sửa tên nhóm</Text>
              <TextInput
                value={editedGroupName}
                onChangeText={setEditedGroupName}
                placeholder="Tên nhóm"
                style={styles.input}
                autoFocus
                maxLength={100}
              />
              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.modalButtonCancel} onPress={() => setShowEditNameModal(false)}>
                  <Text style={styles.modalButtonCancelText}>Hủy</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalButtonSave} onPress={handleSaveGroupName}>
                  <Text style={styles.modalButtonSaveText}>Lưu</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
        <View style={styles.dangerSection}>
          <TouchableOpacity
            style={styles.leaveButton}
            onPress={handleLeaveGroup}
            activeOpacity={0.7}
          >
            <Ionicons name={isCreator ? "trash" : "exit-outline"} size={22} color="#EF4444" />
            <Text style={styles.leaveButtonText}>{isCreator ? 'Xóa nhóm' : 'Rời khỏi nhóm'}</Text>
          </TouchableOpacity>
        </View>

        {/* Bottom Spacing */}
        <View style={{ height: 32 }} />
      </ScrollView>
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
  groupActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  addMemberButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3B82F6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  addMemberText: {
    color: '#FFFFFF',
    fontWeight: '600',
    marginLeft: 8,
  },
  editNameButton: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: 'transparent',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  moreButton: {
    padding: 8,
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
  content: {
    flex: 1,
  },
  groupInfoSection: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 32,
    paddingHorizontal: 16,
    alignItems: 'center',
    borderBottomWidth: 8,
    borderBottomColor: '#F3F4F6',
  },
  groupAvatar: {
    marginBottom: 16,
    position: 'relative',
  },
  groupAvatarImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  defaultGroupAvatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraIconBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  groupName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  groupStats: {
    flexDirection: 'row',
    gap: 32,
    marginBottom: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#3B82F6',
  },
  statLabel: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
  },
  permissionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  permissionText: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  modalContent: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    backgroundColor: '#FAFAFA',
    marginBottom: 12,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  modalButtonCancel: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  modalButtonCancelText: {
    color: '#6B7280',
    fontWeight: '600',
  },
  modalButtonSave: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  modalButtonSaveText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  menuSection: {
    backgroundColor: '#FFFFFF',
    marginTop: 16,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  menuIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuTextContainer: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  menuSubtitle: {
    fontSize: 13,
    color: '#6B7280',
  },
  dangerSection: {
    backgroundColor: '#FFFFFF',
    marginTop: 16,
    paddingVertical: 8,
  },
  leaveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  leaveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#EF4444',
    marginLeft: 8,
  },
});
