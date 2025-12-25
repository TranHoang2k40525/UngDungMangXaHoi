import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../../Api/Api";
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
                        <i className="icon-image"></i>
                    </div>
                )}
                {isVideo && !imageError && (
                    <div className="video-overlay">
                        <i className="icon-play-circle"></i>
                    </div>
                )}
            </div>
            
            <div className="post-info-container">
                <div className="post-user-info">
                    {userAvatarUri ? (
                        <img src={userAvatarUri} alt="User avatar" className="post-user-avatar" />
                    ) : (
                        <div className="post-user-avatar-placeholder">
                            <i className="icon-person-small"></i>
                        </div>
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
                        {post.caption || post.Caption}
                    </div>
                )}
                
                {post.priority === 1 && (
                    <div className="post-priority-badge">
                        <i className="icon-people"></i>
                        <span>Từ người theo dõi</span>
                    </div>
                )}
                
                <div className="post-stats-container">
                    <div className="post-stat">
                        <i className="icon-heart"></i>
                        <span>{post.likesCount || post.LikesCount || 0}</span>
                    </div>
                    <div className="post-stat">
                        <i className="icon-comment"></i>
                        <span>{post.commentsCount || post.CommentsCount || 0}</span>
                    </div>
                    <div className="post-stat">
                        <i className="icon-time"></i>
                        <span>
                            {new Date(
                                post.createdAt || post.CreatedAt
                            ).toLocaleDateString()}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
