import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { IoHeart, IoChatbubble, IoTime, IoPlayCircle, IoImage, IoPersonCircle } from "react-icons/io5";
import { API_BASE_URL } from "../../api/AppApi";
import "./SearchPostItem.css";

export default function SearchPostItem({ post, onPress }) {
    const navigate = useNavigate();
    const [imageError, setImageError] = useState(false);
    
    // Build thumbnail URL
    let thumbnailUri = post?.thumbnailUrl || post?.ThumbnailUrl || null;
    if (thumbnailUri && !thumbnailUri.startsWith("http")) {
        thumbnailUri = `${API_BASE_URL}${thumbnailUri}`;
    }
    
    // Build user avatar URL
    let userAvatarUri = post?.userAvatarUrl || post?.UserAvatarUrl || null;
    if (userAvatarUri && !userAvatarUri.startsWith("http")) {
        if (!userAvatarUri.startsWith("/")) {
            userAvatarUri = `/Assets/Images/${userAvatarUri}`;
        }
        userAvatarUri = `${API_BASE_URL}${userAvatarUri}`;
    }

    const isVideo = post?.mediaType === "Video" || post?.MediaType === "Video";

    const handlePostClick = () => {
        if (onPress) {
            onPress(post);
        } else {
            // Default navigation
            navigate(`/post/${post.postId || post.PostId}`);
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return "";
        const date = new Date(dateString);
        // Cộng thêm 7 giờ cho múi giờ Việt Nam (UTC+7)
        const vietnamTime = new Date(date.getTime() + (7 * 60 * 60 * 1000));
        const now = new Date();
        const diff = now - vietnamTime;
        
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);
        
        if (minutes < 1) return "Vừa xong";
        if (minutes < 60) return `${minutes} phút trước`;
        if (hours < 24) return `${hours} giờ trước`;
        if (days < 7) return `${days} ngày trước`;
        
        return vietnamTime.toLocaleDateString("vi-VN");
    };

    return (
        <div className="search-post-item" onClick={handlePostClick}>
            <div className="post-thumbnail-container">
                {thumbnailUri && !imageError ? (
                    <img
                        src={thumbnailUri}
                        alt="Post thumbnail"
                        className="post-thumbnail"
                        onError={() => setImageError(true)}
                    />
                ) : (
                    <div className="post-thumbnail-placeholder">
                        <IoImage size={32} color="#9CA3AF" />
                    </div>
                )}
                {isVideo && !imageError && (
                    <div className="video-overlay">
                        <IoPlayCircle size={32} color="#FFFFFF" />
                    </div>
                )}
            </div>
            
            <div className="post-info-container">
                <div className="post-user-info">
                    {userAvatarUri ? (
                        <img src={userAvatarUri} alt="User avatar" className="post-user-avatar" />
                    ) : (
                        <IoPersonCircle size={24} color="#e5e7eb" />
                    )}
                    <span className="post-username">
                        {post.userFullName ||
                            post.UserFullName ||
                            post.userName ||
                            post.UserName ||
                            "unknown"}
                    </span>
                </div>
                
                {(post.caption || post.Caption) && (
                    <div className="post-caption">
                        {(post.caption || post.Caption).substring(0, 100)}
                        {(post.caption || post.Caption).length > 100 ? "..." : ""}
                    </div>
                )}
                
                <div className="post-stats-container">
                    <div className="post-stat">
                        <IoHeart size={14} />
                        <span>{post.likesCount || post.LikesCount || 0}</span>
                    </div>
                    <div className="post-stat">
                        <IoChatbubble size={14} />
                        <span>{post.commentsCount || post.CommentsCount || 0}</span>
                    </div>
                    <div className="post-stat">
                        <IoTime size={14} />
                        <span>{formatDate(post.createdAt || post.CreatedAt)}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
