import React from "react";
import { View, Text, TouchableOpacity, Image, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { API_BASE_URL } from "../API/Api";

/**
 * Component hiển thị một user trong kết quả tìm kiếm
 */
export default function SearchUserItem({ user, onPress, onFollowPress }) {
    // Build avatar URL
    let avatarUri = user?.avatarUrl || user?.AvatarUrl || null;
    if (avatarUri && !avatarUri.startsWith("http")) {
        if (!avatarUri.startsWith("/")) {
            avatarUri = `/uploads/avatars/${avatarUri}`;
        }
        avatarUri = `${API_BASE_URL}${avatarUri}`;
    }

    const handleFollowPress = (e) => {
        e.stopPropagation(); // Ngăn không trigger onPress
        if (onFollowPress) {
            onFollowPress(user);
        }
    };
    return (
        <TouchableOpacity
            style={styles.container}
            onPress={() => onPress && onPress(user)}
            activeOpacity={0.7}
        >
            {/* Avatar */}
            {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={styles.avatar} />
            ) : (
                <View style={[styles.avatar, styles.avatarPlaceholder]}>
                    <Ionicons name="person" size={24} color="#9CA3AF" />
                </View>
            )}
            {/* User Info */}
            <View style={styles.infoContainer}>
                <Text style={styles.fullName} numberOfLines={1}>
                    {user.fullName || user.FullName || "Người dùng"}
                </Text>
                <Text style={styles.userName} numberOfLines={1}>
                    @{user.userName || user.UserName || "unknown"}
                </Text>
                {/* Hiển thị priority badge */}
                {user.priority === 1 && (
                    <View style={styles.priorityBadge}>
                        <Ionicons
                            name="checkmark-circle"
                            size={14}
                            color="#10B981"
                        />
                        <Text style={styles.priorityText}>Đang theo dõi</Text>
                    </View>
                )}
                {user.priority === 2 && (
                    <View style={styles.priorityBadge}>
                        <Ionicons name="chatbubble" size={14} color="#3B82F6" />
                        <Text style={styles.priorityText}>Đã nhắn tin</Text>
                    </View>
                )}
                {user.bio && (
                    <Text style={styles.bio} numberOfLines={1}>
                        {user.bio}
                    </Text>
                )}
                <Text style={styles.followers}>
                    {user.followersCount || 0} người theo dõi
                </Text>
            </View>
            {/* Follow Button */}
            {!user.isCurrentUser && (
                <TouchableOpacity
                    style={[
                        styles.followButton,
                        user.isFollowing && styles.followingButton,
                    ]}
                    onPress={handleFollowPress}
                >
                    <Text
                        style={[
                            styles.followButtonText,
                            user.isFollowing && styles.followingButtonText,
                        ]}
                    >
                        {user.isFollowing ? "Đang theo dõi" : "Theo dõi"}
                    </Text>
                </TouchableOpacity>
            )}
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: "row",
        alignItems: "center",
        padding: 12,
        backgroundColor: "#FFFFFF",
        borderBottomWidth: 1,
        borderBottomColor: "#F3F4F6",
    },
    avatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: "#F3F4F6",
    },
    avatarPlaceholder: {
        justifyContent: "center",
        alignItems: "center",
    },
    infoContainer: {
        flex: 1,
        marginLeft: 12,
    },
    fullName: {
        fontSize: 15,
        fontWeight: "600",
        color: "#111827",
        marginBottom: 2,
    },
    userName: {
        fontSize: 14,
        color: "#6B7280",
        marginBottom: 2,
    },
    bio: {
        fontSize: 13,
        color: "#9CA3AF",
        marginTop: 2,
    },
    followers: {
        fontSize: 12,
        color: "#9CA3AF",
        marginTop: 4,
    },
    priorityBadge: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: 4,
        paddingHorizontal: 6,
        paddingVertical: 2,
        backgroundColor: "#F3F4F6",
        borderRadius: 8,
        alignSelf: "flex-start",
    },
    priorityText: {
        fontSize: 11,
        color: "#6B7280",
        marginLeft: 4,
        fontWeight: "500",
    },
    followButton: {
        paddingHorizontal: 16,
        paddingVertical: 6,
        borderRadius: 6,
        backgroundColor: "#3B82F6",
    },
    followingButton: {
        backgroundColor: "#F3F4F6",
        borderWidth: 1,
        borderColor: "#D1D5DB",
    },
    followButtonText: {
        fontSize: 13,
        fontWeight: "600",
        color: "#FFFFFF",
    },
    followingButtonText: {
        color: "#6B7280",
    },
});
