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
    RefreshControl,
    Alert,
    ActionSheetIOS,
    TouchableWithoutFeedback,
    Keyboard,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import MentionText from "../Components/MentionText";
import { getComments, addComment, addCommentReaction, removeCommentReaction, deleteComment, updateComment, getUserByUsername, API_BASE_URL } from "../API/Api";
import commentService from "../ServicesSingalR/commentService";

const { height } = Dimensions.get("window");

// Helper function: Convert đường dẫn avatar tương đối thành URL đầy đủ
// Giống như Home.js xử lý media URL
const getAvatarUrl = (avatarPath) => {
    if (!avatarPath || avatarPath.trim() === '') return null;
    
    // Nếu đã là URL đầy đủ (http/https), return luôn
    if (avatarPath.startsWith('http://') || avatarPath.startsWith('https://')) {
        return avatarPath;
    }
    
    // Nếu là đường dẫn tương đối từ backend, nối với API_BASE_URL
    const cleanPath = avatarPath.startsWith('/') ? avatarPath : `/${avatarPath}`;
    return `${API_BASE_URL}${cleanPath}`;
};

// Helper function: Hiển thị thời gian tương đối
// Bước 1: Xử lý timezone từ backend (giữ nguyên logic cũ)
// Bước 2: Tính thời gian tồn tại = Thời gian hiện tại - Thời gian đã xử lý
const formatVietnameseTime = (timestamp) => {
    if (!timestamp) return '';
    
    try {
        // BƯỚC 1: XỬ LÝ TIMEZONE TỪ BACKEND (GIỮ NGUYÊN LOGIC CŨ)
        // Parse timestamp từ backend
        let date = new Date(timestamp);
        
        // Kiểm tra valid date
        if (isNaN(date.getTime())) {
            console.warn('[formatVietnameseTime] Invalid timestamp:', timestamp);
            return '';
        }
        
        // Kiểm tra xem có phải UTC không (có chữ Z ở cuối)
        const isUTC = typeof timestamp === 'string' && timestamp.endsWith('Z');
        
        // Xử lý timezone: Convert về múi giờ Việt Nam (UTC+7)
        let vietnamCommentTime;
        if (!isUTC) {
            // KHÔNG có Z → cộng 7 tiếng
            vietnamCommentTime = new Date(date.getTime() + (7 * 60 * 60 * 1000));
            console.log('[formatVietnameseTime] No Z, added 7 hours:', timestamp, '→', vietnamCommentTime.toISOString());
        } else {
            // CÓ Z → JavaScript đã convert, dùng luôn
            vietnamCommentTime = date;
            console.log('[formatVietnameseTime] Has Z (UTC), use as-is:', timestamp);
        }
        
        // BƯỚC 2: TÍNH THỜI GIAN TỒN TẠI
        // Lấy thời gian hiện tại
        const now = new Date();
        
        // Tính khoảng cách thời gian (milliseconds)
        // Công thức: Thời gian hiện tại - Thời gian comment đã xử lý
        const diffMs = now.getTime() - vietnamCommentTime.getTime();
        
        // Debug log
        console.log('[formatVietnameseTime] Time calculation:', {
            input: timestamp,
            commentTimeVN: vietnamCommentTime.toISOString(),
            nowTime: now.toISOString(),
            diffMs: diffMs,
            diffSeconds: Math.floor(diffMs / 1000)
        });
        
        // Nếu thời gian âm (comment trong tương lai), hiển thị "vừa xong"
        if (diffMs < 0) {
            return 'vừa xong';
        }
        
        // Chuyển đổi sang các đơn vị thời gian
        const seconds = Math.floor(diffMs / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
        const weeks = Math.floor(days / 7);
        const months = Math.floor(days / 30);
        const years = Math.floor(days / 365);
        
        // Hiển thị theo đơn vị phù hợp
        // < 5 giây → "vừa xong"
        if (seconds < 5) {
            return 'vừa xong';
        }
        // < 60 giây → "X giây trước"
        else if (seconds < 60) {
            return `${seconds} giây trước`;
        }
        // < 60 phút → "X phút trước"
        else if (minutes < 60) {
            return `${minutes} phút trước`;
        }
        // < 24 giờ → "X giờ trước"
        else if (hours < 24) {
            return `${hours} giờ trước`;
        }
        // < 7 ngày → "X ngày trước"
        else if (days < 7) {
            return `${days} ngày trước`;
        }
        // < 30 ngày (4 tuần) → "X tuần trước"
        else if (days < 30) {
            return `${weeks} tuần trước`;
        }
        // < 365 ngày (12 tháng) → "X tháng trước"
        else if (days < 365) {
            return `${months} tháng trước`;
        }
        // >= 365 ngày → "X năm trước"
        else {
            return `${years} năm trước`;
        }
    } catch (error) {
        console.warn('[formatVietnameseTime] Error formatting time:', error);
        return '';
    }
};

// Component avatar với fallback icon
// Hiển thị ảnh nếu có URL, hoặc icon mặc định nếu không có
const UserAvatar = ({ uri, style }) => {
    const fullAvatarUrl = getAvatarUrl(uri);
    
    if (fullAvatarUrl) {
        return (
            <Image 
                source={{ uri: fullAvatarUrl }} 
                style={style}
                onError={(e) => {
                    console.warn('[UserAvatar] Failed to load image:', fullAvatarUrl);
                }}
            />
        );
    }
    
    // Icon mặc định nếu không có avatar
    return (
        <View style={[style, styles.defaultAvatarContainer]}>
            <Ionicons name="person-circle-outline" size={style.width || 32} color="#DBDBDB" />
        </View>
    );
};

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

const CommentsModal = ({ visible, onClose, postId, navigation, onCommentAdded }) => {
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState("");
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [keyboardHeight, setKeyboardHeight] = useState(0);
    
    // State cho currentUserId - User đang đăng nhập
    const [currentUserId, setCurrentUserId] = useState(null);
    const [currentUserAvatar, setCurrentUserAvatar] = useState(null);
    
    // States cho reply và edit
    const [replyingTo, setReplyingTo] = useState(null); // { id, username }
    const [editingComment, setEditingComment] = useState(null); // { id, text }
    const [expandedComments, setExpandedComments] = useState({}); // { commentId: true/false }
    const [showMenuForComment, setShowMenuForComment] = useState(null); // ID của comment đang show menu
    
    // State cho filter comments: 'recent' hoặc 'all'
    const [commentFilter, setCommentFilter] = useState('recent'); // Mặc định là bình luận mới nhất
    
    const inputRef = useRef(null);
    const flatListRef = useRef(null);

    // Load current user từ AsyncStorage (giống Home.js)
    useEffect(() => {
        const loadCurrentUser = async () => {
            try {
                const userStr = await AsyncStorage.getItem('userInfo');
                console.log('[CommentsModal] 📱 AsyncStorage userInfo raw:', userStr);
                
                if (userStr) {
                    const user = JSON.parse(userStr);
                    console.log('[CommentsModal] 👤 Parsed user object:', JSON.stringify(user, null, 2));
                    
                    // Backend trả về UserProfileDto có 2 fields: UserId và AccountId
                    // Cần lấy UserId để so sánh với comment.userId
                    const raw = user?.UserId ?? user?.userId ?? user?.user_id ?? user?.id ?? null;
                    const uidNum = raw != null ? Number(raw) : null;
                    
                    console.log('[CommentsModal] 🔑 UserId extraction:', {
                        UserId: user?.UserId,
                        userId: user?.userId,
                        user_id: user?.user_id,
                        id: user?.id,
                        raw: raw,
                        uidNum: uidNum,
                        isFinite: Number.isFinite(uidNum)
                    });
                    
                    if (Number.isFinite(uidNum)) {
                        setCurrentUserId(uidNum);
                        console.log('[CommentsModal] ✅ Current user loaded:', uidNum);
                        
                        // Lấy avatar của user hiện tại
                        const avatar = user?.AvatarUrl || user?.avatarUrl || user?.avatar_url || user?.Avatar || null;
                        setCurrentUserAvatar(avatar);
                        console.log('[CommentsModal] 🖼️ Current user avatar:', avatar);
                    } else {
                        console.warn('[CommentsModal] ⚠️ Could not extract valid userId from userInfo');
                    }
                } else {
                    console.warn('[CommentsModal]  No userInfo found in AsyncStorage');
                }
            } catch (error) {
                console.error('[CommentsModal]  Error loading user:', error);
            }
        };
        loadCurrentUser();
    }, []);

    // Load comments từ API khi modal mở
    useEffect(() => {
        if (visible && postId) {
            loadComments();
        }
    }, [visible, postId]);

    // Kết nối SignalR và đăng ký các handler khi modal mở để nhận realtime comments
    useEffect(() => {
        let joined = false;
        if (visible && postId) {
            (async () => {
                try {
                    await commentService.connectRealtime();
                    await commentService.joinPostRoom(postId);
                    joined = true;

                    // Handlers
                    commentService.onReceiveComment((c) => {
                        try {
                            const mapped = mapServerCommentToUI(c);
                            setComments(prev => {
                                // Avoid duplicates
                                if (prev.find(x => x.id === String(mapped.id))) return prev;
                                return [mapped, ...prev];
                            });
                        } catch (e) { console.error('[CommentsModal] onReceiveComment handler error', e); }
                    });

                    commentService.onCommentUpdated((c) => {
                        try {
                            const mapped = mapServerCommentToUI(c);
                            setComments(prev => prev.map(item => item.id === String(mapped.id) ? mapped : item));
                        } catch (e) { console.error('[CommentsModal] onCommentUpdated handler error', e); }
                    });

                    commentService.onCommentDeleted((payload) => {
                        try {
                            const cid = payload?.commentId ?? payload;
                            const idStr = String(cid);
                            setComments(prev => prev.filter(c => c.id !== idStr));
                        } catch (e) { console.error('[CommentsModal] onCommentDeleted handler error', e); }
                    });

                    commentService.onCommentReplyAdded((payload) => {
                        try {
                            const reply = payload?.replyComment ?? payload;
                            const mapped = mapServerCommentToUI(reply);
                            setComments(prev => {
                                if (prev.find(x => x.id === String(mapped.id))) return prev;
                                return [mapped, ...prev];
                            });
                        } catch (e) { console.error('[CommentsModal] onCommentReplyAdded handler error', e); }
                    });
                } catch (error) {
                    console.error('[CommentsModal] SignalR connect/join error', error);
                }
            })();
        }

        return () => {
            (async () => {
                try {
                    if (joined) await commentService.leavePostRoom(postId);
                } catch (e) { /* ignore */ }
                try { commentService.removeAllListeners(); } catch (e) { /* ignore */ }
            })();
        };
    }, [visible, postId]);

    // Helper: map server CommentDto to UI comment format (same mapping used in loadComments)
    const mapServerCommentToUI = (c) => {
        const userIdNum = c.userId != null ? Number(c.userId) : null;
        return {
            id: String(c.commentId),
            userId: Number.isFinite(userIdNum) ? userIdNum : null,
            username: c.username || "Người dùng",
            avatar: c.userAvatar,
            comment: c.content || "",
            likes: Number(c.likesCount) || 0,
            createdAt: c.createdAt,
            isLiked: Boolean(c.isLiked),
            isEdited: Boolean(c.isEdited),
            parentId: c.parentCommentId ? String(c.parentCommentId) : null,
        };
    };

    // Keyboard event listeners để điều chỉnh layout
    useEffect(() => {
        const keyboardWillShow = Keyboard.addListener(
            Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
            (e) => {
                setKeyboardHeight(e.endCoordinates.height);
            }
        );
        const keyboardWillHide = Keyboard.addListener(
            Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
            () => {
                setKeyboardHeight(0);
            }
        );

        return () => {
            keyboardWillShow.remove();
            keyboardWillHide.remove();
        };
    }, []);

    const loadComments = async (isRefreshing = false) => {
        try {
            if (isRefreshing) {
                setRefreshing(true);
            } else {
                setLoading(true);
            }
            
            console.log('[CommentsModal]  Loading comments for postId:', postId);
            const response = await getComments(postId);
            console.log('[CommentsModal]  API Response:', JSON.stringify(response, null, 2));
            
            // Backend trả về: { comments: [...], total, page, pageSize }
            const commentsData = response?.comments || [];
            console.log('[CommentsModal]  Comments count:', commentsData.length);
            
            // DEBUG: Log toàn bộ raw data từ backend
            if (commentsData.length > 0) {
                console.log('[CommentsModal]  FIRST COMMENT RAW DATA:', JSON.stringify(commentsData[0], null, 2));
            }
            
            // Map sang format UI component
            const mappedComments = commentsData.map((c) => {
                // Backend trả về createdAt ở dạng UTC ISO string
                // JavaScript new Date() sẽ tự động convert UTC → Local timezone
                // Giống như Home.js: new Date(p.createdAt).toLocaleString()
                
                // QUAN TRỌNG: Backend đã sửa để trả về userId (user_id từ bảng users)
                // Không còn cần fallback nhiều variants như trước
                // userId này dùng để điều hướng đến UserProfilePublic
                const userIdNum = c.userId != null ? Number(c.userId) : null;
                
                console.log('[CommentsModal]  Mapping comment:', {
                    commentId: c.commentId,
                    userId: c.userId,
                    userIdNum,
                    isFinite: Number.isFinite(userIdNum),
                    username: c.username
                });
                
                return {
                    id: String(c.commentId),
                    userId: Number.isFinite(userIdNum) ? userIdNum : null, // Lưu dạng Number
                    username: c.username || "Người dùng",
                    avatar: c.userAvatar, // Pass raw path, UserAvatar component sẽ convert sang full URL
                    comment: c.content || "",
                    likes: Number(c.likesCount) || 0,
                    createdAt: c.createdAt, // Pass ISO string trực tiếp cho timeUtils.js xử lý
                    isLiked: Boolean(c.isLiked),
                    isEdited: Boolean(c.isEdited),
                    parentId: c.parentCommentId ? String(c.parentCommentId) : null, // Cho reply
                };
            });

            setComments(mappedComments);
            console.log('[CommentsModal]  Comments loaded successfully');
        } catch (error) {
            console.error("[CommentsModal]  Load comments error:", error);
            console.error("[CommentsModal] Error details:", error.message);
            setComments([]);
        } finally {
            if (isRefreshing) {
                setRefreshing(false);
            } else {
                setLoading(false);
            }
        }
    };

    const onRefresh = () => {
        loadComments(true);
    };

    const handleAddComment = async () => {
        if (!newComment.trim() || !postId) return;

        try {
            setSubmitting(true);
            
            // Kiểm tra xem đang edit hay add mới
            if (editingComment) {
                // ĐANG EDIT: Gửi đến backend để lưu thay đổi
                console.log('[CommentsModal]  Editing comment:', editingComment.id);
                
                try {
                    // Gọi API để update comment
                    await updateComment(editingComment.id, newComment.trim());
                    console.log('[CommentsModal]  Comment updated on backend');
                    
                    // Update comment trong state (frontend)
                    setComments(prev => prev.map(c => 
                        c.id === editingComment.id 
                            ? { ...c, comment: newComment.trim(), isEdited: true }
                            : c
                    ));
                    
                    setEditingComment(null);
                    setNewComment("");
                } catch (error) {
                    console.error('[CommentsModal]  Error updating comment:', error);
                    alert("Không thể cập nhật bình luận. Vui lòng thử lại.");
                    return; // Thoát khỏi function nếu có lỗi
                }
                
            } else if (replyingTo) {
                // Đang reply comment - GỬI parentCommentId đến backend
                console.log('[CommentsModal]  Replying to:', replyingTo);
                
                // ✅ SỬA: Gửi parentCommentId (replyingTo.id) đến backend
                const response = await addComment(postId, newComment.trim(), replyingTo.id);
                console.log('[CommentsModal]  Add reply response:', JSON.stringify(response, null, 2));
                
                // Backend giờ trả về đầy đủ thông tin, bao gồm parentCommentId
                const userIdNum = response?.userId != null ? Number(response.userId) : currentUserId;
                
                const newCommentData = {
                    id: response?.commentId?.toString() || String(Date.now()),
                    userId: userIdNum,
                    username: response?.username || "You",
                    avatar: response?.userAvatar,
                    comment: response?.content || newComment.trim(),
                    likes: response?.likesCount || 0,
                    createdAt: response?.createdAt || new Date().toISOString(),
                    isLiked: false,
                    isEdited: false,
                    parentId: response?.parentCommentId ? String(response.parentCommentId) : replyingTo.id, // Dùng từ backend hoặc fallback
                };
                
                console.log('[CommentsModal]  Reply added:', newCommentData);
                
                setComments([newCommentData, ...comments]);
                setReplyingTo(null);
                setNewComment("");
            } else {
                // Add comment mới bình thường (không phải reply)
                console.log('[CommentsModal]  Adding comment:', newComment);
                
                const response = await addComment(postId, newComment.trim(), null); // parentCommentId = null
                console.log('[CommentsModal]  Add comment response:', JSON.stringify(response, null, 2));
                
                // Backend giờ trả về đầy đủ thông tin
                const userIdNum = response?.userId != null ? Number(response.userId) : currentUserId;
                
                const newCommentData = {
                    id: response?.commentId?.toString() || String(Date.now()),
                    userId: userIdNum,
                    username: response?.username || "You",
                    avatar: response?.userAvatar,
                    comment: response?.content || newComment.trim(),
                    likes: response?.likesCount || 0,
                    createdAt: response?.createdAt || new Date().toISOString(),
                    isLiked: false,
                    isEdited: false,
                    parentId: response?.parentCommentId ? String(response.parentCommentId) : null, // Phải là null cho comment gốc
                };
                
                console.log('[CommentsModal]  Comment added:', newCommentData);
                
                setComments([newCommentData, ...comments]);
                setNewComment("");
            }
            
            // Callback để update comment count ở Home (chỉ khi add new, không khi edit)
            if (onCommentAdded && !editingComment) {
                onCommentAdded(postId);
            }
        } catch (error) {
            console.error("[CommentsModal]  Error:", error);
            console.error("[CommentsModal] Error details:", error.message);
            alert("Không thể thực hiện. Vui lòng thử lại.");
        } finally {
            setSubmitting(false);
        }
    };

    const handleLikeToggle = async (commentId) => {
        try {
            // Find comment to check current like state
            const findComment = (comments, id) => {
                for (const comment of comments) {
                    if (comment.id === id) return comment;
                    if (comment.replies && comment.replies.length > 0) {
                        const found = findComment(comment.replies, id);
                        if (found) return found;
                    }
                }
                return null;
            };
            
            const targetComment = findComment(comments, commentId);
            const wasLiked = targetComment?.isLiked || false;
            
            // Recursive update function for nested comments
            const updateCommentRecursive = (commentsList) => {
                return commentsList.map((comment) => {
                    if (comment.id === commentId) {
                        return {
                            ...comment,
                            isLiked: !comment.isLiked,
                            likes: comment.isLiked
                                ? Math.max(0, comment.likes - 1)
                                : comment.likes + 1,
                        };
                    }
                    if (comment.replies && comment.replies.length > 0) {
                        return {
                            ...comment,
                            replies: updateCommentRecursive(comment.replies),
                        };
                    }
                    return comment;
                });
            };

            // Optimistic update
            setComments((prev) => updateCommentRecursive(prev));

            // Call appropriate API based on current state
            if (wasLiked) {
                await removeCommentReaction(commentId);
            } else {
                await addCommentReaction(commentId, "Like");
            }
        } catch (error) {
            console.error("[CommentsModal] Like comment error:", error);
            
            // Rollback optimistic update with recursive function
            const rollbackCommentRecursive = (commentsList) => {
                return commentsList.map((comment) => {
                    if (comment.id === commentId) {
                        return {
                            ...comment,
                            isLiked: !comment.isLiked,
                            likes: comment.isLiked
                                ? comment.likes + 1
                                : Math.max(0, comment.likes - 1),
                        };
                    }
                    if (comment.replies && comment.replies.length > 0) {
                        return {
                            ...comment,
                            replies: rollbackCommentRecursive(comment.replies),
                        };
                    }
                    return comment;
                });
            };
            
            setComments((prev) => rollbackCommentRecursive(prev));
        }
    };

    // Xử lý trả lời comment - FLAT 2 LEVELS: Chỉ parent và reply (giống Instagram)
    const handleReply = (comment) => {
        // Tìm root parent nếu comment này là reply
        let rootParentId = comment.id;
        let rootParentUsername = comment.username;
        let rootParentUserId = comment.userId;
        
        if (comment.parentId) {
            // Đây là reply, tìm parent gốc
            const rootParent = comments.find(c => c.id === comment.parentId);
            if (rootParent) {
                rootParentId = rootParent.id;
                // Giữ username và userId của người được reply (không phải root)
                rootParentUsername = comment.username;
                rootParentUserId = comment.userId;
            }
        }
        
        // Lưu thông tin reply: parentId là root, nhưng @mention là người được reply
        setReplyingTo({ 
            id: rootParentId, // ✅ Luôn reply vào root parent (chỉ 2 tầng)
            username: rootParentUsername, // Username người được @ mention
            userId: rootParentUserId // UserId người được @ mention
        });
        
        // Tự động thêm @mention vào comment
        setNewComment(`@${rootParentUsername} `);
        setEditingComment(null);
        
        // Focus vào input
        if (inputRef.current) {
            inputRef.current.focus();
        }
    };

    // Hủy reply
    const cancelReply = () => {
        setReplyingTo(null);
        setNewComment("");
    };

    // Xử lý chỉnh sửa comment
    const handleEdit = (comment) => {
        setEditingComment({ id: comment.id, text: comment.comment });
        setNewComment(comment.comment);
        setReplyingTo(null);
        // Focus vào input
        if (inputRef.current) {
            inputRef.current.focus();
        }
    };

    // Hủy edit
    const cancelEdit = () => {
        setEditingComment(null);
        setNewComment("");
    };

    // Xử lý xóa comment
    const handleDelete = (comment) => {
        setShowMenuForComment(null); // Đóng menu
        Alert.alert(
            "Xóa bình luận",
            "Bạn có chắc muốn xóa bình luận này?",
            [
                { text: "Hủy", style: "cancel" },
                {
                    text: "Xóa",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            // Gọi API xóa comment
                            await deleteComment(comment.id);
                            console.log('[CommentsModal] ✅ Comment deleted:', comment.id);
                            
                            // Xóa local state
                            setComments(prev => prev.filter(c => c.id !== comment.id));
                        } catch (error) {
                            console.error("[CommentsModal] Delete comment error:", error);
                            alert("Không thể xóa bình luận.");
                        }
                    }
                }
            ]
        );
    };

    // Menu options cho comment - Hiển thị dropdown bên cạnh comment
    const toggleCommentMenu = (commentId) => {
        if (showMenuForComment === commentId) {
            setShowMenuForComment(null); // Đóng menu nếu đang mở
        } else {
            setShowMenuForComment(commentId); // Mở menu
        }
    };

    // Sao chép comment
    const handleCopy = (comment) => {
        setShowMenuForComment(null);
        // TODO: Copy to clipboard
        // Clipboard.setString(comment.comment);
        alert("Đã sao chép bình luận");
    };

    // Toggle hiển thị replies
    const toggleReplies = (commentId) => {
        setExpandedComments(prev => ({
            ...prev,
            [commentId]: !prev[commentId]
        }));
    };

    // Đếm số replies của một comment (chỉ đếm direct children)
    const getRepliesCount = (commentId) => {
        return comments.filter(c => c.parentId === commentId).length;
    };

    // Lấy danh sách replies của một comment (chỉ direct children)
    const getReplies = (commentId) => {
        return comments.filter(c => c.parentId === commentId);
    };
    
    // Tính depth (độ sâu) của comment trong cây phân cấp
    const getCommentDepth = (comment, depth = 0, maxDepth = 3) => {
        if (!comment.parentId || depth >= maxDepth) return depth;
        const parent = comments.find(c => c.id === comment.parentId);
        if (!parent) return depth;
        return getCommentDepth(parent, depth + 1, maxDepth);
    };

    // Component render reply - FLAT: Tất cả replies cùng indent (2 tầng)
    const renderReplyItem = (reply) => {
        const isMenuOpen = showMenuForComment === reply.id;

        return (
            <View key={reply.id} style={styles.replyItem}>
                <TouchableOpacity 
                    onPress={() => handleNavigateToProfile(reply)}
                    activeOpacity={0.7}
                >
                    <UserAvatar uri={reply.avatar} style={styles.replyAvatar} />
                </TouchableOpacity>

                <View style={styles.commentContent}>
                    <View style={styles.commentBubble}>
                        <View style={styles.commentHeaderRow}>
                            <View style={styles.commentHeaderLeft}>
                                <TouchableOpacity 
                                    onPress={() => handleNavigateToProfile(reply)}
                                    activeOpacity={0.7}
                                >
                                    <Text style={styles.commentUsername}>
                                        {reply.username}
                                    </Text>
                                </TouchableOpacity>
                                <Text style={styles.commentTime}>
                                    {formatVietnameseTime(reply.createdAt)}
                                </Text>
                            </View>
                            
                            {/* Nút ... để mở menu cho reply */}
                            <TouchableOpacity 
                                onPress={(e) => {
                                    e.stopPropagation();
                                    toggleCommentMenu(reply.id);
                                }}
                                style={styles.moreButton}
                                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                            >
                                <Ionicons name="ellipsis-horizontal" size={18} color="#8E8E8E" />
                            </TouchableOpacity>
                        </View>
                        
                        <MentionText 
                            text={reply.comment}
                            style={styles.commentText}
                            onMentionPress={handleMentionPress}
                        />
                        {reply.isEdited && (
                            <Text style={styles.editedLabel}>Đã chỉnh sửa</Text>
                        )}
                    </View>

                    <View style={styles.commentActions}>
                        <TouchableOpacity onPress={() => handleReply(reply)}>
                            <Text style={styles.commentAction}>Trả lời</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Menu edit/delete cho reply */}
                    {isMenuOpen && (
                        <View style={styles.commentMenu}>
                            {reply.userId === currentUserId && (
                                <>
                                    <TouchableOpacity 
                                        style={styles.menuItem}
                                        onPress={() => handleEditComment(reply)}
                                    >
                                        <Ionicons name="create-outline" size={20} color="#262626" />
                                        <Text style={styles.menuItemText}>Chỉnh sửa</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity 
                                        style={[styles.menuItem, styles.deleteMenuItem]}
                                        onPress={() => handleDeleteComment(reply.id)}
                                    >
                                        <Ionicons name="trash-outline" size={20} color="#ED4956" />
                                        <Text style={[styles.menuItemText, styles.deleteText]}>Xóa</Text>
                                    </TouchableOpacity>
                                </>
                            )}
                        </View>
                    )}
                </View>

                <TouchableOpacity
                    style={styles.likeButton}
                    onPress={() => handleLikeToggle(reply.id)}
                >
                    <HeartIcon isLiked={reply.isLiked} size={18} />
                    {reply.likes > 0 && (
                        <Text style={styles.likeCount}>{reply.likes}</Text>
                    )}
                </TouchableOpacity>
            </View>
        );
    };

    // Lọc comments dựa trên filter mode
    const getFilteredComments = () => {
        if (commentFilter === 'recent') {
            // Lấy 10 bình luận mới nhất (không phải reply)
            return comments
                .filter(c => !c.parentId)
                .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                .slice(0, 10);
        }
        // Trả về tất cả comments (không phải reply)
        return comments.filter(c => !c.parentId);
    };

    // Handler để điều hướng đến profile
    const handleNavigateToProfile = (comment) => {
        const commentUserId = comment?.userId;
        const commentUsername = comment?.username;
        
        console.log('[CommentsModal] Navigate to profile:', {
            commentUserId,
            currentUserId,
            commentUsername
        });
        
        // Đóng modal trước khi điều hướng
        onClose();
        
        // Dùng setTimeout để đảm bảo modal đã đóng hoàn toàn trước khi navigate
        setTimeout(() => {
            // Kiểm tra xem có phải comment của chính mình không
            const isMyComment = currentUserId != null && commentUserId != null && Number(commentUserId) === Number(currentUserId);
            
            if (isMyComment) {
                // Điều hướng đến trang Profile của mình
                console.log('[CommentsModal] Navigate to own Profile');
                navigation.navigate('Profile');
            } else {
                // Điều hướng đến trang UserProfilePublic của người khác
                console.log('[CommentsModal] Navigate to UserProfilePublic:', { userId: commentUserId, username: commentUsername });
                navigation.navigate('UserProfilePublic', {
                    userId: commentUserId,
                    username: commentUsername
                });
            }
        }, 300); // Đợi 300ms để animation đóng modal hoàn tất
    };
    
    // Handle click on @mention trong comment text
    const handleMentionPress = async (username) => {
        console.log('[CommentsModal] 🔗 Mention clicked:', username);
        
        // Đóng modal trước khi điều hướng
        onClose();
        
        // Dùng setTimeout để đảm bảo modal đã đóng hoàn toàn trước khi navigate
        setTimeout(async () => {
            // Bước 1: Tìm trong comments hiện tại trước
            let mentionedComment = comments.find(c => c.username === username);
            let userId = mentionedComment?.userId;
            
            // Bước 2: Nếu không tìm thấy trong comments, gọi API search
            if (!userId) {
                console.log('[CommentsModal] 🔍 User not in comments, searching by username...');
                try {
                    const userProfile = await getUserByUsername(username);
                    if (userProfile) {
                        userId = userProfile.UserId || userProfile.userId || userProfile.user_id || userProfile.id;
                        console.log('[CommentsModal] ✅ Found user via API:', { username, userId });
                    } else {
                        console.log('[CommentsModal] ⚠️ User not found via API');
                    }
                } catch (error) {
                    console.error('[CommentsModal] ❌ Error searching user:', error);
                }
            }
            
            // Bước 3: Navigate nếu tìm thấy userId
            if (userId) {
                const isMyComment = currentUserId != null && Number(userId) === Number(currentUserId);
                
                if (isMyComment) {
                    navigation.navigate('Profile');
                } else {
                    navigation.navigate('UserProfilePublic', {
                        userId: Number(userId),
                        username: username
                    });
                }
            } else {
                // Không tìm thấy user
                Alert.alert(
                    'Không tìm thấy người dùng',
                    `Người dùng @${username} không tồn tại hoặc đã bị xóa.`,
                    [{ text: 'OK' }]
                );
            }
        }, 300); // Đợi 300ms để animation đóng modal hoàn tất
    };

    const handleEmojiPress = (emoji) => {
        setNewComment((prev) => prev + emoji);
    };

    const renderComment = ({ item }) => {
        // Nếu là reply (có parentId), không hiển thị ở list chính
        if (item.parentId) return null;
        
        const repliesCount = getRepliesCount(item.id);
        const replies = getReplies(item.id);
        const isExpanded = expandedComments[item.id];
        const showMenu = showMenuForComment === item.id;
        
        return (
            <TouchableOpacity 
                activeOpacity={1}
                onPress={(e) => {
                    e.stopPropagation();
                    if (showMenu) {
                        setShowMenuForComment(null);
                    }
                }}
            >
                <View>
                    <View style={styles.commentItem}>
                        <TouchableOpacity 
                            onPress={() => handleNavigateToProfile(item)}
                            activeOpacity={0.7}
                        >
                            <UserAvatar uri={item.avatar} style={styles.commentAvatar} />
                        </TouchableOpacity>

                        <View style={styles.commentContent}>
                            <View style={styles.commentBubble}>
                                <View style={styles.commentHeaderRow}>
                                    <View style={styles.commentHeaderLeft}>
                                        <TouchableOpacity 
                                            onPress={() => handleNavigateToProfile(item)}
                                            activeOpacity={0.7}
                                        >
                                            <Text style={styles.commentUsername}>
                                                {item.username}
                                            </Text>
                                        </TouchableOpacity>
                                        <Text style={styles.commentTime}>
                                            {formatVietnameseTime(item.createdAt)}
                                        </Text>
                                    </View>
                                    
                                    {/* Nút ... để mở menu */}
                                    <TouchableOpacity 
                                        onPress={(e) => {
                                            e.stopPropagation();
                                            toggleCommentMenu(item.id);
                                        }}
                                        style={styles.moreButton}
                                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                    >
                                        <Ionicons name="ellipsis-horizontal" size={18} color="#8E8E8E" />
                                    </TouchableOpacity>
                                </View>
                                
                                <MentionText 
                                    text={item.comment}
                                    style={styles.commentText}
                                    onMentionPress={handleMentionPress}
                                />
                                {item.isEdited && (
                                    <Text style={styles.editedLabel}>Đã chỉnh sửa</Text>
                                )}
                            </View>

                            <View style={styles.commentActions}>
                                <TouchableOpacity onPress={() => handleReply(item)}>
                                    <Text style={styles.commentAction}>Trả lời</Text>
                                </TouchableOpacity>
                            </View>
                            
                            {/* Nút xem/ẩn replies - Hiển thị bên ngoài commentActions */}
                            {repliesCount > 0 && (
                                <TouchableOpacity 
                                    onPress={() => toggleReplies(item.id)}
                                    style={styles.viewRepliesButton}
                                >
                                    <View style={styles.viewRepliesLine} />
                                    <Text style={styles.viewRepliesText}>
                                        {isExpanded ? 'Ẩn câu trả lời' : `Xem ${repliesCount} câu trả lời`}
                                    </Text>
                                </TouchableOpacity>
                            )}
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

                    {/* Hiển thị replies nếu được expand */}
                    {isExpanded && replies.length > 0 && (
                        <View style={styles.repliesContainer}>
                            {replies.map((reply) => renderReplyItem(reply))}
                        </View>
                    )}
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={onClose}
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : undefined}
                style={{ flex: 1 }}
                keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={onClose}
                >
                    <TouchableOpacity 
                        style={[
                            styles.modalContent,
                            Platform.OS === 'android' && keyboardHeight > 0 && {
                                maxHeight: height - keyboardHeight - 50
                            }
                        ]} 
                        activeOpacity={1}
                        onPress={() => setShowMenuForComment(null)}
                    >
                    {/* Header */}
                    <View style={styles.modalHeader}>
                        <View style={styles.modalHandle} />
                        <Text style={styles.modalTitle}>Bình luận</Text>
                    </View>

                    {/* Filter Tabs - Giống Facebook */}
                    {!loading && comments.length > 0 && (
                        <View style={styles.filterContainer}>
                            <TouchableOpacity 
                                style={[
                                    styles.filterTab,
                                    commentFilter === 'recent' && styles.filterTabActive
                                ]}
                                onPress={() => setCommentFilter('recent')}
                            >
                                <Text style={[
                                    styles.filterTabText,
                                    commentFilter === 'recent' && styles.filterTabTextActive
                                ]}>
                                    Mới nhất
                                </Text>
                            </TouchableOpacity>
                            
                            <TouchableOpacity 
                                style={[
                                    styles.filterTab,
                                    commentFilter === 'all' && styles.filterTabActive
                                ]}
                                onPress={() => setCommentFilter('all')}
                            >
                                <Text style={[
                                    styles.filterTabText,
                                    commentFilter === 'all' && styles.filterTabTextActive
                                ]}>
                                    Tất cả bình luận
                                </Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* Comments List */}
                    {loading ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="large" color="#0095f6" />
                            <Text style={styles.loadingText}>Đang tải bình luận...</Text>
                        </View>
                    ) : comments.length === 0 ? (
                        <View style={styles.emptyContainer}>
                            <Ionicons name="chatbubble-outline" size={48} color="#ccc" />
                            <Text style={styles.emptyText}>Chưa có bình luận nào</Text>
                            <Text style={styles.emptySubtext}>Hãy là người đầu tiên bình luận</Text>
                        </View>
                    ) : (
                        <FlatList
                            ref={flatListRef}
                            data={getFilteredComments()}
                            renderItem={renderComment}
                            keyExtractor={(item) => item.id}
                            contentContainerStyle={styles.commentsList}
                            showsVerticalScrollIndicator={false}
                            keyboardShouldPersistTaps="handled"
                            keyboardDismissMode="on-drag"
                            nestedScrollEnabled={true}
                            scrollEnabled={true}
                            onScrollBeginDrag={() => setShowMenuForComment(null)}
                            refreshControl={
                                <RefreshControl
                                    refreshing={refreshing}
                                    onRefresh={onRefresh}
                                    colors={["#0095f6"]}
                                    tintColor="#0095f6"
                                    title="Đang tải..."
                                    titleColor="#8E8E8E"
                                />
                            }
                        />
                    )}

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
                    <View style={styles.inputContainer}>
                        {/* Hiển thị banner khi đang reply hoặc edit */}
                        {(replyingTo || editingComment) && (
                            <View style={styles.replyBanner}>
                                <View style={styles.replyBannerContent}>
                                    <Ionicons 
                                        name={editingComment ? "create-outline" : "arrow-undo-outline"} 
                                        size={16} 
                                        color="#8E8E8E" 
                                    />
                                    <Text style={styles.replyBannerText}>
                                        {editingComment 
                                            ? "Đang chỉnh sửa bình luận" 
                                            : `Đang trả lời @${replyingTo.username}`
                                        }
                                    </Text>
                                </View>
                                <TouchableOpacity 
                                    onPress={editingComment ? cancelEdit : cancelReply}
                                    style={styles.replyBannerClose}
                                >
                                    <Ionicons name="close" size={20} color="#8E8E8E" />
                                </TouchableOpacity>
                            </View>
                        )}
                        
                        <View style={styles.inputRow}>
                            <UserAvatar uri={currentUserAvatar} style={styles.inputAvatar} />
                            <TextInput
                                ref={inputRef}
                                style={styles.input}
                                placeholder={
                                    editingComment 
                                        ? "Chỉnh sửa bình luận..." 
                                        : replyingTo 
                                            ? `Trả lời @${replyingTo.username}...`
                                            : "Bắt đầu trò chuyện... (dùng @username để tag)"
                                }
                                placeholderTextColor="#999"
                                value={newComment}
                                onChangeText={setNewComment}
                                multiline
                                maxLength={500}
                                editable={!submitting}
                            />
                            {submitting ? (
                                <ActivityIndicator size="small" color="#0095f6" style={styles.sendButton} />
                            ) : newComment.trim().length > 0 ? (
                                <TouchableOpacity
                                    onPress={handleAddComment}
                                    style={styles.sendButton}
                                >
                                    <Text style={styles.sendButtonText}>
                                        {editingComment ? "Lưu" : "Gửi"}
                                    </Text>
                                </TouchableOpacity>
                            ) : null}
                        </View>
                    </View>
                </TouchableOpacity>
            </TouchableOpacity>

            {/* Global Menu Dropdown - Render ở cấp cao nhất, bên ngoài modalContent */}
            {showMenuForComment ? (() => {
                const comment = comments.find(c => c.id === showMenuForComment);
                if (!comment) return null;
                
                // So sánh userId như trong Home.js
                const commentUserId = comment.userId != null ? Number(comment.userId) : null;
                const isOwner = currentUserId != null && commentUserId != null && commentUserId === currentUserId;
                
                console.log('[CommentsModal] 🔐 Menu ownership check:', {
                    commentId: comment.id,
                    comment_userId_raw: comment.userId,
                    commentUserId_converted: commentUserId,
                    commentUserId_type: typeof commentUserId,
                    currentUserId: currentUserId,
                    currentUserId_type: typeof currentUserId,
                    isOwner: isOwner,
                    comparison: `${commentUserId} === ${currentUserId} = ${commentUserId === currentUserId}`
                });
                
                return (
                    <TouchableOpacity 
                        style={styles.globalMenuOverlay}
                        activeOpacity={1}
                        onPress={() => setShowMenuForComment(null)}
                    >
                        <TouchableOpacity 
                            style={styles.globalMenuDropdown}
                            activeOpacity={1}
                            onPress={(e) => e.stopPropagation()}
                        >
                            {console.log('[CommentsModal] 🎨 Rendering menu options:', {
                                isOwner,
                                willShowEdit: isOwner,
                                willShowDelete: isOwner
                            })}
                            
                            {/* Sao chép - Ai cũng có thể */}
                            <TouchableOpacity 
                                style={styles.menuOption}
                                onPress={() => {
                                    handleCopy(comment);
                                }}
                            >
                                <Ionicons name="copy-outline" size={20} color="#262626" />
                                <Text style={styles.menuOptionText}>Sao chép</Text>
                            </TouchableOpacity>
                            
                            {/* Chỉnh sửa - Chỉ chủ comment */}
                            {isOwner ? (
                                <TouchableOpacity 
                                    style={styles.menuOption}
                                    onPress={() => {
                                        setShowMenuForComment(null);
                                        handleEdit(comment);
                                    }}
                                >
                                    <Ionicons name="create-outline" size={20} color="#262626" />
                                    <Text style={styles.menuOptionText}>Chỉnh sửa</Text>
                                </TouchableOpacity>
                            ) : null}
                            
                            {/* Xóa - Chỉ chủ comment */}
                            {isOwner ? (
                                <TouchableOpacity 
                                    style={styles.menuOption}
                                    onPress={() => {
                                        handleDelete(comment);
                                    }}
                                >
                                    <Ionicons name="trash-outline" size={22} color="#ED4956" />
                                    <Text style={[styles.menuOptionText, styles.menuOptionTextDanger]}>Xóa</Text>
                                </TouchableOpacity>
                            ) : null}
                        </TouchableOpacity>
                    </TouchableOpacity>
                );
            })() : null}
            </KeyboardAvoidingView>
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
        maxHeight: height * 0.90,
        flex: 1,
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
    // Filter Tabs Styles
    filterContainer: {
        flexDirection: "row",
        paddingHorizontal: 16,
        paddingVertical: 8,
        backgroundColor: "#FFFFFF",
        borderBottomWidth: 0.5,
        borderBottomColor: "#EFEFEF",
        gap: 8,
    },
    filterTab: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        backgroundColor: "#F0F2F5",
    },
    filterTabActive: {
        backgroundColor: "#E7F3FF",
    },
    filterTabText: {
        fontSize: 14,
        fontWeight: "500",
        color: "#65676B",
    },
    filterTabTextActive: {
        color: "#0095F6",
        fontWeight: "600",
    },
    commentsList: {
        paddingVertical: 12,
        paddingBottom: 8,
        overflow: "visible", // Cho phép menu hiển thị ra ngoài
    },
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingVertical: 60,
    },
    loadingText: {
        marginTop: 12,
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
        marginTop: 4,
        fontSize: 14,
        color: "#8E8E8E",
    },
    commentItem: {
        flexDirection: "row",
        paddingHorizontal: 16,
        paddingVertical: 8,
        alignItems: "flex-start",
        position: "relative", // Cho phép menu có context positioning
        zIndex: 1, // Base zIndex cho comment item
        overflow: "visible", // Cho phép menu tràn ra ngoài
    },
    commentAvatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        marginRight: 12,
    },
    defaultAvatarContainer: {
        backgroundColor: "#F0F0F0",
        justifyContent: "center",
        alignItems: "center",
        borderRadius: 16,
    },
    commentContent: {
        flex: 1,
        position: "relative", // Cho phép menu dropdown absolute positioning
        overflow: "visible", // Đảm bảo menu không bị clip
    },
    commentBubble: {
        backgroundColor: "#FFFFFF",
        paddingHorizontal: 0,
        paddingVertical: 0,
        position: "relative",
    },
    commentHeaderRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 4,
    },
    commentHeaderLeft: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        flex: 1,
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
    moreButton: {
        padding: 4,
        marginLeft: 4,
    },
    menuOption: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 12,
        paddingHorizontal: 16,
        gap: 12,
        borderRadius: 8,
    },
    menuOptionText: {
        fontSize: 14,
        color: "#262626",
        fontWeight: "500",
    },
    menuOptionDanger: {
        // Không cần background, chỉ đổi màu text
    },
    menuOptionTextDanger: {
        color: "#ED4956",
    },
    // Global Menu Overlay - Render ở cấp cao nhất bên ngoài modal content
    globalMenuOverlay: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: "center",
        alignItems: "center",
        zIndex: 999999, // zIndex cực cao
        elevation: 999999, // elevation cực cao cho Android
        backgroundColor: "rgba(0, 0, 0, 0.3)", // Overlay tối nhẹ
    },
    globalMenuDropdown: {
        backgroundColor: "#FFFFFF",
        borderRadius: 12,
        paddingVertical: 8,
        paddingHorizontal: 4,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4,
        shadowRadius: 16,
        elevation: 999999, // elevation cực cao
        minWidth: 200,
        maxWidth: 250,
    },
    commentText: {
        fontSize: 14,
        color: "#000000",
        lineHeight: 18,
        marginTop: 2,
    },
    editedLabel: {
        fontSize: 11,
        color: "#8E8E8E",
        fontStyle: "italic",
        marginTop: 4,
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
    // View Replies Button (Xem X câu trả lời)
    viewRepliesButton: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: 12,
        marginLeft: 56, // Căn với nội dung comment (avatar 32 + margin 12 + padding 12)
        paddingVertical: 4,
    },
    viewRepliesLine: {
        width: 24,
        height: 1,
        backgroundColor: "#DBDBDB",
        marginRight: 8,
    },
    viewRepliesText: {
        fontSize: 13,
        color: "#8E8E8E",
        fontWeight: "600",
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
    // Replies styles
    repliesContainer: {
        marginLeft: 44,
        marginTop: 8,
        paddingLeft: 12,
        borderLeftWidth: 2,
        borderLeftColor: "#EFEFEF",
    },
    replyItem: {
        flexDirection: "row",
        paddingVertical: 8,
        alignItems: "flex-start",
    },
    replyAvatar: {
        width: 28,
        height: 28,
        borderRadius: 14,
        marginRight: 10,
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
        borderTopWidth: 0.5,
        borderTopColor: "#DBDBDB",
        backgroundColor: "#FFFFFF",
    },
    replyBanner: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingVertical: 8,
        backgroundColor: "#F8F8F8",
        borderBottomWidth: 0.5,
        borderBottomColor: "#DBDBDB",
    },
    replyBannerContent: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    replyBannerText: {
        fontSize: 13,
        color: "#8E8E8E",
        fontWeight: "500",
    },
    replyBannerClose: {
        padding: 4,
    },
    inputRow: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 16,
        paddingBottom: Platform.OS === "ios" ? 20 : 16,
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
