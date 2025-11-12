// MentionText.js
// Component render text với @mention màu xanh, click vào navigate đến profile
import React from "react";
import { Text, TouchableOpacity, StyleSheet } from "react-native";

/**
 * Component phân tích text, tìm @username và render clickable
 * @param {string} text - Text cần render
 * @param {object} style - Style cho text thông thường
 * @param {function} onMentionPress - Callback khi click mention: (username) => {}
 * @param {object} navigation - React Navigation object
 */
const MentionText = ({ text, style, onMentionPress, navigation }) => {
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
                type: "text",
                content: text.substring(lastIndex, mentionStart),
            });
        }

        // Thêm mention
        parts.push({
            type: "mention",
            content: `@${username}`,
            username: username,
        });

        lastIndex = mentionEnd;
    }

    // Thêm text còn lại sau mention cuối cùng
    if (lastIndex < text.length) {
        parts.push({
            type: "text",
            content: text.substring(lastIndex),
        });
    }

    // Nếu không có mention nào, render text thông thường
    if (parts.length === 0) {
        return <Text style={style}>{text}</Text>;
    }

    // Render text với mentions
    return (
        <Text style={style}>
            {parts.map((part, index) => {
                if (part.type === "mention") {
                    return (
                        <TouchableOpacity
                            key={index}
                            onPress={() => {
                                if (onMentionPress) {
                                    onMentionPress(part.username);
                                } else if (navigation) {
                                    // Navigate đến profile public với username
                                    navigation.push("UserProfilePublic", {
                                        username: part.username,
                                    });
                                }
                            }}
                        >
                            <Text style={styles.mention}>{part.content}</Text>
                        </TouchableOpacity>
                    );
                } else {
                    return <Text key={index}>{part.content}</Text>;
                }
            })}
        </Text>
    );
};

const styles = StyleSheet.create({
    mention: {
        color: "#0095f6", // Màu xanh Instagram
        fontWeight: "600",
    },
});

export default MentionText;
