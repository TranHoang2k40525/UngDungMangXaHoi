import React, { useState, useEffect, useRef } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    TextInput,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    Modal,
    FlatList,
    Alert,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from "@react-navigation/native";
import { Image } from 'expo-image'; // Thay vì React Native Image

import { createPost, getFollowing, getFollowers } from "../API/Api";
import { VideoView, useVideoPlayer } from 'expo-video';
import { Ionicons } from '@expo/vector-icons';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import * as VideoThumbnails from 'expo-video-thumbnails';
import { Video } from 'expo-av';

// Helper: Convert iOS ph:// URI to file:// URI using ImageManipulator
const normalizeUri = async (uri) => {
    if (!uri) return uri;

    // iOS ph:// URIs need to be processed to get a file:// URI
    if (Platform.OS === "ios" && uri.startsWith("ph://")) {
        try {
            console.log(`[SharePost] Normalizing iOS ph:// URI: ${uri}`);
            
            // Use ImageManipulator to handle ph:// URIs (it converts to file:// automatically)
            // Note: This works for images. For videos, we just return the URI as-is
            // because expo-video can handle ph:// URIs directly when using VideoView
            const result = await manipulateAsync(
                uri,
                [], // No transformations, just convert URI
                { compress: 1, format: SaveFormat.JPEG }
            );
            console.log(`[SharePost] Converted iOS ph:// URI to: ${result.uri}`);
            return result.uri;
        } catch (e) {
            console.warn("[SharePost] Failed to convert iOS ph:// URI:", e);
            // For videos, return original URI - expo-video can handle ph:// directly
            console.log("[SharePost] Returning original ph:// URI for video playback");
            return uri;
        }
    }

    return uri;
};
export default function SharePost() {
    const navigation = useNavigation();
    const route = useRoute();
    const insets = useSafeAreaInsets();
    const { selectedImage, selectedImages = [] } = route.params || {};

    const [caption, setCaption] = useState("");
    const [privacy, setPrivacy] = useState("public");
    const [loading, setLoading] = useState(false);

    // Mention autocomplete states
    const [showMentionDropdown, setShowMentionDropdown] = useState(false);
    const [mentionSearch, setMentionSearch] = useState("");
    const [cursorPosition, setCursorPosition] = useState(0);
    const [allUsers, setAllUsers] = useState([]);
    const captionInputRef = useRef(null);

    // Tag users states (separate from caption mentions)
    const [showTagModal, setShowTagModal] = useState(false);
    const [taggedUsers, setTaggedUsers] = useState([]);
    const [searchTag, setSearchTag] = useState("");

    // Privacy modal
    const [showPrivacyModal, setShowPrivacyModal] = useState(false);

    // Normalized URI for iOS ph:// support
    const [normalizedPreviewUri, setNormalizedPreviewUri] = useState(null);

    // Tạo video player cho preview nếu là video
    const isVideo = (selectedImage?.mediaType === 'video' || selectedImage?.type === 'video');

    // Normalize iOS ph:// URIs for preview
    useEffect(() => {
        const normalize = async () => {
            if (isVideo) {
                // For videos, use original URI - expo-video VideoView can handle ph:// directly
                const uri = selectedImage?.uri || selectedImage;
                setNormalizedPreviewUri(uri);
            } else if (selectedImage?.uri) {
                // For images, normalize ph:// to file://
                const normalized = await normalizeUri(selectedImage.uri);
                setNormalizedPreviewUri(normalized);
            } else if (selectedImage && typeof selectedImage === 'string') {
                const normalized = await normalizeUri(selectedImage);
                setNormalizedPreviewUri(normalized);
            }
        };
        normalize();
    }, [selectedImage, isVideo]);

    const uri = normalizedPreviewUri || selectedImage?.uri || selectedImage;
    
    // Extract string URI for Image component (in case uri is an object)
    const imageUri = typeof uri === 'string' ? uri : (uri?.uri || null);
    
    const videoPlayer = useVideoPlayer(isVideo ? uri : null, (player) => {
        if (player && isVideo) {
            player.loop = true;
            player.muted = true;
            player.play();
        }
    });

    // Update video source when normalized URI changes
    useEffect(() => {
        if (isVideo && uri && videoPlayer) {
            // Use replaceAsync for ph:// URIs (required for iOS PHAsset URLs)
            videoPlayer.replaceAsync(uri).catch(err => {
                console.warn('[SharePost] Failed to load video:', err);
            });
        }
    }, [uri, isVideo]);

    // Load users for mentions (following + followers)
    useEffect(() => {
        loadUsers();
    }, []);

    const loadUsers = async () => {
        try {
            const [following, followers] = await Promise.all([
                getFollowing().catch(() => []),
                getFollowers().catch(() => [])
            ]);

            // Merge and deduplicate users
            const raw = [...(Array.isArray(following) ? following : []), ...(Array.isArray(followers) ? followers : [])];
            const allUsersMap = new Map();
            // Backend may return different property names (userId, user_id, id). Normalize to { id, username, fullName, avatarUrl }
            raw.forEach(u => {
                if (!u) return;
                const id = u.id ?? u.userId ?? u.user_id ?? u.user_id ?? null;
                const username = u.username ?? u.userName ?? u.user_name ?? null;
                const fullName = u.fullName ?? u.full_name ?? u.fullname ?? null;
                const avatarUrl = u.avatarUrl ?? u.avatar_url ?? u.avatar ?? null;
                if (id != null) {
                    allUsersMap.set(Number(id), { id: Number(id), username: username || String(u?.username || u?.userName || id), fullName, avatarUrl });
                }
            });

            setAllUsers(Array.from(allUsersMap.values()));
        } catch (error) {
            console.warn('Load users error:', error);
            setAllUsers([]);
        }
    };

    // Detect @ symbol and show mention dropdown
    const handleCaptionChange = (text) => {
        setCaption(text);

        // Find @ symbol before cursor
        const textBeforeCursor = text.substring(0, cursorPosition);
        const lastAtIndex = textBeforeCursor.lastIndexOf('@');

        if (lastAtIndex !== -1) {
            const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1);
            // Check if there's no space after @ => still typing mention
            if (!textAfterAt.includes(' ')) {
                const search = textAfterAt;
                setMentionSearch(search);

                // Filter locally to decide whether to show dropdown
                const localFiltered = allUsers.filter(u => u.username?.toLowerCase().includes(search.toLowerCase())).slice(0, 5);
                if (localFiltered.length > 0) {
                    setShowMentionDropdown(true);
                } else {
                    // no matches -> hide
                    setShowMentionDropdown(false);
                }
                return;
            }
        }

        // No active @mention token
        setShowMentionDropdown(false);
        setMentionSearch("");
    };

    const handleMentionSelect = (user) => {
        const textBeforeCursor = caption.substring(0, cursorPosition);
        const textAfterCursor = caption.substring(cursorPosition);
        const lastAtIndex = textBeforeCursor.lastIndexOf('@');

        if (lastAtIndex !== -1) {
            const beforeAt = caption.substring(0, lastAtIndex);
            const mention = `@${user.username} `;
            const newCaption = beforeAt + mention + textAfterCursor;
            const newCursorPos = beforeAt.length + mention.length;

            setCaption(newCaption);
            setCursorPosition(newCursorPos);
            setShowMentionDropdown(false);
            setMentionSearch("");

            // Focus back to input
            setTimeout(() => {
                if (captionInputRef.current) {
                    captionInputRef.current.focus();
                }
            }, 100);
        }
    };

    const filteredMentionUsers = allUsers.filter(user =>
        user.username?.toLowerCase().includes(mentionSearch.toLowerCase())
    ).slice(0, 5);

    const handleAddTag = (user) => {
        if (!taggedUsers.find(u => u.id === user.id)) {
            setTaggedUsers([...taggedUsers, user]);
        }
        setShowTagModal(false);
        setSearchTag("");
    };

    const handleRemoveTag = (userId) => {
        setTaggedUsers(taggedUsers.filter(u => u.id !== userId));
    };

    const filteredTagUsers = allUsers.filter(user =>
        user.username?.toLowerCase().includes(searchTag.toLowerCase())
    );

    const getPrivacyLabel = () => {
        switch (privacy) {
            case 'public': return 'Công khai';
            case 'followers': return 'Người theo dõi';
            case 'private': return 'Riêng tư';
            default: return 'Công khai';
        }
    };

    const handleShare = async () => {
        try {
            setLoading(true);

            const items = (selectedImages.length ? selectedImages : (selectedImage ? [selectedImage] : [])).filter(Boolean);
            const imageItems = items.filter(it => (it.mediaType === 'photo' || it.mediaType === 'image' || it.type === 'image'));
            const videoItem = items.find(it => (it.mediaType === 'video' || it.type === 'video')) || null;

            const images = imageItems.map((it, idx) => {
                const uri = it?.uri || it;
                let nameGuess = uri?.split('/').pop() || `image_${idx}.jpg`;
                
                // Ensure filename has proper extension (fix for iOS ph:// URIs like "001")
                if (!nameGuess.match(/\.(jpg|jpeg|png|gif|webp|heic|heif)$/i)) {
                    nameGuess = `image_${idx}_${nameGuess}.jpg`;
                }
                
                const typeGuess = nameGuess.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';
                return { uri, name: nameGuess, type: typeGuess };
            });

            let video = null;
            if (videoItem) {
                const vuri = videoItem?.uri || videoItem;
                let vname = vuri?.split('/').pop() || 'video.mp4';
                
                // Ensure video filename has proper extension
                if (!vname.match(/\.(mp4|mov|avi|mkv|m4v)$/i)) {
                    vname = `video_${Date.now()}.mp4`;
                }
                
                const vtype = vname.toLowerCase().endsWith('.mov') ? 'video/quicktime' : 'video/mp4';
                video = { uri: vuri, name: vname, type: vtype };
            }

            // Extract @mentions from caption
            const mentionRegex = /@(\w+)/g;
            const captionMentions = [];
            let match;
            while ((match = mentionRegex.exec(caption)) !== null) {
                const username = match[1];
                const user = allUsers.find(u => u.username === username);
                if (user) {
                    captionMentions.push(user.id);
                }
            }

            // Merge caption mentions and tagged users
            const allMentionIds = [...new Set([...captionMentions, ...taggedUsers.map(u => u.id)])];

            await createPost({
                images,
                video,
                caption,
                privacy,
                mentions: allMentionIds,
                tags: taggedUsers.map(u => u.id)
            });

            navigation.navigate('MainTabs', { screen: 'Home', params: { refresh: true } });
        } catch (e) {
            console.warn('Share error', e);
            Alert.alert('Lỗi', e.message || 'Không thể đăng bài');
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
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: Math.max(20, insets.bottom + 20) }}>
                    {/* Caption Input */}
                    <View style={styles.captionSection}>
                        <TextInput
                            ref={captionInputRef}
                            style={styles.captionInput}
                            placeholder="Viết chú thích... (Nhấn @ để gắn thẻ người dùng)"
                            placeholderTextColor="#999"
                            multiline
                            value={caption}
                            onChangeText={handleCaptionChange}
                            onBlur={() => { setShowMentionDropdown(false); setMentionSearch(''); }}
                            onSelectionChange={(e) => setCursorPosition(e.nativeEvent.selection.start)}
                            maxLength={2200}
                        />
                        <Text style={styles.charCounter}>{caption.length}/2200</Text>

                        {/* Mention Dropdown */}
                        {showMentionDropdown && filteredMentionUsers.length > 0 && (
                            <View style={styles.mentionDropdown}>
                                <View style={styles.mentionList}>
                                    {filteredMentionUsers.map((item) => (
                                        <TouchableOpacity
                                            key={String(item.id)}
                                            style={styles.mentionItem}
                                            onPress={() => handleMentionSelect(item)}
                                        >
                                            <Image
                                                source={{ uri: item.avatarUrl || 'https://via.placeholder.com/40' }}
                                                style={styles.mentionAvatar}
                                            />
                                            <View>
                                                <Text style={styles.mentionUsername}>@{item.username}</Text>
                                                {item.fullName && (
                                                    <Text style={styles.mentionFullName}>{item.fullName}</Text>
                                                )}
                                            </View>
                                        </TouchableOpacity>
                                    ))}
                                </View>

                                {/* Global overlay to close mention dropdown when tapping outside */}
                                {showMentionDropdown && (
                                    <TouchableOpacity style={styles.globalOverlay} activeOpacity={1} onPress={() => { setShowMentionDropdown(false); setMentionSearch(''); }} />
                                )}
                            </View>
                        )}
                    </View>

                    <View style={styles.divider} />

                    {/* Privacy Selection */}
                    <TouchableOpacity
                        style={styles.settingItem}
                        onPress={() => setShowPrivacyModal(true)}
                    >
                        <Text style={styles.settingLabel}>Trạng thái bài đăng</Text>
                        <View style={styles.settingRight}>
                            <Text style={styles.settingValue}>{getPrivacyLabel()}</Text>
                            <Ionicons name="chevron-forward" size={20} color="#999" />
                        </View>
                    </TouchableOpacity>

                    <View style={styles.divider} />

                    {/* Video/Image Preview */}
                    <View style={styles.mediaSection}>
                        <Text style={styles.sectionTitle}>Xem trước</Text>

                        <View style={styles.mediaPreview}>
                            {isVideo && videoPlayer ? (
                                <View style={styles.videoContainer}>
                                    <VideoView
                                        style={styles.previewMedia}
                                        player={videoPlayer}
                                        contentFit="cover"
                                        nativeControls={false}
                                    />
                                    <View style={styles.videoPlayOverlay} pointerEvents="none">
                                        <Ionicons name="play-circle" size={48} color="rgba(255,255,255,0.9)" />
                                    </View>
                                </View>
                            ) : (
                                <Image source={{ uri: imageUri }} style={styles.previewMedia} />
                            )}
                        </View>
                    </View>

                    <View style={styles.divider} />

                    {/* Mention/Tag Users */}
                    <View style={styles.mentionSection}>
                        <TouchableOpacity
                            style={styles.settingItem}
                            onPress={() => setShowTagModal(true)}
                        >
                            <Text style={styles.settingLabel}>Gắn thẻ người khác</Text>
                            <View style={styles.settingRight}>
                                <Text style={styles.settingValue}>
                                    {taggedUsers.length > 0 ? `${taggedUsers.length} người` : 'Thêm'}
                                </Text>
                                <Ionicons name="chevron-forward" size={20} color="#999" />
                            </View>
                        </TouchableOpacity>

                        {taggedUsers.length > 0 && (
                            <View style={styles.mentionedList}>
                                {taggedUsers.map(user => (
                                    <View key={user.id} style={styles.mentionedUser}>
                                        <Image
                                            source={{ uri: user.avatarUrl || 'https://via.placeholder.com/40' }}
                                            style={styles.mentionedAvatar}
                                        />
                                        <Text style={styles.mentionedUsername}>@{user.username}</Text>
                                        <TouchableOpacity onPress={() => handleRemoveTag(user.id)}>
                                            <Ionicons name="close-circle" size={20} color="#999" />
                                        </TouchableOpacity>
                                    </View>
                                ))}
                            </View>
                        )}
                    </View>
                </ScrollView>

                {/* Share Button - Fixed at bottom with safe area */}
                <View style={[styles.bottomContainer, { paddingBottom: Math.max(16, insets.bottom + 16) }]}>
                    <TouchableOpacity
                        style={[
                            styles.shareButton,
                            !selectedImage && styles.shareButtonDisabled,
                        ]}
                        onPress={handleShare}
                        disabled={!selectedImage || loading}
                    >
                        <Text style={styles.shareButtonText}>
                            {loading ? 'Đang đăng...' : 'Chia sẻ'}
                        </Text>
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>

            {/* Privacy Modal */}
            <Modal
                visible={showPrivacyModal}
                transparent
                animationType="slide"
                onRequestClose={() => setShowPrivacyModal(false)}
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setShowPrivacyModal(false)}
                >
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Chọn trạng thái</Text>
                            <TouchableOpacity onPress={() => setShowPrivacyModal(false)}>
                                <Ionicons name="close" size={24} color="#000" />
                            </TouchableOpacity>
                        </View>

                        {[
                            { key: 'public', label: 'Công khai', icon: 'earth', desc: 'Mọi người đều có thể xem' },
                            { key: 'followers', label: 'Người theo dõi', icon: 'people', desc: 'Chỉ người theo dõi bạn' },
                            { key: 'private', label: 'Riêng tư', icon: 'lock-closed', desc: 'Chỉ mình bạn' }
                        ].map(option => (
                            <TouchableOpacity
                                key={option.key}
                                style={styles.privacyOption}
                                onPress={() => {
                                    setPrivacy(option.key);
                                    setShowPrivacyModal(false);
                                }}
                            >
                                <Ionicons name={option.icon} size={24} color={privacy === option.key ? '#0095F6' : '#000'} />
                                <View style={styles.privacyOptionText}>
                                    <Text style={[styles.privacyOptionLabel, privacy === option.key && styles.privacyOptionLabelActive]}>
                                        {option.label}
                                    </Text>
                                    <Text style={styles.privacyOptionDesc}>{option.desc}</Text>
                                </View>
                                {privacy === option.key && (
                                    <Ionicons name="checkmark-circle" size={24} color="#0095F6" />
                                )}
                            </TouchableOpacity>
                        ))}
                    </View>
                </TouchableOpacity>
            </Modal>

            {/* Tag Users Modal */}
            <Modal
                visible={showTagModal}
                transparent
                animationType="slide"
                onRequestClose={() => setShowTagModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Gắn thẻ người khác</Text>
                            <TouchableOpacity onPress={() => setShowTagModal(false)}>
                                <Ionicons name="close" size={24} color="#000" />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.searchContainer}>
                            <Ionicons name="search" size={20} color="#999" />
                            <TextInput
                                style={styles.searchInput}
                                placeholder="Tìm kiếm..."
                                value={searchTag}
                                onChangeText={setSearchTag}
                            />
                        </View>

                        <FlatList
                            data={filteredTagUsers}
                            keyExtractor={item => String(item.id)}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={styles.userItem}
                                    onPress={() => handleAddTag(item)}
                                >
                                    <Image
                                        source={{ uri: item.avatarUrl || 'https://via.placeholder.com/40' }}
                                        style={styles.userAvatar}
                                    />
                                    <View style={styles.userInfo}>
                                        <Text style={styles.userUsername}>@{item.username}</Text>
                                        <Text style={styles.userFullname}>{item.fullName || item.username}</Text>
                                    </View>
                                    {taggedUsers.find(u => u.id === item.id) && (
                                        <Ionicons name="checkmark-circle" size={24} color="#0095F6" />
                                    )}
                                </TouchableOpacity>
                            )}
                            ListEmptyComponent={
                                <Text style={styles.emptyText}>Không tìm thấy người dùng</Text>
                            }
                        />
                    </View>
                </View>
            </Modal>

            {loading && (
                <View style={styles.loadingOverlay}>
                    <View style={styles.loadingSpinner} />
                    <Text style={styles.loadingText}>Đang đăng bài...</Text>
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
    captionSection: {
        padding: 16,
    },
    captionInput: {
        fontSize: 16,
        color: "#000000",
        minHeight: 100,
        textAlignVertical: "top",
    },
    charCounter: {
        fontSize: 12,
        color: "#999",
        textAlign: 'right',
        marginTop: 8,
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
    settingLabel: {
        fontSize: 16,
        color: "#000000",
        fontWeight: '500',
    },
    settingRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    settingValue: {
        fontSize: 14,
        color: "#999",
    },
    mediaSection: {
        padding: 16,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#000',
        marginBottom: 12,
    },
    mediaPreview: {
        width: '100%',
        aspectRatio: 1,
        borderRadius: 8,
        overflow: 'hidden',
    },
    videoContainer: {
        position: 'relative',
    },
    previewMedia: {
        width: '100%',
        height: '100%',
        backgroundColor: "#F0F0F0",
    },
    videoPlayOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0,0,0,0.2)'
    },
    mentionSection: {
        marginBottom: 16,
    },
    mentionedList: {
        paddingHorizontal: 16,
        paddingTop: 8,
        gap: 8,
    },
    mentionedUser: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingVertical: 8,
        paddingHorizontal: 12,
        backgroundColor: '#F0F0F0',
        borderRadius: 8,
    },
    mentionedAvatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
    },
    mentionedUsername: {
        flex: 1,
        fontSize: 14,
        fontWeight: '600',
        color: '#000',
    },
    bottomContainer: {
        padding: 16,
        borderTopWidth: 0.5,
        borderTopColor: "#DBDBDB",
        backgroundColor: '#fff',
    },
    shareButton: {
        backgroundColor: "#0095F6",
        paddingVertical: 14,
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
    // Modal styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: '80%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 0.5,
        borderBottomColor: '#DBDBDB',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#000',
    },
    doneButton: {
        fontSize: 16,
        color: '#0095F6',
        fontWeight: '600',
    },
    privacyOption: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        gap: 12,
        borderBottomWidth: 0.5,
        borderBottomColor: '#DBDBDB',
    },
    privacyOptionText: {
        flex: 1,
    },
    privacyOptionLabel: {
        fontSize: 16,
        fontWeight: '500',
        color: '#000',
    },
    privacyOptionLabelActive: {
        color: '#0095F6',
    },
    privacyOptionDesc: {
        fontSize: 13,
        color: '#999',
        marginTop: 2,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        margin: 16,
        paddingHorizontal: 12,
        paddingVertical: 8,
        backgroundColor: '#F0F0F0',
        borderRadius: 8,
        gap: 8,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        color: '#000',
    },
    userItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        gap: 12,
        borderBottomWidth: 0.5,
        borderBottomColor: '#DBDBDB',
    },
    userAvatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
    },
    userInfo: {
        flex: 1,
    },
    userUsername: {
        fontSize: 14,
        fontWeight: '600',
        color: '#000',
    },
    userFullname: {
        fontSize: 13,
        color: '#999',
        marginTop: 2,
    },
    // Mention dropdown styles
    mentionDropdown: {
        position: 'absolute',
        top: 120,
        left: 16,
        right: 16,
        backgroundColor: '#fff',
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
        elevation: 5,
        maxHeight: 250,
        zIndex: 1000,
    },
    mentionList: {
        maxHeight: 250,
    },
    mentionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderBottomWidth: 0.5,
        borderBottomColor: '#DBDBDB',
    },
    mentionAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginRight: 12,
    },
    mentionUsername: {
        fontSize: 15,
        fontWeight: '600',
        color: '#000',
    },
    mentionFullName: {
        fontSize: 13,
        color: '#666',
        marginTop: 2,
    },
});
