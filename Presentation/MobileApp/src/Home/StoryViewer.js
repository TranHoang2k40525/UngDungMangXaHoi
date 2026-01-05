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
    ActivityIndicator,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Video } from "expo-av";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_BASE_URL } from "../API/Api";

const { width, height } = Dimensions.get("window");

export default function StoryViewer() {
    const navigation = useNavigation();
    const route = useRoute();
    const { userId, paramStories } = route.params || {};

    const [stories, setStories] = useState(
        Array.isArray(paramStories) ? paramStories : []
    );
    const [currentIndex, setCurrentIndex] = useState(0);
    const [progress] = useState(new Animated.Value(0));
    const [videoDuration, setVideoDuration] = useState(5000);
    const [isPaused, setIsPaused] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [userAvatar, setUserAvatar] = useState(null);
    const [userName, setUserName] = useState("User");

    const videoRef = useRef(null);
    const animationRef = useRef(null);

    // ✅ FIX: Load user info from STORY data, not from AsyncStorage
    useEffect(() => {
        if (stories.length > 0 && currentIndex < stories.length) {
            const currentStory = stories[currentIndex];

            // ✅ Get avatar and name from the STORY OWNER (not current user)
            const storyOwnerAvatar = currentStory.userAvatar;
            const storyOwnerName = currentStory.userName || "User";

            // Process avatar URL
            let avatarUri = null;
            if (storyOwnerAvatar) {
                avatarUri = String(storyOwnerAvatar).startsWith("http")
                    ? storyOwnerAvatar
                    : `${API_BASE_URL}${storyOwnerAvatar}`;
            }

            setUserAvatar(avatarUri);
            setUserName(storyOwnerName);
        }
    }, [currentIndex, stories]);

    // ✅ REMOVE the old useEffect that loads from AsyncStorage
    // This was causing the bug - showing current user's avatar instead of story owner's

    // Fetch stories if userId is provided (viewing others' stories)
    useEffect(() => {
        if (!userId || (paramStories && paramStories.length > 0)) return;

        const fetchStories = async () => {
            try {
                const token = await AsyncStorage.getItem("token");
                const res = await fetch(
                    `${API_BASE_URL}/stories/user/${userId}`,
                    {
                        headers: { Authorization: `Bearer ${token}` },
                    }
                );
                const data = await res.json();
                if (Array.isArray(data) && data.length > 0) {
                    setStories(data);
                } else {
                    setStories([]);
                }
            } catch (err) {
                console.log("[StoryViewer] Error fetching stories:", err);
            }
        };

        fetchStories();
    }, [userId, paramStories]);

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
        if (animationRef.current) animationRef.current.stop();
        if (videoRef.current) videoRef.current.pauseAsync();
    };

    const handleLongPressOut = () => {
        setIsPaused(false);
        if (videoRef.current) videoRef.current.playAsync();
        startAnimation();
    };

    const startAnimation = () => {
        if (stories.length === 0) return;

        const currentStory = stories[currentIndex];
        const duration =
            currentStory.mediaType === "video" ? videoDuration : 5000;

        animationRef.current = Animated.timing(progress, {
            toValue: 1,
            duration,
            useNativeDriver: false,
        });

        animationRef.current.start(({ finished }) => {
            if (finished && !isPaused) handleNext();
        });
    };

    useEffect(() => {
        if (stories.length === 0) return;

        progress.setValue(0);

        if (!isPaused) startAnimation();

        return () => {
            if (animationRef.current) animationRef.current.stop();
        };
    }, [currentIndex, videoDuration, isPaused, stories]);

    if (stories.length === 0) {
        return (
            <View
                style={[
                    styles.container,
                    { justifyContent: "center", alignItems: "center" },
                ]}
            >
                <TouchableOpacity
                    style={styles.closeButton}
                    onPress={() => navigation.goBack()}
                >
                    <Ionicons name="close" size={32} color="#fff" />
                </TouchableOpacity>
                <Text style={{ color: "#fff", fontSize: 16 }}>
                    Không có story
                </Text>
            </View>
        );
    }

    const currentStory = stories[currentIndex];

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
                        resizeMode="contain"
                        shouldPlay={!isPaused}
                        isLooping={false}
                        onLoad={() => setIsLoading(false)}
                        onPlaybackStatusUpdate={(status) => {
                            if (status.isLoaded && status.durationMillis) {
                                setVideoDuration(status.durationMillis);
                            }
                            if (status.didJustFinish) handleNext();
                        }}
                    />
                ) : (
                    <Image
                        source={{ uri: currentStory.mediaUrl }}
                        style={styles.storyImage}
                        resizeMode="contain"
                        onLoadEnd={() => setIsLoading(false)}
                    />
                )}

                {isLoading && (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="#fff" />
                    </View>
                )}
            </TouchableOpacity>

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
                                                  outputRange: ["0%", "100%"],
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

            <TouchableOpacity
                style={styles.closeButton}
                onPress={() => navigation.goBack()}
            >
                <Ionicons name="close" size={32} color="#fff" />
            </TouchableOpacity>
        </View>
    );
}

function getTimeAgo(timestamp) {
    if (!timestamp) return '';
    
    const now = new Date();
    
    // Backend trả về UTC time, JavaScript tự động chuyển sang local time
    // Nhưng cần xử lý múi giờ Việt Nam (UTC+7) để tính chênh lệch chính xác
    let then = new Date(timestamp);
    
    // Kiểm tra nếu timestamp không có 'Z' (không phải UTC), cộng thêm 7 tiếng
    if (typeof timestamp === 'string' && !timestamp.endsWith('Z')) {
        then = new Date(then.getTime() + (7 * 60 * 60 * 1000));
    }
    
    const diff = Math.floor((now - then) / 1000); // seconds

    if (diff < 60) return `${diff}s`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    return `${Math.floor(diff / 86400)}d`;
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#000",
    },
    storyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    storyImage: {
        width: '100%',
        height: '100%',
    },
    loadingContainer: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "rgba(0,0,0,0.3)",
    },
    progressContainer: {
        position: "absolute",
        top: 50,
        left: 8,
        right: 8,
        flexDirection: "row",
        gap: 4,
        zIndex: 2,
    },
    progressBarBackground: {
        flex: 1,
        height: 2,
        backgroundColor: "rgba(255,255,255,0.3)",
        borderRadius: 1,
        overflow: "hidden",
    },
    progressBarFill: {
        height: "100%",
        backgroundColor: "#fff",
    },
    userInfo: {
        position: "absolute",
        top: 60,
        left: 12,
        flexDirection: "row",
        alignItems: "center",
        zIndex: 3,
    },
    userAvatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        borderWidth: 2,
        borderColor: "#fff",
    },
    userTextContainer: {
        marginLeft: 8,
    },
    userName: {
        color: "#fff",
        fontSize: 14,
        fontWeight: "600",
        textShadowColor: "rgba(0, 0, 0, 0.75)",
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 3,
    },
    timeAgo: {
        color: "#fff",
        fontSize: 12,
        opacity: 0.8,
        textShadowColor: "rgba(0, 0, 0, 0.75)",
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 3,
    },
    closeButton: {
        position: "absolute",
        top: 50,
        right: 12,
        zIndex: 4,
        padding: 8,
    },
});
