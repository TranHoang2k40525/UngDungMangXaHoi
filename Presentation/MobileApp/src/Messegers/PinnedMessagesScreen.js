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
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as groupChatService from '../ServicesSingalR/groupChatService';

export default function PinnedMessagesScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { conversationId, groupName } = route.params;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pinnedMessages, setPinnedMessages] = useState([]);

  useEffect(() => {
    loadPinnedMessages();
  }, [conversationId]);

  const loadPinnedMessages = async () => {
    try {
      setLoading(true);
      // Try API first (server source of truth)
      try {
        const apiPinned = await groupChatService.getPinnedMessages(conversationId);
        if (Array.isArray(apiPinned)) {
          // Normalize items to local message shape
          const normalized = apiPinned.map(m => ({
            id: m.messageId || m.MessageId || m.id,
            userName: m.userName || m.UserName,
            message: m.content || m.Content,
            mediaUri: m.fileUrl || m.FileUrl,
            mediaType: m.messageType || m.MessageType,
            timestamp: m.createdAt || m.CreatedAt,
            pinnedAt: m.pinnedAt || m.PinnedAt || new Date().toISOString(),
            isPinned: true,
          }));
          normalized.sort((a, b) => new Date(b.pinnedAt) - new Date(a.pinnedAt));
          setPinnedMessages(normalized);
          setLoading(false);
          return;
        }
      } catch (apiErr) {
        console.warn('getPinnedMessages API failed, fallback to AsyncStorage', apiErr);
      }

      // Fallback to AsyncStorage if API not available
      const storageKey = `group_messages_${conversationId}`;
      const savedMessages = await AsyncStorage.getItem(storageKey);
      if (savedMessages) {
        const messages = JSON.parse(savedMessages);
        // Filter only pinned messages
        const pinned = messages.filter(msg => msg.isPinned === true);
        // Sort by pinned date (most recent first)
        pinned.sort((a, b) => {
          const dateA = new Date(a.pinnedAt || a.timestamp);
          const dateB = new Date(b.pinnedAt || b.timestamp);
          return dateB - dateA;
        });
        setPinnedMessages(pinned);
      } else {
        setPinnedMessages([]);
      }
    } catch (error) {
      console.error('Load pinned messages error:', error);
      Alert.alert('Lỗi', 'Không thể tải tin nhắn đã ghim');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadPinnedMessages();
    setRefreshing(false);
  };

  const handleUnpinMessage = async (messageId) => {
    Alert.alert(
      'Bỏ ghim tin nhắn',
      'Bạn có chắc muốn bỏ ghim tin nhắn này?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Bỏ ghim',
          style: 'destructive',
          onPress: async () => {
            try {
              // Load all messages - USE CORRECT KEY
              const storageKey = `group_messages_${conversationId}`;
              const savedMessages = await AsyncStorage.getItem(storageKey);
              
              if (savedMessages) {
                const messages = JSON.parse(savedMessages);
                const updatedMessages = messages.map(msg => {
                  if (msg.id === messageId) {
                    return { ...msg, isPinned: false, pinnedAt: null };
                  }
                  return msg;
                });
                
                await AsyncStorage.setItem(storageKey, JSON.stringify(updatedMessages));
                
                // Update local state
                setPinnedMessages(prev => prev.filter(msg => msg.id !== messageId));
                
                Alert.alert('Thành công', 'Đã bỏ ghim tin nhắn');
              }
            } catch (error) {
              console.error('Unpin message error:', error);
              Alert.alert('Lỗi', 'Không thể bỏ ghim tin nhắn');
            }
          }
        }
      ]
    );
  };

  const handleGoToMessage = (message) => {
    // Navigate back to GroupChat and scroll to this message
    navigation.navigate('GroupChat', {
      conversationId,
      groupName,
      scrollToMessageId: message.id,
    });
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    } else if (days === 1) {
      return 'Hôm qua';
    } else if (days < 7) {
      return `${days} ngày trước`;
    } else {
      return date.toLocaleDateString('vi-VN');
    }
  };

  const renderMessageItem = (message, index) => (
    <TouchableOpacity 
      key={message.id || index}
      style={styles.messageItem}
      onPress={() => handleGoToMessage(message)}
      activeOpacity={0.7}
    >
      <View style={styles.messageHeader}>
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{message.userName || 'Người dùng'}</Text>
          <Text style={styles.timestamp}>{formatTimestamp(message.timestamp)}</Text>
        </View>
        
        <TouchableOpacity
          style={styles.unpinButton}
          onPress={() => handleUnpinMessage(message.id)}
        >
          <Ionicons name="close-circle" size={24} color="#EF4444" />
        </TouchableOpacity>
      </View>

      <View style={styles.messageContent}>
        {message.mediaUri && (
          <View style={styles.mediaPreview}>
            {message.mediaType === 'image' ? (
              <Image 
                source={{ uri: message.mediaUri }} 
                style={styles.mediaImage}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.videoPlaceholder}>
                <Ionicons name="play-circle" size={48} color="#FFFFFF" />
              </View>
            )}
          </View>
        )}
        
        {message.message && (
          <Text style={styles.messageText} numberOfLines={3}>
            {message.message}
          </Text>
        )}
      </View>

      <View style={styles.messageFooter}>
        <Ionicons name="pin" size={14} color="#3B82F6" />
        <Text style={styles.pinnedLabel}>Đã ghim</Text>
      </View>
    </TouchableOpacity>
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
          <Text style={styles.headerTitle}>Tin nhắn đã ghim</Text>
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
        <Text style={styles.headerTitle}>Tin nhắn đã ghim</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Pinned Count */}
      {pinnedMessages.length > 0 && (
        <View style={styles.countContainer}>
          <Ionicons name="pin" size={16} color="#3B82F6" />
          <Text style={styles.countText}>
            {pinnedMessages.length} tin nhắn được ghim
          </Text>
        </View>
      )}

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
        {pinnedMessages.length > 0 ? (
          pinnedMessages.map((message, index) => renderMessageItem(message, index))
        ) : (
          <View style={styles.emptyContainer}>
            <Ionicons name="pin-outline" size={64} color="#D1D5DB" />
            <Text style={styles.emptyTitle}>Chưa có tin nhắn được ghim</Text>
            <Text style={styles.emptyText}>
              Nhấn giữ vào tin nhắn trong nhóm và chọn "Ghim" để ghim tin nhắn quan trọng
            </Text>
          </View>
        )}
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
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
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
  countContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  countText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
    color: '#3B82F6',
  },
  content: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  messageItem: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
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
  timestamp: {
    fontSize: 13,
    color: '#6B7280',
  },
  unpinButton: {
    padding: 4,
  },
  messageContent: {
    marginBottom: 8,
  },
  mediaPreview: {
    marginBottom: 8,
    borderRadius: 12,
    overflow: 'hidden',
  },
  mediaImage: {
    width: '100%',
    height: 200,
    backgroundColor: '#F3F4F6',
  },
  videoPlaceholder: {
    width: '100%',
    height: 200,
    backgroundColor: '#374151',
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageText: {
    fontSize: 15,
    color: '#374151',
    lineHeight: 22,
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pinnedLabel: {
    marginLeft: 6,
    fontSize: 13,
    fontWeight: '500',
    color: '#3B82F6',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    marginTop: 16,
    fontSize: 17,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 20,
  },
});
