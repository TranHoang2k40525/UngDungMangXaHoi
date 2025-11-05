import React from 'react';
import { Text } from 'react-native';
import { useCommentTime } from '../Utils/timeUtils';

/**
 * Component hiển thị thời gian comment với auto-update real-time
 * 
 * @param {string} createdAt - ISO 8601 date string
 * @param {object} style - Custom style cho Text
 * 
 * @example
 * <CommentTimeText 
 *   createdAt="2025-11-04T10:30:00Z" 
 *   style={{ color: '#8E8E8E', fontSize: 12 }}
 * />
 */
const CommentTimeText = ({ createdAt, style }) => {
  const timeText = useCommentTime(createdAt);

  return (
    <Text style={style}>
      {timeText}
    </Text>
  );
};

export default CommentTimeText;
