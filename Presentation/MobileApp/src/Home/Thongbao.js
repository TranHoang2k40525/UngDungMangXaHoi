import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

// Dữ liệu thông báo mẫu
const notificationsData = [
  { id: '1', message: 'Hoàng đã thích bài viết của bạn!', time: '15:07', avatar: 'https://i.pravatar.cc/150?img=8' },
  { id: '2', message: 'Quân đã bình luận: "Tuyệt vời!"', time: '14:50', avatar: 'https://i.pravatar.cc/150?img=5' },
  { id: '3', message: 'Trang đã theo dõi bạn!', time: '13:30', avatar: 'https://i.pravatar.cc/150?img=3' },
  { id: '4', message: 'Vinh đã gửi cho bạn một tin nhắn!', time: '12:15', avatar: 'https://i.pravatar.cc/150?img=7' },
  { id: '5', message: 'Linh đã thích câu chuyện của bạn!', time: '11:00', avatar: 'https://i.pravatar.cc/150?img=4' },
];

const NotificationItem = ({ message, time, avatar }) => (
  <View style={styles.notificationItem}>
    <Image source={{ uri: avatar }} style={styles.notificationAvatar} />
    <View style={styles.notificationContent}>
      <Text style={styles.notificationMessage}>{message}</Text>
      <Text style={styles.notificationTime}>{time}</Text>
    </View>
  </View>
);

export default function Thongbao() {
  const navigation = useNavigation();

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.navItem} onPress={() => navigation.goBack()}>
          <Image
            source={require('../Assets/icons8-back-24.png')}
            style={[styles.cameraIconImage, { width: 29, height: 29 }]}
          />
        </TouchableOpacity>

        <Text style={styles.logo}>Thông báo</Text>

        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.headerIconWrapper}>
            <View style={styles.heartIconHeader} />
          </TouchableOpacity>
     
          <TouchableOpacity 
            style={styles.navItem}
            onPress={() => navigation.navigate('Messenger')}
          >
            <Image
              source={require('../Assets/icons8-facebook-messenger-50.png')}
              style={[styles.homeIconImage, { width: 30, height: 30 }]}
            />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Notifications List */}
        <View style={styles.notificationsContainer}>
          {notificationsData.map((item) => (
            <NotificationItem
              key={item.id}
              message={item.message}
              time={item.time}
              avatar={item.avatar}
            />
          ))}
        </View>
      </ScrollView>

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <TouchableOpacity 
          style={styles.navItem}
          onPress={() => {
            const parent = typeof navigation.getParent === 'function' ? navigation.getParent() : null;
            if (parent && typeof parent.navigate === 'function') parent.navigate('Home');
            else navigation.navigate('Home');
          }}
        >
          <Image
            source={require('../Assets/icons8-home-32.png')}
            style={[styles.homeIconImage, { width: 33, height: 33 }]}
          />
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.navItem}
          onPress={() => navigation.navigate('Search')}
        >
          <View style={styles.searchIconWrapper}>
            <View style={styles.searchCircle} />
            <View style={styles.searchHandle} />
          </View>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem}>
          <View style={styles.addIconWrapper}>
            <View style={styles.addSquare} />
            <View style={styles.addHorizontal} />
            <View style={styles.addVertical} />
          </View>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.navItem}
          onPress={() => {
            const parent = typeof navigation.getParent === 'function' ? navigation.getParent() : null;
            if (parent && typeof parent.navigate === 'function') parent.navigate('MainTabs', { screen: 'Video' });
            else navigation.navigate('MainTabs', { screen: 'Video' });
          }}
        >
          <View style={styles.reelsIconWrapper}>
            <View style={styles.reelsSquare} />
            <View style={styles.reelsPlay} />
          </View>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.navItem}
          onPress={() => navigation.navigate('Profile')}
        >
          <Image
            source={{ uri: 'https://i.pravatar.cc/150?img=9' }}
            style={styles.profileIcon}
          />
        </TouchableOpacity>
      </View>
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
  logo: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  headerRight: {
    flexDirection: 'row',
    gap: 20,
  },
  headerIconWrapper: {
    width: 26,
    height: 26,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heartIconHeader: {
    width: 24,
    height: 24,
    position: 'relative',
  },
  cameraIconImage: {
    width: 29,
    height: 29,
  },
  homeIconImage: {
    width: 30,
    height: 30,
    borderRadius: 0,
  },
  notificationsContainer: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: '#DBDBDB',
  },
  notificationAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  notificationContent: {
    flex: 1,
  },
  notificationMessage: {
    fontSize: 14,
    color: '#262626',
  },
  notificationTime: {
    fontSize: 12,
    color: '#8E8E8E',
    marginTop: 4,
  },
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 0.5,
    borderTopColor: '#DBDBDB',
    backgroundColor: '#FFFFFF',
  },
  navItem: {
    padding: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchIconWrapper: {
    width: 26,
    height: 26,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  searchCircle: {
    width: 18,
    height: 18,
    borderWidth: 2.5,
    borderColor: '#000',
    borderRadius: 9,
    position: 'absolute',
    top: 2,
    left: 2,
  },
  searchHandle: {
    width: 8,
    height: 2.5,
    backgroundColor: '#000',
    position: 'absolute',
    bottom: 2,
    right: 2,
    transform: [{ rotate: '45deg' }],
    borderRadius: 2,
  },
  addIconWrapper: {
    width: 26,
    height: 26,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  addSquare: {
    width: 24,
    height: 24,
    borderWidth: 2.5,
    borderColor: '#000',
    borderRadius: 3,
  },
  addHorizontal: {
    width: 12,
    height: 2.5,
    backgroundColor: '#000',
    position: 'absolute',
    borderRadius: 2,
  },
  addVertical: {
    width: 2.5,
    height: 12,
    backgroundColor: '#000',
    position: 'absolute',
    borderRadius: 2,
  },
  reelsIconWrapper: {
    width: 26,
    height: 26,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  reelsSquare: {
    width: 24,
    height: 24,
    borderWidth: 2.5,
    borderColor: '#000',
    borderRadius: 4,
  },
  reelsPlay: {
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderTopWidth: 5,
    borderBottomWidth: 5,
    borderLeftColor: '#000',
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    position: 'absolute',
    left: 10,
  },
  profileIcon: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: '#000',
  },
});
