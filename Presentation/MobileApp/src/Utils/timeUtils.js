import { useState, useEffect } from 'react';

/**
 * Format thời gian theo phong cách Instagram
 * @param {string|Date} timestamp - Thời gian cần format (Backend trả về UTC ISO string với 'Z')
 * @returns {string} - Chuỗi thời gian tương đối (vừa xong, 5 phút trước, ...)
 */
export const getRelativeTime = (timestamp) => {
  if (!timestamp) return '';
  
  const now = new Date();
  
  // Backend trả về UTC time với 'Z': "2025-11-06T08:31:17.2789293Z"
  // JavaScript Date constructor sẽ tự động convert UTC sang Local timezone
  const commentTime = new Date(timestamp);
  
  // Kiểm tra valid date
  if (isNaN(commentTime.getTime())) {
    console.warn('[getRelativeTime] Invalid timestamp:', timestamp);
    return '';
  }
  
  const diffInSeconds = Math.floor((now - commentTime) / 1000);

  // Vừa xong (dưới 5 giây)
  if (diffInSeconds < 5) {
    return 'vừa xong';
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

  // X tuần trước (1-3 tuần)
  const diffInWeeks = Math.floor(diffInDays / 7);
  if (diffInWeeks < 4) {
    return `${diffInWeeks} tuần trước`;
  }

  // Hiển thị ngày tháng nếu quá 4 tuần
  const day = commentTime.getDate();
  const month = commentTime.getMonth() + 1;
  const year = commentTime.getFullYear();
  
  // Nếu cùng năm, không hiển thị năm
  if (year === now.getFullYear()) {
    return `${day} thg ${month}`;
  }
  
  return `${day} thg ${month}, ${year}`;
};

/**
 * React Hook để tự động cập nhật thời gian tương đối
 * Cập nhật mỗi phút cho comments gần đây (< 1 giờ)
 * @param {string|Date} timestamp - Thời gian cần format
 * @returns {string} - Chuỗi thời gian tương đối
 */
export const useRelativeTime = (timestamp) => {
  const [relativeTime, setRelativeTime] = useState(() => getRelativeTime(timestamp));

  useEffect(() => {
    // Cập nhật ngay lập tức
    setRelativeTime(getRelativeTime(timestamp));

    const now = new Date();
    const commentTime = new Date(timestamp);
    const diffInMinutes = Math.floor((now - commentTime) / 1000 / 60);

    // Nếu comment mới hơn 1 giờ, cập nhật mỗi 60 giây
    if (diffInMinutes < 60) {
      const interval = setInterval(() => {
        setRelativeTime(getRelativeTime(timestamp));
      }, 60000); // 60 seconds

      return () => clearInterval(interval);
    }

    // Nếu comment cũ hơn, không cần cập nhật tự động
    return undefined;
  }, [timestamp]);

  return relativeTime;
};

/**
 * Format thời gian đầy đủ cho tooltip hoặc chi tiết
 * @param {string|Date} timestamp - Thời gian cần format
 * @returns {string} - Thời gian đầy đủ (VD: "06/11/2025, 14:30")
 */
export const getFullTime = (timestamp) => {
  const date = new Date(timestamp);
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  
  return `${day}/${month}/${year}, ${hours}:${minutes}`;
};
