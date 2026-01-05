import React, { useState } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Image,
    ActivityIndicator,
    Alert,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Video } from "expo-av";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createStory, API_BASE_URL } from "../API/Api";

export default function CreateStory() {
    const navigation = useNavigation();
    const route = useRoute();
    const media = route?.params?.media || null;
    const insets = useSafeAreaInsets();

    const [privacy, setPrivacy] = useState("public"); // public | private (đã bỏ followers)
    const [uploading, setUploading] = useState(false);

    const isVideo =
        media &&
        (media.type?.toLowerCase?.().includes("video") ||
            String(media.name || "")
                .toLowerCase()
                .endsWith(".mp4"));

    const onUpload = async () => {
        if (!media) return Alert.alert("Không có media để đăng");
        try {
            setUploading(true);
            // read current user info to get display name, avatar and userId BEFORE upload
            let userName = "Bạn";
            let avatarSrc = null;
            let ownerId = null;
            try {
                const userStr = await AsyncStorage.getItem("userInfo");
                if (userStr) {
                    const u = JSON.parse(userStr);
                    userName = u?.username || u?.userName || userName;
                    ownerId =
                        u?.user_id ?? u?.userId ?? u?.UserId ?? u?.id ?? null;
                    const raw = u?.avatarUrl || u?.avatar_url || null;
                    if (raw) {
                        avatarSrc = String(raw).startsWith("http")
                            ? { uri: raw }
                            : { uri: `${API_BASE_URL}${raw}` };
                    }
                }
            } catch (e) {
                console.warn("Read userInfo failed", e);
            }

            const mediaType = isVideo ? "video" : "image";
            const res = await createStory({
                media,
                mediaType,
                privacy,
                userId: ownerId,
            });
            console.log("[CreateStory] upload result", res);

            // Navigate back and force Home screen to refresh
            try {
                // First find the Home screen in the navigation state
                const state = navigation.getState();
                const homeRoute = state.routes.find(
                    (route) => route.name === "Home"
                );

                if (homeRoute) {
                    // Update the Home route params
                    navigation.navigate({
                        name: "Home",
                        params: {
                            createdStory: true,
                            newStory: res?.data || res,
                            timestamp: Date.now(), // Force update
                        },
                        merge: true,
                    });
                } else {
                    navigation.goBack();
                }
            } catch (err) {
                console.warn("Navigation error:", err);
                navigation.goBack();
            }

            console.log("Story created successfully:", {
                responseStatus: res.status,
                responseData: res.data,
            });

            // Đảm bảo dữ liệu story đúng format
            const storyData = {
                id: res.data.id,
                mediaUrl: res.data.mediaUrl,
                mediaType: res.data.mediaType,
                userName: res.data.userName || "hoàng",
                userAvatar: res.data.userAvatar, // giữ path như API trả
                viewCount: res.data.viewCount ?? 0,
                createdAt: res.data.createdAt,
            };

            // Log để debug
            console.log("Navigating back with story:", storyData);

            // Navigate về Home với story data
            navigation.navigate("MainTabs", {
                screen: "Home",
                params: {
                    createdStory: true,
                    newStory: storyData,
                    timestamp: new Date().getTime(),
                },
            });
        } catch (e) {
            console.warn("CreateStory upload error", e?.message || e);
            Alert.alert("Lỗi", e?.message || "Không thể tạo story");
        } finally {
            setUploading(false);
        }
    };

    return (
        <View
            style={[styles.container, { paddingTop: (insets.top || 0) + 12 }]}
        >
            <View style={styles.previewContainer}>
                {media ? (
                    isVideo ? (
                        <Video
                            source={{ uri: media.uri }}
                            style={styles.media}
                            useNativeControls
                            resizeMode="cover"
                        />
                    ) : (
                        <Image
                            source={{ uri: media.uri }}
                            style={styles.media}
                        />
                    )
                ) : (
                    <View style={[styles.media, styles.empty]}>
                        <Text style={{ color: "#888" }}>Không có media</Text>
                    </View>
                )}
            </View>

            <View style={styles.privacyRow}>
                <TouchableOpacity
                    style={[
                        styles.privacyBtn,
                        privacy === "public" && styles.privacyBtnActive,
                    ]}
                    onPress={() => setPrivacy("public")}
                >
                    <Text
                        style={[
                            styles.privacyText,
                            privacy === "public" && styles.privacyTextActive,
                        ]}
                    >
                        Công khai
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[
                        styles.privacyBtn,
                        privacy === "private" && styles.privacyBtnActive,
                    ]}
                    onPress={() => setPrivacy("private")}
                >
                    <Text
                        style={[
                            styles.privacyText,
                            privacy === "private" && styles.privacyTextActive,
                        ]}
                    >
                        Riêng tư
                    </Text>
                </TouchableOpacity>
            </View>

            <View
                style={[
                    styles.actionsRow,
                    { paddingBottom: (insets.bottom || 0) + 12 },
                ]}
            >
                <TouchableOpacity
                    style={styles.cancelBtn}
                    onPress={() => navigation.goBack()}
                    disabled={uploading}
                >
                    <Text style={styles.cancelText}>Hủy</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.uploadBtn}
                    onPress={onUpload}
                    disabled={uploading}
                >
                    {uploading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.uploadText}>Đăng</Text>
                    )}
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#fff", padding: 16 },
    previewContainer: {
        flex: 1,
        marginBottom: 12,
        borderRadius: 12,
        overflow: "hidden",
        backgroundColor: "#000",
    },
    media: { width: "100%", height: "100%" },
    empty: { justifyContent: "center", alignItems: "center" },
    privacyRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginVertical: 12,
    },
    privacyBtn: {
        flex: 1,
        padding: 10,
        marginHorizontal: 6,
        borderRadius: 8,
        backgroundColor: "#f3f4f6",
        alignItems: "center",
    },
    privacyBtnActive: { backgroundColor: "#111827" },
    privacyText: { color: "#111827", fontWeight: "600" },
    privacyTextActive: { color: "#fff" },
    actionsRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    cancelBtn: {
        paddingVertical: 12,
        paddingHorizontal: 18,
        borderRadius: 8,
        backgroundColor: "#f3f4f6",
    },
    cancelText: { color: "#111827", fontWeight: "600" },
    uploadBtn: {
        paddingVertical: 12,
        paddingHorizontal: 18,
        borderRadius: 8,
        backgroundColor: "#111827",
    },
    uploadText: { color: "#fff", fontWeight: "700" },
});
