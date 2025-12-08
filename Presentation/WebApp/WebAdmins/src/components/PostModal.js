import './PostModal.css';

export default function PostModal({ post, onClose }) {
  if (!post) return null;

  const formatDate = (dateString) => {
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
          <button className="btn-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="post-modal-content">
          {/* Author Info */}
          <div className="post-author-section">
            <div className="author-avatar">
              {post.AuthorAvatar ? (
                <img src={post.AuthorAvatar} alt={post.AuthorName} />
              ) : (
                <div className="avatar-placeholder">
                  {post.AuthorName?.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div className="author-details">
              <h3>{post.AuthorName}</h3>
              <p className="author-username">@{post.AuthorUsername}</p>
              <p className="post-date">{formatDate(post.CreatedAt)}</p>
            </div>
          </div>

          {/* Post Content */}
          <div className="post-content-section">
            <h4>Nội dung bài đăng:</h4>
            <div className="post-text">
              {post.Content}
            </div>
          </div>

          {/* Post Images */}
          {post.Images && post.Images.length > 0 && (
            <div className="post-images-section">
              <h4>Hình ảnh ({post.Images.length}):</h4>
              <div className="post-images-grid">
                {post.Images.map((image, index) => (
                  <img
                    key={index}
                    src={image.ImageUrl || image}
                    alt={`Image ${index + 1}`}
                    className="post-image"
                  />
                ))}
              </div>
            </div>
          )}

          {/* Post Videos */}
          {post.Videos && post.Videos.length > 0 && (
            <div className="post-videos-section">
              <h4>Video ({post.Videos.length}):</h4>
              <div className="post-videos-grid">
                {post.Videos.map((video, index) => (
                  <video
                    key={index}
                    src={video.VideoUrl || video}
                    controls
                    className="post-video"
                  />
                ))}
              </div>
            </div>
          )}

          {/* Interaction Stats */}
          <div className="post-stats-section">
            <div className="stat-item">
              <span className="stat-icon">❤️</span>
              <span className="stat-label">Reactions:</span>
              <span className="stat-value">{post.ReactionCount || 0}</span>
            </div>
            <div className="stat-item">
              <span className="stat-icon">💬</span>
              <span className="stat-label">Comments:</span>
              <span className="stat-value">{post.CommentCount || 0}</span>
            </div>
            <div className="stat-item">
              <span className="stat-icon">🔄</span>
              <span className="stat-label">Shares:</span>
              <span className="stat-value">{post.ShareCount || 0}</span>
            </div>
            <div className="stat-item total-stat">
              <span className="stat-icon">📊</span>
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
