import React, { useState } from "react";
import {
    View,
    Text,
    Image,
    TouchableOpacity,
    StyleSheet,
    TextInput,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from "@react-navigation/native";
import { createPost } from "../API/Api";
import { VideoView, useVideoPlayer } from 'expo-video';

export default function SharePost() {
    const navigation = useNavigation();
    const route = useRoute();
    const insets = useSafeAreaInsets();
    const { selectedImage, selectedImages = [] } = route.params || {};

    const [caption, setCaption] = useState("");
    const [privacy, setPrivacy] = useState("public");
    const [loading, setLoading] = useState(false);

    // Tạo video player cho preview nếu là video
    const isVideo = (selectedImage?.mediaType === 'video' || selectedImage?.type === 'video');
    const uri = selectedImage?.uri || selectedImage;
    const videoPlayer = useVideoPlayer(isVideo ? uri : null, (player) => {
        if (player && isVideo) {
            player.loop = false;
            player.muted = true;
        }
    });

    const handleShare = async () => {
        try {
            setLoading(true);
            const items = (selectedImages.length ? selectedImages : (selectedImage ? [selectedImage] : [])).filter(Boolean);
            const imageItems = items.filter(it => (it.mediaType === 'photo' || it.mediaType === 'image' || it.type === 'image'));
            const videoItem = items.find(it => (it.mediaType === 'video' || it.type === 'video')) || null;

            const images = imageItems.map((it, idx) => {
                const uri = it?.uri || it;
                const nameGuess = uri?.split('/').pop() || `image_${idx}.jpg`;
                const typeGuess = nameGuess.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';
                return { uri, name: nameGuess, type: typeGuess };
            });

            let video = null;
            if (videoItem) {
                const vuri = videoItem?.uri || videoItem;
                const vname = vuri?.split('/').pop() || 'video.mp4';
                const vtype = vname.toLowerCase().endsWith('.mov') ? 'video/quicktime' : 'video/mp4';
                video = { uri: vuri, name: vname, type: vtype };
            }

            await createPost({ images, video, caption, privacy });
            // Điều hướng đúng về tab Home trong Tab Navigator lồng bên trong Stack
            navigation.navigate('MainTabs', { screen: 'Home', params: { refresh: true } });
        } catch (e) {
            console.warn('Share error', e);
            alert(e.message || 'Không thể đăng bài');
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView edges={['top']} style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Text style={styles.backButton}>←</Text>
                </TouchableOpacity>

                <Text style={styles.headerTitle}>Bài viết mới</Text>

                <View style={styles.placeholder} />
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : undefined}
                style={styles.content}
                keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
            >
                <ScrollView showsVerticalScrollIndicator={false}>
                    {/* Caption Input - Đặt trước ảnh/video */}
                    <View style={styles.captionContainer}>
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

                    {/* Preview ảnh/video - Đặt sau caption */}
                    <View style={styles.postPreview}>
                        {(() => {
                            if (isVideo && videoPlayer) {
                                return (
                                    <View style={{ position:'relative' }}>
                                        <VideoView
                                            style={styles.previewImage}
                                            player={videoPlayer}
                                            contentFit="cover"
                                            nativeControls={false}
                                        />
                                        <View style={styles.videoPlayOverlay} pointerEvents="none">
                                            <Text style={{ color:'#fff', fontWeight:'800', fontSize:18 }}>▶</Text>
                                        </View>
                                    </View>
                                );
                            }
                            return (
                                <Image
                                    source={{ uri }}
                                    style={styles.previewImage}
                                />
                            );
                        })()}

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

                    {/* Privacy selection */}
                    <View style={styles.privacyRow}>
                        {['public','followers','private'].map(p => (
                            <TouchableOpacity
                                key={p}
                                onPress={() => setPrivacy(p)}
                                style={[styles.privacyBtn, privacy===p && styles.privacyBtnActive]}
                            >
                                <Text style={[styles.privacyText, privacy===p && styles.privacyTextActive]}>
                                    {p.toUpperCase()}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </ScrollView>

                {/* Share Button */}
                <View style={styles.bottomContainer}>
                    <TouchableOpacity
                        style={[
                            styles.shareButton,
                            !selectedImage && styles.shareButtonDisabled,
                        ]}
                        onPress={handleShare}
                        disabled={!selectedImage || loading}
                    >
                        <Text style={styles.shareButtonText}>{loading ? 'Đang đăng...' : 'Chia sẻ'}</Text>
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
            {loading && (
                <View style={styles.loadingOverlay}>
                    <View style={styles.loadingSpinner} />
                </View>
            )}
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
        backgroundColor: "#FFFFFF",
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
    captionContainer: {
        padding: 16,
        backgroundColor: '#FFFFFF',
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
    videoPlayOverlay: {
        position:'absolute',
        top:0,
        left:0,
        right:0,
        bottom:0,
        alignItems:'center',
        justifyContent:'center',
        backgroundColor:'rgba(0,0,0,0.25)'
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
    privacyRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingHorizontal: 16,
        paddingVertical: 16,
    },
    privacyBtn: {
        borderWidth: 1,
        borderColor: '#DBDBDB',
        borderRadius: 20,
        paddingHorizontal: 12,
        paddingVertical: 6,
    },
    privacyBtnActive: {
        backgroundColor: '#0095F6',
        borderColor: '#0095F6',
    },
    privacyText: {
        color: '#000',
        fontWeight: '600',
    },
    privacyTextActive: {
        color: '#fff',
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
    loadingOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.25)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    loadingSpinner: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: 'rgba(255,255,255,0.9)',
        borderWidth: 4,
        borderColor: '#111827',
        borderTopColor: 'transparent',
    },
});
