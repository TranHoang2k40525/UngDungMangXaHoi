import React from 'react';
import { View, Image, TouchableOpacity, Text, StyleSheet, SafeAreaView } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';

export default function PhotoPreview() {
  const navigation = useNavigation();
  const route = useRoute();
  const { photoUri } = route.params;

  const handlePostPhoto = () => {
    // Logic để đăng ảnh (có thể thêm API call hoặc lưu vào state)
    console.log('Photo posted:', photoUri);
    // Quay lại màn hình Home sau khi đăng
    navigation.navigate('Home');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>Hủy</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Xem trước ảnh</Text>
        <TouchableOpacity onPress={handlePostPhoto}>
          <Text style={styles.postButton}>Đăng</Text>
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
