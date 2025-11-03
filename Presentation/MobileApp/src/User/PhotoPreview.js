import React, { useState } from 'react';
import { View, Image, TouchableOpacity, Text, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { createPost } from '../API/Api';

export default function PhotoPreview() {
  const navigation = useNavigation();
  const route = useRoute();
  const { photoUri } = route.params;
  const [posting, setPosting] = useState(false);

  const handlePostPhoto = async () => {
    if (!photoUri) return;
    try {
      setPosting(true);
      const image = { uri: photoUri, name: 'photo.jpg', type: 'image/jpeg' };
      await createPost({ images: [image], caption: '', privacy: 'public' });
      const parent = typeof navigation.getParent === 'function' ? navigation.getParent() : null;
      if (parent && typeof parent.navigate === 'function') {
        parent.navigate('Home', { refresh: true });
      } else {
        navigation.navigate('Home', { refresh: true });
      }
    } catch (e) {
      Alert.alert('Lỗi', e.message || 'Không thể đăng ảnh');
    } finally {
      setPosting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>Hủy</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Xem trước ảnh</Text>
        <TouchableOpacity onPress={handlePostPhoto} disabled={posting}>
          <Text style={[styles.postButton, posting && { opacity: 0.6 }]}>{posting ? 'Đang đăng...' : 'Đăng'}</Text>
        </TouchableOpacity>
      </View>
      <Image source={{ uri: photoUri }} style={styles.photo} />
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: '#DBDBDB',
  },
  backButton: {
    fontSize: 16,
    color: '#262626',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#262626',
  },
  postButton: {
    fontSize: 16,
    color: '#0095F6',
    fontWeight: '600',
  },
  photo: {
    flex: 1,
    width: '100%',
    resizeMode: 'contain',
  },
});
