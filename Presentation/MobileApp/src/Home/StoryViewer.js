import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    Image,
    TouchableOpacity,
    StyleSheet,
    Dimensions,
    StatusBar,
    Animated,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";

const { width, height } = Dimensions.get("window");

// Dữ liệu stories mẫu
const storiesContent = {
    1: [
        {
            id: "s1",
            image: "https://images.unsplash.com/photo-1517487881594-2787fef5ebf7?w=800",
        },
        {
            id: "s2",
            image: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=800",
        },
    ],
    2: [
        {
            id: "s3",
            image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800",
        },
    ],
    3: [
        {
            id: "s4",
            image: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=800",
        },
        {
            id: "s5",
            image: "https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=800",
        },
    ],
    4: [
        {
            id: "s6",
            image: "https://images.unsplash.com/photo-1517849845537-4d257902454a?w=800",
        },
    ],
};

export default function StoryViewer() {
    const navigation = useNavigation();
    const route = useRoute();
    const { storyId, userName, userAvatar } = route.params;

    const [currentIndex, setCurrentIndex] = useState(0);
    const [progress] = useState(new Animated.Value(0));
    const stories = storiesContent[storyId] || [];

    useEffect(() => {
        // Tự động chuyển story sau 5 giây
        progress.setValue(0);

        const animation = Animated.timing(progress, {
            toValue: 1,
            duration: 5000,
            useNativeDriver: false,
        });

        animation.start(({ finished }) => {
            if (finished) {
                handleNext();
            }
        });

        return () => animation.stop();
    }, [currentIndex]);

    const handleNext = () => {
        if (currentIndex < stories.length - 1) {
            setCurrentIndex(currentIndex + 1);
        } else {
            navigation.goBack();
        }
    };

    const handlePrevious = () => {
        if (currentIndex > 0) {
            setCurrentIndex(currentIndex - 1);
        } else {
            navigation.goBack();
        }
    };

    const handlePress = (evt) => {
        const x = evt.nativeEvent.locationX;
        if (x < width / 2) {
            handlePrevious();
        } else {
            handleNext();
        }
    };

    if (stories.length === 0) {
        return null;
    }

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />

            {/* Story Image */}
            <TouchableOpacity
                style={styles.storyContainer}
                activeOpacity={1}
                onPress={handlePress}
            >
                <Image
                    source={{ uri: stories[currentIndex].image }}
                    style={styles.storyImage}
                    resizeMode="cover"
                />
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

            {/* Header */}
            <View style={styles.header}>
                <View style={styles.userInfo}>
                    <Image source={userAvatar} style={styles.avatar} />
                    <Text style={styles.username}>{userName}</Text>
                    <Text style={styles.timestamp}>15:07pm</Text>
                </View>

                <TouchableOpacity
                    style={styles.closeButton}
                    onPress={() => navigation.goBack()}
                >
                    <Text style={styles.closeIcon}>×</Text>
                </TouchableOpacity>
            </View>

            {/* Bottom Actions */}
            <View style={styles.bottomActions}>
                <View style={styles.messageInputContainer}>
                    <TouchableOpacity style={styles.messageInput}>
                        <Text style={styles.messageInputText}>
                            Send Message
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.actionButton}>
                        <Text style={styles.actionIcon}>➤</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.actionButton}>
                        <Text style={styles.moreIcon}>⋯</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#000000",
    },
    storyContainer: {
        flex: 1,
    },
    storyImage: {
        width: width,
        height: height,
    },
    progressContainer: {
        position: "absolute",
        top: 40,
        left: 8,
        right: 8,
        flexDirection: "row",
        gap: 4,
        zIndex: 2,
    },
    progressBarBackground: {
        flex: 1,
        height: 2,
        backgroundColor: "rgba(255, 255, 255, 0.3)",
        borderRadius: 1,
        overflow: "hidden",
    },
    progressBarFill: {
        height: "100%",
        backgroundColor: "#FFFFFF",
    },
    header: {
        position: "absolute",
        top: 50,
        left: 0,
        right: 0,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 12,
        zIndex: 3,
    },
    userInfo: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    avatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        borderWidth: 2,
        borderColor: "#FFFFFF",
    },
    username: {
        fontSize: 14,
        fontWeight: "600",
        color: "#FFFFFF",
    },
    timestamp: {
        fontSize: 12,
        color: "rgba(255, 255, 255, 0.8)",
    },
    closeButton: {
        width: 32,
        height: 32,
        justifyContent: "center",
        alignItems: "center",
    },
    closeIcon: {
        fontSize: 36,
        color: "#FFFFFF",
        fontWeight: "300",
    },
    bottomActions: {
        position: "absolute",
        bottom: 20,
        left: 0,
        right: 0,
        paddingHorizontal: 12,
        zIndex: 3,
    },
    messageInputContainer: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    messageInput: {
        flex: 1,
        height: 44,
        borderRadius: 22,
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.5)",
        justifyContent: "center",
        paddingHorizontal: 16,
    },
    messageInputText: {
        fontSize: 14,
        color: "rgba(255, 255, 255, 0.7)",
    },
    actionButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.5)",
        justifyContent: "center",
        alignItems: "center",
    },
    actionIcon: {
        fontSize: 18,
        color: "#FFFFFF",
        transform: [{ rotate: "0deg" }],
    },
    moreIcon: {
        fontSize: 24,
        color: "#FFFFFF",
        fontWeight: "300",
    },
});
