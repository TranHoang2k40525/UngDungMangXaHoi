import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './NavigationBar.css';

export default function NavigationBar() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="left-nav-bar">
      <button 
        className={`nav-bar-item ${location.pathname === '/' ? 'active' : ''}`}
        onClick={() => navigate('/')}
      >
        <span className="nav-bar-icon">🏠</span>
      </button>
      <button 
        className={`nav-bar-item ${location.pathname === '/search' ? 'active' : ''}`}
        onClick={() => navigate('/search')}
      >
        <span className="nav-bar-icon">🔍</span>
      </button>
      <button 
        className="nav-bar-item nav-bar-create"
        onClick={() => navigate('/create-post')}
      >
        <span className="nav-bar-icon">➕</span>
      </button>
      <button 
        className={`nav-bar-item ${location.pathname === '/video' ? 'active' : ''}`}
        onClick={() => navigate('/video')}
      >
        <span className="nav-bar-icon">📺</span>
      </button>
      <button 
        className={`nav-bar-item ${location.pathname === '/profile' ? 'active' : ''}`}
        onClick={() => navigate('/profile')}
      >
        <span className="nav-bar-icon">👤</span>
      </button>
      <button 
        className={`nav-bar-item ${location.pathname === '/messages' ? 'active' : ''}`}
        onClick={() => navigate('/messages')}
      >
        <span className="nav-bar-icon">💬</span>
      </button>
    </div>
  );
}
