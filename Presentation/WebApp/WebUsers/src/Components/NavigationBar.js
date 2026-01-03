import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useUser } from '../Context/UserContext';
import { 
  IoHomeOutline, IoHome,
  IoSearchOutline, IoSearch,
  IoPlayCircleOutline, IoPlayCircle,
  IoChatbubbleOutline, IoChatbubble,
  IoNotificationsOutline, IoNotifications,
  IoAddCircleOutline, IoAddCircle,
  IoPersonOutline, IoPerson,
  IoMenuOutline, IoMenu
} from 'react-icons/io5';
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
        <span className="logo-text">MediaLite</span>
      </div>

      {/* Menu Items */}
      <div className="nav-menu">
        <button 
          className={`nav-bar-item ${location.pathname === '/' ? 'active' : ''}`}
          onClick={() => navigate('/')}
        >
          {location.pathname === '/' ? <IoHome className="nav-icon" /> : <IoHomeOutline className="nav-icon" />}
          <span className="nav-text">Home</span>
        </button>

        <button 
          className={`nav-bar-item ${location.pathname === '/search' ? 'active' : ''}`}
          onClick={() => navigate('/search')}
        >
          {location.pathname === '/search' ? <IoSearch className="nav-icon" /> : <IoSearchOutline className="nav-icon" />}
          <span className="nav-text">Search</span>
        </button>

        <button 
          className={`nav-bar-item ${location.pathname.includes('/video') ? 'active' : ''}`}
          onClick={() => navigate('/video')}
        >
          {location.pathname.includes('/video') ? <IoPlayCircle className="nav-icon" /> : <IoPlayCircleOutline className="nav-icon" />}
          <span className="nav-text">Reels</span>
        </button>

        <button 
          className={`nav-bar-item ${location.pathname === '/messages' ? 'active' : ''}`}
          onClick={() => navigate('/messages')}
        >
          {location.pathname === '/messages' ? <IoChatbubble className="nav-icon" /> : <IoChatbubbleOutline className="nav-icon" />}
          <span className="nav-text">Messages</span>
        </button>

        <button 
          className={`nav-bar-item ${location.pathname === '/notifications' ? 'active' : ''}`}
          onClick={() => navigate('/notifications')}
        >
          {location.pathname === '/notifications' ? <IoNotifications className="nav-icon" /> : <IoNotificationsOutline className="nav-icon" />}
          <span className="nav-text">Notifications</span>
        </button>

        <button 
          className="nav-bar-item"
          onClick={() => navigate('/create-post')}
        >
          <IoAddCircleOutline className="nav-icon" />
          <span className="nav-text">Create</span>
        </button>

        <button 
          className={`nav-bar-item ${location.pathname === '/profile' ? 'active' : ''}`}
          onClick={() => navigate('/profile')}
        >
          {location.pathname === '/profile' ? <IoPerson className="nav-icon" /> : <IoPersonOutline className="nav-icon" />}
          <span className="nav-text">Profile</span>
        </button>
      </div>

      {/* More Menu at bottom */}
      <div className="nav-bottom">
        <button className="nav-bar-item" onClick={() => setMenuOpen(!menuOpen)}>
          {menuOpen ? <IoMenu className="nav-icon" /> : <IoMenuOutline className="nav-icon" />}
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
