import React, { useState, useRef, useEffect } from 'react';
import './ImageViewer.css';

export default function ImageViewer({ visible, images, initialIndex = 0, onClose }) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const containerRef = useRef(null);

  useEffect(() => {
    setCurrentIndex(initialIndex);
  }, [initialIndex]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') handlePrev();
      if (e.key === 'ArrowRight') handleNext();
    };

    if (visible) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [visible, currentIndex]);

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleNext = () => {
    if (currentIndex < images.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  if (!visible || !images || images.length === 0) return null;

  const currentImage = images[currentIndex];

  return (
    <div className="image-viewer-overlay" onClick={onClose}>
      <div className="image-viewer-container" onClick={(e) => e.stopPropagation()} ref={containerRef}>
        {/* Header */}
        <div className="image-viewer-header">
          <button className="image-viewer-close" onClick={onClose}>
            ✕
          </button>
          
          <span className="image-viewer-counter">
            {currentIndex + 1} / {images.length}
          </span>
          
          <div className="image-viewer-actions">
            <button className="image-viewer-icon-btn" title="Download">
              ⬇
            </button>
            <button className="image-viewer-icon-btn" title="More">
              ⋯
            </button>
          </div>
        </div>

        {/* Image Display */}
        <div className="image-viewer-content">
          {currentIndex > 0 && (
            <button className="image-viewer-nav-btn prev" onClick={handlePrev}>
              ‹
            </button>
          )}

          <img
            src={currentImage.mediaUri || currentImage.uri}
            alt={`${currentIndex + 1} / ${images.length}`}
            className="image-viewer-image"
          />

          {currentIndex < images.length - 1 && (
            <button className="image-viewer-nav-btn next" onClick={handleNext}>
              ›
            </button>
          )}
        </div>

        {/* Footer with sender info */}
        {currentImage.userName && (
          <div className="image-viewer-footer">
            <div className="image-viewer-sender">
              <div className="image-viewer-avatar">
                {currentImage.userAvatar ? (
                  <img src={currentImage.userAvatar} alt={currentImage.userName} />
                ) : (
                  '👤'
                )}
              </div>
              <div className="image-viewer-sender-text">
                <div className="image-viewer-sender-name">{currentImage.userName}</div>
                {currentImage.timestamp && (
                  <div className="image-viewer-timestamp">
                    {new Date(currentImage.timestamp).toLocaleDateString('vi-VN', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                )}
              </div>
            </div>
            {currentImage.message && (
              <p className="image-viewer-caption">{currentImage.message}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
