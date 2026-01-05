import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { getUserPostsById, getUserProfile, followUser, unfollowUser, API_BASE_URL, blockUser, unblockUser, getBlockedUsers } from '../../api/Api';
import { useFollow } from '../../context/FollowContext';
import PostDetail from '../Home/PostDetail';
import { MdPerson, MdPersonAdd, MdPlayArrow, MdContentCopy, MdClose, MdArrowBack, MdMoreVert } from 'react-icons/md';
import './UserProfilePublic.css';

export default function UserProfilePublic() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { markAsFollowed, markAsUnfollowed, isFollowed: isFollowedGlobal } = useFollow();
  const [posts, setPosts] = useState([]);
  const [profile, setProfile] = useState(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [userInfoModalVisible, setUserInfoModalVisible] = useState(false);
  
  // Modal state for Instagram-style post view
  const [selectedPostIndex, setSelectedPostIndex] = useState(null);
  const [showPostModal, setShowPostModal] = useState(false);
  const postRefs = useRef({});

  const formatNumber = (num) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1).replace('.0', '') + ' triệu';
    if (num >= 1000) return (num / 1000).toFixed(1).replace('.0', '') + 'K';
    return num.toString();
  };

  const getAvatarUri = useMemo(() => {
    return (avatarUrl) => {
      if (!avatarUrl) return null;
      if (avatarUrl.startsWith('http')) return avatarUrl;
      return `${API_BASE_URL}${avatarUrl}`;
    };
  }, []);

  const avatarUri = useMemo(() => getAvatarUri(profile?.avatarUrl), [profile?.avatarUrl, getAvatarUri]);

  const formattedStats = useMemo(() => ({
    posts: formatNumber(profile?.postsCount || 0),
    followers: formatNumber(profile?.followersCount || 0),
    following: formatNumber(profile?.followingCount || 0),
  }), [profile?.postsCount, profile?.followersCount, profile?.followingCount]);

  useEffect(() => {
    (async () => {
      try {
        const [profileData, postsData] = await Promise.all([
          getUserProfile(userId),
          getUserPostsById(userId),
        ]);
        
        console.log('[UserProfilePublic] Profile data:', profileData);
        console.log('[UserProfilePublic] Posts data:', postsData);
        
        setProfile(profileData || null);
        setPosts(Array.isArray(postsData) ? postsData : []);
        const isFollowingFromAPI = profileData?.isFollowing || false;
        const isFollowingFromGlobal = isFollowedGlobal(userId);
        const finalFollowStatus = isFollowingFromGlobal !== undefined ? isFollowingFromGlobal : isFollowingFromAPI;
        setIsFollowing(finalFollowStatus);
        
        if (isFollowingFromAPI && !isFollowingFromGlobal) {
          markAsFollowed(userId);
        }
      } catch (e) {
        console.warn('User profile/posts error', e);
      }
    })();
    
    (async () => {
      try {
        const list = await getBlockedUsers();
        const found = Array.isArray(list) && list.some(u => u.userId === userId);
        setIsBlocked(!!found);
      } catch (e) {
        console.warn('Failed to fetch blocked list', e);
      }
    })();
  }, [userId, isFollowedGlobal, markAsFollowed]);

  // Scroll to specific post when returning from PostDetail
  useEffect(() => {
    const scrollToPostIdStr = sessionStorage.getItem('scrollToPostId');
    if (scrollToPostIdStr && posts.length > 0) {
      const scrollToPostId = parseInt(scrollToPostIdStr, 10);
      const postRef = postRefs.current[scrollToPostId];
      if (postRef) {
        console.log('[UserProfilePublic] Scrolling to post:', scrollToPostId);
        setTimeout(() => {
          postRef.scrollIntoView({ behavior: 'smooth', block: 'center' });
          // Clear sessionStorage after scrolling
          sessionStorage.removeItem('scrollToPostId');
        }, 500);
      }
    }
  }, [posts]);

  const handleFollow = async () => {
    try {
      if (isFollowing) {
        if (window.confirm(`Bạn có chắc muốn hủy theo dõi ${profile?.username || 'người dùng này'}?`)) {
          await unfollowUser(userId);
          setIsFollowing(false);
          markAsUnfollowed(userId);
          const updatedProfile = await getUserProfile(userId);
          setProfile(updatedProfile);
        }
      } else {
        await followUser(userId);
        setIsFollowing(true);
        markAsFollowed(userId);
        const updatedProfile = await getUserProfile(userId);
        setProfile(updatedProfile);
      }
    } catch (e) {
      alert(e.message || 'Không thể thực hiện thao tác');
    }
  };

  const handleMessage = () => {
    // Navigate directly to chat screen with this user (like MobileApp)
    const fullAvatarUrl = profile?.avatarUrl 
      ? (profile.avatarUrl.startsWith('http') 
          ? profile.avatarUrl 
          : `${API_BASE_URL}${profile.avatarUrl}`)
      : null;
      
    console.log('[UserProfilePublic] Navigate to chat with:', {
      userId,
      userName: profile?.username || profile?.fullName || 'User',
      userAvatar: fullAvatarUrl,
      username: profile?.username || '@user'
    });
      
    navigate(`/messenger/chat/${userId}`, { 
      state: {
        userId: parseInt(userId),
        userName: profile?.username || profile?.fullName || 'User',
        userAvatar: fullAvatarUrl,
        username: profile?.username || '@user'
      }
    });
  };

  const handleBlock = () => {
    setMenuVisible(false);
    if (isBlocked) {
      if (window.confirm(`Bạn có muốn bỏ chặn ${profile?.username || 'người dùng này'}?`)) {
        (async () => {
          try {
            await unblockUser(userId);
            setIsBlocked(false);
            alert('Đã bỏ chặn người dùng');
          } catch (e) {
            alert(e.message || 'Không thể bỏ chặn');
          }
        })();
      }
      return;
    }

    if (window.confirm(`Bạn có chắc muốn chặn ${profile?.username || 'người dùng này'}?`)) {
      (async () => {
        try {
          await blockUser(userId);
          setIsBlocked(true);
          markAsUnfollowed(userId);
          navigate('/');
        } catch (e) {
          alert(e.message || 'Không thể chặn user');
        }
      })();
    }
  };

  const handleCopyUsername = () => {
    if (profile?.username) {
      navigator.clipboard.writeText('@' + profile.username);
      alert(`Đã sao chép @${profile.username}`);
    }
  };

  const onPressPost = (post) => {
    const isVideo = (post.media||[]).some(m => (m.type||'').toLowerCase()==='video');
    const index = posts.findIndex(p => p.id === post.id);
    if (isVideo) {
      navigate(`/video/${post.id}`);
    } else {
      setSelectedPostIndex(index);
      setShowPostModal(true);
    }
  };

  return (
    <div className="user-profile-public-container">
      <div className="user-profile-header">
        <button className="back-button" onClick={() => navigate(-1)}>
          <MdArrowBack size={24} />
        </button>
        <div className="header-center">
          <span className="header-username">{profile?.username || 'user'}</span>
          {profile?.accountType === "Business" && (
            <span className="verified-badge">✓</span>
          )}
        </div>
        <button className="more-button" onClick={() => setMenuVisible(!menuVisible)}>
          <MdMoreVert size={24} />
        </button>
      </div>

      <div className="user-profile-content">
        <div className="profile-section">
          <div className="profile-top-row">
            <div className="avatar-container">
              {avatarUri ? (
                <img src={avatarUri} alt="Avatar" className="avatar" />
              ) : (
                <div className="avatar-placeholder">
                  <MdPerson />
                </div>
              )}
            </div>

            <div className="stats-container">
              <div className="stat-item">
                <div className="stat-number">{formattedStats.posts}</div>
                <div className="stat-label">bài viết</div>
              </div>
              <div className="stat-item" onClick={() => navigate(`/profile/followers/${userId}`)}>
                <div className="stat-number">{formattedStats.followers}</div>
                <div className="stat-label">người theo dõi</div>
              </div>
              <div className="stat-item" onClick={() => navigate(`/profile/following/${userId}`)}>
                <div className="stat-number">{formattedStats.following}</div>
                <div className="stat-label">đang theo dõi</div>
              </div>
            </div>
          </div>

          <div className="bio-section">
            <div className="display-name">
              {profile?.fullName || profile?.username || ''}
              {profile?.accountType === "Business" && (
                <span className="verified-badge-inline">✓</span>
              )}
            </div>
            {profile?.bio && <p className="bio-text">{profile.bio}</p>}
            {profile?.website && (
              <a href={profile.website} className="website-link" target="_blank" rel="noopener noreferrer">
                {profile.website}
              </a>
            )}
          </div>

          <div className="action-buttons-row">
            {!isBlocked && (
              <button 
                className={`action-button follow-button ${isFollowing ? 'following' : ''}`}
                onClick={handleFollow}
              >
                {isFollowing ? 'Đang theo dõi' : 'Theo dõi'}
              </button>
            )}
            <button className="action-button message-button" onClick={handleMessage}>
              Nhắn tin
            </button>
          </div>
        </div>

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
                  ref={el => postRefs.current[post.id] = el}
                  onClick={() => onPressPost(post)}
                >
                  {firstMedia?.url && (
                    isVideo ? (
                      <>
                        <video
                          src={firstMedia.url.startsWith('http') ? firstMedia.url : `${API_BASE_URL}${firstMedia.url}`}
                          className="post-grid-image"
                        />
                        <MdPlayArrow className="video-play-icon" />
                      </>
                    ) : (
                      <img
                        src={firstMedia.url.startsWith('http') ? firstMedia.url : `${API_BASE_URL}${firstMedia.url}`}
                        alt="Post"
                        className="post-grid-image"
                      />
                    )
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>

      {menuVisible && (
        <div className="modal-overlay" onClick={() => setMenuVisible(false)}>
          <div className="menu-modal" onClick={(e) => e.stopPropagation()}>
            <button className="menu-item" onClick={() => { setMenuVisible(false); handleFollow(); }}>
              {isFollowing ? 'Hủy theo dõi' : 'Theo dõi'}
            </button>
            <div className="menu-divider"></div>
            <button className="menu-item" onClick={() => { setMenuVisible(false); setUserInfoModalVisible(true); }}>
              Xem thông tin người dùng
            </button>
            <div className="menu-divider"></div>
            <button className="menu-item danger" onClick={handleBlock}>
              {isBlocked ? 'Bỏ chặn' : 'Chặn'}
            </button>
            <div className="menu-divider"></div>
            <button className="menu-item" onClick={() => setMenuVisible(false)}>
              Hủy
            </button>
          </div>
        </div>
      )}

      {userInfoModalVisible && (
        <div className="modal-overlay" onClick={() => setUserInfoModalVisible(false)}>
          <div className="user-info-modal" onClick={(e) => e.stopPropagation()}>
            <div className="user-info-header">
              <h2>Thông tin người dùng</h2>
              <button onClick={() => setUserInfoModalVisible(false)}><MdClose /></button>
            </div>
            <div className="user-info-content">
              <div className="info-section">
                <div className="info-label">Ảnh đại diện</div>
                {avatarUri ? (
                  <img src={avatarUri} alt="Avatar" className="info-avatar" />
                ) : (
                  <div className="info-avatar-placeholder">
                    <MdPerson />
                  </div>
                )}
              </div>
              <div className="info-section">
                <div className="info-label">Tên</div>
                <div className="info-value">{profile?.fullName || 'Chưa cập nhật'}</div>
              </div>
              <div className="info-section">
                <div className="info-label">Tên người dùng</div>
                <div className="copyable-row" onClick={handleCopyUsername}>
                  <span className="info-value">@{profile?.username || ''}</span>
                  <span className="copy-icon">📋</span>
                </div>
              </div>
              <div className="info-section">
                <div className="info-label">Giới tính</div>
                <div className="info-value">{profile?.gender || 'Chưa cập nhật'}</div>
              </div>
              <div className="info-section">
                <div className="info-label">Website</div>
                <div className="info-value">{profile?.website || 'Chưa cập nhật'}</div>
              </div>
              <div className="info-section">
                <div className="info-label">Quê quán</div>
                <div className="info-value">{profile?.hometown || 'Chưa cập nhật'}</div>
              </div>
              <div className="info-section">
                <div className="info-label">Tiểu sử</div>
                <div className="info-value">{profile?.bio || 'Chưa cập nhật'}</div>
              </div>
              <div className="info-section">
                <div className="info-label">Địa chỉ</div>
                <div className="info-value">{profile?.address || 'Chưa cập nhật'}</div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Instagram-style Post Modal */}
      {showPostModal && selectedPostIndex !== null && (
        <PostDetail 
          posts={posts}
          initialIndex={selectedPostIndex}
          userId={userId}
          onClose={() => {
            setShowPostModal(false);
            // Scroll to the post after modal closes
            const postId = posts[selectedPostIndex]?.id;
            if (postId && postRefs.current[postId]) {
              setTimeout(() => {
                postRefs.current[postId].scrollIntoView({ 
                  behavior: 'smooth', 
                  block: 'center' 
                });
              }, 100);
            }
            setSelectedPostIndex(null);
          }}
        />
      )}
    </div>
  );
}
