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
    ActivityIndicator,
    Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from '@react-native-async-storage/async-storage';
import CommentTimeText from "../components/CommentTimeText";
import CommentText from "../components/CommentText";
import { getComments, addComment, likeComment, unlikeComment, updateComment, deleteComment } from "../API/Api";

const { height } = Dimensions.get("window");

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

const CommentsModal = ({ visible, onClose, postId, commentsCount, onCommentAdded }) => {
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState("");
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [currentUserId, setCurrentUserId] = useState(null);
    const [editingCommentId, setEditingCommentId] = useState(null);
    const [editingContent, setEditingContent] = useState("");
    const [replyingToCommentId, setReplyingToCommentId] = useState(null);
    const [replyContent, setReplyContent] = useState("");
    const [expandedComments, setExpandedComments] = useState({}); // Track which comments have replies expanded

    // Load current user ID
    useEffect(() => {
        const loadUserId = async () => {
            try {
                const userId = await AsyncStorage.getItem('userId');
                setCurrentUserId(userId ? parseInt(userId) : null);
            } catch (error) {
                console.error('[CommentsModal] Error loading userId:', error);
            }
        };
        loadUserId();
    }, []);

    // Load comments khi modal mở
    useEffect(() => {
        if (visible && postId) {
            loadComments();
        }
    }, [visible, postId]);

    const loadComments = async () => {
        try {
            setLoading(true);
            const response = await getComments(postId);
            console.log('[CommentsModal] API Response:', response);
            
            // Backend trả về { success, comments, totalCount, page, pageSize }
            const data = response.comments || response.Comments || [];
            console.log('[CommentsModal] Loaded comments:', data);
            
            // Map data từ backend về format UI
            const allComments = [];
            
            data.forEach(comment => {
                // Thêm parent comment
                const parentComment = {
                    id: comment.id?.toString() || comment.Id?.toString(),
                    commentId: comment.id || comment.Id,
                    userId: comment.userId || comment.UserId,
                    username: comment.username || comment.Username,
                    avatar: comment.avatarUrl || comment.AvatarUrl || `https://i.pravatar.cc/150?u=${comment.userId || comment.UserId}`,
                    comment: comment.content || comment.Content,
                    likes: comment.likesCount || comment.LikesCount || 0,
                    createdAt: comment.createdAt || comment.CreatedAt,
                    isLiked: comment.isLikedByCurrentUser || comment.IsLikedByCurrentUser || false,
                    isEdited: comment.isEdited || comment.IsEdited || false,
                    parentCommentId: null,
                    repliesCount: comment.repliesCount || comment.RepliesCount || 0,
                };
                allComments.push(parentComment);
                
                // Thêm replies nếu có
                const replies = comment.replies || comment.Replies || [];
                replies.forEach(reply => {
                    const replyComment = {
                        id: reply.id?.toString() || reply.Id?.toString(),
                        commentId: reply.id || reply.Id,
                        userId: reply.userId || reply.UserId,
                        username: reply.username || reply.Username,
                        avatar: reply.avatarUrl || reply.AvatarUrl || `https://i.pravatar.cc/150?u=${reply.userId || reply.UserId}`,
                        comment: reply.content || reply.Content,
                        likes: reply.likesCount || reply.LikesCount || 0,
                        createdAt: reply.createdAt || reply.CreatedAt,
                        isLiked: reply.isLikedByCurrentUser || reply.IsLikedByCurrentUser || false,
                        isEdited: reply.isEdited || reply.IsEdited || false,
                        parentCommentId: parentComment.commentId,
                        repliesCount: 0,
                    };
                    allComments.push(replyComment);
                });
            });
            
            console.log('[CommentsModal] Total comments including replies:', allComments.length);
            setComments(allComments);
        } catch (error) {
            console.error('[CommentsModal] Error loading comments:', error);
            Alert.alert('Lỗi', 'Không thể tải bình luận');
        } finally {
            setLoading(false);
        }
    };

    const handleAddComment = async () => {
        if (newComment.trim()) {
            try {
                const response = await addComment(postId, newComment.trim());
                console.log('[CommentsModal] Add comment response:', response);
                
                // Backend trả về { success, message, comment }
                const result = response.comment || response.Comment;
                
                if (!result) {
                    throw new Error('Không nhận được dữ liệu comment từ server');
                }
                
                // Thêm comment mới vào đầu danh sách
                const newCommentObj = {
                    id: result.id?.toString() || result.Id?.toString(),
                    commentId: result.id || result.Id,
                    userId: result.userId || result.UserId,
                    username: result.username || result.Username,
                    avatar: result.avatarUrl || result.AvatarUrl || `https://i.pravatar.cc/150?u=${result.userId || result.UserId}`,
                    comment: result.content || result.Content,
                    likes: 0,
                    createdAt: result.createdAt || result.CreatedAt,
                    isLiked: false,
                    isEdited: false,
                    parentCommentId: null,
                    repliesCount: 0,
                };
                
                setComments([newCommentObj, ...comments]);
                setNewComment("");
                
                // Notify parent component that a comment was added
                if (onCommentAdded) {
                    onCommentAdded();
                }
            } catch (error) {
                console.error('[CommentsModal] Error adding comment:', error);
                Alert.alert('Lỗi', error.message || 'Không thể đăng bình luận');
            }
        }
    };

    const handleLikeToggle = async (commentId) => {
        try {
            // Tìm comment để biết trạng thái isLiked hiện tại
            const comment = comments.find(c => c.commentId === commentId);
            if (!comment) return;
            
            const wasLiked = comment.isLiked;
            
            // Optimistic update
            setComments((prev) =>
                prev.map((c) =>
                    c.commentId === commentId
                        ? {
                              ...c,
                              isLiked: !c.isLiked,
                              likes: c.isLiked
                                  ? Math.max(0, c.likes - 1)
                                  : c.likes + 1,
                          }
                        : c
                )
            );

            // Call API dựa trên trạng thái hiện tại
            if (wasLiked) {
                // Đang liked -> unlike
                await unlikeComment(commentId);
            } else {
                // Chưa like -> like
                await likeComment(commentId);
            }
        } catch (error) {
            console.error('[CommentsModal] Error toggling like:', error);
            // Revert optimistic update
            setComments((prev) =>
                prev.map((c) =>
                    c.commentId === commentId
                        ? {
                              ...c,
                              isLiked: !c.isLiked,
                              likes: c.isLiked
                                  ? c.likes + 1
                                  : Math.max(0, c.likes - 1),
                          }
                        : c
                )
            );
        }
    };

    const handleEmojiPress = (emoji) => {
        setNewComment((prev) => prev + emoji);
    };

    const toggleRepliesExpanded = (commentId) => {
        setExpandedComments(prev => ({
            ...prev,
            [commentId]: !prev[commentId]
        }));
    };

    const startEditComment = (comment) => {
        setEditingCommentId(comment.commentId);
        setEditingContent(comment.comment);
    };

    const cancelEdit = () => {
        setEditingCommentId(null);
        setEditingContent("");
    };

    const saveEdit = async (commentId) => {
        if (!editingContent.trim()) {
            Alert.alert('Lỗi', 'Nội dung không được để trống');
            return;
        }

        try {
            const response = await updateComment(commentId, editingContent.trim());
            const updatedComment = response.comment || response.Comment;
            
            if (updatedComment) {
                // Update local state with edited flag
                setComments((prev) =>
                    prev.map((c) =>
                        c.commentId === commentId
                            ? { 
                                ...c, 
                                comment: updatedComment.content || updatedComment.Content,
                                isEdited: true
                            }
                            : c
                    )
                );
                cancelEdit();
                Alert.alert('Thành công', 'Đã cập nhật bình luận');
            }
        } catch (error) {
            console.error('[CommentsModal] Error updating comment:', error);
            Alert.alert('Lỗi', error.message || 'Không thể cập nhật bình luận');
        }
    };

    const confirmDeleteComment = (commentId) => {
        Alert.alert(
            'Xóa bình luận',
            'Bạn có chắc chắn muốn xóa bình luận này? Các câu trả lời cũng sẽ bị xóa.',
            [
                { text: 'Hủy', style: 'cancel' },
                {
                    text: 'Xóa',
                    style: 'destructive',
                    onPress: () => handleDeleteComment(commentId),
                },
            ]
        );
    };

    const handleDeleteComment = async (commentId) => {
        try {
            const response = await deleteComment(commentId);
            
            if (response.success) {
                // Remove comment from local state (including replies if it's a parent)
                setComments((prev) => {
                    const commentToDelete = prev.find(c => c.commentId === commentId);
                    if (commentToDelete?.parentCommentId === null) {
                        // Parent comment - remove it and all its replies
                        return prev.filter(c => 
                            c.commentId !== commentId && c.parentCommentId !== commentId
                        );
                    } else {
                        // Reply comment - just remove itself
                        return prev.filter(c => c.commentId !== commentId);
                    }
                });
                
                // Notify parent to update count
                if (onCommentAdded) {
                    // This will trigger re-fetch or decrement
                    onCommentAdded(-1); // Pass negative to indicate deletion
                }
            }
        } catch (error) {
            console.error('[CommentsModal] Error deleting comment:', error);
            Alert.alert('Lỗi', error.message || 'Không thể xóa bình luận');
        }
    };

    const startReply = (comment) => {
        setReplyingToCommentId(comment.commentId);
        setReplyContent("");
    };

    const cancelReply = () => {
        setReplyingToCommentId(null);
        setReplyContent("");
    };

    const handleReply = async (parentCommentId) => {
        if (!replyContent.trim()) {
            Alert.alert('Lỗi', 'Nội dung không được để trống');
            return;
        }

        try {
            // API call with parentCommentId
            const response = await addComment(postId, replyContent.trim(), parentCommentId);
            console.log('[CommentsModal] Add reply response:', response);
            
            const result = response.comment || response.Comment;
            
            if (!result) {
                throw new Error('Không nhận được dữ liệu reply từ server');
            }
            
            // Create new reply object
            const newReply = {
                id: result.id?.toString() || result.Id?.toString(),
                commentId: result.id || result.Id,
                userId: result.userId || result.UserId,
                username: result.username || result.Username,
                avatar: result.avatarUrl || result.AvatarUrl || `https://i.pravatar.cc/150?u=${result.userId || result.UserId}`,
                comment: result.content || result.Content,
                likes: 0,
                createdAt: result.createdAt || result.CreatedAt,
                isLiked: false,
                isEdited: false,
                parentCommentId: parentCommentId,
                repliesCount: 0,
            };
            
            // Add reply to comments list
            setComments(prev => [...prev, newReply]);
            
            // Update parent comment's repliesCount
            setComments(prev => prev.map(c => 
                c.commentId === parentCommentId 
                    ? { ...c, repliesCount: (c.repliesCount || 0) + 1 }
                    : c
            ));
            
            // Auto-expand replies để hiển thị reply vừa gửi
            setExpandedComments(prev => ({
                ...prev,
                [parentCommentId]: true
            }));
            
            // Thu lại reply input NGAY LẬP TỨC
            cancelReply();
            
            // Notify parent
            if (onCommentAdded) {
                onCommentAdded();
            }
        } catch (error) {
            console.error('[CommentsModal] Error adding reply:', error);
            Alert.alert('Lỗi', error.message || 'Không thể đăng trả lời');
        }
    };

    // Group comments: top-level comments with their nested replies
    const getCommentsWithReplies = () => {
        const topLevelComments = comments.filter(c => !c.parentCommentId);
        const result = [];
        
        topLevelComments.forEach(parent => {
            // Add parent comment
            result.push({ ...parent, isReply: false });
            
            // Add its replies
            const replies = comments
                .filter(c => c.parentCommentId === parent.commentId)
                .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)); // Oldest first for replies
            
            replies.forEach(reply => {
                result.push({ ...reply, isReply: true });
            });
        });
        
        return result;
    };

    const renderComment = ({ item }) => {
        const isEditing = editingCommentId === item.commentId;
        const isOwner = currentUserId && item.userId === currentUserId;
        const isReplying = replyingToCommentId === item.commentId;
        const isExpanded = expandedComments[item.commentId];
        
        // Get replies for this parent comment
        const replies = comments.filter(c => c.parentCommentId === item.commentId);

        return (
            <View style={styles.commentItem}>
                <Image source={{ uri: item.avatar }} style={styles.commentAvatar} />

                <View style={styles.commentContent}>
                    {/* Header with username and 3-dot menu */}
                    <View style={styles.commentTopRow}>
                        <Text style={styles.commentUsername}>
                            {item.username}
                        </Text>
                        <CommentTimeText 
                            createdAt={item.createdAt} 
                            style={styles.commentTime} 
                        />
                        {item.isEdited && (
                            <Text style={styles.editedLabel}> • Đã chỉnh sửa</Text>
                        )}
                        <View style={{ flex: 1 }} />
                        {/* 3-dot menu - NGOÀI BUBBLE */}
                        {isOwner && !isEditing && (
                            <TouchableOpacity
                                style={styles.moreButton}
                                onPress={() => {
                                    Alert.alert(
                                        'Tùy chọn',
                                        'Chọn hành động',
                                        [
                                            { text: 'Hủy', style: 'cancel' },
                                            {
                                                text: 'Chỉnh sửa',
                                                onPress: () => startEditComment(item),
                                            },
                                            {
                                                text: 'Xóa',
                                                style: 'destructive',
                                                onPress: () => confirmDeleteComment(item.commentId),
                                            },
                                        ]
                                    );
                                }}
                            >
                                <Ionicons name="ellipsis-horizontal" size={20} color="#262626" />
                            </TouchableOpacity>
                        )}
                    </View>
                    
                    {/* Comment Bubble */}
                    <View style={styles.commentBubble}>
                        
                        {isEditing ? (
                            <View style={styles.editContainer}>
                                <TextInput
                                    style={styles.editInput}
                                    value={editingContent}
                                    onChangeText={setEditingContent}
                                    multiline
                                    autoFocus
                                />
                                <View style={styles.editButtons}>
                                    <TouchableOpacity 
                                        style={[styles.editButton, styles.cancelButton]}
                                        onPress={cancelEdit}
                                    >
                                        <Text style={styles.cancelButtonText}>Hủy</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity 
                                        style={[styles.editButton, styles.saveButton]}
                                        onPress={() => saveEdit(item.commentId)}
                                    >
                                        <Text style={styles.saveButtonText}>Lưu</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ) : (
                            <CommentText 
                                content={item.comment} 
                                style={styles.commentText}
                            />
                        )}
                    </View>

                    <View style={styles.commentActions}>
                        {/* Like button */}
                        <TouchableOpacity
                            style={styles.likeButtonInActions}
                            onPress={() => handleLikeToggle(item.commentId)}
                        >
                            <HeartIcon isLiked={item.isLiked} size={16} />
                            {item.likes > 0 && (
                                <Text style={styles.likeCountText}>{item.likes}</Text>
                            )}
                        </TouchableOpacity>
                        
                        {/* Reply button */}
                        <TouchableOpacity onPress={() => startReply(item)}>
                            <Text style={styles.commentAction}>Trả lời</Text>
                        </TouchableOpacity>
                    </View>
                    
                    {/* View replies button - CHỈ HIỆN KHI CHƯA EXPAND */}
                    {replies.length > 0 && !isExpanded && (
                        <TouchableOpacity
                            style={styles.viewRepliesButton}
                            onPress={() => toggleRepliesExpanded(item.commentId)}
                        >
                            <View style={styles.viewRepliesLine} />
                            <Text style={styles.viewRepliesText}>
                                Xem {replies.length} câu trả lời
                            </Text>
                        </TouchableOpacity>
                    )}
                    
                    {/* Expanded Replies */}
                    {isExpanded && replies.length > 0 && (
                        <View style={styles.repliesContainer}>
                            {replies.map((reply) => {
                                const isReplyOwner = currentUserId && reply.userId === currentUserId;
                                const isEditingReply = editingCommentId === reply.commentId;
                                
                                return (
                                    <View key={reply.commentId} style={styles.replyItem}>
                                        <Image source={{ uri: reply.avatar }} style={styles.replyAvatar} />
                                        
                                        <View style={styles.replyContent}>
                                            <View style={styles.commentBubble}>
                                                <View style={styles.commentHeader}>
                                                    <View style={styles.commentHeaderRow}>
                                                        <Text style={styles.commentUsername}>
                                                            {reply.username}
                                                        </Text>
                                                        <CommentTimeText 
                                                            createdAt={reply.createdAt} 
                                                            style={styles.commentTime} 
                                                        />
                                                        {reply.isEdited && (
                                                            <Text style={styles.editedLabel}> • Đã chỉnh sửa</Text>
                                                        )}
                                                    </View>
                                                    
                                                    {isReplyOwner && !isEditingReply && (
                                                        <TouchableOpacity
                                                            style={styles.moreButtonInHeader}
                                                            onPress={() => {
                                                                Alert.alert(
                                                                    'Tùy chọn',
                                                                    'Chọn hành động',
                                                                    [
                                                                        { text: 'Hủy', style: 'cancel' },
                                                                        {
                                                                            text: 'Chỉnh sửa',
                                                                            onPress: () => startEditComment(reply),
                                                                        },
                                                                        {
                                                                            text: 'Xóa',
                                                                            style: 'destructive',
                                                                            onPress: () => confirmDeleteComment(reply.commentId),
                                                                        },
                                                                    ]
                                                                );
                                                            }}
                                                        >
                                                            <Ionicons name="ellipsis-horizontal" size={18} color="#8E8E8E" />
                                                        </TouchableOpacity>
                                                    )}
                                                </View>
                                                
                                                {isEditingReply ? (
                                                    <View style={styles.editContainer}>
                                                        <TextInput
                                                            style={styles.editInput}
                                                            value={editingContent}
                                                            onChangeText={setEditingContent}
                                                            multiline
                                                            autoFocus
                                                        />
                                                        <View style={styles.editButtons}>
                                                            <TouchableOpacity 
                                                                style={[styles.editButton, styles.cancelButton]}
                                                                onPress={cancelEdit}
                                                            >
                                                                <Text style={styles.cancelButtonText}>Hủy</Text>
                                                            </TouchableOpacity>
                                                            <TouchableOpacity 
                                                                style={[styles.editButton, styles.saveButton]}
                                                                onPress={() => saveEdit(reply.commentId)}
                                                            >
                                                                <Text style={styles.saveButtonText}>Lưu</Text>
                                                            </TouchableOpacity>
                                                        </View>
                                                    </View>
                                                ) : (
                                                    <Text style={styles.commentText}>{reply.comment}</Text>
                                                )}
                                            </View>
                                            
                                            <View style={styles.commentActions}>
                                                <TouchableOpacity
                                                    style={styles.likeButtonInActions}
                                                    onPress={() => handleLikeToggle(reply.commentId)}
                                                >
                                                    <HeartIcon isLiked={reply.isLiked} size={16} />
                                                    {reply.likes > 0 && (
                                                        <Text style={styles.likeCountText}>{reply.likes}</Text>
                                                    )}
                                                </TouchableOpacity>
                                                
                                                <TouchableOpacity onPress={() => startReply(item)}>
                                                    <Text style={styles.commentAction}>Trả lời</Text>
                                                </TouchableOpacity>
                                            </View>
                                        </View>
                                    </View>
                                );
                            })}
                            
                            {/* Hide replies button - Ở DƯỚI CÙNG */}
                            <TouchableOpacity
                                style={styles.hideRepliesButton}
                                onPress={() => toggleRepliesExpanded(item.commentId)}
                            >
                                <View style={styles.viewRepliesLine} />
                                <Text style={styles.hideRepliesText}>
                                    Ẩn câu trả lời
                                </Text>
                            </TouchableOpacity>
                        </View>
                    )}
                    
                    {/* Reply Input (chỉ hiện khi đang reply comment này) */}
                    {isReplying && (
                        <View style={styles.replyInputContainer}>
                            <TextInput
                                style={styles.replyInput}
                                value={replyContent}
                                onChangeText={setReplyContent}
                                placeholder={`Trả lời ${item.username}...`}
                                multiline
                                autoFocus
                            />
                            <View style={styles.replyButtons}>
                                <TouchableOpacity 
                                    style={[styles.replyButton, styles.cancelButton]}
                                    onPress={cancelReply}
                                >
                                    <Text style={styles.cancelButtonText}>Hủy</Text>
                                </TouchableOpacity>
                                <TouchableOpacity 
                                    style={[styles.replyButton, styles.saveButton]}
                                    onPress={() => handleReply(item.commentId)}
                                >
                                    <Text style={styles.saveButtonText}>Gửi</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}
                </View>
            </View>
        );
    };

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
                        <Text style={styles.modalTitle}>
                            Bình luận {comments.length > 0 ? `(${comments.length})` : ''}
                        </Text>
                    </View>

                    {/* Loading indicator */}
                    {loading && comments.length === 0 && (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="large" color="#0095f6" />
                            <Text style={styles.loadingText}>Đang tải bình luận...</Text>
                        </View>
                    )}

                    {/* Empty state */}
                    {!loading && comments.length === 0 && (
                        <View style={styles.emptyContainer}>
                            <Ionicons name="chatbubble-outline" size={48} color="#999" />
                            <Text style={styles.emptyText}>Chưa có bình luận</Text>
                            <Text style={styles.emptySubtext}>Hãy là người đầu tiên bình luận!</Text>
                        </View>
                    )}

                    {/* Comments List */}
                    {comments.length > 0 && (
                        <FlatList
                            data={comments.filter(c => !c.parentCommentId)}
                            renderItem={renderComment}
                            keyExtractor={(item) => item.commentId}
                            contentContainerStyle={styles.commentsList}
                            showsVerticalScrollIndicator={false}
                        />
                    )}
                    
                    {/* Emoji Bar */}
                    <View style={styles.emojiBar}>
                        {['❤️', '🙏', '🔥', '👏', '😢', '😍', '😮', '😂'].map((emoji, index) => (
                            <TouchableOpacity
                                key={index}
                                style={styles.emojiButton}
                                onPress={() => handleEmojiPress(emoji)}
                            >
                                <Text style={styles.emoji}>{emoji}</Text>
                            </TouchableOpacity>
                        ))}
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
                            placeholder="Bình luận cho sontungmtp"
                            placeholderTextColor="#999"
                            value={newComment}
                            onChangeText={setNewComment}
                            multiline
                        />
                        <TouchableOpacity style={styles.gifButton}>
                            <Text style={styles.gifButtonText}>GIF</Text>
                        </TouchableOpacity>
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
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingVertical: 60,
    },
    loadingText: {
        marginTop: 16,
        fontSize: 14,
        color: "#8E8E8E",
    },
    emptyContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingVertical: 60,
    },
    emptyText: {
        marginTop: 16,
        fontSize: 16,
        fontWeight: "600",
        color: "#262626",
    },
    emptySubtext: {
        marginTop: 8,
        fontSize: 14,
        color: "#8E8E8E",
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
    replyCommentItem: {
        marginLeft: 44, // Indent replies to the right
        paddingLeft: 12,
        borderLeftWidth: 2,
        borderLeftColor: "#E0E0E0",
        backgroundColor: "#FAFAFA",
    },
    repliesCountText: {
        fontSize: 12,
        color: "#0095F6",
        fontWeight: "500",
    },
    replyInputContainer: {
        marginTop: 8,
        marginLeft: 0,
        padding: 12,
        backgroundColor: "#FFFFFF",
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#0095F6",
        shadowColor: "#0095F6",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    replyInput: {
        fontSize: 14,
        color: "#000000",
        minHeight: 60,
        maxHeight: 120,
        textAlignVertical: "top",
        padding: 0,
        marginBottom: 8,
    },
    replyButtons: {
        flexDirection: "row",
        justifyContent: "flex-end",
        gap: 8,
    },
    replyButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
        minWidth: 70,
        alignItems: "center",
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
    commentHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
        marginBottom: 4,
    },
    commentHeaderRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        flex: 1,
    },
    moreButtonInHeader: {
        padding: 4,
        marginLeft: 8,
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
    editedLabel: {
        fontSize: 11,
        color: "#8E8E8E",
        fontStyle: "italic",
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
        alignItems: "center",
        gap: 16,
    },
    likeButtonInActions: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
    },
    likeCountText: {
        fontSize: 12,
        color: "#8E8E8E",
        fontWeight: "500",
    },
    commentAction: {
        fontSize: 12,
        color: "#8E8E8E",
        fontWeight: "500",
    },
    repliesCountText: {
        fontSize: 12,
        color: "#0095F6",
        fontWeight: "500",
    },
    editContainer: {
        marginTop: 8,
    },
    editInput: {
        backgroundColor: "#FFFFFF",
        borderRadius: 8,
        borderWidth: 1,
        borderColor: "#0095F6",
        padding: 10,
        fontSize: 14,
        color: "#000000",
        minHeight: 60,
        maxHeight: 120,
        textAlignVertical: "top",
        marginBottom: 8,
    },
    editButtons: {
        flexDirection: "row",
        justifyContent: "flex-end",
        gap: 8,
    },
    editButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
        minWidth: 70,
        alignItems: "center",
    },
    cancelButton: {
        backgroundColor: "#F0F0F0",
    },
    saveButton: {
        backgroundColor: "#0095F6",
    },
    cancelButtonText: {
        fontSize: 14,
        fontWeight: "600",
        color: "#262626",
    },
    saveButtonText: {
        fontSize: 14,
        fontWeight: "600",
        color: "#FFFFFF",
    },
    // Input
    inputContainer: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 12,
        paddingBottom: Platform.OS === "ios" ? 20 : 12,
        borderTopWidth: 0.5,
        borderTopColor: "#DBDBDB",
        backgroundColor: "#FFFFFF",
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
    gifButton: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderWidth: 1,
        borderColor: "#DBDBDB",
        borderRadius: 6,
        marginLeft: 8,
    },
    gifButtonText: {
        fontSize: 13,
        color: "#262626",
        fontWeight: "600",
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
    // Emoji Bar
    emojiBar: {
        flexDirection: "row",
        justifyContent: "space-around",
        alignItems: "center",
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderTopWidth: 0.5,
        borderTopColor: "#DBDBDB",
        backgroundColor: "#FFFFFF",
    },
    emojiButton: {
        padding: 4,
    },
    emoji: {
        fontSize: 24,
    },
    // View/Hide Replies Button
    viewRepliesButton: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: 8,
        marginLeft: 12,
        gap: 8,
    },
    viewRepliesLine: {
        width: 24,
        height: 1,
        backgroundColor: "#8E8E8E",
    },
    viewRepliesText: {
        fontSize: 12,
        color: "#8E8E8E",
        fontWeight: "500",
    },
    // Hide Replies Button (ở cuối danh sách)
    hideRepliesButton: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: 12,
        marginLeft: 44, // Thụt vào như replies
        gap: 8,
    },
    hideRepliesText: {
        fontSize: 12,
        color: "#8E8E8E",
        fontWeight: "500",
    },
    // Replies Container
    repliesContainer: {
        marginTop: 12,
        marginLeft: 0,
    },
    replyItem: {
        flexDirection: "row",
        paddingVertical: 6,
        paddingLeft: 12,
        marginLeft: 32,
        alignItems: "flex-start",
    },
    replyAvatar: {
        width: 28,
        height: 28,
        borderRadius: 14,
        marginRight: 10,
    },
    replyContent: {
        flex: 1,
    },
});

export default CommentsModal;
