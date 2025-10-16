import React from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Dimensions,
  SafeAreaView,
} from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

const { width } = Dimensions.get('window');
const imageSize = (width - 6) / 3;

const Profile = () => {
  const navigation = useNavigation();

  const posts = [
    { id: 1, image: 'https://picsum.photos/400/400?random=1' },
    { id: 2, image: 'https://picsum.photos/400/400?random=2' },
    { id: 3, image: 'https://picsum.photos/400/400?random=3' },
    { id: 4, image: 'https://picsum.photos/400/400?random=4' },
    { id: 5, image: 'https://picsum.photos/400/400?random=5' },
    { id: 6, image: 'https://picsum.photos/400/400?random=6' },
    { id: 7, image: 'https://picsum.photos/400/400?random=7' },
    { id: 8, image: 'https://picsum.photos/400/400?random=8' },
    { id: 9, image: 'https://picsum.photos/400/400?random=9' },
  ];

  const stories = [
    { id: 1, name: 'New', icon: 'add', image: null },
    { id: 2, name: 'Friends', image: 'https://picsum.photos/100/100?random=10' },
    { id: 3, name: 'Sport', image: 'https://picsum.photos/100/100?random=11' },
    { id: 4, name: 'Design', image: 'https://picsum.photos/100/100?random=12' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="lock-closed" size={16} color="#000" />
          <Text style={styles.username}>jacob_w</Text>
          <Ionicons name="chevron-down" size={16} color="#000" style={styles.chevron} />
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.headerIcon}>
            <Ionicons name="add-circle-outline" size={24} color="#000" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerIcon}>
            <Feather name="menu" size={24} color="#000" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Profile Info */}
        <View style={styles.profileSection}>
          <View style={styles.profileHeader}>
            <Image
              source={{ uri: 'https://picsum.photos/200/200?random=20' }}
              style={styles.profileImage}
            />
            <View style={styles.statsContainer}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>54</Text>
                <Text style={styles.statLabel}>Posts</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>834</Text>
                <Text style={styles.statLabel}>Followers</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>162</Text>
                <Text style={styles.statLabel}>Following</Text>
              </View>
            </View>
          </View>

          <View style={styles.bioSection}>
            <Text style={styles.bioName}>Jacob Wells</Text>
            <Text style={styles.bioText}>Digital product designer @paulzi</Text>
            <Text style={styles.bioText}>Everything is designed.</Text>
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity 
              style={styles.editButton}
              onPress={() => navigation.navigate('Editprofile')}
            >
              <Text style={styles.editButtonText}>Edit Profile</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.shareButton}>
              <Text style={styles.shareButtonText}>Share Profile</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Story Highlights */}
        <View style={styles.storiesSection}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.storiesContent}
          >
            {stories.map((story) => (
              <TouchableOpacity key={story.id} style={styles.storyItem}>
                {story.icon ? (
                  <View style={styles.addStoryCircle}>
                    <Ionicons name={story.icon} size={32} color="#000" />
                  </View>
                ) : (
                  <View style={styles.storyImageContainer}>
                    <Image source={{ uri: story.image }} style={styles.storyImage} />
                  </View>
                )}
                <Text style={styles.storyName}>{story.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Tab Bar */}
        <View style={styles.tabBar}>
          <TouchableOpacity style={[styles.tabButton, styles.activeTab]}>
            <Ionicons name="grid-outline" size={24} color="#000" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.tabButton}>
            <Ionicons name="person-outline" size={24} color="#8e8e8e" />
          </TouchableOpacity>
        </View>

        {/* Posts Grid */}
        <View style={styles.postsGrid}>
          {posts.map((post) => (
            <TouchableOpacity key={post.id} style={styles.postContainer}>
              <Image
                source={{ uri: post.image }}
                style={styles.postImage}
              />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <TouchableOpacity 
          style={styles.navItem}
          onPress={() => navigation.navigate('Home')}
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
  );
};

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
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  username: {
    fontSize: 20,
    fontWeight: '600',
    marginLeft: 8,
  },
  chevron: {
    marginLeft: 4,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIcon: {
    marginLeft: 16,
  },
  profileSection: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileImage: {
    width: 86,
    height: 86,
    borderRadius: 43,
  },
  statsContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginLeft: 20,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 18,
    fontWeight: '600',
  },
  statLabel: {
    fontSize: 13,
    color: '#262626',
    marginTop: 2,
  },
  bioSection: {
    marginTop: 12,
  },
  bioName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  bioText: {
    fontSize: 14,
    color: '#262626',
    lineHeight: 18,
  },
  buttonContainer: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 8,
  },
  editButton: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dbdbdb',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  shareButton: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dbdbdb',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  shareButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  storiesSection: {
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: '#DBDBDB',
  },
  storiesContent: {
    paddingHorizontal: 12,
  },
  storyItem: {
    alignItems: 'center',
    marginHorizontal: 8,
    width: 70,
  },
  addStoryCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#dbdbdb',
  },
  storyImageContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    padding: 2,
    borderWidth: 2,
    borderColor: '#dbdbdb',
  },
  storyImage: {
    width: '100%',
    height: '100%',
    borderRadius: 30,
  },
  storyName: {
    fontSize: 12,
    marginTop: 6,
    color: '#262626',
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: '#DBDBDB',
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
  },
  activeTab: {
    borderBottomWidth: 1,
    borderBottomColor: '#000',
  },
  postsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  postContainer: {
    width: imageSize,
    height: imageSize,
    borderWidth: 1,
    borderColor: '#fff',
  },
  postImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#f0f0f0',
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
  homeIconImage: {
    width: 30,
    height: 30,
    borderRadius: 0,
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

export default Profile;
