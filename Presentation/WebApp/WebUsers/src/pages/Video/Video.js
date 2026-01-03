import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getReels, getFollowingReels, API_BASE_URL, getAuthHeaders } from '../../API/Api';
import NavigationBar from '../../components/NavigationBar';
import { MdArrowBack, MdCameraAlt, MdFavorite, MdFavoriteBorder, MdComment, MdMoreVert, MdVideoLibrary, MdPlayArrow, MdBookmark, MdBookmarkBorder, MdClose, MdSend } from 'react-icons/md';
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
  const [videoStates, setVideoStates] = useState({}); // { [postId]: { playing, liked, likes, saved } }
  
  // Comments state
  const [showComments, setShowComments] = useState(false);
  const [selectedReel, setSelectedReel] = useState(null);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');

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

      // Initialize video states
      const states = {};
      reelsList.forEach(reel => {
        states[reel.id] = {
          playing: false,
          liked: false,
          likes: reel.totalReactions || 0
        };
      });
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
    // TODO: Implement like API call
    setVideoStates(prev => {
      const currentState = prev[reel.id] || {};
      const isLiked = currentState.liked;
      return {
        ...prev,
        [reel.id]: {
          ...currentState,
          liked: !isLiked,
          likes: (currentState.likes || 0) + (isLiked ? -1 : 1)
        }
      };
    });
  };

  const handleComment = (reel) => {
    setSelectedReel(reel);
    setShowComments(true);
    // TODO: Load comments from API
    setComments([
      // Mock data for now
      { id: 1, user: { username: 'user1', avatar: null }, text: 'Video hay quá!', likes: 10 },
      { id: 2, user: { username: 'user2', avatar: null }, text: 'Tuyệt vời', likes: 5 },
    ]);
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
      const videoMedia = reel.media.find(m => m.type === 'video');
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
                      <span className="action-count">{reel.totalComments || 0}</span>
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
                      onClick={() => handleMore(reel)}
                    >
                      <MdMoreVert className="action-icon" />
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

      {/* Comments Panel - TikTok Style */}
      {showComments && (
        <div className="comments-overlay" onClick={() => setShowComments(false)}>
          <div className="comments-panel" onClick={(e) => e.stopPropagation()}>
            <div className="comments-header">
              <h3>{selectedReel?.totalComments || 0} bình luận</h3>
              <button className="comments-close" onClick={() => setShowComments(false)}>
                <MdClose />
              </button>
            </div>
            
            <div className="comments-list">
              {comments.length > 0 ? (
                comments.map(comment => (
                  <div key={comment.id} className="comment-item">
                    <div className="comment-avatar">
                      {comment.user.avatar ? (
                        <img src={comment.user.avatar} alt={comment.user.username} />
                      ) : (
                        <div className="comment-avatar-placeholder">
                          {comment.user.username.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="comment-content">
                      <div className="comment-user">{comment.user.username}</div>
                      <div className="comment-text">{comment.text}</div>
                      <div className="comment-meta">
                        <span className="comment-time">1 giờ trước</span>
                        <button className="comment-reply">Trả lời</button>
                        <button className="comment-like">{comment.likes} thích</button>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="comments-empty">Chưa có bình luận nào</div>
              )}
            </div>
            
            <div className="comments-input-container">
              <input
                type="text"
                className="comments-input"
                placeholder="Thêm bình luận..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendComment()}
              />
              <button 
                className="comments-send" 
                onClick={handleSendComment}
                disabled={!commentText.trim()}
              >
                <MdSend />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
