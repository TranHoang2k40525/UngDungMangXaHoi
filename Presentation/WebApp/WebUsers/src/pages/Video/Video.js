import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  getReels, 
  getFollowingReels, 
  API_BASE_URL, 
  getAuthHeaders,
  addReaction,
  getReactionSummary,
  deletePost,
  updatePostPrivacy,
  updatePostCaption
} from '../../API/Api';
import NavigationBar from '../../components/NavigationBar';
import CommentsModal from '../Home/CommentsModal';
import { MdArrowBack, MdCameraAlt, MdFavorite, MdFavoriteBorder, MdComment, MdMoreVert, MdVideoLibrary, MdPlayArrow, MdBookmark, MdBookmarkBorder, MdClose } from 'react-icons/md';
import { IoEllipsisHorizontal, IoLockClosed, IoPeople, IoEarth } from 'react-icons/io5';
import './Video.css';

export default function Video() {
  const navigate = useNavigate();
  const [reels, setReels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [activeTab, setActiveTab] = useState('reels'); // 'reels' or 'following'
  const videoRefs = useRef({});
  const containerRef = useRef(null);
  const [videoStates, setVideoStates] = useState({}); // { [postId]: { playing, liked, likes, saved, reactionType, comments } }
  
  // Comments state - sử dụng CommentsModal
  const [commentsModalVisible, setCommentsModalVisible] = useState(false);
  const [commentsPostId, setCommentsPostId] = useState(null);

  // Menu state - giống trang chủ
  const [showOptions, setShowOptions] = useState(false);
  const [optionsPostId, setOptionsPostId] = useState(null);
  const [showPrivacySheet, setShowPrivacySheet] = useState(false);
  const [editingCaptionPostId, setEditingCaptionPostId] = useState(null);
  const [captionDraft, setCaptionDraft] = useState('');
  const [currentUserId, setCurrentUserId] = useState(null);

  // Get current user
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const userStr = localStorage.getItem('user');
        if (userStr) {
          const user = JSON.parse(userStr);
          setCurrentUserId(user.id);
        }
      } catch (error) {
        console.error('Error getting current user:', error);
      }
    };
    fetchCurrentUser();
  }, []);

  useEffect(() => {
    loadReels(true);
  }, [activeTab]);

  const loadReels = async (refresh = false) => {
    try {
      if (refresh) {
        setLoading(true);
        setCurrentPage(1);
      } else {
        setLoadingMore(true);
      }

      const page = refresh ? 1 : currentPage + 1;
      const pageSize = 10;
      
      // Use appropriate API based on active tab
      const fetchFn = activeTab === 'following' ? getFollowingReels : getReels;
      
      // Use getReels API like MobileApp
      console.log('[Video] Loading reels - page:', page, 'pageSize:', pageSize);
      const response = await getReels(page, pageSize);
      console.log('[Video] API response:', response);
      
      // Handle different response structures
      let reelsList = [];
      if (Array.isArray(response)) {
        reelsList = response;
      } else if (response?.data && Array.isArray(response.data)) {
        reelsList = response.data;
      } else if (response?.items && Array.isArray(response.items)) {
        reelsList = response.items;
      }
      
      console.log('[Video] Processed reels list:', reelsList.length, 'videos');
      
      if (refresh) {
        setReels(reelsList);
        setCurrentPage(1);
      } else {
        setReels(prev => [...prev, ...reelsList]);
        setCurrentPage(page);
      }
      
      setHasMore(reelsList.length >= pageSize);

      // Initialize video states and load reactions
      const states = {};
      for (const reel of reelsList) {
        try {
          // Load reaction data from API
          const reactionData = await getReactionSummary(reel.id);
          states[reel.id] = {
            playing: false,
            liked: reactionData?.userReaction != null,
            likes: Number(reactionData?.totalReactions ?? reel?.totalReactions ?? 0),
            reactionType: reactionData?.userReaction,
            saved: false,
            comments: Number(reel?.commentsCount ?? 0)
          };
        } catch (error) {
          console.error(`Error loading reactions for reel ${reel.id}:`, error);
          states[reel.id] = {
            playing: false,
            liked: false,
            likes: reel.totalReactions || 0,
            reactionType: null,
            saved: false,
            comments: Number(reel?.commentsCount ?? 0)
          };
        }
      }
      setVideoStates(prev => ({ ...prev, ...states }));

    } catch (error) {
      console.error('Load reels error:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };


  const handleScroll = (e) => {
    const container = e.target;
    const scrollPosition = container.scrollTop;
    const videoHeight = container.clientHeight;
    const newIndex = Math.round(scrollPosition / videoHeight);
    
    if (newIndex !== currentIndex && newIndex < reels.length) {
      // Pause previous video
      const prevVideo = videoRefs.current[currentIndex];
      if (prevVideo) {
        prevVideo.pause();
        setVideoStates(prev => ({
          ...prev,
          [reels[currentIndex]?.id]: { ...prev[reels[currentIndex]?.id], playing: false }
        }));
      }

      setCurrentIndex(newIndex);
      
      // Play new video
      const newVideo = videoRefs.current[newIndex];
      if (newVideo) {
        newVideo.play().catch(err => console.log('Play error:', err));
        setVideoStates(prev => ({
          ...prev,
          [reels[newIndex]?.id]: { ...prev[reels[newIndex]?.id], playing: true }
        }));
      }
    }

    // Load more when near bottom
    if (container.scrollHeight - container.scrollTop <= container.clientHeight * 1.5) {
      if (hasMore && !loadingMore) {
        loadReels(false);
      }
    }
  };

  const togglePlayPause = (index) => {
    const video = videoRefs.current[index];
    const reel = reels[index];
    if (!video || !reel) return;

    const isPlaying = videoStates[reel.id]?.playing;
    if (isPlaying) {
      video.pause();
    } else {
      video.play().catch(err => console.log('Play error:', err));
    }

    setVideoStates(prev => ({
      ...prev,
      [reel.id]: { ...prev[reel.id], playing: !isPlaying }
    }));
  };

  const handleLike = async (reel) => {
    try {
      const currentState = videoStates[reel.id] || {};
      const isLiked = currentState.liked;

      // Optimistic update
      setVideoStates(prev => ({
        ...prev,
        [reel.id]: {
          ...prev[reel.id],
          liked: !isLiked,
          likes: (currentState.likes || 0) + (isLiked ? -1 : 1),
          reactionType: isLiked ? null : 'Like'
        }
      }));

      // API call
      if (!isLiked) {
        await addReaction(reel.id, 'Like');
      } else {
        await addReaction(reel.id, 'None'); // Remove reaction
      }

      // Refresh reaction summary to get accurate count
      const reactionData = await getReactionSummary(reel.id);
      setVideoStates(prev => ({
        ...prev,
        [reel.id]: {
          ...prev[reel.id],
          liked: reactionData?.userReaction != null,
          likes: Number(reactionData?.totalReactions ?? 0),
          reactionType: reactionData?.userReaction
        }
      }));
    } catch (error) {
      console.error('Error toggling like:', error);
      // Revert on error
      const reactionData = await getReactionSummary(reel.id);
      setVideoStates(prev => ({
        ...prev,
        [reel.id]: {
          ...prev[reel.id],
          liked: reactionData?.userReaction != null,
          likes: Number(reactionData?.totalReactions ?? 0),
          reactionType: reactionData?.userReaction
        }
      }));
    }
  };

  const handleComment = (reel) => {
    setCommentsPostId(reel.id);
    setCommentsModalVisible(true);
  };

  const handleCommentAdded = (postId) => {
    // Update comment count
    setVideoStates(prev => ({
      ...prev,
      [postId]: {
        ...prev[postId],
        comments: (prev[postId]?.comments || 0) + 1
      }
    }));
  };

  const handleSaveToggle = (reel) => {
    setVideoStates(prev => {
      const currentState = prev[reel.id] || {};
      return {
        ...prev,
        [reel.id]: {
          ...currentState,
          saved: !currentState.saved
        }
      };
    });
  };

  // Menu handlers - giống trang chủ
  const isOwner = (reel) => {
    return currentUserId != null && reel?.user?.id != null && Number(currentUserId) === Number(reel.user.id);
  };

  const openOptionsFor = (reel) => {
    setOptionsPostId(reel.id);
    setShowOptions(true);
    setShowPrivacySheet(false);
    setEditingCaptionPostId(null);
  };

  const closeAllOverlays = () => {
    setShowOptions(false);
    setShowPrivacySheet(false);
    setEditingCaptionPostId(null);
    setOptionsPostId(null);
  };

  const confirmDelete = async () => {
    if (!optionsPostId) return;
    if (!window.confirm('Bạn có chắc muốn xóa video này?')) return;

    try {
      await deletePost(optionsPostId);
      setReels(prev => prev.filter(r => r.id !== optionsPostId));
      closeAllOverlays();
      alert('Đã xóa video thành công');
    } catch (error) {
      console.error('Error deleting post:', error);
      alert('Không thể xóa video. Vui lòng thử lại.');
    }
  };

  const startEditCaption = (reel) => {
    setEditingCaptionPostId(reel.id);
    setCaptionDraft(reel.caption || '');
    setShowOptions(false);
  };

  const submitCaptionEdit = async () => {
    if (!editingCaptionPostId) return;

    try {
      await updatePostCaption(editingCaptionPostId, captionDraft.trim());
      
      // Update local state
      setReels(prev => prev.map(r => 
        r.id === editingCaptionPostId ? { ...r, caption: captionDraft.trim() } : r
      ));
      
      closeAllOverlays();
      alert('Đã cập nhật caption thành công');
    } catch (error) {
      console.error('Error updating caption:', error);
      alert('Không thể cập nhật caption. Vui lòng thử lại.');
    }
  };

  const pickPrivacy = async (privacy) => {
    if (!optionsPostId) return;

    try {
      await updatePostPrivacy(optionsPostId, privacy);
      
      // Update local state
      setReels(prev => prev.map(r => 
        r.id === optionsPostId ? { ...r, privacy } : r
      ));
      
      closeAllOverlays();
      alert('Đã cập nhật quyền riêng tư');
    } catch (error) {
      console.error('Error updating privacy:', error);
      alert('Không thể cập nhật quyền riêng tư. Vui lòng thử lại.');
    }
  };

  const handleSendComment = () => {
    if (!commentText.trim()) return;
    // TODO: Send comment to API
    console.log('Send comment:', commentText);
    setCommentText('');
  };

  const handleMore = (reel) => {
    // TODO: Show more options
    console.log('More options for:', reel.id);
  };

  const getVideoUrl = (reel) => {
    // Log full structure for debugging
    console.log('[Video] Full Reel object:', reel);
    console.log('[Video] Media array:', reel?.media);
    console.log('[Video] Media array length:', reel?.media?.length);
    
    // Handle different API response structures
    // Backend returns: { id, caption, user, media: [{type, url, altUrl}], ... }
    let videoUrl = null;
    
    // First check: media array (current backend structure)
    if (Array.isArray(reel?.media) && reel.media.length > 0) {
      console.log('[Video] Media items:', JSON.stringify(reel.media, null, 2));
      // Backend returns "Video" with capital V, so we need case-insensitive comparison
      const videoMedia = reel.media.find(m => m.type?.toLowerCase() === 'video');
      console.log('[Video] Video media found:', videoMedia);
      if (videoMedia) {
        videoUrl = videoMedia.altUrl || videoMedia.url; // Prefer altUrl (compat version) if available
        console.log('[Video] Found video in media array:', videoUrl);
      }
    }
    
    // Fallback: Check other possible field names
    if (!videoUrl) {
      videoUrl = reel?.videoUrl || 
                 reel?.video_url || 
                 reel?.videoUrls?.[0] || 
                 reel?.video_urls?.[0] ||
                 reel?.mediaUrls?.[0]?.url;
    }
    
    if (!videoUrl) {
      console.warn('[Video] No video URL found for reel:', reel?.id);
      console.warn('[Video] Available fields:', Object.keys(reel || {}));
      return null;
    }
    
    // Video URL already includes full path from backend
    const fullUrl = videoUrl.startsWith('http') ? videoUrl : `${API_BASE_URL}${videoUrl}`;
    console.log('[Video] Final video URL:', fullUrl);
    return fullUrl;
  };

  const getUserAvatar = (reel) => {
    const avatar = reel?.user?.avatarUrl || reel?.user?.avatar_url;
    if (!avatar) return null;
    // Avatar URL already includes full path from backend (starts with http)
    return avatar;
  };

  // Auto-play first video when loaded
  useEffect(() => {
    if (reels.length > 0 && !loading) {
      const firstVideo = videoRefs.current[0];
      if (firstVideo) {
        firstVideo.play().catch(err => console.log('Auto-play error:', err));
        setVideoStates(prev => ({
          ...prev,
          [reels[0]?.id]: { ...prev[reels[0]?.id], playing: true }
        }));
      }
    }
  }, [reels.length, loading]);


  if (loading) {
    return (
      <div className="video-container">
        <NavigationBar />
        <div className="video-loading">Đang tải...</div>
      </div>
    );
  }

  return (
    <div className="video-page">
      <NavigationBar />
      
      {/* Header with tabs */}
      <div className="video-header">
        <button className="video-back-btn" onClick={() => navigate(-1)}>
          <MdArrowBack />
        </button>
        <div className="video-tabs">
          <button 
            className={`video-tab ${activeTab === 'reels' ? 'active' : ''}`}
            onClick={() => setActiveTab('reels')}
          >
            Reels
          </button>
          <button 
            className={`video-tab ${activeTab === 'following' ? 'active' : ''}`}
            onClick={() => setActiveTab('following')}
          >
            Đang theo dõi
          </button>
        </div>
        <button className="video-camera-btn" onClick={() => navigate('/create-post')}>
          <MdCameraAlt />
        </button>
      </div>

      {/* Videos */}
      <div 
        className="video-container" 
        onScroll={handleScroll}
        ref={containerRef}
      >
        <div className="video-feed">
          {reels.length > 0 ? (
            reels.map((reel, index) => {
              const videoUrl = getVideoUrl(reel);
              const avatarUrl = getUserAvatar(reel);
              const state = videoStates[reel.id] || {};
              
              return (
                <div key={reel.id || index} className="video-item">
                  {videoUrl ? (
                    <>
                      <video
                        ref={(el) => (videoRefs.current[index] = el)}
                        src={videoUrl}
                        className="video-player"
                        loop
                        playsInline
                        onClick={() => togglePlayPause(index)}
                      />
                      
                      {/* Play/Pause overlay */}
                      {!state.playing && (
                        <div className="video-play-overlay" onClick={() => togglePlayPause(index)}>
                          <MdPlayArrow className="play-icon" />
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="video-error">Video không khả dụng</div>
                  )}
                  
                  {/* Video Info */}
                  <div className="video-info">
                    <div className="video-user" onClick={() => navigate(`/profile/${reel.user?.id}`)}>
                      {avatarUrl ? (
                        <img 
                          src={avatarUrl} 
                          alt={reel.user?.username}
                          className="video-user-avatar"
                        />
                      ) : (
                        <div className="video-user-avatar-placeholder">
                          {reel.user?.username?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                      )}
                      <span className="video-user-name">{reel.user?.username || 'Unknown'}</span>
                    </div>
                    {reel.caption && (
                      <p className="video-caption">{reel.caption}</p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="video-actions">
                    <button 
                      className="video-action-btn"
                      onClick={() => handleLike(reel)}
                    >
                      {state.liked ? (
                        <MdFavorite className="action-icon liked" />
                      ) : (
                        <MdFavoriteBorder className="action-icon" />
                      )}
                      <span className="action-count">{state.likes || 0}</span>
                    </button>
                    <button 
                      className="video-action-btn"
                      onClick={() => handleComment(reel)}
                    >
                      <MdComment className="action-icon" />
                      <span className="action-count">{state.comments || 0}</span>
                    </button>
                    <button 
                      className="video-action-btn"
                      onClick={() => handleSaveToggle(reel)}
                    >
                      {state.saved ? (
                        <MdBookmark className="action-icon saved" />
                      ) : (
                        <MdBookmarkBorder className="action-icon" />
                      )}
                    </button>
                    <button 
                      className="video-action-btn"
                      onClick={() => openOptionsFor(reel)}
                    >
                      <IoEllipsisHorizontal className="action-icon" size={24} />
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="video-empty">
              <MdVideoLibrary className="empty-icon" />
              <p>Chưa có video nào</p>
            </div>
          )}
          
          {loadingMore && (
            <div className="video-loading-more">Đang tải thêm...</div>
          )}
        </div>
      </div>

      {/* CommentsModal - giống trang chủ */}
      <CommentsModal
        visible={commentsModalVisible}
        onClose={() => {
          setCommentsModalVisible(false);
          setCommentsPostId(null);
        }}
        postId={commentsPostId}
        post={reels.find(r => r.id === commentsPostId)}
        onCommentAdded={handleCommentAdded}
      />

      {/* Options Menu Modal - giống trang chủ */}
      {showOptions && optionsPostId && (
        <div className="overlay" onClick={closeAllOverlays}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-title">Tùy chọn</div>
            {isOwner(reels.find(r => r.id === optionsPostId)) ? (
              <>
                <button className="sheet-item" onClick={() => {
                  const reel = reels.find(r => r.id === optionsPostId);
                  if (reel) {
                    setShowPrivacySheet(true);
                    setShowOptions(false);
                  }
                }}>
                  <span>Chỉnh sửa quyền riêng tư</span>
                </button>
                <button className="sheet-item" onClick={() => {
                  const reel = reels.find(r => r.id === optionsPostId);
                  if (reel) startEditCaption(reel);
                }}>
                  <span>Chỉnh sửa caption</span>
                </button>
                <button className="sheet-item danger" onClick={confirmDelete}>
                  <span>Xóa bài viết</span>
                </button>
              </>
            ) : (
              <>
                <button className="sheet-item" onClick={() => {
                  alert('Chức năng báo cáo đang được phát triển');
                  closeAllOverlays();
                }}>
                  <span>Báo cáo</span>
                </button>
                <button className="sheet-item" onClick={() => {
                  alert('Đã ẩn bài viết');
                  closeAllOverlays();
                }}>
                  <span>Ẩn bài viết</span>
                </button>
              </>
            )}
            <button className="sheet-item" onClick={closeAllOverlays}>
              <span>Hủy</span>
            </button>
          </div>
        </div>
      )}

      {/* Privacy Sheet - giống trang chủ */}
      {showPrivacySheet && (
        <div className="overlay" onClick={closeAllOverlays}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-title">Chọn quyền riêng tư</div>
            <button className="sheet-item" onClick={() => pickPrivacy('public')}>
              <span>Công khai</span>
            </button>
            <button className="sheet-item" onClick={() => pickPrivacy('followers')}>
              <span>Người theo dõi</span>
            </button>
            <button className="sheet-item" onClick={() => pickPrivacy('private')}>
              <span>Riêng tư</span>
            </button>
            <button className="sheet-item" onClick={closeAllOverlays}>
              <span>Hủy</span>
            </button>
          </div>
        </div>
      )}

      {/* Edit Caption Modal - giống trang chủ */}
      {editingCaptionPostId && (
        <div className="overlay" onClick={closeAllOverlays}>
          <div className="edit-caption-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-title">Chỉnh sửa caption</div>
            <textarea
              value={captionDraft}
              onChange={(e) => setCaptionDraft(e.target.value)}
              placeholder="Viết caption của bạn..."
              maxLength={500}
            />
            <div className="caption-counter">{captionDraft.length}/500</div>
            <div className="edit-caption-actions">
              <button onClick={closeAllOverlays}>Hủy</button>
              <button onClick={submitCaptionEdit}>Lưu</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
