import { useState, useEffect } from "react";
import { userAPI } from "../../services/api.js";
import "./Users.css";

export default function Users() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [filter, setFilter] = useState("all");
    const [page, setPage] = useState(1);
    const [selectedUser, setSelectedUser] = useState(null); // For profile modal
    const [showProfileModal, setShowProfileModal] = useState(false);

    useEffect(() => {
        loadUsers();
    }, [page, filter]);

    const loadUsers = async () => {
        try {
            setLoading(true);
            const result = await userAPI.getUsers(page, 20, search, filter);
            setUsers(result.data);
        } catch (error) {
            console.error("Error loading users:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = () => {
        setPage(1);
        loadUsers();
    };

    const handleBanUser = async (userId) => {
        if (!window.confirm("Bạn có chắc muốn khóa tài khoản này?")) return;

        try {
            await userAPI.banUser(userId);
            alert("Đã khóa tài khoản thành công");
            loadUsers();
        } catch (error) {
            alert("Lỗi: " + error.message);
        }
    };

    const handleUnbanUser = async (userId) => {
        try {
            await userAPI.unbanUser(userId);
            alert("Đã mở khóa tài khoản thành công");
            loadUsers();
        } catch (error) {
            alert("Lỗi: " + error.message);
        }
    };

    const handleRowClick = (user) => {
        setSelectedUser(user);
        setShowProfileModal(true);
    };

    const closeProfileModal = () => {
        setShowProfileModal(false);
        setSelectedUser(null);
    };

    return (
        <div className="users-page">
            <div className="page-header">
                <h1>Quản lý người dùng</h1>
                <p>Quản lý tài khoản và hoạt động người dùng</p>
            </div>

            <div className="card">
                <div className="users-toolbar">
                    <div className="search-box">
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            onKeyPress={(e) =>
                                e.key === "Enter" && handleSearch()
                            }
                            placeholder="Tìm kiếm theo tên, email..."
                            className="input"
                        />
                        <button
                            onClick={handleSearch}
                            className="btn btn-primary"
                        >
                            Tìm kiếm
                        </button>
                    </div>

                    <select
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        className="input filter-select"
                    >
                        <option value="all">Tất cả</option>
                        <option value="active">Đang hoạt động</option>
                        <option value="banned">Đã khóa</option>
                    </select>
                </div>

                {loading ? (
                    <div className="loading-container">
                        <div className="loading"></div>
                    </div>
                ) : (
                    <>
                        <table className="users-table">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Tên người dùng</th>
                                    <th>Email</th>
                                    <th>Họ tên</th>
                                    <th>Trạng thái</th>
                                    <th>Ngày tạo</th>
                                    <th>Hành động</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map((user) => (
                                    <tr
                                        key={user.id}
                                        onClick={() => handleRowClick(user)}
                                        style={{ cursor: "pointer" }}
                                    >
                                        <td>{user.id}</td>
                                        <td>
                                            <strong>@{user.username}</strong>
                                        </td>
                                        <td>{user.email}</td>
                                        <td>{user.fullName}</td>
                                        <td>
                                            <span
                                                className={`status-badge ${user.status}`}
                                            >
                                                {user.status === "active"
                                                    ? "Hoạt động"
                                                    : "Đã khóa"}
                                            </span>
                                        </td>
                                        <td>
                                            {new Date(
                                                user.createdAt
                                            ).toLocaleDateString("vi-VN")}
                                        </td>
                                        <td
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            {user.status === "active" ? (
                                                <button
                                                    onClick={() =>
                                                        handleBanUser(user.id)
                                                    }
                                                    className="btn-action ban"
                                                >
                                                    Khóa
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() =>
                                                        handleUnbanUser(user.id)
                                                    }
                                                    className="btn-action unban"
                                                >
                                                    Mở khóa
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        <div className="pagination">
                            <button
                                onClick={() =>
                                    setPage((p) => Math.max(1, p - 1))
                                }
                                disabled={page === 1}
                                className="btn btn-primary"
                            >
                                ← Trước
                            </button>
                            <span>Trang {page}</span>
                            <button
                                onClick={() => setPage((p) => p + 1)}
                                className="btn btn-primary"
                            >
                                Sau →
                            </button>
                        </div>
                    </>
                )}
            </div>

            {/* User Profile Modal */}
            {showProfileModal && selectedUser && (
                <UserProfileModal
                    user={selectedUser}
                    onClose={closeProfileModal}
                    onLockUnlock={() => {
                        if (selectedUser.status === "active") {
                            handleBanUser(selectedUser.id);
                        } else {
                            handleUnbanUser(selectedUser.id);
                        }
                        closeProfileModal();
                    }}
                />
            )}
        </div>
    );
}

// User Profile Modal Component
function UserProfileModal({ user, onClose, onLockUnlock }) {
    return (
        <div className="modal-overlay" onClick={onClose}>
            <div
                className="modal-content card"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="modal-header">
                    <h2>👤 Thông tin người dùng</h2>
                    <button className="modal-close" onClick={onClose}>
                        ×
                    </button>
                </div>

                <div className="modal-body">
                    {/* Avatar & Basic Info */}
                    <div className="profile-header">
                        <div className="profile-avatar">
                            {user.fullName?.charAt(0) || "U"}
                        </div>
                        <div className="profile-info">
                            <h3>{user.fullName || "Chưa cập nhật"}</h3>
                            <p className="username">@{user.username}</p>
                            <span className={`status-badge ${user.status}`}>
                                {user.status === "active"
                                    ? "✅ Hoạt động"
                                    : "🔒 Đã khóa"}
                            </span>
                        </div>
                    </div>

                    {/* Details Grid */}
                    <div className="profile-details">
                        <div className="detail-item">
                            <strong>📧 Email:</strong>
                            <span>{user.email}</span>
                        </div>
                        <div className="detail-item">
                            <strong>🆔 ID:</strong>
                            <span>{user.id}</span>
                        </div>
                        <div className="detail-item">
                            <strong>📅 Ngày tạo:</strong>
                            <span>
                                {new Date(user.createdAt).toLocaleDateString(
                                    "vi-VN",
                                    {
                                        year: "numeric",
                                        month: "long",
                                        day: "numeric",
                                    }
                                )}
                            </span>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="modal-actions">
                        <button onClick={onClose} className="btn btn-secondary">
                            Đóng
                        </button>
                        <button
                            onClick={onLockUnlock}
                            className={`btn ${
                                user.status === "active"
                                    ? "btn-danger"
                                    : "btn-success"
                            }`}
                        >
                            {user.status === "active"
                                ? "🔒 Khóa tài khoản"
                                : "🔓 Mở khóa"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
