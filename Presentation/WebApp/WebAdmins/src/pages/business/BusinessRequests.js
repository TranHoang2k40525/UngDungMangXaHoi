import { useState, useEffect } from "react";
import { businessAPI } from "../../services/api";
import "./BusinessRequests.css";

export default function BusinessRequests() {
    const [requests, setRequests] = useState([]);
    const [allRequests, setAllRequests] = useState([]); // Store all data for client-side search
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [modalData, setModalData] = useState(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [stats, setStats] = useState({
        total: 0,
    });
    useEffect(() => {
        loadRequests();
        loadStats();
    }, [page]);

    // Client-side filtering when search term changes
    useEffect(() => {
        if (searchTerm.trim() === "") {
            setRequests(allRequests);
        } else {
            const filtered = allRequests.filter(
                (req) =>
                    req.businessName
                        ?.toLowerCase()
                        .includes(searchTerm.toLowerCase()) ||
                    req.ownerName
                        ?.toLowerCase()
                        .includes(searchTerm.toLowerCase()) ||
                    req.email
                        ?.toLowerCase()
                        .includes(searchTerm.toLowerCase()) ||
                    req.taxCode
                        ?.toLowerCase()
                        .includes(searchTerm.toLowerCase())
            );
            setRequests(filtered);
        }
    }, [searchTerm, allRequests]);
    const loadRequests = async () => {
        try {
            setLoading(true);
            const response = await businessAPI.getVerificationRequests(
                page,
                20,
                "all", // Load all statuses
                "" // No server-side search
            );

            if (response.success) {
                setAllRequests(response.data);
                setRequests(response.data);
                setTotalPages(response.totalPages);
                setTotalCount(response.totalCount);
            }
        } catch (error) {
            console.error("Error loading requests:", error);
            alert(
                "Lỗi khi tải danh sách yêu cầu: " +
                    (error.message || "Unknown error")
            );
        } finally {
            setLoading(false);
        }
    };
    const loadStats = async () => {
        try {
            const response = await businessAPI.getStats();
            if (response.success) {
                setStats({
                    total:
                        response.data.total ||
                        response.data.pending +
                            response.data.approved +
                            response.data.rejected,
                });
            }
        } catch (error) {
            console.error("Error loading stats:", error);
        }
    };
    const handleView = (request) => {
        setModalData({ type: "view", request });
    };

    const handleSearch = (e) => {
        setSearchTerm(e.target.value);
    };

    return (
        <div className="business-requests-page">
            {" "}
            <div className="page-header">
                <h1>🏢 Doanh nghiệp</h1>
                <p>
                    Quản lý và phê duyệt các yêu cầu xác thực tài khoản doanh
                    nghiệp
                </p>
            </div>{" "}
            <div className="stats-cards">
                <div className="stat-card total">
                    <h3>📊 Tổng số doanh nghiệp</h3>
                    <div className="stat-value">{stats.total || 0}</div>
                </div>
            </div>{" "}
            <div className="card">
                <div className="toolbar">
                    <input
                        type="search"
                        placeholder="Tìm kiếm theo tên, email..."
                        className="input search-input"
                        value={searchTerm}
                        onChange={handleSearch}
                    />
                </div>

                {loading ? (
                    <div className="loading-container">
                        <div className="loading"></div>
                    </div>
                ) : (
                    <>
                        {" "}
                        <table className="requests-table">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Tên doanh nghiệp</th>
                                    <th>Chủ sở hữu</th>
                                    <th>Loại hình</th>
                                    <th>Ngày gửi</th>
                                    <th>Hành động</th>
                                </tr>
                            </thead>
                            <tbody>
                                {requests.map((request) => (
                                    <tr key={request.id}>
                                        <td>#{request.id}</td>
                                        <td>
                                            <strong>
                                                {request.businessName}
                                            </strong>
                                            <div className="text-muted">
                                                {request.taxCode}
                                            </div>
                                        </td>
                                        <td>
                                            {request.ownerName}
                                            <div className="text-muted">
                                                {request.email}
                                            </div>
                                        </td>
                                        <td>{request.businessType}</td>{" "}
                                        <td>
                                            {new Date(
                                                request.submittedAt
                                            ).toLocaleDateString("vi-VN")}
                                        </td>
                                        <td className="actions-cell">
                                            <button
                                                onClick={() =>
                                                    handleView(request)
                                                }
                                                className="btn-link"
                                            >
                                                👁️ Xem
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>{" "}
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
                            <span>
                                Trang {page} / {totalPages} (Tổng: {totalCount})
                            </span>
                            <button
                                onClick={() => setPage((p) => p + 1)}
                                disabled={page >= totalPages}
                                className="btn btn-primary"
                            >
                                Sau →
                            </button>
                        </div>
                    </>
                )}
            </div>{" "}
            {modalData && (
                <RequestModal
                    data={modalData}
                    onClose={() => setModalData(null)}
                />
            )}
        </div>
    );
}

function RequestModal({ data, onClose }) {
    const { request } = data;

    // Calculate days remaining
    const calculateDaysRemaining = () => {
        if (!request.upgrade?.expiresAt) return null;
        const expiresAt = new Date(request.upgrade.expiresAt);
        const now = new Date();
        const diffTime = expiresAt - now;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    };

    const daysRemaining = calculateDaysRemaining();
    const isExpired = daysRemaining !== null && daysRemaining <= 0;
    const isExpiringSoon =
        daysRemaining !== null && daysRemaining > 0 && daysRemaining <= 30;

    // Get business status display
    const getBusinessStatus = () => {
        if (request.businessStatus === "active") {
            return { text: "✅ Đang hoạt động", className: "status-active" };
        } else if (request.businessStatus === "expired") {
            return { text: "⏰ Hết hạn", className: "status-expired" };
        } else if (request.businessStatus === "pending") {
            return { text: "⏳ Chờ xử lý", className: "status-pending" };
        } else if (request.businessStatus === "rejected") {
            return { text: "❌ Đã từ chối", className: "status-rejected" };
        }
        return { text: "❓ Không xác định", className: "status-unknown" };
    };

    const businessStatus = getBusinessStatus();

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div
                className="modal-content card"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="modal-header">
                    <h3>Chi tiết doanh nghiệp</h3>
                    <button onClick={onClose} className="close-btn">
                        ×
                    </button>
                </div>{" "}
                <div className="modal-body">
                    {/* Thông tin doanh nghiệp */}
                    <section className="modal-section">
                        <h4>🏢 Thông tin doanh nghiệp</h4>
                        <div className="info-grid">
                            <div className="info-item">
                                <label>Tên doanh nghiệp:</label>
                                <strong>{request.businessName}</strong>
                            </div>
                            <div className="info-item">
                                <label>Chủ sở hữu:</label>
                                <strong>
                                    {request.user?.fullName ||
                                        request.ownerName}
                                </strong>
                            </div>
                            <div className="info-item">
                                <label>Email:</label>
                                <strong>
                                    {request.user?.email || request.email}
                                </strong>
                            </div>
                            <div className="info-item">
                                <label>Điện thoại:</label>
                                <strong>
                                    {request.user?.phone ||
                                        request.phone ||
                                        "N/A"}
                                </strong>
                            </div>
                            <div className="info-item">
                                <label>Loại hình:</label>
                                <strong>{request.businessType}</strong>
                            </div>
                            <div className="info-item">
                                <label>Tình trạng:</label>
                                <span
                                    className={`status-badge ${businessStatus.className}`}
                                >
                                    {businessStatus.text}
                                </span>
                            </div>
                            <div className="info-item full-width">
                                <label>Địa chỉ:</label>
                                <p>{request.address}</p>
                            </div>
                            <div className="info-item full-width">
                                <label>Website:</label>
                                {request.website &&
                                request.website !== "N/A" ? (
                                    <a
                                        href={request.website}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        {request.website}
                                    </a>
                                ) : (
                                    <span className="text-muted">
                                        Chưa cập nhật
                                    </span>
                                )}
                            </div>
                            <div className="info-item full-width">
                                <label>Mô tả:</label>
                                <p>{request.description}</p>
                            </div>
                        </div>
                    </section>

                    {/* Thời hạn nâng quyền */}
                    <section className="modal-section">
                        <h4>⏰ Thời hạn nâng quyền</h4>
                        <div className="info-grid">
                            <div className="info-item">
                                <label>Ngày bắt đầu:</label>
                                <span>
                                    {request.upgrade?.verifiedAt ||
                                    request.upgradedAt ? (
                                        new Date(
                                            request.upgrade?.verifiedAt ||
                                                request.upgradedAt
                                        ).toLocaleString("vi-VN")
                                    ) : (
                                        <span className="text-muted">
                                            Chưa nâng quyền
                                        </span>
                                    )}
                                </span>
                            </div>
                            <div className="info-item">
                                <label>Ngày kết thúc:</label>
                                <span>
                                    {request.upgrade?.expiresAt ? (
                                        new Date(
                                            request.upgrade.expiresAt
                                        ).toLocaleString("vi-VN")
                                    ) : (
                                        <span className="text-muted">
                                            Chưa có
                                        </span>
                                    )}
                                </span>
                            </div>
                            {daysRemaining !== null && (
                                <div className="info-item full-width">
                                    <label>Thời gian còn lại:</label>
                                    <div style={{ marginTop: "10px" }}>
                                        {isExpired ? (
                                            <div className="countdown-expired">
                                                <span
                                                    style={{
                                                        fontSize: "24px",
                                                        color: "#ef4444",
                                                    }}
                                                >
                                                    ⏰ Đã hết hạn{" "}
                                                    {Math.abs(daysRemaining)}{" "}
                                                    ngày trước
                                                </span>
                                            </div>
                                        ) : (
                                            <div
                                                className={`countdown-active ${
                                                    isExpiringSoon
                                                        ? "expiring-soon"
                                                        : ""
                                                }`}
                                            >
                                                <span
                                                    style={{
                                                        fontSize: "32px",
                                                        fontWeight: "bold",
                                                        color: isExpiringSoon
                                                            ? "#f59e0b"
                                                            : "#10b981",
                                                    }}
                                                >
                                                    {daysRemaining}
                                                </span>
                                                <span
                                                    style={{
                                                        fontSize: "18px",
                                                        marginLeft: "10px",
                                                    }}
                                                >
                                                    ngày
                                                </span>
                                                {isExpiringSoon && (
                                                    <div
                                                        style={{
                                                            marginTop: "8px",
                                                            color: "#f59e0b",
                                                            fontSize: "14px",
                                                        }}
                                                    >
                                                        ⚠️ Sắp hết hạn!
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                            <div className="info-item">
                                <label>Trạng thái:</label>
                                <span>
                                    {request.upgrade?.isActive ? (
                                        <span
                                            style={{
                                                color: "#10b981",
                                                fontWeight: "bold",
                                            }}
                                        >
                                            ✅ Đang hoạt động
                                        </span>
                                    ) : request.upgrade?.isExpired ? (
                                        <span
                                            style={{
                                                color: "#ef4444",
                                                fontWeight: "bold",
                                            }}
                                        >
                                            ❌ Đã hết hạn
                                        </span>
                                    ) : (
                                        <span className="text-muted">
                                            Chưa kích hoạt
                                        </span>
                                    )}
                                </span>
                            </div>{" "}
                        </div>
                    </section>
                </div>
                <div className="modal-footer">
                    <button onClick={onClose} className="btn btn-secondary">
                        Đóng
                    </button>
                </div>
            </div>
        </div>
    );
}
