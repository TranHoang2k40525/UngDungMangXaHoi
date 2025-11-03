// CommentsModal.js
import React, { useState, useRef, useEffect } from "react";
import {
    View,
    Text,
    Image,
    TouchableOpacity,
    StyleSheet,
    Modal,
    TextInput,
    FlatList,
    KeyboardAvoidingView,
    Platform,
    Dimensions,
    Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

const { height } = Dimensions.get("window");

// Dữ liệu comments mẫu
const initialComments = [
    {
        id: "1",
        username: "ahsun_abbas",
        avatar: "https://i.pravatar.cc/150?img=1",
        comment: "AI button 👏👏😂😂",
        likes: 425,
        time: "2 ngày",
        isLiked: false,
    },
    {
        id: "2",
        username: "selcukfei",
        avatar: "https://i.pravatar.cc/150?img=2",
        comment: "is Real or Madrid",
        likes: 112,
        time: "1 ngày",
        isLiked: false,
    },
    {
        id: "3",
        username: "aikalaakari",
        avatar: "https://i.pravatar.cc/150?img=3",
        comment: "@selcukfei that answer is really messi",
        likes: 81,
        time: "1 ngày",
        isReply: true,
        isLiked: false,
    },
    {
        id: "4",
        username: "shrinibaskhuntia",
        avatar: "https://i.pravatar.cc/150?img=4",
        comment: "👏👏😢😢😢😢",
        likes: 11,
        time: "1 ngày",
        isLiked: false,
    },
    {
        id: "5",
        username: "hamidnezaam",
        avatar: "https://i.pravatar.cc/150?img=5",
        comment: "Ai",
        likes: 0,
        time: "1 ngày",
        isLiked: false,
    },
];

// HeartIcon dùng Ionicons + Animated scale khi thay đổi trạng thái like
const HeartIcon = ({ isLiked, size = 20 }) => {
    const scale = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        // khi isLiked chuyển từ false -> true: chơi animation pop
        // khi unlike thì chơi nhẹ animation về lại
        Animated.sequence([
            Animated.timing(scale, {
                toValue: isLiked ? 1.3 : 0.95,
                duration: 120,
                useNativeDriver: true,
            }),
            Animated.timing(scale, {
                toValue: 1,
                duration: 120,
                useNativeDriver: true,
            }),
        ]).start();
    }, [isLiked, scale]);

    const color = isLiked ? "#FF3040" : "#262626";
    const name = isLiked ? "heart" : "heart-outline";

    return (
        <Animated.View style={{ transform: [{ scale }] }}>
            <Ionicons name={name} size={size} color={color} />
        </Animated.View>
    );
};

const CommentsModal = ({ visible, onClose, commentsCount }) => {
    const [comments, setComments] = useState(initialComments);
    const [newComment, setNewComment] = useState("");

    const handleAddComment = () => {
        if (newComment.trim()) {
            const comment = {
                id: Date.now().toString(),
                username: "your_username",
                avatar: "https://i.pravatar.cc/150?img=9",
                comment: newComment,
                likes: 0,
                time: "Vừa xong",
                isLiked: false,
            };
            setComments([comment, ...comments]);
            setNewComment("");
        }
    };

    const handleLikeToggle = (id) => {
        setComments((prev) =>
            prev.map((comment) =>
                comment.id === id
                    ? {
                          ...comment,
                          isLiked: !comment.isLiked,
                          likes: comment.isLiked
                              ? Math.max(0, comment.likes - 1)
                              : comment.likes + 1,
                      }
                    : comment
            )
        );
    };

    const handleEmojiPress = (emoji) => {
        setNewComment((prev) => prev + emoji);
    };

    const renderComment = ({ item }) => (
        <View style={styles.commentItem}>
            <Image source={{ uri: item.avatar }} style={styles.commentAvatar} />

            <View style={styles.commentContent}>
                <View style={styles.commentBubble}>
                    <View style={styles.commentHeaderRow}>
                        <Text style={styles.commentUsername}>
                            {item.username}
                        </Text>
                        <Text style={styles.commentTime}>{item.time}</Text>
                    </View>
                    <Text style={styles.commentText}>{item.comment}</Text>
                </View>

                <View style={styles.commentActions}>
                    <TouchableOpacity>
                        <Text style={styles.commentAction}>Trả lời</Text>
                    </TouchableOpacity>
                    {item.likes > 0 && (
                        <TouchableOpacity>
                            <Text style={styles.commentAction}>
                                Xem bản dịch
                            </Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            <TouchableOpacity
                style={styles.likeButton}
                onPress={() => handleLikeToggle(item.id)}
            >
                <HeartIcon isLiked={item.isLiked} size={20} />
                {item.likes > 0 && (
                    <Text style={styles.likeCount}>{item.likes}</Text>
                )}
            </TouchableOpacity>
        </View>
    );

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={onClose}
        >
            <TouchableOpacity
                style={styles.modalOverlay}
                activeOpacity={1}
                onPress={onClose}
            >
                <TouchableOpacity style={styles.modalContent} activeOpacity={1}>
                    {/* Header */}
                    <View style={styles.modalHeader}>
                        <View style={styles.modalHandle} />
                        <Text style={styles.modalTitle}>Bình luận</Text>
                    </View>

                    {/* Comments List */}
                    <FlatList
                        data={comments}
                        renderItem={renderComment}
                        keyExtractor={(item) => item.id}
                        contentContainerStyle={styles.commentsList}
                        showsVerticalScrollIndicator={false}
                    />

                    {/* Emoji Bar */}
                    <View style={styles.emojiBar}>
                        <TouchableOpacity
                            onPress={() => handleEmojiPress("❤️")}
                            style={styles.emojiButton}
                        >
                            <Text style={styles.emoji}>❤️</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => handleEmojiPress("🙏")}
                            style={styles.emojiButton}
                        >
                            <Text style={styles.emoji}>🙏</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => handleEmojiPress("🔥")}
                            style={styles.emojiButton}
                        >
                            <Text style={styles.emoji}>🔥</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => handleEmojiPress("👏")}
                            style={styles.emojiButton}
                        >
                            <Text style={styles.emoji}>👏</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => handleEmojiPress("😢")}
                            style={styles.emojiButton}
                        >
                            <Text style={styles.emoji}>😢</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => handleEmojiPress("😍")}
                            style={styles.emojiButton}
                        >
                            <Text style={styles.emoji}>😍</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => handleEmojiPress("😮")}
                            style={styles.emojiButton}
                        >
                            <Text style={styles.emoji}>😮</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => handleEmojiPress("😂")}
                            style={styles.emojiButton}
                        >
                            <Text style={styles.emoji}>😂</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Input */}
                    <KeyboardAvoidingView
                        behavior={Platform.OS === "ios" ? "padding" : "height"}
                        style={styles.inputContainer}
                    >
                        <Image
                            source={{ uri: "https://i.pravatar.cc/150?img=9" }}
                            style={styles.inputAvatar}
                        />
                        <TextInput
                            style={styles.input}
                            placeholder="Bắt đầu trò chuyện..."
                            placeholderTextColor="#999"
                            value={newComment}
                            onChangeText={setNewComment}
                            multiline
                        />
                        {newComment.trim().length > 0 && (
                            <TouchableOpacity
                                onPress={handleAddComment}
                                style={styles.sendButton}
                            >
                                <Text style={styles.sendButtonText}>Gửi</Text>
                            </TouchableOpacity>
                        )}
                    </KeyboardAvoidingView>
                </TouchableOpacity>
            </TouchableOpacity>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        justifyContent: "flex-end",
    },
    modalContent: {
        backgroundColor: "#FFFFFF",
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: height * 0.85,
        paddingBottom: 0,
    },
    modalHeader: {
        alignItems: "center",
        paddingVertical: 12,
        borderBottomWidth: 0.5,
        borderBottomColor: "#DBDBDB",
    },
    modalHandle: {
        width: 40,
        height: 4,
        backgroundColor: "#DBDBDB",
        borderRadius: 2,
        marginBottom: 8,
    },
    modalTitle: {
        fontSize: 16,
        fontWeight: "600",
        color: "#000000",
    },
    commentsList: {
        paddingVertical: 12,
        paddingBottom: 8,
    },
    commentItem: {
        flexDirection: "row",
        paddingHorizontal: 16,
        paddingVertical: 8,
        alignItems: "flex-start",
    },
    commentAvatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        marginRight: 12,
    },
    commentContent: {
        flex: 1,
    },
    commentBubble: {
        backgroundColor: "#F0F0F0",
        borderRadius: 16,
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    commentHeaderRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 4,
    },
    commentUsername: {
        fontSize: 13,
        fontWeight: "600",
        color: "#000000",
    },
    commentTime: {
        fontSize: 11,
        color: "#8E8E8E",
    },
    commentText: {
        fontSize: 14,
        color: "#000000",
        lineHeight: 18,
        marginTop: 2,
    },
    commentActions: {
        flexDirection: "row",
        marginTop: 6,
        marginLeft: 12,
        gap: 16,
    },
    commentAction: {
        fontSize: 12,
        color: "#8E8E8E",
        fontWeight: "500",
    },
    likeButton: {
        alignItems: "center",
        marginLeft: 8,
        paddingTop: 2,
        width: 44,
    },
    likeCount: {
        fontSize: 11,
        color: "#8E8E8E",
        marginTop: 4,
        fontWeight: "500",
    },
    // Emoji & Input
    emojiBar: {
        flexDirection: "row",
        justifyContent: "space-around",
        alignItems: "center",
        paddingVertical: 14,
        paddingHorizontal: 12,
        borderTopWidth: 0.5,
        borderTopColor: "#DBDBDB",
        backgroundColor: "#FFFFFF",
    },
    emojiButton: {
        padding: 4,
    },
    emoji: {
        fontSize: 26,
    },
    inputContainer: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 16,
        paddingBottom: Platform.OS === "ios" ? 20 : 16,
        borderTopWidth: 0.5,
        borderTopColor: "#DBDBDB",
        backgroundColor: "#FFFFFF",
        minHeight: 64,
    },
    inputAvatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        marginRight: 12,
    },
    input: {
        flex: 1,
        fontSize: 15,
        color: "#000000",
        maxHeight: 80,
        paddingVertical: 8,
        paddingHorizontal: 0,
    },
    sendButton: {
        marginLeft: 8,
        paddingHorizontal: 12,
        paddingVertical: 6,
    },
    sendButtonText: {
        fontSize: 15,
        color: "#0095F6",
        fontWeight: "600",
    },
});

export default CommentsModal;
