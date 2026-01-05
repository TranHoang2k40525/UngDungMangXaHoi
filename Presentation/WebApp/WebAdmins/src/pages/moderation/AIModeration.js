import { useState, useEffect } from "react";
import { aiModerationAPI } from "../../services/api.js";
import "./AIModeration.css";

export default function AIModeration() {
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("overview"); // overview, violators, reports
    const [statistics, setStatistics] = useState(null);
    const [dateRange, setDateRange] = useState({
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
        end: new Date(),
    });

    useEffect(() => {
        loadStatistics();
    }, [dateRange]);
    const loadStatistics = async () => {
        try {
            setLoading(true);
            const response = await aiModerationAPI.getStatistics(
                dateRange.start,
                dateRange.end
            ); // Transform Backend response to Frontend format
            const stats = {
                totalChecks: response.totalChecked || 0,
                safeContent: response.safeContent || 0,
                violatedContent: response.violatingContent || 0,
                safeRate:
                    response.totalChecked > 0
                        ? ((response.safeContent || 0) /
                              response.totalChecked) *
                          100
                        : 0,
                violatingUsers: response.violatingUsers || 0,
                frequentViolators: 0, // Backend không trả về field này
                violationsByType: response.topViolationTypes || [], // Đây là array
                violationTrend: response.recentTrends || [],
                breakdown: response.breakdown || { posts: 0, comments: 0 }, // Thêm breakdown riêng
            };

            setStatistics(stats);
        } catch (error) {
            console.error("Error loading statistics:", error);
            alert("Không thể tải thống kê: " + (error.message || error));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="ai-moderation-page">
            <div className="page-header">
                <h1>🤖 AI Content Moderation</h1>
                <p>Hệ thống kiểm duyệt nội dung tự động bằng PhoBERT AI</p>
            </div>

            {/* Date Range Selector */}
            <div className="card date-range-selector">
                <div className="date-inputs">
                    <div className="form-group">
                        <label>Từ ngày:</label>
                        <input
                            type="date"
                            value={dateRange.start.toISOString().split("T")[0]}
                            onChange={(e) =>
                                setDateRange({
                                    ...dateRange,
                                    start: new Date(e.target.value),
                                })
                            }
                            className="input"
                        />
                    </div>
                    <div className="form-group">
                        <label>Đến ngày:</label>
                        <input
                            type="date"
                            value={dateRange.end.toISOString().split("T")[0]}
                            onChange={(e) =>
                                setDateRange({
                                    ...dateRange,
                                    end: new Date(e.target.value),
                                })
                            }
                            className="input"
                        />
                    </div>
                    <button
                        onClick={loadStatistics}
                        className="btn btn-primary"
                    >
                        🔄 Tải lại
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="card tabs-container">
                <button
                    className={`tab-btn ${
                        activeTab === "overview" ? "active" : ""
                    }`}
                    onClick={() => setActiveTab("overview")}
                >
                    📊 Tổng quan
                </button>
                <button
                    className={`tab-btn ${
                        activeTab === "violators" ? "active" : ""
                    }`}
                    onClick={() => setActiveTab("violators")}
                >
                    👤 Người dùng vi phạm
                </button>
                <button
                    className={`tab-btn ${
                        activeTab === "reports" ? "active" : ""
                    }`}
                    onClick={() => setActiveTab("reports")}
                >
                    📋 Báo cáo vi phạm
                </button>
            </div>

            {/* Content */}
            {loading ? (
                <div className="loading-container">
                    <div className="loading"></div>
                </div>
            ) : (
                <>
                    {activeTab === "overview" && (
                        <OverviewTab statistics={statistics} />
                    )}
                    {activeTab === "violators" && <ViolatorsTab />}
                    {activeTab === "reports" && <ReportsTab />}
                </>
            )}
        </div>
    );
}

// ============= OVERVIEW TAB =============
function OverviewTab({ statistics }) {
    if (!statistics) return <div className="card">Không có dữ liệu</div>;

    const {
        totalChecks,
        safeContent,
        violatedContent,
        safeRate,
        violatingUsers,
        frequentViolators,
        violationsByType,
        violationTrend,
    } = statistics;

    return (
        <div className="overview-tab">
            {/* Summary Cards */}
            <div className="stats-grid">
                <div className="stat-card card">
                    <div className="stat-icon">🔍</div>
                    <div className="stat-content">
                        <h3>Tổng số kiểm tra</h3>
                        <div className="stat-value">
                            {totalChecks.toLocaleString()}
                        </div>
                    </div>
                </div>

                <div className="stat-card card safe">
                    <div className="stat-icon">✅</div>
                    <div className="stat-content">
                        <h3>Nội dung an toàn</h3>
                        <div className="stat-value">
                            {safeContent.toLocaleString()}
                        </div>
                        <div className="stat-subtitle">
                            {safeRate.toFixed(1)}% tổng số
                        </div>
                    </div>
                </div>

                <div className="stat-card card danger">
                    <div className="stat-icon">⚠️</div>
                    <div className="stat-content">
                        <h3>Nội dung vi phạm</h3>
                        <div className="stat-value">
                            {violatedContent.toLocaleString()}
                        </div>
                        <div className="stat-subtitle">
                            {(100 - safeRate).toFixed(1)}% tổng số
                        </div>
                    </div>
                </div>

                <div className="stat-card card warning">
                    <div className="stat-icon">👥</div>
                    <div className="stat-content">
                        <h3>Người dùng vi phạm</h3>
                        <div className="stat-value">
                            {violatingUsers.toLocaleString()}
                        </div>
                    </div>
                </div>

                <div className="stat-card card critical">
                    <div className="stat-icon">🚨</div>
                    <div className="stat-content">
                        <h3>Vi phạm nghiêm trọng</h3>
                        <div className="stat-value">
                            {frequentViolators.toLocaleString()}
                        </div>
                        <div className="stat-subtitle">Trên 5 lần vi phạm</div>
                    </div>
                </div>
            </div>{" "}
            {/* Violation Types */}
            <div className="card">
                <h3>📊 Phân loại vi phạm</h3>
                <div className="violation-types">
                    {violationsByType.map((item) => (
                        <div
                            key={item.Label || item.label}
                            className="violation-type-item"
                        >
                            <div className="violation-type-label">
                                {getViolationTypeIcon(item.Label || item.label)}{" "}
                                {getViolationTypeName(item.Label || item.label)}
                            </div>
                            <div className="violation-type-bar">
                                <div
                                    className="violation-type-fill"
                                    style={{
                                        width: `${
                                            ((item.Count || item.count) /
                                                violatedContent) *
                                            100
                                        }%`,
                                    }}
                                />
                            </div>
                            <div className="violation-type-count">
                                {item.Count || item.count}
                            </div>
                        </div>
                    ))}
                </div>
            </div>{" "}
            {/* Violation Trend Chart */}
            <div className="card">
                <h3>📈 Xu hướng vi phạm theo thời gian</h3>
                {console.log("violationTrend data:", violationTrend)}
                <div className="trend-chart">
                    {violationTrend && violationTrend.length > 0 ? (
                        violationTrend.map((item) => {
                            const count = item.Count || item.count || 0;
                            const maxCount = Math.max(
                                ...violationTrend.map(
                                    (t) => t.Count || t.count || 0
                                )
                            );
                            const heightPercent =
                                maxCount > 0 ? (count / maxCount) * 100 : 0;

                            console.log("Trend item:", {
                                date: item.Date || item.date,
                                count,
                                maxCount,
                                heightPercent,
                            });

                            return (
                                <div
                                    key={item.Date || item.date}
                                    className="trend-bar"
                                >
                                    <div
                                        className="trend-fill"
                                        style={{
                                            height: `${heightPercent}%`,
                                            backgroundColor:
                                                count > 0
                                                    ? "#6366f1"
                                                    : "#e5e7eb",
                                        }}
                                        title={`${count} vi phạm`}
                                    />
                                    <div className="trend-label">
                                        {new Date(
                                            item.Date || item.date
                                        ).toLocaleDateString("vi-VN", {
                                            month: "short",
                                            day: "numeric",
                                        })}
                                    </div>
                                    <div
                                        style={{
                                            fontSize: "0.7rem",
                                            color: "#111",
                                            marginTop: "4px",
                                        }}
                                    >
                                        {count}
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="no-data">Không có dữ liệu xu hướng</div>
                    )}
                </div>
            </div>
        </div>
    );
}

// ============= VIOLATORS TAB =============
function ViolatorsTab() {
    const [violators, setViolators] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [minViolations, setMinViolations] = useState(5);
    const [selectedUser, setSelectedUser] = useState(null);
    const [showDeleteModal, setShowDeleteModal] = useState(null);

    useEffect(() => {
        loadViolators();
    }, [page, minViolations]);

    const loadViolators = async () => {
        try {
            setLoading(true);
            const result = await aiModerationAPI.getFrequentViolators(
                minViolations,
                page,
                20
            );
            setViolators(result.data);
            setTotal(result.total);
        } catch (error) {
            console.error("Error loading violators:", error);
        } finally {
            setLoading(false);
        }
    };
    const handleViewDetails = async (violator) => {
        try {
            const details = await aiModerationAPI.getUserViolations(
                violator.accountId
            );
            setSelectedUser(details);
        } catch (error) {
            alert("Lỗi khi tải chi tiết: " + error.message);
        }
    };

    const handleDeleteAccount = async (violator, reason) => {
        if (!reason || reason.trim().length < 10) {
            alert("Vui lòng nhập lý do xóa tài khoản (ít nhất 10 ký tự)");
            return;
        }

        if (
            !window.confirm(
                `Bạn có chắc chắn muốn XÓA VĨNH VIỄN tài khoản của ${violator.username}?\n\nHành động này KHÔNG THỂ HOÀN TÁC!`
            )
        ) {
            return;
        }

        try {
            await aiModerationAPI.deleteViolator(violator.accountId, reason);
            alert("✅ Đã xóa tài khoản và gửi email thông báo thành công!");
            setShowDeleteModal(null);
            loadViolators();
        } catch (error) {
            alert("❌ Lỗi: " + error.message);
        }
    };

    return (
        <div className="violators-tab">
            <div className="card">
                <div className="toolbar">
                    <div className="form-group">
                        <label>Số lần vi phạm tối thiểu:</label>
                        <select
                            value={minViolations}
                            onChange={(e) => {
                                setMinViolations(Number(e.target.value));
                                setPage(1);
                            }}
                            className="input"
                        >
                            <option value="3">3 lần</option>
                            <option value="5">5 lần</option>
                            <option value="10">10 lần</option>
                            <option value="20">20 lần</option>
                        </select>
                    </div>
                    <div className="total-count">
                        Tổng số: <strong>{total}</strong> người dùng
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="loading-container">
                    <div className="loading"></div>
                </div>
            ) : (
                <>
                    {" "}
                    <div className="violators-list">
                        {violators.map((violator) => (
                            <div
                                key={violator.accountId}
                                className="violator-card card"
                            >
                                <div className="violator-header">
                                    <div className="violator-info">
                                        <div className="violator-avatar">
                                            {violator.username
                                                ?.charAt(0)
                                                .toUpperCase() || "?"}
                                        </div>
                                        <div>
                                            <h4>
                                                @
                                                {violator.username || "Unknown"}
                                            </h4>
                                            <div className="violator-meta">
                                                {violator.fullName && (
                                                    <span>
                                                        {violator.fullName}
                                                    </span>
                                                )}
                                                <span>{violator.email}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div
                                        className={`risk-badge ${
                                            violator.accountStatus === "Locked"
                                                ? "danger"
                                                : "success"
                                        }`}
                                    >
                                        {violator.accountStatus}
                                    </div>
                                </div>

                                <div className="violator-stats">
                                    <div className="stat-item">
                                        <div className="stat-label">
                                            Vi phạm
                                        </div>
                                        <div className="stat-value danger">
                                            {violator.violationCount} lần
                                        </div>
                                    </div>
                                    <div className="stat-item">
                                        <div className="stat-label">
                                            Lần gần nhất
                                        </div>
                                        <div className="stat-value">
                                            {new Date(
                                                violator.latestViolation
                                            ).toLocaleDateString("vi-VN")}
                                        </div>
                                    </div>
                                    <div className="stat-item">
                                        <div className="stat-label">
                                            Đăng nhập
                                        </div>
                                        <div className="stat-value">
                                            {violator.lastLogin
                                                ? new Date(
                                                      violator.lastLogin
                                                  ).toLocaleDateString("vi-VN")
                                                : "Chưa"}
                                        </div>
                                    </div>
                                </div>

                                <div className="violation-tags">
                                    {(violator.toxicLabels || []).map(
                                        (type) => (
                                            <span
                                                key={type}
                                                className="violation-tag"
                                            >
                                                {getViolationTypeIcon(type)}{" "}
                                                {getViolationTypeName(type)}
                                            </span>
                                        )
                                    )}
                                </div>

                                <div className="violator-actions">
                                    <button
                                        onClick={() =>
                                            handleViewDetails(violator)
                                        }
                                        className="btn btn-primary"
                                    >
                                        👁 Xem chi tiết
                                    </button>
                                    <button
                                        onClick={() =>
                                            setShowDeleteModal(violator)
                                        }
                                        className="btn btn-danger"
                                        disabled={
                                            violator.accountStatus === "Locked"
                                        }
                                    >
                                        🗑 Xóa tài khoản
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                    {/* Pagination */}
                    <div className="card pagination">
                        <button
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className="btn btn-primary"
                        >
                            ← Trước
                        </button>
                        <span>Trang {page}</span>
                        <button
                            onClick={() => setPage((p) => p + 1)}
                            disabled={violators.length === 0}
                            className="btn btn-primary"
                        >
                            Sau →
                        </button>
                    </div>
                </>
            )}

            {/* User Details Modal */}
            {selectedUser && (
                <UserDetailsModal
                    user={selectedUser}
                    onClose={() => setSelectedUser(null)}
                />
            )}

            {/* Delete Account Modal */}
            {showDeleteModal && (
                <DeleteAccountModal
                    violator={showDeleteModal}
                    onClose={() => setShowDeleteModal(null)}
                    onConfirm={handleDeleteAccount}
                />
            )}
        </div>
    );
}

// ============= REPORTS TAB =============
function ReportsTab() {
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [filter, setFilter] = useState({
        type: "all",
        riskLevel: "all",
        toxicLabel: "all",
    });

    useEffect(() => {
        loadReports();
    }, [page, filter]);

    const loadReports = async () => {
        try {
            setLoading(true);
            const result = await aiModerationAPI.getViolationReports(
                filter.type,
                filter.riskLevel,
                filter.toxicLabel,
                page,
                20
            );
            setReports(result.reports || []);
            setTotal(result.totalCount || 0);
        } catch (error) {
            console.error("Error loading reports:", error);
        } finally {
            setLoading(false);
        }
    };
    return (
        <div className="reports-tab">
            <div className="card">
                <div className="toolbar">
                    <div className="form-group">
                        <label>Loại nội dung:</label>
                        <select
                            value={filter.type}
                            onChange={(e) => {
                                setFilter({ ...filter, type: e.target.value });
                                setPage(1);
                            }}
                            className="input"
                        >
                            <option value="all">Tất cả loại</option>
                            <option value="post">Bài đăng</option>
                            <option value="comment">Bình luận</option>
                        </select>
                    </div>

                    <div className="form-group">
                        <label>Loại vi phạm:</label>
                        <select
                            value={filter.toxicLabel}
                            onChange={(e) => {
                                setFilter({
                                    ...filter,
                                    toxicLabel: e.target.value,
                                });
                                setPage(1);
                            }}
                            className="input"
                        >
                            <option value="all">Tất cả loại</option>
                            <option value="violence">Bạo lực</option>
                            <option value="hate">Thù hận</option>
                            <option value="sexual">Nội dung nhạy cảm</option>
                            <option value="harassment">Quấy rối</option>
                            <option value="self-harm">Tự hại bản thân</option>
                        </select>
                    </div>

                    <div className="form-group">
                        <label>Mức độ:</label>
                        <select
                            value={filter.riskLevel}
                            onChange={(e) => {
                                setFilter({
                                    ...filter,
                                    riskLevel: e.target.value,
                                });
                                setPage(1);
                            }}
                            className="input"
                        >
                            <option value="all">Tất cả mức độ</option>
                            <option value="high">Nguy hiểm cao</option>
                            <option value="medium">Trung bình</option>
                            <option value="low">Thấp</option>
                        </select>
                    </div>

                    <div className="total-count">
                        Tổng số: <strong>{total}</strong> báo cáo
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="loading-container">
                    <div className="loading"></div>
                </div>
            ) : (
                <>
                    {" "}
                    <div className="reports-list">
                        {reports.map((report) => {
                            // Calculate risk level based on confidence
                            const getRiskLevel = (confidence) => {
                                if (confidence >= 0.8) return "high";
                                if (confidence >= 0.5) return "medium";
                                return "low";
                            };

                            const riskLevel = getRiskLevel(report.confidence);
                            const riskLabels = {
                                high: "Nguy hiểm cao",
                                medium: "Trung bình",
                                low: "Thấp",
                            };

                            return (
                                <div
                                    key={report.moderationId}
                                    className={`report-card card ${riskLevel}`}
                                >
                                    <div className="report-header">
                                        <div className="report-type">
                                            {report.contentType === "Post"
                                                ? "📝"
                                                : "💬"}{" "}
                                            {report.contentType.toUpperCase()}
                                        </div>
                                        <div
                                            className={`risk-badge ${riskLevel}`}
                                        >
                                            {riskLabels[riskLevel]}
                                        </div>
                                    </div>

                                    <div className="report-content">
                                        <div className="author-info">
                                            <strong>Tác giả:</strong>{" "}
                                            {report.fullName} (@{report.email})
                                        </div>
                                        <div className="content-info">
                                            <strong>ID:</strong>{" "}
                                            {report.contentId}
                                        </div>
                                    </div>

                                    <div className="report-details">
                                        <div className="detail-item">
                                            <span className="violation-tag">
                                                {getViolationTypeIcon(
                                                    report.toxicLabel
                                                )}{" "}
                                                {getViolationTypeName(
                                                    report.toxicLabel
                                                )}
                                            </span>
                                        </div>
                                        <div className="detail-item">
                                            <strong>Độ tin cậy:</strong>{" "}
                                            {(report.confidence * 100).toFixed(
                                                1
                                            )}
                                            %
                                        </div>
                                        <div className="detail-item">
                                            <strong>Thời gian:</strong>{" "}
                                            {new Date(
                                                report.checkedAt
                                            ).toLocaleString("vi-VN")}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    {/* Pagination */}
                    <div className="card pagination">
                        <button
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className="btn btn-primary"
                        >
                            ← Trước
                        </button>
                        <span>Trang {page}</span>
                        <button
                            onClick={() => setPage((p) => p + 1)}
                            disabled={reports.length === 0}
                            className="btn btn-primary"
                        >
                            Sau →
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}

// ============= USER DETAILS MODAL =============
function UserDetailsModal({ user, onClose }) {
    if (!user || !user.accountInfo) {
        return null;
    }

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div
                className="modal-content card large"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="modal-header">
                    <h3>Chi tiết lịch sử vi phạm</h3>
                    <button onClick={onClose} className="modal-close">
                        ×
                    </button>
                </div>

                <div className="modal-body">
                    {/* User Info */}
                    <div className="user-info-section">
                        <h4>Thông tin người dùng</h4>
                        <div className="info-grid">
                            <div className="info-item">
                                <strong>Username:</strong> @
                                {user.accountInfo.username}
                            </div>
                            <div className="info-item">
                                <strong>Họ tên:</strong>{" "}
                                {user.accountInfo.fullName}
                            </div>
                            <div className="info-item">
                                <strong>Email:</strong> {user.accountInfo.email}
                            </div>
                            <div className="info-item">
                                <strong>Trạng thái:</strong>{" "}
                                {user.accountInfo.isLocked
                                    ? "Đã khóa"
                                    : "Hoạt động"}
                            </div>
                        </div>
                    </div>

                    {/* Statistics */}
                    <div className="stats-section">
                        <h4>Thống kê vi phạm</h4>
                        <div className="stats-grid mini">
                            <div className="stat-card mini">
                                <div className="stat-label">
                                    Tổng số vi phạm
                                </div>
                                <div className="stat-value">
                                    {user.totalViolations}
                                </div>
                            </div>
                        </div>

                        <div className="violation-types-breakdown">
                            <strong>Phân loại vi phạm:</strong>
                            {(user.labelStatistics || []).map((item) => (
                                <span
                                    key={item.label}
                                    className="violation-tag"
                                >
                                    {getViolationTypeIcon(item.label)}{" "}
                                    {getViolationTypeName(item.label)} (
                                    {item.count})
                                </span>
                            ))}
                        </div>
                    </div>

                    {/* Violations List */}
                    <div className="violations-section">
                        <h4>
                            Danh sách vi phạm ({user.violations?.length || 0})
                        </h4>
                        <div className="violations-list-modal">
                            {(user.violations || [])
                                .slice(0, 10)
                                .map((violation) => (
                                    <div
                                        key={violation.moderationId}
                                        className="violation-item"
                                    >
                                        <div className="violation-meta">
                                            <span className="violation-type">
                                                {violation.contentType ===
                                                "Post"
                                                    ? "📝 Bài đăng"
                                                    : "💬 Bình luận"}
                                            </span>
                                            <span
                                                className={`risk-badge small ${
                                                    violation.status ===
                                                    "blocked"
                                                        ? "danger"
                                                        : "warning"
                                                }`}
                                            >
                                                {violation.status}
                                            </span>
                                            <span className="violation-date">
                                                {new Date(
                                                    violation.checkedAt
                                                ).toLocaleDateString("vi-VN")}
                                            </span>
                                        </div>
                                        <div className="violation-content">
                                            <span className="violation-tag small">
                                                {getViolationTypeIcon(
                                                    violation.toxicLabel
                                                )}{" "}
                                                {getViolationTypeName(
                                                    violation.toxicLabel
                                                )}
                                            </span>
                                            {violation.content && (
                                                <span className="violation-text">
                                                    "{violation.content}"
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ============= DELETE ACCOUNT MODAL =============
function DeleteAccountModal({ violator, onClose, onConfirm }) {
    const [reason, setReason] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await onConfirm(violator, reason);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div
                className="modal-content card"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="modal-header danger">
                    <h3>⚠️ Xóa tài khoản vi phạm</h3>
                    <button onClick={onClose} className="modal-close">
                        ×
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="modal-body">
                    <div className="warning-box">
                        <strong>CẢNH BÁO:</strong> Bạn sắp XÓA VĨNH VIỄN tài
                        khoản của:
                        <div className="user-highlight">
                            <strong>@{violator.username}</strong> (
                            {violator.email})
                        </div>
                        <ul>
                            <li>
                                ✉️ Hệ thống sẽ gửi email thông báo cho người
                                dùng
                            </li>
                            <li>🗑 Tất cả bài đăng, bình luận sẽ bị xóa</li>
                            <li>❌ Hành động này KHÔNG THỂ HOÀN TÁC</li>
                        </ul>
                    </div>

                    <div className="form-group">
                        <label>Lý do xóa tài khoản: *</label>
                        <textarea
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="Nhập lý do chi tiết (tối thiểu 10 ký tự). Lý do này sẽ được gửi trong email thông báo."
                            className="input"
                            rows={4}
                            required
                            minLength={10}
                        />
                    </div>

                    <div className="modal-actions">
                        <button
                            type="button"
                            onClick={onClose}
                            className="btn"
                            disabled={loading}
                        >
                            Hủy
                        </button>
                        <button
                            type="submit"
                            className="btn btn-danger"
                            disabled={loading}
                        >
                            {loading ? "Đang xử lý..." : "🗑 Xác nhận xóa"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ============= HELPER FUNCTIONS =============
function getViolationTypeIcon(label) {
    const icons = {
        toxic: "🤬",
        hate: "😡",
        violence: "⚔️",
        nsfw: "🔞",
        suicide: "💀",
        safe: "✅",
    };
    return icons[label] || "⚠️";
}

function getViolationTypeName(label) {
    const names = {
        toxic: "Ngôn từ độc hại",
        hate: "Phát ngôn kỳ thị",
        violence: "Bạo lực",
        nsfw: "Nội dung người lớn",
        suicide: "Tự hại",
        safe: "An toàn",
    };
    return names[label] || label;
}

function getRiskLevelLabel(level) {
    const labels = {
        high: "🔴 Nguy hiểm cao",
        medium: "🟡 Trung bình",
        low: "🟢 Thấp",
        minimal: "⚪ Tối thiểu",
    };
    return labels[level] || level;
}
