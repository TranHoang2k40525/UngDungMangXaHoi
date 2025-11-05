// CommentText.js - Component để render comment với @mention highlighting
import React from 'react';
import { Text, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';

const CommentText = ({ content, style, onMentionPress }) => {
    const navigation = useNavigation();
    
    // Parse content để tìm @username
    const parseContent = (text) => {
        if (!text) return [{ text: '', type: 'text' }];
        
        // Regex để match @username (chữ cái, số, dấu gạch dưới)
        const mentionRegex = /@(\w+)/g;
        const parts = [];
        let lastIndex = 0;
        let match;
        
        while ((match = mentionRegex.exec(text)) !== null) {
            // Thêm text trước mention
            if (match.index > lastIndex) {
                parts.push({
                    text: text.substring(lastIndex, match.index),
                    type: 'text'
                });
            }
            
            // Thêm mention
            parts.push({
                text: match[0], // @username
                username: match[1], // username (không có @)
                type: 'mention'
            });
            
            lastIndex = match.index + match[0].length;
        }
        
        // Thêm phần còn lại
        if (lastIndex < text.length) {
            parts.push({
                text: text.substring(lastIndex),
                type: 'text'
            });
        }
        
        return parts.length > 0 ? parts : [{ text, type: 'text' }];
    };
    
    const handleMentionPress = (username) => {
        console.log('[CommentText] Mention pressed:', username);
        
        // Callback tùy chỉnh nếu có
        if (onMentionPress) {
            onMentionPress(username);
            return;
        }
        
        // Mặc định: navigate đến profile
        navigation.navigate('Profile', { username });
    };
    
    const parts = parseContent(content);
    
    return (
        <Text style={style}>
            {parts.map((part, index) => {
                if (part.type === 'mention') {
                    return (
                        <TouchableOpacity
                            key={index}
                            onPress={() => handleMentionPress(part.username)}
                            activeOpacity={0.7}
                        >
                            <Text style={[style, { color: '#0095f6', fontWeight: '600' }]}>
                                {part.text}
                            </Text>
                        </TouchableOpacity>
                    );
                }
                return <Text key={index}>{part.text}</Text>;
            })}
        </Text>
    );
};

export default CommentText;
