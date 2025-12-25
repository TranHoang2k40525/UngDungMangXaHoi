import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import * as NotificationAPI from '../../api/Api';
import signalRService from '../../Services/signalRService';
import NavigationBar from '../../Components/NavigationBar';
import './Notifications.css';

const NotificationItem = ({ notification, onPress, onMarkAsRead, onDelete }) => {
  const getNotificationIcon = (type, reactionType) => {
    switch (type) {
      case 1: // Reaction
        if (reactionType) {
          switch (reactionType) {
            case 1: return '❤️';
            case 2: return '😍';
            case 3: return '😂';
            case 4: return '😮';
            case 5: return '😢';
            case 6: return '😠';
            default: return '❤️';
          }
        }
        return '❤️';
      case 2: return '🔄'; // Share
      case 3: return '💬'; // Comment
      case 4: return '👤'; // Follow
      case 5: return '@';   // Mention
      case 6: return '💬'; // CommentReply
      case 7: return '✉️';  // Message
      case 8: return '👥'; // GroupMessage
      default: return '🔔';
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

  const apiUrl = localStorage.getItem('API_URL') || 'http://localhost:5000';
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
        🗑️
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
      setNotifications(data);

      const count = await NotificationAPI.getUnreadCount();
      setUnreadCount(count);
    } catch (error) {
      console.error('[Notifications] Load notifications error:', error);
    } finally {
      setLoading(false);
    }
  };

  const connectSignalR = async () => {
    try {
      await signalRService.connect();

      signalRService.onReceiveNotification((notification) => {
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
      if (!notification.isRead) {
        await NotificationAPI.markAsRead(notification.notificationId);
        setNotifications((prev) =>
          prev.map((n) =>
            n.notificationId === notification.notificationId ? { ...n, isRead: true } : n
          )
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }

      switch (notification.type) {
        case 1: // Reaction
        case 2: // Share
        case 3: // Comment
        case 5: // Mention
        case 6: // CommentReply
          if (notification.postId) {
            navigate(`/post/${notification.postId}`, {
              state: { openComments: [3, 5, 6].includes(notification.type) }
            });
          }
          break;
        case 4: // Follow
          if (notification.senderId) {
            navigate(`/profile/${notification.senderId}`);
          }
          break;
        case 7: // Message
          if (notification.senderId) {
            navigate(`/messenger/${notification.senderId}`, {
              state: {
                userName: notification.senderUsername || 'User',
                userAvatar: notification.senderAvatar,
              }
            });
          }
          break;
        case 8: // GroupMessage
          if (notification.conversationId) {
            const groupNameMatch = notification.content.match(/trong nhóm "([^"]+)":/);
            const groupName = groupNameMatch ? groupNameMatch[1] : 'Nhóm chat';
            navigate(`/messenger/group/${notification.conversationId}`, {
              state: { groupName }
            });
          } else {
            navigate('/messenger');
          }
          break;
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
          ←
        </button>
        <h2 className="notifications-logo">Thông báo</h2>
        <div className="notifications-header-right">
          <button className="notifications-mark-all-button" onClick={handleMarkAllAsRead}>
            Đánh dấu đã đọc
          </button>
          <button className="notifications-messenger-button" onClick={() => navigate('/messenger')}>
            💬
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
