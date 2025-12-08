import { useState, useEffect } from 'react';
import { reportsAPI } from '../../services/api.js';
import './Reports.css';

export default function Reports() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const [page, setPage] = useState(1);
  const [modalData, setModalData] = useState(null);

  useEffect(() => {
    loadReports();
  }, [page, filter]);

  const loadReports = async () => {
    try {
      setLoading(true);
      const result = await reportsAPI.getReports(page, 20, filter);
      setReports(result.data);
    } catch (error) {
      console.error('Error loading reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleView = (report) => {
    setModalData({ type: 'view', report });
  };

  const handleResolve = (report) => {
    setModalData({ type: 'resolve', report });
  };

  const handleReject = (report) => {
    setModalData({ type: 'reject', report });
  };

  const confirmAction = async (action, note) => {
    try {
      await reportsAPI.resolveReport(modalData.report.id, action, note);
      alert(`Đã ${action === 'resolved' ? 'xử lý' : 'từ chối'} báo cáo`);
      setModalData(null);
      loadReports();
    } catch (error) {
      alert('Lỗi: ' + error.message);
    }
  };

  return (
    <div className="reports-page">
      <div className="page-header">
        <h1>Báo cáo Vi phạm</h1>
        <p>Xử lý báo cáo từ người dùng</p>
      </div>

      <div className="card">
        <div className="reports-toolbar">
          <select value={filter} onChange={(e) => setFilter(e.target.value)} className="input">
            <option value="pending">Chờ xử lý</option>
            <option value="resolved">Đã xử lý</option>
            <option value="rejected">Đã từ chối</option>
            <option value="all">Tất cả</option>
          </select>
        </div>

        {loading ? (
          <div className="loading-container">
            <div className="loading"></div>
          </div>
        ) : (
          <>
            <table className="reports-table">
              <thead>
                <tr>
                  <th>Loại</th>
                  <th>Người báo cáo</th>
                  <th>Lý do</th>
                  <th>Thời gian</th>
                  <th>Trạng thái</th>
                  <th>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {reports.map(report => (
                  <tr key={report.id}>
                    <td><strong>{report.type === 'post' ? 'Bài đăng' : 'Bình luận'}</strong></td>
                    <td>@{report.reporter}</td>
                    <td>{report.reason}</td>
                    <td>{new Date(report.createdAt).toLocaleDateString('vi-VN')}</td>
                    <td>
                      <span className={`status-badge ${report.status}`}>
                        {report.status === 'pending' ? 'Chờ xử lý' : 
                         report.status === 'resolved' ? 'Đã xử lý' : 'Đã từ chối'}
                      </span>
                    </td>
                    <td className="actions-cell">
                      <button onClick={() => handleView(report)} className="btn-link">Xem</button>
                      {report.status === 'pending' && (
                        <>
                          <button onClick={() => handleResolve(report)} className="btn-link success">Xử lý</button>
                          <button onClick={() => handleReject(report)} className="btn-link danger">Từ chối</button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

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
        <ReportModal
          data={modalData}
          onClose={() => setModalData(null)}
          onConfirm={confirmAction}
        />
      )}
    </div>
  );
}

function ReportModal({ data, onClose, onConfirm }) {
  const [note, setNote] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    const action = data.type === 'resolve' ? 'resolved' : 'rejected';
    onConfirm(action, note);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content card" onClick={(e) => e.stopPropagation()}>
        <h3>
          {data.type === 'view' && 'Chi tiết báo cáo'}
          {data.type === 'resolve' && 'Xử lý báo cáo'}
          {data.type === 'reject' && 'Từ chối báo cáo'}
        </h3>

        <div className="report-detail">
          <p><strong>Loại:</strong> {data.report.type === 'post' ? 'Bài đăng' : 'Bình luận'}</p>
          <p><strong>ID nội dung:</strong> {data.report.contentId}</p>
          <p><strong>Người báo cáo:</strong> @{data.report.reporter}</p>
          <p><strong>Lý do:</strong> {data.report.reason}</p>
          <p><strong>Thời gian:</strong> {new Date(data.report.createdAt).toLocaleString('vi-VN')}</p>
          <p><strong>Trạng thái:</strong> {data.report.status}</p>
        </div>

        {data.type !== 'view' ? (
          <form onSubmit={handleSubmit}>
            <p style={{ marginTop: '16px' }}>
              {data.type === 'resolve' 
                ? 'Xác nhận đã xử lý báo cáo này? Bạn có thể thêm ghi chú.'
                : 'Từ chối báo cáo này? Báo cáo sẽ được đánh dấu là không hợp lệ.'
              }
            </p>

            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ghi chú (tùy chọn)"
              className="input"
              rows={4}
            />

            <div className="modal-actions">
              <button type="button" onClick={onClose} className="btn" style={{ background: '#6b7280' }}>
                Hủy
              </button>
              <button type="submit" className="btn btn-primary">
                Xác nhận
              </button>
            </div>
          </form>
        ) : (
          <div className="modal-actions">
            <button onClick={onClose} className="btn btn-primary">Đóng</button>
          </div>
        )}
      </div>
    </div>
  );
}
