import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { MdClose, MdPlayCircle, MdLink } from 'react-icons/md';
import './MediaLinksScreen.css';
// import * as groupChatService from '../../Services/groupChatService';

export default function MediaLinksScreen() {
  const navigate = useNavigate();
  const { conversationId } = useParams();
  const location = useLocation();
  const { groupName } = location.state || {};

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('images'); // images, videos, files, links
  const [images, setImages] = useState([]);
  const [videos, setVideos] = useState([]);
  const [files, setFiles] = useState([]);
  const [links, setLinks] = useState([]);
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [videoUri, setVideoUri] = useState(null);

  useEffect(() => {
    loadMediaAndLinks();
  }, [conversationId]);

  const loadMediaAndLinks = async () => {
    try {
      setLoading(true);
      // Try server-first: fetch many messages (paginated) and extract media/links
      try {
        const allMessages = [];
        let page = 1;
        const pageSize = 500;
        while (true) {
          // const data = await groupChatService.getMessages(conversationId, page, pageSize);
          const data = { messages: [], hasMore: false }; // TODO: implement API call
          const msgs = data.messages || [];
          msgs.forEach(m => {
            allMessages.push({
              id: m.messageId || m.MessageId || m.id,
              userName: m.userName || m.UserName,
              message: m.content || m.Content,
              mediaUri: m.fileUrl || m.FileUrl,
              mediaType: m.messageType || m.MessageType,
              timestamp: m.createdAt || m.CreatedAt,
            });
          });
          if (!data.hasMore) break;
          page += 1;
        }

        if (allMessages.length > 0) {
          const imageMessages = allMessages.filter(msg => msg.mediaType === 'image' && msg.mediaUri);
          const videoMessages = allMessages.filter(msg => msg.mediaType === 'video' && msg.mediaUri);
          setImages(imageMessages);
          setVideos(videoMessages);

          // files - not implemented server-side yet
          setFiles([]);

          // Extract links
          const urlRegex = /(https?:\/\/[^\s]+)/g;
          const linkMessages = [];
          allMessages.forEach(msg => {
            if (msg.message) {
              const urls = msg.message.match(urlRegex);
              if (urls) {
                urls.forEach(url => linkMessages.push({ ...msg, url }));
              }
            }
          });
          setLinks(linkMessages);
          setLoading(false);
          return;
        }
      } catch (apiErr) {
        console.warn('Failed to load media from server, fallback to localStorage', apiErr);
      }

      // Fallback: use localStorage
      const storageKey = `group_messages_${conversationId}`;
      const savedMessages = localStorage.getItem(storageKey);
      
      if (savedMessages) {
        const messages = JSON.parse(savedMessages);
        
        // Filter images
        const imageMessages = messages.filter(msg => 
          msg.mediaType === 'image' && msg.mediaUri
        );
        setImages(imageMessages);
        
        // Filter videos
        const videoMessages = messages.filter(msg => 
          msg.mediaType === 'video' && msg.mediaUri
        );
        setVideos(videoMessages);
        
        // Filter files (future implementation)
        setFiles([]);
        
        // Extract links from messages
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        const linkMessages = [];
        messages.forEach(msg => {
          if (msg.message) {
            const urls = msg.message.match(urlRegex);
            if (urls) {
              urls.forEach(url => {
                linkMessages.push({
                  ...msg,
                  url: url,
                });
              });
            }
          }
        });
        setLinks(linkMessages);
      }
    } catch (error) {
      console.error('Load media error:', error);
      alert('Lỗi: Không thể tải phương tiện');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadMediaAndLinks();
    setRefreshing(false);
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const handleImagePress = (image, index) => {
    setSelectedImageIndex(index);
    setShowImageViewer(true);
  };

  const handleVideoPress = (video) => {
    try {
      if (!video || !video.mediaUri) {
        alert('Lỗi: Không tìm thấy video');
        return;
      }
      setVideoUri(video.mediaUri);
      setShowVideoModal(true);
    } catch (err) {
      console.error('handleVideoPress error', err);
      alert('Lỗi: Không thể mở video');
    }
  };

  const handleLinkPress = (url) => {
    const confirmed = window.confirm(`Mở liên kết:\n${url}`);
    if (confirmed) {
      window.open(url, '_blank');
    }
  };

  const renderImageItem = (item, index) => (
    <div
      key={item.id || index}
      className="media-item"
      onClick={() => handleImagePress(item, index)}
    >
      <img 
        src={item.mediaUri} 
        alt=""
        className="media-thumb"
      />
    </div>
  );

  const renderVideoItem = (item, index) => (
    <div
      key={item.id || index}
      className="media-item"
      onClick={() => handleVideoPress(item)}
    >
      <img 
        src={item.mediaUri} 
        alt=""
        className="media-thumb"
      />
      <div className="video-overlay">
        <span className="play-icon"><MdPlayCircle size={32} /></span>
      </div>
    </div>
  );

  const renderLinkItem = (linkItem, index) => (
    <div
      key={index}
      className="link-item"
      onClick={() => handleLinkPress(linkItem.url)}
    >
      <div className="link-icon-container">
        <span className="link-icon"><MdLink size={24} /></span>
      </div>
      
      <div className="link-info">
        <div className="link-url">
          {linkItem.url}
        </div>
        <div className="link-meta">
          <span className="link-sender">{linkItem.userName}</span>
          <span className="link-date"> • {formatTimestamp(linkItem.timestamp)}</span>
        </div>
      </div>
      
      <span className="chevron-icon">›</span>
    </div>
  );

  const renderContent = () => {
    if (loading) {
      return (
        <div className="loading-container">
          <div className="spinner-large"></div>
          <div className="loading-text">Đang tải...</div>
        </div>
      );
    }

    switch (activeTab) {
      case 'images':
        if (images.length === 0) {
          return (
            <div className="empty-container">
              <div className="empty-icon">🖼️</div>
              <div className="empty-text">Chưa có ảnh nào</div>
            </div>
          );
        }
        return (
          <div className="media-grid">
            {images.map((item, index) => renderImageItem(item, index))}
          </div>
        );

      case 'videos':
        if (videos.length === 0) {
          return (
            <div className="empty-container">
              <div className="empty-icon">🎥</div>
              <div className="empty-text">Chưa có video nào</div>
            </div>
          );
        }
        return (
          <div className="media-grid">
            {videos.map((item, index) => renderVideoItem(item, index))}
          </div>
        );

      case 'files':
        return (
          <div className="empty-container">
            <div className="empty-icon">📄</div>
            <div className="empty-text">Chưa có file nào</div>
            <div className="empty-subtext">Tính năng đang phát triển</div>
          </div>
        );

      case 'links':
        if (links.length === 0) {
          return (
            <div className="empty-container">
              <div className="empty-icon"><MdLink size={48} /></div>
              <div className="empty-text">Chưa có liên kết nào</div>
            </div>
          );
        }
        return (
          <div className="links-list">
            {links.map((link, index) => renderLinkItem(link, index))}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="media-links-container">
      <div className="media-links-header">
        <button 
          className="back-button"
          onClick={() => navigate(-1)}
        >
          <span className="back-icon">‹</span>
        </button>
        <div className="header-title">Phương tiện & liên kết</div>
        <div style={{ width: '40px' }} />
      </div>

      {/* Tabs */}
      <div className="tabs-container">
        <button
          className={`tab ${activeTab === 'images' ? 'active-tab' : ''}`}
          onClick={() => setActiveTab('images')}
        >
          <span className="tab-icon">🖼️</span>
          <span className="tab-text">Ảnh</span>
          {images.length > 0 && (
            <span className="badge">{images.length}</span>
          )}
        </button>

        <button
          className={`tab ${activeTab === 'videos' ? 'active-tab' : ''}`}
          onClick={() => setActiveTab('videos')}
        >
          <span className="tab-icon">🎥</span>
          <span className="tab-text">Video</span>
          {videos.length > 0 && (
            <span className="badge">{videos.length}</span>
          )}
        </button>

        <button
          className={`tab ${activeTab === 'files' ? 'active-tab' : ''}`}
          onClick={() => setActiveTab('files')}
        >
          <span className="tab-icon">📄</span>
          <span className="tab-text">File</span>
        </button>

        <button
          className={`tab ${activeTab === 'links' ? 'active-tab' : ''}`}
          onClick={() => setActiveTab('links')}
        >
          <span className="tab-icon"><MdLink size={20} /></span>
          <span className="tab-text">Liên kết</span>
          {links.length > 0 && (
            <span className="badge">{links.length}</span>
          )}
        </button>
      </div>

      {/* Content */}
      <div className="media-content">
        {renderContent()}
      </div>

      {/* Refresh Button */}
      {!loading && (
        <button 
          className="refresh-button"
          onClick={onRefresh}
          disabled={refreshing}
        >
          <span className={`refresh-icon ${refreshing ? 'spinning' : ''}`}>🔄</span>
        </button>
      )}

      {/* Video Modal */}
      {showVideoModal && (
        <div className="video-modal-overlay" onClick={() => setShowVideoModal(false)}>
          <div className="video-modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="video-close-button" onClick={() => setShowVideoModal(false)}>
              <span className="close-icon"><MdClose size={24} /></span>
            </button>
            {videoUri ? (
              <video
                src={videoUri}
                controls
                autoPlay
                className="video-player"
                onError={(e) => {
                  console.error('Video player error', e);
                  alert('Lỗi: Không thể phát video');
                }}
              />
            ) : (
              <div className="video-error">Không thể tải video</div>
            )}
          </div>
        </div>
      )}

      {/* Image Viewer */}
      {showImageViewer && (
        <div className="image-viewer-overlay" onClick={() => setShowImageViewer(false)}>
          <button className="image-close-button" onClick={() => setShowImageViewer(false)}>
            <span className="close-icon"><MdClose size={24} /></span>
          </button>
          <div className="image-viewer-content" onClick={(e) => e.stopPropagation()}>
            <img 
              src={images[selectedImageIndex]?.mediaUri} 
              alt=""
              className="fullscreen-image"
            />
            <div className="image-navigation">
              <button 
                className="nav-button"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedImageIndex(prev => Math.max(0, prev - 1));
                }}
                disabled={selectedImageIndex === 0}
              >
                <span className="nav-icon">‹</span>
              </button>
              <span className="image-counter">
                {selectedImageIndex + 1} / {images.length}
              </span>
              <button 
                className="nav-button"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedImageIndex(prev => Math.min(images.length - 1, prev + 1));
                }}
                disabled={selectedImageIndex === images.length - 1}
              >
                <span className="nav-icon">›</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
