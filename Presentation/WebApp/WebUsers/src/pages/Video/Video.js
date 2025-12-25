import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getVideos, API_BASE_URL } from '../../API/Api';
import NavigationBar from '../../Components/NavigationBar';
import './Video.css';

export default function Video() {
  const navigate = useNavigate();
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    loadVideos();
  }, []);

  const loadVideos = async () => {
    try {
      setLoading(true);
      // Assuming API returns video posts
      const response = await getVideos();
      const videoList = response?.data || [];
      setVideos(videoList);
    } catch (error) {
      console.error('Load videos error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleScroll = (e) => {
    const container = e.target;
    const scrollPosition = container.scrollTop;
    const videoHeight = container.clientHeight;
    const newIndex = Math.round(scrollPosition / videoHeight);
    
    if (newIndex !== currentIndex && newIndex < videos.length) {
      setCurrentIndex(newIndex);
    }
  };

  if (loading) {
    return (
      <div className="video-container">
        <div className="video-loading">Đang tải...</div>
      </div>
    );
  }

  return (
    <div className="video-container" onScroll={handleScroll}>
      {/* Header */}
      <div className="video-header">
        <button className="video-back-btn" onClick={() => navigate(-1)}>
          ←
        </button>
        <h1 className="video-title">Reels</h1>
        <button className="video-camera-btn" onClick={() => navigate('/create-video')}>
          📷
        </button>
      </div>

      {/* Videos */}
      <div className="video-feed">
        {videos.length > 0 ? (
          videos.map((video, index) => (
            <div key={video.id || index} className="video-item">
              <video
                src={video.url?.startsWith('http') ? video.url : `${API_BASE_URL}${video.url}`}
                className="video-player"
                controls
                loop
                autoPlay={index === currentIndex}
                muted={index !== currentIndex}
              />
              
              {/* Video Info */}
              <div className="video-info">
                <div className="video-user">
                  <img 
                    src={video.userAvatar?.startsWith('http') ? video.userAvatar : `${API_BASE_URL}${video.userAvatar}`} 
                    alt={video.userName}
                    className="video-user-avatar"
                  />
                  <span className="video-user-name">{video.userName}</span>
                  <button className="video-follow-btn">Follow</button>
                </div>
                <p className="video-caption">{video.caption}</p>
              </div>

              {/* Actions */}
              <div className="video-actions">
                <button className="video-action-btn">
                  <span className="action-icon">❤️</span>
                  <span className="action-count">{video.likes || 0}</span>
                </button>
                <button className="video-action-btn">
                  <span className="action-icon">💬</span>
                  <span className="action-count">{video.comments || 0}</span>
                </button>
                <button className="video-action-btn">
                  <span className="action-icon">📤</span>
                </button>
                <button className="video-action-btn">
                  <span className="action-icon">⋯</span>
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="video-empty">
            <div className="empty-icon">📹</div>
            <p>Chưa có video nào</p>
          </div>
        )}
      </div>

      <NavigationBar />
    </div>
  );
}
