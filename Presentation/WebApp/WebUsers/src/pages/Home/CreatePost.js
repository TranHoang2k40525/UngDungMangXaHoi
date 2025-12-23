import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPost, searchUsers, getFollowing, getFollowers } from '../../API/Api';
import './CreatePost.css';

const CreatePost = () => {
  const navigate = useNavigate();
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [caption, setCaption] = useState('');
  const [privacy, setPrivacy] = useState('public');
  const [location, setLocation] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [taggedUsers, setTaggedUsers] = useState([]);
  const [showTagModal, setShowTagModal] = useState(false);
  const [allUsers, setAllUsers] = useState([]);
  const [searchTagQuery, setSearchTagQuery] = useState('');
  
  // Mention autocomplete states
  const [showMentionDropdown, setShowMentionDropdown] = useState(false);
  const [mentionSearch, setMentionSearch] = useState('');
  const [cursorPosition, setCursorPosition] = useState(0);
  const captionInputRef = useRef(null);
  const fileInputRef = useRef(null);

  const MAX_IMAGES = 10;
  const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
  const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100MB
  const MAX_VIDEO_DURATION = 60; // seconds
  const MAX_CAPTION_LENGTH = 2000;

  // Load users for mentions and tags
  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const [following, followers] = await Promise.all([
        getFollowing().catch(() => []),
        getFollowers().catch(() => []),
      ]);

      const raw = [
        ...(Array.isArray(following) ? following : []),
        ...(Array.isArray(followers) ? followers : []),
      ];

      const usersMap = new Map();
      raw.forEach((u) => {
        if (!u) return;
        const id = u.id ?? u.userId ?? u.user_id ?? null;
        const username = u.username ?? u.userName ?? u.user_name ?? null;
        const fullName = u.fullName ?? u.full_name ?? u.fullname ?? null;
        const avatarUrl = u.avatarUrl ?? u.avatar_url ?? u.avatar ?? null;
        if (id != null) {
          usersMap.set(Number(id), {
            id: Number(id),
            username: username || String(id),
            fullName,
            avatarUrl,
          });
        }
      });

      setAllUsers(Array.from(usersMap.values()));
    } catch (error) {
      console.warn('Load users error:', error);
      setAllUsers([]);
    }
  };

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    // Check if selecting video
    const hasVideo = files.some(file => file.type.startsWith('video/'));
    
    if (hasVideo) {
      if (files.length > 1) {
        alert('Chỉ có thể chọn 1 video');
        return;
      }
      const videoFile = files[0];
      
      // Validate video size
      if (videoFile.size > MAX_VIDEO_SIZE) {
        alert(`Video quá lớn! Kích thước tối đa: ${MAX_VIDEO_SIZE / 1024 / 1024}MB`);
        return;
      }

      // Check video duration
      const valid = await validateVideoDuration(videoFile);
      if (!valid) return;

      setSelectedFiles([videoFile]);
      const preview = URL.createObjectURL(videoFile);
      setPreviews([{ url: preview, type: 'video' }]);
    } else {
      // Images only
      if (files.length > MAX_IMAGES) {
        alert(`Chỉ có thể chọn tối đa ${MAX_IMAGES} ảnh`);
        return;
      }

      // Validate image sizes
      for (const file of files) {
        if (file.size > MAX_IMAGE_SIZE) {
          alert(`Ảnh "${file.name}" quá lớn! Kích thước tối đa: ${MAX_IMAGE_SIZE / 1024 / 1024}MB`);
          return;
        }
      }

      setSelectedFiles(files);
      const newPreviews = await Promise.all(
        files.map(async (file) => ({
          url: URL.createObjectURL(file),
          type: 'image',
        }))
      );
      setPreviews(newPreviews);
    }
  };

  const validateVideoDuration = (file) => {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      video.preload = 'metadata';

      video.onloadedmetadata = () => {
        window.URL.revokeObjectURL(video.src);
        const duration = video.duration;
        
        if (duration > MAX_VIDEO_DURATION) {
          alert(`Video quá dài! Thời lượng tối đa: ${MAX_VIDEO_DURATION}s (${Math.floor(duration)}s)`);
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

  const removeMedia = (index) => {
    const newFiles = selectedFiles.filter((_, i) => i !== index);
    const newPreviews = previews.filter((_, i) => i !== index);
    
    // Revoke URL to free memory
    URL.revokeObjectURL(previews[index].url);
    
    setSelectedFiles(newFiles);
    setPreviews(newPreviews);
  };

  const handleCaptionChange = (e) => {
    const text = e.target.value;
    
    if (text.length > MAX_CAPTION_LENGTH) {
      return;
    }
    
    setCaption(text);
    const cursor = e.target.selectionStart;
    setCursorPosition(cursor);

    // Find @ symbol before cursor
    const textBeforeCursor = text.slice(0, cursor);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');

    if (lastAtIndex !== -1) {
      const textAfterAt = textBeforeCursor.slice(lastAtIndex + 1);
      // Check if there's a space after @ (which would end the mention)
      if (!textAfterAt.includes(' ') && textAfterAt.length >= 0) {
        setMentionSearch(textAfterAt);
        setShowMentionDropdown(true);
      } else {
        setShowMentionDropdown(false);
      }
    } else {
      setShowMentionDropdown(false);
    }
  };

  const insertMention = (user) => {
    const textBeforeCursor = caption.slice(0, cursorPosition);
    const textAfterCursor = caption.slice(cursorPosition);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');

    if (lastAtIndex !== -1) {
      const before = caption.slice(0, lastAtIndex);
      const newCaption = `${before}@${user.username} ${textAfterCursor}`;
      setCaption(newCaption);
      setShowMentionDropdown(false);
      
      // Focus back to textarea
      setTimeout(() => {
        if (captionInputRef.current) {
          const newCursor = lastAtIndex + user.username.length + 2;
          captionInputRef.current.focus();
          captionInputRef.current.setSelectionRange(newCursor, newCursor);
        }
      }, 0);
    }
  };

  const extractMentions = () => {
    const mentionRegex = /@(\w+)/g;
    const matches = [...caption.matchAll(mentionRegex)];
    const mentionedUsernames = matches.map(m => m[1]);
    
    return allUsers
      .filter(u => mentionedUsernames.includes(u.username))
      .map(u => u.id);
  };

  const handleTagUser = (user) => {
    if (taggedUsers.find(u => u.id === user.id)) {
      setTaggedUsers(taggedUsers.filter(u => u.id !== user.id));
    } else {
      setTaggedUsers([...taggedUsers, user]);
    }
  };

  const handlePost = async () => {
    if (selectedFiles.length === 0) {
      alert('Vui lòng chọn ít nhất 1 ảnh hoặc video');
      return;
    }

    try {
      setLoading(true);
      setUploadProgress(0);

      // Separate images and video
      const images = selectedFiles.filter(f => f.type.startsWith('image/'));
      const video = selectedFiles.find(f => f.type.startsWith('video/'));

      // Extract mentions from caption
      const mentions = extractMentions();
      const tags = taggedUsers.map(u => u.id);

      // Create post
      const result = await createPost({
        images,
        video: video || null,
        caption: caption.trim(),
        location: location.trim(),
        privacy,
        mentions,
        tags,
      });

      console.log('[CreatePost] Post created:', result);
      
      // Navigate back to home
      navigate('/', { replace: true });
    } catch (error) {
      console.error('[CreatePost] Error:', error);
      alert(error.message || 'Không thể đăng bài. Vui lòng thử lại.');
    } finally {
      setLoading(false);
      setUploadProgress(0);
    }
  };

  const filteredMentionUsers = allUsers.filter(u =>
    u.username.toLowerCase().includes(mentionSearch.toLowerCase())
  );

  const filteredTagUsers = allUsers.filter(u =>
    u.username.toLowerCase().includes(searchTagQuery.toLowerCase()) ||
    (u.fullName && u.fullName.toLowerCase().includes(searchTagQuery.toLowerCase()))
  );

  const canPost = selectedFiles.length > 0 && !loading;

  return (
    <div className="create-post-container">
      <div className="create-post-header">
        <button 
          className="header-button cancel-button" 
          onClick={() => navigate(-1)}
          disabled={loading}
        >
          Hủy
        </button>
        <h1 className="header-title">Tạo bài đăng</h1>
        <button 
          className="header-button post-button"
          onClick={handlePost}
          disabled={!canPost}
        >
          {loading ? 'Đang đăng...' : 'Đăng'}
        </button>
      </div>

      <div className="create-post-content">
        {/* Media Selection */}
        <div className="media-section">
          {previews.length === 0 ? (
            <div className="media-upload-area">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                multiple
                onChange={handleFileSelect}
                style={{ display: 'none' }}
              />
              <button 
                className="select-media-button"
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="upload-icon">📷</div>
                <div className="upload-text">Chọn ảnh hoặc video</div>
                <div className="upload-hint">Tối đa {MAX_IMAGES} ảnh hoặc 1 video (60s)</div>
              </button>
            </div>
          ) : (
            <div className="media-preview-container">
              <div className="media-preview-grid">
                {previews.map((preview, index) => (
                  <div key={index} className="media-preview-item">
                    {preview.type === 'video' ? (
                      <video
                        src={preview.url}
                        className="preview-media"
                        controls
                      />
                    ) : (
                      <img
                        src={preview.url}
                        alt={`Preview ${index + 1}`}
                        className="preview-media"
                      />
                    )}
                    <button
                      className="remove-media-button"
                      onClick={() => removeMedia(index)}
                      disabled={loading}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
              {!selectedFiles.some(f => f.type.startsWith('video/')) && selectedFiles.length < MAX_IMAGES && (
                <button 
                  className="add-more-button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={loading}
                >
                  + Thêm ảnh
                </button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                multiple
                onChange={handleFileSelect}
                style={{ display: 'none' }}
              />
            </div>
          )}
        </div>

        {/* Caption Input */}
        <div className="caption-section">
          <div className="caption-input-container">
            <textarea
              ref={captionInputRef}
              className="caption-textarea"
              placeholder="Viết chú thích... (sử dụng @ để mention)"
              value={caption}
              onChange={handleCaptionChange}
              disabled={loading}
              rows={4}
            />
            <div className="caption-counter">
              {caption.length}/{MAX_CAPTION_LENGTH}
            </div>
          </div>

          {/* Mention Dropdown */}
          {showMentionDropdown && filteredMentionUsers.length > 0 && (
            <div className="mention-dropdown">
              {filteredMentionUsers.slice(0, 5).map((user) => (
                <div
                  key={user.id}
                  className="mention-item"
                  onClick={() => insertMention(user)}
                >
                  {user.avatarUrl ? (
                    <img src={user.avatarUrl} alt={user.username} className="mention-avatar" />
                  ) : (
                    <div className="mention-avatar mention-avatar-placeholder">
                      {user.username[0]?.toUpperCase() || '?'}
                    </div>
                  )}
                  <div className="mention-info">
                    <div className="mention-username">@{user.username}</div>
                    {user.fullName && (
                      <div className="mention-fullname">{user.fullName}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Options Section */}
        <div className="options-section">
          <div className="option-item">
            <label className="option-label">Quyền riêng tư</label>
            <select
              className="option-select privacy-selector"
              value={privacy}
              onChange={(e) => setPrivacy(e.target.value)}
              disabled={loading}
            >
              <option value="public">Công khai</option>
              <option value="friends">Bạn bè</option>
              <option value="private">Chỉ mình tôi</option>
            </select>
          </div>

          <div className="option-item">
            <label className="option-label">Vị trí</label>
            <input
              type="text"
              className="option-input location-input"
              placeholder="Thêm vị trí..."
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="option-item">
            <label className="option-label">Gắn thẻ người khác</label>
            <button
              className="option-button tag-button"
              onClick={() => setShowTagModal(true)}
              disabled={loading}
            >
              {taggedUsers.length > 0
                ? `${taggedUsers.length} người được gắn thẻ`
                : 'Thêm người'}
            </button>
          </div>

          {taggedUsers.length > 0 && (
            <div className="tagged-users-list">
              {taggedUsers.map((user) => (
                <div key={user.id} className="tagged-user-chip">
                  <span className="tagged-user-name">@{user.username}</span>
                  <button
                    className="remove-tag-button"
                    onClick={() => handleTagUser(user)}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Upload Progress */}
        {loading && uploadProgress > 0 && (
          <div className="upload-progress-container">
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <div className="progress-text">{uploadProgress}%</div>
          </div>
        )}
      </div>

      {/* Tag Users Modal */}
      {showTagModal && (
        <div className="modal-overlay" onClick={() => setShowTagModal(false)}>
          <div className="modal-content tag-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Gắn thẻ người khác</h2>
              <button
                className="modal-close-button"
                onClick={() => setShowTagModal(false)}
              >
                ✕
              </button>
            </div>

            <div className="modal-body">
              <input
                type="text"
                className="tag-search-input"
                placeholder="Tìm kiếm..."
                value={searchTagQuery}
                onChange={(e) => setSearchTagQuery(e.target.value)}
              />

              <div className="tag-users-list">
                {filteredTagUsers.map((user) => {
                  const isTagged = taggedUsers.find(u => u.id === user.id);
                  return (
                    <div
                      key={user.id}
                      className={`tag-user-item ${isTagged ? 'tagged' : ''}`}
                      onClick={() => handleTagUser(user)}
                    >
                      {user.avatarUrl ? (
                        <img src={user.avatarUrl} alt={user.username} className="tag-user-avatar" />
                      ) : (
                        <div className="tag-user-avatar tag-user-avatar-placeholder">
                          {user.username[0]?.toUpperCase() || '?'}
                        </div>
                      )}
                      <div className="tag-user-info">
                        <div className="tag-user-username">{user.username}</div>
                        {user.fullName && (
                          <div className="tag-user-fullname">{user.fullName}</div>
                        )}
                      </div>
                      {isTagged && (
                        <div className="tag-checkmark">✓</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreatePost;
