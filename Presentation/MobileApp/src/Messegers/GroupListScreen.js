import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Image,
  RefreshControl,
  Alert,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getMyGroups, API_BASE_URL } from '../API/Api';

export default function GroupListScreen() {
  const navigation = useNavigation();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Reload groups khi screen được focus
  useFocusEffect(
    useCallback(() => {
      loadGroups();
    }, [])
  );

  const loadGroups = async () => {
    try {
      setLoading(true);
      const result = await getMyGroups();
      console.log('[GroupList] Loaded groups:', result);
      
      // Load saved avatars from AsyncStorage
      const groupsWithAvatars = await Promise.all(
        result.map(async (group) => {
          const savedAvatarKey = `groupAvatar_${group.conversationId}`;
          const savedAvatar = await AsyncStorage.getItem(savedAvatarKey);
          
          if (savedAvatar) {
            return { ...group, avatarUrl: savedAvatar };
          }
          return group;
        })
      );
      
      setGroups(groupsWithAvatars);
    } catch (error) {
      console.error('Load groups error:', error);
      Alert.alert('Lỗi', 'Không thể tải danh sách nhóm');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadGroups();
    setRefreshing(false);
  };

  const handleGroupPress = (group) => {
    navigation.navigate('GroupDetail', { 
      conversationId: group.conversationId,
      groupName: group.name,
    });
  };

  const handleCreateGroup = () => {
    navigation.navigate('CreateGroup');
  };

  const getAvatarUri = (avatarUrl) => {
    if (!avatarUrl) return null;
    if (avatarUrl.startsWith('file://') || avatarUrl.startsWith('http')) {
      return avatarUrl;
    }
    return `${API_BASE_URL}${avatarUrl}`;
  };

  const renderGroupItem = ({ item }) => {
    const avatarUri = getAvatarUri(item.avatarUrl);
    
    return (
    <TouchableOpacity 
      style={styles.groupItem}
      onPress={() => handleGroupPress(item)}
      activeOpacity={0.7}
    >
      <View style={styles.groupAvatar}>
        {avatarUri ? (
          <Image 
            source={{ uri: avatarUri }} 
            style={styles.avatarImage}
          />
        ) : (
          <View style={styles.defaultAvatar}>
            <Ionicons name="people" size={28} color="#ffffff" />
          </View>
        )}
      </View>
      
      <View style={styles.groupInfo}>
        <View style={styles.groupHeader}>
          <Text style={styles.groupName}>{item.name}</Text>
          {item.invitePermission === 'admin' && (
            <View style={styles.adminBadge}>
              <Ionicons name="shield-checkmark" size={12} color="#3B82F6" />
              <Text style={styles.adminBadgeText}>Admin only</Text>
            </View>
          )}
        </View>
        
        <View style={styles.groupMetadata}>
          <Ionicons name="people-outline" size={14} color="#6B7280" />
          <Text style={styles.memberCount}>
            {item.currentMemberCount} thành viên
            {item.maxMembers ? ` / ${item.maxMembers}` : ''}
          </Text>
          
          {item.maxMembers && item.currentMemberCount >= item.maxMembers && (
            <View style={styles.fullBadge}>
              <Text style={styles.fullBadgeText}>Đầy</Text>
            </View>
          )}
        </View>
      </View>
      
      <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
    </TouchableOpacity>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="people-outline" size={64} color="#D1D5DB" />
      <Text style={styles.emptyText}>Chưa có nhóm chat nào</Text>
      <Text style={styles.emptySubtext}>
        Tạo nhóm mới hoặc đợi được mời vào nhóm
      </Text>
    </View>
  );

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
          <Text style={styles.headerTitle}>Nhóm chat</Text>
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
        <Text style={styles.headerTitle}>Nhóm chat</Text>
        <TouchableOpacity 
          style={styles.createButton}
          onPress={handleCreateGroup}
        >
          <Ionicons name="add-circle-outline" size={28} color="#3B82F6" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={groups}
        renderItem={renderGroupItem}
        keyExtractor={(item) => item.conversationId.toString()}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#3B82F6']}
            tintColor="#3B82F6"
          />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
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
    padding: 4,
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
  listContent: {
    flexGrow: 1,
    paddingVertical: 8,
  },
  groupItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
  },
  groupAvatar: {
    marginRight: 12,
  },
  avatarImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  defaultAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  groupInfo: {
    flex: 1,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  groupName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
  },
  adminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginLeft: 8,
  },
  adminBadgeText: {
    fontSize: 10,
    fontWeight: '500',
    color: '#3B82F6',
    marginLeft: 2,
  },
  groupMetadata: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  memberCount: {
    fontSize: 13,
    color: '#6B7280',
    marginLeft: 4,
  },
  fullBadge: {
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 8,
  },
  fullBadgeText: {
    fontSize: 10,
    fontWeight: '500',
    color: '#EF4444',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 100,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6B7280',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 8,
    textAlign: 'center',
  },
});
