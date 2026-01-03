import React from "react";
import { IoPersonCircle } from "react-icons/io5";
import { API_BASE_URL } from "../../api/AppApi";
import "./SearchUserItem.css";

export default function SearchUserItem({ user, onPress, onFollowPress }) {
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
        if (onPress) {
            onPress(user);
        }
    };

    return (
        <div className="search-user-item" onClick={handleUserClick}>
            <div className="user-avatar-container">
                {avatarUri ? (
                    <img src={avatarUri} alt="Avatar" className="user-avatar" />
                ) : (
                    <IoPersonCircle size={48} color="#e5e7eb" />
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
                    <div className="priority-badge following">
                        Đang theo dõi
                    </div>
                )}
                
                {user.bio && (
                    <div className="user-bio">{user.bio}</div>
                )}
                
                <div className="user-followers">
                    {user.followersCount || 0} người theo dõi
                </div>
            </div>
            
            {!user.isCurrentUser && onFollowPress && (
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
