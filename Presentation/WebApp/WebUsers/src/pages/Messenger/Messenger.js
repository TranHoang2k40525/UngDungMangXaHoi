import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import MessageAPI from '../../api/MessageAPI';
import { getProfile, getMyGroups, API_BASE_URL, getFollowing } from '../../api/Api';
import signalRService from '../../Services/signalRService';
import NavigationBar from '../../Components/NavigationBar';
import { IoSearch } from 'react-icons/io5';
import { MdArrowBack, MdGroup, MdChatBubbleOutline, MdPersonAdd } from 'react-icons/md';
import './Messenger.css';

export default function Messenger() {
  const [searchText, setSearchText] = useState('');
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [userProfile, setUserProfile] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [currentUserName, setCurrentUserName] = useState('');
  const [allFollowing, setAllFollowing] = useState([]);
  const [showAllFollowing, setShowAllFollowing] = useState(false);
  const joinedGroupsRef = useRef(new Set());
  const [isSignalRConnected, setIsSignalRConnected] = useState(false);
  const navigate = useNavigate();

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

  // Load conversations - both 1:1 and groups
  const loadConversations = useCallback(async () => {
    try {
      setLoading(true);
      
      // Get ALL 1:1 conversations (including with strangers)
      const conversationsResponse = await MessageAPI.getConversations();
      console.log('[Messenger] Conversations response:', conversationsResponse);
      
      let oneToOneConversations = [];
      if (conversationsResponse.success && conversationsResponse.data) {
        oneToOneConversations = conversationsResponse.data.map(conv => {
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

      console.log('[Messenger] Loaded 1:1 conversations:', oneToOneConversations.length);

      // Load mutual followers for avatar bar (people who follow each other)
      if (!currentUserId) {
        console.warn('[Messenger] Cannot load mutual followers - currentUserId is null');
        setAllFollowing([]);
      } else {
        try {
          // Get all mutual followers regardless of conversation status
          const followingData = await getFollowing(currentUserId);
          console.log('[Messenger] Raw following data:', followingData?.slice(0, 2));
          
          // Normalize field names for each user
          // Backend returns: userId, username, fullName, avatarUrl
          const normalizedFollowing = (followingData || []).map(user => {
            const userId = user.userId ?? user.user_id ?? user.id;
            const fullName = user.fullName ?? user.full_name ?? user.name ?? user.username;
            const avatarUrl = user.avatarUrl ?? user.avatar_url ?? user.avatar;
            const username = user.username ?? user.userName;
            
            console.log('[Messenger] User normalized:', {
              original: user,
              normalized: { userId, fullName, avatarUrl, username }
            });
            
            return {
              user_id: userId,
              full_name: fullName,
              avatar_url: avatarUrl,
              username: username
            };
          }).filter(user => user.user_id);
          
          console.log('[Messenger] Normalized following users:', normalizedFollowing.length);
          setAllFollowing(normalizedFollowing);
        } catch (err) {
          console.error('[Messenger] Error loading following:', err);
          setAllFollowing([]);
        }
      }

      // Get group conversations
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
          try { 
            savedAvatar = localStorage.getItem(savedAvatarKey); 
          } catch (e) { 
            console.warn('[Messenger] read saved avatar failed', e); 
          }

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

      // Merge and sort by time (most recent first)
      const allConversations = [...oneToOneConversations, ...groupConversations].sort((a, b) => {
        const timeA = new Date(a.time || 0).getTime();
        const timeB = new Date(b.time || 0).getTime();
        return timeB - timeA;
      });

      setConversations(allConversations);
      console.log('[Messenger] Loaded all conversations:', allConversations.length);

      // Join groups for realtime updates
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

  // Initialize SignalR for chat
  useEffect(() => {
    const initSignalR = async () => {
      try {
        const chatConn = await signalRService.connectToChat();
        
        if (chatConn) {
          setIsSignalRConnected(true);
          console.log('[Messenger] SignalR connected');

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

          // Direct connection.on setup
          chatConn.on('ReceiveMessage', handleMessageReceived);
          chatConn.on('OnlineUsers', handleOnlineUsers);
          chatConn.on('UserOnline', handleUserOnline);
          chatConn.on('UserOffline', handleUserOffline);

          return () => {
            try {
              chatConn.off('ReceiveMessage', handleMessageReceived);
              chatConn.off('OnlineUsers', handleOnlineUsers);
              chatConn.off('UserOnline', handleUserOnline);
              chatConn.off('UserOffline', handleUserOffline);
            } catch (e) { /* ignore */ }
          };
        }
      } catch (error) {
        console.error('[Messenger] SignalR connection error:', error);
        setIsSignalRConnected(false);
      }
    };

    initSignalR();
  }, [loadConversations]);

  // SignalR handlers for groups
  useEffect(() => {
    let mounted = true;
    const avatarHandler = async (data) => {
      if (!mounted || !data) return;
      const convIdStr = String(data.conversationId ?? data.conversation_id ?? data.id ?? data.conversationId);
      const avatarUrl = data.avatarUrl || data.avatar_url || data.avatar || null;
      if (!convIdStr) return;

      const key = `groupAvatar_${convIdStr}`;
      try { 
        localStorage.setItem(key, avatarUrl); 
      } catch (e) { 
        console.warn('[Messenger] save avatar override failed', e); 
      }

      setConversations(prev => prev.map(c => {
        if (String(c.id) === convIdStr && c.isGroup) {
          return { ...c, avatarUrl: avatarUrl };
        }
        return c;
      }));
    };

    const setupGroupHandlers = async () => {
      try {
        const chatConn = await signalRService.connectToChat();
        if (chatConn) {
          chatConn.on('GroupAvatarUpdated', avatarHandler);
        }
      } catch (e) {
        console.warn('[Messenger] Setup group handlers error:', e);
      }
    };

    setupGroupHandlers();

    return () => {
      mounted = false;
      try {
        if (signalRService.chatConnection) {
          signalRService.chatConnection.off('GroupAvatarUpdated', avatarHandler);
        }
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

    const setupReadHandler = async () => {
      try {
        const chatConn = await signalRService.connectToChat();
        if (chatConn) {
          chatConn.on('MessageRead', readHandler);
        }
      } catch (e) {
        console.warn('[Messenger] Setup read handler error:', e);
      }
    };

    setupReadHandler();

    return () => {
      mounted = false;
      try {
        if (signalRService.chatConnection) {
          signalRService.chatConnection.off('MessageRead', readHandler);
        }
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

    const setupMessageHandler = async () => {
      try {
        const chatConn = await signalRService.connectToChat();
        if (chatConn) {
          chatConn.on('ReceiveMessage', messageHandler);
        }
      } catch (e) {
        console.warn('[Messenger] Setup message handler error:', e);
      }
    };

    setupMessageHandler();

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
          localStorage.removeItem(`groupMembers_${convId}`);
          localStorage.removeItem(`groupInfo_${convId}`);
          localStorage.removeItem(`group_messages_${convId}`);
          localStorage.removeItem(`groupAvatar_${convId}`);
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

    const setupRemovedHandler = async () => {
      try {
        const chatConn = await signalRService.connectToChat();
        if (chatConn) {
          chatConn.on('MemberRemoved', removedHandler);
        }
      } catch (e) {
        console.warn('[Messenger] Setup removed handler error:', e);
      }
    };

    setupRemovedHandler();

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
        localStorage.removeItem(`groupMembers_${convId}`);
        localStorage.removeItem(`groupInfo_${convId}`);
        localStorage.removeItem(`group_messages_${convId}`);
        localStorage.removeItem(`groupAvatar_${convId}`);
      } catch (e) {
        console.warn('[Messenger] cleanup after group deleted failed', e);
      }
    };

    const setupDeletedHandler = async () => {
      try {
        const chatConn = await signalRService.connectToChat();
        if (chatConn) {
          chatConn.on('GroupDeleted', deletedHandler);
        }
      } catch (e) {
        console.warn('[Messenger] Setup deleted handler error:', e);
      }
    };

    setupDeletedHandler();

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

  // Load on mount - only when currentUserId is available
  useEffect(() => {
    if (!currentUserId) {
      console.log('[Messenger] Waiting for currentUserId to load...');
      return;
    }
    console.log('[Messenger] Component mounted - loading conversations with userId:', currentUserId);
    loadConversations();
  }, [currentUserId, loadConversations]);

  // Filter conversations
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
    if (avatarUrl.startsWith('file://') || avatarUrl.startsWith('http')) {
      return avatarUrl;
    }
    return `${API_BASE_URL}${avatarUrl}`;
  };

  if (loading) {
    return (
      <div className="messenger-container">
        <div className="loading-container">
          <div className="spinner"></div>
          <p className="loading-text">Đang tải...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="messenger-container">
      <div className="messenger-content">
        {/* Header */}
        <div className="header">
          <button className="back-button" onClick={() => navigate(-1)}>
            ←
          </button>
          <h1 className="header-title">{currentUserName || 'Messages'}</h1>
          <div className="header-actions">
            <button className="group-button" onClick={() => navigate('/group-list')}>
              👥
            </button>
            <button className="compose-button"></button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="search-container">
          <IoSearch className="search-icon" size={16} />
          <input
            type="text"
            className="search-input"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Search"
          />
          {searchText.length > 0 && (
            <button className="clear-button" onClick={() => setSearchText('')}>
              ×
            </button>
          )}
        </div>

        {/* Avatar Bar - Mutual Followers (Facebook style) */}
        {allFollowing.length > 0 && !searchText && (
          <div className="avatar-bar-container">
            <div className="avatar-bar">
              {allFollowing.slice(0, 10).map((user, index) => (
                <div
                  key={user.user_id || `user-${index}`}
                  className="avatar-bar-item"
                  onClick={() => {
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
                    
                    navigate('/messenger/chat/' + user.user_id, {
                      state: {
                        userId: user.user_id,
                        userName: user.full_name || user.username || 'User',
                        userAvatar: fullAvatarUrl,
                        username: user.username
                      }
                    });
                  }}
                  title={user.full_name}
                >
                  <div className="avatar-bar-avatar-wrapper">
                    {user.avatar_url ? (
                      <img 
                        src={user.avatar_url.startsWith('http') ? user.avatar_url : `${API_BASE_URL}${user.avatar_url}`} 
                        alt={user.full_name} 
                        className="avatar-bar-avatar" 
                      />
                    ) : (
                      <div className="avatar-bar-avatar default-avatar">
                        {user.full_name ? user.full_name.charAt(0).toUpperCase() : 'U'}
                      </div>
                    )}
                    {/* Online indicator for avatar bar */}
                    {isUserOnline(user.user_id) && (
                      <div className="avatar-bar-online-indicator"></div>
                    )}
                  </div>
                  <span className="avatar-bar-name">{user.full_name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Conversations List */}
        <div className="conversations-list">
          {/* Show all following section - removed, now using avatar bar instead */}

          {/* Active conversations */}
          {!searchText && conversations.length > 0 && (
            <div className="section-header">
              <h3 className="section-title">Tin nhắn gần đây</h3>
            </div>
          )}
          
          {filteredConversations.length > 0 ? (
            filteredConversations.map((conv) => (
              <div
                key={conv.isGroup ? `group_${conv.id}` : `user_${conv.otherUserId ?? conv.id}`}
                className="conversation-item"
                onClick={() => {
                  if (conv.isGroup) {
                    navigate('/messenger/group-chat/' + conv.id, {
                      state: {
                        conversationId: conv.id,
                        groupName: conv.name
                      }
                    });
                  } else {
                    // Use getAvatarUri to construct full URL
                    const fullAvatarUrl = getAvatarUri(conv.avatarUrl);
                    
                    navigate('/messenger/chat/' + conv.otherUserId, {
                      state: {
                        userId: conv.otherUserId,
                        userName: conv.name,
                        userAvatar: fullAvatarUrl,
                        username: conv.username
                      }
                    });
                  }
                }}
              >
                <div className="avatar-container">
                  {getAvatarUri(conv.avatarUrl) ? (
                    <img src={getAvatarUri(conv.avatarUrl)} alt={conv.name} className="avatar" />
                  ) : (
                    <div className="avatar default-avatar">
                      <span className="default-avatar-text">
                        {conv.name ? conv.name.charAt(0).toUpperCase() : (conv.isGroup ? 'G' : 'U')}
                      </span>
                    </div>
                  )}
                  {/* Unread badge */}
                  {conv.unreadCount > 0 && (
                    <div className="unread-badge">
                      <span className="unread-text">
                        {conv.unreadCount > 99 ? '99+' : String(conv.unreadCount)}
                      </span>
                    </div>
                  )}
                  {/* Online indicator for 1:1 */}
                  {!conv.isGroup && isUserOnline(conv.otherUserId) && (
                    <div className="online-indicator"></div>
                  )}
                  {/* Offline time for 1:1 */}
                  {!conv.isGroup && !isUserOnline(conv.otherUserId) && conv.lastSeen && (
                    <div className="offline-time-container">
                      <span className="offline-time-text">
                        {formatOfflineTime(conv.lastSeen)}
                      </span>
                    </div>
                  )}
                  {/* Group badge */}
                  {conv.isGroup && (
                    <div className="group-badge"><MdGroup size={16} /></div>
                  )}
                </div>
                <div className="conversation-content">
                  <div className="conversation-header">
                    <div className="name-container">
                      <span className="conversation-name">{conv.name}</span>
                      {conv.isGroup && conv.memberCount && (
                        <span className="member-count">({conv.memberCount})</span>
                      )}
                    </div>
                    {conv.time && <span className="conversation-time">{formatTime(conv.time)}</span>}
                  </div>
                  
                  {/* Last message */}
                  <div className="message-row">
                    <p className={`conversation-message ${conv.unreadCount > 0 ? 'unread-message' : ''}`}>
                      {conv.lastMessage?.content || (conv.isGroup ? `Nhóm · ${conv.memberCount || 0} thành viên` : 'Chưa có tin nhắn')}
                    </p>
                  </div>
                </div>
              </div>
            ))
          ) : (
            !searchText && allFollowing.length === 0 && (
              <div className="empty-state">
                <div className="empty-icon"><MdChatBubbleOutline size={48} /></div>
                <p className="empty-state-text">Chưa có tin nhắn</p>
                <p className="empty-state-subtext">
                  Follow bạn bè để bắt đầu trò chuyện
                </p>
              </div>
            )
          )}
          
          {searchText && filteredConversations.length === 0 && (
            <div className="empty-state">
              <div className="empty-icon"><MdChatBubbleOutline size={48} /></div>
              <p className="empty-state-text">Không tìm thấy cuộc trò chuyện</p>
              <p className="empty-state-subtext">Thử tìm kiếm với từ khóa khác</p>
            </div>
          )}
        </div>
      </div>
      <NavigationBar />
    </div>
  );
}
