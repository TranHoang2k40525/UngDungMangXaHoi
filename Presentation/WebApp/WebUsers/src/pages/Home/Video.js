import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './Video.css';

const Video = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { videoUrl, postId, caption, username, userAvatar } = location.state || {};

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const controlsTimeoutRef = useRef(null);

  useEffect(() => {
    if (!videoUrl) {
      navigate('/');
      return;
    }

    // Auto-hide controls after 3 seconds
    const hideControls = () => {
      controlsTimeoutRef.current = setTimeout(() => {
        if (isPlaying) {
          setShowControls(false);
        }
      }, 3000);
    };

    if (showControls) {
      hideControls();
    }

    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [showControls, isPlaying, videoUrl, navigate]);

  // Fullscreen change listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(
        document.fullscreenElement === containerRef.current ||
        document.webkitFullscreenElement === containerRef.current ||
        document.mozFullScreenElement === containerRef.current
      );
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
    };
  }, []);

  const handlePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
      setIsLoading(false);
    }
  };

  const handleSeek = (e) => {
    const seekTime = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = seekTime;
      setCurrentTime(seekTime);
    }
  };

  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.volume = newVolume;
      setVolume(newVolume);
      setIsMuted(newVolume === 0);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      const newMutedState = !isMuted;
      videoRef.current.muted = newMutedState;
      setIsMuted(newMutedState);
      if (newMutedState) {
        setVolume(0);
      } else {
        setVolume(videoRef.current.volume);
      }
    }
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;

    if (!isFullscreen) {
      if (containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen();
      } else if (containerRef.current.webkitRequestFullscreen) {
        containerRef.current.webkitRequestFullscreen();
      } else if (containerRef.current.mozRequestFullScreen) {
        containerRef.current.mozRequestFullScreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      } else if (document.mozCancelFullScreen) {
        document.mozCancelFullScreen();
      }
    }
  };

  const formatTime = (seconds) => {
    if (isNaN(seconds) || seconds === null || seconds === undefined) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
  };

  const handleVideoClick = () => {
    handlePlayPause();
    setShowControls(true);
  };

  const handleVideoEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const handleCanPlay = () => {
    setIsLoading(false);
  };

  const handleWaiting = () => {
    setIsLoading(true);
  };

  if (!videoUrl) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      className={`video-player-container ${isFullscreen ? 'fullscreen' : ''}`}
      onMouseMove={handleMouseMove}
    >
      {/* Header */}
      <div className={`video-header ${showControls ? 'visible' : ''}`}>
        <button className="video-back-button" onClick={() => navigate(-1)}>
          <i className="fas fa-arrow-left"></i>
        </button>
        <div className="video-user-info">
          {userAvatar && (
            <img src={userAvatar} alt={username} className="video-user-avatar" />
          )}
          <span className="video-username">{username || 'User'}</span>
        </div>
      </div>

      {/* Video Element */}
      <video
        ref={videoRef}
        src={videoUrl}
        className="video-element"
        onClick={handleVideoClick}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleVideoEnded}
        onCanPlay={handleCanPlay}
        onWaiting={handleWaiting}
        playsInline
      />

      {/* Loading Spinner */}
      {isLoading && (
        <div className="video-loading-overlay">
          <div className="video-spinner"></div>
        </div>
      )}

      {/* Play/Pause Overlay Icon */}
      {!isPlaying && !isLoading && (
        <div className="video-play-overlay" onClick={handleVideoClick}>
          <i className="fas fa-play"></i>
        </div>
      )}

      {/* Controls */}
      <div className={`video-controls ${showControls ? 'visible' : ''}`}>
        {/* Progress Bar */}
        <div className="video-progress-container">
          <input
            type="range"
            className="video-progress-bar"
            min="0"
            max={duration || 0}
            value={currentTime}
            onChange={handleSeek}
            step="0.1"
          />
          <div className="video-time-display">
            <span className="video-current-time">{formatTime(currentTime)}</span>
            <span className="video-separator">/</span>
            <span className="video-duration">{formatTime(duration)}</span>
          </div>
        </div>

        {/* Bottom Controls */}
        <div className="video-bottom-controls">
          {/* Left Controls */}
          <div className="video-controls-left">
            <button className="video-control-button" onClick={handlePlayPause}>
              <i className={`fas ${isPlaying ? 'fa-pause' : 'fa-play'}`}></i>
            </button>

            {/* Volume Control */}
            <div className="video-volume-container">
              <button className="video-control-button" onClick={toggleMute}>
                <i
                  className={`fas ${
                    isMuted || volume === 0
                      ? 'fa-volume-mute'
                      : volume < 0.5
                      ? 'fa-volume-down'
                      : 'fa-volume-up'
                  }`}
                ></i>
              </button>
              <input
                type="range"
                className="video-volume-slider"
                min="0"
                max="1"
                step="0.1"
                value={volume}
                onChange={handleVolumeChange}
              />
            </div>
          </div>

          {/* Right Controls */}
          <div className="video-controls-right">
            <button className="video-control-button" onClick={toggleFullscreen}>
              <i className={`fas ${isFullscreen ? 'fa-compress' : 'fa-expand'}`}></i>
            </button>
          </div>
        </div>

        {/* Caption */}
        {caption && (
          <div className="video-caption">
            <p>{caption}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Video;
