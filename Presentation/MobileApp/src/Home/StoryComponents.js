import React, { useEffect, useState } from "react";
import { View, Text, Image, TouchableOpacity, StyleSheet } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_BASE_URL } from "../API/Api";

export const StoryItem = ({
    id,
    name,
    avatar,
    hasStory,
    storyData,
    navigation,
}) => {
    const [isViewed, setIsViewed] = useState(false);

    // Check nếu story đã được xem
    useEffect(() => {
        const checkViewStatus = async () => {
            if (!hasStory || !storyData) return;

            try {
                // Lấy danh sách stories đã xem
                const viewedStories = await AsyncStorage.getItem(
                    "viewedStories"
                );
                const viewedList = viewedStories
                    ? JSON.parse(viewedStories)
                    : [];

                // Kiểm tra xem tất cả stories trong storyData đã được xem chưa
                const storiesArray = Array.isArray(storyData)
                    ? storyData
                    : [storyData];
                const allViewed = storiesArray.every((story) =>
                    viewedList.some(
                        (v) => v.storyId === story.id && v.userId === id
                    )
                );

                setIsViewed(allViewed);
            } catch (e) {
                console.warn("[StoryItem] Error checking view status:", e);
            }
        };

        checkViewStatus();
    }, [hasStory, storyData, id]);

    const handlePress = async () => {
        if (!hasStory || !storyData) {
            console.warn("[StoryItem] No story data available");
            return;
        }

        console.log("[StoryItem] Opening story viewer for user:", id, name);
        console.log("[StoryItem] Raw storyData:", storyData);

        // ✅ Đảm bảo storyData là array và có format đúng
        const storiesArray = Array.isArray(storyData) ? storyData : [storyData];

        // ✅ Format lại data để đảm bảo đúng cấu trúc cho StoryViewer
        const formattedStories = storiesArray.map((story) => {
            // Xử lý avatar URL
            let avatarUrl = story.userAvatar || avatar;
            if (
                avatarUrl &&
                typeof avatarUrl === "string" &&
                !avatarUrl.startsWith("http")
            ) {
                avatarUrl = `${API_BASE_URL}${avatarUrl}`;
            } else if (
                avatarUrl &&
                typeof avatarUrl === "object" &&
                avatarUrl.uri
            ) {
                avatarUrl = avatarUrl.uri;
            }

            // Xử lý media URL
            let mediaUrl = story.mediaUrl || story.media_url || story.url;
            if (mediaUrl && !mediaUrl.startsWith("http")) {
                mediaUrl = `${API_BASE_URL}${mediaUrl}`;
            }

            const formatted = {
                id: story.id || story.storyId,
                mediaUrl: mediaUrl,
                mediaType:
                    story.mediaType ||
                    story.media_type ||
                    (mediaUrl && mediaUrl.endsWith(".mp4") ? "video" : "image"),
                userName: story.userName || name,
                userAvatar: avatarUrl,
                createdAt:
                    story.createdAt ||
                    story.created_at ||
                    new Date().toISOString(),
                viewCount: story.viewCount || 0,
                userId: story.userId || id,
                privacy: story.privacy || "public",
            };

            console.log("[StoryItem] Formatted story:", formatted);
            return formatted;
        });

        console.log(
            "[StoryItem] Final formatted stories count:",
            formattedStories.length
        );
        console.log("[StoryItem] First story sample:", formattedStories[0]);

        // ✅ Navigate với data đã format
        navigation.navigate("StoryViewer", {
            paramStories: formattedStories,
            userId: id,
            userName: name,
        });

        // Đánh dấu đã xem
        try {
            const viewedStories = await AsyncStorage.getItem("viewedStories");
            const viewedList = viewedStories ? JSON.parse(viewedStories) : [];

            // Thêm tất cả stories vào danh sách đã xem
            formattedStories.forEach((story) => {
                const exists = viewedList.some(
                    (v) => v.storyId === story.id && v.userId === id
                );
                if (!exists) {
                    viewedList.push({
                        storyId: story.id,
                        userId: id,
                        viewedAt: new Date().toISOString(),
                    });
                }
            });

            await AsyncStorage.setItem(
                "viewedStories",
                JSON.stringify(viewedList)
            );
            setIsViewed(true);
        } catch (e) {
            console.warn("[StoryItem] Error saving view status:", e);
        }
    };

    // ✅ Xử lý avatar source
    let avatarSource;
    if (typeof avatar === "string") {
        avatarSource = {
            uri: avatar.startsWith("http")
                ? avatar
                : `${API_BASE_URL}${avatar}`,
        };
    } else if (avatar?.uri) {
        avatarSource = avatar;
    } else {
        avatarSource = avatar || require("../Assets/trai.png");
    }

    return (
        <TouchableOpacity
            style={[styles.storyItem, { opacity: hasStory ? 1 : 0.7 }]}
            onPress={handlePress}
            activeOpacity={hasStory ? 0.7 : 1}
        >
            <View
                style={[
                    styles.storyAvatarContainer,
                    hasStory && styles.storyAvatarBorder,
                ]}
            >
                <Image
                    source={avatarSource}
                    style={styles.storyAvatar}
                    resizeMode="cover"
                />
            </View>
            <Text style={styles.storyName} numberOfLines={1}>
                {name}
            </Text>

            {/* Chấm đỏ chỉ hiển thị khi có story VÀ chưa xem */}
            {hasStory && !isViewed && <View style={styles.indicator} />}
        </TouchableOpacity>
    );
};

export const StoryAddItem = ({ onPress }) => {
    return (
        <TouchableOpacity style={styles.storyItem} onPress={onPress}>
            <View style={styles.storyAvatarContainer}>
                <View style={styles.plusCircle}>
                    <Text style={styles.plusText}>+</Text>
                </View>
            </View>
            <Text style={styles.storyName}>Tin của bạn</Text>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    storyItem: {
        alignItems: "center",
        marginHorizontal: 8,
        width: 72,
        position: "relative",
    },
    storyAvatarContainer: {
        width: 68,
        height: 68,
        borderRadius: 34,
        padding: 2,
        backgroundColor: "#fff",
        marginBottom: 4,
    },
    storyAvatarBorder: {
        borderWidth: 2,
        borderColor: "#FF3B30",
        shadowColor: "#FF3B30",
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.3,
        shadowRadius: 3,
        elevation: 3,
    },
    storyAvatar: {
        width: "100%",
        height: "100%",
        borderRadius: 32,
    },
    storyName: {
        fontSize: 12,
        textAlign: "center",
        color: "#262626",
        width: "100%",
    },
    plusCircle: {
        width: "100%",
        height: "100%",
        borderRadius: 32,
        backgroundColor: "#F3F4F6",
        justifyContent: "center",
        alignItems: "center",
    },
    plusText: {
        fontSize: 24,
        fontWeight: "600",
        color: "#111827",
    },
    indicator: {
        position: "absolute",
        top: -2,
        right: 6,
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: "#FF3B30",
        borderWidth: 2,
        borderColor: "#fff",
    },
});
