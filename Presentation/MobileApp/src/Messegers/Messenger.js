import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
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
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getProfile, getMyGroups, API_BASE_URL } from '../API/Api';

import signalRService from '../ServicesSingalR/signalRService';

export default function Messenger() {
  const [searchText, setSearchText] = useState('');
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [conversations, setConversations] = useState([]);
  const joinedGroupsRef = useRef(new Set());
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  // Reload khi screen được focus
  useFocusEffect(
    useCallback(() => {
      loadUserData();
    }, [])
  );

  const loadUserData = async () => {
    try {
      setLoading(true);
      // Lấy thông tin user từ API
      const profile = await getProfile();
      setUserProfile(profile);
      // store numeric user id for realtime handlers
      const uid = profile?.user_id ?? profile?.id ?? profile?.userId ?? null;
      setCurrentUserId(uid);
      
      // Lấy danh sách nhóm chat
      try {
        const groups = await getMyGroups();
        console.log('[Messenger] Loaded groups:', groups.length);
        // Load saved avatars from AsyncStorage and convert groups sang format conversations
        // Normalize group object keys (backend may use different naming conventions)
        const groupConversations = await Promise.all(groups.map(async (g) => {
          const convId = g.conversationId ?? g.conversation_id ?? g.id ?? g.groupId ?? g.group_id;
          const name = g.name ?? g.groupName ?? g.group_name ?? g.title ?? `Group ${convId}`;
          const avatarField = g.avatarUrl ?? g.avatar_url ?? g.avatar ?? g.groupAvatar ?? g.imageUrl ?? null;
          const memberCount = g.currentMemberCount ?? g.current_member_count ?? g.memberCount ?? g.membersCount ?? null;
          const unreadCount = g.unreadCount ?? g.unread_count ?? g.unread ?? 0;

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
            raw: g,
          };
        }));
          setConversations(groupConversations);

          // Ensure we're connected to chat hub and join each visible group so Messenger
          // receives per-group events like GroupAvatarUpdated even when not in GroupChat screen.
          try {
            await signalRService.connectToChat();
            for (const conv of groupConversations) {
              try {
                if (conv && conv.id) {
                  await signalRService.joinGroup(conv.id);
                  joinedGroupsRef.current.add(conv.id);
                  console.log('[Messenger] Joined group for realtime updates:', conv.id);
                }
              } catch (e) {
                console.warn('[Messenger] joinGroup failed for', conv.id, e);
              }
            }
          } catch (e) {
            console.warn('[Messenger] connectToChat/join groups failed', e);
          }
      } catch (error) {
        console.error('Load groups error:', error);
        setConversations([]);
      }
    } catch (error) {
      console.error('Load user data error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Lọc danh sách conversations dựa trên searchText
  const filteredConversations = useMemo(() => {
    if (!searchText.trim()) {
      return conversations;
    }

    const searchLower = searchText.toLowerCase().trim();
    
    return conversations.filter(conv => 
      conv.name?.toLowerCase().includes(searchLower)
    );
  }, [searchText, conversations]);

  // Listen for group avatar updates from SignalR and apply them
  useEffect(() => {
    let mounted = true;
    const handler = async (data) => {
      try {
        if (!mounted || !data) return;

        console.log('[Messenger] GroupAvatarUpdated payload received:', data);

        // Normalize conversation id to string for robust comparison
        const convIdRaw = data.conversationId ?? data.conversation_id ?? data.id ?? data.conversationId;
        const convIdStr = convIdRaw != null ? String(convIdRaw) : null;
        const avatarUrl = data.avatarUrl || data.avatar_url || data.avatar || null;
        if (!convIdStr) return;

        // Update AsyncStorage override so it persists locally (use string key)
        const key = `groupAvatar_${convIdStr}`;
        try { await AsyncStorage.setItem(key, avatarUrl); } catch (e) { console.warn('[Messenger] save avatar override failed', e); }

        // Update state list - compare as strings
        let updated = false;
        setConversations(prev => prev.map(c => {
          try {
            if (String(c.id) === convIdStr) {
              updated = true;
              return { ...c, avatarUrl: avatarUrl };
            }
          } catch (e) { /* ignore comparison errors */ }
          return c;
        }));

        // If this conversation wasn't in the list (edge-case), log for debugging
        if (!updated) {
          console.warn('[Messenger] GroupAvatarUpdated for unknown conversation:', convIdStr);
        }
      } catch (e) {
        console.error('[Messenger] onGroupAvatarUpdated handler error', e);
      }
    };

    try {
      // Ensure chat connection exists so handler attaches to an active connection if possible
      signalRService.connectToChat().catch(() => {});
      signalRService.onGroupAvatarUpdated(handler);
    } catch (e) {
      console.warn('[Messenger] Failed to attach GroupAvatarUpdated handler', e);
    }

    return () => {
      mounted = false;
      try {
        if (signalRService && typeof signalRService.removeHandler === 'function') {
          signalRService.removeHandler('GroupAvatarUpdated', handler);
        } else if (signalRService && signalRService.chatConnection && signalRService.chatConnection.off) {
          signalRService.chatConnection.off('GroupAvatarUpdated', handler);
        }
      } catch (e) { /* ignore */ }
    };
  }, []);

  // Listen for message-read broadcasts so we can clear unread counters in the group list
  useEffect(() => {
    let mounted = true;
    const handler = (data) => {
      try {
        if (!mounted || !data) return;

        const convIdRaw = data.conversationId ?? data.conversation_id ?? data.conversationId;
        const convIdStr = convIdRaw != null ? String(convIdRaw) : null;
        const actorUserId = data.userId ?? data.user_id ?? data.actorUserId ?? null;

        if (!convIdStr) return;

        // Only update if the read event refers to the current user (they opened the conversation)
        if (actorUserId && String(actorUserId) !== String(currentUserId)) {
          // another user read messages - we don't change our unread count
          return;
        }

        setConversations(prev => {
          // find conversation and set unreadCount to 0, move to top
          const idx = prev.findIndex(c => String(c.id) === convIdStr);
          if (idx === -1) return prev;
          const item = { ...prev[idx], unreadCount: 0 };
          const copy = [...prev.slice(0, idx), ...prev.slice(idx + 1)];
          return [item, ...copy];
        });
      } catch (e) {
        console.error('[Messenger] onMessageRead handler error', e);
      }
    };

    try {
      if (signalRService && typeof signalRService.onMessageRead === 'function') {
        signalRService.onMessageRead(handler);
      }
    } catch (e) {
      console.warn('[Messenger] Failed to attach MessageRead handler', e);
    }

    return () => {
      mounted = false;
      try {
        if (signalRService && signalRService.chatConnection && signalRService.chatConnection.off) {
          signalRService.chatConnection.off('MessageRead', handler);
        }
      } catch (e) { /* ignore */ }
    };
  }, [currentUserId]);

  // Listen for incoming messages so we can bump the conversation and increment unread
  useEffect(() => {
    let mounted = true;
    const handler = (message) => {
      try {
        if (!mounted || !message) return;

        const convIdRaw = message.conversationId ?? message.conversation_id ?? message.conversationId;
        const convIdStr = convIdRaw != null ? String(convIdRaw) : null;
        if (!convIdStr) return;

        const senderId = message.userId ?? message.user_id ?? message.senderId ?? message.sender_id ?? null;
        const content = message.content ?? message.Content ?? '';
        const createdAt = message.createdAt ?? message.created_at ?? null;

        setConversations(prev => {
          // remove existing entry if any
          const existingIdx = prev.findIndex(c => String(c.id) === convIdStr);
          let existing = null;
          let rest = prev;
          if (existingIdx !== -1) {
            existing = { ...prev[existingIdx] };
            rest = [...prev.slice(0, existingIdx), ...prev.slice(existingIdx + 1)];
          }

          const isFromMe = senderId && String(senderId) === String(currentUserId);

          const newItem = existing ? { ...existing } : { id: convIdStr, name: message.groupName || message.conversationName || `Group ${convIdStr}`, isGroup: true };
          // update preview/time/unread
          newItem.time = createdAt ? String(createdAt) : newItem.time;
          newItem.lastMessage = content;
          // increment unread only if not from current user
          newItem.unreadCount = (Number(newItem.unreadCount) || 0) + (isFromMe ? 0 : 1);

          return [newItem, ...rest];
        });
      } catch (e) {
        console.error('[Messenger] onReceiveMessage handler error', e);
      }
    };

    try {
      if (signalRService && typeof signalRService.onReceiveMessage === 'function') {
        signalRService.onReceiveMessage(handler);
      }
    } catch (e) {
      console.warn('[Messenger] Failed to attach ReceiveMessage handler', e);
    }

    return () => {
      mounted = false;
      try {
        if (signalRService && signalRService.chatConnection && signalRService.chatConnection.off) {
          signalRService.chatConnection.off('ReceiveMessage', handler);
        }
      } catch (e) { /* ignore */ }
    };
  }, [currentUserId]);

  // Listen for member removal events (when someone is removed or leaves and server persists removal)
  useEffect(() => {
    let mounted = true;
    const handler = async (data) => {
      try {
        if (!mounted || !data) return;
        const convId = Number(data.conversationId || data.conversationId);
        const removedUserId = Number(data.removedUserId || data.userId || data.user_id);
        if (!convId || !removedUserId) return;

        // If the removed user is the current user, remove the conversation from list and clear local cache
        if (String(removedUserId) === String(currentUserId)) {
          // remove from in-memory list
          setConversations(prev => prev.filter(c => Number(c.id) !== convId));

          // cleanup local storage keys related to this group
          try {
            await AsyncStorage.removeItem(`groupMembers_${convId}`);
            await AsyncStorage.removeItem(`groupInfo_${convId}`);
            await AsyncStorage.removeItem(`group_messages_${convId}`);
            await AsyncStorage.removeItem(`groupAvatar_${convId}`);
          } catch (e) {
            console.warn('[Messenger] cleanup after being removed failed', e);
          }
        } else {
          // Another member was removed -- update memberCount if present
          setConversations(prev => prev.map(c => {
            if (Number(c.id) === convId) {
              const curr = Number(c.memberCount) || 0;
              return { ...c, memberCount: Math.max(0, curr - 1) };
            }
            return c;
          }));
        }
      } catch (e) {
        console.error('[Messenger] onMemberRemoved handler error', e);
      }
    };

    try {
      if (signalRService && typeof signalRService.onMemberRemoved === 'function') {
        signalRService.onMemberRemoved(handler);
      }
    } catch (e) {
      console.warn('[Messenger] Failed to attach MemberRemoved handler', e);
    }

    return () => {
      mounted = false;
      try {
        if (signalRService && signalRService.chatConnection && signalRService.chatConnection.off) {
          signalRService.chatConnection.off('MemberRemoved', handler);
        }
      } catch (e) { /* ignore */ }
    };
  }, [currentUserId]);

  // Listen for group deletion events (admin deleted the group)
  useEffect(() => {
    let mounted = true;
    const handler = async (data) => {
      try {
        if (!mounted || !data) return;
        const convId = Number(data.conversationId || data.conversationId);
        if (!convId) return;

        // Remove conversation from list
        setConversations(prev => prev.filter(c => Number(c.id) !== convId));

        // cleanup local storage keys related to this group
        try {
          await AsyncStorage.removeItem(`groupMembers_${convId}`);
          await AsyncStorage.removeItem(`groupInfo_${convId}`);
          await AsyncStorage.removeItem(`group_messages_${convId}`);
          await AsyncStorage.removeItem(`groupAvatar_${convId}`);
        } catch (e) {
          console.warn('[Messenger] cleanup after group deleted failed', e);
        }
      } catch (e) {
        console.error('[Messenger] onGroupDeleted handler error', e);
      }
    };

    try {
      if (signalRService && typeof signalRService.onGroupDeleted === 'function') {
        signalRService.onGroupDeleted(handler);
      }
    } catch (e) {
      console.warn('[Messenger] Failed to attach GroupDeleted handler', e);
    }

    return () => {
      mounted = false;
      try {
        if (signalRService && signalRService.chatConnection && signalRService.chatConnection.off) {
          signalRService.chatConnection.off('GroupDeleted', handler);
        }
      } catch (e) { /* ignore */ }
    };
  }, []);

  // Leave any joined groups when Messenger unmounts to avoid holding unnecessary group memberships
  useEffect(() => {
    return () => {
      try {
        const ids = Array.from(joinedGroupsRef.current || []);
        for (const id of ids) {
          try {
            signalRService.leaveGroup(id).catch(e => console.warn('[Messenger] leaveGroup failed', id, e));
          } catch (e) {
            console.warn('[Messenger] leaveGroup sync error', id, e);
          }
        }
      } catch (e) {
        /* ignore */
      }
    };
  }, []);

  // Lấy avatar URL
  const getAvatarUrl = () => {
    if (userProfile?.avatarUrl) {
      // Kiểm tra nếu là URL đầy đủ
      if (userProfile.avatarUrl.startsWith('http')) {
        return { uri: userProfile.avatarUrl };
      }
      // Nếu là relative path
      return { uri: `${API_BASE_URL}${userProfile.avatarUrl}` };
    }
    // Fallback: kiểm tra avatar_url (snake_case)
    if (userProfile?.avatar_url) {
      if (userProfile.avatar_url.startsWith('http')) {
        return { uri: userProfile.avatar_url };
      }
      return { uri: `${API_BASE_URL}${userProfile.avatar_url}` };
    }
    return null;
  };

  // Normalize group avatar url (returns a full uri string or null)
  const getAvatarUri = (avatarUrl) => {
    if (!avatarUrl) return null;
    // If already a file:// or http(s) full URL, return as-is
    if (avatarUrl.startsWith('file://') || avatarUrl.startsWith('http')) {
      return avatarUrl;
    }
    // Otherwise treat as server-relative path
    return `${API_BASE_URL}${avatarUrl}`;
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" translucent={false} />
        <SafeAreaView style={[styles.safeArea, { paddingTop: insets.top }]}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#3B82F6" />
            <Text style={styles.loadingText}>Đang tải...</Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

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
          
          {/* Hiển thị avatar và username thật */}
          <View style={styles.headerCenter}>
            {getAvatarUrl() ? (
              <Image 
                source={getAvatarUrl()} 
                style={styles.headerAvatar}
              />
            ) : (
              <View style={styles.headerAvatarPlaceholder}>
                <Ionicons name="person" size={16} color="#FFFFFF" />
              </View>
            )}
            <Text style={styles.headerTitle}>
              {userProfile?.username || 'Messenger'}
            </Text>
          </View>

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

        {/* Conversations List */}
        <ScrollView 
          style={styles.conversationsList}
          showsVerticalScrollIndicator={false}
        >
          {filteredConversations.length > 0 ? (
            filteredConversations.map((conv) => (
              <TouchableOpacity 
                key={conv.id} 
                style={styles.conversationItem}
                activeOpacity={0.7}
                onPress={() => {
                  if (conv.isGroup) {
                    navigation.navigate('GroupChat', { 
                      conversationId: conv.id,
                      groupName: conv.name 
                    });
                  } else {
                    navigation.navigate('Doanchat', { conversation: conv });
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
                    <View style={styles.avatarPlaceholder}>
                      <Ionicons name={conv.isGroup ? "people" : "person"} size={24} color="#FFFFFF" />
                    </View>
                  )}
                  {conv.unreadCount > 0 && (
                    <View style={styles.unreadBadge}>
                      <Text style={styles.unreadText}>{conv.unreadCount > 99 ? '99+' : String(conv.unreadCount)}</Text>
                    </View>
                  )}
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
                    {conv.time && <Text style={styles.conversationTime}>{conv.time}</Text>}
                  </View>
                  <Text style={styles.conversationMessage} numberOfLines={1}>
                    {conv.isGroup ? `Nhóm · ${conv.memberCount} thành viên` : (conv.message || 'Chưa có tin nhắn')}
                  </Text>
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
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  headerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  headerAvatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#9CA3AF',
    justifyContent: 'center',
    alignItems: 'center',
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
  avatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#9CA3AF',
    justifyContent: 'center',
    alignItems: 'center',
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
  conversationMessage: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
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
});
