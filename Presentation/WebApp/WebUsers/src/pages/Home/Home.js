// Home.js - Complete web version converted from MobileApp
import React, { useEffect, useMemo, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useUser } from '../../context/UserContext';
import { useFollow } from '../../context/FollowContext';
import CommentsModal from './CommentsModal';
import { IoHeartOutline, IoHeart, IoChatbubbleOutline, IoRepeatOutline, IoSendOutline, IoBookmarkOutline, IoEllipsisHorizontal, IoLockClosed, IoPeople, IoEarth, IoPersonCircle } from 'react-icons/io5';
import {
  getFeed,
  updatePostPrivacy,
  updatePostCaption,
  deletePost,
  getProfile,
  getFollowing,
  getFollowers,
  updatePostTags,
  followUser,
  unfollowUser,
  addReaction,
  getReactionSummary,
  getCommentCount,
  API_BASE_URL,
  getFeedStories,
  getMyStories,
} from '../../API/Api';
import { getRelativeTime } from '../../Utils/timeUtils';
import NavigationBar from '../../components/NavigationBar';
import './Home.css';

// Story Components
const StoryAddItem = ({ onPress }) => (
  <div className="story-item" onClick={onPress}>
    <div className="story-avatar-container add-story-container">
      <div className="story-avatar add-story-avatar">
        <span className="plus-text">+</span>
      </div>
    </div>
    <span className="story-name">Thêm</span>
  </div>
);

const StoryItem = ({ id, name, avatar, hasStory, storyData, navigate }) => {
  const handleClick = () => {
    if (hasStory && storyData && storyData.length > 0) {
      navigate('/story-viewer', { state: { stories: storyData, userId: id, index: 0 } });
    }
  };

  return (
    <div className="story-item" onClick={handleClick} style={{ cursor: hasStory ? 'pointer' : 'default' }}>
      <div className={`story-avatar-container ${hasStory ? 'story-avatar-border' : ''}`}>
        {avatar ? (
          <img src={typeof avatar === 'string' ? avatar : avatar.uri} alt={name} className="story-avatar" />
        ) : (
          <div className="story-avatar default-avatar">
            <IoPersonCircle size={56} color="#e5e7eb" />
          </div>
        )}
      </div>
      <span className="story-name">{name}</span>
    </div>
  );
};

// Post Images Carousel Component
const PostImagesCarousel = ({ images = [] }) => {
  const [index, setIndex] = useState(0);
  const [viewerVisible, setViewerVisible] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);

  const handlePrev = () => setIndex(prev => Math.max(0, prev - 1));
  const handleNext = () => setIndex(prev => Math.min(images.length - 1, prev + 1));

  const openViewer = (idx) => {
    setViewerIndex(idx);
    setViewerVisible(true);
  };

  return (
    <div className="post-images-carousel">
      <div className="carousel-container">
        <img
          src={images[index]}
          alt={`Post ${index + 1}`}
          className="post-image"
          onClick={() => openViewer(index)}
        />
        {images.length > 1 && (
          <>
            {index > 0 && (
              <button className="carousel-btn carousel-btn-prev" onClick={handlePrev}>
                ‹
              </button>
            )}
            {index < images.length - 1 && (
              <button className="carousel-btn carousel-btn-next" onClick={handleNext}>
                ›
              </button>
            )}
          </>
        )}
      </div>
      <div className="image-counter">{index + 1}/{images.length}</div>
      <div className="dots-container">
        {images.map((_, i) => (
          <span key={i} className={`dot ${i === index ? 'dot-active' : ''}`} />
        ))}
      </div>
      {viewerVisible && (
        <div className="image-viewer-modal" onClick={() => setViewerVisible(false)}>
          <div className="image-viewer-content" onClick={(e) => e.stopPropagation()}>
            <button className="close-viewer" onClick={() => setViewerVisible(false)}>✕</button>
            <img src={images[viewerIndex]} alt="Full size" />
            <div className="viewer-counter">{viewerIndex + 1}/{images.length}</div>
            {viewerIndex > 0 && (
              <button className="viewer-btn viewer-btn-prev" onClick={() => setViewerIndex(prev => prev - 1)}>‹</button>
            )}
            {viewerIndex < images.length - 1 && (
              <button className="viewer-btn viewer-btn-next" onClick={() => setViewerIndex(prev => prev + 1)}>›</button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Video Thumbnail Component
const VideoThumbnail = ({ videoUrl, onPress }) => {
  return (
    <div className="video-thumbnail" onClick={onPress}>
      <video src={videoUrl} className="post-image" />
      <div className="play-overlay">
        <span className="play-icon">▶</span>
      </div>
    </div>
  );
};

// Reaction Picker Component
const ReactionPicker = ({ visible, position, onSelectReaction }) => {
  if (!visible) return null;

  const reactions = [
    { type: 1, emoji: '❤️', label: 'Like' },
    { type: 2, emoji: '😍', label: 'Love' },
    { type: 3, emoji: '😂', label: 'Haha' },
    { type: 4, emoji: '😮', label: 'Wow' },
    { type: 5, emoji: '😢', label: 'Sad' },
    { type: 6, emoji: '😠', label: 'Angry' },
  ];

  return (
    <div className="reaction-picker" style={{ top: position.top, left: position.left }}>
      {reactions.map(({ type, emoji }) => (
        <button
          key={type}
          className="reaction-btn"
          onClick={() => onSelectReaction(type)}
        >
          {emoji}
        </button>
      ))}
    </div>
  );
};

const getReactionEmoji = (reactionType) => {
  switch (reactionType) {
    case 1: return '❤️';
    case 2: return '😍';
    case 3: return '😂';
    case 4: return '😮';
    case 5: return '😢';
    case 6: return '😠';
    default: return '❤️';
  }
};

export default function Home() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user: ctxUser, logout } = useUser();
  const { markAsFollowed, markAsUnfollowed, isFollowed } = useFollow();

  // State
  const [postStates, setPostStates] = useState({});
  const [activeCommentsPostId, setActiveCommentsPostId] = useState(null);
  const [showComments, setShowComments] = useState(false);
  const [commentsModalVisible, setCommentsModalVisible] = useState(false);
  const [commentsPostId, setCommentsPostId] = useState(null);
  const [posts, setPosts] = useState([]);
  const [myStorySlot, setMyStorySlot] = useState({
    id: 'me',
    name: 'Tin của bạn',
    avatar: null,
    hasStory: false,
    storyData: null,
  });
  const [friendStories, setFriendStories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMorePosts, setHasMorePosts] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [optionsPostId, setOptionsPostId] = useState(null);
  const [showOptions, setShowOptions] = useState(false);
  const [showPrivacySheet, setShowPrivacySheet] = useState(false);
  const [busy, setBusy] = useState(false);
  const [showTagListPostId, setShowTagListPostId] = useState(null);
  const [tagListForModal, setTagListForModal] = useState([]);
  const [showEditTagsPostId, setShowEditTagsPostId] = useState(null);
  const [editTagsList, setEditTagsList] = useState([]);
  const [availableTagUsers, setAvailableTagUsers] = useState([]);
  const [availableTagUsersAll, setAvailableTagUsersAll] = useState([]);
  const [tagChangeQueue, setTagChangeQueue] = useState({ toAdd: [], toRemove: [] });
  const [showAddTagList, setShowAddTagList] = useState(false);
  const [editingCaptionPostId, setEditingCaptionPostId] = useState(null);
  const [captionDraft, setCaptionDraft] = useState('');
  const [showReactionPicker, setShowReactionPicker] = useState(null);
  const [reactionPickerPosition, setReactionPickerPosition] = useState({ top: 0, left: 0 });
  const likeButtonRefs = useRef({});

  // Helper: normalize user
  const normalizeUser = (u) => {
    if (!u) return { id: null, username: '', avatarUrl: null, fullName: '' };
    const rawId = u?.id ?? u?.userId ?? u?.user_id ?? u?.UserId;
    const id = Number(rawId);
    const username = u?.username ?? u?.userName ?? u?.user_name ?? u?.name ?? '';
    const rawAvatar = u?.avatarUrl ?? u?.avatar_url ?? u?.userAvatar ?? null;
    const avatarUrl = rawAvatar ? (String(rawAvatar).startsWith('http') ? rawAvatar : `${API_BASE_URL}${rawAvatar}`) : null;
    const fullName = u?.fullName ?? u?.full_name ?? u?.displayName ?? '';
    return { id: Number.isFinite(id) ? id : null, username, avatarUrl, fullName };
  };

  // Stories data
  const storiesData = useMemo(() => [
    { id: 'add', name: 'Thêm vào chuyện của bạn', avatar: null, hasStory: false, storyData: null },
    myStorySlot,
    ...friendStories
  ], [myStorySlot, friendStories]);

  // Load user avatar
  const loadUserAvatar = async () => {
    try {
      const userStr = localStorage.getItem('userInfo');
      if (userStr) {
        const user = JSON.parse(userStr);
        const rawAvatar = user?.avatarUrl ?? user?.avatar_url ?? null;
        const avatarUri = rawAvatar
          ? String(rawAvatar).startsWith('http') ? rawAvatar : `${API_BASE_URL}${rawAvatar}`
          : null;

        setMyStorySlot(prev => ({
          ...prev,
          name: user?.username || prev.name,
          avatar: avatarUri || null,
        }));

        const key = `currentUserStories_${user?.user_id ?? user?.userId ?? user?.UserId ?? ''}`;
        const savedStoriesStr = localStorage.getItem(key);
        if (savedStoriesStr) {
          try {
            let storiesArray = JSON.parse(savedStoriesStr);
            storiesArray = storiesArray.map(story => ({
              ...story,
              userAvatar: avatarUri,
              userName: user?.username || story.userName,
            }));
            localStorage.setItem(key, JSON.stringify(storiesArray));
            setMyStorySlot(prev => ({
              ...prev,
              storyData: storiesArray,
            }));
          } catch (e) {
            console.warn('[HOME] Failed updating saved stories avatars:', e);
          }
        }
      }
    } catch (e) {
      console.warn('[HOME] Error loading user avatar:', e);
    }
  };

  // Load my stories
  const loadMyStories = async () => {
    try {
      const res = await getMyStories();
      const raw = res?.data ?? res ?? [];
      const list = Array.isArray(raw) ? raw : [];
      
      console.log('[HOME] My stories loaded:', list);
      
      if (list.length > 0) {
        const userStr = localStorage.getItem('userInfo');
        const user = userStr ? JSON.parse(userStr) : null;
        const rawAvatar = user?.avatarUrl ?? user?.avatar_url ?? null;
        const avatarUri = rawAvatar
          ? String(rawAvatar).startsWith('http') ? rawAvatar : `${API_BASE_URL}${rawAvatar}`
          : null;
        
        const storiesData = list.map(s => ({
          id: s.id,
          mediaUrl: s.mediaUrl,
          mediaType: s.mediaType,
          userName: user?.username || 'You',
          userAvatar: avatarUri,
          createdAt: s.createdAt,
          userId: user?.user_id ?? user?.userId ?? user?.UserId,
          privacy: s.privacy || 'public',
          viewCount: s.viewCount || 0,
        }));
        
        setMyStorySlot(prev => ({
          ...prev,
          hasStory: true,
          storyData: storiesData,
        }));
      } else {
        setMyStorySlot(prev => ({
          ...prev,
          hasStory: false,
          storyData: null,
        }));
      }
    } catch (e) {
      console.warn('[HOME] loadMyStories error:', e);
    }
  };

  // Load feed stories
  const loadFeedStories = async () => {
    try {
      const res = await getFeedStories();
      const raw = res?.data ?? res ?? [];
      const list = Array.isArray(raw) ? raw : [];

      const mapped = list
        .filter(userGroup => Number(userGroup.userId) !== Number(currentUserId))
        .map(userGroup => {
          const stories = Array.isArray(userGroup.stories) ? userGroup.stories : [];
          let avatarUrl = userGroup.userAvatar || userGroup.avatarUrl;
          if (avatarUrl && !avatarUrl.startsWith('http')) {
            avatarUrl = `${API_BASE_URL}${avatarUrl}`;
          }

          return {
            id: String(userGroup.userId),
            name: userGroup.userName || userGroup.username || 'user',
            avatar: avatarUrl,
            hasStory: stories.length > 0,
            storyData: stories.length > 0 ? stories.map(s => ({
              id: s.id,
              mediaUrl: s.mediaUrl,
              mediaType: s.mediaType,
              userName: userGroup.userName,
              userAvatar: avatarUrl,
              createdAt: s.createdAt,
              userId: userGroup.userId,
              privacy: s.privacy || 'public',
              viewCount: s.viewCount || 0,
            })) : [],
          };
        });

      setFriendStories(mapped);
    } catch (e) {
      console.warn('[HOME] loadFeedStories error:', e);
    }
  };

  // Initial load
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const userStr = localStorage.getItem('userInfo');
        if (userStr) {
          const user = JSON.parse(userStr);
          const uidNum = Number(user?.user_id ?? user?.userId ?? user?.UserId ?? user?.id);
          if (mounted && Number.isFinite(uidNum)) {
            setCurrentUserId(uidNum);
          }
          await loadUserAvatar();
        }

        try {
          const prof = await getProfile();
          const profId = prof?.userId ?? prof?.UserId;
          if (profId != null) {
            const uid = Number(profId);
            if (Number.isFinite(uid)) {
              if (mounted) setCurrentUserId(uid);
            }
          }
        } catch (e) {
          console.log('[HOME] getProfile() failed (non-fatal):', e?.message || e);
        }

        const data = await getFeed(1, 10);
        if (mounted) {
          let arr = Array.isArray(data) ? data : [];
          arr = arr.slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
          setPosts(arr);
          setCurrentPage(1);
          setHasMorePosts(arr.length >= 10);

          const next = {};
          for (const p of arr) {
            try {
              const reactionData = await getReactionSummary(p.id);
              const topReactions = (reactionData?.reactionCounts || [])
                .sort((a, b) => b.count - a.count)
                .slice(0, 3)
                .map(r => r.reactionType);
              next[p.id] = {
                liked: reactionData?.userReaction != null,
                likes: Number(reactionData?.totalReactions ?? 0),
                shares: Number(p.sharesCount ?? 0),
                comments: Number(p.commentsCount ?? 0),
                reactionType: reactionData?.userReaction,
                topReactions,
                reactionCounts: reactionData?.reactionCounts || [],
              };
            } catch (err) {
              next[p.id] = {
                liked: false,
                likes: Number(p.likesCount ?? 0),
                shares: Number(p.sharesCount ?? 0),
                comments: Number(p.commentsCount ?? 0),
                reactionType: null,
                topReactions: [],
                reactionCounts: [],
              };
            }
          }
          setPostStates(next);
        }

        await loadMyStories();
        await loadFeedStories();
      } catch (e) {
        console.warn('Feed error', e);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (currentUserId != null && Number.isFinite(currentUserId)) {
      loadMyStories();
      loadFeedStories();
    }
  }, [currentUserId]);

  // Helper functions
  const getOwnerId = () => {
    const fromCtx = ctxUser?.user_id ?? ctxUser?.userId ?? ctxUser?.UserId ?? ctxUser?.id;
    const n1 = fromCtx != null ? Number(fromCtx) : null;
    if (Number.isFinite(n1)) return n1;
    const n2 = currentUserId != null ? Number(currentUserId) : null;
    return Number.isFinite(n2) ? n2 : null;
  };

  const isOwner = (post) => {
    const uid = getOwnerId();
    const pidRaw = post?.user?.id;
    const pid = pidRaw != null ? Number(pidRaw) : null;
    return Number.isFinite(uid) && Number.isFinite(pid) && uid === pid;
  };

  const handleFollow = async (post) => {
    const targetUserId = post?.user?.id;
    if (!targetUserId) return;
    try {
      await followUser(targetUserId);
      markAsFollowed(targetUserId);
      await loadFeedStories();
    } catch (e) {
      console.warn('[HOME] Follow error:', e);
      alert(e.message || 'Không thể theo dõi người dùng');
    }
  };

  const handleReaction = async (postId, reactionType) => {
    try {
      setPostStates(prev => {
        const cur = prev[postId] || { liked: false, likes: 0, shares: 0, comments: 0, reactionType: null, topReactions: [], reactionCounts: [] };
        const isSameType = cur.reactionType === reactionType;
        const liked = !isSameType;
        const likes = Math.max(0, cur.likes + (liked ? 1 : isSameType ? -1 : 0));
        return {
          ...prev,
          [postId]: { ...cur, liked, likes, reactionType: liked ? reactionType : null },
        };
      });

      await addReaction(postId, reactionType);

      try {
        const reactionData = await getReactionSummary(postId);
        const topReactions = (reactionData?.reactionCounts || [])
          .sort((a, b) => b.count - a.count)
          .slice(0, 3)
          .map(r => r.reactionType);
        setPostStates(prev => ({
          ...prev,
          [postId]: {
            ...prev[postId],
            liked: reactionData?.userReaction != null,
            likes: Number(reactionData?.totalReactions ?? 0),
            reactionType: reactionData?.userReaction,
            topReactions,
            reactionCounts: reactionData?.reactionCounts || [],
          },
        }));
      } catch (err) {
        console.error('Error loading reaction summary:', err);
      }

      setShowReactionPicker(null);
    } catch (error) {
      console.error('Error adding reaction:', error);
      setPostStates(prev => {
        const cur = prev[postId] || { liked: false, likes: 0, shares: 0, comments: 0 };
        return {
          ...prev,
          [postId]: { ...cur, liked: false, likes: Math.max(0, cur.likes - 1) },
        };
      });
    }
  };

  const onToggleLike = (postId) => {
    handleReaction(postId, 1);
  };

  const onLongPressLike = (postId, e) => {
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    setReactionPickerPosition({
      top: rect.top - 70,
      left: rect.left - 10,
    });
    setShowReactionPicker(postId);
  };

  const onOpenComments = (postId) => {
    setCommentsModalVisible(true);
    setCommentsPostId(postId);
  };

  const onShare = async (post) => {
    const firstMedia = (post.media || [])[0];
    const url = firstMedia?.url || '';
    const text = post.caption ? `${post.caption}${url ? `\n${url}` : ''}` : url || 'Xem bài viết';
    
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Chia sẻ bài đăng', text, url });
      } catch (e) {
        console.log('Share cancelled', e);
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(text);
      alert('Đã sao chép vào clipboard!');
    }

    setPostStates(prev => {
      const cur = prev[post.id] || { liked: false, likes: 0, shares: 0, comments: 0 };
      return { ...prev, [post.id]: { ...cur, shares: cur.shares + 1 } };
    });
  };

  const onRepost = (postId) => {
    setPostStates(prev => {
      const cur = prev[postId] || { liked: false, likes: 0, shares: 0, comments: 0 };
      return { ...prev, [postId]: { ...cur, shares: cur.shares + 1 } };
    });
  };

  const openOptionsFor = (post) => {
    setOptionsPostId(post.id);
    setShowOptions(true);
    setShowPrivacySheet(false);
    setEditingCaptionPostId(null);
  };

  const openTagListModal = (post) => {
    setTagListForModal(post.tags || []);
    setShowTagListPostId(post.id);
  };

  const closeTagListModal = () => {
    setShowTagListPostId(null);
    setTagListForModal([]);
  };

  const openEditTags = async (post) => {
    if (!isOwner(post)) return;
    setShowEditTagsPostId(post.id);
    setEditTagsList((post.tags ? post.tags : []).map(normalizeUser));
    setShowAddTagList(false);

    try {
      const [following, followers] = await Promise.all([
        getFollowing().catch(() => []),
        getFollowers().catch(() => [])
      ]);
      const map = new Map();
      (Array.isArray(following) ? following : []).forEach(u => {
        const nu = normalizeUser(u);
        if (nu.id != null) map.set(nu.id, nu);
      });
      (Array.isArray(followers) ? followers : []).forEach(u => {
        const nu = normalizeUser(u);
        if (nu.id != null) map.set(nu.id, nu);
      });
      const all = Array.from(map.values());
      setAvailableTagUsersAll(all);
      setAvailableTagUsers(all);
      setTagChangeQueue({ toAdd: [], toRemove: [] });
    } catch (e) {
      setAvailableTagUsersAll([]);
      setAvailableTagUsers([]);
      setTagChangeQueue({ toAdd: [], toRemove: [] });
    }
  };

  const closeEditTags = () => {
    setShowEditTagsPostId(null);
    setEditTagsList([]);
    setAvailableTagUsers([]);
    setAvailableTagUsersAll([]);
    setTagChangeQueue({ toAdd: [], toRemove: [] });
    setShowAddTagList(false);
  };

  const submitEditTags = async (postId) => {
    try {
      setBusy(true);
      const tagIds = (editTagsList || []).map(t => Number(t?.id)).filter(x => Number.isFinite(x) && x > 0);
      const updated = await updatePostTags(postId, tagIds);
      setPosts(prev => prev.map(p => {
        try {
          if (Number(p.id) === Number(postId)) {
            const newTags = (updated && Array.isArray(updated.tags)) ? updated.tags : (editTagsList || []);
            return { ...p, tags: newTags };
          }
        } catch { }
        return p;
      }));
      closeEditTags();
    } catch (e) {
      console.warn('Update tags error', e);
      alert(e.message || 'Không thể cập nhật tags');
    } finally {
      setBusy(false);
    }
  };

  const closeAllOverlays = () => {
    setShowOptions(false);
    setShowPrivacySheet(false);
    setOptionsPostId(null);
    setEditingCaptionPostId(null);
    setCaptionDraft('');
  };

  const pickPrivacy = async (privacyKey) => {
    if (!optionsPostId) return;
    try {
      setBusy(true);
      const updated = await updatePostPrivacy(optionsPostId, privacyKey);
      setPosts(prev => prev.map(p =>
        p.id === optionsPostId ? { ...p, privacy: updated?.privacy ?? privacyKey } : p
      ));
      closeAllOverlays();
    } catch (e) {
      console.warn('Update privacy error', e);
    } finally {
      setBusy(false);
    }
  };

  const startEditCaption = (post) => {
    setEditingCaptionPostId(post.id);
    setCaptionDraft(post.caption || '');
  };

  const submitCaptionEdit = async () => {
    if (!editingCaptionPostId) return;
    try {
      setBusy(true);
      const updated = await updatePostCaption(editingCaptionPostId, captionDraft);
      setPosts(prev => prev.map(p =>
        p.id === editingCaptionPostId ? { ...p, caption: updated?.caption ?? captionDraft } : p
      ));
      closeAllOverlays();
    } catch (e) {
      console.warn('Update caption error', e);
    } finally {
      setBusy(false);
    }
  };

  const confirmDelete = async () => {
    if (!optionsPostId) return;
    if (window.confirm('Bạn có chắc muốn xóa bài đăng này?')) {
      try {
        setBusy(true);
        await deletePost(optionsPostId);
        setPosts(prev => prev.filter(p => p.id !== optionsPostId));
        closeAllOverlays();
      } catch (e) {
        console.warn('Delete post error', e);
      } finally {
        setBusy(false);
      }
    }
  };

  const handleAddStory = () => {
    navigate('/create-story');
  };

  const handleCameraPress = () => {
    navigate('/camera');
  };

  const openVideoPlayerFor = (post) => {
    const videos = posts.filter(pp =>
      (pp.media || []).some(m => (m.type || '').toLowerCase() === 'video')
    );
    navigate('/video-player', {
      state: {
        videos,
        selectedId: post.id,
        userId: post.user?.id,
        username: post.user?.username,
      }
    });
  };

  const onRefreshFeed = async () => {
    try {
      setRefreshing(true);
      const data = await getFeed(1, 10);
      let arr = Array.isArray(data) ? data : data?.data ?? [];
      arr = arr.slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setPosts(arr);
      setCurrentPage(1);
      setHasMorePosts(arr.length >= 10);

      const next = {};
      for (const p of arr) {
        try {
          const reactionData = await getReactionSummary(p.id);
          const topReactions = (reactionData?.reactionCounts || [])
            .sort((a, b) => b.count - a.count)
            .slice(0, 3)
            .map(r => r.reactionType);
          next[p.id] = {
            liked: reactionData?.userReaction != null,
            likes: Number(reactionData?.totalReactions ?? 0),
            shares: Number(p.sharesCount ?? 0),
            comments: Number(p.commentsCount ?? 0),
            reactionType: reactionData?.userReaction,
            topReactions,
            reactionCounts: reactionData?.reactionCounts || [],
          };
        } catch (err) {
          next[p.id] = {
            liked: false,
            likes: Number(p.likesCount ?? 0),
            shares: Number(p.sharesCount ?? 0),
            comments: Number(p.commentsCount ?? 0),
            reactionType: null,
            topReactions: [],
            reactionCounts: [],
          };
        }
      }
      setPostStates(next);
      await loadUserAvatar();
      await loadFeedStories();
    } catch (e) {
      console.warn('Refresh feed error', e);
    } finally {
      setRefreshing(false);
    }
  };

  const handleScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - scrollTop <= clientHeight * 1.5 && !loadingMore && hasMorePosts) {
      loadMorePosts();
    }
  };

  const loadMorePosts = async () => {
    if (loadingMore || !hasMorePosts) return;
    try {
      setLoadingMore(true);
      const nextPage = currentPage + 1;
      const data = await getFeed(nextPage, 10);
      let arr = Array.isArray(data) ? data : data?.data ?? [];
      if (arr.length === 0) {
        setHasMorePosts(false);
        return;
      }
      arr = arr.slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setPosts(prev => [...prev, ...arr]);
      setCurrentPage(nextPage);
      setHasMorePosts(arr.length >= 10);

      const newStates = {};
      for (const p of arr) {
        try {
          const reactionData = await getReactionSummary(p.id);
          const topReactions = (reactionData?.reactionCounts || [])
            .sort((a, b) => b.count - a.count)
            .slice(0, 3)
            .map(r => r.reactionType);
          newStates[p.id] = {
            liked: reactionData?.userReaction != null,
            likes: Number(reactionData?.totalReactions ?? 0),
            shares: Number(p.sharesCount ?? 0),
            comments: Number(p.commentsCount ?? 0),
            reactionType: reactionData?.userReaction,
            topReactions,
            reactionCounts: reactionData?.reactionCounts || [],
          };
        } catch (err) {
          newStates[p.id] = {
            liked: false,
            likes: Number(p.likesCount ?? 0),
            shares: Number(p.sharesCount ?? 0),
            comments: Number(p.commentsCount ?? 0),
            reactionType: null,
            topReactions: [],
            reactionCounts: [],
          };
        }
      }
      setPostStates(prev => ({ ...prev, ...newStates }));
    } catch (e) {
      console.warn('Load more posts error', e);
    } finally {
      setLoadingMore(false);
    }
  };

  if (loading) {
    return <div className="home-loading">Đang tải...</div>;
  }

  return (
    <div className="home-container">
      {/* Main Feed Content */}
      <div className="home-content" onScroll={handleScroll}>
        <div className="stories-container">
          <div className="stories-scroll">
            {storiesData.map(item =>
              item.id === 'add' ? (
                <StoryAddItem key={item.id} onPress={handleAddStory} />
              ) : (
                <StoryItem
                  key={item.id}
                  id={item.id}
                  name={item.name}
                  avatar={item.avatar}
                  hasStory={item.hasStory}
                  storyData={item.storyData}
                  navigate={navigate}
                />
              )
            )}
          </div>
        </div>

        <div className="feed">
          {posts.length === 0 ? (
            <p className="empty-feed">Chưa có bài viết nào</p>
          ) : (
            posts.map(p => (
              <div key={p.id} className="post">
                <div className="post-header">
                  <div className="post-header-left" onClick={() => {
                    const uid = getOwnerId();
                    const pid = p?.user?.id != null ? Number(p.user.id) : null;
                    if (Number.isFinite(uid) && Number.isFinite(pid) && uid === pid) {
                      navigate('/profile');
                    } else {
                      navigate(`/user/${pid}`);
                    }
                  }}>
                    {(() => {
                      const rawAvatar = p.user?.avatarUrl ?? p.user?.avatar_url ?? null;
                      const avatarUri = rawAvatar ? (String(rawAvatar).startsWith('http') ? rawAvatar : `${API_BASE_URL}${rawAvatar}`) : null;
                      return avatarUri ? (
                        <img src={avatarUri} alt={p.user?.username} className="post-avatar" />
                      ) : (
                        <div className="post-avatar default-avatar">
                          <IoPersonCircle size={32} color="#e5e7eb" />
                        </div>
                      );
                    })()}
                    <div>
                      <div className="post-user-row">
                        <span className="post-username">{p.user?.username || 'user'}</span>
                        {p.tags && p.tags.length > 0 && (
                          <div className="inline-tags">
                            {(() => {
                              const first = p.tags[0];
                              const rest = p.tags.length - 1;
                              const uid = getOwnerId();
                              const isCurrentUser = Number(first.id) === Number(uid);
                              return (
                                <>
                                  <span
                                    className="inline-tag-text"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (isCurrentUser) navigate('/profile');
                                      else navigate(`/user/${first.id}`);
                                    }}
                                  >
                                    {isCurrentUser ? ' bạn' : ` @${first.username}`}
                                  </span>
                                  {rest > 0 && (
                                    <span className="more-tags" onClick={(e) => { e.stopPropagation(); openTagListModal(p); }}>
                                      +{rest}
                                    </span>
                                  )}
                                </>
                              );
                            })()}
                          </div>
                        )}
                      </div>
                      <div className="post-meta-row">
                        <span className="post-time">{getRelativeTime(p.createdAt)}</span>
                        {p.privacy && (
                          <div className="privacy-pill">
                            <span className="privacy-icon">
                              {p.privacy === 'private' ? <IoLockClosed size={12} /> : p.privacy === 'followers' ? <IoPeople size={12} /> : <IoEarth size={12} />}
                            </span>
                            <span className="privacy-text">
                              {p.privacy === 'private' ? 'Riêng tư' : p.privacy === 'followers' ? 'Bạn bè' : 'Công khai'}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="post-header-actions">
                    {!isOwner(p) && !isFollowed(p?.user?.id) && (
                      <button className="follow-btn" onClick={() => handleFollow(p)}>
                        Theo dõi
                      </button>
                    )}
                    <button className="more-btn" onClick={() => openOptionsFor(p)}>
                      <IoEllipsisHorizontal size={24} />
                    </button>
                  </div>
                </div>

                <div className="post-image-container">
                  {p.media && p.media.length > 0 ? (() => {
                    const images = (p.media || [])
                      .filter(m => (m.type || '').toLowerCase() === 'image')
                      .map(m => {
                        const url = m.url || '';
                        // If URL already starts with http (from server's BaseUrl or Cloudinary), use as-is
                        // Otherwise prepend API_BASE_URL
                        return url.startsWith('http') || url.startsWith('blob:') ? url : `${API_BASE_URL}${url}`;
                      });
                    const videos = (p.media || [])
                      .filter(m => (m.type || '').toLowerCase() === 'video')
                      .map(m => {
                        const url = m.url || '';
                        return {
                          ...m,
                          url: url.startsWith('http') || url.startsWith('blob:') ? url : `${API_BASE_URL}${url}`
                        };
                      });
                    
                    console.log('[Home] Post media - images:', images, 'videos:', videos);
                    if (images.length > 1) {
                      return <PostImagesCarousel images={images} />;
                    }
                    if (images.length === 1) {
                      return (
                        <img 
                          src={images[0]} 
                          alt="Post" 
                          className="post-image"
                          onError={(e) => {
                            console.warn('[Home] Failed to load image:', images[0]);
                            e.target.style.display = 'none';
                            const parent = e.target.parentElement;
                            if (parent && !parent.querySelector('.image-load-error')) {
                              const errorDiv = document.createElement('div');
                              errorDiv.className = 'image-load-error';
                              errorDiv.textContent = '⚠️ Ảnh không khả dụng';
                              errorDiv.style.cssText = 'padding: 60px 20px; text-align: center; background: #f3f4f6; color: #6b7280; font-size: 14px;';
                              parent.appendChild(errorDiv);
                            }
                          }}
                        />
                      );
                    }
                    if (videos.length > 0) {
                      return <VideoThumbnail videoUrl={videos[0].url} onPress={() => openVideoPlayerFor(p)} />;
                    }
                    return null;
                  })() : null}
                </div>

                <div className="post-actions">
                  <div className="post-actions-left">
                    <button
                      ref={el => { if (el) likeButtonRefs.current[p.id] = el; }}
                      onClick={() => onToggleLike(p.id)}
                      onContextMenu={(e) => onLongPressLike(p.id, e)}
                      className="action-btn like-btn"
                    >
                      {postStates[p.id]?.reactionType ? (
                        <span className="reaction-emoji">{getReactionEmoji(postStates[p.id].reactionType)}</span>
                      ) : (
                        <IoHeartOutline className="icon" size={24} />
                      )}
                    </button>
                    <button className="action-btn comment-btn" onClick={() => onOpenComments(p.id)}>
                      <IoChatbubbleOutline className="icon" size={24} />
                      <span className="count">{postStates[p.id]?.comments ?? 0}</span>
                    </button>
                    <button className="action-btn repost-btn" onClick={() => onRepost(p.id)}>
                      <IoRepeatOutline className="icon" size={24} />
                    </button>
                    <button className="action-btn share-btn" onClick={() => onShare(p)}>
                      <IoSendOutline className="icon" size={24} />
                    </button>
                  </div>
                </div>

                <div className="post-stats">
                  <div className="stats-row">
                    {postStates[p.id]?.topReactions?.length > 0 && (
                      <div className="top-reactions">
                        {postStates[p.id].topReactions.map((type, idx) => (
                          <span key={idx} className="top-reaction">{getReactionEmoji(type)}</span>
                        ))}
                      </div>
                    )}
                    <span className="like-count">
                      {(postStates[p.id]?.likes ?? 0).toLocaleString()} lượt thích • {(postStates[p.id]?.shares ?? 0).toLocaleString()} lượt chia sẻ
                    </span>
                  </div>
                  {p.tags && p.tags.length > 0 && (
                    <div className="tagged-users">
                      <span className="tagged-label">với </span>
                      {p.tags.map((tag, index) => {
                        const uid = getOwnerId();
                        const isCurrentUser = Number(tag.id) === Number(uid);
                        return (
                          <React.Fragment key={tag.id}>
                            <span
                              className="tagged-username"
                              onClick={() => {
                                if (isCurrentUser) navigate('/profile');
                                else navigate(`/user/${tag.id}`);
                              }}
                            >
                              {isCurrentUser ? 'bạn' : `@${tag.username}`}
                            </span>
                            {index < p.tags.length - 1 && <span className="tagged-label">, </span>}
                          </React.Fragment>
                        );
                      })}
                    </div>
                  )}
                  {p.caption && (
                    <p className="caption-text">
                      {p.caption.split(/(@\w+)/g).map((part, index) => {
                        if (part.startsWith('@')) {
                          const username = part.substring(1);
                          const uid = getOwnerId();
                          const mentionedUser = p.mentions?.find(m => m.username === username);
                          const isCurrentUser = mentionedUser && Number(mentionedUser.id) === Number(uid);
                          return (
                            <span
                              key={index}
                              className="mention-text"
                              onClick={() => {
                                if (mentionedUser) {
                                  if (isCurrentUser) navigate('/profile');
                                  else navigate(`/user/${mentionedUser.id}`);
                                }
                              }}
                            >
                              {isCurrentUser ? 'bạn' : part}
                            </span>
                          );
                        }
                        return part;
                      })}
                    </p>
                  )}
                </div>
              </div>
            ))
          )}
          {loadingMore && <div className="loading-more">Đang tải thêm...</div>}
        </div>
      </div>

      {/* Tag List Modal */}
      {showTagListPostId && (
        <div className="overlay" onClick={closeTagListModal}>
          <div className="sheet tag-list-sheet" onClick={e => e.stopPropagation()}>
            <h3 className="sheet-title">Những người được gắn thẻ</h3>
            <div className="tag-list">
              {Array.isArray(tagListForModal) && tagListForModal.length > 0 ? (
                tagListForModal.map(t => (
                  <div key={t.id} className="tag-list-item" onClick={() => {
                    const uid = getOwnerId();
                    const isCurrentUser = Number(t.id) === Number(uid);
                    if (isCurrentUser) navigate('/profile');
                    else navigate(`/user/${t.id}`);
                  }}>
                    {t.avatarUrl ? (
                      <img src={t.avatarUrl} alt={t.username} className="tag-list-avatar" />
                    ) : (
                      <div className="tag-list-avatar default-avatar">
                        <IoPersonCircle size={36} color="#e5e7eb" />
                      </div>
                    )}
                    <span className="tag-list-name">{t.username || 'user'}</span>
                  </div>
                ))
              ) : (
                <p className="no-tags">Không có người được gắn thẻ</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Tags Modal */}
      {showEditTagsPostId && (
        <div className="overlay" onClick={closeEditTags}>
          <div className="sheet edit-tags-sheet" onClick={e => e.stopPropagation()}>
            <div className="sheet-header-row">
              <h3 className="sheet-title">Chỉnh sửa gắn thẻ</h3>
              <button
                className="add-button-header"
                onClick={() => setShowAddTagList(prev => !prev)}
              >
                {showAddTagList ? '×' : '+'}
              </button>
            </div>
            <p className="helper-text">Nhấn ✕ trên chip để gỡ; nhấn + để thêm người chưa được gắn</p>

            <div className="tag-chips">
              {(editTagsList || []).map(t => (
                <div key={t.id} className="tag-chip">
                  {t.avatarUrl ? (
                    <img src={t.avatarUrl} alt={t.username} className="tag-chip-avatar" />
                  ) : (
                    <div className="tag-chip-avatar default-avatar">
                      <IoPersonCircle size={20} color="#e5e7eb" />
                    </div>
                  )}
                  <span className="tag-chip-text">{t.username || t.fullName || 'user'}</span>
                  <button
                    className="tag-chip-close"
                    onClick={() => {
                      setEditTagsList(prev => (prev || []).filter(x => Number(x.id) !== Number(t.id)));
                      setTagChangeQueue(prev => {
                        const toAdd = new Set(prev.toAdd || []);
                        const toRemove = new Set(prev.toRemove || []);
                        if (toAdd.has(Number(t.id))) {
                          toAdd.delete(Number(t.id));
                        } else {
                          toRemove.add(Number(t.id));
                        }
                        return { toAdd: Array.from(toAdd), toRemove: Array.from(toRemove) };
                      });
                    }}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>

            {showAddTagList && (
              <div className="user-list">
                {(availableTagUsersAll || [])
                  .filter(u => !(editTagsList || []).find(x => Number(x.id) === Number(u.id)))
                  .map(item => {
                    const selected = !!(editTagsList || []).find(x => Number(x.id) === Number(item.id));
                    return (
                      <div
                        key={item.id}
                        className="user-item"
                        onClick={() => {
                          if (selected) {
                            setEditTagsList(prev => (prev || []).filter(x => Number(x.id) !== Number(item.id)));
                            setTagChangeQueue(prev => {
                              const toAdd = new Set(prev.toAdd || []);
                              const toRemove = new Set(prev.toRemove || []);
                              if (toAdd.has(Number(item.id))) {
                                toAdd.delete(Number(item.id));
                              } else {
                                toRemove.add(Number(item.id));
                              }
                              return { toAdd: Array.from(toAdd), toRemove: Array.from(toRemove) };
                            });
                          } else {
                            setEditTagsList(prev => [...(prev || []), normalizeUser(item)]);
                            setTagChangeQueue(prev => {
                              const toAdd = new Set(prev.toAdd || []);
                              const toRemove = new Set(prev.toRemove || []);
                              if (toRemove.has(Number(item.id))) {
                                toRemove.delete(Number(item.id));
                              } else {
                                toAdd.add(Number(item.id));
                              }
                              return { toAdd: Array.from(toAdd), toRemove: Array.from(toRemove) };
                            });
                          }
                        }}
                      >
                        {item.avatarUrl ? (
                          <img src={item.avatarUrl} alt={item.username} className="user-avatar" />
                        ) : (
                          <div className="user-avatar default-avatar">
                            <IoPersonCircle size={40} color="#e5e7eb" />
                          </div>
                        )}
                        <div className="user-info">
                          <div className="user-username">@{item.username}</div>
                          <div className="user-fullname">{item.fullName || item.username}</div>
                        </div>
                        {selected && <span className="checkmark">✓</span>}
                      </div>
                    );
                  })}
              </div>
            )}

            <div className="edit-tags-actions">
              <button className="action-button cancel-button" onClick={closeEditTags}>Hủy</button>
              <button className="action-button save-button" onClick={() => submitEditTags(showEditTagsPostId)}>Lưu</button>
            </div>
          </div>
        </div>
      )}

      {/* Options Modal */}
      {showOptions && (
        <div className="overlay" onClick={closeAllOverlays}>
          <div className="sheet" onClick={e => e.stopPropagation()}>
            <h3 className="sheet-title">Tùy chọn</h3>
            {(() => {
              const post = posts.find(x => x.id === optionsPostId);
              if (post && isOwner(post)) {
                return (
                  <>
                    <button className="sheet-item" onClick={() => { setShowOptions(false); openEditTags(post); }}>
                      Chỉnh sửa gắn thẻ
                    </button>
                    <button className="sheet-item" onClick={() => setShowPrivacySheet(true)}>
                      Chỉnh sửa quyền riêng tư
                    </button>
                    <button className="sheet-item" onClick={() => startEditCaption(post)}>
                      Chỉnh sửa bài đăng
                    </button>
                    <button className="sheet-item delete" onClick={confirmDelete}>
                      Xóa bài đăng
                    </button>
                  </>
                );
              }
              return (
                <>
                  <button className="sheet-item" onClick={closeAllOverlays}>Báo cáo</button>
                  <button className="sheet-item" onClick={() => {
                    setPosts(prev => prev.filter(p => p.id !== optionsPostId));
                    closeAllOverlays();
                  }}>Ẩn bài viết</button>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* Privacy Sheet */}
      {showOptions && showPrivacySheet && (
        <div className="overlay" onClick={closeAllOverlays}>
          <div className="sheet" onClick={e => e.stopPropagation()}>
            <h3 className="sheet-title">Chọn quyền riêng tư</h3>
            {[
              { k: 'public', label: 'Public' },
              { k: 'followers', label: 'Followers' },
              { k: 'private', label: 'Private' },
            ].map(opt => (
              <button key={opt.k} className="sheet-item" onClick={() => pickPrivacy(opt.k)}>
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Edit Caption Modal */}
      {editingCaptionPostId && (
        <div className="overlay" onClick={closeAllOverlays}>
          <div className="edit-caption-sheet" onClick={e => e.stopPropagation()}>
            <div className="sheet-header">
              <h3 className="sheet-title">Chỉnh sửa caption</h3>
              <button className="close-btn" onClick={closeAllOverlays}>✕</button>
            </div>
            <div className="edit-caption-content">
              <textarea
                value={captionDraft}
                onChange={e => setCaptionDraft(e.target.value)}
                placeholder="Nhập caption..."
                maxLength={2200}
                autoFocus
              />
              <span className="char-counter">{captionDraft.length}/2200</span>
            </div>
            <div className="edit-caption-actions">
              <button className="action-button cancel-button" onClick={closeAllOverlays}>Hủy</button>
              <button className="action-button save-button" onClick={submitCaptionEdit}>Lưu</button>
            </div>
          </div>
        </div>
      )}

      {/* Busy Overlay */}
      {busy && (
        <div className="busy-overlay">
          <div className="spinner" />
        </div>
      )}

      {/* Reaction Picker */}
      {showReactionPicker && (
        <div className="reaction-overlay" onClick={() => setShowReactionPicker(null)}>
          <ReactionPicker
            visible={showReactionPicker !== null}
            position={reactionPickerPosition}
            onSelectReaction={(reactionType) => handleReaction(showReactionPicker, reactionType)}
          />
        </div>
      )}

      {/* Comments Modal */}
      {commentsModalVisible && (
        <CommentsModal
          visible={commentsModalVisible}
          onClose={() => {
            setCommentsModalVisible(false);
            setCommentsPostId(null);
          }}
          postId={commentsPostId}
          post={posts.find(p => p.id === commentsPostId)}
          onCommentAdded={() => {
            // Refresh comment count for this post
            if (commentsPostId) {
              const post = posts.find(p => p.id === commentsPostId);
              if (post) {
                setPostStates(prev => ({
                  ...prev,
                  [commentsPostId]: {
                    ...prev[commentsPostId],
                    commentCount: (prev[commentsPostId]?.commentCount || 0) + 1
                  }
                }));
              }
            }
          }}
        />
      )}

      <NavigationBar />
    </div>
  );
}