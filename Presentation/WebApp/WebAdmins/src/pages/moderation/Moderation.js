import { useState, useEffect } from 'react';
import { moderationAPI } from '../../services/api.js';
import './Moderation.css';

export default function Moderation() {
  const [content, setContent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('posts');
  const [status, setStatus] = useState('pending');
  const [page, setPage] = useState(1);
  const [modalData, setModalData] = useState(null);

  useEffect(() => {
    loadContent();
  }, [page, filter, status]);

  const loadContent = async () => {
    try {
      setLoading(true);
      const result = await moderationAPI.getPendingPosts(page, 20);
      setContent(result.data);
    } catch (error) {
      console.error('Error loading content:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id) => {
    if (!window.confirm('Xác nhận duyệt nội dung này?')) return;
    
    try {
      await moderationAPI.approvePost(id);
      alert('Đã duyệt nội dung thành công');
      loadContent();
    } catch (error) {
      alert('Lỗi: ' + error.message);
    }
  };

  const handleReject = (item) => {
    setModalData({ type: 'reject', item });
  };

  const handleDelete = (item) => {
    setModalData({ type: 'delete', item });
  };

  const handleViewDetail = (item) => {
    setModalData({ type: 'detail', item });
  };

  const confirmReject = async (reason) => {
    if (!reason.trim()) {
      alert('Vui lòng nhập lý do từ chối');
      return;
    }

    try {
      await moderationAPI.rejectPost(modalData.item.id, reason);
      alert('Đã từ chối nội dung');
      setModalData(null);
      loadContent();
    } catch (error) {
      alert('Lỗi: ' + error.message);
    }
  };

  const confirmDelete = async () => {
    try {
      await moderationAPI.deletePost(modalData.item.id);
      alert('Đã xóa nội dung');
      setModalData(null);
      loadContent();
    } catch (error) {
      alert('Lỗi: ' + error.message);
    }
  };

  return (
    <div className="moderation-page">
      <div className="page-header">
        <h1>Kiểm duyệt Nội dung</h1>
        <p>Quản lý và kiểm duyệt bài đăng, bình luận</p>
      </div>

      <div className="card">
        <div className="moderation-toolbar">
          <select value={filter} onChange={(e) => setFilter(e.target.value)} className="input">
            <option value="posts">Bài đăng</option>
            <option value="comments">Bình luận</option>
            <option value="stories">Stories</option>
          </select>

          <select value={status} onChange={(e) => setStatus(e.target.value)} className="input">
            <option value="pending">Chờ duyệt</option>
            <option value="approved">Đã duyệt</option>
            <option value="rejected">Đã từ chối</option>
          </select>
        </div>

        {loading ? (
          <div className="loading-container">
            <div className="loading"></div>
          </div>
        ) : (
          <>
            <div className="content-list">
              {content.map(item => (
                <div key={item.id} className="content-card card">
                  <div className="content-header">
                    <div className="author-info">
                      <img 
                        src={`https://ui-avatars.com/api/?name=${item.author}&background=6366F1&color=fff`}
                        alt={item.author}
                        className="avatar"
                      />
                      <div>
                        <div className="author-name">@{item.author}</div>
                        <div className="content-date">
                          {new Date(item.createdAt).toLocaleString('vi-VN')}
                        </div>
                      </div>
                    </div>
                    {item.reports > 0 && (
                      <span className="report-badge">{item.reports} báo cáo</span>
                    )}
                  </div>

                  <div className="content-body">
                    {item.content.substring(0, 200)}
                    {item.content.length > 200 && '...'}
                  </div>

                  <div className="content-actions">
                    <button onClick={() => handleApprove(item.id)} className="btn btn-secondary">
                      ✓ Duyệt
                    </button>
                    <button onClick={() => handleReject(item)} className="btn btn-danger">
                      ✗ Từ chối
                    </button>
                    <button onClick={() => handleDelete(item)} className="btn-action delete">
                      🗑 Xóa
                    </button>
                    <button onClick={() => handleViewDetail(item)} className="btn btn-primary">
                      👁 Chi tiết
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="pagination">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn btn-primary">
                ← Trước
              </button>
              <span>Trang {page}</span>
              <button onClick={() => setPage(p => p + 1)} className="btn btn-primary">
                Sau →
              </button>
            </div>
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
  const [reason, setReason] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (data.type === 'reject') {
      onConfirmReject(reason);
    } else if (data.type === 'delete') {
      onConfirmDelete();
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content card" onClick={(e) => e.stopPropagation()}>
        <h3>
          {data.type === 'reject' && 'Từ chối nội dung'}
          {data.type === 'delete' && 'Xóa nội dung'}
          {data.type === 'detail' && 'Chi tiết nội dung'}
        </h3>

        {data.type === 'detail' ? (
          <div className="detail-view">
            <p><strong>ID:</strong> {data.item.id}</p>
            <p><strong>Tác giả:</strong> @{data.item.author}</p>
            <p><strong>Thời gian:</strong> {new Date(data.item.createdAt).toLocaleString('vi-VN')}</p>
            <p><strong>Số báo cáo:</strong> {data.item.reports}</p>
            <p><strong>Nội dung:</strong></p>
            <div className="content-preview">{data.item.content}</div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <p>
              {data.type === 'reject' 
                ? `Từ chối nội dung của @${data.item.author}. Vui lòng nhập lý do:`
                : `Xóa vĩnh viễn nội dung của @${data.item.author}? Hành động này không thể hoàn tác.`
              }
            </p>

            {data.type === 'reject' && (
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
              <button type="button" onClick={onClose} className="btn" style={{ background: '#6b7280' }}>
                Hủy
              </button>
              <button type="submit" className="btn btn-danger">
                Xác nhận
              </button>
            </div>
          </form>
        )}

        {data.type === 'detail' && (
          <div className="modal-actions">
            <button onClick={onClose} className="btn btn-primary">Đóng</button>
          </div>
        )}
      </div>
    </div>
  );
}
