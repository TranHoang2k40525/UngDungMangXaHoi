import { NavLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.js';
import { useAdmin } from '../contexts/AdminContext.js';
import './Sidebar.css';
import { FiBarChart2, FiUsers, FiSearch, FiAlertTriangle, FiHome, FiBriefcase, FiFileText, FiTrendingUp, FiSettings, FiLogOut } from 'react-icons/fi';
import { NavLink } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext.js";
import { useAdmin } from "../contexts/AdminContext.js";
import "./Sidebar.css";

export default function Sidebar() {
    const { logout } = useAuth();
    const { adminData } = useAdmin();

    console.log("[Sidebar] Current adminData:", adminData);

    const handleLogout = async () => {
        if (window.confirm("Bạn có chắc muốn đăng xuất?")) {
            await logout();
        }
    };

    return (
        <aside className="sidebar">
            <div className="sidebar-brand">
                <h2>SNAP67CS Admin</h2>
            </div>

      <nav className="sidebar-nav">
        <NavLink to="/dashboard" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
          <span className="nav-icon"><FiBarChart2 aria-hidden="true"/></span> Trang chủ
        </NavLink>
        <NavLink to="/users" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
          <span className="nav-icon"><FiUsers aria-hidden="true"/></span> Quản lý người dùng
        </NavLink>
        <NavLink to="/moderation" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
          <span className="nav-icon"><FiSearch aria-hidden="true"/></span> Kiểm duyệt nội dung
        </NavLink>
        <NavLink to="/reports" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
          <span className="nav-icon"><FiAlertTriangle aria-hidden="true"/></span> Báo cáo vi phạm
        </NavLink>
        <NavLink to="/business-requests" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
          <span className="nav-icon"><FiBriefcase aria-hidden="true"/></span> Xác thực Doanh nghiệp
        </NavLink>
        <NavLink to="/admin-logs" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
          <span className="nav-icon"><FiFileText aria-hidden="true"/></span> Nhật ký Admin
        </NavLink>
        <NavLink to="/analytics" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
          <span className="nav-icon"><FiTrendingUp aria-hidden="true"/></span> Thống kê & Phân tích
        </NavLink>
        <NavLink to="/settings" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
          <span className="nav-icon"><FiSettings aria-hidden="true"/></span> Cài đặt
        </NavLink>
      </nav>
            <nav className="sidebar-nav">
                <NavLink
                    to="/dashboard"
                    className={({ isActive }) =>
                        isActive ? "nav-item active" : "nav-item"
                    }
                >
                    <span>📊</span> Trang chủ
                </NavLink>
                <NavLink
                    to="/users"
                    className={({ isActive }) =>
                        isActive ? "nav-item active" : "nav-item"
                    }
                >
                    <span>👥</span> Quản lý người dùng
                </NavLink>{" "}
                <NavLink
                    to="/moderation"
                    className={({ isActive }) =>
                        isActive ? "nav-item active" : "nav-item"
                    }
                >
                    <span>🔍</span> Kiểm duyệt nội dung
                </NavLink>
                <NavLink
                    to="/ai-moderation"
                    className={({ isActive }) =>
                        isActive ? "nav-item active" : "nav-item"
                    }
                >
                    <span>🤖</span> AI Content Moderation
                </NavLink>
                <NavLink
                    to="/reports"
                    className={({ isActive }) =>
                        isActive ? "nav-item active" : "nav-item"
                    }
                >
                    <span>⚠️</span> Báo cáo vi phạm
                </NavLink>{" "}
                <NavLink
                    to="/business-requests"
                    className={({ isActive }) =>
                        isActive ? "nav-item active" : "nav-item"
                    }
                >
                    <span>🏢</span> Doanh nghiệp
                </NavLink>
                <NavLink
                    to="/admin-logs"
                    className={({ isActive }) =>
                        isActive ? "nav-item active" : "nav-item"
                    }
                >
                    <span>📜</span> Nhật ký Admin
                </NavLink>
                <NavLink
                    to="/analytics"
                    className={({ isActive }) =>
                        isActive ? "nav-item active" : "nav-item"
                    }
                >
                    <span>📈</span> Thống kê & Phân tích
                </NavLink>
                <NavLink
                    to="/settings"
                    className={({ isActive }) =>
                        isActive ? "nav-item active" : "nav-item"
                    }
                >
                    <span>⚙️</span> Cài đặt
                </NavLink>
            </nav>

      <div className="sidebar-footer">
        <div className="sidebar-user">
          <img 
            src={adminData.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(adminData.fullName || 'Admin')}&background=6366F1&color=fff`}
            alt="Avatar"
            className="sidebar-avatar"
          />
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">{adminData.fullName || 'Admin'}</div>
            <div className="sidebar-user-email">{adminData.email || 'admin@example.com'}</div>
          </div>
        </div>
        <button onClick={handleLogout} className="logout-btn">
          <FiLogOut className="logout-icon" aria-hidden="true"/> Đăng xuất
        </button>
      </div>
    </aside>
  );
            <div className="sidebar-footer">
                <div className="sidebar-user">
                    <img
                        src={
                            adminData.avatarUrl ||
                            `https://ui-avatars.com/api/?name=${encodeURIComponent(
                                adminData.fullName || "Admin"
                            )}&background=6366F1&color=fff`
                        }
                        alt="Avatar"
                        className="sidebar-avatar"
                    />
                    <div className="sidebar-user-info">
                        <div className="sidebar-user-name">
                            {adminData.fullName || "Admin"}
                        </div>
                        <div className="sidebar-user-email">
                            {adminData.email || "admin@example.com"}
                        </div>
                    </div>
                </div>
                <button onClick={handleLogout} className="logout-btn">
                    🚪 Đăng xuất
                </button>
            </div>
        </aside>
    );
}
