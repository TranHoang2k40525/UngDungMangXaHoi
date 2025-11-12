import React from "react";
import { View, Text, TouchableOpacity, Image, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { API_BASE_URL } from "../API/Api";

/**
 * Component hiển thị một post trong kết quả tìm kiếm
 */
export default function SearchPostItem({ post, onPress }) {
    const [imageError, setImageError] = React.useState(false); // Build thumbnail URL - Backend đã trả về full path (/Assets/Images/...)
    let thumbnailUri = post?.thumbnailUrl || post?.ThumbnailUrl || null;

    if (thumbnailUri && !thumbnailUri.startsWith("http")) {
        // Backend đã trả về /Assets/Images/filename hoặc /Assets/Videos/filename
        // Chỉ cần thêm base URL
        thumbnailUri = `${API_BASE_URL}${thumbnailUri}`;
    } // Build user avatar URL - Backend trả về tên file hoặc relative path
    let userAvatarUri = post?.userAvatarUrl || post?.UserAvatarUrl || null;
    if (userAvatarUri && !userAvatarUri.startsWith("http")) {
        // Nếu chưa có path, thêm /Assets/Images/
        if (!userAvatarUri.startsWith("/")) {
            userAvatarUri = `/Assets/Images/${userAvatarUri}`;
        }
        userAvatarUri = `${API_BASE_URL}${userAvatarUri}`;
    }

    const isVideo = post?.mediaType === "Video" || post?.MediaType === "Video";

    // Debug log để kiểm tra URL
    React.useEffect(() => {
        console.log("SearchPostItem - Post data:", {
            postId: post?.postId,
            caption: post?.caption,
            thumbnailUrl: post?.thumbnailUrl,
            finalUri: thumbnailUri,
            mediaType: post?.mediaType,
        });
    }, [post]);

    return (
        <TouchableOpacity
            style={styles.container}
            onPress={() => onPress && onPress(post)}
            activeOpacity={0.7}
        >
            {/* Thumbnail */}
            <View style={styles.thumbnailContainer}>
                {thumbnailUri && !imageError ? (
                    <Image
                        source={{ uri: thumbnailUri }}
                        style={styles.thumbnail}
                        resizeMode="cover"
                        onError={(error) => {
                            console.log(
                                "Image load error:",
                                error.nativeEvent.error
                            );
                            console.log("Failed URL:", thumbnailUri);
                            setImageError(true);
                        }}
                    />
                ) : (
                    <View
                        style={[styles.thumbnail, styles.thumbnailPlaceholder]}
                    >
                        <Ionicons
                            name="image-outline"
                            size={32}
                            color="#9CA3AF"
                        />
                    </View>
                )}
                {isVideo && !imageError && (
                    <View style={styles.videoOverlay}>
                        <Ionicons
                            name="play-circle"
                            size={32}
                            color="#FFFFFF"
                        />
                    </View>
                )}
            </View>
            {/* Post Info */}
            <View style={styles.infoContainer}>
                {/* User Info */}
                <View style={styles.userInfo}>
                    {userAvatarUri ? (
                        <Image
                            source={{ uri: userAvatarUri }}
                            style={styles.userAvatar}
                        />
                    ) : (
                        <View
                            style={[
                                styles.userAvatar,
                                styles.avatarPlaceholder,
                            ]}
                        >
                            <Ionicons name="person" size={12} color="#9CA3AF" />
                        </View>
                    )}
                    <Text style={styles.userName} numberOfLines={1}>
                        {post.userFullName ||
                            post.UserFullName ||
                            post.userName ||
                            post.UserName ||
                            "unknown"}
                    </Text>
                </View>
                {/* Caption */}
                {(post.caption || post.Caption) && (
                    <Text style={styles.caption} numberOfLines={2}>
                        {post.caption || post.Caption}
                    </Text>
                )}
                {/* Priority badge for posts */}
                {post.priority === 1 && (
                    <View style={styles.priorityBadge}>
                        <Ionicons name="people" size={12} color="#10B981" />
                        <Text style={styles.priorityText}>
                            Từ người theo dõi
                        </Text>
                    </View>
                )}
                {/* Stats */}
                <View style={styles.statsContainer}>
                    <View style={styles.stat}>
                        <Ionicons name="heart" size={14} color="#EF4444" />
                        <Text style={styles.statText}>
                            {post.likesCount || post.LikesCount || 0}
                        </Text>
                    </View>
                    <View style={styles.stat}>
                        <Ionicons name="chatbubble" size={14} color="#3B82F6" />
                        <Text style={styles.statText}>
                            {post.commentsCount || post.CommentsCount || 0}
                        </Text>
                    </View>
                    <View style={styles.stat}>
                        <Ionicons name="time" size={14} color="#9CA3AF" />
                        <Text style={styles.statText}>
                            {new Date(
                                post.createdAt || post.CreatedAt
                            ).toLocaleDateString()}
                        </Text>
                    </View>
                </View>
            </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: "row",
        padding: 12,
        backgroundColor: "#FFFFFF",
        borderBottomWidth: 1,
        borderBottomColor: "#F3F4F6",
    },
    thumbnailContainer: {
        marginRight: 12,
        position: "relative",
    },
    thumbnail: {
        width: 80,
        height: 80,
        borderRadius: 8,
        backgroundColor: "#F3F4F6",
    },
    thumbnailPlaceholder: {
        justifyContent: "center",
        alignItems: "center",
    },
    videoOverlay: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "rgba(0, 0, 0, 0.3)",
        borderRadius: 8,
    },
    infoContainer: {
        flex: 1,
        justifyContent: "space-between",
    },
    userInfo: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 6,
    },
    userAvatar: {
        width: 20,
        height: 20,
        borderRadius: 10,
        marginRight: 6,
    },
    avatarPlaceholder: {
        backgroundColor: "#F3F4F6",
        justifyContent: "center",
        alignItems: "center",
    },
    userName: {
        fontSize: 13,
        fontWeight: "600",
        color: "#111827",
        flex: 1,
    },
    caption: {
        fontSize: 14,
        color: "#374151",
        lineHeight: 18,
        marginBottom: 6,
    },
    priorityBadge: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 6,
        paddingHorizontal: 6,
        paddingVertical: 2,
        backgroundColor: "#F0FDF4",
        borderRadius: 8,
        alignSelf: "flex-start",
    },
    priorityText: {
        fontSize: 10,
        color: "#059669",
        marginLeft: 4,
        fontWeight: "500",
    },
    statsContainer: {
        flexDirection: "row",
        alignItems: "center",
    },
    stat: {
        flexDirection: "row",
        alignItems: "center",
        marginRight: 12,
    },
    statText: {
        fontSize: 12,
        color: "#6B7280",
        marginLeft: 4,
    },
});
