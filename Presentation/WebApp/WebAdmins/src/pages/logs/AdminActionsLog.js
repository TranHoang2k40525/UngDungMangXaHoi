import { useState, useEffect } from "react";
import { activityLogsAPI } from "../../services/api";
import EntityDetailsModal from "../../components/EntityDetailsModal";
import "./AdminActionsLog.css";

export default function AdminActionsLog() {
    const [logs, setLogs] = useState([]);
    const [stats, setStats] = useState(null);
    const [activeAdmins, setActiveAdmins] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState("all");
    const [dateFilter, setDateFilter] = useState("7");
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedAdmin, setSelectedAdmin] = useState("");
    const [showExportDialog, setShowExportDialog] = useState(false);

    // Advanced filter states
    const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
    const [customDateRange, setCustomDateRange] = useState({
        start: "",
        end: "",
    });
    const [statusFilter, setStatusFilter] = useState("all"); // 🔥 Modal state
    const [showModal, setShowModal] = useState(false);
    const [selectedEntity, setSelectedEntity] = useState(null);
    useEffect(() => {
        loadLogs();
        loadStats();
        loadActiveAdmins();
    }, [page, filter, dateFilter, selectedAdmin]);

    useEffect(() => {
        // Reset page về 1 khi thay đổi filter
        if (page !== 1) {
            setPage(1);
        } else {
            loadLogs();
        }
    }, [searchTerm]);
    const loadLogs = async () => {
        try {
            setLoading(true);

            // ✅ Gọi API thật từ backend
            const result = await activityLogsAPI.getActivityLogs(
                page,
                20,
                filter,
                selectedAdmin,
                dateFilter,
                searchTerm
            );

            // Backend trả về: { logs, total, page, pageSize, totalPages }
            setLogs(result.logs || result.Logs || result.data || []);
            setTotalPages(
                result.totalPages ||
                    result.TotalPages ||
                    Math.ceil((result.total || result.Total || 0) / 20)
            );
        } catch (error) {
            console.error("Error loading logs:", error);
            setLogs([]);
            setTotalPages(1);
        } finally {
            setLoading(false);
        }
    };
    const loadStats = async () => {
        try {
            const result = await activityLogsAPI.getActivityStats(
                parseInt(dateFilter)
            );
            // Backend trả về: { totalActions, activeAdmins, last24Hours, averagePerDay }
            setStats({
                totalActions: result.totalActions || result.TotalActions || 0,
                activeAdmins: result.activeAdmins || result.ActiveAdmins || 0,
                last24Hours: result.last24Hours || result.Last24Hours || 0,
                averagePerDay:
                    result.averagePerDay || result.AveragePerDay || 0,
            });
        } catch (error) {
            console.error("Error loading stats:", error);
            setStats({
                totalActions: 0,
                activeAdmins: 0,
                last24Hours: 0,
                averagePerDay: 0,
            });
        }
    };
    const loadActiveAdmins = async () => {
        try {
            const result = await activityLogsAPI.getActiveAdmins(
                parseInt(dateFilter)
            );
            // Backend trả về: { admins: [...] }
            setActiveAdmins(result.admins || result.Admins || result || []);
        } catch (error) {
            console.error("Error loading active admins:", error);
            setActiveAdmins([]);
        }
    };

    const handleExport = async (format) => {
        try {
            const endDate = new Date();
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - parseInt(dateFilter));

            const blob = await activityLogsAPI.exportActivityLogs(
                startDate,
                endDate,
                format
            );

            // Tạo download link
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `admin-activity-logs-${
                startDate.toISOString().split("T")[0]
            }-${endDate.toISOString().split("T")[0]}.${format}`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            setShowExportDialog(false);
        } catch (error) {
            console.error("Error exporting logs:", error);
            alert("Xuất báo cáo thất bại. Vui lòng thử lại.");
        }
    };

    const filteredLogs = logs.filter((log) => {
        // Filter theo loại action
        if (filter !== "all" && log.entityType !== filter) return false;

        // Filter theo admin được chọn
        if (selectedAdmin && log.adminEmail !== selectedAdmin) return false;

        // Filter theo status
        if (statusFilter !== "all" && log.status !== statusFilter) return false;

        // Filter theo custom date range
        if (
            dateFilter === "custom" &&
            customDateRange.start &&
            customDateRange.end
        ) {
            const logDate = new Date(log.timestamp);
            const startDate = new Date(customDateRange.start);
            const endDate = new Date(customDateRange.end);
            endDate.setHours(23, 59, 59, 999); // Include the entire end date

            if (logDate < startDate || logDate > endDate) return false;
        }

        // Filter theo search term (tìm kiếm theo action, admin name, email, entity name)
        if (searchTerm) {
            const search = searchTerm.toLowerCase();
            const matchAction = log.action.toLowerCase().includes(search);
            const matchAdmin = log.adminName.toLowerCase().includes(search);
            const matchEmail = log.adminEmail.toLowerCase().includes(search);
            const matchEntity = log.entityName?.toLowerCase().includes(search);
            const matchDetails = log.details?.toLowerCase().includes(search);

            if (
                !matchAction &&
                !matchAdmin &&
                !matchEmail &&
                !matchEntity &&
                !matchDetails
            ) {
                return false;
            }
        }

        return true;
    });

    const getActionIcon = (entityType) => {
        const icons = {
            user: "👤",
            post: "📝",
            business: "🏢",
            comment: "💬",
            report: "⚠️",
            system: "⚙️",
        };
        return icons[entityType] || "📋";
    };

    const getStatusColor = (status) => {
        const colors = {
            success: "#10B981",
            warning: "#F59E0B",
            error: "#EF4444",
            info: "#3B82F6",
        };
        return colors[status] || "#6B7280";
    };

    const getStatusLabel = (status) => {
        const labels = {
            success: "Thành công",
            warning: "Cảnh báo",
            error: "Lỗi",
            info: "Thông tin",
        };
        return labels[status] || "Không xác định";
    };
    return (
        <div className="admin-actions-log-page">
            <div className="page-header">
                <div className="header-content">
                    <div>
                        <h1>📜 Nhật ký Hoạt động Admin</h1>
                        <p>
                            Theo dõi tất cả các hành động của quản trị viên
                            trong hệ thống
                        </p>
                    </div>{" "}
                    <div className="header-actions">
                        <button
                            className="btn btn-secondary"
                            onClick={() => setShowExportDialog(true)}
                        >
                            📥 Xuất báo cáo
                        </button>
                    </div>
                </div>
            </div>
            <div className="stats-row">
                <div className="stat-card">
                    <div
                        className="stat-icon"
                        style={{ background: "#EEF2FF" }}
                    >
                        📊
                    </div>
                    <div className="stat-info">
                        <div className="stat-label">Tổng hành động</div>
                        <div className="stat-value">
                            {stats?.totalActions || logs.length}
                        </div>
                    </div>
                </div>
                <div className="stat-card">
                    <div
                        className="stat-icon"
                        style={{ background: "#F0FDF4" }}
                    >
                        👥
                    </div>
                    <div className="stat-info">
                        <div className="stat-label">Admin hoạt động</div>
                        <div className="stat-value">
                            {stats?.activeAdmins || activeAdmins.length}
                        </div>
                    </div>
                </div>
                <div className="stat-card">
                    <div
                        className="stat-icon"
                        style={{ background: "#FEF3C7" }}
                    >
                        🕒
                    </div>
                    <div className="stat-info">
                        <div className="stat-label">24 giờ qua</div>
                        <div className="stat-value">
                            {stats?.last24Hours ||
                                logs.filter(
                                    (l) =>
                                        Date.now() - new Date(l.timestamp) <
                                        86400000
                                ).length}
                        </div>
                    </div>
                </div>
                <div className="stat-card">
                    <div
                        className="stat-icon"
                        style={{ background: "#FCE7F3" }}
                    >
                        📈
                    </div>
                    <div className="stat-info">
                        <div className="stat-label">Trung bình/ngày</div>
                        <div className="stat-value">
                            {stats?.averagePerDay ||
                                Math.round(logs.length / parseInt(dateFilter))}
                        </div>
                    </div>
                </div>
            </div>
            {/* Admin Filter Section */}
            {activeAdmins.length > 0 && (
                <div className="card admin-filter-section">
                    <h3>👥 Lọc theo Admin</h3>
                    <div className="admin-chips">
                        <button
                            className={`admin-chip ${
                                selectedAdmin === "" ? "active" : ""
                            }`}
                            onClick={() => setSelectedAdmin("")}
                        >
                            Tất cả
                        </button>
                        {activeAdmins.map((admin) => (
                            <button
                                key={admin.email}
                                className={`admin-chip ${
                                    selectedAdmin === admin.email
                                        ? "active"
                                        : ""
                                }`}
                                onClick={() => setSelectedAdmin(admin.email)}
                            >
                                {admin.name}
                                <span className="admin-chip-count">
                                    {admin.actionCount}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>
            )}{" "}
            <div className="card">
                <div className="filters-toolbar">
                    {/* Search Input */}
                    <input
                        type="search"
                        placeholder="🔍 Tìm kiếm theo hành động, admin, email..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="input search-input"
                    />

                    {/* Entity Type Filter */}
                    <select
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        className="input"
                        title="Lọc theo loại"
                    >
                        <option value="all">📋 Tất cả loại</option>
                        <option value="user">👤 Người dùng</option>
                        <option value="post">📝 Bài đăng</option>
                        <option value="business">🏢 Doanh nghiệp</option>
                        <option value="comment">💬 Bình luận</option>
                        <option value="report">⚠️ Báo cáo</option>
                        <option value="system">⚙️ Hệ thống</option>
                    </select>

                    {/* Admin Filter Dropdown */}
                    <select
                        value={selectedAdmin}
                        onChange={(e) => setSelectedAdmin(e.target.value)}
                        className="input"
                        title="Lọc theo admin"
                    >
                        <option value="">👥 Tất cả admin</option>
                        {activeAdmins.map((admin) => (
                            <option key={admin.email} value={admin.email}>
                                {admin.name} ({admin.actionCount})
                            </option>
                        ))}
                    </select>

                    {/* Date Range Filter */}
                    <select
                        value={dateFilter}
                        onChange={(e) => {
                            setDateFilter(e.target.value);
                            if (e.target.value !== "custom") {
                                setCustomDateRange({ start: "", end: "" });
                            }
                        }}
                        className="input"
                        title="Lọc theo thời gian"
                    >
                        <option value="1">📅 24 giờ qua</option>
                        <option value="7">📅 7 ngày qua</option>
                        <option value="30">📅 30 ngày qua</option>
                        <option value="90">📅 90 ngày qua</option>
                        <option value="custom">📅 Tùy chỉnh...</option>
                    </select>

                    {/* Advanced Filters Toggle */}
                    <button
                        className="btn btn-secondary"
                        onClick={() =>
                            setShowAdvancedFilters(!showAdvancedFilters)
                        }
                        title="Bộ lọc nâng cao"
                    >
                        {showAdvancedFilters ? "🔽" : "⚙️"} Nâng cao
                    </button>

                    {/* Clear Filters Button */}
                    {(searchTerm ||
                        filter !== "all" ||
                        selectedAdmin ||
                        statusFilter !== "all") && (
                        <button
                            className="btn btn-secondary"
                            onClick={() => {
                                setSearchTerm("");
                                setFilter("all");
                                setSelectedAdmin("");
                                setStatusFilter("all");
                                setDateFilter("7");
                                setCustomDateRange({ start: "", end: "" });
                                setPage(1);
                            }}
                            title="Xóa tất cả bộ lọc"
                        >
                            🔄 Xóa bộ lọc
                        </button>
                    )}
                </div>

                {/* Advanced Filters Panel */}
                {showAdvancedFilters && (
                    <div className="advanced-filters-panel">
                        <div className="advanced-filters-grid">
                            {/* Status Filter */}
                            <div className="filter-group">
                                <label>Trạng thái:</label>
                                <select
                                    value={statusFilter}
                                    onChange={(e) =>
                                        setStatusFilter(e.target.value)
                                    }
                                    className="input"
                                >
                                    <option value="all">Tất cả</option>
                                    <option value="success">
                                        ✅ Thành công
                                    </option>
                                    <option value="warning">⚠️ Cảnh báo</option>
                                    <option value="error">❌ Lỗi</option>
                                    <option value="info">ℹ️ Thông tin</option>
                                </select>
                            </div>

                            {/* Custom Date Range */}
                            {dateFilter === "custom" && (
                                <>
                                    <div className="filter-group">
                                        <label>Từ ngày:</label>
                                        <input
                                            type="date"
                                            value={customDateRange.start}
                                            onChange={(e) =>
                                                setCustomDateRange({
                                                    ...customDateRange,
                                                    start: e.target.value,
                                                })
                                            }
                                            className="input"
                                            max={
                                                new Date()
                                                    .toISOString()
                                                    .split("T")[0]
                                            }
                                        />
                                    </div>
                                    <div className="filter-group">
                                        <label>Đến ngày:</label>
                                        <input
                                            type="date"
                                            value={customDateRange.end}
                                            onChange={(e) =>
                                                setCustomDateRange({
                                                    ...customDateRange,
                                                    end: e.target.value,
                                                })
                                            }
                                            className="input"
                                            max={
                                                new Date()
                                                    .toISOString()
                                                    .split("T")[0]
                                            }
                                        />
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Quick Filter Chips */}
                        <div className="quick-filters">
                            <span className="quick-filter-label">
                                🚀 Quick Filters:
                            </span>
                            <button
                                className={`quick-filter-chip ${
                                    filter === "user" && statusFilter === "all"
                                        ? "active"
                                        : ""
                                }`}
                                onClick={() => {
                                    setFilter("user");
                                    setStatusFilter("all");
                                }}
                            >
                                👤 User Actions
                            </button>
                            <button
                                className={`quick-filter-chip ${
                                    filter === "post" && statusFilter === "all"
                                        ? "active"
                                        : ""
                                }`}
                                onClick={() => {
                                    setFilter("post");
                                    setStatusFilter("all");
                                }}
                            >
                                📝 Post Actions
                            </button>
                            <button
                                className={`quick-filter-chip ${
                                    statusFilter === "error" ? "active" : ""
                                }`}
                                onClick={() => {
                                    setStatusFilter("error");
                                    setFilter("all");
                                }}
                            >
                                ❌ Errors Only
                            </button>
                            <button
                                className={`quick-filter-chip ${
                                    dateFilter === "1" ? "active" : ""
                                }`}
                                onClick={() => {
                                    setDateFilter("1");
                                    setCustomDateRange({ start: "", end: "" });
                                }}
                            >
                                🕐 Today
                            </button>
                        </div>
                    </div>
                )}

                <div className="results-info">
                    Hiển thị <strong>{filteredLogs.length}</strong> kết quả
                    {(searchTerm ||
                        filter !== "all" ||
                        selectedAdmin ||
                        statusFilter !== "all") && (
                        <span>
                            {" "}
                            (đã lọc từ <strong>{logs.length}</strong> bản ghi)
                        </span>
                    )}
                    {selectedAdmin && (
                        <span className="filter-badge">
                            👤 Admin:{" "}
                            {activeAdmins.find((a) => a.email === selectedAdmin)
                                ?.name || selectedAdmin}
                        </span>
                    )}
                    {filter !== "all" && (
                        <span className="filter-badge">📋 Loại: {filter}</span>
                    )}
                </div>

                {loading ? (
                    <div className="loading-container">
                        <div className="loading"></div>
                        <p>Đang tải nhật ký hoạt động...</p>
                    </div>
                ) : (
                    <>
                        {" "}
                        <div className="logs-list">
                            {" "}
                            {filteredLogs.map((log, index) => {
                                // ✅ Fix: Ép về boolean rõ ràng để tránh null
                                const isClickable = Boolean(
                                    log.entityId &&
                                        log.entityType &&
                                        log.entityType !== "system"
                                );

                                // 🔍 DEBUG: Log để kiểm tra
                                if (index === 0) {
                                    console.log("🔍 First log item:", {
                                        entityId: log.entityId,
                                        entityType: log.entityType,
                                        entityName: log.entityName,
                                        isClickable: isClickable,
                                        hasEntityId: !!log.entityId,
                                        typeOfIsClickable: typeof isClickable,
                                    });
                                }

                                return (
                                    <div
                                        key={log.id}
                                        className={`log-item ${
                                            isClickable ? "clickable" : ""
                                        }`}
                                        onClick={() => {
                                            if (isClickable) {
                                                setSelectedEntity({
                                                    type: log.entityType,
                                                    id: log.entityId,
                                                    name: log.entityName,
                                                });
                                                setShowModal(true);
                                            }
                                        }}
                                    >
                                        <div
                                            className="log-icon"
                                            style={{
                                                background: `${getStatusColor(
                                                    log.status
                                                )}20`,
                                            }}
                                        >
                                            {getActionIcon(log.entityType)}
                                        </div>
                                        <div className="log-content">
                                            <div className="log-header">
                                                <strong>{log.adminName}</strong>
                                                <span className="log-action">
                                                    {log.action}{" "}
                                                </span>
                                                <span className="log-entity">
                                                    {log.entityName}
                                                    {isClickable && (
                                                        <span
                                                            className="clickable-hint"
                                                            title="Click để xem chi tiết"
                                                        >
                                                            🔍
                                                        </span>
                                                    )}
                                                </span>
                                            </div>

                                            <div className="log-details">
                                                {log.details}
                                            </div>

                                            <div className="log-meta">
                                                <span title="Email admin">
                                                    📧 {log.adminEmail}
                                                </span>
                                                <span title="Địa chỉ IP">
                                                    🌐 {log.ipAddress}
                                                </span>
                                                <span title="Thời gian">
                                                    🕒{" "}
                                                    {formatTimestamp(
                                                        log.timestamp
                                                    )}
                                                </span>
                                                <span
                                                    className="log-status-badge"
                                                    style={{
                                                        background: `${getStatusColor(
                                                            log.status
                                                        )}20`,
                                                        color: getStatusColor(
                                                            log.status
                                                        ),
                                                        border: `1px solid ${getStatusColor(
                                                            log.status
                                                        )}40`,
                                                    }}
                                                >
                                                    {getStatusLabel(log.status)}
                                                </span>
                                            </div>
                                        </div>{" "}
                                        <div
                                            className="log-status-indicator"
                                            style={{
                                                background: getStatusColor(
                                                    log.status
                                                ),
                                            }}
                                            title={getStatusLabel(log.status)}
                                        />
                                    </div>
                                );
                            })}
                            {filteredLogs.length === 0 && (
                                <div className="empty-state">
                                    <div className="empty-icon">🔍</div>
                                    <h3>Không tìm thấy kết quả</h3>
                                    <p>
                                        Thử thay đổi bộ lọc hoặc tìm kiếm khác
                                    </p>
                                    {(searchTerm ||
                                        filter !== "all" ||
                                        selectedAdmin) && (
                                        <button
                                            className="btn btn-primary"
                                            onClick={() => {
                                                setSearchTerm("");
                                                setFilter("all");
                                                setSelectedAdmin("");
                                                setPage(1);
                                            }}
                                        >
                                            🔄 Xóa tất cả bộ lọc
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                        {filteredLogs.length > 0 && (
                            <div className="pagination">
                                <button
                                    onClick={() =>
                                        setPage((p) => Math.max(1, p - 1))
                                    }
                                    disabled={page === 1}
                                    className="btn btn-primary"
                                >
                                    ← Trước
                                </button>
                                <span className="pagination-info">
                                    Trang <strong>{page}</strong> /{" "}
                                    <strong>{totalPages}</strong>
                                </span>
                                <button
                                    onClick={() =>
                                        setPage((p) =>
                                            Math.min(totalPages, p + 1)
                                        )
                                    }
                                    disabled={page >= totalPages}
                                    className="btn btn-primary"
                                >
                                    Sau →
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>
            {/* Export Dialog */}
            {showExportDialog && (
                <div
                    className="modal-overlay"
                    onClick={() => setShowExportDialog(false)}
                >
                    <div
                        className="modal-content"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="modal-header">
                            <h3>📥 Xuất báo cáo nhật ký hoạt động</h3>
                            <button
                                className="modal-close"
                                onClick={() => setShowExportDialog(false)}
                            >
                                ×
                            </button>
                        </div>
                        <div className="modal-body">
                            <p>Chọn định dạng file để xuất báo cáo:</p>
                            <div className="export-options">
                                <button
                                    className="export-option"
                                    onClick={() => handleExport("csv")}
                                >
                                    <span className="export-icon">📊</span>
                                    <strong>CSV</strong>
                                    <small>Phù hợp với Excel</small>
                                </button>
                                <button
                                    className="export-option"
                                    onClick={() => handleExport("json")}
                                >
                                    <span className="export-icon">📄</span>
                                    <strong>JSON</strong>
                                    <small>Dữ liệu có cấu trúc</small>
                                </button>
                                <button
                                    className="export-option"
                                    onClick={() => handleExport("pdf")}
                                >
                                    <span className="export-icon">📕</span>
                                    <strong>PDF</strong>
                                    <small>Báo cáo chi tiết</small>
                                </button>
                            </div>
                            <div className="export-info">
                                <p>
                                    📅 Khoảng thời gian:{" "}
                                    <strong>{dateFilter} ngày qua</strong>
                                </p>
                                <p>
                                    📊 Tổng số bản ghi:{" "}
                                    <strong>{filteredLogs.length}</strong>
                                </p>
                            </div>
                        </div>
                    </div>{" "}
                </div>
            )}
            {/* 🔥 NEW: Entity Details Modal */}
            {showModal && selectedEntity && (
                <EntityDetailsModal
                    entityType={selectedEntity.type}
                    entityId={selectedEntity.id}
                    entityName={selectedEntity.name}
                    onClose={() => {
                        setShowModal(false);
                        setSelectedEntity(null);
                    }}
                />
            )}
        </div>
    );
}

function formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Vừa xong";
    if (diffMins < 60) return `${diffMins} phút trước`;
    if (diffHours < 24) return `${diffHours} giờ trước`;
    if (diffDays < 7) return `${diffDays} ngày trước`;

    return date.toLocaleDateString("vi-VN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
    });
}
