import { useState, useEffect } from 'react';
import './BusinessRequests.css';

export default function BusinessRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const [page, setPage] = useState(1);
  const [modalData, setModalData] = useState(null);

  useEffect(() => {
    loadRequests();
  }, [page, filter]);

  const loadRequests = async () => {
    try {
      setLoading(true);
      // Mock data - Sẽ thay bằng API call khi backend sẵn sàng
      // const result = await businessAPI.getVerificationRequests(page, 20, filter);
      const mockData = generateMockRequests();
      setRequests(mockData);
    } catch (error) {
      console.error('Error loading requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateMockRequests = () => {
    const statuses = ['pending', 'approved', 'rejected'];
    const businesses = [
      'Nhà hàng ABC', 'Cửa hàng XYZ', 'Công ty DEF', 'Shop Thời Trang',
      'Quán Cafe 123', 'Spa Đẹp', 'Gym Center', 'Phòng khám Y tế'
    ];
    
    return Array.from({ length: 15 }, (_, i) => ({
      id: i + 1,
      businessName: businesses[i % businesses.length],
      ownerName: `Nguyễn Văn ${String.fromCharCode(65 + i)}`,
      email: `business${i + 1}@example.com`,
      phone: `098765${4321 + i}`,
      taxCode: `0${100000000 + i * 111111}`,
      businessType: ['Nhà hàng', 'Cửa hàng', 'Dịch vụ'][i % 3],
      address: `${i + 1} Đường ABC, Quận ${(i % 12) + 1}, TP.HCM`,
      website: `https://business${i + 1}.com`,
      description: `Mô tả ngắn về doanh nghiệp ${businesses[i % businesses.length]}`,
      status: filter === 'all' ? statuses[i % 3] : filter,
      submittedAt: new Date(Date.now() - i * 86400000).toISOString(),
      documents: [
        { type: 'Giấy phép kinh doanh', url: '/docs/license.pdf' },
        { type: 'CMND/CCCD', url: '/docs/id.pdf' }
      ]
    }));
  };

  const handleView = (request) => {
    setModalData({ type: 'view', request });
  };

  const handleApprove = (request) => {
    setModalData({ type: 'approve', request });
  };

  const handleReject = (request) => {
    setModalData({ type: 'reject', request });
  };

  const confirmAction = async (action, note) => {
    try {
      // await businessAPI.updateVerificationStatus(modalData.request.id, action, note);
      alert(`Đã ${action === 'approved' ? 'phê duyệt' : 'từ chối'} yêu cầu`);
      setModalData(null);
      loadRequests();
    } catch (error) {
      alert('Lỗi: ' + error.message);
    }
  };

  return (
    <div className="business-requests-page">
      <div className="page-header">
        <h1>🏢 Yêu cầu Xác thực Doanh nghiệp</h1>
        <p>Quản lý và phê duyệt các yêu cầu xác thực tài khoản doanh nghiệp</p>
      </div>

      <div className="stats-cards">
        <div className="stat-card pending">
          <h3>Chờ xử lý</h3>
          <div className="stat-value">{requests.filter(r => r.status === 'pending').length}</div>
        </div>
        <div className="stat-card approved">
          <h3>Đã phê duyệt</h3>
          <div className="stat-value">{requests.filter(r => r.status === 'approved').length}</div>
        </div>
        <div className="stat-card rejected">
          <h3>Đã từ chối</h3>
          <div className="stat-value">{requests.filter(r => r.status === 'rejected').length}</div>
        </div>
      </div>

      <div className="card">
        <div className="toolbar">
          <select value={filter} onChange={(e) => setFilter(e.target.value)} className="input">
            <option value="pending">Chờ xử lý</option>
            <option value="approved">Đã phê duyệt</option>
            <option value="rejected">Đã từ chối</option>
            <option value="all">Tất cả</option>
          </select>

          <input
            type="search"
            placeholder="Tìm kiếm theo tên, email..."
            className="input search-input"
          />
        </div>

        {loading ? (
          <div className="loading-container">
            <div className="loading"></div>
          </div>
        ) : (
          <>
            <table className="requests-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Tên doanh nghiệp</th>
                  <th>Chủ sở hữu</th>
                  <th>Loại hình</th>
                  <th>Ngày gửi</th>
                  <th>Trạng thái</th>
                  <th>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {requests.map(request => (
                  <tr key={request.id}>
                    <td>#{request.id}</td>
                    <td>
                      <strong>{request.businessName}</strong>
                      <div className="text-muted">{request.taxCode}</div>
                    </td>
                    <td>
                      {request.ownerName}
                      <div className="text-muted">{request.email}</div>
                    </td>
                    <td>{request.businessType}</td>
                    <td>{new Date(request.submittedAt).toLocaleDateString('vi-VN')}</td>
                    <td>
                      <span className={`status-badge ${request.status}`}>
                        {request.status === 'pending' ? '⏳ Chờ xử lý' : 
                         request.status === 'approved' ? '✅ Đã duyệt' : '❌ Từ chối'}
                      </span>
                    </td>
                    <td className="actions-cell">
                      <button onClick={() => handleView(request)} className="btn-link">
                        👁️ Xem
                      </button>
                      {request.status === 'pending' && (
                        <>
                          <button onClick={() => handleApprove(request)} className="btn-link success">
                            ✅ Duyệt
                          </button>
                          <button onClick={() => handleReject(request)} className="btn-link danger">
                            ❌ Từ chối
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="pagination">
              <button 
                onClick={() => setPage(p => Math.max(1, p - 1))} 
                disabled={page === 1} 
                className="btn btn-primary"
              >
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
        <RequestModal
          data={modalData}
          onClose={() => setModalData(null)}
          onConfirm={confirmAction}
        />
      )}
    </div>
  );
}

function RequestModal({ data, onClose, onConfirm }) {
  const [note, setNote] = useState('');
  const { request } = data;

  const handleSubmit = (e) => {
    e.preventDefault();
    const action = data.type === 'approve' ? 'approved' : 'rejected';
    onConfirm(action, note);
  };

  if (data.type === 'view') {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content card" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h3>Chi tiết yêu cầu xác thực</h3>
            <button onClick={onClose} className="close-btn">×</button>
          </div>

          <div className="modal-body">
            <div className="info-grid">
              <div className="info-item">
                <label>Tên doanh nghiệp:</label>
                <strong>{request.businessName}</strong>
              </div>
              <div className="info-item">
                <label>Mã số thuế:</label>
                <strong>{request.taxCode}</strong>
              </div>
              <div className="info-item">
                <label>Chủ sở hữu:</label>
                <strong>{request.ownerName}</strong>
              </div>
              <div className="info-item">
                <label>Email:</label>
                <strong>{request.email}</strong>
              </div>
              <div className="info-item">
                <label>Điện thoại:</label>
                <strong>{request.phone}</strong>
              </div>
              <div className="info-item">
                <label>Loại hình:</label>
                <strong>{request.businessType}</strong>
              </div>
              <div className="info-item full-width">
                <label>Địa chỉ:</label>
                <p>{request.address}</p>
              </div>
              <div className="info-item full-width">
                <label>Website:</label>
                <a href={request.website} target="_blank" rel="noopener noreferrer">
                  {request.website}
                </a>
              </div>
              <div className="info-item full-width">
                <label>Mô tả:</label>
                <p>{request.description}</p>
              </div>
            </div>

            <div className="documents-section">
              <h4>📄 Tài liệu đính kèm</h4>
              <div className="documents-list">
                {request.documents.map((doc, idx) => (
                  <div key={idx} className="document-item">
                    <span>📎 {doc.type}</span>
                    <a href={doc.url} target="_blank" rel="noopener noreferrer" className="btn-link">
                      Xem tài liệu
                    </a>
                  </div>
                ))}
              </div>
            </div>

            <div className="info-item">
              <label>Trạng thái:</label>
              <span className={`status-badge ${request.status}`}>
                {request.status === 'pending' ? 'Chờ xử lý' : 
                 request.status === 'approved' ? 'Đã duyệt' : 'Từ chối'}
              </span>
            </div>
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

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>
            {data.type === 'approve' ? '✅ Phê duyệt yêu cầu' : '❌ Từ chối yêu cầu'}
          </h3>
          <button onClick={onClose} className="close-btn">×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <p>
              <strong>Doanh nghiệp:</strong> {request.businessName}<br />
              <strong>Chủ sở hữu:</strong> {request.ownerName}
            </p>

            <div className="form-group">
              <label>Ghi chú {data.type === 'reject' && '(bắt buộc)'}</label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="input"
                rows={4}
                placeholder={data.type === 'approve' 
                  ? 'Ghi chú cho việc phê duyệt (tùy chọn)...'
                  : 'Lý do từ chối yêu cầu...'}
                required={data.type === 'reject'}
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Hủy
            </button>
            <button type="submit" className={`btn ${data.type === 'approve' ? 'btn-success' : 'btn-danger'}`}>
              {data.type === 'approve' ? 'Phê duyệt' : 'Từ chối'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
