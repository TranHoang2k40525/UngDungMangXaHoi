import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './PhotoPreview.css';

export default function PhotoPreview() {
  const navigate = useNavigate();
  const location = useLocation();
  const { images, initialIndex = 0 } = location.state || { images: [], initialIndex: 0 };
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [scale, setScale] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  useEffect(() => {
    // Reset scale and position when image changes
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }, [currentIndex]);

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  const handleNext = () => {
    if (currentIndex < images.length - 1) {
      setCurrentIndex(prev => prev + 1);
    }
  };

  const handleZoomIn = () => {
    setScale(prev => Math.min(prev + 0.5, 3));
  };

  const handleZoomOut = () => {
    setScale(prev => Math.max(prev - 0.5, 0.5));
  };

  const handleResetZoom = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  const handleMouseDown = (e) => {
    if (scale > 1) {
      setIsDragging(true);
      setDragStart({
        x: e.clientX - position.x,
        y: e.clientY - position.y
      });
    }
  };

  const handleMouseMove = (e) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Escape') {
      navigate(-1);
    } else if (e.key === 'ArrowLeft') {
      handlePrev();
    } else if (e.key === 'ArrowRight') {
      handleNext();
    } else if (e.key === '+' || e.key === '=') {
      handleZoomIn();
    } else if (e.key === '-') {
      handleZoomOut();
    } else if (e.key === '0') {
      handleResetZoom();
    }
  };

  useEffect(() => {
    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [currentIndex, scale]);

  if (!images || images.length === 0) {
    return (
      <div className="photo-preview-container">
        <div className="empty-state">
          <p>Không có ảnh để hiển thị</p>
          <button onClick={() => navigate(-1)}>Quay lại</button>
        </div>
      </div>
    );
  }

  const currentImage = images[currentIndex];

  return (
    <div 
      className="photo-preview-container"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <div className="photo-preview-header">
        <button className="close-button" onClick={() => navigate(-1)}>
          ✕
        </button>
        <div className="image-counter">
          {currentIndex + 1} / {images.length}
        </div>
        <div className="zoom-controls">
          <button onClick={handleZoomOut} title="Zoom Out (-)">
            −
          </button>
          <button onClick={handleResetZoom} title="Reset Zoom (0)">
            {Math.round(scale * 100)}%
          </button>
          <button onClick={handleZoomIn} title="Zoom In (+)">
            +
          </button>
        </div>
      </div>

      <div className="photo-preview-content">
        {currentIndex > 0 && (
          <button className="nav-button nav-button-left" onClick={handlePrev}>
            ‹
          </button>
        )}

        <div 
          className={`image-container ${scale > 1 ? 'zoomed' : ''}`}
          onMouseDown={handleMouseDown}
        >
          <img
            src={currentImage.url || currentImage}
            alt={`Photo ${currentIndex + 1}`}
            className="preview-image"
            style={{
              transform: `scale(${scale}) translate(${position.x / scale}px, ${position.y / scale}px)`,
              cursor: isDragging ? 'grabbing' : scale > 1 ? 'grab' : 'default'
            }}
            draggable={false}
          />
        </div>

        {currentIndex < images.length - 1 && (
          <button className="nav-button nav-button-right" onClick={handleNext}>
            ›
          </button>
        )}
      </div>

      <div className="photo-preview-footer">
        <div className="thumbnail-strip">
          {images.map((image, index) => (
            <div
              key={index}
              className={`thumbnail ${index === currentIndex ? 'active' : ''}`}
              onClick={() => setCurrentIndex(index)}
            >
              <img
                src={image.url || image}
                alt={`Thumbnail ${index + 1}`}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="keyboard-hints">
        <span>ESC: Đóng</span>
        <span>←→: Chuyển ảnh</span>
        <span>+−: Zoom</span>
        <span>0: Reset</span>
      </div>
    </div>
  );
}
