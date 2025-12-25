import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { API_BASE_URL } from '../../API/Api';
import { getRelativeTime } from '../../Utils/timeUtils';
import './StoryViewer.css';

const StoryViewer = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { userId, stories: paramStories, index: paramIndex } = location.state || {};

  const [stories, setStories] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(paramIndex || 0);
  const [progress, setProgress] = useState(0);
  const [videoDuration, setVideoDuration] = useState(5000);
  const [isPaused, setIsPaused] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userAvatar, setUserAvatar] = useState(null);
  const [userName, setUserName] = useState('User');

  const videoRef = useRef(null);
  const animationRef = useRef(null);
  const longPressTimerRef = useRef(null);
  const containerRef = useRef(null);

  // Initialize stories from location state or fetch
  useEffect(() => {
    console.log('[StoryViewer] Init - paramStories:', paramStories, 'userId:', userId);
    
    if (paramStories && Array.isArray(paramStories) && paramStories.length > 0) {
      // Stories passed via navigation
      const processedStories = paramStories.map(story => ({
        ...story,
        mediaUrl: story.mediaUrl?.startsWith('http') 
          ? story.mediaUrl 
          : `${API_BASE_URL}${story.mediaUrl}`
      }));
      console.log('[StoryViewer] Using passed stories:', processedStories);
      setStories(processedStories);
    } else if (userId) {
      // Fetch stories from API
      fetchUserStories(userId);
    } else {
      console.error('[StoryViewer] No stories or userId provided');
      setTimeout(() => navigate(-1), 1000);
    }
  }, []);

  const fetchUserStories = async (uid) => {
    try {
      console.log('[StoryViewer] Fetching stories for user:', uid);
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`${API_BASE_URL}/stories/user/${uid}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      console.log('[StoryViewer] Fetched stories:', data);
      
      if (Array.isArray(data) && data.length > 0) {
        const processedStories = data.map(story => ({
          ...story,
          mediaUrl: story.mediaUrl?.startsWith('http') 
            ? story.mediaUrl 
            : `${API_BASE_URL}${story.mediaUrl}`
        }));
        setStories(processedStories);
      } else {
        console.error('[StoryViewer] No stories found');
        setStories([]);
      }
    } catch (err) {
      console.error('[StoryViewer] Error fetching stories:', err);
      setStories([]);
    }
  };

  // Load user info from STORY data
  useEffect(() => {
    if (stories.length > 0 && currentIndex < stories.length) {
      const currentStory = stories[currentIndex];
      console.log('[StoryViewer] Current story:', currentStory);

      // Get avatar and name from the STORY OWNER
      const storyOwnerAvatar = currentStory.userAvatar || currentStory.avatarUrl;
      const storyOwnerName = currentStory.userName || currentStory.username || 'User';

      // Process avatar URL
      let avatarUri = null;
      if (storyOwnerAvatar) {
        avatarUri = String(storyOwnerAvatar).startsWith('http')
          ? storyOwnerAvatar
          : `${API_BASE_URL}${storyOwnerAvatar}`;
      }

      console.log('[StoryViewer] Story owner:', storyOwnerName, 'avatar:', avatarUri);
      setUserAvatar(avatarUri);
      setUserName(storyOwnerName);
    }
  }, [currentIndex, stories]);

  // Auto-progress animation
  useEffect(() => {
    if (stories.length === 0 || isPaused || isLoading) return;

    const currentStory = stories[currentIndex];
    const duration = currentStory?.mediaType === 'video' ? videoDuration : 5000;

    setProgress(0);
    const startTime = Date.now();

    const animate = () => {
      if (isPaused || isLoading) return;

      const elapsed = Date.now() - startTime;
      const newProgress = Math.min((elapsed / duration) * 100, 100);
      setProgress(newProgress);

      if (newProgress < 100) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        handleNext();
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [currentIndex, stories, isPaused, isLoading, videoDuration]);

  const handleNext = () => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setProgress(0);
      setIsLoading(true);
    } else {
      navigate(-1);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setProgress(0);
      setIsLoading(true);
    } else {
      navigate(-1);
    }
  };

  const handleClick = (evt) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = evt.clientX - rect.left;
    const width = rect.width;
    
    if (x < width / 2) {
      handlePrevious();
    } else {
      handleNext();
    }
  };

  const handleMouseDown = () => {
    longPressTimerRef.current = setTimeout(() => {
      setIsPaused(true);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (videoRef.current) {
        videoRef.current.pause();
      }
    }, 500); // 500ms long press
  };

  const handleMouseUp = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
    }
    
    if (isPaused) {
      setIsPaused(false);
      if (videoRef.current) {
        videoRef.current.play();
      }
      startAnimation();
    }
  };

  const startAnimation = () => {
    if (stories.length === 0) return;

    const currentStory = stories[currentIndex];
    const duration = currentStory.mediaType === 'video' ? videoDuration : 5000;

    let startTime = null;
    let currentProgress = progress;

    const animate = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      currentProgress = Math.min((elapsed / duration) * 100, 100);

      setProgress(currentProgress);

      if (currentProgress >= 100 && !isPaused) {
        handleNext();
      } else if (!isPaused) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    animationRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    if (stories.length === 0) return;

    setProgress(0);

    if (!isPaused) {
      startAnimation();
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [currentIndex, videoDuration, isPaused, stories]);

  const handleVideoLoad = (e) => {
    setIsLoading(false);
    if (e.target.duration) {
      setVideoDuration(e.target.duration * 1000);
    }
  };

  const handleVideoEnded = () => {
    handleNext();
  };

  if (stories.length === 0) {
    return (
      <div className="story-viewer-container">
        <button 
          className="story-close-button" 
          onClick={(e) => {
            e.stopPropagation();
            navigate('/');
          }}
        >
          ✕
        </button>
        <div className="story-empty">
          <p>Không có story</p>
        </div>
      </div>
    );
  }

  const currentStory = stories[currentIndex];

  return (
    <div
      ref={containerRef}
      className="story-viewer-container"
      onClick={handleClick}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Story Media */}
      <div className="story-media-container">
        {currentStory.mediaType === 'video' ? (
          <video
            ref={videoRef}
            src={currentStory.mediaUrl}
            className="story-media"
            autoPlay
            muted={false}
            onLoadedData={handleVideoLoad}
            onEnded={handleVideoEnded}
            onPlay={() => setIsLoading(false)}
          />
        ) : (
          <img
            src={currentStory.mediaUrl}
            alt="Story"
            className="story-media"
            onLoad={() => setIsLoading(false)}
          />
        )}

        {isLoading && (
          <div className="story-loading-overlay">
            <div className="story-spinner"></div>
          </div>
        )}
      </div>

      {/* Progress Bars */}
      <div className="story-progress-container">
        {stories.map((_, index) => (
          <div key={index} className="story-progress-bar-background">
            <div
              className="story-progress-bar-fill"
              style={{
                width:
                  index === currentIndex
                    ? `${progress}%`
                    : index < currentIndex
                    ? '100%'
                    : '0%',
              }}
            ></div>
          </div>
        ))}
      </div>

      {/* User Info */}
      <div className="story-user-info">
        <img
          src={userAvatar || '/default-avatar.png'}
          alt={userName}
          className="story-user-avatar"
        />
        <div className="story-user-text">
          <span className="story-user-name">{userName}</span>
          <span className="story-time-ago">{getRelativeTime(currentStory.createdAt)}</span>
        </div>
      </div>

      {/* Close Button */}
      <button 
        className="story-close-button" 
        onClick={(e) => {
          e.stopPropagation();
          navigate('/');
        }}
      >
        ✕
      </button>

      {/* Pause Indicator */}
      {isPaused && (
        <div className="story-pause-indicator">
          <i className="fas fa-pause"></i>
        </div>
      )}
    </div>
  );
};

export default StoryViewer;
