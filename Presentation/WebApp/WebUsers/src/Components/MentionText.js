import React from 'react';
import { useNavigate } from 'react-router-dom';
import './MentionText.css';

/**
 * Component phân tích text, tìm @username và render clickable
 * @param {string} text - Text cần render
 * @param {string} className - CSS class cho text thông thường
 * @param {function} onMentionPress - Callback khi click mention: (username) => {}
 */
const MentionText = ({ text, className = '', onMentionPress }) => {
  const navigate = useNavigate();

  if (!text) return null;

  // Regex để tìm @username (chữ cái, số, dấu gạch dưới)
  const mentionRegex = /@(\w+)/g;
  const parts = [];
  let lastIndex = 0;
  let match;

  // Tìm tất cả mentions
  while ((match = mentionRegex.exec(text)) !== null) {
    const mentionStart = match.index;
    const mentionEnd = mentionRegex.lastIndex;
    const username = match[1]; // Bỏ ký tự @

    // Thêm text trước mention
    if (mentionStart > lastIndex) {
      parts.push({
        type: 'text',
        content: text.substring(lastIndex, mentionStart),
      });
    }

    // Thêm mention
    parts.push({
      type: 'mention',
      content: `@${username}`,
      username: username,
    });

    lastIndex = mentionEnd;
  }

  // Thêm text còn lại sau mention cuối cùng
  if (lastIndex < text.length) {
    parts.push({
      type: 'text',
      content: text.substring(lastIndex),
    });
  }

  // Nếu không có mention nào, render text thông thường
  if (parts.length === 0) {
    return <span className={className}>{text}</span>;
  }

  // Render text với mentions
  return (
    <span className={className}>
      {parts.map((part, index) => {
        if (part.type === 'mention') {
          return (
            <span
              key={index}
              className="mention-text-link"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (onMentionPress) {
                  onMentionPress(part.username);
                } else {
                  // Navigate đến profile public với username
                  navigate(`/user/username/${part.username}`);
                }
              }}
            >
              {part.content}
            </span>
          );
        } else {
          return <span key={index}>{part.content}</span>;
        }
      })}
    </span>
  );
};

export default MentionText;
