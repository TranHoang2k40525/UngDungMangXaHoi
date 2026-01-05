import { API_BASE_URL } from './AuthApi';

// Re-export API_BASE_URL for other components
export { API_BASE_URL };

async function authedApiCall(endpoint, options = {}) {
  const token = localStorage.getItem('accessToken');
  const url = `${API_BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...(options.headers || {}),
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(url, { ...options, headers });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    throw new Error('Server trả về dữ liệu không hợp lệ');
  }

  if (!res.ok) {
    const message = json?.message || json?.Message || `HTTP ${res.status}`;
    throw new Error(message);
  }

  return json;
}

export async function getFeed(page = 1, pageSize = 20) {
  const res = await authedApiCall(`/api/posts/feed?page=${page}&pageSize=${pageSize}`, {
    method: 'GET',
  });
  return res;
}

export async function getProfile() {
  const res = await authedApiCall('/api/users/profile', { method: 'GET' });
  return res?.data || null;
}

export async function updateProfile(payload) {
  const res = await authedApiCall('/api/users/profile', {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  return res;
}

export async function searchUsers(query, page = 1, pageSize = 20) {
  const encoded = encodeURIComponent(query);
  const res = await authedApiCall(`/api/search/users?q=${encoded}&page=${page}&pageSize=${pageSize}`, {
    method: 'GET',
  });
  return res;
}

export async function searchPosts(query, page = 1, pageSize = 20) {
  const encoded = encodeURIComponent(query);
  const res = await authedApiCall(`/api/search/posts?q=${encoded}&page=${page}&pageSize=${pageSize}`, {
    method: 'GET',
  });
  return res;
}

export async function getSearchSuggestions() {
  const res = await authedApiCall('/api/search/suggestions', {
    method: 'GET',
  });
  return res;
}

export async function instantSearchUsers(query, limit = 5) {
  const encoded = encodeURIComponent(query);
  const res = await authedApiCall(`/api/search/users?q=${encoded}&page=1&pageSize=${limit}`, {
    method: 'GET',
  });
  return res;
}

export async function instantSearchPosts(query, limit = 5) {
  const encoded = encodeURIComponent(query);
  const res = await authedApiCall(`/api/search/posts?q=${encoded}&page=1&pageSize=${limit}`, {
    method: 'GET',
  });
  return res;
}

export async function getNotifications(skip = 0, take = 20) {
  const res = await authedApiCall(`/api/notifications?skip=${skip}&take=${take}`, {
    method: 'GET',
  });
  return res?.data || [];
}
