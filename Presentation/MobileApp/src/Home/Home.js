import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  FlatList,
  StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

// Dữ liệu stories
const storiesData = [
  { id: '1', name: 'Hoàng', avatar: require('../Assets/trai.png'), hasStory: true },
  { id: '2', name: 'Quân', avatar: require('../Assets/noo.png'), hasStory: true },
  { id: '3', name: 'Trang', avatar: require('../Assets/gai2.png'), hasStory: true },
  { id: '4', name: 'Vinh', avatar: require('../Assets/meo.png'), hasStory: true },
  { id: '5', name: 'Linh', avatar: require('../Assets/gai1.png'), hasStory: false },
  { id: '6', name: 'Việt', avatar: require('../Assets/embe.png'), hasStory: true },
  { id: '7', name: 'Tùng', avatar: require('../Assets/sontung.png'), hasStory: false },
];

// Component Story Item
const StoryItem = ({ name, avatar, hasStory }) => (
  <TouchableOpacity style={styles.storyItem}>
    <View style={[styles.storyAvatarContainer, hasStory && styles.storyAvatarBorder]}>
      <Image source={avatar} style={styles.storyAvatar} />
    </View>
    <Text style={styles.storyName}>{name}</Text>
  </TouchableOpacity>
);

export default function Home() {
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [likes, setLikes] = useState(250); // Số lượt thích ban đầu
  const [comments, setComments] = useState(15); // Số bình luận ban đầu
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="#FFFFFF"
        translucent={false}
      />
      <SafeAreaView style={[styles.safeArea, { paddingTop: insets.top }]}>
        {/* Header */}
        <View style={styles.header}>
        <TouchableOpacity style={styles.navItem}>
          <Image
            source={require('../Assets/icons8-camera-50.png')}
            style={[styles.cameraIconImage, { width: 29, height: 29 }]}
          />
        </TouchableOpacity>

        <Text style={styles.logo}>SNA67CS</Text>

        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.headerIconWrapper}>
            <View style={styles.heartIconHeader} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.navItem}>
            <Image
              source={require('../Assets/icons8-notification-48.png')}
              style={[styles.homeIconImage, { width: 30, height: 30 }]}
            />
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
        {/* Stories */}
        <View style={styles.storiesContainer}>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={storiesData}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <StoryItem name={item.name} avatar={item.avatar} hasStory={item.hasStory} />
            )}
          />
        </View>

        {/* Post */}
        <View style={styles.post}>
          {/* Post Header */}
          <View style={styles.postHeader}>
            <View style={styles.postHeaderLeft}>
              <Image
                source={{ uri: 'https://i.pravatar.cc/150?img=8' }}
                style={styles.postAvatar}
              />
              <View>
                <Text style={styles.postUsername}>Hoàng_Phạm</Text>
                <Text style={styles.postLocation}>Hà Nội, Việt Nam  15:07pm</Text>
              </View>
            </View>
            <TouchableOpacity>
              <Text style={styles.moreIcon}>⋯</Text>
            </TouchableOpacity>
          </View>

          {/* Post Image */}
          <View style={styles.postImageContainer}>
            <Image
              source={{ uri: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=800' }}
              style={styles.postImage}
            />
            <View style={styles.imageCounter}>
              <Text style={styles.imageCounterText}>1/3</Text>
            </View>
            <View style={styles.dotsContainer}>
              <View style={[styles.dot, styles.dotActive]} />
              <View style={styles.dot} />
              <View style={styles.dot} />
            </View>
          </View>

          {/* Post Actions */}
          <View style={styles.postActions}>
            <View style={styles.postActionsLeft}>
              <TouchableOpacity
                onPress={() => {
                  setLiked(!liked);
                  setLikes(liked ? likes - 1 : likes + 1);
                }}
              >
                {liked ? (
                  <Text style={styles.heartIconPostFilled}>♥</Text>
                ) : (
                  <Text style={styles.heartIconPost}>♥</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity>
                <View style={styles.commentIconWrapper}>
                  <View style={styles.commentBubble} />
                  <Text style={styles.commentCount}>{comments}</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity style={styles.navItem}>
                <Image
                  source={require('../Assets/icons8-email-65.png')}
                  style={[styles.homeIconImage, { width: 42, height: 42 }]}
                />
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.navItem}>
              <Image
                source={require('../Assets/icons8-bookmark-outline-24.png')}
                style={[styles.homeIconImage, { width: 30, height: 30 }]}
              />
            </TouchableOpacity>
          </View>

          {/* Like and Comment Count */}
          <View style={styles.postStats}>
            <Text style={styles.likeCount}>{likes} người yêu thích</Text>
            <Text style={styles.commentCountText}>Xem tất cả {comments} bình luận</Text>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem}>
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
          onPress={() => navigation.navigate('Video')}
        >
          <View style={styles.reelsIconWrapper}>
            <View style={styles.reelsSquare} />
            <View style={styles.reelsPlay} />
          </View>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem}>
          <Image
            source={{ uri: 'https://i.pravatar.cc/150?img=9' }}
            style={styles.profileIcon}
          />
        </TouchableOpacity>
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
  storiesContainer: {
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: '#DBDBDB',
  },
  storyItem: {
    alignItems: 'center',
    marginLeft: 12,
  },
  storyAvatarContainer: {
    padding: 2,
    borderRadius: 40,
  },
  storyAvatarBorder: {
    borderWidth: 2.5,
    borderColor: '#E1306C',
  },
  storyAvatar: {
    width: 62,
    height: 62,
    borderRadius: 31,
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  storyName: {
    fontSize: 12,
    marginTop: 4,
    color: '#262626',
  },
  post: {
    marginBottom: 16,
  },
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  postHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  postAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  postUsername: {
    fontSize: 13,
    fontWeight: '600',
    color: '#262626',
  },
  postLocation: {
    fontSize: 11,
    color: '#262626',
  },
  moreIcon: {
    fontSize: 24,
    fontWeight: '700',
    color: '#262626',
  },
  postImageContainer: {
    position: 'relative',
  },
  postImage: {
    width: '100%',
    height: 400,
    backgroundColor: '#F0F0F0',
  },
  imageCounter: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  imageCounterText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  dotsContainer: {
    position: 'absolute',
    bottom: 12,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  dotActive: {
    backgroundColor: '#FFFFFF',
  },
  postActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  postActionsLeft: {
    flexDirection: 'row',
    gap: 16,
    alignItems: 'center',
  },
  heartIconPost: {
    fontSize: 35,
    color: '#DEDED6',
    marginTop: -4,
  },
  heartIconPostFilled: {
    fontSize: 35,
    color: '#ED4956',
    marginTop: -4,
  },
  commentIconWrapper: {
    width: 26,
    height: 26,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  commentBubble: {
    width: 24,
    height: 24,
    borderWidth: 2.5,
    borderColor: '#000',
    borderRadius: 12,
    borderTopLeftRadius: 0,
  },
  commentCount: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#ED4956',
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
    borderRadius: 6,
    paddingHorizontal: 3,
    paddingVertical: 1,
  },
  postStats: {
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  likeCount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#262626',
    marginBottom: 4,
  },
  commentCountText: {
    fontSize: 12,
    color: '#8E8E8E',
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
