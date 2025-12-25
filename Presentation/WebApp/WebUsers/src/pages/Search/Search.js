import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { searchUsers } from '../../Api/AppApi';
import NavigationBar from '../../Components/NavigationBar';
import './Search.css';

export default function Search() {
  const navigate = useNavigate();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async () => {
    if (!query.trim()) return;

    try {
      setLoading(true);
      setError('');
      const res = await searchUsers(query.trim(), 1, 20);
      setResults(res?.data || res?.users || []);
    } catch (e) {
      setError(e.message || 'Không tìm kiếm được');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="search-container">

      {/* SEARCH INPUT */}
      <div className="search-box">
        <div className="search-input-wrapper">
          <input
            type="text"
            placeholder="Tìm kiếm người dùng"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />

          <button
            className="search-btn"
            onClick={handleSearch}
            disabled={!query.trim()}
          >
            {/* ICON KÍNH LÚP ĐEN TRẮNG */}
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="black"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </button>
        </div>

        {/* ⬇⬇⬇ Ô GỢI Ý – LUÔN TỒN TẠI */}
        <div className="search-suggestion-box">
          {loading && <div className="search-status">Đang tìm kiếm...</div>}

          {!loading && error && (
            <div className="search-error">{error}</div>
          )}

          {!loading && !error && results.length === 0 && !query.trim() && (
            <div className="search-empty">
              Nhập từ khóa để tìm người dùng
            </div>
          )}

          {!loading && !error && results.length === 0 && query.trim() && (
            <div className="search-empty">
              Không có kết quả phù hợp
            </div>
          )}

          {!loading && !error && results.length > 0 && (
            <ul className="search-results">
              {results.map((u) => (
                <li
                  key={u.id || u.userId}
                  className="search-item"
                  onClick={() =>
                    navigate(`/profile/${u.userId || u.id}`)
                  }
                >
                  <div className="search-avatar">
                    {(u.userName || u.username || u.fullName || '?')
                      .charAt(0)
                      .toUpperCase()}
                  </div>

                  <div>
                    <div className="search-name">
                      {u.fullName || u.displayName || 'Người dùng'}
                    </div>
                    <div className="search-username">
                      @{u.userName || u.username}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <NavigationBar />
    </div>
  );
}
