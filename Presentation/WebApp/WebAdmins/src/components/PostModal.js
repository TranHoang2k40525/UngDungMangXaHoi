import './PostModal.css';
import { FiHeart, FiMessageSquare, FiRepeat, FiBarChart2, FiX } from 'react-icons/fi';

export default function PostModal({ post, onClose }) {
  if (!post) return null;

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleString('vi-VN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleOverlayClick = (e) => {
    if (e.target.className === 'post-modal-overlay') {
      onClose();
    }
  };

  return (
    <div className="post-modal-overlay" onClick={handleOverlayClick}>
      <div className="post-modal">
        <div className="post-modal-header">
          <h2>Chi tiết bài đăng</h2>
          <button className="btn-close" onClick={onClose} aria-label="Đóng">
            <FiX aria-hidden="true" />
          </button>
        </div>

        <div className="post-modal-content">
          {/* Author Info */}
          <div className="post-author-section">
            <div className="author-avatar">
              {(() => {
                // support multiple DTO shapes: post.user.avatarUrl or post.AuthorAvatar
                const avatar = post.user?.avatarUrl || post.AuthorAvatar || post.user?.avatarUrl || post.author?.avatar || post.user?.avatarUrl;
                const name = post.user?.fullName || post.user?.username || post.AuthorName || post.author?.fullName || '';
                if (avatar) return <img src={avatar} alt={name} />;
                return (
                  <div className="avatar-placeholder">
                    {(name || post.AuthorName || post.AuthorUsername || '').charAt(0)?.toUpperCase()}
                  </div>
                );
              })()}
            </div>
            <div className="author-details">
              <h3>{post.user?.fullName || post.AuthorName || post.user?.username}</h3>
              <p className="author-username">@{post.user?.username || post.AuthorUsername}</p>
              <p className="post-date">{formatDate(post.createdAt || post.CreatedAt)}</p>
            </div>
          </div>

          {/* Post Content */}
          <div className="post-content-section">
            <h4>Nội dung bài đăng:</h4>
            <div className="post-text">
              {post.caption || post.Content || post.Caption || ''}
            </div>
          </div>

          {/* Post Images */}
          {(() => {
            // Support backend DTO: post.media = [{ type, url, altUrl }]
            const mediaArr = post.media || post.Media || null;
            if (Array.isArray(mediaArr) && mediaArr.length > 0) {
              const images = mediaArr.filter(m => !m.type || !m.type.toLowerCase().startsWith('video'));
              const videos = mediaArr.filter(m => m.type && m.type.toLowerCase().startsWith('video'));
              return (
                <>
                  {images.length > 0 && (
                    <div className="post-images-section">
                      <h4>Hình ảnh ({images.length}):</h4>
                      <div className="post-images-grid">
                        {images.map((m, i) => (
                          <img key={i} src={m.url || m} alt={`Image ${i + 1}`} className="post-image" />
                        ))}
                      </div>
                    </div>
                  )}

                  {videos.length > 0 && (
                    <div className="post-videos-section">
                      <h4>Video ({videos.length}):</h4>
                      <div className="post-videos-grid">
                        {videos.map((m, i) => (
                          <video key={i} src={m.url || m} controls className="post-video" />
                        ))}
                      </div>
                    </div>
                  )}
                </>
              );
            }

            // fallback to older fields: Images / Videos arrays or MediaUrls
            if (post.Images && post.Images.length > 0) {
              return (
                <div className="post-images-section">
                  <h4>Hình ảnh ({post.Images.length}):</h4>
                  <div className="post-images-grid">
                    {post.Images.map((image, index) => (
                      <img key={index} src={image.ImageUrl || image} alt={`Image ${index + 1}`} className="post-image" />
                    ))}
                  </div>
                </div>
              );
            }

            if (post.Videos && post.Videos.length > 0) {
              return (
                <div className="post-videos-section">
                  <h4>Video ({post.Videos.length}):</h4>
                  <div className="post-videos-grid">
                    {post.Videos.map((video, index) => (
                      <video key={index} src={video.VideoUrl || video} controls className="post-video" />
                    ))}
                  </div>
                </div>
              );
            }

            if (post.MediaUrls && post.MediaUrls.length > 0) {
              return (
                <div className="post-images-section">
                  <h4>Hình ảnh ({post.MediaUrls.length}):</h4>
                  <div className="post-images-grid">
                    {post.MediaUrls.map((u, i) => (
                      <img key={i} src={u} alt={`Image ${i + 1}`} className="post-image" />
                    ))}
                  </div>
                </div>
              );
            }

            return null;
          })()}

          {/* Interaction Stats */}
          <div className="post-stats-section">
            <div className="stat-item">
              <span className="stat-icon"><FiHeart aria-hidden="true"/></span>
              <span className="stat-label">Reactions:</span>
              <span className="stat-value">{post.ReactionCount || 0}</span>
            </div>
            <div className="stat-item">
              <span className="stat-icon"><FiMessageSquare aria-hidden="true"/></span>
              <span className="stat-label">Comments:</span>
              <span className="stat-value">{post.CommentCount || 0}</span>
            </div>
            {/* Shares removed per request */}
            <div className="stat-item total-stat">
              <span className="stat-icon"><FiBarChart2 aria-hidden="true"/></span>
              <span className="stat-label">Tổng tương tác:</span>
              <span className="stat-value">{post.TotalInteractions || 0}</span>
            </div>
          </div>

          {/* Post Status */}
          {post.Status && (
            <div className="post-status-section">
              <span className="status-label">Trạng thái:</span>
              <span className={`status-badge status-${post.Status.toLowerCase()}`}>
                {post.Status}
              </span>
            </div>
          )}

          {/* Recent Comments Preview */}
          {post.RecentComments && post.RecentComments.length > 0 && (
            <div className="post-comments-section">
              <h4>Bình luận gần đây:</h4>
              <div className="comments-list">
                {post.RecentComments.map((comment, index) => (
                  <div key={index} className="comment-item">
                    <div className="comment-author">
                      <strong>{comment.AuthorName}</strong>
                      <span className="comment-date">
                        {formatDate(comment.CreatedAt)}
                      </span>
                    </div>
                    <div className="comment-text">{comment.Content}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="post-modal-footer">
          <button className="btn-close-footer" onClick={onClose}>
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
