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
  Dimensions,
  Linking,
  FlatList,
  Modal,
  StatusBar,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ImageViewer from '../Components/ImageViewer';
import { Video } from 'expo-av';
import * as groupChatService from '../ServicesSingalR/groupChatService';

const { width } = Dimensions.get('window');
const IMAGE_SIZE = (width - 48) / 3; // 3 columns with gaps

export default function MediaLinksScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { conversationId, groupName } = route.params;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('images'); // images, videos, files, links
  const [images, setImages] = useState([]);
  const [videos, setVideos] = useState([]);
  const [files, setFiles] = useState([]);
  const [links, setLinks] = useState([]);
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [videoUri, setVideoUri] = useState(null);

  useEffect(() => {
    loadMediaAndLinks();
  }, [conversationId]);

  const loadMediaAndLinks = async () => {
    try {
      setLoading(true);
      // Try server-first: fetch many messages (paginated) and extract media/links
      try {
        const allMessages = [];
        let page = 1;
        const pageSize = 500;
        while (true) {
          const data = await groupChatService.getMessages(conversationId, page, pageSize);
          const msgs = data.messages || [];
          msgs.forEach(m => {
            allMessages.push({
              id: m.messageId || m.MessageId || m.id,
              userName: m.userName || m.UserName,
              message: m.content || m.Content,
              mediaUri: m.fileUrl || m.FileUrl,
              mediaType: m.messageType || m.MessageType,
              timestamp: m.createdAt || m.CreatedAt,
            });
          });
          if (!data.hasMore) break;
          page += 1;
        }

        if (allMessages.length > 0) {
          const imageMessages = allMessages.filter(msg => msg.mediaType === 'image' && msg.mediaUri);
          const videoMessages = allMessages.filter(msg => msg.mediaType === 'video' && msg.mediaUri);
          setImages(imageMessages);
          setVideos(videoMessages);

          // files - not implemented server-side yet
          setFiles([]);

          // Extract links
          const urlRegex = /(https?:\/\/[^\s]+)/g;
          const linkMessages = [];
          allMessages.forEach(msg => {
            if (msg.message) {
              const urls = msg.message.match(urlRegex);
              if (urls) {
                urls.forEach(url => linkMessages.push({ ...msg, url }));
              }
            }
          });
          setLinks(linkMessages);
          setLoading(false);
          return;
        }
      } catch (apiErr) {
        console.warn('Failed to load media from server, fallback to AsyncStorage', apiErr);
      }

      // Fallback: use AsyncStorage
      const storageKey = `group_messages_${conversationId}`;
      const savedMessages = await AsyncStorage.getItem(storageKey);
      
      if (savedMessages) {
        const messages = JSON.parse(savedMessages);
        
        // Filter images
        const imageMessages = messages.filter(msg => 
          msg.mediaType === 'image' && msg.mediaUri
        );
        setImages(imageMessages);
        
        // Filter videos
        const videoMessages = messages.filter(msg => 
          msg.mediaType === 'video' && msg.mediaUri
        );
        setVideos(videoMessages);
        
        // Filter files (future implementation)
        setFiles([]);
        
        // Extract links from messages
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        const linkMessages = [];
        messages.forEach(msg => {
          if (msg.message) {
            const urls = msg.message.match(urlRegex);
            if (urls) {
              urls.forEach(url => {
                linkMessages.push({
                  ...msg,
                  url: url,
                });
              });
            }
          }
        });
        setLinks(linkMessages);
      }
    } catch (error) {
      console.error('Load media error:', error);
      Alert.alert('Lỗi', 'Không thể tải phương tiện');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadMediaAndLinks();
    setRefreshing(false);
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const handleImagePress = (image, index) => {
    setSelectedImageIndex(index);
    setShowImageViewer(true);
  };

  const handleVideoPress = (video) => {
    try {
      if (!video || !video.mediaUri) {
        Alert.alert('Lỗi', 'Không tìm thấy video');
        return;
      }
      setVideoUri(video.mediaUri);
      setShowVideoModal(true);
    } catch (err) {
      console.error('handleVideoPress error', err);
      Alert.alert('Lỗi', 'Không thể mở video');
    }
  };

  const handleLinkPress = (url) => {
    Alert.alert(
      'Mở liên kết',
      url,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Mở',
          onPress: () => {
            Linking.openURL(url).catch(err => {
              Alert.alert('Lỗi', 'Không thể mở liên kết');
            });
          }
        }
      ]
    );
  };

  const renderImageItem = ({ item, index }) => (
    <TouchableOpacity
      style={styles.imageItem}
      onPress={() => handleImagePress(item, index)}
      activeOpacity={0.8}
    >
      <Image 
        source={{ uri: item.mediaUri }} 
        style={styles.imageThumb}
        resizeMode="cover"
      />
    </TouchableOpacity>
  );

  const renderVideoItem = ({ item, index }) => (
    <TouchableOpacity
      style={styles.imageItem}
      onPress={() => handleVideoPress(item)}
      activeOpacity={0.8}
    >
      <Image 
        source={{ uri: item.mediaUri }} 
        style={styles.imageThumb}
        resizeMode="cover"
      />
      <View style={styles.videoOverlay}>
        <Ionicons name="play-circle" size={40} color="#FFFFFF" />
      </View>
    </TouchableOpacity>
  );

  const renderLinkItem = (linkItem, index) => (
    <TouchableOpacity
      key={index}
      style={styles.linkItem}
      onPress={() => handleLinkPress(linkItem.url)}
      activeOpacity={0.7}
    >
      <View style={styles.linkIconContainer}>
        <Ionicons name="link" size={24} color="#3B82F6" />
      </View>
      
      <View style={styles.linkInfo}>
        <Text style={styles.linkUrl} numberOfLines={2}>
          {linkItem.url}
        </Text>
        <View style={styles.linkMeta}>
          <Text style={styles.linkSender}>{linkItem.userName}</Text>
          <Text style={styles.linkDate}> • {formatTimestamp(linkItem.timestamp)}</Text>
        </View>
      </View>
      
      <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
    </TouchableOpacity>
  );

  const renderContent = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Đang tải...</Text>
        </View>
      );
    }

    switch (activeTab) {
      case 'images':
        if (images.length === 0) {
          return (
            <View style={styles.emptyContainer}>
              <Ionicons name="image-outline" size={64} color="#D1D5DB" />
              <Text style={styles.emptyText}>Chưa có ảnh nào</Text>
            </View>
          );
        }
        return (
          <FlatList
            data={images}
            renderItem={renderImageItem}
            keyExtractor={(item, index) => item.id || index.toString()}
            numColumns={3}
            contentContainerStyle={styles.gridContainer}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={['#3B82F6']}
                tintColor="#3B82F6"
              />
            }
          />
        );

      case 'videos':
        if (videos.length === 0) {
          return (
            <View style={styles.emptyContainer}>
              <Ionicons name="videocam-outline" size={64} color="#D1D5DB" />
              <Text style={styles.emptyText}>Chưa có video nào</Text>
            </View>
          );
        }
        return (
          <FlatList
            data={videos}
            renderItem={renderVideoItem}
            keyExtractor={(item, index) => item.id || index.toString()}
            numColumns={3}
            contentContainerStyle={styles.gridContainer}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={['#3B82F6']}
                tintColor="#3B82F6"
              />
            }
          />
        );

      case 'files':
        return (
          <View style={styles.emptyContainer}>
            <Ionicons name="document-outline" size={64} color="#D1D5DB" />
            <Text style={styles.emptyText}>Chưa có file nào</Text>
            <Text style={styles.emptySubtext}>Tính năng đang phát triển</Text>
          </View>
        );

      case 'links':
        if (links.length === 0) {
          return (
            <View style={styles.emptyContainer}>
              <Ionicons name="link-outline" size={64} color="#D1D5DB" />
              <Text style={styles.emptyText}>Chưa có liên kết nào</Text>
            </View>
          );
        }
        return (
          <ScrollView
            style={styles.linksList}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={['#3B82F6']}
                tintColor="#3B82F6"
              />
            }
          >
            {links.map((link, index) => renderLinkItem(link, index))}
          </ScrollView>
        );

      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="chevron-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Phương tiện & liên kết</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'images' && styles.activeTab]}
          onPress={() => setActiveTab('images')}
        >
          <Ionicons 
            name="image" 
            size={20} 
            color={activeTab === 'images' ? '#3B82F6' : '#6B7280'} 
          />
          <Text style={[styles.tabText, activeTab === 'images' && styles.activeTabText]}>
            Ảnh
          </Text>
          {images.length > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{images.length}</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'videos' && styles.activeTab]}
          onPress={() => setActiveTab('videos')}
        >
          <Ionicons 
            name="videocam" 
            size={20} 
            color={activeTab === 'videos' ? '#3B82F6' : '#6B7280'} 
          />
          <Text style={[styles.tabText, activeTab === 'videos' && styles.activeTabText]}>
            Video
          </Text>
          {videos.length > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{videos.length}</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'files' && styles.activeTab]}
          onPress={() => setActiveTab('files')}
        >
          <Ionicons 
            name="document" 
            size={20} 
            color={activeTab === 'files' ? '#3B82F6' : '#6B7280'} 
          />
          <Text style={[styles.tabText, activeTab === 'files' && styles.activeTabText]}>
            File
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'links' && styles.activeTab]}
          onPress={() => setActiveTab('links')}
        >
          <Ionicons 
            name="link" 
            size={20} 
            color={activeTab === 'links' ? '#3B82F6' : '#6B7280'} 
          />
          <Text style={[styles.tabText, activeTab === 'links' && styles.activeTabText]}>
            Liên kết
          </Text>
          {links.length > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{links.length}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Content */}
      {renderContent()}

      {/* Video Modal */}
      <Modal
        visible={showVideoModal}
        transparent={false}
        animationType="slide"
        onRequestClose={() => setShowVideoModal(false)}
      >
        <StatusBar barStyle="light-content" backgroundColor="#000" />
        <View style={{ flex: 1, backgroundColor: '#000' }}>
          <TouchableOpacity style={{ position: 'absolute', top: 40, left: 16, zIndex: 20 }} onPress={() => setShowVideoModal(false)}>
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>
          {videoUri ? (
            <Video
              source={{ uri: videoUri }}
              style={{ flex: 1 }}
              useNativeControls
              resizeMode="contain"
              shouldPlay
              onError={(e) => {
                console.error('Video player error', e);
                Alert.alert('Lỗi', 'Không thể phát video');
              }}
            />
          ) : (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
              <Text style={{ color: '#fff' }}>Không thể tải video</Text>
            </View>
          )}
        </View>
      </Modal>

      {/* Image Viewer */}
      <ImageViewer
        visible={showImageViewer}
        images={images}
        initialIndex={selectedImageIndex}
        onClose={() => setShowImageViewer(false)}
      />
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
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 6,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#3B82F6',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  activeTabText: {
    color: '#3B82F6',
    fontWeight: '600',
  },
  badge: {
    backgroundColor: '#3B82F6',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
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
  gridContainer: {
    padding: 12,
  },
  imageItem: {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
    margin: 2,
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: '#F3F4F6',
  },
  imageThumb: {
    width: '100%',
    height: '100%',
  },
  videoOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  linksList: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  linkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  linkIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  linkInfo: {
    flex: 1,
  },
  linkUrl: {
    fontSize: 14,
    color: '#3B82F6',
    marginBottom: 4,
  },
  linkMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  linkSender: {
    fontSize: 13,
    color: '#6B7280',
  },
  linkDate: {
    fontSize: 13,
    color: '#9CA3AF',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 15,
    color: '#9CA3AF',
  },
  emptySubtext: {
    marginTop: 8,
    fontSize: 13,
    color: '#D1D5DB',
  },
});
