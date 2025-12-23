import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { searchUsers } from '../../api/AppApi';
import NavigationBar from '../../components/NavigationBar';
import './Search.css';

export default function Search() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const handle = setTimeout(() => {
      if (query.trim()) {
        handleSearch();
      } else {
        setResults([]);
        setError('');
      }
    }, 400);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const handleSearch = async () => {
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

  return (
    <div className="search-container">
      <div className="search-box">
        <input
          type="text"
          placeholder="Tìm kiếm người dùng..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      {loading && <div className="search-status">Đang tìm kiếm...</div>}
      {error && !loading && <div className="search-error">{error}</div>}
      <ul className="search-results">
        {results.map((u) => (
          <li key={u.id || u.userId} className="search-item">
            <div className="search-avatar">
              {(u.userName || u.username || u.fullName || '?')
                .toString()
                .charAt(0)
                .toUpperCase()}
            </div>
            <div>
              <div className="search-name">{u.fullName || u.displayName || 'Người dùng'}</div>
              <div className="search-username">@{u.userName || u.username}</div>
            </div>
          </li>
        ))}
        {!loading && !error && results.length === 0 && query.trim() && (
          <li className="search-empty">Không có kết quả phù hợp.</li>
        )}

      </ul>
      <NavigationBar />
    </div>
  );
}
