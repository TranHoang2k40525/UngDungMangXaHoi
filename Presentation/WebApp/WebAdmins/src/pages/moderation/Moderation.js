import { useState, useEffect } from "react";
import { moderationAPI } from "../../services/api.js";
import "./Moderation.css";

export default function Moderation() {
    const [content, setContent] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState("post"); // 'post' or 'comment'
    const [status, setStatus] = useState("approved");
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [modalData, setModalData] = useState(null);

    useEffect(() => {
        loadContent();
    }, [page, filter, status]);

    const loadContent = async () => {
        try {
            setLoading(true);
            const result = await moderationAPI.getPendingContent(
                filter,
                status,
                page,
                20
            );
            console.log("📋 Content loaded:", result);
            setContent(result.data || []);
            setTotalPages(result.totalPages || 1);
        } catch (error) {
            console.error("❌ Error loading content:", error);
            alert("Lỗi: " + (error.response?.data?.message || error.message));
        } finally {
            setLoading(false);
        }
    };
    const handleApprove = async (id) => {
        if (!window.confirm("Xác nhận duyệt nội dung này?")) return;

        try {
            await moderationAPI.approveContent(id);
            alert("Đã duyệt nội dung thành công");
            loadContent();
        } catch (error) {
            alert("Lỗi: " + (error.response?.data?.message || error.message));
        }
    };

    const handleReject = (item) => {
        setModalData({ type: "reject", item });
    };

    const handleDelete = (item) => {
        setModalData({ type: "delete", item });
    };

    const handleViewDetail = (item) => {
        setModalData({ type: "detail", item });
    };
    const confirmReject = async (reason) => {
        if (!reason.trim()) {
            alert("Vui lòng nhập lý do từ chối");
            return;
        }

        try {
            await moderationAPI.rejectContent(modalData.item.id, reason);
            alert("Đã từ chối nội dung");
            setModalData(null);
            loadContent();
        } catch (error) {
            alert("Lỗi: " + (error.response?.data?.message || error.message));
        }
    };

    const confirmDelete = async () => {
        try {
            await moderationAPI.deleteContent(modalData.item.id);
            alert("Đã xóa nội dung");
            setModalData(null);
            loadContent();
        } catch (error) {
            alert("Lỗi: " + (error.response?.data?.message || error.message));
        }
    };

    return (
        <div className="moderation-page">
            <div className="page-header">
                <h1>Kiểm duyệt Nội dung</h1>
                <p>Quản lý và kiểm duyệt bài đăng, bình luận</p>
            </div>{" "}
            <div className="card">
                <div className="moderation-toolbar">
                    <select
                        value={filter}
                        onChange={(e) => {
                            setFilter(e.target.value);
                            setPage(1);
                        }}
                        className="input"
                    >
                        <option value="post">Bài đăng</option>
                        <option value="comment">Bình luận</option>
                    </select>

                    <select
                        value={status}
                        onChange={(e) => {
                            setStatus(e.target.value);
                            setPage(1);
                        }}
                        className="input"
                    >
                        <option value="approved">Đã duyệt</option>
                        <option value="blocked">Đã từ chối</option>
                    </select>
                </div>

                {loading ? (
                    <div className="loading-container">
                        <div className="loading"></div>
                    </div>
                ) : (
                    <>
                        {content.length === 0 ? (
                            <div
                                className="empty-state"
                                style={{
                                    textAlign: "center",
                                    padding: "40px",
                                    color: "#6b7280",
                                }}
                            >
                                <p
                                    style={{
                                        fontSize: "24px",
                                        marginBottom: "10px",
                                    }}
                                >
                                    📭
                                </p>
                                <p>
                                    Không có nội dung nào{" "}
                                    {status === "approved"
                                        ? "đã duyệt"
                                        : "bị từ chối"}
                                </p>
                            </div>
                        ) : (
                            <>
                                <div className="content-list">
                                    {content.map((item) => (
                                        <div
                                            key={item.id}
                                            className="content-card card"
                                        >
                                            <div className="content-header">
                                                <div className="author-info">
                                                    <img
                                                        src={`https://ui-avatars.com/api/?name=${item.author}&background=6366F1&color=fff`}
                                                        alt={item.author}
                                                        className="avatar"
                                                    />
                                                    <div>
                                                        <div className="author-name">
                                                            @{item.author}
                                                        </div>
                                                        <div
                                                            className="author-full-name"
                                                            style={{
                                                                fontSize:
                                                                    "12px",
                                                                color: "#6b7280",
                                                            }}
                                                        >
                                                            {item.fullName}
                                                        </div>
                                                        <div className="content-date">
                                                            {item.createdAt
                                                                ? new Date(
                                                                      item.createdAt
                                                                  ).toLocaleString(
                                                                      "vi-VN"
                                                                  )
                                                                : "N/A"}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div
                                                    className="badges"
                                                    style={{
                                                        display: "flex",
                                                        gap: "8px",
                                                        flexDirection: "column",
                                                        alignItems: "flex-end",
                                                    }}
                                                >
                                                    {item.riskLevel && (
                                                        <span
                                                            className={`risk-badge risk-${item.riskLevel}`}
                                                            style={{
                                                                padding:
                                                                    "4px 12px",
                                                                borderRadius:
                                                                    "12px",
                                                                fontSize:
                                                                    "12px",
                                                                fontWeight:
                                                                    "600",
                                                                backgroundColor:
                                                                    item.riskLevel ===
                                                                    "high"
                                                                        ? "#fee2e2"
                                                                        : item.riskLevel ===
                                                                          "medium"
                                                                        ? "#fef3c7"
                                                                        : "#d1fae5",
                                                                color:
                                                                    item.riskLevel ===
                                                                    "high"
                                                                        ? "#991b1b"
                                                                        : item.riskLevel ===
                                                                          "medium"
                                                                        ? "#92400e"
                                                                        : "#065f46",
                                                            }}
                                                        >
                                                            {item.riskLevel ===
                                                            "high"
                                                                ? "🔴 Nguy hiểm cao"
                                                                : item.riskLevel ===
                                                                  "medium"
                                                                ? "🟡 Trung bình"
                                                                : "🟢 Thấp"}
                                                        </span>
                                                    )}
                                                    {item.toxicLabel && (
                                                        <span
                                                            className="toxic-label"
                                                            style={{
                                                                padding:
                                                                    "4px 12px",
                                                                borderRadius:
                                                                    "12px",
                                                                fontSize:
                                                                    "11px",
                                                                backgroundColor:
                                                                    "#ede9fe",
                                                                color: "#5b21b6",
                                                            }}
                                                        >
                                                            {item.toxicLabel}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            <div
                                                className="content-type-badge"
                                                style={{
                                                    display: "inline-block",
                                                    padding: "4px 12px",
                                                    borderRadius: "12px",
                                                    fontSize: "12px",
                                                    marginBottom: "12px",
                                                    backgroundColor:
                                                        item.contentType ===
                                                        "Post"
                                                            ? "#dbeafe"
                                                            : "#fce7f3",
                                                    color:
                                                        item.contentType ===
                                                        "Post"
                                                            ? "#1e40af"
                                                            : "#9f1239",
                                                }}
                                            >
                                                {item.contentType === "Post"
                                                    ? "📝 Bài đăng"
                                                    : "💬 Bình luận"}
                                            </div>

                                            <div className="content-body">
                                                {item.content ? (
                                                    <>
                                                        {item.content.substring(
                                                            0,
                                                            300
                                                        )}
                                                        {item.content.length >
                                                            300 && "..."}
                                                    </>
                                                ) : (
                                                    <em
                                                        style={{
                                                            color: "#9ca3af",
                                                        }}
                                                    >
                                                        [Nội dung đã bị xóa]
                                                    </em>
                                                )}
                                            </div>

                                            <div
                                                className="content-meta"
                                                style={{
                                                    marginTop: "12px",
                                                    padding: "8px",
                                                    backgroundColor: "#f9fafb",
                                                    borderRadius: "6px",
                                                    fontSize: "13px",
                                                    color: "#6b7280",
                                                }}
                                            >
                                                <span>
                                                    🤖 AI Confidence:{" "}
                                                    {(
                                                        item.aiConfidence * 100
                                                    ).toFixed(1)}
                                                    %
                                                </span>
                                            </div>

                                            <div className="content-actions">
                                                {status === "pending" && (
                                                    <>
                                                        <button
                                                            onClick={() =>
                                                                handleApprove(
                                                                    item.id
                                                                )
                                                            }
                                                            className="btn btn-success"
                                                        >
                                                            ✓ Duyệt
                                                        </button>
                                                        <button
                                                            onClick={() =>
                                                                handleReject(
                                                                    item
                                                                )
                                                            }
                                                            className="btn btn-danger"
                                                        >
                                                            ✗ Từ chối
                                                        </button>
                                                    </>
                                                )}
                                                <button
                                                    onClick={() =>
                                                        handleDelete(item)
                                                    }
                                                    className="btn-action delete"
                                                >
                                                    🗑 Xóa
                                                </button>
                                                <button
                                                    onClick={() =>
                                                        handleViewDetail(item)
                                                    }
                                                    className="btn btn-primary"
                                                >
                                                    👁 Chi tiết
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>

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
                                        Trang {page} / {totalPages}
                                    </span>
                                    <button
                                        onClick={() =>
                                            setPage((p) =>
                                                Math.min(totalPages, p + 1)
                                            )
                                        }
                                        disabled={page === totalPages}
                                        className="btn btn-primary"
                                    >
                                        Sau →
                                    </button>
                                </div>
                            </>
                        )}
                    </>
                )}
            </div>
            {modalData && (
                <Modal
                    data={modalData}
                    onClose={() => setModalData(null)}
                    onConfirmReject={confirmReject}
                    onConfirmDelete={confirmDelete}
                />
            )}
        </div>
    );
}

function Modal({ data, onClose, onConfirmReject, onConfirmDelete }) {
    const [reason, setReason] = useState("");

    const handleSubmit = (e) => {
        e.preventDefault();
        if (data.type === "reject") {
            onConfirmReject(reason);
        } else if (data.type === "delete") {
            onConfirmDelete();
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div
                className="modal-content card"
                onClick={(e) => e.stopPropagation()}
            >
                <h3>
                    {data.type === "reject" && "Từ chối nội dung"}
                    {data.type === "delete" && "Xóa nội dung"}
                    {data.type === "detail" && "Chi tiết nội dung"}
                </h3>

                {data.type === "detail" ? (
                    <div className="detail-view">
                        <p>
                            <strong>ID:</strong> {data.item.id}
                        </p>
                        <p>
                            <strong>Tác giả:</strong> @{data.item.author}
                        </p>
                        <p>
                            <strong>Thời gian:</strong>{" "}
                            {new Date(data.item.createdAt).toLocaleString(
                                "vi-VN"
                            )}
                        </p>
                        <p>
                            <strong>Số báo cáo:</strong> {data.item.reports}
                        </p>
                        <p>
                            <strong>Nội dung:</strong>
                        </p>
                        <div className="content-preview">
                            {data.item.content}
                        </div>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit}>
                        <p>
                            {data.type === "reject"
                                ? `Từ chối nội dung của @${data.item.author}. Vui lòng nhập lý do:`
                                : `Xóa vĩnh viễn nội dung của @${data.item.author}? Hành động này không thể hoàn tác.`}
                        </p>

                        {data.type === "reject" && (
                            <textarea
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                placeholder="Lý do từ chối (bắt buộc)"
                                className="input"
                                rows={4}
                                required
                            />
                        )}

                        <div className="modal-actions">
                            <button
                                type="button"
                                onClick={onClose}
                                className="btn"
                                style={{ background: "#6b7280" }}
                            >
                                Hủy
                            </button>
                            <button type="submit" className="btn btn-danger">
                                Xác nhận
                            </button>
                        </div>
                    </form>
                )}

                {data.type === "detail" && (
                    <div className="modal-actions">
                        <button onClick={onClose} className="btn btn-primary">
                            Đóng
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
