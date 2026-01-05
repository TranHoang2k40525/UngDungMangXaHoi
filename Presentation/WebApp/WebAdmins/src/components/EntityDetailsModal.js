import React, { useState, useEffect } from "react";
import api from "../services/api";
import "./EntityDetailsModal.css";

const EntityDetailsModal = ({ entityType, entityId, entityName, onClose }) => {
    const [loading, setLoading] = useState(true);
    const [details, setDetails] = useState(null);
    const [error, setError] = useState(null);
    const [lightboxOpen, setLightboxOpen] = useState(false);
    const [lightboxIndex, setLightboxIndex] = useState(0);

    useEffect(() => {
        if (entityId) {
            fetchEntityDetails();
        }
    }, [entityId, entityType]);
    const fetchEntityDetails = async () => {
        try {
            setLoading(true);
            setError(null);

            console.log("🔍 Fetching entity details:", {
                entityType,
                entityId,
            }); // 🔥 Use the new unified endpoint
            const response = await api.get(
                `/api/admin/activity-logs/entity-details?entityType=${entityType}&entityId=${entityId}`
            );

            // ⚠️ IMPORTANT: api.js interceptor already unwraps response.data
            // So response here is actually the data from server
            // Server sends: {success: true, entityType, entityId, data}
            // api.js interceptor returns: response.data (which is the server response)
            // So we get the full object directly

            console.log("✅ API Response (after interceptor):", response);
            console.log("🔍 Response type:", typeof response);
            console.log("🔍 Response keys:", Object.keys(response || {}));
            console.log("🎯 Success flag:", response?.success);
            console.log("📊 Data:", response?.data);

            // ✅ Response is already unwrapped by interceptor
            if (response && response.success === true && response.data) {
                console.log("✅ SUCCESS! Setting details:", response.data);
                setDetails(response.data);
            } else {
                console.error("❌ API returned unsuccessful response");
                console.error("   Response:", response);
                console.error("   Success:", response?.success);
                console.error("   Data:", response?.data);
                throw new Error(response?.message || "Failed to fetch details");
            }
        } catch (err) {
            console.error("❌ Error fetching entity details:", err);
            setError(
                err.response?.data?.message ||
                    err.message ||
                    "Không thể tải thông tin chi tiết"
            );
        } finally {
            setLoading(false);
        }
    };

    // Lightbox handlers
    const openLightbox = (index) => {
        setLightboxIndex(index);
        setLightboxOpen(true);
    };

    const closeLightbox = () => {
        setLightboxOpen(false);
    };

    const nextImage = () => {
        if (details?.media) {
            setLightboxIndex((prev) =>
                prev === details.media.length - 1 ? 0 : prev + 1
            );
        }
    };

    const prevImage = () => {
        if (details?.media) {
            setLightboxIndex((prev) =>
                prev === 0 ? details.media.length - 1 : prev - 1
            );
        }
    };

    const handleLightboxKeyDown = (e) => {
        if (e.key === "ArrowRight") nextImage();
        if (e.key === "ArrowLeft") prevImage();
        if (e.key === "Escape") closeLightbox();
    };

    useEffect(() => {
        if (lightboxOpen) {
            window.addEventListener("keydown", handleLightboxKeyDown);
            return () =>
                window.removeEventListener("keydown", handleLightboxKeyDown);
        }
    }, [lightboxOpen, lightboxIndex]);

    const renderUserDetails = () => (
        <div className="entity-details-content">
            <div className="detail-header">
                <img
                    src={details.avatarUrl || "/default-avatar.png"}
                    alt={details.fullName}
                    className="detail-avatar"
                />
                <div>
                    <h3>{details.fullName || "N/A"}</h3>
                    <p className="detail-username">@{details.username}</p>
                </div>
            </div>

            <div className="detail-section">
                <h4>📧 Thông tin liên hệ</h4>
                <div className="detail-grid">
                    <div className="detail-item">
                        <span className="label">Email:</span>
                        <span className="value">{details.email}</span>
                    </div>
                    <div className="detail-item">
                        <span className="label">Phone:</span>
                        <span className="value">{details.phone || "N/A"}</span>
                    </div>
                </div>
            </div>

            <div className="detail-section">
                <h4>👤 Thông tin cá nhân</h4>
                <div className="detail-grid">
                    <div className="detail-item">
                        <span className="label">Giới tính:</span>
                        <span className="value">{details.gender || "N/A"}</span>
                    </div>
                    <div className="detail-item">
                        <span className="label">Ngày sinh:</span>
                        <span className="value">
                            {details.dateOfBirth
                                ? new Date(
                                      details.dateOfBirth
                                  ).toLocaleDateString("vi-VN")
                                : "N/A"}
                        </span>
                    </div>
                    <div className="detail-item">
                        <span className="label">Địa chỉ:</span>
                        <span className="value">
                            {details.address || "N/A"}
                        </span>
                    </div>
                    <div className="detail-item">
                        <span className="label">Quê quán:</span>
                        <span className="value">
                            {details.hometown || "N/A"}
                        </span>
                    </div>
                    <div className="detail-item">
                        <span className="label">Nghề nghiệp:</span>
                        <span className="value">{details.job || "N/A"}</span>
                    </div>
                    <div className="detail-item">
                        <span className="label">Website:</span>
                        <span className="value">
                            {details.website ? (
                                <a
                                    href={details.website}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    {details.website}
                                </a>
                            ) : (
                                "N/A"
                            )}
                        </span>
                    </div>
                </div>
            </div>

            <div className="detail-section">
                <h4>📝 Bio</h4>
                <p className="bio-text">{details.bio || "Không có bio"}</p>
            </div>

            <div className="detail-section">
                <h4>⚙️ Trạng thái tài khoản</h4>
                <div className="detail-grid">
                    <div className="detail-item">
                        <span className="label">Trạng thái:</span>
                        <span
                            className={`status-badge status-${details.status}`}
                        >
                            {details.status === "active"
                                ? "Hoạt động"
                                : details.status === "banned"
                                ? "Bị cấm"
                                : details.status}
                        </span>
                    </div>
                    <div className="detail-item">
                        <span className="label">Loại tài khoản:</span>
                        <span className="value">{details.accountType}</span>
                    </div>
                    <div className="detail-item">
                        <span className="label">Riêng tư:</span>
                        <span className="value">
                            {details.isPrivate ? "Có" : "Không"}
                        </span>
                    </div>
                    <div className="detail-item">
                        <span className="label">Tạo lúc:</span>
                        <span className="value">
                            {details.createdAt
                                ? new Date(details.createdAt).toLocaleString(
                                      "vi-VN"
                                  )
                                : "N/A"}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );

    const renderPostDetails = () => (
        <div className="entity-details-content">
            <div className="detail-header">
                <div>
                    <h3>Bài đăng #{details.postId || details.id}</h3>
                    <p className="detail-author">
                        Tác giả:{" "}
                        {details.author?.fullName ||
                            details.authorName ||
                            "Unknown"}
                    </p>
                </div>
            </div>
            <div className="detail-section">
                <h4>📝 Nội dung</h4>
                <p className="caption-text">
                    {details.caption || "Không có caption"}
                </p>
            </div>{" "}
            {details.media && details.media.length > 0 && (
                <div className="detail-section">
                    <h4>
                        🖼️ Media ({details.media.length}{" "}
                        {details.media.length === 1 ? "file" : "files"})
                    </h4>
                    <div className="media-gallery">
                        {details.media.map((m, idx) => (
                            <div key={idx} className="media-item-wrapper">
                                <div
                                    className={`media-item ${
                                        m.type === "Image"
                                            ? "clickable-media"
                                            : ""
                                    }`}
                                    onClick={() =>
                                        m.type === "Image" && openLightbox(idx)
                                    }
                                >
                                    {m.type === "Image" ? (
                                        <>
                                            <img
                                                src={m.url}
                                                alt={`Media ${idx + 1}`}
                                                loading="lazy"
                                            />
                                            <div className="media-overlay">
                                                <span className="zoom-icon">
                                                    🔍
                                                </span>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="video-wrapper">
                                            <video
                                                src={m.url}
                                                controls
                                                preload="metadata"
                                                controlsList="nodownload"
                                            />
                                            <div className="video-badge">
                                                <span>▶️ Video</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <div className="media-type-badge">
                                    {m.type === "Image" ? "🖼️ Ảnh" : "🎬 Video"}{" "}
                                    #{idx + 1}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            <div className="detail-section">
                <h4>📊 Thống kê</h4>
                <div className="detail-grid">
                    <div className="detail-item">
                        <span className="label">Reactions:</span>
                        <span className="value">
                            {details.totalReactions || 0}
                        </span>
                    </div>
                    <div className="detail-item">
                        <span className="label">Comments:</span>
                        <span className="value">
                            {details.commentsCount || 0}
                        </span>
                    </div>
                    <div className="detail-item">
                        <span className="label">Privacy:</span>
                        <span className="value">{details.privacy}</span>
                    </div>
                    <div className="detail-item">
                        <span className="label">Hiển thị:</span>
                        <span className="value">
                            {details.isVisible ? "Có" : "Không"}
                        </span>
                    </div>
                </div>
            </div>
            {details.location && (
                <div className="detail-section">
                    <h4>📍 Vị trí</h4>
                    <p>{details.location}</p>
                </div>
            )}
            <div className="detail-section">
                <h4>🕒 Thời gian</h4>
                <p>
                    Tạo lúc:{" "}
                    {details.createdAt
                        ? new Date(details.createdAt).toLocaleString("vi-VN")
                        : "N/A"}
                </p>
            </div>
        </div>
    );

    const renderCommentDetails = () => (
        <div className="entity-details-content">
            <div className="detail-header">
                <img
                    src={details.author?.avatarUrl || "/default-avatar.png"}
                    alt={details.author?.fullName}
                    className="detail-avatar"
                />
                <div>
                    <h3>{details.author?.fullName || "Unknown User"}</h3>
                    <p className="detail-username">
                        @{details.author?.username || "N/A"}
                    </p>
                </div>
            </div>

            <div className="detail-section">
                <h4>💬 Nội dung bình luận</h4>
                <div className="comment-content-box">
                    <p>{details.content || "(Không có nội dung)"}</p>
                </div>
            </div>

            <div className="detail-section">
                <h4>📝 Bài viết gốc</h4>
                <div className="detail-grid">
                    <div className="detail-item">
                        <span className="label">Post ID:</span>
                        <span className="value">
                            #{details.post?.postId || "N/A"}
                        </span>
                    </div>
                    <div className="detail-item">
                        <span className="label">Tác giả bài viết:</span>
                        <span className="value">
                            {details.post?.author || "N/A"}
                        </span>
                    </div>
                    <div className="detail-item full-width">
                        <span className="label">Caption:</span>
                        <span className="value">
                            {details.post?.caption || "(Không có caption)"}
                        </span>
                    </div>
                </div>
            </div>

            {details.parentCommentId && (
                <div className="detail-section">
                    <h4>↩️ Phản hồi comment</h4>
                    <p>Đây là reply cho comment #{details.parentCommentId}</p>
                </div>
            )}

            <div className="detail-section">
                <h4>⚙️ Trạng thái</h4>
                <div className="detail-grid">
                    <div className="detail-item">
                        <span className="label">Hiển thị:</span>
                        <span
                            className={`status-badge ${
                                details.isVisible
                                    ? "status-active"
                                    : "status-inactive"
                            }`}
                        >
                            {details.isVisible ? "Đang hiển thị" : "Đã ẩn"}
                        </span>
                    </div>
                    <div className="detail-item">
                        <span className="label">Đã xóa:</span>
                        <span
                            className={`status-badge ${
                                details.isDeleted
                                    ? "status-banned"
                                    : "status-active"
                            }`}
                        >
                            {details.isDeleted ? "Có" : "Không"}
                        </span>
                    </div>
                    <div className="detail-item">
                        <span className="label">Đã chỉnh sửa:</span>
                        <span className="value">
                            {details.isEdited ? "Có" : "Không"}
                        </span>
                    </div>
                </div>
            </div>

            <div className="detail-section">
                <h4>🕒 Thời gian</h4>
                <div className="detail-grid">
                    <div className="detail-item">
                        <span className="label">Tạo lúc:</span>
                        <span className="value">
                            {details.createdAt
                                ? new Date(details.createdAt).toLocaleString(
                                      "vi-VN"
                                  )
                                : "N/A"}
                        </span>
                    </div>
                    {details.updatedAt && (
                        <div className="detail-item">
                            <span className="label">Cập nhật lúc:</span>
                            <span className="value">
                                {new Date(details.updatedAt).toLocaleString(
                                    "vi-VN"
                                )}
                            </span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );

    const renderReportDetails = () => (
        <div className="entity-details-content">
            <div className="detail-header">
                <h3>Báo cáo #{details.reportId || details.id}</h3>
            </div>

            <div className="detail-section">
                <h4>👤 Người tham gia</h4>
                <div className="detail-grid">
                    <div className="detail-item">
                        <span className="label">Người báo cáo:</span>
                        <span className="value">
                            {details.reporter?.fullName ||
                                details.reporterName ||
                                "N/A"}
                        </span>
                    </div>
                    <div className="detail-item">
                        <span className="label">Người bị báo cáo:</span>
                        <span className="value">
                            {details.reportedUser?.fullName ||
                                details.reportedUserName ||
                                "N/A"}
                        </span>
                    </div>
                </div>
            </div>

            <div className="detail-section">
                <h4>📋 Nội dung báo cáo</h4>
                <div className="detail-grid">
                    <div className="detail-item">
                        <span className="label">Loại:</span>
                        <span className="value">
                            {details.type || details.contentType}
                        </span>
                    </div>
                    <div className="detail-item">
                        <span className="label">Lý do:</span>
                        <span className="value">{details.reason}</span>
                    </div>
                </div>
                <p className="description-text">
                    <strong>Mô tả:</strong> {details.description || "Không có"}
                </p>
            </div>

            {details.contentDetails && (
                <div className="detail-section">
                    <h4>🔍 Nội dung bị báo cáo</h4>
                    <div className="content-preview">
                        {details.contentDetails.type === "post" && (
                            <p>
                                <strong>Bài viết:</strong>{" "}
                                {details.contentDetails.caption}
                            </p>
                        )}
                        {details.contentDetails.type === "comment" && (
                            <p>
                                <strong>Comment:</strong>{" "}
                                {details.contentDetails.content}
                            </p>
                        )}
                        <p className="small-text">
                            Tác giả: {details.contentDetails.author}
                        </p>
                    </div>
                </div>
            )}

            <div className="detail-section">
                <h4>⚙️ Trạng thái</h4>
                <div className="detail-grid">
                    <div className="detail-item">
                        <span className="label">Trạng thái:</span>
                        <span
                            className={`status-badge status-${details.status}`}
                        >
                            {details.status}
                        </span>
                    </div>
                    {details.adminNote && (
                        <div className="detail-item full-width">
                            <span className="label">Ghi chú admin:</span>
                            <span className="value">{details.adminNote}</span>
                        </div>
                    )}
                </div>
            </div>

            <div className="detail-section">
                <h4>🕒 Thời gian</h4>
                <p>
                    Tạo lúc:{" "}
                    {details.createdAt
                        ? new Date(details.createdAt).toLocaleString("vi-VN")
                        : "N/A"}
                </p>
                {details.resolvedAt && (
                    <p>
                        Xử lý lúc:{" "}
                        {new Date(details.resolvedAt).toLocaleString("vi-VN")}
                    </p>
                )}
            </div>
        </div>
    );

    const renderBusinessDetails = () => (
        <div className="entity-details-content">
            <div className="detail-header">
                <h3>{details.businessName || "Doanh nghiệp"}</h3>
                <p className="detail-subtitle">
                    Yêu cầu xác thực #{details.requestId || details.id}
                </p>
            </div>

            <div className="detail-section">
                <h4>🏢 Thông tin doanh nghiệp</h4>
                <div className="detail-grid">
                    <div className="detail-item">
                        <span className="label">Tên doanh nghiệp:</span>
                        <span className="value">{details.businessName}</span>
                    </div>
                    <div className="detail-item">
                        <span className="label">Loại hình:</span>
                        <span className="value">{details.businessType}</span>
                    </div>
                    <div className="detail-item">
                        <span className="label">Mã số thuế:</span>
                        <span className="value">{details.taxCode}</span>
                    </div>
                </div>
            </div>

            <div className="detail-section">
                <h4>👤 Thông tin chủ sở hữu</h4>
                <div className="detail-grid">
                    <div className="detail-item">
                        <span className="label">Tên:</span>
                        <span className="value">{details.ownerName}</span>
                    </div>
                    <div className="detail-item">
                        <span className="label">Email:</span>
                        <span className="value">{details.email}</span>
                    </div>
                    <div className="detail-item">
                        <span className="label">Phone:</span>
                        <span className="value">{details.phone}</span>
                    </div>
                </div>
            </div>

            <div className="detail-section">
                <h4>📍 Địa chỉ & Liên hệ</h4>
                <div className="detail-grid">
                    <div className="detail-item full-width">
                        <span className="label">Địa chỉ:</span>
                        <span className="value">
                            {details.address || "N/A"}
                        </span>
                    </div>
                    <div className="detail-item">
                        <span className="label">Website:</span>
                        <span className="value">
                            {details.website ? (
                                <a
                                    href={details.website}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    {details.website}
                                </a>
                            ) : (
                                "N/A"
                            )}
                        </span>
                    </div>
                </div>
            </div>

            {details.description && (
                <div className="detail-section">
                    <h4>📝 Mô tả</h4>
                    <p>{details.description}</p>
                </div>
            )}

            <div className="detail-section">
                <h4>⚙️ Trạng thái xác thực</h4>
                <div className="detail-grid">
                    <div className="detail-item">
                        <span className="label">Trạng thái:</span>
                        <span
                            className={`status-badge status-${details.status?.toLowerCase()}`}
                        >
                            {details.status}
                        </span>
                    </div>
                    <div className="detail-item">
                        <span className="label">Gửi lúc:</span>
                        <span className="value">
                            {details.submittedAt
                                ? new Date(details.submittedAt).toLocaleString(
                                      "vi-VN"
                                  )
                                : "N/A"}
                        </span>
                    </div>
                    {details.reviewedAt && (
                        <>
                            <div className="detail-item">
                                <span className="label">Xét duyệt lúc:</span>
                                <span className="value">
                                    {new Date(
                                        details.reviewedAt
                                    ).toLocaleString("vi-VN")}
                                </span>
                            </div>
                            <div className="detail-item">
                                <span className="label">Người xét duyệt:</span>
                                <span className="value">
                                    {details.reviewedBy || "N/A"}
                                </span>
                            </div>
                        </>
                    )}
                    {details.reviewedNotes && (
                        <div className="detail-item full-width">
                            <span className="label">Ghi chú:</span>
                            <span className="value">
                                {details.reviewedNotes}
                            </span>
                        </div>
                    )}
                </div>
            </div>

            {details.documentsUrl && (
                <div className="detail-section">
                    <h4>📎 Tài liệu</h4>
                    <a
                        href={details.documentsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="document-link"
                    >
                        Xem tài liệu đính kèm
                    </a>
                </div>
            )}
        </div>
    );

    const renderContent = () => {
        if (loading) {
            return (
                <div className="loading-state">
                    <div className="spinner"></div>
                    <p>Đang tải thông tin...</p>
                </div>
            );
        }

        if (error) {
            return (
                <div className="error-state">
                    <p className="error-icon">⚠️</p>
                    <p className="error-message">{error}</p>
                    <button onClick={fetchEntityDetails} className="retry-btn">
                        Thử lại
                    </button>
                </div>
            );
        }

        if (!details) {
            return (
                <div className="empty-state">
                    <p>Không có dữ liệu</p>
                </div>
            );
        }
        switch (entityType) {
            case "user":
                return renderUserDetails();
            case "post":
                return renderPostDetails();
            case "comment":
                return renderCommentDetails();
            case "report":
                return renderReportDetails();
            case "business":
                return renderBusinessDetails();
            default:
                return (
                    <div className="generic-details">
                        <pre>{JSON.stringify(details, null, 2)}</pre>
                    </div>
                );
        }
    };
    return (
        <>
            <div className="entity-modal-overlay" onClick={onClose}>
                <div
                    className="entity-modal-container"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="entity-modal-header">
                        <h2>
                            {entityType === "user" && "👤 Thông tin người dùng"}
                            {entityType === "post" && "📄 Chi tiết bài viết"}
                            {entityType === "comment" && "💬 Chi tiết comment"}
                            {entityType === "report" && "📋 Chi tiết báo cáo"}
                            {entityType === "business" &&
                                "🏢 Thông tin doanh nghiệp"}
                        </h2>
                        <button className="close-btn" onClick={onClose}>
                            ✕
                        </button>
                    </div>

                    <div className="entity-modal-body">{renderContent()}</div>

                    <div className="entity-modal-footer">
                        <button className="btn-secondary" onClick={onClose}>
                            Đóng
                        </button>
                    </div>
                </div>
            </div>

            {/* Lightbox for images */}
            {lightboxOpen && details?.media && (
                <div className="lightbox-overlay" onClick={closeLightbox}>
                    <div
                        className="lightbox-container"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            className="lightbox-close"
                            onClick={closeLightbox}
                        >
                            ✕
                        </button>

                        <button
                            className="lightbox-nav lightbox-prev"
                            onClick={prevImage}
                        >
                            ‹
                        </button>

                        <div className="lightbox-content">
                            {details.media[lightboxIndex]?.type === "Image" ? (
                                <img
                                    src={details.media[lightboxIndex]?.url}
                                    alt={`Media ${lightboxIndex + 1}`}
                                    className="lightbox-image"
                                />
                            ) : (
                                <video
                                    src={details.media[lightboxIndex]?.url}
                                    controls
                                    autoPlay
                                    className="lightbox-video"
                                />
                            )}

                            <div className="lightbox-info">
                                <span className="lightbox-counter">
                                    {lightboxIndex + 1} / {details.media.length}
                                </span>
                                <span className="lightbox-type">
                                    {details.media[lightboxIndex]?.type ===
                                    "Image"
                                        ? "🖼️ Ảnh"
                                        : "🎬 Video"}
                                </span>
                            </div>
                        </div>

                        <button
                            className="lightbox-nav lightbox-next"
                            onClick={nextImage}
                        >
                            ›
                        </button>
                    </div>
                </div>
            )}
        </>
    );
};

export default EntityDetailsModal;
