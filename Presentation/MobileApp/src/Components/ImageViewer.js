import React, { useState, useRef } from 'react';
import {
  View,
  Modal,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  FlatList,
  Text,
  StatusBar,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');

export default function ImageViewer({ visible, images, initialIndex = 0, onClose }) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const flatListRef = useRef(null);

  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index);
    }
  }).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
  }).current;

  const renderItem = ({ item }) => (
    <View style={styles.imageContainer}>
      <Image
        source={{ uri: item.mediaUri || item.uri }}
        style={styles.fullImage}
        resizeMode="contain"
      />
    </View>
  );

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="fade"
      onRequestClose={onClose}
    >
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      <SafeAreaView style={styles.container} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Ionicons name="close" size={28} color="#FFFFFF" />
          </TouchableOpacity>
          
          <Text style={styles.counter}>
            {currentIndex + 1} / {images.length}
          </Text>
          
          <View style={styles.headerRight}>
            <TouchableOpacity style={styles.iconButton}>
              <Ionicons name="download-outline" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconButton}>
              <Ionicons name="ellipsis-horizontal" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Image Gallery */}
        <FlatList
          ref={flatListRef}
          data={images}
          renderItem={renderItem}
          keyExtractor={(item, index) => item.id?.toString() || index.toString()}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          initialScrollIndex={initialIndex}
          getItemLayout={(data, index) => ({
            length: width,
            offset: width * index,
            index,
          })}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
        />

        {/* Footer with sender info */}
        {images[currentIndex]?.userName && (
          <View style={styles.footer}>
            <View style={styles.senderInfo}>
              <Ionicons name="person-circle" size={32} color="#FFFFFF" />
              <View style={styles.senderText}>
                <Text style={styles.senderName}>{images[currentIndex].userName}</Text>
                {images[currentIndex].timestamp && (
                  <Text style={styles.timestamp}>
                    {new Date(images[currentIndex].timestamp).toLocaleDateString('vi-VN', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                )}
              </View>
            </View>
            {images[currentIndex].message && (
              <Text style={styles.caption} numberOfLines={2}>
                {images[currentIndex].message}
              </Text>
            )}
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  closeButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  counter: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageContainer: {
    width: width,
    height: height - 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullImage: {
    width: '100%',
    height: '100%',
  },
  footer: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  senderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  senderText: {
    marginLeft: 12,
    flex: 1,
  },
  senderName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  timestamp: {
    fontSize: 13,
    color: '#B0B0B0',
  },
  caption: {
    fontSize: 14,
    color: '#FFFFFF',
    lineHeight: 20,
  },
});
