import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { createShare, API_BASE_URL } from '../../api/Api';
import { getRelativeTime } from '../../Utils/timeUtils';
import './SharePost.css';

const SharePost = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const post = location.state?.post;
  
  const [caption, setCaption] = useState('');
  const [privacy, setPrivacy] = useState('public');
  const [loading, setLoading] = useState(false);

  const MAX_CAPTION_LENGTH = 2000;

  if (!post) {
    return (
      <div className="share-post-container">
        <div className="share-post-error">
          <div className="error-icon">⚠️</div>
          <div className="error-text">Không tìm thấy bài đăng</div>
          <button className="error-back-button" onClick={() => navigate(-1)}>
            Quay lại
          </button>
        </div>
      </div>
    );
  }

  const handleShare = async () => {
    if (!post?.id && !post?.postId) {
      alert('Không thể chia sẻ bài đăng này');
      return;
    }

    try {
      setLoading(true);
      
      const postId = post.id || post.postId;
      const result = await createShare({
        postId,
        caption: caption.trim(),
        privacy,
      });

      console.log('[SharePost] Share created:', result);
      
      // Navigate back to home
      navigate('/', { replace: true });
    } catch (error) {
      console.error('[SharePost] Error:', error);
      alert(error.message || 'Không thể chia sẻ bài đăng. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const mediaUrls = post.mediaUrls || [];
  const firstMedia = mediaUrls[0] || null;
  const isVideo = firstMedia && (firstMedia.endsWith('.mp4') || firstMedia.includes('video'));

  return (
    <div className="share-post-container">
      {/* Header */}
      <div className="share-post-header">
        <button 
          className="header-button back-button" 
          onClick={() => navigate(-1)}
          disabled={loading}
        >
          ←
        </button>
        <h1 className="header-title">Chia sẻ bài đăng</h1>
        <button 
          className="header-button share-button"
          onClick={handleShare}
          disabled={loading}
        >
          {loading ? 'Đang chia sẻ...' : 'Chia sẻ'}
        </button>
      </div>

      {/* Content */}
      <div className="share-post-content">
        {/* Caption Input */}
        <div className="caption-section">
          <textarea
            className="caption-textarea"
            placeholder="Viết điều gì đó về bài đăng này..."
            value={caption}
            onChange={(e) => {
              if (e.target.value.length <= MAX_CAPTION_LENGTH) {
                setCaption(e.target.value);
              }
            }}
            disabled={loading}
            rows={4}
          />
          <div className="caption-counter">
            {caption.length}/{MAX_CAPTION_LENGTH}
          </div>
        </div>

        {/* Privacy Selector */}
        <div className="privacy-section">
          <label className="privacy-label">Quyền riêng tư</label>
          <select
            className="privacy-select"
            value={privacy}
            onChange={(e) => setPrivacy(e.target.value)}
            disabled={loading}
          >
            <option value="public">🌐 Công khai</option>
            <option value="friends">👥 Bạn bè</option>
            <option value="private">🔒 Riêng tư</option>
          </select>
        </div>

        {/* Original Post Preview */}
        <div className="original-post-preview">
          <div className="preview-label">Bài đăng gốc</div>
          <div className="preview-card">
            {/* User Info */}
            <div className="preview-user-info">
              {post.userAvatar ? (
                <img 
                  src={post.userAvatar.startsWith('http') ? post.userAvatar : `${API_BASE_URL}${post.userAvatar}`} 
                  alt={post.userName} 
                  className="preview-avatar" 
                />
              ) : (
                <div className="preview-avatar preview-avatar-placeholder">
                  {post.userName?.[0]?.toUpperCase() || '?'}
                </div>
              )}
              <div className="preview-user-text">
                <div className="preview-username">{post.userName}</div>
                <div className="preview-time">{getRelativeTime(post.createdAt)}</div>
              </div>
            </div>

            {/* Caption */}
            {post.caption && (
              <div className="preview-caption">
                {post.caption.length > 150 
                  ? `${post.caption.slice(0, 150)}...` 
                  : post.caption}
              </div>
            )}

            {/* Media Preview */}
            {firstMedia && (
              <div className="preview-media-container">
                {isVideo ? (
                  <video
                    src={firstMedia}
                    className="preview-media"
                    controls={false}
                    muted
                  />
                ) : (
                  <img
                    src={firstMedia}
                    alt="Post media"
                    className="preview-media"
                  />
                )}
                {mediaUrls.length > 1 && (
                  <div className="media-count-badge">
                    +{mediaUrls.length - 1}
                  </div>
                )}
              </div>
            )}

            {/* Post Stats */}
            <div className="preview-stats">
              {post.reactionCount > 0 && (
                <span className="stat-item">❤️ {post.reactionCount}</span>
              )}
              {post.commentCount > 0 && (
                <span className="stat-item">💬 {post.commentCount}</span>
              )}
              {post.shareCount > 0 && (
                <span className="stat-item">📤 {post.shareCount}</span>
              )}
            </div>
          </div>
        </div>

        {/* Share Info */}
        <div className="share-info">
          <div className="info-icon">ℹ️</div>
          <div className="info-text">
            Bài đăng được chia sẻ sẽ hiển thị trên dòng thời gian của bạn với 
            bài đăng gốc được nhúng bên trong.
          </div>
        </div>
      </div>

      {/* Loading Overlay */}
      {loading && (
        <div className="loading-overlay">
          <div className="loading-spinner" />
          <div className="loading-text">Đang chia sẻ...</div>
        </div>
      )}
    </div>
  );
};

export default SharePost;
