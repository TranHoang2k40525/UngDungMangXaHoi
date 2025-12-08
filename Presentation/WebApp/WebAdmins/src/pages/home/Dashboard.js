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
  
  // Filter riêng cho từng biểu đồ
  const [userChartFilter, setUserChartFilter] = useState('Day'); // Day/Week/Month
  const [businessChartFilter, setBusinessChartFilter] = useState('Day'); // Day/Week/Month/Year
  const [revenueChartFilter, setRevenueChartFilter] = useState('Day'); // Day/Week/Month/Year
  const [postChartFilter, setPostChartFilter] = useState('Day'); // Day/Week/Month/Year
  
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

  useEffect(() => {
    loadDashboardData();
  }, [dateRange, userChartFilter, businessChartFilter, revenueChartFilter, postChartFilter]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const toDate = new Date();
      const fromDate = new Date();
      fromDate.setDate(toDate.getDate() - dateRange);

      // Load tất cả data song song
      const [
        activeUsersRes,
        newUsersRes,
        businessRes,
        revenueRes,
        postRes,
        keywordsRes,
        postsRes,
      ] = await Promise.all([
        dashboardAPI.getActiveUsers(),
        dashboardAPI.getNewUserStats(fromDate, toDate, userChartFilter),
        dashboardAPI.getBusinessGrowth(fromDate, toDate, businessChartFilter),
        dashboardAPI.getRevenue(fromDate, toDate, revenueChartFilter),
        dashboardAPI.getPostGrowth(fromDate, toDate, postChartFilter),
        dashboardAPI.getTopKeywords(fromDate, toDate),
        dashboardAPI.getTopPosts(fromDate, toDate),
      ]);

      // Cập nhật stats cards
      // Backend API response structure: { success, message, data }
      const newUsersData = Array.isArray(newUsersRes) ? newUsersRes : (newUsersRes.data || newUsersRes);
      const activeUsersData = activeUsersRes.data || activeUsersRes;
      
      // Business Growth response: { labels: [], counts: [], totalBusinessAccounts }
      const businessData = businessRes.data || businessRes;
      const businessCounts = businessData.counts || [];
      
      // Revenue response: { labels: [], revenues: [], totalRevenue }
      const revenueData = revenueRes.data || revenueRes;
      const revenues = revenueData.revenues || [];
      
      // Post Growth response: { labels: [], counts: [], totalPosts }
      const postData = postRes.data || postRes;
      const postCounts = postData.counts || [];
      
      // Keywords response: { keywords: [...], totalSearches }
      const keywordsData = keywordsRes.data || keywordsRes;
      const keywords = keywordsData.keywords || [];
      
      // Posts response: { posts: [...] }
      const postsData = postsRes.data || postsRes;
      const posts = postsData.posts || [];
      
      setStats({
        newUsers: Array.isArray(newUsersData) ? newUsersData.reduce((sum, item) => sum + (item.Count || item.count || 0), 0) : 0,
        activeUsers: activeUsersData.Count || activeUsersData.count || 0,
        businessAccounts: businessData.totalBusinessAccounts || businessCounts.reduce((sum, val) => sum + val, 0),
        totalRevenue: revenueData.totalRevenue || revenues.reduce((sum, val) => sum + val, 0),
        totalPosts: postData.totalPosts || postCounts.reduce((sum, val) => sum + val, 0),
      });

      // Format data cho biểu đồ New Users
      if (Array.isArray(newUsersData) && newUsersData.length > 0) {
        setNewUserData({
          labels: newUsersData.map(item => item.DisplayTime),
          datasets: [{
            label: 'Người dùng mới',
            data: newUsersData.map(item => item.Count || item.count),
            borderColor: 'rgb(75, 192, 192)',
            backgroundColor: 'rgba(75, 192, 192, 0.2)',
            tension: 0.3,
          }],
        });
      }

      // Format data cho biểu đồ Business Growth
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

      // Format data cho biểu đồ Revenue
      if (revenueData.labels && revenueData.labels.length > 0) {
        setRevenueData({
          labels: revenueData.labels,
          datasets: [{
            label: 'Doanh thu (VNĐ)',
            data: revenueData.revenues,
            backgroundColor: 'rgba(54, 162, 235, 0.6)',
            borderColor: 'rgb(54, 162, 235)',
            borderWidth: 1,
          }],
        });
      }

      // Format data cho biểu đồ Post Growth
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

      // Set top keywords
      if (keywords && keywords.length > 0) {
        setTopKeywords(keywords);
      }

      // Set top posts
      if (posts && posts.length > 0) {
        setTopPosts(posts);
      }

    } catch (error) {
      console.error('Error loading dashboard:', error);
      alert('Không thể tải dữ liệu dashboard: ' + (error.message || 'Lỗi không xác định'));
    } finally {
      setLoading(false);
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
      setSelectedPost(postDetail.data);
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
        <div className="date-range-selector">
          <button
            className={dateRange === 7 ? 'active' : ''}
            onClick={() => setDateRange(7)}
          >
            7 ngày
          </button>
          <button
            className={dateRange === 30 ? 'active' : ''}
            onClick={() => setDateRange(30)}
          >
            30 ngày
          </button>
          <button
            className={dateRange === 90 ? 'active' : ''}
            onClick={() => setDateRange(90)}
          >
            90 ngày
          </button>
        </div>
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
        {newUserData && (
          <div className="chart-container">
            <div className="chart-header">
              <h3>📈 Tăng trưởng người dùng mới</h3>
              <div className="chart-filter">
                <select value={userChartFilter} onChange={(e) => setUserChartFilter(e.target.value)}>
                  <option value="Day">Theo ngày</option>
                  <option value="Week">Theo tuần</option>
                  <option value="Month">Theo tháng</option>
                </select>
              </div>
            </div>
            <div className="chart-wrapper">
              <Line data={newUserData} options={chartOptions} />
            </div>
          </div>
        )}

        {/* Business Growth Chart */}
        {businessGrowthData && (
          <div className="chart-container">
            <div className="chart-header">
              <h3>🏢 Tăng trưởng tài khoản Business</h3>
              <div className="chart-filter">
                <select value={businessChartFilter} onChange={(e) => setBusinessChartFilter(e.target.value)}>
                  <option value="Day">Theo ngày</option>
                  <option value="Week">Theo tuần</option>
                  <option value="Month">Theo tháng</option>
                  <option value="Year">Theo năm</option>
                </select>
              </div>
            </div>
            <div className="chart-wrapper">
              <Line data={businessGrowthData} options={chartOptions} />
            </div>
          </div>
        )}

        {/* Revenue Chart */}
        {revenueData && (
          <div className="chart-container">
            <div className="chart-header">
              <h3>💰 Doanh thu từ Business</h3>
              <div className="chart-filter">
                <select value={revenueChartFilter} onChange={(e) => setRevenueChartFilter(e.target.value)}>
                  <option value="Day">Theo ngày</option>
                  <option value="Week">Theo tuần</option>
                  <option value="Month">Theo tháng</option>
                  <option value="Year">Theo năm</option>
                </select>
              </div>
            </div>
            <div className="chart-wrapper">
              <Bar data={revenueData} options={revenueChartOptions} />
            </div>
          </div>
        )}

        {/* Post Growth Chart */}
        {postGrowthData && (
          <div className="chart-container">
            <div className="chart-header">
              <h3>📝 Tăng trưởng bài đăng</h3>
              <div className="chart-filter">
                <select value={postChartFilter} onChange={(e) => setPostChartFilter(e.target.value)}>
                  <option value="Day">Theo ngày</option>
                  <option value="Week">Theo tuần</option>
                  <option value="Month">Theo tháng</option>
                  <option value="Year">Theo năm</option>
                </select>
              </div>
            </div>
            <div className="chart-wrapper">
              <Line data={postGrowthData} options={chartOptions} />
            </div>
          </div>
        )}
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
                    <tr key={keyword.Keyword}>
                      <td>{index + 1}</td>
                      <td className="keyword-cell">
                        <strong>{keyword.Keyword}</strong>
                      </td>
                      <td>
                        <span className="search-count">{keyword.SearchCount.toLocaleString()}</span>
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
                    <tr key={post.postId}>
                      <td>{index + 1}</td>
                      <td className="post-content-cell">
                        <div className="post-preview">
                          {post.Content.substring(0, 60)}
                          {post.Content.length > 60 && '...'}
                        </div>
                      </td>
                      <td>
                        <div className="author-info">
                          <strong>{post.AuthorName}</strong>
                          <small>@{post.AuthorUsername}</small>
                        </div>
                      </td>
                      <td>
                        <div className="interaction-stats">
                          <span className="reaction-count">❤️ {post.ReactionCount}</span>
                          <span className="comment-count">💬 {post.CommentCount}</span>
                          <span className="total-count">
                            <strong>{post.TotalInteractions}</strong> tổng
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
