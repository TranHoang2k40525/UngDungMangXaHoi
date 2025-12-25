import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { getPostById, deletePost, updatePostCaption, updatePostPrivacy, addReaction, getReactionSummary } from '../../Api/Api';
import { useUser } from '../../context/UserContext';
import { getRelativeTime } from '../../Utils/timeUtils';
import MentionText from '../../Components/MentionText';
import ReactionsListModal from './ReactionsListModal';
import './PostDetail.css';

const PostDetail = () => {
  const { postId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user: currentUser } = useUser();
  
  const [post, setPost] = useState(location.state?.post || null);
  const [loading, setLoading] = useState(!post);
  const [error, setError] = useState(null);
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  const [showOptions, setShowOptions] = useState(false);
  const [showEditCaption, setShowEditCaption] = useState(false);
  const [editedCaption, setEditedCaption] = useState('');
  const [showPrivacySelector, setShowPrivacySelector] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showReactionsModal, setShowReactionsModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [reactionSummary, setReactionSummary] = useState(null);
  const [loadingReactions, setLoadingReactions] = useState(false);
  const commentsContainerRef = useRef(null);

  useEffect(() => {
    if (!post) {
      loadPost();
    } else {
      loadReactionSummary();
    }
  }, [postId]);

  const loadPost = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await getPostById(postId);
      const postData = result?.data || result;
      setPost(postData);
      if (postData) {
        loadReactionSummary();
      }
    } catch (err) {
      console.error('[PostDetail] Load error:', err);
      setError(err.message || 'Không thể tải bài đăng');
    } finally {
      setLoading(false);
    }
  };

  const loadReactionSummary = async () => {
    try {
      setLoadingReactions(true);
      const summary = await getReactionSummary(postId);
      setReactionSummary(summary);
    } catch (err) {
      console.error('[PostDetail] Load reactions error:', err);
    } finally {
      setLoadingReactions(false);
    }
  };

  const handleReaction = async (reactionType) => {
    try {
      await addReaction(postId, reactionType);
      await loadReactionSummary();
      
      // Update post state
      setPost(prev => ({
        ...prev,
        userReaction: reactionType,
      }));
    } catch (err) {
      console.error('[PostDetail] Reaction error:', err);
      alert('Không thể thả cảm xúc');
    }
  };

  const handleDeletePost = async () => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa bài đăng này?')) {
      return;
    }

    try {
      setIsDeleting(true);
      await deletePost(postId);
      navigate(-1);
    } catch (err) {
      console.error('[PostDetail] Delete error:', err);
      alert(err.message || 'Không thể xóa bài đăng');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSaveCaption = async () => {
    try {
      await updatePostCaption(postId, editedCaption);
      setPost(prev => ({ ...prev, caption: editedCaption }));
      setShowEditCaption(false);
    } catch (err) {
      console.error('[PostDetail] Update caption error:', err);
      alert('Không thể cập nhật chú thích');
    }
  };

  const handleUpdatePrivacy = async (newPrivacy) => {
    try {
      await updatePostPrivacy(postId, newPrivacy);
      setPost(prev => ({ ...prev, privacy: newPrivacy }));
      setShowPrivacySelector(false);
    } catch (err) {
      console.error('[PostDetail] Update privacy error:', err);
      alert('Không thể cập nhật quyền riêng tư');
    }
  };

  const getReactionEmoji = (reactionType) => {
    switch (reactionType) {
      case 1: return '❤️';
      case 2: return '😍';
      case 3: return '😂';
      case 4: return '😮';
      case 5: return '😢';
      case 6: return '😠';
      default: return '❤️';
    }
  };

  const getTotalReactions = () => {
    if (!reactionSummary) return 0;
    return Object.values(reactionSummary).reduce((sum, count) => sum + count, 0);
  };

  const getTopReactions = () => {
    if (!reactionSummary) return [];
    return Object.entries(reactionSummary)
      .filter(([_, count]) => count > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([type, _]) => parseInt(type));
  };

  if (loading) {
    return (
      <div className="post-detail-container">
        <div className="post-detail-loading">
          <div className="loading-spinner" />
          <div className="loading-text">Đang tải...</div>
        </div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="post-detail-container">
        <div className="post-detail-error">
          <div className="error-icon">⚠️</div>
          <div className="error-text">{error || 'Không tìm thấy bài đăng'}</div>
          <button className="error-back-button" onClick={() => navigate(-1)}>
            Quay lại
          </button>
        </div>
      </div>
    );
  }

  const isOwner = currentUser && currentUser.userId === post.userId;
  const mediaUrls = post.mediaUrls || [];
  const hasMultipleMedia = mediaUrls.length > 1;

  return (
    <div className="post-detail-container">
      {/* Header */}
      <div className="post-detail-header">
        <button className="back-button" onClick={() => navigate(-1)}>
          ←
        </button>
        <h1 className="header-title">Bài đăng</h1>
        {isOwner && (
          <button className="options-button" onClick={() => setShowOptions(!showOptions)}>
            ⋮
          </button>
        )}
      </div>

      {/* Options Menu */}
      {showOptions && isOwner && (
        <div className="options-overlay" onClick={() => setShowOptions(false)}>
          <div className="options-menu" onClick={(e) => e.stopPropagation()}>
            <button className="option-item" onClick={() => {
              setEditedCaption(post.caption || '');
              setShowEditCaption(true);
              setShowOptions(false);
            }}>
              ✏️ Chỉnh sửa chú thích
            </button>
            <button className="option-item" onClick={() => {
              setShowPrivacySelector(true);
              setShowOptions(false);
            }}>
              🔒 Thay đổi quyền riêng tư
            </button>
            <button className="option-item danger" onClick={handleDeletePost} disabled={isDeleting}>
              🗑️ Xóa bài đăng
            </button>
            <button className="option-item cancel" onClick={() => setShowOptions(false)}>
              Hủy
            </button>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="post-detail-content">
        {/* User Info */}
        <div className="post-user-info">
          <div 
            className="user-info-left"
            onClick={() => {
              if (isOwner) {
                navigate('/profile');
              } else {
                navigate(`/profile/${post.userId}`);
              }
            }}
            style={{ cursor: 'pointer' }}
          >
            {post.userAvatar ? (
              <img src={post.userAvatar} alt={post.userName} className="user-avatar" />
            ) : (
              <div className="user-avatar user-avatar-placeholder">
                {post.userName?.[0]?.toUpperCase() || '?'}
              </div>
            )}
            <div className="user-text-info">
              <div className="user-name">{post.userName}</div>
              <div className="post-time">{getRelativeTime(post.createdAt)}</div>
            </div>
          </div>
        </div>

        {/* Media Gallery */}
        {mediaUrls.length > 0 && (
          <div className="media-gallery">
            <div className="media-container">
              {mediaUrls[currentMediaIndex]?.endsWith('.mp4') || 
               mediaUrls[currentMediaIndex]?.includes('video') ? (
                <video
                  src={mediaUrls[currentMediaIndex]}
                  className="media-content"
                  controls
                  autoPlay
                  loop
                />
              ) : (
                <img
                  src={mediaUrls[currentMediaIndex]}
                  alt={`Media ${currentMediaIndex + 1}`}
                  className="media-content"
                />
              )}
            </div>

            {hasMultipleMedia && (
              <>
                <button
                  className="media-nav-button prev"
                  onClick={() => setCurrentMediaIndex(prev => Math.max(0, prev - 1))}
                  disabled={currentMediaIndex === 0}
                >
                  ‹
                </button>
                <button
                  className="media-nav-button next"
                  onClick={() => setCurrentMediaIndex(prev => Math.min(mediaUrls.length - 1, prev + 1))}
                  disabled={currentMediaIndex === mediaUrls.length - 1}
                >
                  ›
                </button>
                <div className="media-indicators">
                  {mediaUrls.map((_, index) => (
                    <div
                      key={index}
                      className={`media-indicator ${index === currentMediaIndex ? 'active' : ''}`}
                      onClick={() => setCurrentMediaIndex(index)}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* Actions Bar */}
        <div className="post-actions-bar">
          <div className="action-buttons">
            <button 
              className={`action-button ${post.userReaction ? 'active' : ''}`}
              onClick={() => handleReaction(post.userReaction ? 0 : 1)}
            >
              {post.userReaction ? getReactionEmoji(post.userReaction) : '🤍'}
            </button>
            <button className="action-button" onClick={() => commentsContainerRef.current?.scrollIntoView({ behavior: 'smooth' })}>
              💬
            </button>
            <button className="action-button" onClick={() => setShowShareModal(true)}>
              📤
            </button>
          </div>
        </div>

        {/* Reactions Summary */}
        {getTotalReactions() > 0 && (
          <div className="reactions-summary" onClick={() => setShowReactionsModal(true)}>
            <div className="reaction-emojis">
              {getTopReactions().map((type, index) => (
                <span key={type} className="reaction-emoji" style={{ zIndex: 10 - index }}>
                  {getReactionEmoji(type)}
                </span>
              ))}
            </div>
            <div className="reaction-count">{getTotalReactions()} cảm xúc</div>
          </div>
        )}

        {/* Caption */}
        {post.caption && (
          <div className="post-caption">
            <span className="caption-username">{post.userName}</span>
            <MentionText text={post.caption} />
          </div>
        )}

        {/* Location */}
        {post.location && (
          <div className="post-location">
            📍 {post.location}
          </div>
        )}

        {/* Privacy */}
        <div className="post-privacy">
          {post.privacy === 'public' && '🌐 Công khai'}
          {post.privacy === 'friends' && '👥 Bạn bè'}
          {post.privacy === 'private' && '🔒 Riêng tư'}
        </div>

        {/* Comments Section - Placeholder for now */}
        <div ref={commentsContainerRef} className="comments-section">
          <div className="comments-header">
            <h3>Bình luận</h3>
          </div>
          <div className="comments-placeholder">
            Phần bình luận sẽ được tích hợp sau
          </div>
        </div>
      </div>

      {/* Edit Caption Modal */}
      {showEditCaption && (
        <div className="modal-overlay" onClick={() => setShowEditCaption(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Chỉnh sửa chú thích</h3>
              <button className="modal-close" onClick={() => setShowEditCaption(false)}>✕</button>
            </div>
            <div className="modal-body">
              <textarea
                className="edit-caption-textarea"
                value={editedCaption}
                onChange={(e) => setEditedCaption(e.target.value)}
                placeholder="Viết chú thích..."
                rows={4}
              />
            </div>
            <div className="modal-footer">
              <button className="modal-button cancel" onClick={() => setShowEditCaption(false)}>Hủy</button>
              <button className="modal-button primary" onClick={handleSaveCaption}>Lưu</button>
            </div>
          </div>
        </div>
      )}

      {/* Privacy Selector Modal */}
      {showPrivacySelector && (
        <div className="modal-overlay" onClick={() => setShowPrivacySelector(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Quyền riêng tư</h3>
              <button className="modal-close" onClick={() => setShowPrivacySelector(false)}>✕</button>
            </div>
            <div className="modal-body">
              <button 
                className={`privacy-option ${post.privacy === 'public' ? 'active' : ''}`}
                onClick={() => handleUpdatePrivacy('public')}
              >
                <span className="privacy-icon">🌐</span>
                <span className="privacy-text">Công khai</span>
              </button>
              <button 
                className={`privacy-option ${post.privacy === 'friends' ? 'active' : ''}`}
                onClick={() => handleUpdatePrivacy('friends')}
              >
                <span className="privacy-icon">👥</span>
                <span className="privacy-text">Bạn bè</span>
              </button>
              <button 
                className={`privacy-option ${post.privacy === 'private' ? 'active' : ''}`}
                onClick={() => handleUpdatePrivacy('private')}
              >
                <span className="privacy-icon">🔒</span>
                <span className="privacy-text">Riêng tư</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reactions List Modal */}
      {showReactionsModal && (
        <ReactionsListModal
          postId={postId}
          onClose={() => setShowReactionsModal(false)}
        />
      )}
    </div>
  );
};

export default PostDetail;
