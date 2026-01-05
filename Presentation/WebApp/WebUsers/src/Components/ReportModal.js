import React, { useState } from "react";
import "./ReportModal.css";
import { createReport } from "../api/Api";

/**
 * Report Modal Component for Web
 * @param {boolean} visible - Modal visibility
 * @param {Function} onClose - Close callback
 * @param {string} contentType - Type: "post", "comment", "user", "message"
 * @param {number} contentId - ID of content
 * @param {number} reportedUserId - ID of reported user
 * @param {string} contentPreview - Preview text (optional)
 */
const ReportModal = ({
  visible,
  onClose,
  contentType,
  contentId,
  reportedUserId,
  contentPreview,
}) => {
  const [selectedReason, setSelectedReason] = useState(null);
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const reportReasons = [
    { id: "spam", label: "Spam hoặc quảng cáo", icon: "📣" },
    { id: "harassment", label: "Quấy rối hoặc bắt nạt", icon: "⚠️" },
    { id: "hate_speech", label: "Ngôn từ thù địch", icon: "🚫" },
    { id: "violence", label: "Bạo lực hoặc nguy hiểm", icon: "☠️" },
    { id: "nudity", label: "Nội dung nhạy cảm", icon: "🔞" },
    { id: "fake_news", label: "Thông tin sai lệch", icon: "📰" },
    { id: "intellectual_property", label: "Vi phạm bản quyền", icon: "🔒" },
    { id: "other", label: "Khác", icon: "⋯" },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedReason) {
      alert("Vui lòng chọn lý do báo cáo");
      return;
    }

    setSubmitting(true);

    try {
      const reportData = {
        contentType: contentType,
        contentId: contentId || null,
        reportedUserId: reportedUserId || null,
        reason: reportReasons.find((r) => r.id === selectedReason)?.label || selectedReason,
        description: description.trim() || null,
      };

      console.log("[ReportModal] Submitting report:", reportData);

      await createReport(reportData);

      alert("Báo cáo của bạn đã được gửi. Chúng tôi sẽ xem xét và xử lý sớm nhất.");
      
      // Reset form
      setSelectedReason(null);
      setDescription("");
      onClose();
    } catch (error) {
      console.error("[ReportModal] Submit error:", error);
      alert(error.message || "Không thể gửi báo cáo. Vui lòng thử lại sau.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!submitting) {
      setSelectedReason(null);
      setDescription("");
      onClose();
    }
  };

  if (!visible) return null;

  return (
    <div className="report-modal-overlay" onClick={handleClose}>
      <div className="report-modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="report-modal-header">
          <h2 className="report-modal-title">Báo cáo vi phạm</h2>
          <button
            className="report-modal-close"
            onClick={handleClose}
            disabled={submitting}
          >
            ×
          </button>
        </div>

        {/* Content Preview */}
        {contentPreview && (
          <div className="report-preview-box">
            <p className="report-preview-label">Nội dung báo cáo:</p>
            <p className="report-preview-text">{contentPreview}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="report-modal-form">
          <div className="report-reasons-section">
            <p className="report-section-title">Lý do báo cáo</p>
            <div className="report-reasons-list">
              {reportReasons.map((reason) => (
                <label
                  key={reason.id}
                  className={`report-reason-item ${
                    selectedReason === reason.id ? "selected" : ""
                  }`}
                >
                  <input
                    type="radio"
                    name="reason"
                    value={reason.id}
                    checked={selectedReason === reason.id}
                    onChange={(e) => setSelectedReason(e.target.value)}
                    disabled={submitting}
                  />
                  <span className="report-reason-icon">{reason.icon}</span>
                  <span className="report-reason-label">{reason.label}</span>
                  {selectedReason === reason.id && (
                    <span className="report-reason-check">✓</span>
                  )}
                </label>
              ))}
            </div>
          </div>

          {/* Description */}
          <div className="report-description-section">
            <p className="report-section-title">Mô tả chi tiết (tuỳ chọn)</p>
            <textarea
              className="report-description-input"
              placeholder="Nhập mô tả chi tiết về vi phạm..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={500}
              disabled={submitting}
              rows={4}
            />
            <p className="report-char-count">{description.length}/500</p>
          </div>

          {/* Buttons */}
          <div className="report-modal-footer">
            <button
              type="button"
              className="report-btn report-btn-cancel"
              onClick={handleClose}
              disabled={submitting}
            >
              Hủy
            </button>
            <button
              type="submit"
              className="report-btn report-btn-submit"
              disabled={!selectedReason || submitting}
            >
              {submitting ? "Đang gửi..." : "Gửi báo cáo"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ReportModal;
