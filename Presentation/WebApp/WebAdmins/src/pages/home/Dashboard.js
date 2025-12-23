import { useState, useEffect } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import { dashboardAPI } from '../../services/api.js';
import PostModal from '../../components/PostModal.js';
import './Dashboard.css';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState(30); // 7, 30, 90 days
  
  // Filter riêng cho từng biểu đồ với date range
  const [userChartFilter, setUserChartFilter] = useState({
    type: 'Day',
    fromDate: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
    toDate: new Date().toISOString().split('T')[0]
  });
  const [businessChartFilter, setBusinessChartFilter] = useState({
    type: 'Day',
    fromDate: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
    toDate: new Date().toISOString().split('T')[0]
  });
  const [revenueChartFilter, setRevenueChartFilter] = useState({
    type: 'Day',
    fromDate: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
    toDate: new Date().toISOString().split('T')[0]
  });
  const [postChartFilter, setPostChartFilter] = useState({
    type: 'Day',
    fromDate: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
    toDate: new Date().toISOString().split('T')[0]
  });
  
  // Loading state riêng cho từng biểu đồ
  const [chartLoading, setChartLoading] = useState({
    user: false,
    business: false,
    revenue: false,
    post: false
  });
  
  const [stats, setStats] = useState({
    newUsers: 0,
    activeUsers: 0,
    businessAccounts: 0,
    totalRevenue: 0,
    totalPosts: 0,
  });

  // Data cho các biểu đồ
  const [newUserData, setNewUserData] = useState(null);
  const [businessGrowthData, setBusinessGrowthData] = useState(null);
  const [revenueData, setRevenueData] = useState(null);
  const [postGrowthData, setPostGrowthData] = useState(null);
  const [topKeywords, setTopKeywords] = useState([]);
  const [topPosts, setTopPosts] = useState([]);

  // Modal state
  const [selectedPost, setSelectedPost] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Load initial data
  useEffect(() => {
    loadInitialData();
  }, []);

  // Load specific chart data when filter changes
  useEffect(() => {
    if (!loading) loadUserChartData();
  }, [userChartFilter]);

  useEffect(() => {
    if (!loading) loadBusinessChartData();
  }, [businessChartFilter]);

  useEffect(() => {
    if (!loading) loadRevenueChartData();
  }, [revenueChartFilter]);

  useEffect(() => {
    if (!loading) loadPostChartData();
  }, [postChartFilter]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      
      // Load stats cards và tables
      const [
        activeUsersRes,
        keywordsRes,
        postsRes,
      ] = await Promise.all([
        dashboardAPI.getActiveUsers(),
        dashboardAPI.getTopKeywords(new Date(userChartFilter.fromDate), new Date(userChartFilter.toDate)),
        dashboardAPI.getTopPosts(new Date(userChartFilter.fromDate), new Date(userChartFilter.toDate)),
      ]);

      const activeUsersData = activeUsersRes.data || activeUsersRes;
      const keywordsData = keywordsRes.data || keywordsRes;
      const postsData = postsRes.data || postsRes;
      
      setStats(prev => ({
        ...prev,
        activeUsers: activeUsersData.Count || activeUsersData.count || 0,
      }));

      // Normalize top keywords: backend may return different casing
      const rawKeywords = keywordsData?.keywords || [];
      const normalizedKeywords = rawKeywords.map(k => ({
        Keyword: k.Keyword ?? k.keyword ?? k.Key ?? '',
        SearchCount: Number(k.SearchCount ?? k.searchCount ?? k.search_count ?? 0) || 0,
        Tyle: Number(k.Tyle ?? k.tyle ?? k.tly ?? 0) || 0
      }));
      setTopKeywords(normalizedKeywords);

      // Normalize top posts to the flat shape expected by the table
      const rawPosts = postsData?.posts || [];
      const normalizedPosts = rawPosts.map(p => ({
        PostId: p.PostId ?? p.postId ?? p.post_id ?? null,
        Content: p.Content ?? p.caption ?? p.Caption ?? p.content ?? '',
        AuthorName: p.Author?.FullName ?? p.Author?.fullName ?? p.FullName ?? p.authorName ?? '',
        AuthorUsername: p.Author?.UserName ?? p.Author?.Username ?? p.Author?.username ?? p.AuthorUsername ?? '',
        ReactionCount: Number(p.ReactionCount ?? p.reactionCount ?? p.Engagement?.ReactionCount ?? p.engagement?.reactionCount ?? 0) || 0,
        CommentCount: Number(p.CommentCount ?? p.commentCount ?? p.Engagement?.CommentCount ?? p.engagement?.commentCount ?? 0) || 0,
        TotalInteractions: Number(p.TotalInteractions ?? p.totalInteractions ?? p.Engagement?.TotalEngagement ?? p.engagement?.totalEngagement ?? 0) || 0,
        Raw: p
      }));
      setTopPosts(normalizedPosts);

      // Load tất cả charts
      await Promise.all([
        loadUserChartData(),
        loadBusinessChartData(),
        loadRevenueChartData(),
        loadPostChartData(),
      ]);

    } catch (error) {
      console.error('Error loading dashboard:', error);
      alert('Không thể tải dữ liệu dashboard: ' + (error.message || 'Lỗi không xác định'));
    } finally {
      setLoading(false);
    }
  };

  const loadUserChartData = async () => {
    try {
      setChartLoading(prev => ({ ...prev, user: true }));
      const fromDate = new Date(userChartFilter.fromDate);
      const toDate = new Date(userChartFilter.toDate);
      
      const newUsersRes = await dashboardAPI.getNewUserStats(fromDate, toDate, userChartFilter.type);
      const newUsersData = Array.isArray(newUsersRes) ? newUsersRes : (newUsersRes.data || newUsersRes);

      // Normalize returned items into a map: DisplayTime -> Count
      const countMap = {};
      if (Array.isArray(newUsersData)) {
        newUsersData.forEach(item => {
          const key = item.DisplayTime || item.displayTime || '';
          const val = Number(item.Count ?? item.count ?? 0) || 0;
          if (!key) return;
          countMap[key] = (countMap[key] || 0) + val;
        });
      }

      // Helper to format labels the same way backend does
      const formatLabel = (dateObj, type) => {
        const dd = String(dateObj.getDate()).padStart(2, '0');
        const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
        const yyyy = dateObj.getFullYear();
        if (type === 'Month') return `${mm}/${yyyy}`; // MM/yyyy
        // Day and Week use dd/MM/yyyy as backend's GetUserNewDate uses
        return `${dd}/${mm}/${yyyy}`;
      };

      // Build expected labels for the selected grouping and fill missing periods with 0
      const expectedLabels = [];
      const counts = [];
      const grouping = userChartFilter.type || 'Day';
      const cur = new Date(fromDate);

      if (grouping === 'Month') {
        cur.setDate(1);
        while (cur <= toDate) {
          const lbl = formatLabel(cur, 'Month');
          expectedLabels.push(lbl);
          counts.push(countMap[lbl] || 0);
          cur.setMonth(cur.getMonth() + 1);
        }
      } else if (grouping === 'Week') {
        // Step by 7 days
        while (cur <= toDate) {
          const lbl = formatLabel(cur, 'Day');
          expectedLabels.push(lbl);
          counts.push(countMap[lbl] || 0);
          cur.setDate(cur.getDate() + 7);
        }
      } else {
        // Day grouping: every day
        while (cur <= toDate) {
          const lbl = formatLabel(cur, 'Day');
          expectedLabels.push(lbl);
          counts.push(countMap[lbl] || 0);
          cur.setDate(cur.getDate() + 1);
        }
      }

      setStats(prev => ({
        ...prev,
        newUsers: counts.reduce((sum, v) => sum + v, 0),
      }));

      // Always set chart data (even if all zeros) so chart shows full period
      setNewUserData({
        labels: expectedLabels,
        datasets: [{
          label: 'Người dùng mới',
          data: counts,
          borderColor: 'rgb(75, 192, 192)',
          backgroundColor: 'rgba(75, 192, 192, 0.2)',
          tension: 0.3,
        }],
      });
    } catch (error) {
      console.error('Error loading user chart:', error);
    } finally {
      setChartLoading(prev => ({ ...prev, user: false }));
    }
  };

  const loadBusinessChartData = async () => {
    try {
      setChartLoading(prev => ({ ...prev, business: true }));
      const fromDate = new Date(businessChartFilter.fromDate);
      const toDate = new Date(businessChartFilter.toDate);
      
      const businessRes = await dashboardAPI.getBusinessGrowth(fromDate, toDate, businessChartFilter.type);
      const businessData = businessRes.data || businessRes;
      const businessCounts = businessData.counts || [];
      
      setStats(prev => ({
        ...prev,
        businessAccounts: businessData.totalBusinessAccounts || businessCounts.reduce((sum, val) => sum + val, 0),
      }));

      if (businessData.labels && businessData.labels.length > 0) {
        setBusinessGrowthData({
          labels: businessData.labels,
          datasets: [{
            label: 'Tài khoản Business mới',
            data: businessData.counts,
            borderColor: 'rgb(255, 159, 64)',
            backgroundColor: 'rgba(255, 159, 64, 0.2)',
            tension: 0.3,
          }],
        });
      }
    } catch (error) {
      console.error('Error loading business chart:', error);
    } finally {
      setChartLoading(prev => ({ ...prev, business: false }));
    }
  };

  const loadRevenueChartData = async () => {
    try {
      setChartLoading(prev => ({ ...prev, revenue: true }));
      const fromDate = new Date(revenueChartFilter.fromDate);
      const toDate = new Date(revenueChartFilter.toDate);
      
      const revenueRes = await dashboardAPI.getRevenue(fromDate, toDate, revenueChartFilter.type);
      const revenueDataRes = revenueRes.data || revenueRes;
      const revenues = revenueDataRes.revenues || [];
      
      setStats(prev => ({
        ...prev,
        totalRevenue: revenueDataRes.totalRevenue || revenues.reduce((sum, val) => sum + val, 0),
      }));

      if (revenueDataRes.labels && revenueDataRes.labels.length > 0) {
        setRevenueData({
          labels: revenueDataRes.labels,
          datasets: [{
            label: 'Doanh thu (VNĐ)',
            data: revenueDataRes.revenues,
            backgroundColor: 'rgba(54, 162, 235, 0.6)',
            borderColor: 'rgb(54, 162, 235)',
            borderWidth: 1,
          }],
        });
      }
    } catch (error) {
      console.error('Error loading revenue chart:', error);
    } finally {
      setChartLoading(prev => ({ ...prev, revenue: false }));
    }
  };

  const loadPostChartData = async () => {
    try {
      setChartLoading(prev => ({ ...prev, post: true }));
      const fromDate = new Date(postChartFilter.fromDate);
      const toDate = new Date(postChartFilter.toDate);
      
      const postRes = await dashboardAPI.getPostGrowth(fromDate, toDate, postChartFilter.type);
      const postData = postRes.data || postRes;
      const postCounts = postData.counts || [];
      
      setStats(prev => ({
        ...prev,
        totalPosts: postData.totalPosts || postCounts.reduce((sum, val) => sum + val, 0),
      }));

      if (postData.labels && postData.labels.length > 0) {
        setPostGrowthData({
          labels: postData.labels,
          datasets: [{
            label: 'Bài đăng mới',
            data: postData.counts,
            borderColor: 'rgb(153, 102, 255)',
            backgroundColor: 'rgba(153, 102, 255, 0.2)',
            tension: 0.3,
          }],
        });
      }
    } catch (error) {
      console.error('Error loading post chart:', error);
    } finally {
      setChartLoading(prev => ({ ...prev, post: false }));
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return `${date.getDate()}/${date.getMonth() + 1}`;
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
  };

  const handleViewPost = async (postId) => {
    try {
      const postDetail = await dashboardAPI.getPostDetail(postId);
      // apiClient interceptor returns response.data directly in many places,
      // frontend code sometimes expects { data: ... } shape. Accept both.
      const payload = postDetail?.data || postDetail;
      setSelectedPost(payload);
      setIsModalOpen(true);
    } catch (error) {
      console.error('Error loading post detail:', error);
      alert('Không thể tải chi tiết bài đăng');
    }
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          precision: 0,
        },
      },
    },
  };

  const revenueChartOptions = {
    ...chartOptions,
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function(value) {
            return formatCurrency(value);
          }
        }
      }
    }
  };

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="loading-spinner"></div>
        <p>Đang tải dữ liệu...</p>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>📊 Dashboard Admin</h1>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">👥</div>
          <div className="stat-info">
            <h3>Người dùng mới</h3>
            <p className="stat-value">{stats.newUsers.toLocaleString()}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">🟢</div>
          <div className="stat-info">
            <h3>Người dùng hoạt động</h3>
            <p className="stat-value">{stats.activeUsers.toLocaleString()}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">🏢</div>
          <div className="stat-info">
            <h3>Tài khoản Business</h3>
            <p className="stat-value">{stats.businessAccounts.toLocaleString()}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">💰</div>
          <div className="stat-info">
            <h3>Doanh thu</h3>
            <p className="stat-value">{formatCurrency(stats.totalRevenue)}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">📝</div>
          <div className="stat-info">
            <h3>Bài đăng mới</h3>
            <p className="stat-value">{stats.totalPosts.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="charts-grid">
        {/* New Users Chart */}
        <div className="chart-container">
          <div className="chart-header">
            <h3>📈 Tăng trưởng người dùng mới</h3>
            <div className="chart-controls">
              <div className="date-inputs">
                <label>
                  Từ ngày:
                  <input 
                    type="date" 
                    value={userChartFilter.fromDate}
                    max={userChartFilter.toDate}
                    onChange={(e) => setUserChartFilter(prev => ({ ...prev, fromDate: e.target.value }))}
                  />
                </label>
                <label>
                  Đến ngày:
                  <input 
                    type="date" 
                    value={userChartFilter.toDate}
                    min={userChartFilter.fromDate}
                    max={new Date().toISOString().split('T')[0]}
                    onChange={(e) => setUserChartFilter(prev => ({ ...prev, toDate: e.target.value }))}
                  />
                </label>
              </div>
              <select 
                value={userChartFilter.type} 
                onChange={(e) => setUserChartFilter(prev => ({ ...prev, type: e.target.value }))}
              >
                <option value="Day">Theo ngày</option>
                <option value="Week">Theo tuần</option>
                <option value="Month">Theo tháng</option>
              </select>
            </div>
          </div>
          <div className="chart-wrapper">
            {chartLoading.user ? (
              <div className="chart-loading">Đang tải...</div>
            ) : newUserData ? (
              <Line data={newUserData} options={chartOptions} />
            ) : (
              <div className="chart-empty">Không có dữ liệu</div>
            )}
          </div>
        </div>

        {/* Business Growth Chart */}
        <div className="chart-container">
          <div className="chart-header">
            <h3>🏢 Tăng trưởng tài khoản Business</h3>
            <div className="chart-controls">
              <div className="date-inputs">
                <label>
                  Từ ngày:
                  <input 
                    type="date" 
                    value={businessChartFilter.fromDate}
                    max={businessChartFilter.toDate}
                    onChange={(e) => setBusinessChartFilter(prev => ({ ...prev, fromDate: e.target.value }))}
                  />
                </label>
                <label>
                  Đến ngày:
                  <input 
                    type="date" 
                    value={businessChartFilter.toDate}
                    min={businessChartFilter.fromDate}
                    max={new Date().toISOString().split('T')[0]}
                    onChange={(e) => setBusinessChartFilter(prev => ({ ...prev, toDate: e.target.value }))}
                  />
                </label>
              </div>
              <select 
                value={businessChartFilter.type} 
                onChange={(e) => setBusinessChartFilter(prev => ({ ...prev, type: e.target.value }))}
              >
                <option value="Day">Theo ngày</option>
                <option value="Week">Theo tuần</option>
                <option value="Month">Theo tháng</option>
                <option value="Year">Theo năm</option>
              </select>
            </div>
          </div>
          <div className="chart-wrapper">
            {chartLoading.business ? (
              <div className="chart-loading">Đang tải...</div>
            ) : businessGrowthData ? (
              <Line data={businessGrowthData} options={chartOptions} />
            ) : (
              <div className="chart-empty">Không có dữ liệu</div>
            )}
          </div>
        </div>

        {/* Revenue Chart */}
        <div className="chart-container">
          <div className="chart-header">
            <h3>💰 Doanh thu từ Business</h3>
            <div className="chart-controls">
              <div className="date-inputs">
                <label>
                  Từ ngày:
                  <input 
                    type="date" 
                    value={revenueChartFilter.fromDate}
                    max={revenueChartFilter.toDate}
                    onChange={(e) => setRevenueChartFilter(prev => ({ ...prev, fromDate: e.target.value }))}
                  />
                </label>
                <label>
                  Đến ngày:
                  <input 
                    type="date" 
                    value={revenueChartFilter.toDate}
                    min={revenueChartFilter.fromDate}
                    max={new Date().toISOString().split('T')[0]}
                    onChange={(e) => setRevenueChartFilter(prev => ({ ...prev, toDate: e.target.value }))}
                  />
                </label>
              </div>
              <select 
                value={revenueChartFilter.type} 
                onChange={(e) => setRevenueChartFilter(prev => ({ ...prev, type: e.target.value }))}
              >
                <option value="Day">Theo ngày</option>
                <option value="Week">Theo tuần</option>
                <option value="Month">Theo tháng</option>
                <option value="Year">Theo năm</option>
              </select>
            </div>
          </div>
          <div className="chart-wrapper">
            {chartLoading.revenue ? (
              <div className="chart-loading">Đang tải...</div>
            ) : revenueData ? (
              <Bar data={revenueData} options={revenueChartOptions} />
            ) : (
              <div className="chart-empty">Không có dữ liệu</div>
            )}
          </div>
        </div>

        {/* Post Growth Chart */}
        <div className="chart-container">
          <div className="chart-header">
            <h3>📝 Tăng trưởng bài đăng</h3>
            <div className="chart-controls">
              <div className="date-inputs">
                <label>
                  Từ ngày:
                  <input 
                    type="date" 
                    value={postChartFilter.fromDate}
                    max={postChartFilter.toDate}
                    onChange={(e) => setPostChartFilter(prev => ({ ...prev, fromDate: e.target.value }))}
                  />
                </label>
                <label>
                  Đến ngày:
                  <input 
                    type="date" 
                    value={postChartFilter.toDate}
                    min={postChartFilter.fromDate}
                    max={new Date().toISOString().split('T')[0]}
                    onChange={(e) => setPostChartFilter(prev => ({ ...prev, toDate: e.target.value }))}
                  />
                </label>
              </div>
              <select 
                value={postChartFilter.type} 
                onChange={(e) => setPostChartFilter(prev => ({ ...prev, type: e.target.value }))}
              >
                <option value="Day">Theo ngày</option>
                <option value="Week">Theo tuần</option>
                <option value="Month">Theo tháng</option>
                <option value="Year">Theo năm</option>
              </select>
            </div>
          </div>
          <div className="chart-wrapper">
            {chartLoading.post ? (
              <div className="chart-loading">Đang tải...</div>
            ) : postGrowthData ? (
              <Line data={postGrowthData} options={chartOptions} />
            ) : (
              <div className="chart-empty">Không có dữ liệu</div>
            )}
          </div>
        </div>
      </div>

      {/* Tables Grid */}
      <div className="tables-grid">
        {/* Top Keywords Table */}
        <div className="table-container">
          <h3>🔍 Top 10 từ khóa tìm kiếm nhiều nhất</h3>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Từ khóa</th>
                  <th>Số lượt tìm kiếm</th>
                </tr>
              </thead>
              <tbody>
                {topKeywords.length > 0 ? (
                  topKeywords.map((keyword, index) => (
                    <tr key={`keyword-${index}-${keyword.Keyword}`}>
                      <td>{index + 1}</td>
                      <td className="keyword-cell">
                        <strong>{keyword.Keyword}</strong>
                      </td>
                      <td>
                        <span className="search-count">{keyword.SearchCount?.toLocaleString()}</span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="3" className="no-data">Chưa có dữ liệu</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top Posts Table */}
        <div className="table-container">
          <h3>🔥 Top 10 bài đăng tương tác nhiều nhất</h3>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Nội dung</th>
                  <th>Tác giả</th>
                  <th>Tương tác</th>
                  <th>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {topPosts.length > 0 ? (
                  topPosts.map((post, index) => (
                    <tr key={post.PostId || index}>
                      <td>{index + 1}</td>
                      <td className="post-content-cell">
                        <div className="post-preview">
                          {post.Content ? post.Content.substring(0, 60) : 'Không có nội dung'}
                          {post.Content && post.Content.length > 60 && '...'}
                        </div>
                      </td>
                      <td>
                        <div className="author-info">
                          <strong>{post.AuthorName || 'N/A'}</strong>
                          <small>@{post.AuthorUsername || 'unknown'}</small>
                        </div>
                      </td>
                      <td>
                        <div className="interaction-stats">
                          <span className="reaction-count">❤️ {post.ReactionCount || 0}</span>
                          <span className="comment-count">💬 {post.CommentCount || 0}</span>
                          <span className="total-count">
                            <strong>{post.TotalInteractions || 0}</strong> tổng
                          </span>
                        </div>
                      </td>
                      <td>
                        <button
                          className="btn-view-post"
                          onClick={() => handleViewPost(post.PostId)}
                        >
                          Xem chi tiết
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="no-data">Chưa có dữ liệu</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Post Detail Modal */}
      {isModalOpen && selectedPost && (
        <PostModal
          post={selectedPost}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedPost(null);
          }}
        />
      )}
    </div>
  );
}
