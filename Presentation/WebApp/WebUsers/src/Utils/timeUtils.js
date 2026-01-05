/**
 * Format thời gian theo phong cách Instagram
 */
export const getRelativeTime = (timestamp) => {
  if (!timestamp) return '';
  
  const now = new Date();
  
  // Parse timestamp from server and add 7 hours for Vietnam timezone (UTC+7)
  const commentTime = new Date(timestamp);
  if (isNaN(commentTime.getTime())) {
    console.warn('[getRelativeTime] Invalid timestamp:', timestamp);
    return '';
  }
  
  // Add 7 hours (7 * 60 * 60 * 1000 milliseconds) for Vietnam timezone
  const vietnamTime = new Date(commentTime.getTime() + (7 * 60 * 60 * 1000));
  
  const diffInSeconds = Math.floor((now - vietnamTime) / 1000);

  if (diffInSeconds < 5) {
    return 'vừa xong';
  }

  if (diffInSeconds < 60) {
    return `${diffInSeconds} giây trước`;
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes} phút trước`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours} giờ trước`;
  }

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) {
    return `${diffInDays} ngày trước`;
  }

  const diffInWeeks = Math.floor(diffInDays / 7);
  if (diffInWeeks < 4) {
    return `${diffInWeeks} tuần trước`;
  }

  const day = vietnamTime.getDate();
  const month = vietnamTime.getMonth() + 1;
  const year = vietnamTime.getFullYear();
  
  if (year === now.getFullYear()) {
    return `${day} thg ${month}`;
  }
  
  return `${day} thg ${month}, ${year}`;
};

/**
 * Format số lượng (1000 -> 1K, 1000000 -> 1M)
 */
export const formatNumber = (num) => {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
};
