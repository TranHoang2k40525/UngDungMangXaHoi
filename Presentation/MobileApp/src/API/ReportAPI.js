// ReportAPI.js - API service for reporting violations
import AsyncStorage from "@react-native-async-storage/async-storage";

const API_BASE_URL = "http://192.168.37.228:5297";

/**
 * Submit a report for a post, comment, or user
 * @param {Object} reportData - { contentType, contentId, reportedUserId, reason, description }
 * @returns {Promise<Object>} - Report response
 */
export const submitReport = async (reportData) => {
    try {
        const accessToken = await AsyncStorage.getItem("accessToken");

        if (!accessToken) {
            throw new Error("Vui lòng đăng nhập để báo cáo vi phạm");
        }

        const response = await fetch(`${API_BASE_URL}/api/reports`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify(reportData),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || "Không thể gửi báo cáo");
        }

        return await response.json();
    } catch (error) {
        console.error("Submit report error:", error);
        throw error;
    }
};

/**
 * Get user's report history
 * @returns {Promise<Array>} - List of reports
 */
export const getMyReports = async () => {
    try {
        const accessToken = await AsyncStorage.getItem("accessToken");

        if (!accessToken) {
            throw new Error("Vui lòng đăng nhập");
        }

        const response = await fetch(`${API_BASE_URL}/api/reports/my-reports`, {
            method: "GET",
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        });

        if (!response.ok) {
            throw new Error("Không thể tải lịch sử báo cáo");
        }

        return await response.json();
    } catch (error) {
        console.error("Get my reports error:", error);
        throw error;
    }
};

// Report reasons (must match backend enum)
export const REPORT_REASONS = {
    SPAM: "Spam",
    INAPPROPRIATE_CONTENT: "Nội dung không phù hợp",
    COPYRIGHT_VIOLATION: "Vi phạm bản quyền",
    HATE_SPEECH: "Ngôn từ căm thù",
    HARASSMENT: "Quấy rối",
    SCAM: "Lừa đảo",
    OTHER: "Khác",
};

export default {
    submitReport,
    getMyReports,
    REPORT_REASONS,
};
