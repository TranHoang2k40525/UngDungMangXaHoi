// ReportAPI.js - API service for reporting violations
// Uses centralized API functions from Api.js
import { createReport, getUserViolationStats } from "./Api";

/**
 * Submit a report for a post, comment, user, or message
 * @param {Object} reportData - { contentType, contentId, reportedUserId, reason, description }
 * @returns {Promise<Object>} - Report response
 */
export const submitReport = async (reportData) => {
    try {
        console.log("[ReportAPI] Submitting report:", reportData);
        const result = await createReport(reportData);
        
        if (!result.success) {
            throw new Error(result.message || "Không thể gửi báo cáo");
        }
        
        return result.data;
    } catch (error) {
        console.error("[ReportAPI] Submit report error:", error);
        throw error;
    }
};

/**
 * Get user's violation statistics
 * @param {number} userId - User ID
 * @returns {Promise<Object>} - { totalReports, pendingReports, resolvedReports, rejectedReports }
 */
export const getUserViolationStatsAPI = async (userId) => {
    try {
        console.log("[ReportAPI] Getting violation stats for user:", userId);
        const result = await getUserViolationStats(userId);
        
        if (!result.success) {
            throw new Error(result.message || "Không thể tải thông tin vi phạm");
        }
        
        return result.data;
    } catch (error) {
        console.error("[ReportAPI] Get violation stats error:", error);
        throw error;
    }
};

// Report reasons (Vietnamese labels, sent to backend as-is)
export const REPORT_REASONS = {
    SPAM: "Spam hoặc quảng cáo",
    HARASSMENT: "Quấy rối hoặc bắt nạt",
    HATE_SPEECH: "Ngôn từ thù địch",
    VIOLENCE: "Bạo lực hoặc nguy hiểm",
    NUDITY: "Nội dung nhạy cảm",
    FAKE_NEWS: "Thông tin sai lệch",
    INTELLECTUAL_PROPERTY: "Vi phạm bản quyền",
    OTHER: "Khác",
};

export default {
    submitReport,
    getUserViolationStatsAPI,
    REPORT_REASONS,
};



