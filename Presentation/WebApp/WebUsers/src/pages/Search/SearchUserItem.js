import React from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../../API/Api";
import "./SearchUserItem.css";

export default function SearchUserItem({ user, onFollowPress }) {
    const navigate = useNavigate();
    
    // Build avatar URL
    let avatarUri = user?.avatarUrl || user?.AvatarUrl || null;
    if (avatarUri && !avatarUri.startsWith("http")) {
        if (!avatarUri.startsWith("/")) {
            avatarUri = `/uploads/avatars/${avatarUri}`;
        }
        avatarUri = `${API_BASE_URL}${avatarUri}`;
    }

    const handleFollowPress = (e) => {
        e.stopPropagation();
        if (onFollowPress) {
            onFollowPress(user);
        }
    };

    const handleUserClick = () => {
        navigate(`/profile/${user.userId || user.UserId}`);
    };

    return (
        <div className="search-user-item" onClick={handleUserClick}>
            <div className="user-avatar-container">
                {avatarUri ? (
                    <img src={avatarUri} alt="Avatar" className="user-avatar" />
                ) : (
                    <div className="user-avatar-placeholder">
                        <i className="icon-person"></i>
                    </div>
                )}
            </div>
            
            <div className="user-info-container">
                <div className="user-fullname">
                    {user.fullName || user.FullName || "Người dùng"}
                </div>
                <div className="user-username">
                    @{user.userName || user.UserName || "unknown"}
                </div>
                
                {user.priority === 1 && (
                    <div className="priority-badge">
                        <i className="icon-check-circle"></i>
                        <span>Đang theo dõi</span>
                    </div>
                )}
                {user.priority === 2 && (
                    <div className="priority-badge">
                        <i className="icon-chat"></i>
                        <span>Đã nhắn tin</span>
                    </div>
                )}
                
                {user.bio && (
                    <div className="user-bio">{user.bio}</div>
                )}
                
                <div className="user-followers">
                    {user.followersCount || 0} người theo dõi
                </div>
            </div>
            
            {!user.isCurrentUser && (
                <button
                    className={`follow-button ${user.isFollowing ? 'following' : ''}`}
                    onClick={handleFollowPress}
                >
                    {user.isFollowing ? "Đang theo dõi" : "Theo dõi"}
                </button>
            )}
        </div>
    );
}
