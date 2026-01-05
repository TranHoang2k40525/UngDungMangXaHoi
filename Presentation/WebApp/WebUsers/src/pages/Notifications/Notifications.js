import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import NotificationAPI from '../../api/NotificationAPI';
import { getPostById } from '../../api/Api';
import signalRService from '../../Services/signalRService';
import NavigationBar from '../../Components/NavigationBar';
import { MdFavorite, MdFavoriteBorder, MdComment, MdPersonAdd, MdAlternateEmail, MdMail, MdGroup, MdNotifications, MdShare, MdArrowBack, MdDelete } from 'react-icons/md';
import { FaHeart, FaGrinHearts, FaLaughSquint, FaSurprise, FaSadTear, FaAngry } from 'react-icons/fa';
import './Notifications.css';

const NotificationItem = ({ notification, onPress, onMarkAsRead, onDelete }) => {
  const getNotificationIcon = (type, reactionType) => {
    switch (type) {
      case 1: // Reaction
        if (reactionType) {
          switch (reactionType) {
            case 1: return <FaHeart />;
            case 2: return <FaGrinHearts />;
            case 3: return <FaLaughSquint />;
            case 4: return <FaSurprise />;
            case 5: return <FaSadTear />;
            case 6: return <FaAngry />;
            default: return <FaHeart />;
          }
        }
        return <FaHeart />;
      case 2: return <MdShare />; // Share
      case 3: return <MdComment />; // Comment
      case 4: return <MdPersonAdd />; // Follow
      case 5: return <MdAlternateEmail />;   // Mention
      case 6: return <MdComment />; // CommentReply
      case 7: return <MdMail />;  // Message
      case 8: return <MdGroup />; // GroupMessage
      default: return <MdNotifications />;
    }
  };

  const formatTime = (dateString) => {
    const now = new Date();
    const notifDate = new Date(dateString);
    const diffMs = now - notifDate;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Vừa xong';
    if (diffMins < 60) return `${diffMins} phút trước`;
    if (diffHours < 24) return `${diffHours} giờ trước`;
    if (diffDays < 7) return `${diffDays} ngày trước`;

    return notifDate.toLocaleDateString('vi-VN');
  };

  const apiUrl = 'http://localhost:5297';
  const avatarUrl = notification.senderAvatar
    ? `${apiUrl}${notification.senderAvatar}`
    : 'https://i.pravatar.cc/150?img=8';

  return (
    <div
      className={`notification-item ${!notification.isRead ? 'unread' : ''}`}
      onClick={() => onPress(notification)}
      onContextMenu={(e) => {
        e.preventDefault();
        onMarkAsRead(notification.notificationId);
      }}
    >
      <img src={avatarUrl} alt="Avatar" className="notification-avatar" />
      <div className="notification-content">
        <p className="notification-message">
          <span className="notification-icon">
            {getNotificationIcon(notification.type, notification.reactionType)}{' '}
          </span>
          {notification.content}
        </p>
        <p className="notification-time">{formatTime(notification.createdAt)}</p>
      </div>
      {!notification.isRead && <div className="notification-unread-dot" />}
      <button
        className="notification-delete-button"
        onClick={(e) => {
          e.stopPropagation();
          onDelete(notification.notificationId);
        }}
      >
        <MdDelete size={20} />
      </button>
    </div>
  );
};

export default function Notifications() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  const loadNotifications = async () => {
    try {
      const data = await NotificationAPI.getNotifications(0, 50);
      console.log('[Notifications] API response:', data);
      
      // Handle both array response and paginated response
      if (Array.isArray(data)) {
        setNotifications(data);
      } else if (data && Array.isArray(data.items)) {
        setNotifications(data.items);
      } else if (data && Array.isArray(data.data)) {
        setNotifications(data.data);
      } else {
        console.warn('[Notifications] Unexpected response format:', data);
        setNotifications([]);
      }

      const count = await NotificationAPI.getUnreadCount();
      setUnreadCount(count);
    } catch (error) {
      console.error('[Notifications] Load notifications error:', error);
      setNotifications([]); // Ensure notifications is always an array
    } finally {
      setLoading(false);
    }
  };

  const connectSignalR = async () => {
    try {
      await signalRService.connectToNotification();

      signalRService.onNotification((notification) => {
        console.log('[Notifications] Received new notification:', notification);
        setNotifications((prev) => [notification, ...prev]);
        setUnreadCount((prev) => prev + 1);
      });
    } catch (error) {
      console.error('[Notifications] SignalR connection error:', error);
    }
  };

  const handleNotificationPress = async (notification) => {
    try {
      console.log('[Notifications] Notification pressed:', {
        type: notification.type,
        conversationId: notification.conversationId,
        messageId: notification.messageId,
        senderId: notification.senderId,
        postId: notification.postId,
        commentId: notification.commentId,
        content: notification.content,
      });

      // Đánh dấu đã đọc nếu chưa đọc
      if (!notification.isRead) {
        await NotificationAPI.markAsRead(notification.notificationId);
        setNotifications((prev) =>
          prev.map((n) =>
            n.notificationId === notification.notificationId ? { ...n, isRead: true } : n
          )
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }

      // Navigate dựa vào loại thông báo
      switch (notification.type) {
        case 1: // Reaction
        case 2: // Share
          if (notification.postId) {
            try {
              const postData = await getPostById(notification.postId);
              navigate(`/post/${notification.postId}`, {
                state: { 
                  singlePost: postData,
                  openComments: false 
                }
              });
            } catch (error) {
              console.error('[Notifications] Failed to load post:', error);
              alert('Không thể tải bài viết');
            }
          }
          break;

        case 5: // Mention - Mở comment modal để thấy chỗ được nhắc
        case 3: // Comment
        case 6: // CommentReply
          if (notification.postId) {
            try {
              console.log('[Notifications] Navigating to PostDetail with comments open');
              const postData = await getPostById(notification.postId);
              navigate(`/post/${notification.postId}`, {
                state: { 
                  singlePost: postData,
                  openComments: true,
                  from: 'Notifications',
                  highlightCommentId: notification.commentId 
                }
              });
            } catch (error) {
              console.error('[Notifications] Failed to load post:', error);
              alert('Không thể tải bài viết');
            }
          }
          break;

        case 4: // Follow
          if (notification.senderId) {
            navigate(`/user/${notification.senderId}`);
          }
          break;

        case 7: // Message - Mở chat với người gửi
          if (notification.senderId) {
            navigate(`/messenger`, {
              state: {
                userId: notification.senderId,
                userName: notification.senderUsername || 'User',
                userAvatar: notification.senderAvatar,
                messageId: notification.messageId
              }
            });
          }
          break;

        case 8: // GroupMessage - Mở nhóm chat cụ thể
          if (notification.conversationId) {
            const groupNameMatch = notification.content.match(/trong nhóm "([^"]+)":/);
            const groupName = groupNameMatch ? groupNameMatch[1] : 'Nhóm chat';

            console.log('[Notifications] Navigating to GroupChat:', {
              conversationId: notification.conversationId,
              groupName: groupName,
              messageId: notification.messageId,
            });

            navigate(`/messenger/group/${notification.conversationId}`, {
              state: { 
                conversationId: notification.conversationId,
                groupName: groupName,
                scrollToMessageId: notification.messageId 
              }
            });
          } else {
            console.log('[Notifications] No conversationId, navigating to Messenger');
            navigate('/messenger');
          }
          break;

        default:
          console.warn('[Notifications] Unknown notification type:', notification.type);
      }
    } catch (error) {
      console.error('[Notifications] Handle notification error:', error);
    }
  };

  const handleMarkAsRead = async (notificationId) => {
    try {
      await NotificationAPI.markAsRead(notificationId);
      setNotifications((prev) =>
        prev.map((n) =>
          n.notificationId === notificationId ? { ...n, isRead: true } : n
        )
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error('[Notifications] Mark as read error:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await NotificationAPI.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('[Notifications] Mark all as read error:', error);
      alert('Không thể đánh dấu tất cả đã đọc');
    }
  };

  const handleDeleteNotification = async (notificationId) => {
    if (!window.confirm('Bạn có chắc muốn xóa thông báo này?')) return;

    try {
      await NotificationAPI.deleteNotification(notificationId);
      setNotifications((prev) =>
        prev.filter((n) => n.notificationId !== notificationId)
      );
      const notification = notifications.find((n) => n.notificationId === notificationId);
      if (notification && !notification.isRead) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('[Notifications] Delete notification error:', error);
      alert('Không thể xóa thông báo');
    }
  };

  useEffect(() => {
    loadNotifications();
    connectSignalR();
  }, []);

  return (
    <div className="notifications-container">
      <div className="notifications-header">
        <button className="notifications-back-button" onClick={() => navigate(-1)}>
          <MdArrowBack />
        </button>
        <h2 className="notifications-logo">Thông báo</h2>
        <div className="notifications-header-right">
          <button className="notifications-mark-all-button" onClick={handleMarkAllAsRead}>
            Đánh dấu đã đọc
          </button>
          <button className="notifications-messenger-button" onClick={() => navigate('/messenger')}>
            <MdMail />
          </button>
        </div>
      </div>

      {unreadCount > 0 && (
        <div className="notifications-unread-banner">
          <p className="notifications-unread-banner-text">
            {unreadCount} thông báo chưa đọc
          </p>
        </div>
      )}

      {loading ? (
        <div className="notifications-loading-container">
          <div className="notifications-spinner" />
        </div>
      ) : (
        <div className="notifications-list">
          {notifications.length === 0 ? (
            <div className="notifications-empty-container">
              <p className="notifications-empty-text">Chưa có thông báo</p>
            </div>
          ) : (
            notifications.map((item) => (
              <NotificationItem
                key={item.notificationId}
                notification={item}
                onPress={handleNotificationPress}
                onMarkAsRead={handleMarkAsRead}
                onDelete={handleDeleteNotification}
              />
            ))
          )}
        </div>
      )}
      <NavigationBar />
    </div>
  );
}
