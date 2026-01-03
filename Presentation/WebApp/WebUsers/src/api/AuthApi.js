export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5297';

async function apiCall(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const defaultHeaders = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };

  const res = await fetch(url, {
    ...options,
    headers: {
      ...defaultHeaders,
      ...(options.headers || {}),
    },
  });

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

function storeTokensFromResult(result) {
  const access = result?.AccessToken || result?.accessToken || result?.data?.accessToken;
  const refresh = result?.RefreshToken || result?.refreshToken || result?.data?.refreshToken;
  if (access && refresh) {
    localStorage.setItem('accessToken', access);
    localStorage.setItem('refreshToken', refresh);
  }
}

export async function registerApi(userData) {
  try {
    const res = await apiCall('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
    return { success: true, data: res };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function verifyOtpApi(data) {
  try {
    const res = await apiCall('/api/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    storeTokensFromResult(res);
    return { success: true, data: res };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function loginApi(credentials) {
  try {
    const res = await apiCall('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
    storeTokensFromResult(res);
    return { success: true, data: res };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function refreshTokenApi() {
  try {
    const rt = localStorage.getItem('refreshToken');
    if (!rt) throw new Error('Không có refresh token');
    const res = await apiCall('/api/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ RefreshToken: rt }),
    });
    storeTokensFromResult(res);
    return { success: true, data: res };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function logoutApi() {
  try {
    const rt = localStorage.getItem('refreshToken');
    if (rt) {
      await apiCall('/api/auth/logout', {
        method: 'POST',
        body: JSON.stringify({ RefreshToken: rt }),
      });
    }
  } catch (error) {
    // ignore
  }
}

export async function getProfileApi() {
  const token = localStorage.getItem('accessToken');
  if (!token) return null;

  const res = await apiCall('/api/users/profile', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return res?.data || null;
}

export async function forgotPasswordApi(email) {
  try {
    const res = await apiCall('/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ Email: email }),
    });
    return { success: true, data: res };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function verifyForgotPasswordOtpApi(data) {
  try {
    const res = await apiCall('/api/auth/verify-forgot-password-otp', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return { success: true, data: res };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function resetPasswordApi(data) {
  try {
    const res = await apiCall('/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return { success: true, data: res };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function changePasswordApi(data) {
  try {
    const token = localStorage.getItem('accessToken');
    if (!token) throw new Error('Bạn cần đăng nhập lại');
    const res = await apiCall('/api/auth/change-password', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(data),
    });
    return { success: true, data: res };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function verifyChangePasswordOtpApi(data) {
  try {
    const token = localStorage.getItem('accessToken');
    if (!token) throw new Error('Bạn cần đăng nhập lại');
    const res = await apiCall('/api/auth/verify-change-password-otp', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(data),
    });
    return { success: true, data: res };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
