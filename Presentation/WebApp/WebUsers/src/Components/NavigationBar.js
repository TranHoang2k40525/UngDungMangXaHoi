import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import './NavigationBar.css';

export default function NavigationBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useUser();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="left-nav-bar">
      {/* Logo */}
      <div className="nav-logo">
        <span className="logo-text">SNA67CS</span>
      </div>

      {/* Menu Items */}
      <div className="nav-menu">
        <button 
          className={`nav-bar-item ${location.pathname === '/' ? 'active' : ''}`}
          onClick={() => navigate('/')}
        >
          <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
            <polyline points="9 22 9 12 15 12 15 22"/>
          </svg>
          <span className="nav-text">Home</span>
        </button>

        <button 
          className={`nav-bar-item ${location.pathname === '/search' ? 'active' : ''}`}
          onClick={() => navigate('/search')}
        >
          <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/>
            <path d="m21 21-4.35-4.35"/>
          </svg>
          <span className="nav-text">Search</span>
        </button>

        <button 
          className={`nav-bar-item ${location.pathname.includes('/video') ? 'active' : ''}`}
          onClick={() => navigate('/video')}
        >
          <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="2" y="7" width="20" height="15" rx="2" ry="2"/>
            <polyline points="10 12 15 15 10 18 10 12"/>
          </svg>
          <span className="nav-text">Reels</span>
        </button>

        <button 
          className={`nav-bar-item ${location.pathname === '/messages' ? 'active' : ''}`}
          onClick={() => navigate('/messages')}
        >
          <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12.003 2.001a9.705 9.705 0 1 1 0 19.4 10.876 10.876 0 0 1-2.895-.384.798.798 0 0 0-.533.04l-1.984.876a.801.801 0 0 1-1.123-.708l-.054-1.78a.806.806 0 0 0-.27-.569 9.49 9.49 0 0 1-3.14-7.175 9.65 9.65 0 0 1 10-9.7Z"/>
            <path d="M17.79 10.132a.659.659 0 0 0-.962-.873l-2.556 2.05a.63.63 0 0 1-.758.002L11.06 9.47a1.576 1.576 0 0 0-2.277.42l-2.567 3.98a.659.659 0 0 0 .961.875l2.556-2.049a.63.63 0 0 1 .759-.002l2.452 1.84a1.576 1.576 0 0 0 2.278-.42Z"/>
          </svg>
          <span className="nav-text">Messages</span>
        </button>

        <button 
          className={`nav-bar-item ${location.pathname === '/notifications' ? 'active' : ''}`}
          onClick={() => navigate('/notifications')}
        >
          <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2z"/>
            <path d="M12 6v6l4 2"/>
          </svg>
          <span className="nav-text">Notifications</span>
        </button>

        <button 
          className="nav-bar-item"
          onClick={() => navigate('/create-post')}
        >
          <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
            <line x1="12" y1="8" x2="12" y2="16"/>
            <line x1="8" y1="12" x2="16" y2="12"/>
          </svg>
          <span className="nav-text">Create</span>
        </button>

        <button 
          className={`nav-bar-item ${location.pathname === '/profile' ? 'active' : ''}`}
          onClick={() => navigate('/profile')}
        >
          <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
            <circle cx="12" cy="7" r="4"/>
          </svg>
          <span className="nav-text">Profile</span>
        </button>
      </div>

      {/* More Menu at bottom */}
      <div className="nav-bottom">
        <button className="nav-bar-item" onClick={() => setMenuOpen(!menuOpen)}>
          <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="3" y1="12" x2="21" y2="12"/>
            <line x1="3" y1="6" x2="21" y2="6"/>
            <line x1="3" y1="18" x2="21" y2="18"/>
          </svg>
          <span className="nav-text">More</span>
        </button>
      </div>

      {/* More Menu Modal */}
      {menuOpen && (
        <div className="modal-overlay" onClick={() => setMenuOpen(false)}>
          <div className="menu-sheet" onClick={(e) => e.stopPropagation()}>
            <button className="menu-item" onClick={() => { setMenuOpen(false); navigate('/profile/edit'); }}>Xem/Chỉnh sửa thông tin</button>
            <button className="menu-item" onClick={() => { setMenuOpen(false); navigate('/change-password'); }}>Đổi mật khẩu</button>
            <button className="menu-item" onClick={() => { setMenuOpen(false); }}>Đăng ký tài khoản doanh nghiệp</button>
            <button className="menu-item" onClick={() => { setMenuOpen(false); navigate('/blocked-users'); }}>Danh sách chặn</button>
            <button className="menu-item danger" onClick={() => { setMenuOpen(false); logout(); }}>Đăng xuất</button>
          </div>
        </div>
      )}
    </div>
  );
}
