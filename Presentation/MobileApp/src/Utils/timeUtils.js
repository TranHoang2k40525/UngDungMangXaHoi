import { useState, useEffect } from 'react';

/**
 * Chuyển đổi timestamp thành chuỗi thời gian tương đối (Instagram-style)
 * 
 * @param {string} dateString - ISO 8601 date string
 * @returns {string} Thời gian tương đối ("Vừa xong", "5 phút trước", "2 giờ trước", etc.)
 */
export const formatCommentTime = (dateString) => {
  const now = new Date();
  
  // Đảm bảo dateString có timezone 'Z' (UTC) để parse đúng
  let isoString = dateString;
  if (!isoString.endsWith('Z') && !isoString.includes('+') && !isoString.includes('-', 10)) {
    // Nếu không có timezone info, thêm 'Z' để parse as UTC
    isoString = isoString.replace(/(\.\d+)?$/, '') + 'Z';
  }
  
  const createdAt = new Date(isoString);
  
  // Kiểm tra nếu date không hợp lệ
  if (isNaN(createdAt.getTime())) {
    console.warn('[timeUtils] Invalid date string:', dateString);
    return 'Không xác định';
  }
  
  const diffInSeconds = Math.floor((now - createdAt) / 1000);

  // Vừa xong (< 5 giây)
  if (diffInSeconds < 5) {
    return 'Vừa xong';
  }

  // X giây trước (5-59 giây)
  if (diffInSeconds < 60) {
    return `${diffInSeconds} giây trước`;
  }

  // X phút trước (1-59 phút)
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes} phút trước`;
  }

  // X giờ trước (1-23 giờ)
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours} giờ trước`;
  }

  // X ngày trước (1-6 ngày)
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) {
    return `${diffInDays} ngày trước`;
  }

  // X tuần trước (1-4 tuần)
  const diffInWeeks = Math.floor(diffInDays / 7);
  if (diffInWeeks < 4) {
    return `${diffInWeeks} tuần trước`;
  }

  // X tháng trước (1-11 tháng)
  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths < 12) {
    return `${diffInMonths} tháng trước`;
  }

  // X năm trước (12+ tháng)
  const diffInYears = Math.floor(diffInDays / 365);
  return `${diffInYears} năm trước`;
};

/**
 * React Hook tự động cập nhật thời gian hiển thị theo interval phù hợp
 * 
 * @param {string} dateString - ISO 8601 date string
 * @returns {string} Thời gian tương đối (tự động cập nhật)
 * 
 * Interval logic:
 * - < 60 giây: Cập nhật mỗi 1 giây
 * - < 1 giờ: Cập nhật mỗi 1 phút (60 giây)
 * - < 1 ngày: Cập nhật mỗi 1 giờ (3600 giây)
 * - >= 1 ngày: Không cập nhật (static)
 */
export const useCommentTime = (dateString) => {
  const [timeText, setTimeText] = useState(() => formatCommentTime(dateString));

  useEffect(() => {
    // Tính toán interval phù hợp dựa trên độ "mới" của comment
    const getUpdateInterval = () => {
      const now = new Date();
      const createdAt = new Date(dateString);
      const diffInSeconds = Math.floor((now - createdAt) / 1000);

      if (diffInSeconds < 60) {
        // < 1 phút: Cập nhật mỗi 1 giây
        return 1000;
      } else if (diffInSeconds < 3600) {
        // < 1 giờ: Cập nhật mỗi 1 phút
        return 60000;
      } else if (diffInSeconds < 86400) {
        // < 1 ngày: Cập nhật mỗi 1 giờ
        return 3600000;
      }
      
      // >= 1 ngày: Không cần cập nhật nữa
      return null;
    };

    const updateTime = () => {
      setTimeText(formatCommentTime(dateString));
    };

    // Cập nhật ngay lập tức
    updateTime();

    // Thiết lập interval nếu cần
    const interval = getUpdateInterval();
    if (interval) {
      const timer = setInterval(updateTime, interval);
      return () => clearInterval(timer);
    }
  }, [dateString]);

  return timeText;
};
