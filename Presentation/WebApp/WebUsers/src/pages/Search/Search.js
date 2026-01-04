import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { IoSearch, IoClose, IoTimeOutline, IoPersonOutline, IoDocumentTextOutline, IoTrendingUp, IoArrowUpOutline } from 'react-icons/io5';
import NavigationBar from '../../components/NavigationBar';
import SearchUserItem from './SearchUserItem';
import SearchPostItem from './SearchPostItem';
import { 
  searchUsers, 
  searchPosts, 
  getSearchSuggestions,
  instantSearchUsers,
  instantSearchPosts 
} from '../../api/AppApi';
import './Search.css';

const SEARCH_HISTORY_KEY = 'search_history';
const MAX_HISTORY_ITEMS = 10;

export default function Search() {
  const navigate = useNavigate();
  
  const [searchText, setSearchText] = useState('');
  const [searchHistory, setSearchHistory] = useState([]);
  const [searchMode, setSearchMode] = useState('all'); // 'all', 'users', 'posts'
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState({
    users: [],
    posts: []
  });
  const [suggestions, setSuggestions] = useState({
    trendingHashtags: [],
    popularUsers: []
  });
  const [hasSearched, setHasSearched] = useState(false);
  
  // States for instant suggestions
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [instantSuggestions, setInstantSuggestions] = useState({
    users: [],
    posts: []
  });
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  // Load search history from localStorage
  useEffect(() => {
    loadSearchHistory();
    loadSuggestions();
  }, []);

  const loadSearchHistory = () => {
    try {
      const history = localStorage.getItem(SEARCH_HISTORY_KEY);
      if (history) {
        setSearchHistory(JSON.parse(history));
      }
    } catch (error) {
      console.error('Error loading search history:', error);
    }
  };

  const loadSuggestions = async () => {
    try {
      const result = await getSearchSuggestions();
      if (result?.data) {
        setSuggestions({
          trendingHashtags: result.data.TrendingHashtags || result.data.trendingHashtags || [],
          popularUsers: result.data.PopularUsers || result.data.popularUsers || []
        });
      }
    } catch (error) {
      console.error('Error loading suggestions:', error);
    }
  };

  const saveToHistory = (query) => {
    try {
      const trimmed = query.trim();
      if (!trimmed) return;

      let newHistory = [trimmed, ...searchHistory.filter(h => h !== trimmed)];
      newHistory = newHistory.slice(0, MAX_HISTORY_ITEMS);

      setSearchHistory(newHistory);
      localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(newHistory));
    } catch (error) {
      console.error('Error saving search history:', error);
    }
  };

  const removeHistoryItem = (item) => {
    try {
      const newHistory = searchHistory.filter(h => h !== item);
      setSearchHistory(newHistory);
      localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(newHistory));
    } catch (error) {
      console.error('Error removing history item:', error);
    }
  };

  const clearAllHistory = () => {
    try {
      setSearchHistory([]);
      localStorage.removeItem(SEARCH_HISTORY_KEY);
    } catch (error) {
      console.error('Error clearing history:', error);
    }
  };

  // Helper function to filter users by first letter
  const filterUsersByFirstLetter = (users, searchTerm) => {
    if (!searchTerm || !searchTerm.startsWith('@')) {
      return users;
    }

    const searchChar = searchTerm.substring(1).toLowerCase();
    if (!searchChar) {
      return users;
    }

    return users.filter(user => {
      const fullName = (user.fullName || user.FullName || '').toLowerCase();
      const userName = (user.userName || user.UserName || '').toLowerCase();
      return fullName.startsWith(searchChar) || userName.startsWith(searchChar);
    });
  };

  // Instant search for suggestions
  const performInstantSearch = useCallback(async (query) => {
    if (!query.trim() || query.length < 2) {
      setShowSuggestions(false);
      setInstantSuggestions({ users: [], posts: [] });
      return;
    }

    setLoadingSuggestions(true);
    setShowSuggestions(true);

    try {
      const trimmedQuery = query.trim();
      
      if (trimmedQuery.startsWith('@')) {
        // Only search users
        const result = await instantSearchUsers(trimmedQuery, 20);
        const filteredUsers = filterUsersByFirstLetter(
          result?.data?.Results || result?.data?.results || [],
          trimmedQuery
        );
        setInstantSuggestions({
          users: filteredUsers.slice(0, 8),
          posts: []
        });
      } else if (trimmedQuery.startsWith('#')) {
        // Only search posts
        const result = await instantSearchPosts(trimmedQuery, 8);
        setInstantSuggestions({
          users: [],
          posts: result?.data?.Results || result?.data?.results || []
        });
      } else {
        // Search both
        const [usersResult, postsResult] = await Promise.all([
          instantSearchUsers(trimmedQuery, 10),
          instantSearchPosts(trimmedQuery, 4)
        ]);

        const allUsers = usersResult?.data?.Results || usersResult?.data?.results || [];
        const filteredUsers = filterUsersByFirstLetter(allUsers, `@${trimmedQuery}`);

        setInstantSuggestions({
          users: filteredUsers.slice(0, 4),
          posts: postsResult?.data?.Results || postsResult?.data?.results || []
        });
      }
    } catch (error) {
      console.error('Error performing instant search:', error);
    } finally {
      setLoadingSuggestions(false);
    }
  }, []);

  // Main search function
  const performSearch = useCallback(async (query) => {
    if (!query.trim()) {
      setSearchResults({ users: [], posts: [] });
      setHasSearched(false);
      setShowSuggestions(false);
      return;
    }

    setSearching(true);
    setHasSearched(true);
    setShowSuggestions(false);

    try {
      const trimmedQuery = query.trim();
      
      if (trimmedQuery.startsWith('@')) {
        // Search users
        const result = await searchUsers(trimmedQuery, 1, 50);
        const filteredUsers = filterUsersByFirstLetter(
          result?.data?.Results || result?.data?.results || [],
          trimmedQuery
        );
        setSearchResults({
          users: filteredUsers.slice(0, 20),
          posts: []
        });
        setSearchMode('users');
      } else if (trimmedQuery.startsWith('#')) {
        // Search posts with hashtag
        const result = await searchPosts(trimmedQuery, 1, 20);
        setSearchResults({
          users: [],
          posts: result?.data?.Results || result?.data?.results || []
        });
        setSearchMode('posts');
      } else {
        // Search both
        const [usersResult, postsResult] = await Promise.all([
          searchUsers(trimmedQuery, 1, 20),
          searchPosts(trimmedQuery, 1, 10)
        ]);

        const allUsers = usersResult?.data?.Results || usersResult?.data?.results || [];
        const filteredUsers = filterUsersByFirstLetter(allUsers, `@${trimmedQuery}`);

        setSearchResults({
          users: filteredUsers.slice(0, 10),
          posts: postsResult?.data?.Results || postsResult?.data?.results || []
        });
        setSearchMode('all');
      }

      saveToHistory(trimmedQuery);
    } catch (error) {
      console.error('Error performing search:', error);
    } finally {
      setSearching(false);
    }
  }, []);

  // Debounce for instant suggestions
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchText && searchText.length >= 2) {
        performInstantSearch(searchText);
      } else {
        setShowSuggestions(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchText, performInstantSearch]);

  // Debounce for main search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchText && searchText.length >= 3) {
        performSearch(searchText);
      }
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [searchText, performSearch]);

  const handleSuggestionSelect = (item, type) => {
    if (type === 'user') {
      navigate(`/user/${item.userId || item.UserId}`);
    } else if (type === 'post') {
      // Navigate to home
      navigate('/');
    }

    const searchQuery = type === 'user' 
      ? `@${item.userName || item.UserName || ''}`
      : (item.caption || item.Caption || '').substring(0, 50);

    setSearchText(searchQuery);
    setShowSuggestions(false);
    saveToHistory(searchQuery);
  };

  const handleSuggestionPress = (suggestion) => {
    setSearchText(suggestion);
    setShowSuggestions(false);
    performSearch(suggestion);
  };

  const handleClearSearch = () => {
    setSearchText('');
    setSearchResults({ users: [], posts: [] });
    setHasSearched(false);
    setShowSuggestions(false);
  };

  // Render instant suggestions
  const renderInstantSuggestions = () => {
    if (!showSuggestions || (!instantSuggestions.users.length && !instantSuggestions.posts.length && !loadingSuggestions)) {
      return null;
    }

    return (
      <div className="suggestions-container">
        {loadingSuggestions && (
          <div className="suggestion-item">
            <div className="suggestion-loading">Đang tìm kiếm...</div>
          </div>
        )}

        {/* User suggestions */}
        {instantSuggestions.users.map((user, index) => (
          <div
            key={`user-${user.userId || user.UserId || index}`}
            className="suggestion-item"
            onClick={() => handleSuggestionSelect(user, 'user')}
          >
            <div className="suggestion-icon">
              <IoPersonOutline size={20} />
            </div>
            <div className="suggestion-content">
              <div className="suggestion-main-text">
                {user.fullName || user.FullName || 'Unknown User'}
              </div>
              <div className="suggestion-sub-text">
                @{user.userName || user.UserName || 'unknown'}
              </div>
            </div>
            <IoArrowUpOutline className="suggestion-arrow" size={16} />
          </div>
        ))}

        {/* Post suggestions */}
        {instantSuggestions.posts.map((post, index) => (
          <div
            key={`post-${post.postId || post.PostId || index}`}
            className="suggestion-item"
            onClick={() => handleSuggestionSelect(post, 'post')}
          >
            <div className="suggestion-icon">
              <IoDocumentTextOutline size={20} />
            </div>
            <div className="suggestion-content">
              <div className="suggestion-main-text">
                {(post.caption || post.Caption || 'Bài viết không có caption').substring(0, 50)}
                {(post.caption || post.Caption || '').length > 50 ? '...' : ''}
              </div>
              <div className="suggestion-sub-text">
                bởi {post.userFullName || post.UserFullName || 'Unknown User'}
              </div>
            </div>
            <IoArrowUpOutline className="suggestion-arrow" size={16} />
          </div>
        ))}
      </div>
    );
  };

  // Render search results
  const renderSearchResults = () => {
    if (searching) {
      return (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <div className="loading-text">Đang tìm kiếm...</div>
        </div>
      );
    }

    if (!hasSearched) {
      return null;
    }

    const hasResults = searchResults.users.length > 0 || searchResults.posts.length > 0;

    if (!hasResults) {
      return (
        <div className="empty-state">
          <IoSearch size={64} color="#D1D5DB" />
          <div className="empty-text">Không tìm thấy kết quả</div>
          <div className="empty-subtext">Thử tìm kiếm với từ khóa khác</div>
        </div>
      );
    }

    return (
      <div className="results-container">
        {/* Users Results */}
        {searchResults.users.length > 0 && (
          <div className="result-section">
            <div className="section-header">
              <IoPersonOutline size={20} />
              <div className="section-title">Người dùng ({searchResults.users.length})</div>
            </div>
            {searchResults.users.map((user, index) => (
              <SearchUserItem
                key={user.userId || user.UserId || index}
                user={user}
                onPress={() => navigate(`/user/${user.userId || user.UserId}`)}
              />
            ))}
          </div>
        )}

        {/* Posts Results */}
        {searchResults.posts.length > 0 && (
          <div className="result-section">
            <div className="section-header">
              <IoDocumentTextOutline size={20} />
              <div className="section-title">Bài đăng ({searchResults.posts.length})</div>
            </div>
            {searchResults.posts.map((post, index) => (
              <SearchPostItem
                key={post.postId || post.PostId || index}
                post={post}
                onPress={() => navigate('/')}
              />
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="search-page">
      <NavigationBar />
      
      <div className="search-content">
        {/* Search Header */}
        <div className="search-header">
          <div className="search-bar-container">
            <IoSearch className="search-icon" size={20} />
            <input
              type="text"
              className="search-input"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Tìm kiếm (@ cho user, # cho hashtag)"
              onFocus={() => {
                if (searchText.length >= 2) {
                  setShowSuggestions(true);
                }
              }}
            />
            {searchText.length > 0 && (
              <button className="clear-button" onClick={handleClearSearch}>
                <IoClose size={20} />
              </button>
            )}
          </div>
        </div>

        {/* Instant Suggestions */}
        {renderInstantSuggestions()}

        {/* Main Content */}
        <div className="search-main-content">
          {searchText.length === 0 ? (
            // Recent Searches & Suggestions
            <div className="recent-section">
              {/* Search History */}
              {searchHistory.length > 0 && (
                <>
                  <div className="recent-header">
                    <div className="recent-title">Tìm kiếm gần đây</div>
                    <button className="clear-all-btn" onClick={clearAllHistory}>
                      Xóa tất cả
                    </button>
                  </div>

                  <div className="history-list">
                    {searchHistory.map((item, index) => (
                      <div key={index} className="history-item" onClick={() => setSearchText(item)}>
                        <IoTimeOutline size={20} color="#6B7280" />
                        <div className="history-text">{item}</div>
                        <button 
                          className="remove-button"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeHistoryItem(item);
                          }}
                        >
                          <IoClose size={20} />
                        </button>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* Trending Hashtags */}
              {suggestions.trendingHashtags.length > 0 && (
                <>
                  <div className="section-header">
                    <IoTrendingUp size={20} />
                    <div className="section-title">Hashtag thịnh hành</div>
                  </div>
                  <div className="tags-container">
                    {suggestions.trendingHashtags.map((tag, index) => (
                      <button
                        key={index}
                        className="tag-chip"
                        onClick={() => handleSuggestionPress(tag)}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </>
              )}

              {searchHistory.length === 0 && suggestions.trendingHashtags.length === 0 && (
                <div className="empty-state">
                  <IoSearch size={64} color="#D1D5DB" />
                  <div className="empty-text">Bắt đầu tìm kiếm</div>
                  <div className="empty-subtext">
                    Sử dụng @ để tìm người dùng
                    <br />
                    Sử dụng # để tìm hashtag
                  </div>
                </div>
              )}
            </div>
          ) : (
            // Search Results
            renderSearchResults()
          )}
        </div>
      </div>
    </div>
  );
}
