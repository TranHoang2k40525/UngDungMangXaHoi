import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
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
import { getProfile, getMyGroups, API_BASE_URL, getFollowing } from '../API/Api';
import MessageWebSocketService from '../Services/MessageWebSocketService';
import signalRService from '../ServicesSingalR/signalRService';

export default function Messenger() {
  const [searchText, setSearchText] = useState('');
  const [conversations, setConversations] = useState([]);
  const [allFollowing, setAllFollowing] = useState([]); // For avatar bar
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [userProfile, setUserProfile] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [currentUserName, setCurrentUserName] = useState('');
  const joinedGroupsRef = useRef(new Set());
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  // Load current user info
  useEffect(() => {
    const loadCurrentUser = async () => {
      try {
        const profile = await getProfile();
        setUserProfile(profile);
        setCurrentUserName(profile?.fullName || profile?.username || 'User');
        const uid = profile?.user_id ?? profile?.id ?? profile?.userId ?? null;
        setCurrentUserId(uid);
      } catch (error) {
        console.error('[Messenger] Error loading current user:', error);
      }
    };
    loadCurrentUser();
  }, []);

  // Load conversations - cả 1:1 và groups
  const loadConversations = useCallback(async () => {
    try {
      setLoading(true);
      
      // Lấy danh sách conversations từ backend (không cần follow requirement nữa)
      const mutualResponse = await MessageAPI.getMutualFollowers();
      console.log('[Messenger] Conversations response:', mutualResponse);
      
      // Load all following users for avatar bar (Facebook Messenger style)
      if (currentUserId) {
        try {
          const followingData = await getFollowing(currentUserId);
          console.log('[Messenger] Raw following data:', JSON.stringify(followingData?.slice(0, 2), null, 2));
          
          // Normalize field names for each user
          const normalizedFollowing = (followingData || []).map(user => {
            // Handle multiple possible field names
            // Backend returns: userId, username, fullName, avatarUrl
            const userId = user.userId ?? user.user_id ?? user.id;
            const fullName = user.fullName ?? user.full_name ?? user.name ?? user.username;
            const avatarUrl = user.avatarUrl ?? user.avatar_url ?? user.avatar;
            const username = user.username ?? user.userName;
            
            console.log('[Messenger] User object:', {
              original: user,
              normalized: { userId, fullName, avatarUrl, username }
            });
            
            return {
              user_id: userId,
              full_name: fullName,
              avatar_url: avatarUrl,
              username: username
            };
          }).filter(user => user.user_id); // Only keep users with valid ID
          
          console.log('[Messenger] Normalized following users:', normalizedFollowing.length);
          setAllFollowing(normalizedFollowing);
        } catch (error) {
          console.error('[Messenger] Error loading following users:', error);
          setAllFollowing([]);
        }
      }
      
      let oneToOneConversations = [];
      if (mutualResponse.success && mutualResponse.data) {
        oneToOneConversations = mutualResponse.data.map(conv => {
          let avatarUrl = conv.other_user_avatar_url;
          if (avatarUrl && !avatarUrl.startsWith('http')) {
            avatarUrl = `${API_BASE_URL}${avatarUrl}`;
          }
          return {
            id: conv.conversation_id,
            name: conv.other_user_full_name,
            avatarUrl: avatarUrl,
            isGroup: false,
            otherUserId: conv.other_user_id,
            username: conv.other_user_username,
            lastMessage: conv.last_message,
            unreadCount: conv.unread_count || 0,
            time: conv.last_message?.created_at,
            lastSeen: conv.other_user_last_seen,
            raw: conv,
          };
        });
      }

      // Lấy danh sách groups
      let groupConversations = [];
      try {
        const groups = await getMyGroups();
        console.log('[Messenger] Loaded groups:', groups.length);
        groupConversations = await Promise.all(groups.map(async (g) => {
          const convId = g.conversationId ?? g.conversation_id ?? g.id ?? g.groupId ?? g.group_id;
          const name = g.name ?? g.groupName ?? g.group_name ?? g.title ?? `Group ${convId}`;
          const avatarField = g.avatarUrl ?? g.avatar_url ?? g.avatar ?? g.groupAvatar ?? g.imageUrl ?? null;
          const memberCount = g.currentMemberCount ?? g.current_member_count ?? g.memberCount ?? g.membersCount ?? null;
          const unreadCount = g.unreadCount ?? g.unread_count ?? g.unread ?? 0;
          const lastMessageTime = g.lastMessageTime ?? g.last_message_time ?? null;

          const savedAvatarKey = `groupAvatar_${convId}`;
          let savedAvatar = null;
          try { savedAvatar = await AsyncStorage.getItem(savedAvatarKey); } catch (e) { console.warn('[Messenger] read saved avatar failed', e); }

          return {
            id: convId,
            name: name,
            avatarUrl: savedAvatar ?? avatarField,
            isGroup: true,
            memberCount: memberCount,
            unreadCount: unreadCount,
            time: lastMessageTime,
            raw: g,
          };
        }));
      } catch (error) {
        console.error('Load groups error:', error);
      }

      // Merge và sort theo time mới nhất (desc) - newest first
      const allConversations = [...oneToOneConversations, ...groupConversations].sort((a, b) => {
        const timeA = new Date(a.time || 0).getTime();
        const timeB = new Date(b.time || 0).getTime();
        return timeB - timeA; // Newest first
      });

      setConversations(allConversations);
      console.log('[Messenger] Loaded all conversations:', allConversations.length);

      // Join groups cho realtime
      try {
        await signalRService.connectToChat();
        for (const conv of groupConversations) {
          if (conv && conv.id) {
            await signalRService.joinGroup(conv.id);
            joinedGroupsRef.current.add(conv.id);
            console.log('[Messenger] Joined group for realtime updates:', conv.id);
          }
        }
      } catch (e) {
        console.warn('[Messenger] connectToChat/join groups failed', e);
      }
    } catch (error) {
      console.error('[Messenger] Error loading conversations:', error);
    } finally {
      setLoading(false);
    }
  }, [currentUserId]);

  // Refresh conversations
  const onRefresh = async () => {
    setRefreshing(true);
    await loadConversations();
    setRefreshing(false);
  };

  // Initialize WebSocket for 1:1
  useEffect(() => {
    const initWebSocket = async () => {
      const connected = await MessageWebSocketService.initialize();
      
      if (connected) {
        const handleMessageReceived = (message) => {
          console.log('[Messenger] New message received:', message);
          loadConversations();
        };

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

        return () => {
          MessageWebSocketService.off('messageReceived', handleMessageReceived);
          MessageWebSocketService.off('onlineUsers', handleOnlineUsers);
          MessageWebSocketService.off('userOnline', handleUserOnline);
          MessageWebSocketService.off('userOffline', handleUserOffline);
        };
      }
    };

    initWebSocket();
  }, [loadConversations]);

  // SignalR handlers for groups (adapted from Branch_Vu)
  useEffect(() => {
    let mounted = true;
    const avatarHandler = async (data) => {
      if (!mounted || !data) return;
      const convIdStr = String(data.conversationId ?? data.conversation_id ?? data.id ?? data.conversationId);
      const avatarUrl = data.avatarUrl || data.avatar_url || data.avatar || null;
      if (!convIdStr) return;

      const key = `groupAvatar_${convIdStr}`;
      try { await AsyncStorage.setItem(key, avatarUrl); } catch (e) { console.warn('[Messenger] save avatar override failed', e); }

      setConversations(prev => prev.map(c => {
        if (String(c.id) === convIdStr && c.isGroup) {
          return { ...c, avatarUrl: avatarUrl };
        }
        return c;
      }));
    };

    signalRService.connectToChat().catch(() => {});
    signalRService.onGroupAvatarUpdated(avatarHandler);

    return () => {
      mounted = false;
      try {
        signalRService.removeHandler('GroupAvatarUpdated', avatarHandler);
      } catch (e) { /* ignore */ }
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    const readHandler = (data) => {
      if (!mounted || !data) return;
      const convIdStr = String(data.conversationId ?? data.conversation_id ?? data.conversationId);
      const actorUserId = data.userId ?? data.user_id ?? data.actorUserId ?? null;
      if (!convIdStr || String(actorUserId) !== String(currentUserId)) return;

      setConversations(prev => {
        const idx = prev.findIndex(c => String(c.id) === convIdStr && c.isGroup);
        if (idx === -1) return prev;
        const item = { ...prev[idx], unreadCount: 0 };
        const copy = [...prev.slice(0, idx), ...prev.slice(idx + 1)];
        return [item, ...copy];
      });
    };

    signalRService.onMessageRead(readHandler);

    return () => {
      mounted = false;
      try {
        signalRService.chatConnection.off('MessageRead', readHandler);
      } catch (e) { /* ignore */ }
    };
  }, [currentUserId]);

  useEffect(() => {
    let mounted = true;
    const messageHandler = (message) => {
      if (!mounted || !message) return;
      const convIdStr = String(message.conversationId ?? message.conversation_id ?? message.conversationId);
      if (!convIdStr) return;

      const senderId = message.userId ?? message.user_id ?? message.senderId ?? message.sender_id ?? null;
      const content = message.content ?? message.Content ?? '';
      const createdAt = message.createdAt ?? message.created_at ?? null;
      const isFromMe = senderId && String(senderId) === String(currentUserId);

      setConversations(prev => {
        const existingIdx = prev.findIndex(c => String(c.id) === convIdStr);
        let existing = null;
        let rest = prev;
        if (existingIdx !== -1) {
          existing = { ...prev[existingIdx] };
          rest = [...prev.slice(0, existingIdx), ...prev.slice(existingIdx + 1)];
        }

        const newItem = existing ? { ...existing } : { 
          id: convIdStr, 
          name: message.groupName || message.conversationName || `Group ${convIdStr}`, 
          isGroup: true 
        };
        newItem.time = createdAt ? String(createdAt) : newItem.time;
        newItem.lastMessage = { content };
        newItem.unreadCount = (Number(newItem.unreadCount) || 0) + (isFromMe ? 0 : 1);

        return [newItem, ...rest];
      });
    };

    signalRService.onReceiveMessage(messageHandler);

    return () => {
      mounted = false;
      try {
        signalRService.chatConnection.off('ReceiveMessage', messageHandler);
      } catch (e) { /* ignore */ }
    };
  }, [currentUserId]);

  useEffect(() => {
    let mounted = true;
    const removedHandler = async (data) => {
      if (!mounted || !data) return;
      const convId = Number(data.conversationId || data.conversation_id);
      const removedUserId = Number(data.removedUserId || data.userId || data.user_id);
      if (!convId || !removedUserId) return;

      if (String(removedUserId) === String(currentUserId)) {
        setConversations(prev => prev.filter(c => Number(c.id) !== convId));
        try {
          await AsyncStorage.removeItem(`groupMembers_${convId}`);
          await AsyncStorage.removeItem(`groupInfo_${convId}`);
          await AsyncStorage.removeItem(`group_messages_${convId}`);
          await AsyncStorage.removeItem(`groupAvatar_${convId}`);
        } catch (e) {
          console.warn('[Messenger] cleanup after being removed failed', e);
        }
      } else {
        setConversations(prev => prev.map(c => {
          if (Number(c.id) === convId && c.isGroup) {
            const curr = Number(c.memberCount) || 0;
            return { ...c, memberCount: Math.max(0, curr - 1) };
          }
          return c;
        }));
      }
    };

    signalRService.onMemberRemoved(removedHandler);

    return () => {
      mounted = false;
      try {
        signalRService.chatConnection.off('MemberRemoved', removedHandler);
      } catch (e) { /* ignore */ }
    };
  }, [currentUserId]);

  useEffect(() => {
    let mounted = true;
    const deletedHandler = async (data) => {
      if (!mounted || !data) return;
      const convId = Number(data.conversationId || data.conversation_id);
      if (!convId) return;

      setConversations(prev => prev.filter(c => Number(c.id) !== convId));

      try {
        await AsyncStorage.removeItem(`groupMembers_${convId}`);
        await AsyncStorage.removeItem(`groupInfo_${convId}`);
        await AsyncStorage.removeItem(`group_messages_${convId}`);
        await AsyncStorage.removeItem(`groupAvatar_${convId}`);
      } catch (e) {
        console.warn('[Messenger] cleanup after group deleted failed', e);
      }
    };

    signalRService.onGroupDeleted(deletedHandler);

    return () => {
      mounted = false;
      try {
        signalRService.chatConnection.off('GroupDeleted', deletedHandler);
      } catch (e) { /* ignore */ }
    };
  }, []);

  // Leave groups on unmount
  useEffect(() => {
    return () => {
      const ids = Array.from(joinedGroupsRef.current || []);
      for (const id of ids) {
        signalRService.leaveGroup(id).catch(e => console.warn('[Messenger] leaveGroup failed', id, e));
      }
    };
  }, []);

  // Load on focus
  useFocusEffect(
    useCallback(() => {
      console.log('[Messenger] Screen focused - loading conversations');
      loadConversations();
      return () => {
        console.log('[Messenger] Screen unfocused');
      };
    }, [loadConversations])
  );

  // Lọc danh sách
  const filteredConversations = useMemo(() => {
    if (!searchText.trim()) {
      return conversations;
    }

    const searchLower = searchText.toLowerCase().trim();
    
    return conversations.filter(conv => 
      conv.name?.toLowerCase().includes(searchLower) ||
      (!conv.isGroup && conv.username?.toLowerCase().includes(searchLower))
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

  // Check online for 1:1
  const isUserOnline = (userId) => {
    return onlineUsers.includes(userId);
  };

  // Format offline time
  const formatOfflineTime = (lastSeen) => {
    if (!lastSeen) return '';
    
    const lastSeenDate = new Date(lastSeen);
    const now = new Date();
    
    const diffMs = now - lastSeenDate;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'now';
    if (diffMins < 60) return `${diffMins}m`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d`;
  };

  // Get avatar URI
  const getAvatarUri = (avatarUrl) => {
    if (!avatarUrl) return null;
    // ✅ FIX: Handle object avatarUrl
    if (typeof avatarUrl === 'object') {
      avatarUrl = avatarUrl.uri || avatarUrl.url || null;
      if (!avatarUrl) return null;
    }
    const avatarStr = String(avatarUrl);
    if (avatarStr.startsWith('file://') || avatarStr.startsWith('http')) {
      return avatarStr;
    }
    return `${API_BASE_URL}${avatarStr}`;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" translucent={false} />
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#3B82F6" />
            <Text style={styles.loadingText}>Đang tải...</Text>
          </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="#FFFFFF"
        translucent={false}
      />
      <View style={styles.content}>
        {/* Header - ưu tiên HEAD */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="chevron-back" size={24} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{currentUserName || 'Messages'}</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity 
              style={styles.groupButton}
              onPress={() => navigation.navigate('GroupList')}
            >
              <Ionicons name="people-outline" size={24} color="#111827" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.composeButton}>
              <Ionicons name="create-outline" size={24} color="#111827" />
            </TouchableOpacity>
          </View>
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

        {/* Avatar Bar - Facebook Messenger style */}
        {allFollowing.length > 0 && !searchText && (
          <View style={styles.avatarBarContainer}>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.avatarBar}
            >
              {allFollowing.slice(0, 10).map((user, index) => (
                <TouchableOpacity
                  key={user.user_id || `user-${index}`}
                  style={styles.avatarBarItem}
                  activeOpacity={0.7}
                  onPress={() => {
                    // Construct full avatar URL before navigation
                    const fullAvatarUrl = user.avatar_url 
                      ? (user.avatar_url.startsWith('http') 
                          ? user.avatar_url 
                          : `${API_BASE_URL}${user.avatar_url}`)
                      : null;
                    
                    console.log('[Messenger] Avatar bar click - navigating with:', {
                      userId: user.user_id,
                      userName: user.full_name,
                      userAvatar: fullAvatarUrl,
                      username: user.username
                    });
                    
                    if (!user.user_id) {
                      console.error('[Messenger] Cannot navigate - user.user_id is undefined!');
                      return;
                    }
                    
                    navigation.navigate('Doanchat', {
                      userId: user.user_id,
                      userName: user.full_name || user.username || 'User',
                      userAvatar: fullAvatarUrl,
                      username: user.username
                    });
                  }}
                >
                  <View style={styles.avatarBarAvatarWrapper}>
                    {user.avatar_url ? (
                      <Image 
                        source={{ 
                          uri: user.avatar_url.startsWith('http') 
                            ? user.avatar_url 
                            : `${API_BASE_URL}${user.avatar_url}` 
                        }}
                        style={styles.avatarBarAvatar}
                      />
                    ) : (
                      <View style={[styles.avatarBarAvatar, styles.defaultAvatarBar]}>
                        <Text style={styles.defaultAvatarBarText}>
                          {user.full_name ? user.full_name.charAt(0).toUpperCase() : 'U'}
                        </Text>
                      </View>
                    )}
                    {/* Online indicator for avatar bar */}
                    {isUserOnline(user.user_id) && (
                      <View style={styles.avatarBarOnlineIndicator} />
                    )}
                  </View>
                  <Text style={styles.avatarBarName} numberOfLines={1}>
                    {user.full_name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Conversations List */}
        <ScrollView 
          style={styles.conversationsList}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {filteredConversations.length > 0 ? (
            filteredConversations.map((conv) => (
              <TouchableOpacity 
                key={conv.isGroup ? `group_${conv.id}` : `user_${conv.otherUserId ?? conv.id}`} 
                style={styles.conversationItem}
                activeOpacity={0.7}
                onPress={() => {
                  if (conv.isGroup) {
                    navigation.navigate('GroupChat', { 
                      conversationId: conv.id,
                      groupName: conv.name 
                    });
                  } else {
                    // Use getAvatarUri to construct full URL for 1:1 chat
                    const fullAvatarUrl = getAvatarUri(conv.avatarUrl);
                    
                    navigation.navigate('Doanchat', {
                      userId: conv.otherUserId,
                      userName: conv.name,
                      userAvatar: fullAvatarUrl,
                      username: conv.username
                    });
                  }
                }}
              >
                <View style={styles.avatarContainer}>
                  {getAvatarUri(conv.avatarUrl) ? (
                    <Image 
                      source={{ uri: getAvatarUri(conv.avatarUrl) }} 
                      style={styles.avatar} 
                    />
                  ) : (
                    <View style={[styles.avatar, styles.defaultAvatar]}>
                      <Text style={styles.defaultAvatarText}>
                        {conv.name ? conv.name.charAt(0).toUpperCase() : (conv.isGroup ? 'G' : 'U')}
                      </Text>
                    </View>
                  )}
                  {/* Unread badge cho cả hai, position top-right */}
                  {conv.unreadCount > 0 && (
                    <View style={styles.unreadBadge}>
                      <Text style={styles.unreadText}>{conv.unreadCount > 99 ? '99+' : String(conv.unreadCount)}</Text>
                    </View>
                  )}
                  {/* Online indicator cho 1:1 */}
                  {!conv.isGroup && isUserOnline(conv.otherUserId) && (
                    <View style={styles.onlineIndicator} />
                  )}
                  {/* Offline time cho 1:1 */}
                  {!conv.isGroup && !isUserOnline(conv.otherUserId) && conv.lastSeen && (
                    <View style={styles.offlineTimeContainer}>
                      <Text style={styles.offlineTimeText}>
                        {formatOfflineTime(conv.lastSeen)}
                      </Text>
                    </View>
                  )}
                  {/* Group badge cho groups */}
                  {conv.isGroup && (
                    <View style={styles.groupBadge}>
                      <Ionicons name="people" size={10} color="#FFFFFF" />
                    </View>
                  )}
                </View>
                <View style={styles.conversationContent}>
                  <View style={styles.conversationHeader}>
                    <View style={styles.nameContainer}>
                      <Text style={styles.conversationName}>{conv.name}</Text>
                      {conv.isGroup && conv.memberCount && (
                        <Text style={styles.memberCount}>({conv.memberCount})</Text>
                      )}
                    </View>
                    {conv.time && <Text style={styles.conversationTime}>{formatTime(conv.time)}</Text>}
                  </View>
                  
                  {/* Last message */}
                  <View style={styles.messageRow}>
                    <Text 
                      style={[
                        styles.conversationMessage,
                        conv.unreadCount > 0 && styles.unreadMessage
                      ]} 
                      numberOfLines={1}
                    >
                      {conv.lastMessage?.content || (conv.isGroup ? `Nhóm · ${conv.memberCount || 0} thành viên` : 'Chưa có tin nhắn')}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="chatbubbles-outline" size={64} color="#D1D5DB" />
              <Text style={styles.emptyStateText}>
                {searchText ? 'Không tìm thấy cuộc trò chuyện' : 'Chưa có tin nhắn'}
              </Text>
              <Text style={styles.emptyStateSubtext}>
                {searchText 
                  ? 'Thử tìm kiếm với từ khóa khác' 
                  : 'Bắt đầu cuộc trò chuyện mới với bạn bè'}
              </Text>
            </View>
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  groupButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
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
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  offlineTimeText: {
    fontSize: 10,
    color: '#10B981',
    fontWeight: '700',
  },
  groupBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  unreadBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  unreadText: {
    color: '#FFFFFF',
    fontSize: 11,
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
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  conversationName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  memberCount: {
    fontSize: 13,
    color: '#6B7280',
    marginLeft: 4,
  },
  conversationTime: {
    fontSize: 13,
    color: '#9CA3AF',
    marginLeft: 8,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  conversationMessage: {
    flex: 1,
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  unreadMessage: {
    fontWeight: '700',
    color: '#111827',
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
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
  // Avatar Bar styles - Facebook Messenger
  avatarBarContainer: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  avatarBar: {
    paddingHorizontal: 8,
    gap: 12,
  },
  avatarBarItem: {
    alignItems: 'center',
    width: 64,
  },
  avatarBarAvatarWrapper: {
    position: 'relative',
  },
  avatarBarAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: '#0095F6',
  },
  avatarBarOnlineIndicator: {
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
  defaultAvatarBar: {
    backgroundColor: '#8B5CF6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  defaultAvatarBarText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '600',
  },
  avatarBarName: {
    fontSize: 12,
    color: '#111827',
    marginTop: 4,
    textAlign: 'center',
  },
});