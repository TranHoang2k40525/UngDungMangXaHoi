import React, { useState } from "react";
import {
    View,
    Text,
    Image,
    TouchableOpacity,
    StyleSheet,
    SafeAreaView,
    TextInput,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";

export default function SharePost() {
    const navigation = useNavigation();
    const route = useRoute();
    const { selectedImage } = route.params || {};

    const [caption, setCaption] = useState("");

    const handleShare = () => {
        // Tạo object bài viết mới
        const newPost = {
            id: Date.now(),
            image: selectedImage?.uri || selectedImage,
            caption: caption,
            timestamp: new Date().toISOString(),
        };

        // Lưu bài viết vào AsyncStorage hoặc Context API
        // Ở đây tôi sẽ navigate về Profile với params
        navigation.navigate("Profile", {
            newPost: newPost,
            refresh: true,
        });
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Text style={styles.backButton}>←</Text>
                </TouchableOpacity>

                <Text style={styles.headerTitle}>Bài viết mới</Text>

                <View style={styles.placeholder} />
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={styles.content}
            >
                <ScrollView showsVerticalScrollIndicator={false}>
                    {/* Preview và Caption */}
                    <View style={styles.postPreview}>
                        <Image
                            source={{
                                uri: selectedImage?.uri || selectedImage,
                            }}
                            style={styles.previewImage}
                        />

                        <TextInput
                            style={styles.captionInput}
                            placeholder="Thêm chú thích..."
                            placeholderTextColor="#999"
                            multiline
                            value={caption}
                            onChangeText={setCaption}
                            maxLength={2200}
                        />
                    </View>

                    {/* Advanced Settings Section */}
                    <View style={styles.divider} />

                    <TouchableOpacity style={styles.settingItem}>
                        <Text style={styles.settingText}>
                            Cược thăm dò ý kiến
                        </Text>
                    </TouchableOpacity>

                    <View style={styles.divider} />

                    <TouchableOpacity style={styles.settingItem}>
                        <Text style={styles.settingText}>Gợi ý</Text>
                    </TouchableOpacity>
                </ScrollView>

                {/* Share Button */}
                <View style={styles.bottomContainer}>
                    <TouchableOpacity
                        style={[
                            styles.shareButton,
                            !selectedImage && styles.shareButtonDisabled,
                        ]}
                        onPress={handleShare}
                        disabled={!selectedImage}
                    >
                        <Text style={styles.shareButtonText}>Chia sẻ</Text>
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#FFFFFF",
    },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 0.5,
        borderBottomColor: "#DBDBDB",
    },
    backButton: {
        fontSize: 28,
        color: "#000000",
        width: 40,
    },
    headerTitle: {
        fontSize: 16,
        fontWeight: "600",
        color: "#000000",
    },
    placeholder: {
        width: 40,
    },
    content: {
        flex: 1,
    },
    postPreview: {
        flexDirection: "row",
        padding: 16,
        alignItems: "flex-start",
    },
    previewImage: {
        width: 80,
        height: 80,
        borderRadius: 4,
        backgroundColor: "#F0F0F0",
    },
    captionInput: {
        flex: 1,
        marginLeft: 12,
        fontSize: 16,
        color: "#000000",
        minHeight: 80,
        textAlignVertical: "top",
    },
    divider: {
        height: 0.5,
        backgroundColor: "#DBDBDB",
        marginHorizontal: 16,
    },
    settingItem: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 16,
    },
    settingText: {
        fontSize: 16,
        color: "#000000",
    },
    bottomContainer: {
        padding: 16,
        borderTopWidth: 0.5,
        borderTopColor: "#DBDBDB",
    },
    shareButton: {
        backgroundColor: "#0095F6",
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: "center",
    },
    shareButtonDisabled: {
        backgroundColor: "#B3D9FF",
    },
    shareButtonText: {
        color: "#FFFFFF",
        fontSize: 16,
        fontWeight: "600",
    },
});
