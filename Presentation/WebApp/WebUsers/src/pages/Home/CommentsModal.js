import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  IoSend,
  IoHeart,
  IoHeartOutline,
  IoEllipsisHorizontal,
  IoCopy,
  IoCreate,
  IoTrash,
  IoClose,
  IoChatbubbleOutline,
  IoPersonCircle
} from 'react-icons/io5';
import signalRService from '../../Services/signalRService';
import { getRelativeTime } from '../../Utils/timeUtils';
import {
  getComments,
  addComment,
  addCommentReaction,
  removeCommentReaction,
  deleteComment,
  updateComment,
  getUserByUsername,
  API_BASE_URL,
} from '../../api/Api';
import './CommentsModal.css';

// Helper function: Convert avatar path to full URL
const getAvatarUrl = (avatarPath) => {
  if (!avatarPath || avatarPath.trim() === '') return null;
  if (avatarPath.startsWith('http://') || avatarPath.startsWith('https://')) {
    return avatarPath;
  }
  const cleanPath = avatarPath.startsWith('/') ? avatarPath : `/${avatarPath}`;
  return `${API_BASE_URL}${cleanPath}`;
};

// Component: User Avatar with fallback
const UserAvatar = ({ uri, style, onClick }) => {
  const fullAvatarUrl = getAvatarUrl(uri);
  const [imageError, setImageError] = useState(false);

  if (fullAvatarUrl && !imageError) {
    return (
      <img
        src={fullAvatarUrl}
        alt="Avatar"
        className={style}
        onClick={onClick}
        onError={() => setImageError(true)}
      />
    );
  }

  return (
    <div className={`${style} default-avatar`} onClick={onClick}>
      <IoPersonCircle size={32} color="#c7c7c7" />
    </div>
  );
};

// Component: Heart Icon with animation
const HeartIcon = ({ isLiked, size = 20 }) => {
  return isLiked ? (
    <IoHeart className="heart-icon liked" size={size} />
  ) : (
    <IoHeartOutline className="heart-icon" size={size} />
  );
};

// Component: MentionText - renders text with clickable @mentions
const MentionText = ({ text, onMentionPress }) => {
  if (!text) return null;

  const parts = text.split(/(@\w+)/g);

  return (
    <span className="mention-text">
      {parts.map((part, index) => {
        if (part.startsWith('@')) {
          const username = part.substring(1);
          return (
            <span
              key={index}
              className="mention-link"
              onClick={() => onMentionPress(username)}
            >
              {part}
            </span>
          );
        }
        return <span key={index}>{part}</span>;
      })}
    </span>
  );
};

const CommentsModal = ({
  visible,
  onClose,
  postId,
  post,
  onCommentAdded,
  highlightCommentId,
  embedded = false, // New prop for embedded mode
  inputRef: externalInputRef, // External ref from PostDetail
  externalCommentText, // Comment text from PostDetail
  onCommentTextChange, // Callback to update PostDetail's text
  onCommentCountChange, // Callback to update total comment count
  onSubmitCallback, // Callback to expose submit function
}) => {
  const navigate = useNavigate();
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [highlightedCommentId, setHighlightedCommentId] = useState(null);

  // State for currentUserId - logged in user
  const [currentUserId, setCurrentUserId] = useState(null);
  const [currentUserAvatar, setCurrentUserAvatar] = useState(null);

  // States for reply and edit
  const [replyingTo, setReplyingTo] = useState(null); // { id, username }
  const [editingComment, setEditingComment] = useState(null); // { id, text }
  const [expandedComments, setExpandedComments] = useState({});
  const [showMenuForComment, setShowMenuForComment] = useState(null);

  // State for filter comments: 'recent' or 'all'
  const [commentFilter, setCommentFilter] = useState('recent');

  const inputRef = useRef(null);
  const commentListRef = useRef(null);

  // Load current user from localStorage
  useEffect(() => {
    const loadCurrentUser = async () => {
      try {
        const userStr = localStorage.getItem('userInfo');
        console.log('[CommentsModal] 📱 localStorage userInfo raw:', userStr);

        if (userStr) {
          const user = JSON.parse(userStr);
          console.log('[CommentsModal] 👤 Parsed user object:', JSON.stringify(user, null, 2));

          const raw = user?.UserId ?? user?.userId ?? user?.user_id ?? user?.id ?? null;
          const uidNum = raw != null ? Number(raw) : null;

          console.log('[CommentsModal] 🔑 UserId extraction:', {
            UserId: user?.UserId,
            userId: user?.userId,
            user_id: user?.user_id,
            id: user?.id,
            raw: raw,
            uidNum: uidNum,
            isFinite: Number.isFinite(uidNum),
          });

          if (Number.isFinite(uidNum)) {
            setCurrentUserId(uidNum);
            console.log('[CommentsModal] ✅ Current user loaded:', uidNum);

            const avatar =
              user?.AvatarUrl ||
              user?.avatarUrl ||
              user?.avatar_url ||
              user?.Avatar ||
              null;
            setCurrentUserAvatar(avatar);
            console.log('[CommentsModal] 🖼️ Current user avatar:', avatar);
          } else {
            console.warn('[CommentsModal] ⚠️ Could not extract valid userId from userInfo');
          }
        } else {
          console.warn('[CommentsModal] ⚠️ No userInfo found in localStorage');
        }
      } catch (error) {
        console.error('[CommentsModal] ❌ Error loading user:', error);
      }
    };
    loadCurrentUser();
  }, []);

  // Load comments when modal opens
  useEffect(() => {
    if (visible && postId) {
      loadComments();
    }
  }, [visible, postId]);

  // Sync with external comment text in embedded mode
  useEffect(() => {
    if (embedded && externalCommentText !== undefined) {
      setNewComment(externalCommentText);
    }
  }, [embedded, externalCommentText]);

  // Expose submit function to parent via callback
  useEffect(() => {
    if (embedded && onSubmitCallback) {
      onSubmitCallback(() => handleSubmit);
    }
  }, [embedded, onSubmitCallback, newComment]);

  // Scroll to highlighted comment
  useEffect(() => {
    if (highlightCommentId && comments.length > 0 && commentListRef.current) {
      const commentElement = document.getElementById(`comment-${highlightCommentId}`);
      if (commentElement) {
        setTimeout(() => {
          commentElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          setHighlightedCommentId(highlightCommentId);
          setTimeout(() => setHighlightedCommentId(null), 2000);
        }, 500);
      }
    }
  }, [highlightCommentId, comments]);

  // Connect SignalR and register handlers
  useEffect(() => {
    let joined = false;
    const handlers = {
      onReceiveComment: null,
      onCommentUpdated: null,
      onCommentDeleted: null,
      onCommentReplyAdded: null,
      onCommentReactionChanged: null,
    };

    if (visible && postId) {
      (async () => {
        try {
          await signalRService.connectToComment();
          await signalRService.joinPostComments(postId);
          joined = true;
          console.log('[CommentsModal] ✅ SignalR connected and joined post:', postId);

          // Define handlers
          handlers.onReceiveComment = (c) => {
            try {
              console.log('[CommentsModal] 📩 ReceiveComment event:', c);
              const mapped = mapServerCommentToUI(c);
              setComments((prev) => {
                if (prev.find((x) => x.id === String(mapped.id))) {
                  console.log('[CommentsModal] Comment already exists:', mapped.id);
                  return prev;
                }
                console.log('[CommentsModal] ✅ Adding new comment:', mapped.id);
                return [mapped, ...prev];
              });
            } catch (e) {
              console.error('[CommentsModal] onReceiveComment handler error', e);
            }
          };

          handlers.onCommentUpdated = (c) => {
            try {
              console.log('[CommentsModal] 📝 CommentUpdated event:', c);
              const mapped = mapServerCommentToUI(c);
              setComments((prev) =>
                prev.map((item) => (item.id === String(mapped.id) ? mapped : item))
              );
            } catch (e) {
              console.error('[CommentsModal] onCommentUpdated handler error', e);
            }
          };

          handlers.onCommentDeleted = (payload) => {
            try {
              console.log('[CommentsModal] 🗑️ CommentDeleted event:', payload);
              const cid = payload?.commentId ?? payload;
              const idStr = String(cid);
              setComments((prev) => prev.filter((c) => c.id !== idStr));
            } catch (e) {
              console.error('[CommentsModal] onCommentDeleted handler error', e);
            }
          };

          handlers.onCommentReplyAdded = (payload) => {
            try {
              console.log('[CommentsModal] 💬 CommentReplyAdded event:', payload);
              const reply = payload?.replyComment ?? payload;
              const mapped = mapServerCommentToUI(reply);
              setComments((prev) => {
                if (prev.find((x) => x.id === String(mapped.id))) {
                  console.log('[CommentsModal] Reply already exists:', mapped.id);
                  return prev;
                }
                console.log('[CommentsModal] ✅ Adding reply:', mapped.id);
                return [mapped, ...prev];
              });
            } catch (e) {
              console.error('[CommentsModal] onCommentReplyAdded handler error', e);
            }
          };

          handlers.onCommentReactionChanged = (payload) => {
            try {
              console.log('[CommentsModal] ❤️ CommentReactionChanged event:', payload);
              const commentId = String(payload?.commentId ?? payload?.CommentId);
              const likesCount = Number(payload?.likesCount ?? payload?.LikesCount ?? 0);
              const isLiked = Boolean(payload?.isLiked ?? payload?.IsLiked);

              setComments((prev) =>
                prev.map((item) =>
                  item.id === commentId
                    ? { ...item, likes: likesCount, isLiked: isLiked }
                    : item
                )
              );
            } catch (e) {
              console.error('[CommentsModal] onCommentReactionChanged handler error', e);
            }
          };

          // Register all handlers
          signalRService.onReceiveComment(handlers.onReceiveComment);
          signalRService.onCommentUpdated(handlers.onCommentUpdated);
          signalRService.onCommentDeleted(handlers.onCommentDeleted);
          signalRService.onCommentReplyAdded(handlers.onCommentReplyAdded);
          signalRService.onCommentReactionChanged(handlers.onCommentReactionChanged);
          
          console.log('[CommentsModal] ✅ All handlers registered');
        } catch (error) {
          console.error('[CommentsModal] SignalR connect/join error', error);
        }
      })();
    }

    return () => {
      console.log('[CommentsModal] 🧹 Cleanup: removing handlers for post:', postId);
      (async () => {
        try {
          if (joined) {
            await signalRService.leavePostRoom(postId);
            console.log('[CommentsModal] ✅ Left post room');
          }
        } catch (e) {
          console.error('[CommentsModal] Error leaving post room:', e);
        }
        
        // Remove specific handlers
        try {
          if (handlers.onReceiveComment) {
            signalRService.removeHandler('ReceiveComment', handlers.onReceiveComment);
          }
          if (handlers.onCommentUpdated) {
            signalRService.removeHandler('CommentUpdated', handlers.onCommentUpdated);
          }
          if (handlers.onCommentDeleted) {
            signalRService.removeHandler('CommentDeleted', handlers.onCommentDeleted);
          }
          if (handlers.onCommentReplyAdded) {
            signalRService.removeHandler('CommentReplyAdded', handlers.onCommentReplyAdded);
          }
          if (handlers.onCommentReactionChanged) {
            signalRService.removeHandler('CommentReactionChanged', handlers.onCommentReactionChanged);
          }
          console.log('[CommentsModal] ✅ All handlers removed');
        } catch (e) {
          console.error('[CommentsModal] Error removing handlers:', e);
        }
      })();
    };
  }, [visible, postId]);

  // Helper: map server CommentDto to UI comment format
  const mapServerCommentToUI = (c) => {
    const userIdNum = c.userId != null ? Number(c.userId) : null;
    return {
      id: String(c.commentId),
      userId: Number.isFinite(userIdNum) ? userIdNum : null,
      username: c.username || 'Người dùng',
      avatar: c.userAvatar,
      comment: c.content || '',
      likes: Number(c.likesCount) || 0,
      createdAt: c.createdAt,
      isLiked: Boolean(c.isLiked),
      isEdited: Boolean(c.isEdited),
      parentId: c.parentCommentId ? String(c.parentCommentId) : null,
    };
  };

  const loadComments = async (isRefreshing = false) => {
    try {
      if (isRefreshing) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      console.log('[CommentsModal] 🔄 Loading comments for postId:', postId);
      const response = await getComments(postId);
      console.log('[CommentsModal] 📥 API Response:', JSON.stringify(response, null, 2));

      const commentsData = response?.comments || [];
      console.log('[CommentsModal] 📊 Comments count:', commentsData.length);

      if (commentsData.length > 0) {
        console.log(
          '[CommentsModal] 📝 FIRST COMMENT RAW DATA:',
          JSON.stringify(commentsData[0], null, 2)
        );
      }

      const mappedComments = commentsData.map((c) => {
        const userIdNum = c.userId != null ? Number(c.userId) : null;

        console.log('[CommentsModal] 🔄 Mapping comment:', {
          commentId: c.commentId,
          userId: c.userId,
          userIdNum,
          isFinite: Number.isFinite(userIdNum),
          username: c.username,
        });

        return {
          id: String(c.commentId),
          userId: Number.isFinite(userIdNum) ? userIdNum : null,
          username: c.username || 'Người dùng',
          avatar: c.userAvatar,
          comment: c.content || '',
          likes: Number(c.likesCount) || 0,
          createdAt: c.createdAt,
          isLiked: Boolean(c.isLiked),
          isEdited: Boolean(c.isEdited),
          parentId: c.parentCommentId ? String(c.parentCommentId) : null,
        };
      });

      setComments(mappedComments);
      console.log('[CommentsModal] ✅ Comments loaded successfully');
      
      // Update comment count in PostDetail
      if (onCommentCountChange) {
        onCommentCountChange(mappedComments.length);
      }
    } catch (error) {
      console.error('[CommentsModal] ❌ Load comments error:', error);
      console.error('[CommentsModal] Error details:', error.message);
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

      if (editingComment) {
        // EDITING: Send to backend to save changes
        console.log('[CommentsModal] ✏️ Editing comment:', editingComment.id);

        try {
          await updateComment(editingComment.id, newComment.trim());
          console.log('[CommentsModal] ✅ Comment updated on backend');

          setComments((prev) =>
            prev.map((c) =>
              c.id === editingComment.id
                ? { ...c, comment: newComment.trim(), isEdited: true }
                : c
            )
          );

          setEditingComment(null);
          setNewComment('');
        } catch (error) {
          console.error('[CommentsModal] ❌ Error updating comment:', error);
          alert('Không thể cập nhật bình luận. Vui lòng thử lại.');
          return;
        }
      } else if (replyingTo) {
        // REPLY: Send parentCommentId to backend
        console.log('[CommentsModal] 💬 Replying to:', replyingTo);

        const response = await addComment(postId, newComment.trim(), replyingTo.id);
        console.log(
          '[CommentsModal] 📥 Add reply response:',
          JSON.stringify(response, null, 2)
        );

        const userIdNum =
          response?.userId != null ? Number(response.userId) : currentUserId;

        const newCommentData = {
          id: response?.commentId?.toString() || String(Date.now()),
          userId: userIdNum,
          username: response?.username || 'You',
          avatar: response?.userAvatar,
          comment: response?.content || newComment.trim(),
          likes: response?.likesCount || 0,
          createdAt: response?.createdAt || new Date().toISOString(),
          isLiked: false,
          isEdited: false,
          parentId: response?.parentCommentId
            ? String(response.parentCommentId)
            : replyingTo.id,
        };

        console.log('[CommentsModal] ✅ Reply added:', newCommentData);

        setComments([newCommentData, ...comments]);
        setReplyingTo(null);
        setNewComment('');
      } else {
        // ADD NEW COMMENT
        console.log('[CommentsModal] ➕ Adding comment:', newComment);

        const response = await addComment(postId, newComment.trim(), null);
        console.log(
          '[CommentsModal] 📥 Add comment response:',
          JSON.stringify(response, null, 2)
        );

        const userIdNum =
          response?.userId != null ? Number(response.userId) : currentUserId;

        const newCommentData = {
          id: response?.commentId?.toString() || String(Date.now()),
          userId: userIdNum,
          username: response?.username || 'You',
          avatar: response?.userAvatar,
          comment: response?.content || newComment.trim(),
          likes: response?.likesCount || 0,
          createdAt: response?.createdAt || new Date().toISOString(),
          isLiked: false,
          isEdited: false,
          parentId: response?.parentCommentId ? String(response.parentCommentId) : null,
        };

        console.log('[CommentsModal] ✅ Comment added:', newCommentData);

        setComments([newCommentData, ...comments]);
        setNewComment('');
        
        // Clear external comment text in PostDetail
        if (embedded && onCommentTextChange) {
          onCommentTextChange('');
        }
        
        // Update comment count
        if (onCommentCountChange) {
          onCommentCountChange(comments.length + 1);
        }
      }

      // Callback to update comment count (only when adding new, not editing)
      if (onCommentAdded && !editingComment) {
        onCommentAdded(postId);
      }
    } catch (error) {
      console.error('[CommentsModal] ❌ Error:', error);
      console.error('[CommentsModal] Error details:', error.message);
      alert('Không thể thực hiện. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLikeToggle = async (commentId) => {
    try {
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

      const updateCommentRecursive = (commentsList) => {
        return commentsList.map((comment) => {
          if (comment.id === commentId) {
            return {
              ...comment,
              isLiked: !comment.isLiked,
              likes: comment.isLiked ? Math.max(0, comment.likes - 1) : comment.likes + 1,
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

      if (wasLiked) {
        await removeCommentReaction(commentId);
      } else {
        await addCommentReaction(commentId, 'Like');
      }
    } catch (error) {
      console.error('[CommentsModal] Like comment error:', error);

      const rollbackCommentRecursive = (commentsList) => {
        return commentsList.map((comment) => {
          if (comment.id === commentId) {
            return {
              ...comment,
              isLiked: !comment.isLiked,
              likes: comment.isLiked ? comment.likes + 1 : Math.max(0, comment.likes - 1),
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

  // Handle reply to comment - FLAT 2 LEVELS
  const handleReply = (comment) => {
    let rootParentId = comment.id;
    let rootParentUsername = comment.username;
    let rootParentUserId = comment.userId;

    if (comment.parentId) {
      const rootParent = comments.find((c) => c.id === comment.parentId);
      if (rootParent) {
        rootParentId = rootParent.id;
        rootParentUsername = comment.username;
        rootParentUserId = comment.userId;
      }
    }

    setReplyingTo({
      id: rootParentId,
      username: rootParentUsername,
      userId: rootParentUserId,
    });

    setNewComment(`@${rootParentUsername} `);
    setEditingComment(null);

    const targetRef = embedded ? externalInputRef : inputRef;
    if (targetRef?.current) {
      targetRef.current.focus();
    }
  };

  const cancelReply = () => {
    setReplyingTo(null);
    setNewComment('');
  };

  const handleEdit = (comment) => {
    setEditingComment({ id: comment.id, text: comment.comment });
    setNewComment(comment.comment);
    setReplyingTo(null);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const cancelEdit = () => {
    setEditingComment(null);
    setNewComment('');
  };

  const handleDelete = (comment) => {
    setShowMenuForComment(null);
    if (window.confirm('Bạn có chắc muốn xóa bình luận này?')) {
      (async () => {
        try {
          await deleteComment(comment.id);
          console.log('[CommentsModal] ✅ Comment deleted:', comment.id);
          setComments((prev) => prev.filter((c) => c.id !== comment.id));
        } catch (error) {
          console.error('[CommentsModal] Delete comment error:', error);
          alert('Không thể xóa bình luận.');
        }
      })();
    }
  };

  const toggleCommentMenu = (commentId) => {
    if (showMenuForComment === commentId) {
      setShowMenuForComment(null);
    } else {
      setShowMenuForComment(commentId);
    }
  };

  const handleCopy = (comment) => {
    setShowMenuForComment(null);
    navigator.clipboard.writeText(comment.comment);
    alert('Đã sao chép bình luận');
  };

  const toggleReplies = (commentId) => {
    setExpandedComments((prev) => ({
      ...prev,
      [commentId]: !prev[commentId],
    }));
  };

  const getRepliesCount = (commentId) => {
    return comments.filter((c) => c.parentId === commentId).length;
  };

  const getReplies = (commentId) => {
    return comments.filter((c) => c.parentId === commentId);
  };

  const handleNavigateToProfile = (comment) => {
    const commentUserId = comment?.userId;
    const commentUsername = comment?.username;

    console.log('[CommentsModal] Navigate to profile:', {
      commentUserId,
      currentUserId,
      commentUsername,
    });

    onClose();

    setTimeout(() => {
      const isMyComment =
        currentUserId != null &&
        commentUserId != null &&
        Number(commentUserId) === Number(currentUserId);

      if (isMyComment) {
        console.log('[CommentsModal] Navigate to own Profile');
        navigate('/profile');
      } else {
        console.log('[CommentsModal] Navigate to UserProfile:', {
          userId: commentUserId,
          username: commentUsername,
        });
        navigate(`/user/${commentUserId}`);
      }
    }, 300);
  };

  const handleMentionPress = async (username) => {
    console.log('[CommentsModal] 🔗 Mention clicked:', username);

    onClose();

    setTimeout(async () => {
      let mentionedComment = comments.find((c) => c.username === username);
      let userId = mentionedComment?.userId;

      if (!userId) {
        console.log('[CommentsModal] 🔍 User not in comments, searching by username...');
        try {
          const userProfile = await getUserByUsername(username);
          if (userProfile) {
            userId =
              userProfile.UserId ||
              userProfile.userId ||
              userProfile.user_id ||
              userProfile.id;
            console.log('[CommentsModal] ✅ Found user via API:', {
              username,
              userId,
            });
          } else {
            console.log('[CommentsModal] ⚠️ User not found via API');
          }
        } catch (error) {
          console.error('[CommentsModal] ❌ Error searching user:', error);
        }
      }

      if (userId) {
        const isMyComment =
          currentUserId != null && Number(userId) === Number(currentUserId);

        if (isMyComment) {
          navigate('/profile');
        } else {
          navigate(`/user/${userId}`);
        }
      } else {
        alert(`Người dùng @${username} không tồn tại hoặc đã bị xóa.`);
      }
    }, 300);
  };

  const handleEmojiPress = (emoji) => {
    setNewComment((prev) => prev + emoji);
  };

  // Handle input change
  const handleInputChange = (e) => {
    const text = e.target.value;
    setNewComment(text);
    if (embedded && onCommentTextChange) {
      onCommentTextChange(text);
    }
  };

  // Handle key press (Enter to submit)
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // Handle submit
  const handleSubmit = () => {
    if (newComment.trim() && !submitting) {
      handleAddComment();
    }
  };

  const renderReplyItem = (reply) => {
    const isMenuOpen = showMenuForComment === reply.id;

    return (
      <div key={reply.id} className="reply-item" id={`comment-${reply.id}`}>
        <UserAvatar
          uri={reply.avatar}
          style="reply-avatar"
          onClick={() => handleNavigateToProfile(reply)}
        />

        <div className="comment-content">
          <div className="comment-bubble">
            <div className="comment-header-row">
              <div className="comment-header-left">
                <span
                  className="comment-username"
                  onClick={() => handleNavigateToProfile(reply)}
                >
                  {reply.username}
                </span>
                <span className="comment-time">{getRelativeTime(reply.createdAt)}</span>
              </div>

              <button
                className="more-button"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleCommentMenu(reply.id);
                }}
              >
                <IoEllipsisHorizontal size={18} />
              </button>
            </div>

            <MentionText text={reply.comment} onMentionPress={handleMentionPress} />
            {reply.isEdited && <span className="edited-label">Đã chỉnh sửa</span>}
          </div>

          <div className="comment-actions">
            <button onClick={() => handleReply(reply)} className="comment-action">
              Trả lời
            </button>
          </div>

          {isMenuOpen && (
            <div className="comment-menu">
              {reply.userId === currentUserId && (
                <>
                  <button className="menu-item" onClick={() => handleEdit(reply)}>
                    <IoCreate size={18} />
                    <span>Chỉnh sửa</span>
                  </button>
                  <button
                    className="menu-item delete-item"
                    onClick={() => handleDelete(reply)}
                  >
                    <IoTrash size={18} />
                    <span>Xóa</span>
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        <button className="like-button" onClick={() => handleLikeToggle(reply.id)}>
          <HeartIcon isLiked={reply.isLiked} size={18} />
          {reply.likes > 0 && <span className="like-count">{reply.likes}</span>}
        </button>
      </div>
    );
  };

  const getFilteredComments = () => {
    if (commentFilter === 'recent') {
      return comments
        .filter((c) => !c.parentId)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 10);
    }
    return comments.filter((c) => !c.parentId);
  };

  const renderComment = (item) => {
    if (item.parentId) return null;

    const repliesCount = getRepliesCount(item.id);
    const replies = getReplies(item.id);
    const isExpanded = expandedComments[item.id];
    const showMenu = showMenuForComment === item.id;
    const isHighlighted = highlightedCommentId === item.id;

    return (
      <div
        key={item.id}
        className={`comment-wrapper ${isHighlighted ? 'highlighted' : ''}`}
        id={`comment-${item.id}`}
        onClick={(e) => {
          e.stopPropagation();
          if (showMenu) {
            setShowMenuForComment(null);
          }
        }}
      >
        <div className="comment-item">
          <UserAvatar
            uri={item.avatar}
            style="comment-avatar"
            onClick={() => handleNavigateToProfile(item)}
          />

          <div className="comment-content">
            <div className="comment-bubble">
              <div className="comment-header-row">
                <div className="comment-header-left">
                  <span
                    className="comment-username"
                    onClick={() => handleNavigateToProfile(item)}
                  >
                    {item.username}
                  </span>
                  <span className="comment-time">{getRelativeTime(item.createdAt)}</span>
                </div>
              </div>

              <MentionText text={item.comment} onMentionPress={handleMentionPress} />
              {item.isEdited && <span className="edited-label">Đã chỉnh sửa</span>}
            </div>

            <div className="comment-actions">
              <button onClick={() => handleReply(item)} className="comment-action">
                Trả lời
              </button>
            </div>

            {repliesCount > 0 && (
              <button className="view-replies-button" onClick={() => toggleReplies(item.id)}>
                <div className="view-replies-line"></div>
                <span className="view-replies-text">
                  {isExpanded ? 'Ẩn câu trả lời' : `Xem ${repliesCount} câu trả lời`}
                </span>
              </button>
            )}
          </div>

          <div className="comment-right-actions">
            <button
              className="more-button"
              onClick={(e) => {
                e.stopPropagation();
                toggleCommentMenu(item.id);
              }}
            >
              <IoEllipsisHorizontal size={18} />
            </button>
            
            <button className="like-button" onClick={() => handleLikeToggle(item.id)}>
              <HeartIcon isLiked={item.isLiked} size={20} />
              {item.likes > 0 && <span className="like-count">{item.likes}</span>}
            </button>
          </div>
        </div>

        {isExpanded && replies.length > 0 && (
          <div className="replies-container">
            {replies.map((reply) => renderReplyItem(reply))}
          </div>
        )}
      </div>
    );
  };

  if (!visible && !embedded) return null;

  // Embedded mode renders without modal overlay
  if (embedded) {
    return (
      <div className="embedded-comments-container">
        {/* Comments List */}
        {loading ? (
          <div className="loading-container-embed">
            <div className="spinner"></div>
          </div>
        ) : comments.length === 0 ? (
          <div className="empty-container-embed">
            <p className="empty-text">Chưa có bình luận</p>
          </div>
        ) : (
          <div className="comments-list-embed">
            {getFilteredComments().map((item) => renderComment(item))}
          </div>
        )}

        {/* Comment Input - Hidden in embedded mode because PostDetail has its own */}
        {!embedded && (
        <div className="input-container-embed">
          {replyingTo && (
            <div className="replying-indicator-embed">
              <span>Đang trả lời @{replyingTo.username}</span>
              <button onClick={() => setReplyingTo(null)}>×</button>
            </div>
          )}
          {editingComment && (
            <div className="editing-indicator-embed">
              <span>Đang chỉnh sửa</span>
              <button onClick={() => setEditingComment(null)}>×</button>
            </div>
          )}
          <div className="input-row-embed">
            <textarea
              ref={inputRef}
              className="comment-input-embed"
              placeholder="Thêm bình luận..."
              value={newComment}
              onChange={handleInputChange}
              onKeyPress={handleKeyPress}
              maxLength={500}
              rows={1}
            />
            {newComment.trim().length > 0 && (
              <button
                className="send-button-embed"
                onClick={handleSubmit}
                disabled={submitting}
              >
                <IoSend size={24} color="#0095f6" />
              </button>
            )}
          </div>
        </div>
        )}

        {/* Global Menu */}
        {showMenuForComment &&
          (() => {
            const comment = comments.find((c) => c.id === showMenuForComment);
            if (!comment) return null;

            const commentUserId = comment.userId != null ? Number(comment.userId) : null;
            const isOwner =
              currentUserId != null &&
              commentUserId != null &&
              commentUserId === currentUserId;

            return (
              <div className="global-menu-overlay" onClick={() => setShowMenuForComment(null)}>
                <div className="global-menu-dropdown" onClick={(e) => e.stopPropagation()}>
                  <button className="menu-option" onClick={() => handleCopy(comment)}>
                    <IoCopy size={18} />
                    <span>Sao chép</span>
                  </button>

                  {isOwner && (
                    <>
                      <button
                        className="menu-option"
                        onClick={() => {
                          setShowMenuForComment(null);
                          handleEdit(comment);
                        }}
                      >
                        <IoCreate size={18} />
                        <span>Chỉnh sửa</span>
                      </button>
                      <button
                        className="menu-option danger"
                        onClick={() => handleDelete(comment)}
                      >
                        <IoTrash size={18} />
                        <span>Xóa</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })()}
      </div>
    );
  }

  // Full modal mode
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content instagram-layout" onClick={(e) => e.stopPropagation()}>
        {/* Left Side - Post Media */}
        {post && (
          <div className="modal-left-panel">
            {post.mediaUrls && post.mediaUrls.length > 0 && (
              post.mediaUrls[0].endsWith('.mp4') || post.mediaUrls[0].includes('video') ? (
                <video
                  src={post.mediaUrls[0].startsWith('http') ? post.mediaUrls[0] : `${API_BASE_URL}${post.mediaUrls[0]}`}
                  className="post-media-image"
                  controls
                  loop
                />
              ) : (
                <img
                  src={post.mediaUrls[0].startsWith('http') ? post.mediaUrls[0] : `${API_BASE_URL}${post.mediaUrls[0]}`}
                  alt="Post"
                  className="post-media-image"
                />
              )
            )}
          </div>
        )}

        {/* Right Side - Comments */}
        <div className="modal-right-panel">
          {/* Header */}
          <div className="modal-header">
            <h2 className="modal-title">Bình luận</h2>
            <button className="modal-close-btn" onClick={onClose}>
              <IoClose size={24} />
            </button>
          </div>

          {/* Filter Tabs - giống Facebook */}
          {!loading && comments.length > 0 && (
            <div className="filter-container">
              <button
                className={`filter-tab ${commentFilter === 'recent' ? 'filter-tab-active' : ''}`}
                onClick={() => setCommentFilter('recent')}
              >
                <span className={`filter-tab-text ${commentFilter === 'recent' ? 'filter-tab-text-active' : ''}`}>
                  Mới nhất
                </span>
              </button>

              <button
                className={`filter-tab ${commentFilter === 'all' ? 'filter-tab-active' : ''}`}
                onClick={() => setCommentFilter('all')}
              >
                <span className={`filter-tab-text ${commentFilter === 'all' ? 'filter-tab-text-active' : ''}`}>
                  Tất cả bình luận
                </span>
              </button>
            </div>
          )}

          {/* Comments List */}
          {loading ? (
            <div className="loading-container">
              <div className="spinner"></div>
              <p className="loading-text">Đang tải bình luận...</p>
            </div>
          ) : comments.length === 0 ? (
            <div className="empty-container">
              <IoChatbubbleOutline size={48} color="#ccc" className="empty-icon" />
              <p className="empty-text">Chưa có bình luận nào</p>
              <p className="empty-subtext">Hãy là người đầu tiên bình luận</p>
            </div>
          ) : (
            <div className="comments-list" ref={commentListRef}>
              {getFilteredComments().map((item) => renderComment(item))}
            </div>
          )}

          {/* Emoji Bar */}
          <div className="emoji-bar">
            {['❤️', '🙏', '🔥', '👏', '😢', '😍', '😮', '😂'].map((emoji) => (
              <button
                key={emoji}
                className="emoji-button"
                onClick={() => handleEmojiPress(emoji)}
              >
                {emoji}
              </button>
            ))}
          </div>

          {/* Input */}
          <div className="input-container">
            {(replyingTo || editingComment) && (
              <div className="reply-banner">
                <div className="reply-banner-content">
                  {editingComment ? <IoCreate size={18} color="#8E8E8E" /> : <IoSend size={18} color="#8E8E8E" />}
                  <span className="reply-banner-text">
                    {editingComment
                      ? 'Đang chỉnh sửa bình luận'
                      : `Đang trả lời @${replyingTo.username}`}
                  </span>
                </div>
                <button
                  className="reply-banner-close"
                  onClick={editingComment ? cancelEdit : cancelReply}
                >
                  <IoClose size={18} />
                </button>
              </div>
            )}

            <div className="input-row">
              <UserAvatar uri={currentUserAvatar} style="input-avatar" />
              <textarea
                ref={inputRef}
                className="comment-input"
                placeholder={
                  editingComment
                    ? 'Chỉnh sửa bình luận...'
                    : replyingTo
                    ? `Trả lời @${replyingTo.username}...`
                    : 'Bắt đầu trò chuyện... (dùng @username để tag)'
                }
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (newComment.trim().length > 0 && !submitting) {
                      handleAddComment();
                    }
                  }
                }}
                disabled={submitting}
                maxLength={500}
                rows={1}
              />
              {submitting ? (
                <div className="spinner-small"></div>
              ) : newComment.trim().length > 0 ? (
                <button 
                  className="send-button send-icon-btn" 
                  onClick={handleAddComment}
                  title={editingComment ? 'Lưu' : 'Gửi'}
                >
                  <IoSend className="send-icon" />
                </button>
              ) : null}
            </div>
            <div className="char-counter">{newComment.length}/500</div>
          </div>
        </div>

        {/* Global Menu */}
        {showMenuForComment &&
          (() => {
            const comment = comments.find((c) => c.id === showMenuForComment);
            if (!comment) return null;

            const commentUserId = comment.userId != null ? Number(comment.userId) : null;
            const isOwner =
              currentUserId != null &&
              commentUserId != null &&
              commentUserId === currentUserId;

            return (
              <div className="global-menu-overlay" onClick={() => setShowMenuForComment(null)}>
                <div className="global-menu-dropdown" onClick={(e) => e.stopPropagation()}>
                  <button className="menu-option" onClick={() => handleCopy(comment)}>
                    <i className="far fa-copy"></i>
                    <span>Sao chép</span>
                  </button>

                  {isOwner && (
                    <>
                      <button
                        className="menu-option"
                        onClick={() => {
                          setShowMenuForComment(null);
                          handleEdit(comment);
                        }}
                      >
                        <i className="fas fa-edit"></i>
                        <span>Chỉnh sửa</span>
                      </button>
                      <button
                        className="menu-option danger"
                        onClick={() => handleDelete(comment)}
                      >
                        <i className="fas fa-trash"></i>
                        <span>Xóa</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })()}
      </div>
    </div>
  );
};

export default CommentsModal;
