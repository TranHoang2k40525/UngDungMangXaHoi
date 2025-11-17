import React, { useState, useMemo, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Image,
  ScrollView,
  Platform,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MessageAPI from '../API/MessageAPI';
import {API_BASE_URL} from '../API/Api';
import MessageWebSocketService from '../Services/MessageWebSocketService';

export default function Messenger() {
  const [searchText, setSearchText] = useState('');
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [currentUserName, setCurrentUserName] = useState(''); // Tên user hiện tại
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  // Load current user info
  useEffect(() => {
    const loadCurrentUser = async () => {
      try {
        const userInfoStr = await AsyncStorage.getItem('userInfo');
        if (userInfoStr) {
          const userInfo = JSON.parse(userInfoStr);
          setCurrentUserName(userInfo.fullName || userInfo.username || 'User');
        }
      } catch (error) {
        console.error('[Messenger] Error loading current user:', error);
      }
    };
    loadCurrentUser();
  }, []);

  // Load conversations - hiển thị tất cả mutual followers
  const loadConversations = useCallback(async () => {
    try {
      setLoading(true);
      
      // Lấy danh sách mutual followers (những người có thể nhắn tin)
      const mutualResponse = await MessageAPI.getMutualFollowers();
      console.log('[Messenger] Mutual followers response:', mutualResponse);
      
      if (mutualResponse.success && mutualResponse.data) {
        // Backend trả về ConversationDto với last_message và unread_count
        const conversations = mutualResponse.data.map(conv => {
          // Xử lý avatar URL - thêm base URL nếu là relative path  
          let avatarUrl = conv.other_user_avatar_url;
          if (avatarUrl && !avatarUrl.startsWith('http')) {
            avatarUrl = `${API_BASE_URL}${avatarUrl}`;
          }

          return {
            ...conv,
            other_user_avatar_url: avatarUrl
          };
        });
        
        setConversations(conversations);
        console.log('[Messenger] Loaded conversations with messages:', conversations.length);
      }
    } catch (error) {
      console.error('[Messenger] Error loading conversations:', error);
    } finally {
      setLoading(false);
    }
  }, []); // Empty deps - function doesn't depend on external variables

  // Refresh conversations
  const onRefresh = async () => {
    setRefreshing(true);
    await loadConversations();
    setRefreshing(false);
  };

  // Initialize WebSocket
  useEffect(() => {
    const initWebSocket = async () => {
      const connected = await MessageWebSocketService.initialize();
      
      if (connected) {
        // Listen for new messages - ONLY reload if relevant
        const handleMessageReceived = (message) => {
          console.log('[Messenger] New message received:', message);
          // Only reload if we need to update conversation list
          loadConversations();
        };

        // Listen for online users
        const handleOnlineUsers = (userIds) => {
          setOnlineUsers(userIds);
        };

        const handleUserOnline = (userId) => {
          setOnlineUsers(prev => [...new Set([...prev, userId])]);
        };

        const handleUserOffline = (userId) => {
          setOnlineUsers(prev => prev.filter(id => id !== userId));
        };

        MessageWebSocketService.on('messageReceived', handleMessageReceived);
        MessageWebSocketService.on('onlineUsers', handleOnlineUsers);
        MessageWebSocketService.on('userOnline', handleUserOnline);
        MessageWebSocketService.on('userOffline', handleUserOffline);

        // Cleanup
        return () => {
          MessageWebSocketService.off('messageReceived', handleMessageReceived);
          MessageWebSocketService.off('onlineUsers', handleOnlineUsers);
          MessageWebSocketService.off('userOnline', handleUserOnline);
          MessageWebSocketService.off('userOffline', handleUserOffline);
        };
      }
    };

    initWebSocket();
  }, []); // Empty deps - only run once on mount

  // Load conversations when screen focused
  useFocusEffect(
    useCallback(() => {
      console.log('[Messenger] Screen focused - loading conversations');
      loadConversations();
      
      // Cleanup on unfocus
      return () => {
        console.log('[Messenger] Screen unfocused');
      };
    }, [loadConversations]) // Depend on stable loadConversations
  );

  // Lọc danh sách conversations dựa trên searchText
  const filteredConversations = useMemo(() => {
    if (!searchText.trim()) {
      return conversations;
    }

    const searchLower = searchText.toLowerCase().trim();
    
    return conversations.filter(conv => 
      conv.other_user_full_name.toLowerCase().includes(searchLower) ||
      conv.other_user_username.toLowerCase().includes(searchLower)
    );
  }, [searchText, conversations]);

  // Format time
  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'now';
    if (diffMins < 60) return `${diffMins}m`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d`;
  };

  // Check if user is online
  const isUserOnline = (userId) => {
    return onlineUsers.includes(userId);
  };

  // Format offline time - "7m ago", "2h ago" (ngắn gọn)
  const formatOfflineTime = (lastSeen) => {
    if (!lastSeen) return '';
    
    // lastSeen từ backend là UTC, cần convert sang VN time để tính chênh lệch chính xác
    const lastSeenDate = new Date(lastSeen);
    const now = new Date(); // Current time ở VN (thiết bị đã set múi giờ VN)
    
    const diffMs = now - lastSeenDate;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'now';
    if (diffMins < 60) return `${diffMins}m`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d`;
  };

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="#FFFFFF"
        translucent={false}
      />
      <SafeAreaView style={[styles.safeArea, { paddingTop: insets.top }]}>
      
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="chevron-back" size={24} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{currentUserName || 'Messages'}</Text>
          <TouchableOpacity style={styles.composeButton}>
            <Ionicons name="create-outline" size={24} color="#111827" />
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#9CA3AF" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            value={searchText}
            onChangeText={setSearchText}
            placeholder="Search"
            placeholderTextColor="#9CA3AF"
          />
          {searchText.length > 0 && (
            <TouchableOpacity 
              onPress={() => setSearchText('')}
              style={styles.clearButton}
            >
              <Ionicons name="close-circle" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>

        {/* Conversations List */}
        <ScrollView 
          style={styles.conversationsList}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#3B82F6" />
            </View>
          ) : filteredConversations.length > 0 ? (
            filteredConversations.map((conv) => (
              <TouchableOpacity 
                key={conv.conversation_id} 
                style={styles.conversationItem}
                activeOpacity={0.7}
                onPress={() => navigation.navigate('Doanchat', { 
                  userId: conv.other_user_id,
                  userName: conv.other_user_full_name,
                  userAvatar: conv.other_user_avatar_url,
                  username: conv.other_user_username
                })}
              >
                <View style={styles.avatarContainer}>
                  {conv.other_user_avatar_url ? (
                    <Image 
                      source={{ uri: conv.other_user_avatar_url }} 
                      style={styles.avatar} 
                    />
                  ) : (
                    <View style={[styles.avatar, styles.defaultAvatar]}>
                      <Text style={styles.defaultAvatarText}>
                        {conv.other_user_full_name ? conv.other_user_full_name.charAt(0).toUpperCase() : 'U'}
                      </Text>
                    </View>
                  )}
                  {/* Online indicator - chấm xanh */}
                  {isUserOnline(conv.other_user_id) && (
                    <View style={styles.onlineIndicator} />
                  )}
                  {/* Offline time - đè lên góc dưới avatar */}
                  {!isUserOnline(conv.other_user_id) && conv.other_user_last_seen && (
                    <View style={styles.offlineTimeContainer}>
                      <Text style={styles.offlineTimeText}>
                        {formatOfflineTime(conv.other_user_last_seen)}
                      </Text>
                    </View>
                  )}
                </View>
                <View style={styles.conversationContent}>
                  <View style={styles.conversationHeader}>
                    <Text style={styles.conversationName}>{conv.other_user_full_name}</Text>
                    <Text style={styles.conversationTime}>
                      {conv.last_message ? formatTime(conv.last_message.created_at) : ''}
                    </Text>
                  </View>
                  
                  {/* Hiển thị tin nhắn gần nhất */}
                  {conv.last_message && (
                    <View style={styles.messageRow}>
                      <Text 
                        style={[
                          styles.conversationMessage,
                          conv.unread_count > 0 && styles.unreadMessage // Chữ đậm nếu chưa đọc
                        ]} 
                        numberOfLines={1}
                      >
                        {conv.last_message.content}
                      </Text>
                      {conv.unread_count > 0 && (
                        <View style={styles.unreadBadge}>
                          <Text style={styles.unreadCount}>
                            {conv.unread_count > 99 ? '99+' : conv.unread_count}
                          </Text>
                        </View>
                      )}
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="search-outline" size={48} color="#D1D5DB" />
              <Text style={styles.emptyStateText}>No results found</Text>
              <Text style={styles.emptyStateSubtext}>
                Try searching for a different name
              </Text>
            </View>
          )}
        </ScrollView>
      </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 60 : 20,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    letterSpacing: 0.5,
  },
  composeButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
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
  conversationsList: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  conversationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  defaultAvatar: {
    backgroundColor: '#1DA1F2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  defaultAvatarText: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  offlineTimeContainer: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#FFFFFF', // Nền trắng
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: '#D1D5DB', // Viền xám rõ hơn
  },
  offlineTimeText: {
    fontSize: 10,
    color: '#10B981', // Màu xanh lá giống chấm online
    fontWeight: '700',
  },
  conversationContent: {
    flex: 1,
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  conversationName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  conversationTime: {
    fontSize: 13,
    color: '#9CA3AF',
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  conversationMessage: {
    flex: 1,
    fontSize: 14,
    color: '#6B7280', // Màu nhạt cho tin nhắn đã đọc
    lineHeight: 20,
  },
  unreadMessage: {
    fontWeight: '700', // Chữ đậm cho tin nhắn chưa đọc
    color: '#111827', // Màu đen đậm
  },
  unreadBadge: {
    backgroundColor: '#3B82F6',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    marginLeft: 8,
  },
  unreadCount: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    paddingHorizontal: 32,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 8,
    textAlign: 'center',
  },
});
