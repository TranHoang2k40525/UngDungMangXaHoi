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
import { 
  FiBarChart2, FiUsers, FiCheckCircle, FiBriefcase, FiDollarSign, FiFileText, FiTrendingUp, FiSearch, FiZap, FiHeart, FiMessageSquare
} from 'react-icons/fi';
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
      const keywordsData = keywordsRes.data || keywordsRes || {};
      const postsData = postsRes.data || postsRes || {};
      
      setStats(prev => ({
        ...prev,
        activeUsers: activeUsersData.Count || activeUsersData.count || 0,
      }));

      // Normalize top keywords: backend may return different casing
      const rawKeywords = Array.isArray(keywordsData) ? keywordsData : (keywordsData?.data || keywordsData?.keywords || keywordsData?.Keywords || []);
      const normalizedKeywords = rawKeywords.map(k => ({
        Keyword: k.Keyword ?? k.keyword ?? k.Key ?? '',
        SearchCount: Number(k.SearchCount ?? k.searchCount ?? k.search_count ?? 0) || 0,
        Tyle: Number(k.Tyle ?? k.tyle ?? k.tly ?? 0) || 0
      }));
      setTopKeywords(normalizedKeywords);

      // Normalize top posts to the flat shape expected by the table
      const rawPosts = Array.isArray(postsData) ? postsData : (postsData?.data || postsData?.posts || postsData?.Posts || postsData?.Data || []);
      const normalizedPosts = rawPosts.map(p => {
        const postId = p.PostId ?? p.postId ?? p.post_id ?? p.Id ?? p.id ?? null;
        let content = p.Content ?? p.caption ?? p.Caption ?? p.content ?? '';

        // If caption/content is empty, try to build a hint from media
        const media = p.Media || p.media || p.MediaItems || p.mediaItems || [];
        if ((!content || content.trim() === '') && Array.isArray(media) && media.length > 0) {
          const first = media[0];
          const mtype = first?.MediaType ?? first?.mediaType ?? '';
          content = mtype ? `[${mtype}]` : '[Hình ảnh]';
          if (media.length > 1) content += ` +${media.length - 1}`;
        }

        const author = p.Author || p.author || p.PostAuthor || {};
        const authorName = author?.FullName ?? author?.fullName ?? author?.full_name ?? author?.UserName ?? author?.userName ?? 'N/A';
        const authorUsername = author?.UserName ?? author?.Username ?? author?.username ?? author?.userName ?? author?.User ?? 'unknown';

        const engagement = p.Engagement || p.engagement || p.EngagementStats || {};
        const reaction = Number(p.ReactionCount ?? p.reactionCount ?? engagement?.ReactionCount ?? engagement?.reactionCount ?? engagement?.LikeCount ?? 0) || 0;
        const comment = Number(p.CommentCount ?? p.commentCount ?? engagement?.CommentCount ?? engagement?.commentCount ?? 0) || 0;
        const total = Number(
          p.TotalInteractions ??
          p.totalInteractions ??
          engagement?.TotalEngagement ??
          engagement?.totalEngagement ??
          (reaction + comment + (engagement?.ShareCount ?? 0))
        ) || 0;

        // collect media urls (normalize various property names)
        const mediaList = Array.isArray(media) ? media.map(m => m?.MediaUrl ?? m?.mediaUrl ?? m?.Url ?? m?.url ?? '') .filter(Boolean) : [];

        // author avatar fallback
        const avatar = author?.AvatarUrl ?? author?.avatarUrl ?? author?.Avatar ?? author?.avatar ?? '';

        return {
          PostId: postId,
          Content: content,
          AuthorName: authorName,
          AuthorUsername: authorUsername,
          AuthorAvatar: avatar,
          MediaUrls: mediaList,
          ReactionCount: reaction,
          CommentCount: comment,
          TotalInteractions: total,
          Raw: p
        };
      });
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

  // Try to produce label variants (with/without year, remove "Tuần " prefix) so frontend
  // can match backend labels produced in different formats (dd/MM or dd/MM/yyyy)
  const buildLabelVariants = (label, toDate) => {
    if (!label) return [label];
    let base = label;
    if (base.startsWith('Tuần ')) base = base.replace(/^Tuần\s*/, '');

    const variants = new Set();
    variants.add(label);
    // If looks like dd/MM/yyyy
    const parts = base.split('/');
    if (parts.length === 3) {
      const [d, m, y] = parts;
      variants.add(`${d}/${m}`);
    } else if (parts.length === 2) {
      // dd/MM -> add dd/MM/yyyy using toDate year
      const [d, m] = parts;
      const year = toDate ? toDate.getFullYear() : new Date().getFullYear();
      variants.add(`${d}/${m}/${year}`);
    }
    return Array.from(variants);
  };

  // Shared formatter for period labels shown in charts
  const formatPeriodLabel = (dateObj, type) => {
    const dd = String(dateObj.getDate()).padStart(2, '0');
    const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
    const yyyy = dateObj.getFullYear();
    if (type === 'Month') return `${mm}/${yyyy}`; // MM/yyyy
    if (type === 'Year') return `${yyyy}`;
    if (type === 'Week') return `Tuần ${dd}/${mm}`;
    return `${dd}/${mm}/${yyyy}`; // Day default
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

      // Use shared formatPeriodLabel
      const formatLabel = (dateObj, type) => formatPeriodLabel(dateObj, type);

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
      const rawLabels = businessData?.labels || businessData?.lables || businessData?.Labels || [];
      const rawCounts = businessData?.counts || businessData?.Counts || [];

      // Build a tolerant count map that accepts several label variants (with/without year)
      const countMap = {};
      rawLabels.forEach((lbl, idx) => {
        const val = Number(rawCounts[idx] ?? 0) || 0;
        const variants = buildLabelVariants(lbl, toDate);
        variants.forEach(v => {
          if (!v) return;
          countMap[v] = (countMap[v] || 0) + val;
        });
        // also register the raw label itself
        if (lbl) countMap[lbl] = (countMap[lbl] || 0) + val;
      });

      const grouping = businessChartFilter.type || 'Day';
      const expectedLabels = [];
      const counts = [];
      const cur = new Date(fromDate);

      if (grouping === 'Month') {
        cur.setDate(1);
        while (cur <= toDate) {
          const lbl = formatPeriodLabel(cur, 'Month');
          expectedLabels.push(lbl);
          counts.push(countMap[lbl] || 0);
          cur.setMonth(cur.getMonth() + 1);
        }
      } else if (grouping === 'Week') {
        while (cur <= toDate) {
          const lbl = formatPeriodLabel(cur, 'Week');
          expectedLabels.push(lbl);
          counts.push(countMap[lbl] || 0);
          cur.setDate(cur.getDate() + 7);
        }
      } else {
        while (cur <= toDate) {
          const lbl = formatPeriodLabel(cur, 'Day');
          expectedLabels.push(lbl);
          counts.push(countMap[lbl] || 0);
          cur.setDate(cur.getDate() + 1);
        }
      }

      setStats(prev => ({
        ...prev,
        businessAccounts: businessData.totalBusinessAccounts || counts.reduce((sum, val) => sum + val, 0),
      }));

      setBusinessGrowthData({
        labels: expectedLabels,
        datasets: [{
          label: 'Tài khoản Business mới',
          data: counts,
          borderColor: 'rgb(255, 159, 64)',
          backgroundColor: 'rgba(255, 159, 64, 0.2)',
          tension: 0.3,
        }],
      });
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
      const rawLabels = revenueDataRes?.labels || revenueDataRes?.lables || revenueDataRes?.Labels || [];
      const rawRevenues = revenueDataRes?.revenues || revenueDataRes?.Revenues || [];

      const countMap = {};
      rawLabels.forEach((lbl, idx) => {
        const val = Number(rawRevenues[idx] ?? 0) || 0;
        const variants = buildLabelVariants(lbl, toDate);
        variants.forEach(v => {
          if (!v) return;
          countMap[v] = (countMap[v] || 0) + val;
        });
        if (lbl) countMap[lbl] = (countMap[lbl] || 0) + val;
      });

      const grouping = revenueChartFilter.type || 'Day';
      const expectedLabels = [];
      const values = [];
      const cur = new Date(fromDate);

      if (grouping === 'Month') {
        cur.setDate(1);
        while (cur <= toDate) {
          const lbl = formatPeriodLabel(cur, 'Month');
          expectedLabels.push(lbl);
          values.push(countMap[lbl] || 0);
          cur.setMonth(cur.getMonth() + 1);
        }
      } else if (grouping === 'Week') {
        while (cur <= toDate) {
          const lbl = formatPeriodLabel(cur, 'Week');
          expectedLabels.push(lbl);
          values.push(countMap[lbl] || 0);
          cur.setDate(cur.getDate() + 7);
        }
      } else {
        while (cur <= toDate) {
          const lbl = formatPeriodLabel(cur, 'Day');
          expectedLabels.push(lbl);
          values.push(countMap[lbl] || 0);
          cur.setDate(cur.getDate() + 1);
        }
      }

      setStats(prev => ({
        ...prev,
        totalRevenue: revenueDataRes.totalRevenue || values.reduce((sum, val) => sum + val, 0),
      }));

      setRevenueData({
        labels: expectedLabels,
        datasets: [{
          label: 'Doanh thu (VNĐ)',
          data: values,
          backgroundColor: 'rgba(54, 162, 235, 0.6)',
          borderColor: 'rgb(54, 162, 235)',
          borderWidth: 1,
        }],
      });
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
      const rawLabels = postData?.labels || postData?.lables || postData?.Labels || [];
      const rawCounts = postData?.counts || postData?.Counts || [];

      const countMap = {};
      rawLabels.forEach((lbl, idx) => {
        const val = Number(rawCounts[idx] ?? 0) || 0;
        const variants = buildLabelVariants(lbl, toDate);
        variants.forEach(v => {
          if (!v) return;
          countMap[v] = (countMap[v] || 0) + val;
        });
        if (lbl) countMap[lbl] = (countMap[lbl] || 0) + val;
      });

      const grouping = postChartFilter.type || 'Day';
      const expectedLabels = [];
      const counts = [];
      const cur = new Date(fromDate);

      if (grouping === 'Month') {
        cur.setDate(1);
        while (cur <= toDate) {
          const lbl = formatPeriodLabel(cur, 'Month');
          expectedLabels.push(lbl);
          counts.push(countMap[lbl] || 0);
          cur.setMonth(cur.getMonth() + 1);
        }
      } else if (grouping === 'Week') {
        while (cur <= toDate) {
          const lbl = formatPeriodLabel(cur, 'Week');
          expectedLabels.push(lbl);
          counts.push(countMap[lbl] || 0);
          cur.setDate(cur.getDate() + 7);
        }
      } else {
        while (cur <= toDate) {
          const lbl = formatPeriodLabel(cur, 'Day');
          expectedLabels.push(lbl);
          counts.push(countMap[lbl] || 0);
          cur.setDate(cur.getDate() + 1);
        }
      }

      setStats(prev => ({
        ...prev,
        totalPosts: postData.totalPosts || counts.reduce((sum, val) => sum + val, 0),
      }));

      setPostGrowthData({
        labels: expectedLabels,
        datasets: [{
          label: 'Bài đăng mới',
          data: counts,
          borderColor: 'rgb(153, 102, 255)',
          backgroundColor: 'rgba(153, 102, 255, 0.2)',
          tension: 0.3,
        }],
      });
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
        <h1><FiBarChart2 className="header-icon" aria-hidden="true"/> Dashboard Admin</h1>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon"><FiUsers aria-hidden="true"/></div>
          <div className="stat-info">
            <h3>Người dùng mới</h3>
            <p className="stat-value">{stats.newUsers.toLocaleString()}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon"><FiCheckCircle aria-hidden="true"/></div>
          <div className="stat-info">
            <h3>Người dùng hoạt động</h3>
            <p className="stat-value">{stats.activeUsers.toLocaleString()}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon"><FiBriefcase aria-hidden="true"/></div>
          <div className="stat-info">
            <h3>Tài khoản Business</h3>
            <p className="stat-value">{stats.businessAccounts.toLocaleString()}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon"><FiDollarSign aria-hidden="true"/></div>
          <div className="stat-info">
            <h3>Doanh thu</h3>
            <p className="stat-value">{formatCurrency(stats.totalRevenue)}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon"><FiFileText aria-hidden="true"/></div>
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
            <h3><FiTrendingUp className="chart-h-icon" aria-hidden="true"/> Tăng trưởng người dùng mới</h3>
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
            <h3><FiBriefcase className="chart-h-icon" aria-hidden="true"/> Tăng trưởng tài khoản Business</h3>
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
            <h3><FiDollarSign className="chart-h-icon" aria-hidden="true"/> Doanh thu từ Business</h3>
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
            <h3><FiFileText className="chart-h-icon" aria-hidden="true"/> Tăng trưởng bài đăng</h3>
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
          <h3><FiSearch className="table-h-icon" aria-hidden="true"/> Top 10 từ khóa tìm kiếm nhiều nhất</h3>
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
          <h3><FiZap className="table-h-icon" aria-hidden="true"/> Top 10 bài đăng tương tác nhiều nhất</h3>
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
                          <div className="post-preview-inner">
                            {post.MediaUrls && post.MediaUrls.length > 0 ? (
                              <img src={post.MediaUrls[0]} alt="thumb" className="post-thumb" />
                            ) : null}
                            <div className="post-preview-text">
                              {post.Content ? post.Content.substring(0, 60) : 'Không có nội dung'}
                              {post.Content && post.Content.length > 60 && '...'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="author-info">
                          <div className="author-meta">
                            {post.AuthorAvatar ? (
                              <img src={post.AuthorAvatar} alt="avatar" className="author-avatar" />
                            ) : (
                              <div className="author-avatar placeholder"></div>
                            )}
                            <div className="author-text">
                              <strong>{post.AuthorName || 'N/A'}</strong>
                              <small>@{post.AuthorUsername || 'unknown'}</small>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="interaction-stats">
                          <span className="reaction-count"><FiHeart aria-hidden="true"/> {post.ReactionCount || 0}</span>
                          <span className="comment-count"><FiMessageSquare aria-hidden="true"/> {post.CommentCount || 0}</span>
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
