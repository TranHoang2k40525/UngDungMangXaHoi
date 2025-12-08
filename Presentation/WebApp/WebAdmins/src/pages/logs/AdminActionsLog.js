import { useState, useEffect } from 'react';
import './AdminActionsLog.css';

export default function AdminActionsLog() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('7');
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadLogs();
  }, [page, filter, dateFilter]);

  const loadLogs = async () => {
    try {
      setLoading(true);
      // Mock data - Sẽ thay bằng API call khi backend sẵn sàng
      // const result = await adminAPI.getActionLogs(page, 20, filter, dateFilter);
      const mockData = generateMockLogs();
      setLogs(mockData);
    } catch (error) {
      console.error('Error loading logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateMockLogs = () => {
    const actions = [
      'Phê duyệt tài khoản doanh nghiệp',
      'Xóa bài đăng vi phạm',
      'Cấm người dùng',
      'Gỡ cấm người dùng',
      'Xử lý báo cáo vi phạm',
      'Từ chối yêu cầu xác thực',
      'Cảnh cáo người dùng',
      'Xóa bình luận không phù hợp',
      'Cập nhật cài đặt hệ thống',
      'Thay đổi quyền admin'
    ];

    const admins = [
      'Nguyễn Văn Admin',
      'Trần Thị Moderator', 
      'Lê Văn Manager',
      'Phạm Thị Support'
    ];

    const entities = [
      { type: 'user', name: '@user123' },
      { type: 'post', name: 'Bài đăng #456' },
      { type: 'business', name: 'Nhà hàng ABC' },
      { type: 'comment', name: 'Bình luận #789' },
      { type: 'report', name: 'Báo cáo #111' },
      { type: 'system', name: 'Hệ thống' }
    ];

    const now = Date.now();
    const daysAgo = parseInt(dateFilter) * 86400000;

    return Array.from({ length: 30 }, (_, i) => {
      const entity = entities[i % entities.length];
      const timestamp = now - Math.random() * daysAgo;
      
      return {
        id: i + 1,
        adminName: admins[i % admins.length],
        adminEmail: `admin${(i % admins.length) + 1}@snap67cs.com`,
        action: actions[i % actions.length],
        entityType: entity.type,
        entityName: entity.name,
        details: `Chi tiết về hành động ${actions[i % actions.length].toLowerCase()}`,
        ipAddress: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
        timestamp: new Date(timestamp).toISOString(),
        status: ['success', 'success', 'success', 'warning'][i % 4]
      };
    }).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  };

  const filteredLogs = logs.filter(log => {
    if (filter !== 'all' && log.entityType !== filter) return false;
    if (searchTerm && !log.action.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !log.adminName.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  const getActionIcon = (entityType) => {
    const icons = {
      user: '👤',
      post: '📝',
      business: '🏢',
      comment: '💬',
      report: '⚠️',
      system: '⚙️'
    };
    return icons[entityType] || '📋';
  };

  const getStatusColor = (status) => {
    const colors = {
      success: '#10B981',
      warning: '#F59E0B',
      error: '#EF4444'
    };
    return colors[status] || '#6B7280';
  };

  return (
    <div className="admin-actions-log-page">
      <div className="page-header">
        <h1>📜 Nhật ký Hoạt động Admin</h1>
        <p>Theo dõi tất cả các hành động của quản trị viên trong hệ thống</p>
      </div>

      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-icon">📊</div>
          <div className="stat-info">
            <div className="stat-label">Tổng hành động</div>
            <div className="stat-value">{logs.length}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">👥</div>
          <div className="stat-info">
            <div className="stat-label">Admin hoạt động</div>
            <div className="stat-value">{new Set(logs.map(l => l.adminEmail)).size}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🕒</div>
          <div className="stat-info">
            <div className="stat-label">24 giờ qua</div>
            <div className="stat-value">
              {logs.filter(l => Date.now() - new Date(l.timestamp) < 86400000).length}
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="filters-toolbar">
          <input
            type="search"
            placeholder="Tìm kiếm theo hành động, admin..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input search-input"
          />

          <select value={filter} onChange={(e) => setFilter(e.target.value)} className="input">
            <option value="all">Tất cả loại</option>
            <option value="user">👤 Người dùng</option>
            <option value="post">📝 Bài đăng</option>
            <option value="business">🏢 Doanh nghiệp</option>
            <option value="comment">💬 Bình luận</option>
            <option value="report">⚠️ Báo cáo</option>
            <option value="system">⚙️ Hệ thống</option>
          </select>

          <select value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="input">
            <option value="1">24 giờ qua</option>
            <option value="7">7 ngày qua</option>
            <option value="30">30 ngày qua</option>
            <option value="90">90 ngày qua</option>
          </select>
        </div>

        {loading ? (
          <div className="loading-container">
            <div className="loading"></div>
          </div>
        ) : (
          <>
            <div className="logs-list">
              {filteredLogs.map(log => (
                <div key={log.id} className="log-item">
                  <div className="log-icon" style={{ background: `${getStatusColor(log.status)}20` }}>
                    {getActionIcon(log.entityType)}
                  </div>
                  
                  <div className="log-content">
                    <div className="log-header">
                      <strong>{log.adminName}</strong>
                      <span className="log-action">{log.action}</span>
                      <span className="log-entity">{log.entityName}</span>
                    </div>
                    
                    <div className="log-details">
                      {log.details}
                    </div>
                    
                    <div className="log-meta">
                      <span>📧 {log.adminEmail}</span>
                      <span>🌐 {log.ipAddress}</span>
                      <span>🕒 {formatTimestamp(log.timestamp)}</span>
                    </div>
                  </div>

                  <div 
                    className="log-status-indicator" 
                    style={{ background: getStatusColor(log.status) }}
                    title={log.status}
                  />
                </div>
              ))}

              {filteredLogs.length === 0 && (
                <div className="empty-state">
                  <div className="empty-icon">🔍</div>
                  <h3>Không tìm thấy kết quả</h3>
                  <p>Thử thay đổi bộ lọc hoặc tìm kiếm khác</p>
                </div>
              )}
            </div>

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

  if (diffMins < 1) return 'Vừa xong';
  if (diffMins < 60) return `${diffMins} phút trước`;
  if (diffHours < 24) return `${diffHours} giờ trước`;
  if (diffDays < 7) return `${diffDays} ngày trước`;
  
  return date.toLocaleDateString('vi-VN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}
