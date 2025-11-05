import React, { useState, useEffect, useRef } from "react";
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
    Modal,
    FlatList,
    Alert,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from "@react-navigation/native";
import { createPost, getFollowing, getFollowers } from "../API/Api";
import { VideoView, useVideoPlayer } from 'expo-video';
import { Ionicons } from '@expo/vector-icons';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import * as VideoThumbnails from 'expo-video-thumbnails';
import { Video } from 'expo-av';

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
    
    // Video editing states
    const [showVideoEditModal, setShowVideoEditModal] = useState(false);
    const [editedVideoUri, setEditedVideoUri] = useState(null);
    const [selectedFilter, setSelectedFilter] = useState('none');
    const [trimStart, setTrimStart] = useState(0);
    const [trimEnd, setTrimEnd] = useState(null);
    const [isProcessingVideo, setIsProcessingVideo] = useState(false);

    // Tạo video player cho preview nếu là video
    const isVideo = (selectedImage?.mediaType === 'video' || selectedImage?.type === 'video');
    const uri = editedVideoUri || selectedImage?.uri || selectedImage;
    const videoPlayer = useVideoPlayer(isVideo ? uri : null, (player) => {
        if (player && isVideo) {
            player.loop = true;
            player.muted = true;
            player.play();
        }
    });

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
            const allUsersMap = new Map();
            [...(Array.isArray(following) ? following : []), ...(Array.isArray(followers) ? followers : [])].forEach(user => {
                if (user && user.id) {
                    allUsersMap.set(user.id, user);
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
            // Check if there's no space after @
            if (!textAfterAt.includes(' ')) {
                setMentionSearch(textAfterAt);
                setShowMentionDropdown(true);
                return;
            }
        }
        
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
        switch(privacy) {
            case 'public': return 'Công khai';
            case 'followers': return 'Người theo dõi';
            case 'private': return 'Riêng tư';
            default: return 'Công khai';
        }
    };

    const applyVideoFilter = async () => {
        if (!isVideo || selectedFilter === 'none') return uri;
        
        setIsProcessingVideo(true);
        try {
            // TODO: Implement real-time video filter using expo-av or ffmpeg
            // For now, we'll process on upload
            // In production: use ffmpeg with filter like brightness, contrast, saturation, etc.
            
            // Simulated processing delay
            await new Promise(resolve => setTimeout(resolve, 1500));
            
            // For trimming: would use expo-av or ffmpeg to cut video
            // For filters: apply color adjustments using video processing libraries
            
            Alert.alert('Hoàn tất', 'Bộ lọc sẽ được áp dụng khi đăng bài');
            return uri;
        } catch (error) {
            console.warn('Apply filter error:', error);
            Alert.alert('Lỗi', 'Không thể áp dụng bộ lọc');
            return uri;
        } finally {
            setIsProcessingVideo(false);
        }
    };

    const handleShare = async () => {
        try {
            setLoading(true);
            
            // Apply video edits if any
            let finalUri = uri;
            if (isVideo && (selectedFilter !== 'none' || trimStart > 0 || trimEnd !== null)) {
                finalUri = await applyVideoFilter();
            }
            
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
                const vuri = finalUri || editedVideoUri || videoItem?.uri || videoItem;
                const vname = vuri?.split('/').pop() || 'video.mp4';
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
                tags: taggedUsers.map(u => u.id),
                videoFilter: selectedFilter !== 'none' ? selectedFilter : undefined,
                videoTrim: trimStart > 0 || trimEnd ? { start: trimStart, end: trimEnd } : undefined
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
<<<<<<< HEAD
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

=======
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: Math.max(20, insets.bottom + 20) }}>
                    {/* Caption Input */}
                    <View style={styles.captionSection}>
>>>>>>> backup/rebase-20251105151448
                        <TextInput
                            ref={captionInputRef}
                            style={styles.captionInput}
                            placeholder="Viết chú thích... (Nhấn @ để gắn thẻ người dùng)"
                            placeholderTextColor="#999"
                            multiline
                            value={caption}
                            onChangeText={handleCaptionChange}
                            onSelectionChange={(e) => setCursorPosition(e.nativeEvent.selection.start)}
                            maxLength={2200}
                        />
                        <Text style={styles.charCounter}>{caption.length}/2200</Text>
                        
                        {/* Mention Dropdown */}
                        {showMentionDropdown && filteredMentionUsers.length > 0 && (
                            <View style={styles.mentionDropdown}>
                                <FlatList
                                    data={filteredMentionUsers}
                                    keyExtractor={(item) => item.id?.toString()}
                                    renderItem={({ item }) => (
                                        <TouchableOpacity
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
                                    )}
                                    style={styles.mentionList}
                                    keyboardShouldPersistTaps="handled"
                                />
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

                    {/* Video/Image Preview with Edit Options */}
                    <View style={styles.mediaSection}>
                        <View style={styles.mediaSectionHeader}>
                            <Text style={styles.sectionTitle}>Xem trước</Text>
                            {isVideo && (
                                <TouchableOpacity 
                                    style={styles.editButton}
                                    onPress={() => setShowVideoEditModal(true)}
                                >
                                    <Ionicons name="create-outline" size={20} color="#0095F6" />
                                    <Text style={styles.editButtonText}>Chỉnh sửa video</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                        
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
                                    {selectedFilter !== 'none' && (
                                        <View style={styles.filterBadge}>
                                            <Text style={styles.filterBadgeText}>Bộ lọc: {selectedFilter}</Text>
                                        </View>
                                    )}
                                </View>
                            ) : (
                                <Image source={{ uri }} style={styles.previewMedia} />
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

            {/* Video Edit Modal */}
            <Modal
                visible={showVideoEditModal}
                transparent
                animationType="slide"
                onRequestClose={() => setShowVideoEditModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <TouchableOpacity onPress={() => setShowVideoEditModal(false)}>
                                <Text style={styles.cancelButton}>Hủy</Text>
                            </TouchableOpacity>
                            <Text style={styles.modalTitle}>Chỉnh sửa video</Text>
                            <TouchableOpacity 
                                onPress={async () => {
                                    await applyVideoFilter();
                                    setShowVideoEditModal(false);
                                }}
                                disabled={isProcessingVideo}
                            >
                                <Text style={[styles.doneButton, isProcessingVideo && styles.doneButtonDisabled]}>
                                    {isProcessingVideo ? 'Đang xử lý...' : 'Áp dụng'}
                                </Text>
                            </TouchableOpacity>
                        </View>

                        <ScrollView>
                            {/* Video Preview */}
                            {isVideo && videoPlayer && (
                                <View style={styles.videoEditPreview}>
                                    <VideoView
                                        style={styles.videoEditPreviewPlayer}
                                        player={videoPlayer}
                                        contentFit="cover"
                                        nativeControls={false}
                                    />
                                    {selectedFilter !== 'none' && (
                                        <View style={styles.filterOverlay}>
                                            <Text style={styles.filterOverlayText}>Xem trước: {selectedFilter}</Text>
                                        </View>
                                    )}
                                </View>
                            )}

                            {/* Filter Section */}
                            <View style={styles.editSection}>
                                <Text style={styles.editSectionTitle}>Bộ lọc màu</Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterList}>
                                    {['none', 'grayscale', 'sepia', 'vivid', 'warm', 'cool', 'vintage', 'dramatic'].map(filter => (
                                        <TouchableOpacity
                                            key={filter}
                                            style={[styles.filterItem, selectedFilter === filter && styles.filterItemActive]}
                                            onPress={() => setSelectedFilter(filter)}
                                        >
                                            <View style={[styles.filterPreview, { backgroundColor: 
                                                filter === 'none' ? '#fff' :
                                                filter === 'grayscale' ? '#888' :
                                                filter === 'sepia' ? '#D2691E' :
                                                filter === 'vivid' ? '#FF6B6B' :
                                                filter === 'warm' ? '#FF8C42' :
                                                filter === 'cool' ? '#4ECDC4' :
                                                filter === 'vintage' ? '#C09F80' :
                                                '#2C3E50'
                                            }]} />
                                            <Text style={[styles.filterName, selectedFilter === filter && styles.filterNameActive]}>
                                                {filter === 'none' ? 'Gốc' :
                                                 filter === 'grayscale' ? 'Đen trắng' :
                                                 filter === 'sepia' ? 'Cổ điển' :
                                                 filter === 'vivid' ? 'Sống động' :
                                                 filter === 'warm' ? 'Ấm' : 
                                                 filter === 'cool' ? 'Lạnh' :
                                                 filter === 'vintage' ? 'Cổ xưa' :
                                                 'Đậm'}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            </View>

                            {/* Trim Section */}
                            <View style={styles.editSection}>
                                <Text style={styles.editSectionTitle}>Cắt video</Text>
                                <View style={styles.trimControls}>
                                    <View style={styles.trimInput}>
                                        <Text style={styles.trimLabel}>Bắt đầu (giây):</Text>
                                        <TextInput
                                            style={styles.trimTextInput}
                                            keyboardType="numeric"
                                            value={String(trimStart)}
                                            onChangeText={(text) => setTrimStart(Number(text) || 0)}
                                            placeholder="0"
                                        />
                                    </View>
                                    <View style={styles.trimInput}>
                                        <Text style={styles.trimLabel}>Kết thúc (giây):</Text>
                                        <TextInput
                                            style={styles.trimTextInput}
                                            keyboardType="numeric"
                                            value={trimEnd !== null ? String(trimEnd) : ''}
                                            onChangeText={(text) => setTrimEnd(text ? Number(text) : null)}
                                            placeholder="Tối đa"
                                        />
                                    </View>
                                </View>
                                <Text style={styles.editNote}>
                                    💡 Bộ lọc và cắt video sẽ được áp dụng khi đăng bài
                                </Text>
                            </View>
                        </ScrollView>
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
<<<<<<< HEAD
    captionContainer: {
        padding: 16,
        backgroundColor: '#FFFFFF',
    },
    postPreview: {
        flexDirection: "row",
=======
    captionSection: {
>>>>>>> backup/rebase-20251105151448
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
    mediaSectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#000',
    },
    editButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    editButtonText: {
        fontSize: 14,
        color: '#0095F6',
        fontWeight: '500',
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
        position:'absolute',
        top:0,
        left:0,
        right:0,
        bottom:0,
        alignItems:'center',
        justifyContent:'center',
        backgroundColor:'rgba(0,0,0,0.2)'
    },
    filterBadge: {
        position: 'absolute',
        top: 12,
        right: 12,
        backgroundColor: 'rgba(0,0,0,0.7)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
    },
    filterBadgeText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '600',
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
    emptyText: {
        textAlign: 'center',
        padding: 32,
        color: '#999',
        fontSize: 14,
    },
    editSection: {
        padding: 16,
    },
    editSectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#000',
        marginBottom: 12,
    },
    editNote: {
        fontSize: 13,
        color: '#999',
        fontStyle: 'italic',
    },
    filterList: {
        marginTop: 8,
    },
    filterItem: {
        alignItems: 'center',
        marginRight: 16,
        padding: 8,
        borderRadius: 8,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    filterItemActive: {
        borderColor: '#0095F6',
    },
    filterPreview: {
        width: 60,
        height: 60,
        borderRadius: 8,
        marginBottom: 4,
    },
    filterName: {
        fontSize: 12,
        color: '#000',
    },
    loadingOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
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
    loadingText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
        marginTop: 16,
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
    // Video edit modal styles
    cancelButton: {
        fontSize: 16,
        color: '#999',
    },
    doneButtonDisabled: {
        opacity: 0.5,
    },
    videoEditPreview: {
        width: '100%',
        height: 250,
        backgroundColor: '#000',
        borderRadius: 12,
        overflow: 'hidden',
        marginBottom: 20,
    },
    videoEditPreviewPlayer: {
        width: '100%',
        height: '100%',
    },
    filterOverlay: {
        position: 'absolute',
        bottom: 10,
        left: 10,
        backgroundColor: 'rgba(0,0,0,0.6)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
    },
    filterOverlayText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '600',
    },
    filterNameActive: {
        color: '#0095F6',
        fontWeight: '600',
    },
    trimControls: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 12,
    },
    trimInput: {
        flex: 1,
    },
    trimLabel: {
        fontSize: 13,
        color: '#666',
        marginBottom: 6,
    },
    trimTextInput: {
        borderWidth: 1,
        borderColor: '#DBDBDB',
        borderRadius: 8,
        padding: 10,
        fontSize: 15,
        color: '#000',
    },
});
