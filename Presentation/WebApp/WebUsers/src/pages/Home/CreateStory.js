import React, { useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { createStory, API_BASE_URL } from '../../api/Api';
import './CreateStory.css';

const CreateStory = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const media = location.state?.media || null;
  
  const [selectedFile, setSelectedFile] = useState(media);
  const [preview, setPreview] = useState(media ? URL.createObjectURL(media) : null);
  const [privacy, setPrivacy] = useState('public');
  const [uploading, setUploading] = useState(false);
  const [textOverlay, setTextOverlay] = useState('');
  const [textColor, setTextColor] = useState('#FFFFFF');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const fileInputRef = useRef(null);

  const isVideo = selectedFile && selectedFile.type?.startsWith('video/');
  
  const TEXT_COLORS = [
    { color: '#FFFFFF', label: 'Trắng' },
    { color: '#FFD700', label: 'Vàng' },
    { color: '#00FF00', label: 'Xanh lá' },
    { color: '#00BFFF', label: 'Xanh dương' },
    { color: '#FF69B4', label: 'Hồng' },
  ];

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
      alert('Vui lòng chọn file ảnh hoặc video');
      return;
    }

    // Validate file size
    const MAX_SIZE = 100 * 1024 * 1024; // 100MB
    if (file.size > MAX_SIZE) {
      alert('File quá lớn! Kích thước tối đa: 100MB');
      return;
    }

    // Validate video duration if video
    if (file.type.startsWith('video/')) {
      const valid = await validateVideoDuration(file);
      if (!valid) return;
    }

    setSelectedFile(file);
    setPreview(URL.createObjectURL(file));
  };

  const validateVideoDuration = (file) => {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      video.preload = 'metadata';

      video.onloadedmetadata = () => {
        window.URL.revokeObjectURL(video.src);
        const duration = video.duration;
        
        if (duration > 60) {
          alert(`Video quá dài! Thời lượng tối đa: 60s (${Math.floor(duration)}s)`);
          resolve(false);
        } else {
          resolve(true);
        }
      };

      video.onerror = () => {
        alert('Không thể đọc video');
        resolve(false);
      };

      video.src = URL.createObjectURL(file);
    });
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      alert('Vui lòng chọn ảnh hoặc video');
      return;
    }

    try {
      setUploading(true);
      
      const mediaType = isVideo ? 'video' : 'image';
      const result = await createStory({
        media: selectedFile,
        mediaType,
        privacy,
      });

      console.log('[CreateStory] Story created:', result);
      
      // Navigate back to home with refresh flag
      navigate('/', { 
        replace: true,
        state: { 
          createdStory: true, 
          newStory: result?.data || result,
          timestamp: Date.now()
        }
      });
    } catch (error) {
      console.error('[CreateStory] Error:', error);
      alert(error.message || 'Không thể tạo story. Vui lòng thử lại.');
    } finally {
      setUploading(false);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    const file = e.dataTransfer.files[0];
    if (!file) return;

    // Validate and set file
    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
      alert('Vui lòng chọn file ảnh hoặc video');
      return;
    }

    const MAX_SIZE = 100 * 1024 * 1024; // 100MB
    if (file.size > MAX_SIZE) {
      alert('File quá lớn! Kích thước tối đa: 100MB');
      return;
    }

    if (file.type.startsWith('video/')) {
      const valid = await validateVideoDuration(file);
      if (!valid) return;
    }

    setSelectedFile(file);
    setPreview(URL.createObjectURL(file));
  };

  return (
    <div className="create-story-container">
      <div className="create-story-header">
        <button 
          className="header-button back-button" 
          onClick={() => navigate(-1)}
          disabled={uploading}
        >
          ←
        </button>
        <h1 className="header-title">Tạo Story</h1>
        {selectedFile && (
          <button 
            className="header-button post-button"
            onClick={handleUpload}
            disabled={uploading}
          >
            {uploading ? 'Đang đăng...' : 'Đăng'}
          </button>
        )}
      </div>

      <div className="create-story-content">
        {!selectedFile ? (
          <div 
            className="story-upload-area"
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />
            <div className="upload-content">
              <div className="upload-icon">📸</div>
              <div className="upload-text">Chọn ảnh hoặc video</div>
              <div className="upload-hint">Hoặc kéo thả file vào đây</div>
              <button 
                className="select-file-button"
                onClick={() => fileInputRef.current?.click()}
              >
                Chọn từ thiết bị
              </button>
              <div className="upload-info">
                <p>Video tối đa 60 giây</p>
                <p>Kích thước tối đa: 100MB</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="story-preview-container">
            <div className="preview-wrapper">
              {isVideo ? (
                <video
                  src={preview}
                  className="preview-media"
                  controls
                  autoPlay
                  loop
                  muted
                />
              ) : (
                <img
                  src={preview}
                  alt="Story preview"
                  className="preview-media"
                />
              )}

              {/* Text Overlay */}
              {textOverlay && (
                <div 
                  className="text-overlay"
                  style={{ color: textColor }}
                >
                  {textOverlay}
                </div>
              )}
            </div>

            {/* Controls */}
            <div className="story-controls">
              {/* Text Input */}
              <div className="control-section">
                <label className="control-label">Thêm text (tùy chọn)</label>
                <div className="text-input-row">
                  <input
                    type="text"
                    className="text-input"
                    placeholder="Nhập text..."
                    value={textOverlay}
                    onChange={(e) => setTextOverlay(e.target.value)}
                    maxLength={100}
                    disabled={uploading}
                  />
                  <button 
                    className="color-picker-button"
                    onClick={() => setShowColorPicker(!showColorPicker)}
                    style={{ backgroundColor: textColor }}
                    disabled={uploading}
                    title="Chọn màu text"
                  >
                    A
                  </button>
                </div>

                {showColorPicker && (
                  <div className="color-picker-dropdown">
                    {TEXT_COLORS.map((item) => (
                      <button
                        key={item.color}
                        className={`color-option ${textColor === item.color ? 'active' : ''}`}
                        style={{ backgroundColor: item.color }}
                        onClick={() => {
                          setTextColor(item.color);
                          setShowColorPicker(false);
                        }}
                        title={item.label}
                      >
                        {textColor === item.color && '✓'}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Privacy */}
              <div className="control-section">
                <label className="control-label">Quyền riêng tư</label>
                <select
                  className="privacy-select"
                  value={privacy}
                  onChange={(e) => setPrivacy(e.target.value)}
                  disabled={uploading}
                >
                  <option value="public">Công khai</option>
                  <option value="private">Riêng tư</option>
                </select>
              </div>

              {/* Change Media */}
              <button
                className="change-media-button"
                onClick={() => {
                  URL.revokeObjectURL(preview);
                  setSelectedFile(null);
                  setPreview(null);
                  setTextOverlay('');
                }}
                disabled={uploading}
              >
                Chọn ảnh/video khác
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Loading Overlay */}
      {uploading && (
        <div className="loading-overlay">
          <div className="loading-spinner" />
          <div className="loading-text">Đang tải lên...</div>
        </div>
      )}
    </div>
  );
};

export default CreateStory;
