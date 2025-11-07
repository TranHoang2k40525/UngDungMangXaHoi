import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  StatusBar,
  Animated,
  Text,
  ActivityIndicator
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Video } from "expo-av";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from "../API/Api";

const { width, height } = Dimensions.get("window");

export default function StoryViewer() {
  const navigation = useNavigation();
  const route = useRoute();
  const { paramStories } = route.params || {};

  const [currentIndex, setCurrentIndex] = useState(0);
  const [progress] = useState(new Animated.Value(0));
  const [videoDuration, setVideoDuration] = useState(5000);
  const [isPaused, setIsPaused] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userAvatar, setUserAvatar] = useState(null);
  const [userName, setUserName] = useState('User');

  const videoRef = useRef(null);
  const animationRef = useRef(null);

  const stories = Array.isArray(paramStories) && paramStories.length > 0 ? paramStories : [];

  // Load user info from AsyncStorage
  useEffect(() => {
    const loadUserInfo = async () => {
      try {
        const userStr = await AsyncStorage.getItem('userInfo');
        if (userStr) {
          const user = JSON.parse(userStr);
          const rawAvatar = user?.avatarUrl ?? user?.avatar_url ?? null;
          const avatarUri = rawAvatar ? 
            (String(rawAvatar).startsWith('http') ? rawAvatar : `${API_BASE_URL}${rawAvatar}`) 
            : null;
          
          setUserAvatar(avatarUri);
          setUserName(user?.username || user?.name || 'User');
          console.log('[StoryViewer] Loaded user avatar:', avatarUri);
        }
      } catch (e) {
        console.warn('[StoryViewer] Error loading user info:', e);
      }
    };

    loadUserInfo();
    
    // ✅ Listen for focus event to reload avatar
    const unsubscribe = navigation.addListener('focus', () => {
      console.log('[StoryViewer] Screen focused, reloading avatar');
      loadUserInfo();
    });
    
    return unsubscribe;
  }, [navigation]);

  const handleNext = () => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setIsLoading(true);
    } else {
      navigation.goBack();
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setIsLoading(true);
    } else {
      navigation.goBack();
    }
  };

  const handlePress = (evt) => {
    const x = evt.nativeEvent.locationX;
    if (x < width / 2) handlePrevious();
    else handleNext();
  };

  const handleLongPressIn = () => {
    setIsPaused(true);
    if (animationRef.current) {
      animationRef.current.stop();
    }
    if (videoRef.current) {
      videoRef.current.pauseAsync();
    }
  };

  const handleLongPressOut = () => {
    setIsPaused(false);
    if (videoRef.current) {
      videoRef.current.playAsync();
    }
    startAnimation();
  };

  const startAnimation = () => {
    if (stories.length === 0) return;

    const currentStory = stories[currentIndex];
    const duration = currentStory.mediaType === "video" ? videoDuration : 5000;

    animationRef.current = Animated.timing(progress, {
      toValue: 1,
      duration: duration,
      useNativeDriver: false
    });

    animationRef.current.start(({ finished }) => {
      if (finished && !isPaused) handleNext();
    });
  };

  useEffect(() => {
    if (stories.length === 0) return;

    progress.setValue(0);
    
    if (!isPaused) {
      startAnimation();
    }

    return () => {
      if (animationRef.current) {
        animationRef.current.stop();
      }
    };
  }, [currentIndex, videoDuration, isPaused]);

  if (stories.length === 0) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <TouchableOpacity 
          style={styles.closeButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="close" size={32} color="#fff" />
        </TouchableOpacity>
        <Text style={{ color: '#fff', fontSize: 16 }}>Không có story</Text>
      </View>
    );
  }

  const currentStory = stories[currentIndex];
  console.log("[StoryViewer] Rendering story:", currentStory);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      <TouchableOpacity
        style={styles.storyContainer}
        activeOpacity={1}
        onPress={handlePress}
        onLongPress={handleLongPressIn}
        onPressOut={handleLongPressOut}
      >
        {currentStory.mediaType === "video" ? (
          <Video
            ref={videoRef}
            source={{ uri: currentStory.mediaUrl }}
            style={styles.storyImage}
            resizeMode="cover"
            shouldPlay={!isPaused}
            isLooping={false}
            onLoad={() => setIsLoading(false)}
            onPlaybackStatusUpdate={(status) => {
              if (status.isLoaded && status.durationMillis) {
                setVideoDuration(status.durationMillis);
              }
              if (status.didJustFinish) {
                handleNext();
              }
            }}
          />
        ) : (
          <Image
            source={{ uri: currentStory.mediaUrl }}
            style={styles.storyImage}
            resizeMode="cover"
            onLoadEnd={() => setIsLoading(false)}
          />
        )}

        {/* Loading indicator */}
        {isLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#fff" />
          </View>
        )}
      </TouchableOpacity>

      {/* Progress Bars */}
      <View style={styles.progressContainer}>
        {stories.map((_, index) => (
          <View key={index} style={styles.progressBarBackground}>
            <Animated.View
              style={[
                styles.progressBarFill,
                {
                  width:
                    index === currentIndex
                      ? progress.interpolate({ 
                          inputRange: [0, 1], 
                          outputRange: ["0%", "100%"] 
                        })
                      : index < currentIndex
                      ? "100%"
                      : "0%",
                },
              ]}
            />
          </View>
        ))}
      </View>

      {/* User info */}
      <View style={styles.userInfo}>
        <Image 
          source={
            userAvatar 
              ? { uri: userAvatar }
              : require("../Assets/trai.png")
          }
          style={styles.userAvatar}
        />
        <View style={styles.userTextContainer}>
          <Text style={styles.userName}>{userName}</Text>
          <Text style={styles.timeAgo}>
            {getTimeAgo(currentStory.createdAt)}
          </Text>
        </View>
      </View>

      {/* Close button */}
      <TouchableOpacity 
        style={styles.closeButton}
        onPress={() => navigation.goBack()}
      >
        <Ionicons name="close" size={32} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

// Helper function to format time
function getTimeAgo(timestamp) {
  const now = new Date();
  const then = new Date(timestamp);
  const diff = Math.floor((now - then) / 1000); // seconds

  if (diff < 60) return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: "#000" 
  },
  storyContainer: { 
    flex: 1 
  },
  storyImage: { 
    width: width, 
    height: height 
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)'
  },
  progressContainer: { 
    position: "absolute", 
    top: 50, 
    left: 8, 
    right: 8, 
    flexDirection: "row", 
    gap: 4, 
    zIndex: 2 
  },
  progressBarBackground: { 
    flex: 1, 
    height: 2, 
    backgroundColor: "rgba(255,255,255,0.3)", 
    borderRadius: 1, 
    overflow: "hidden" 
  },
  progressBarFill: { 
    height: "100%", 
    backgroundColor: "#fff" 
  },
  userInfo: {
    position: 'absolute',
    top: 60,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 3,
  },
  userAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#fff',
  },
  userTextContainer: {
    marginLeft: 8,
  },
  userName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  timeAgo: {
    color: '#fff',
    fontSize: 12,
    opacity: 0.8,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    right: 12,
    zIndex: 4,
    padding: 8,
  },
});
