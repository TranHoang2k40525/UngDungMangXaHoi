import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { getPostById, getUserPostsById, deletePost, updatePostCaption, updatePostPrivacy, addReaction, getReactionSummary, API_BASE_URL } from '../../api/Api';
import { useUser } from '../../context/UserContext';
import { getRelativeTime } from '../../Utils/timeUtils';
import MentionText from '../../Components/MentionText';
import ReactionsListModal from './ReactionsListModal';
import CommentsModal from './CommentsModal';
import { MdArrowBack, MdMoreVert, MdEdit, MdDelete, MdClose, MdPublic, MdPeople, MdLock, MdLocationOn, MdArrowForward, MdArrowBackIos } from 'react-icons/md';
import { IoWarning, IoSend, IoChatbubbleOutline, IoHeartOutline, IoHeart } from 'react-icons/io5';
import './PostDetail.css';

// Reaction Picker Component
const ReactionPicker = ({ visible, position, onSelectReaction, onClose }) => {
  if (!visible) return null;

  const reactions = [
    { type: 1, emoji: '❤️', label: 'Like' },
    { type: 2, emoji: '😍', label: 'Love' },
    { type: 3, emoji: '😂', label: 'Haha' },
    { type: 4, emoji: '😮', label: 'Wow' },
    { type: 5, emoji: '😢', label: 'Sad' },
    { type: 6, emoji: '😠', label: 'Angry' },
  ];

  return (
    <>
      <div className="reaction-picker-overlay" onClick={onClose} />
      <div className="reaction-picker" style={{ top: position.top, left: position.left }}>
        {reactions.map(({ type, emoji }) => (
          <button
            key={type}
            className="reaction-btn"
            onClick={(e) => {
              e.stopPropagation();
              onSelectReaction(type);
            }}
          >
            {emoji}
          </button>
        ))}
      </div>
    </>
  );
};

const PostDetail = ({ posts: propsPosts, initialIndex: propsInitialIndex, userId: propsUserId, onClose: propsOnClose }) => {
  const { postId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user: currentUser } = useUser();
  
  // If props are provided, use modal mode; otherwise use route mode
  const isModalMode = propsPosts !== undefined;
  
  // Support multiple posts mode (from profile) or single post mode
  const locationState = location.state || {};
  const userId = isModalMode ? propsUserId : locationState.userId;
  const initialIndex = isModalMode ? (propsInitialIndex || 0) : (locationState.initialIndex || 0);
  const singlePostMode = isModalMode ? false : !userId; // If no userId, load single post by postId
  
  const [posts, setPosts] = useState([]);
  const [currentPostIndex, setCurrentPostIndex] = useState(initialIndex);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  const [showOptions, setShowOptions] = useState(false);
  const [showEditCaption, setShowEditCaption] = useState(false);
  const [editedCaption, setEditedCaption] = useState('');
  const [showPrivacySelector, setShowPrivacySelector] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showReactionsModal, setShowReactionsModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [reactionSummaries, setReactionSummaries] = useState({});
  const [loadingReactions, setLoadingReactions] = useState(false);
  const commentsContainerRef = useRef(null);
  
  // Reaction picker state
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [reactionPickerPosition, setReactionPickerPosition] = useState({ top: 0, left: 0 });
  const likeButtonRef = useRef(null);
  
  const currentPost = posts[currentPostIndex] || null;

  useEffect(() => {
    if (isModalMode) {
      // Use posts from props directly
      setPosts(propsPosts || []);
      setCurrentPostIndex(propsInitialIndex || 0);
      setLoading(false);
      
      // Load reactions
      if (propsPosts && propsPosts.length > 0) {
        loadAllReactionSummaries(propsPosts);
      }
    } else {
      // Load from API (route mode)
      loadPosts();
    }
  }, [postId, userId, isModalMode, propsPosts]);

  const loadPosts = async () => {
    try {
      setLoading(true);
      setError(null);
      
      let postsData = [];
      
      if (singlePostMode) {
        // Load single post by ID
        const result = await getPostById(postId);
        const postData = result?.data || result;
        postsData = postData ? [postData] : [];
      } else {
        // Load all posts by user ID
        postsData = await getUserPostsById(userId);
        postsData = Array.isArray(postsData) ? postsData : [];
      }
      
      console.log('[PostDetail] Loaded posts data:', postsData);
      
      setPosts(postsData);
      
      // Load reactions for all posts
      if (postsData.length > 0) {
        await loadAllReactionSummaries(postsData);
      }
    } catch (err) {
      console.error('[PostDetail] Load error:', err);
      setError(err.message || 'Không thể tải bài đăng');
    } finally {
      setLoading(false);
    }
  };

  const loadAllReactionSummaries = async (postsArray) => {
    try {
      const summaries = {};
      for (const post of postsArray) {
        try {
          const summary = await getReactionSummary(post.id);
          summaries[post.id] = summary;
        } catch (err) {
          console.error(`[PostDetail] Load reactions error for post ${post.id}:`, err);
          summaries[post.id] = null;
        }
      }
      setReactionSummaries(summaries);
    } catch (err) {
      console.error('[PostDetail] Load reactions error:', err);
    }
  };

  const loadReactionSummary = async (postId) => {
    try {
      const summary = await getReactionSummary(postId);
      setReactionSummaries(prev => ({ ...prev, [postId]: summary }));
    } catch (err) {
      console.error('[PostDetail] Load reaction error:', err);
    }
  };

  const handleReaction = async (reactionType) => {
    if (!currentPost) return;
    try {
      await addReaction(currentPost.id, reactionType);
      await loadReactionSummary(currentPost.id);
      
      // Update post state
      setPosts(prev => prev.map(p => 
        p.id === currentPost.id ? { ...p, userReaction: reactionType } : p
      ));
    } catch (err) {
      console.error('[PostDetail] Reaction error:', err);
      alert('Không thể thả cảm xúc');
    }
  };

  const handleLongPressStart = (e) => {
    if (!likeButtonRef.current) return;
    const rect = likeButtonRef.current.getBoundingClientRect();
    setReactionPickerPosition({
      top: rect.top - 60,
      left: rect.left - 100
    });
    setShowReactionPicker(true);
  };

  const handleReactionSelect = (reactionType) => {
    handleReaction(reactionType);
    setShowReactionPicker(false);
  };

  const handleQuickReaction = () => {
    if (showReactionPicker) return;
    handleReaction(currentPost.userReaction ? 0 : 1);
  };

  const handleDeletePost = async () => {
    if (!currentPost || !window.confirm('Bạn có chắc chắn muốn xóa bài đăng này?')) {
      return;
    }

    try {
      setIsDeleting(true);
      await deletePost(currentPost.id);
      
      // Remove from posts array
      const newPosts = posts.filter(p => p.id !== currentPost.id);
      if (newPosts.length === 0) {
        navigate(-1);
      } else {
        setPosts(newPosts);
        if (currentPostIndex >= newPosts.length) {
          setCurrentPostIndex(newPosts.length - 1);
        }
      }
    } catch (err) {
      console.error('[PostDetail] Delete error:', err);
      alert(err.message || 'Không thể xóa bài đăng');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSaveCaption = async () => {
    if (!currentPost) return;
    try {
      await updatePostCaption(currentPost.id, editedCaption);
      setPosts(prev => prev.map(p => 
        p.id === currentPost.id ? { ...p, caption: editedCaption } : p
      ));
      setShowEditCaption(false);
    } catch (err) {
      console.error('[PostDetail] Update caption error:', err);
      alert('Không thể cập nhật chú thích');
    }
  };

  const handleUpdatePrivacy = async (newPrivacy) => {
    if (!currentPost) return;
    try {
      await updatePostPrivacy(currentPost.id, newPrivacy);
      setPosts(prev => prev.map(p => 
        p.id === currentPost.id ? { ...p, privacy: newPrivacy } : p
      ));
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
    if (!currentPost) return 0;
    const summary = reactionSummaries[currentPost.id];
    if (!summary) return 0;
    return Object.values(summary).reduce((sum, count) => sum + count, 0);
  };

  const getTopReactions = () => {
    if (!currentPost) return [];
    const summary = reactionSummaries[currentPost.id];
    if (!summary) return [];
    return Object.entries(summary)
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

  if (error || !currentPost) {
    return (
      <div className="post-detail-container">
        <div className="post-detail-error">
          <div className="error-icon"><IoWarning size={48} /></div>
          <div className="error-text">{error || 'Không tìm thấy bài đăng'}</div>
          <button className="error-back-button" onClick={() => isModalMode ? propsOnClose() : navigate(-1)}>
            Quay lại
          </button>
        </div>
      </div>
    );
  }

  // Helper: Get current user ID
  const getCurrentUserId = () => {
    if (!currentUser) return null;
    const userId = currentUser.userId || currentUser.user_id || currentUser.UserId || currentUser.id;
    return userId != null ? Number(userId) : null;
  };

  // Helper: Get post owner ID
  const getPostOwnerId = (post) => {
    if (!post) return null;
    // Try nested user.id first (from Home feed)
    if (post.user && post.user.id != null) {
      return Number(post.user.id);
    }
    // Try flat userId (from Profile or direct API)
    const ownerId = post.userId || post.user_id || post.UserId;
    return ownerId != null ? Number(ownerId) : null;
  };

  const isOwner = () => {
    const currentId = getCurrentUserId();
    const postOwnerId = getPostOwnerId(currentPost);
    const result = Number.isFinite(currentId) && Number.isFinite(postOwnerId) && currentId === postOwnerId;
    console.log('[PostDetail] isOwner check:', { currentId, postOwnerId, result, currentPost });
    return result;
  };
  
  // Extract media from post.media array
  const mediaArray = currentPost.media || [];
  const mediaUrls = mediaArray.map(m => {
    const url = m.url || m.Url || m.mediaUrl || '';
    return url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
  });
  
  console.log('[PostDetail] Current post:', currentPost);
  console.log('[PostDetail] Media array:', mediaArray);
  console.log('[PostDetail] Media URLs:', mediaUrls);
  
  const hasMultipleMedia = mediaUrls.length > 1;
  const hasPrevPost = currentPostIndex > 0;
  const hasNextPost = currentPostIndex < posts.length - 1;

  const handleCloseModal = () => {
    if (isModalMode) {
      propsOnClose();
    } else {
      navigate(-1);
    }
  };

  return (
    <div 
      className="post-detail-container instagram-layout"
      onClick={handleCloseModal}
    >
      {/* Close Button */}
      <button 
        className="close-button-overlay" 
        onClick={(e) => {
          e.stopPropagation();
          handleCloseModal();
        }}
      >
        <MdClose size={32} />
      </button>

      {/* Previous Post Button */}
      {hasPrevPost && (
        <button 
          className="post-nav-button left"
          onClick={(e) => {
            e.stopPropagation();
            setCurrentPostIndex(prev => prev - 1);
            setCurrentMediaIndex(0);
          }}
          title="Bài đăng trước"
        >
          <MdArrowBackIos size={24} />
        </button>
      )}

      {/* Next Post Button */}
      {hasNextPost && (
        <button 
          className="post-nav-button right"
          onClick={(e) => {
            e.stopPropagation();
            setCurrentPostIndex(prev => prev + 1);
            setCurrentMediaIndex(0);
          }}
          title="Bài đăng tiếp theo"
        >
          <MdArrowForward size={24} />
        </button>
      )}

      {/* Content Wrapper */}
      <div className="instagram-content-wrapper" onClick={(e) => e.stopPropagation()}>
        {/* Left Side - Media Content */}
        <div className="post-media-section">
        {mediaUrls.length > 0 && (
          <div className="media-display">
            {(() => {
              const currentMedia = mediaArray[currentMediaIndex];
              const mediaType = (currentMedia?.type || currentMedia?.Type || '').toLowerCase();
              const isVideo = mediaType === 'video' || mediaUrls[currentMediaIndex]?.includes('.mp4');
              
              return isVideo ? (
                <video
                  src={mediaUrls[currentMediaIndex]}
                  className="media-content-full"
                  controls
                  autoPlay
                  loop
                />
              ) : (
                <img
                  src={mediaUrls[currentMediaIndex]}
                  alt={`Media ${currentMediaIndex + 1}`}
                  className="media-content-full"
                />
              );
            })()}

            {hasMultipleMedia && (
              <>
                {currentMediaIndex > 0 && (
                  <button
                    className="media-nav-left"
                    onClick={() => setCurrentMediaIndex(prev => prev - 1)}
                  >
                    <MdArrowBackIos size={24} />
                  </button>
                )}
                {currentMediaIndex < mediaUrls.length - 1 && (
                  <button
                    className="media-nav-right"
                    onClick={() => setCurrentMediaIndex(prev => prev + 1)}
                  >
                    <MdArrowForward size={24} />
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Right Side - Post Info & Comments */}
      <div className="post-info-section">
        {/* Header with User Info */}
        <div className="post-header-info">
          <div 
            className="user-info-clickable"
            onClick={() => {
              if (isOwner()) {
                navigate('/profile');
              } else {
                const postOwnerId = getPostOwnerId(currentPost);
                navigate(`/user/${postOwnerId}`);
              }
            }}
          >
            {currentPost.userAvatar && (
              <img src={currentPost.userAvatar} alt={currentPost.userName} className="user-avatar-small" />
            )}
            <div className="user-name-info">
              <span className="username-bold">{currentPost.userName}</span>
              {currentPost.location && (
                <span className="location-text">{currentPost.location}</span>
              )}
            </div>
          </div>
          
          {/* Nút 3 chấm - hiển thị cho tất cả users */}
          <button className="more-options-btn" onClick={() => setShowOptions(!showOptions)}>
            <MdMoreVert size={24} />
          </button>
        </div>

        {/* Options Menu */}
        {showOptions && (
          <div className="options-dropdown">
            {isOwner() ? (
              <>
                <button className="option-item" onClick={() => {
                  setEditedCaption(currentPost.caption || '');
                  setShowEditCaption(true);
                  setShowOptions(false);
                }}>
                  <MdEdit size={18} /> Chỉnh sửa chú thích
                </button>
                <button className="option-item" onClick={() => {
                  setShowPrivacySelector(true);
                  setShowOptions(false);
                }}>
                  <MdLock size={18} /> Thay đổi quyền riêng tư
                </button>
                <button className="option-item danger" onClick={handleDeletePost} disabled={isDeleting}>
                  <MdDelete size={18} /> Xóa bài đăng
                </button>
              </>
            ) : (
              <>
                <button className="option-item" onClick={() => {
                  alert('Chức năng báo cáo đang được phát triển');
                  setShowOptions(false);
                }}>
                  <IoWarning size={18} /> Báo cáo bài viết
                </button>
                <button className="option-item" onClick={() => {
                  alert('Đã ẩn bài viết');
                  setShowOptions(false);
                }}>
                  <MdClose size={18} /> Ẩn bài viết
                </button>
              </>
            )}
            <button className="option-item" onClick={() => setShowOptions(false)}>
              <MdClose size={18} /> Hủy
            </button>
          </div>
        )}

        {/* Caption & Comments Area */}
        <div className="comments-area">
          {/* Caption as first comment */}
          {currentPost.caption && (
            <div className="caption-comment">
              {currentPost.userAvatar && (
                <div className="comment-avatar">
                  <img src={currentPost.userAvatar} alt={currentPost.userName} />
                </div>
              )}
              <div className="comment-content">
                <div className="comment-text">
                  <span className="comment-username">{currentPost.userName}</span>
                  {' '}
                  <MentionText text={currentPost.caption} />
                </div>
                <div className="comment-time">{getRelativeTime(currentPost.createdAt)}</div>
              </div>
            </div>
          )}

          {/* Integrated Comments */}
          <div ref={commentsContainerRef} className="embedded-comments">
            <CommentsModal 
              visible={true}
              postId={currentPost.id} 
              post={currentPost}
              onClose={() => {}}
              embedded={true}
            />
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="post-actions-bottom">
          {/* Action Buttons */}
          <div className="action-buttons-row">
            <button 
              ref={likeButtonRef}
              className={`action-btn ${currentPost.userReaction ? 'active' : ''}`}
              onClick={handleQuickReaction}
              onMouseDown={(e) => {
                e.preventDefault();
                const timer = setTimeout(() => handleLongPressStart(e), 500);
                e.currentTarget.dataset.timer = timer;
              }}
              onMouseUp={(e) => {
                const timer = e.currentTarget.dataset.timer;
                if (timer) clearTimeout(timer);
              }}
              onMouseLeave={(e) => {
                const timer = e.currentTarget.dataset.timer;
                if (timer) clearTimeout(timer);
              }}
              onTouchStart={(e) => {
                const timer = setTimeout(() => handleLongPressStart(e), 500);
                e.currentTarget.dataset.timer = timer;
              }}
              onTouchEnd={(e) => {
                const timer = e.currentTarget.dataset.timer;
                if (timer) clearTimeout(timer);
              }}
            >
              {currentPost.userReaction ? (
                <span className="reaction-emoji">{getReactionEmoji(currentPost.userReaction)}</span>
              ) : (
                <IoHeartOutline className="icon" size={24} />
              )}
            </button>
            <button className="action-btn" onClick={() => commentsContainerRef.current?.scrollIntoView({ behavior: 'smooth' })}>
              <IoChatbubbleOutline className="icon" size={24} />
            </button>
            <button className="action-btn" onClick={() => setShowShareModal(true)}>
              <IoSend className="icon" size={24} />
            </button>
          </div>

          {/* Reactions Summary */}
          {getTotalReactions() > 0 && (
            <div className="reactions-count" onClick={() => setShowReactionsModal(true)}>
              <strong>{getTotalReactions().toLocaleString()}</strong> lượt thích
            </div>
          )}

          {/* Time & Privacy */}
          <div className="post-metadata">
            <span className="time-text">{getRelativeTime(currentPost.createdAt)}</span>
            {' · '}
            <span className="privacy-text">
              {currentPost.privacy === 'public' && 'Công khai'}
              {currentPost.privacy === 'friends' && 'Bạn bè'}
              {currentPost.privacy === 'private' && 'Riêng tư'}
            </span>
          </div>
        </div>
      </div>
      {/* End of instagram-content-wrapper */}
      </div>

      {/* Edit Caption Modal */}
      {showEditCaption && (
        <div className="modal-overlay" onClick={() => setShowEditCaption(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Chỉnh sửa chú thích</h3>
              <button className="modal-close" onClick={() => setShowEditCaption(false)}><MdClose size={24} /></button>
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
              <button className="modal-close" onClick={() => setShowPrivacySelector(false)}><MdClose size={24} /></button>
            </div>
            <div className="modal-body">
              <button 
                className={`privacy-option ${currentPost.privacy === 'public' ? 'active' : ''}`}
                onClick={() => handleUpdatePrivacy('public')}
              >
                <span className="privacy-icon"><MdPublic size={24} /></span>
                <span className="privacy-text">Công khai</span>
              </button>
              <button 
                className={`privacy-option ${currentPost.privacy === 'friends' ? 'active' : ''}`}
                onClick={() => handleUpdatePrivacy('friends')}
              >
                <span className="privacy-icon"><MdPeople size={24} /></span>
                <span className="privacy-text">Bạn bè</span>
              </button>
              <button 
                className={`privacy-option ${currentPost.privacy === 'private' ? 'active' : ''}`}
                onClick={() => handleUpdatePrivacy('private')}
              >
                <span className="privacy-icon"><MdLock size={24} /></span>
                <span className="privacy-text">Riêng tư</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reactions List Modal */}
      {showReactionsModal && currentPost && (
        <ReactionsListModal
          postId={currentPost.id}
          onClose={() => setShowReactionsModal(false)}
        />
      )}

      {/* Reaction Picker */}
      <ReactionPicker
        visible={showReactionPicker}
        position={reactionPickerPosition}
        onSelectReaction={handleReactionSelect}
        onClose={() => setShowReactionPicker(false)}
      />
    </div>
  );
};

export default PostDetail;
