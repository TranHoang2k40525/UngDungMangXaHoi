import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMyPosts, getProfile, updateAvatar, API_BASE_URL, getBlockedUsers, unblockUser } from '../../API/Api';
import { useUser } from '../../context/UserContext';
import NavigationBar from '../../Components/NavigationBar';
import './Profile.css';

export default function Profile() {
  const navigate = useNavigate();
  const { logout, user } = useUser();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [blockedListVisible, setBlockedListVisible] = useState(false);
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [hasStory, setHasStory] = useState(false);
  const [storyData, setStoryData] = useState(null);
  const [showAvatarMenu, setShowAvatarMenu] = useState(false);

  const getAvatarUri = (p) => {
    const raw = p?.avatarUrl || p?.AvatarUrl;
    if (!raw) return null;
    if (raw.startsWith('http')) return raw;
    return `${API_BASE_URL}${raw}`;
  };

  const avatarUri = useMemo(() => getAvatarUri(profile), [profile]);

  const checkUserStory = async () => {
    try {
      const savedStories = localStorage.getItem('currentUserStories');
      if (savedStories) {
        let storiesArray = JSON.parse(savedStories);
        const now = Date.now();
        const validStories = storiesArray.filter(s => {
          const age = now - new Date(s.createdAt).getTime();
          return age < 24 * 60 * 60 * 1000;
        });
        if (validStories.length > 0) {
          setHasStory(true);
          setStoryData(validStories);
        } else {
          setHasStory(false);
          setStoryData(null);
          localStorage.removeItem('currentUserStories');
        }
      }
    } catch (e) {
      console.warn('[Profile] Error checking story:', e);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const [p, me] = await Promise.all([getMyPosts(), getProfile()]);
      setPosts(Array.isArray(p) ? p : []);
      setProfile(me || null);
      await checkUserStory();
    } catch (e) {
      console.warn('Profile load error', e);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadProfile();
    setRefreshing(false);
  };

  const handleAvatarPress = () => {
    if (hasStory) {
      setShowAvatarMenu(true);
    } else {
      handlePickAvatar();
    }
  };

  const handleViewStory = () => {
    setShowAvatarMenu(false);
    if (hasStory && storyData) {
      navigate('/story-viewer', { state: { stories: storyData } });
    }
  };

  const handlePickAvatar = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const res = await updateAvatar({ file, createPost: false });
        const newUrl = res?.data?.avatarUrl;
        if (newUrl) setProfile(prev => (prev ? { ...prev, avatarUrl: newUrl } : prev));
      } catch (e) {
        console.warn('Update avatar error', e);
        alert('Đổi avatar thất bại');
      }
    };
    input.click();
  };

  const loadBlockedUsers = async () => {
    try {
      const list = await getBlockedUsers();
      setBlockedUsers(Array.isArray(list) ? list : []);
    } catch (e) {
      console.warn('Load blocked users failed', e);
    }
  };

  const handleUnblock = async (userId) => {
    try {
      await unblockUser(userId);
      setBlockedUsers(prev => prev.filter(u => u.userId !== userId));
    } catch (e) {
      console.warn('Unblock failed', e);
      alert('Không thể bỏ chặn');
    }
  };

  useEffect(() => {
    if (blockedListVisible) loadBlockedUsers();
  }, [blockedListVisible]);

  if (loading) {
    return <div className="profile-loading">Đang tải...</div>;
  }

  return (
    <div className="profile-container">
      {/* Header */}
      <div className="profile-page-header">
        <div className="profile-header-left">
          {profile?.isPrivate && <span className="lock-icon">🔒</span>}
          <span className="profile-username">{profile?.username || 'username'}</span>
          {profile?.accountType === 'Business' && <span className="verified-badge">✓</span>}
          <span className="chevron-down">▼</span>
        </div>
      </div>

      {/* Menu Modal */}
      {menuOpen && (
        <div className="modal-overlay" onClick={() => setMenuOpen(false)}>
          <div className="menu-sheet" onClick={(e) => e.stopPropagation()}>
            <button className="menu-item" onClick={() => { setMenuOpen(false); navigate('/profile/edit'); }}>Xem/Chỉnh sửa thông tin</button>
            <button className="menu-item" onClick={() => { setMenuOpen(false); navigate('/change-password'); }}>Đổi mật khẩu</button>
            {profile?.accountType !== 'Business' && (
              <button className="menu-item" onClick={() => { setMenuOpen(false); }}>Đăng ký tài khoản doanh nghiệp</button>
            )}
            <button className="menu-item" onClick={() => { setMenuOpen(false); setBlockedListVisible(true); }}>Danh sách chặn</button>
            <button className="menu-item danger" onClick={() => { setMenuOpen(false); logout(); }}>Đăng xuất</button>
          </div>
        </div>
      )}

      {/* Blocked List Modal */}
      {blockedListVisible && (
        <div className="modal-overlay" onClick={() => setBlockedListVisible(false)}>
          <div className="blocked-list-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="sheet-title">Danh sách chặn</h3>
            {blockedUsers.length === 0 ? (
              <p className="empty-text">Chưa có người bị chặn</p>
            ) : (
              blockedUsers.map((u) => (
                <div key={u.userId || u.id} className="blocked-row">
                  <div className="blocked-user-info">
                    {getAvatarUri(u) ? (
                      <img src={getAvatarUri(u)} alt={u.username} className="blocked-avatar" />
                    ) : (
                      <div className="blocked-avatar default">👤</div>
                    )}
                    <div>
                      <div className="blocked-name">{u.username || u.fullName}</div>
                      {u.fullName && <div className="blocked-sub">{u.fullName}</div>}
                    </div>
                  </div>
                  <button className="unblock-btn" onClick={() => handleUnblock(u.userId || u.id)}>Bỏ chặn</button>
                </div>
              ))
            )}
            <button className="menu-item" onClick={() => setBlockedListVisible(false)}>Đóng</button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="profile-content">
        {/* Profile Section */}
        <div className="profile-section">
          <div className="profile-header-row">
            <button className="profile-avatar-container" onClick={handleAvatarPress}>
              <div className={`avatar-ring ${hasStory ? 'has-story' : ''}`}>
                {avatarUri ? (
                  <img src={avatarUri} alt="Profile" className="profile-avatar-img" />
                ) : (
                  <div className="profile-avatar-img default">👤</div>
                )}
              </div>
              {hasStory && <div className="story-indicator" />}
            </button>

            <div className="stats-container">
              <div className="stat-item">
                <span className="stat-number">{profile?.postCount || posts.length || 0}</span>
                <span className="stat-label">Posts</span>
              </div>
              <button className="stat-item" onClick={() => navigate(`/profile/followers/${profile?.userId}`)}>
                <span className="stat-number">{profile?.followerCount || 0}</span>
                <span className="stat-label">Followers</span>
              </button>
              <button className="stat-item" onClick={() => navigate(`/profile/following/${profile?.userId}`)}>
                <span className="stat-number">{profile?.followingCount || 0}</span>
                <span className="stat-label">Following</span>
              </button>
            </div>
          </div>

          <div className="bio-section">
            <div className="bio-name-row">
              <span className="bio-name">{profile?.fullName || ''}</span>
              {profile?.accountType === 'Business' && <span className="verified-badge">✓</span>}
            </div>
            {profile?.bio && <p className="bio-text">{profile.bio}</p>}
            {profile?.website && <p className="bio-text">{profile.website}</p>}
          </div>

          <div className="button-container">
            <button className="edit-btn" onClick={() => navigate('/profile/edit')}>Edit Profile</button>
            <button className="share-btn">Share Profile</button>
          </div>
        </div>

        {/* Story Highlights */}
        <div className="stories-section">
          <div className="stories-scroll">
            <div className="story-highlight-item">
              <div className="add-story-circle">➕</div>
              <span className="story-highlight-name">New</span>
            </div>
          </div>
        </div>

        {/* Tab Bar */}
        <div className="tab-bar">
          <button className="tab-button active">📱</button>
          <button className="tab-button">👤</button>
        </div>

        {/* Posts Grid */}
        <div className="posts-grid">
          {posts.length === 0 ? (
            <p className="empty-posts">Chưa có bài đăng</p>
          ) : (
            posts.map((post) => {
              const images = (post.media || []).filter(m => (m.type || '').toLowerCase() === 'image');
              const videos = (post.media || []).filter(m => (m.type || '').toLowerCase() === 'video');
              const isVideo = videos.length > 0;
              const firstMedia = images[0] || videos[0];
              return (
                <button
                  key={post.id}
                  className="post-grid-item"
                  onClick={() => navigate(`/post/${post.id}`)}
                >
                  {firstMedia?.url && (
                    <img
                      src={firstMedia.url.startsWith('http') ? firstMedia.url : `${API_BASE_URL}${firstMedia.url}`}
                      alt="Post"
                      className="post-grid-image"
                    />
                  )}
                  {isVideo && <span className="video-play-icon">▶</span>}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Avatar Menu */}
      {showAvatarMenu && (
        <div className="modal-overlay" onClick={() => setShowAvatarMenu(false)}>
          <div className="avatar-menu-sheet" onClick={(e) => e.stopPropagation()}>
            <h3 className="sheet-title">Tùy chọn</h3>
            <button className="sheet-item" onClick={handleViewStory}>
              <span className="sheet-icon">▶</span>
              <span className="sheet-item-text">Xem Story</span>
            </button>
            <button className="sheet-item" onClick={() => { setShowAvatarMenu(false); handlePickAvatar(); }}>
              <span className="sheet-icon">📷</span>
              <span className="sheet-item-text">Đổi Avatar</span>
            </button>
          </div>
        </div>
      )}

      <NavigationBar />
    </div>
  );
}
