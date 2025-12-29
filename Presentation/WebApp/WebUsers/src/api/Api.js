// Auto-detect backend URL (runtime override -> build-time env -> fallback to hostname:5297)
const getApiBaseUrl = () => {
  try {
    if (window && window.__ENV && window.__ENV.VITE_API_URL) {
      return window.__ENV.VITE_API_URL;
    }
  } catch (e) {
    // ignore when window not available
  }

  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }

  const hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
  return `http://${hostname}:5297`;
};

export const API_BASE_URL = getApiBaseUrl();

// Helper để gọi API
const apiCall = async (endpoint, options = {}) => {
  try {
    console.log(`[API-CALL] Making API call to: ${API_BASE_URL}${endpoint}`);
    
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...options.headers,
      },
    });

    console.log(`[API-CALL] Response status: ${response.status}`);

    const responseText = await response.text();
    let result = null;
    if (responseText) {
      try {
        result = JSON.parse(responseText);
      } catch (parseError) {
        console.warn("[API-CALL] Could not parse response as JSON:", parseError);
        throw new Error("Server trả về dữ liệu không hợp lệ");
      }
    }

    if (!response.ok) {
      // Nếu 401 hoặc 403: thử refresh token 1 lần rồi gọi lại
      if ((response.status === 401 || response.status === 403) && !options._retry) {
        try {
          const storedRefresh = localStorage.getItem("refreshToken");
          if (storedRefresh) {
            const rfRes = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
              },
              body: JSON.stringify({ RefreshToken: storedRefresh }),
            });
            const rfText = await rfRes.text();
            let rfJson = null;
            try {
              rfJson = rfText ? JSON.parse(rfText) : null;
            } catch {}
            if (rfRes.ok) {
              const newAccess = rfJson?.AccessToken || rfJson?.accessToken;
              const newRefresh = rfJson?.RefreshToken || rfJson?.refreshToken;
              if (newAccess && newRefresh) {
                localStorage.setItem("accessToken", newAccess);
                localStorage.setItem("refreshToken", newRefresh);

                const authHeaders = {};
                authHeaders["Authorization"] = `Bearer ${newAccess}`;
                const retryRes = await fetch(`${API_BASE_URL}${endpoint}`, {
                  ...options,
                  _retry: true,
                  headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json",
                    ...options.headers,
                    ...authHeaders,
                  },
                });
                const retryText = await retryRes.text();
                let retryJson = null;
                try {
                  retryJson = retryText ? JSON.parse(retryText) : null;
                } catch {}
                if (!retryRes.ok) {
                  const em = retryJson?.message || `HTTP error! status: ${retryRes.status}`;
                  throw new Error(em);
                }
                return retryJson;
              }
            }
          }
        } catch (rfErr) {
          console.error("[API-CALL] Refresh-on-401 failed:", rfErr);
        }
      }
      let errorMessage = result?.message || result?.Message || `HTTP error! status: ${response.status}`;
      console.error("[API-CALL] Error:", errorMessage);
      throw new Error(errorMessage);
    }

    console.log("[API-CALL] API call successful");
    return result;
  } catch (error) {
    console.error("[API-CALL] API Error:", error);
    throw error;
  }
};

// Register
export const register = async (userData) => {
  return apiCall("/api/auth/register", {
    method: "POST",
    body: JSON.stringify(userData),
  });
};

// Verify OTP
export const verifyOtp = async (data) => {
  const result = await apiCall("/api/auth/verify-otp", {
    method: "POST",
    body: JSON.stringify(data),
  });

  const access = result?.AccessToken || result?.accessToken;
  const refresh = result?.RefreshToken || result?.refreshToken;
  if (access && refresh) {
    localStorage.setItem("accessToken", access);
    localStorage.setItem("refreshToken", refresh);
  }

  return result;
};

// Login
export const login = async (credentials) => {
  const result = await apiCall("/api/auth/login", {
    method: "POST",
    body: JSON.stringify(credentials),
  });

  const access = result?.AccessToken || result?.accessToken;
  const refresh = result?.RefreshToken || result?.refreshToken;
  if (access && refresh) {
    localStorage.setItem("accessToken", access);
    localStorage.setItem("refreshToken", refresh);
  }

  return result;
};

// Helper để lấy token
export const getAuthHeaders = () => {
  const token = localStorage.getItem("accessToken");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// Refresh token
export const refreshToken = async () => {
  const refreshToken = localStorage.getItem("refreshToken");
  if (!refreshToken) {
    throw new Error("Không có refresh token");
  }

  const result = await apiCall("/api/auth/refresh", {
    method: "POST",
    body: JSON.stringify({ RefreshToken: refreshToken }),
  });

  const access = result?.AccessToken || result?.accessToken;
  const refresh = result?.RefreshToken || result?.refreshToken;
  if (access && refresh) {
    localStorage.setItem("accessToken", access);
    localStorage.setItem("refreshToken", refresh);
  }

  return result;
};

// Logout
export const logout = async () => {
  const refreshToken = localStorage.getItem("refreshToken");
  if (refreshToken) {
    try {
      await apiCall("/api/auth/logout", {
        method: "POST",
        body: JSON.stringify({ RefreshToken: refreshToken }),
      });
    } catch (error) {
      console.error("Logout error:", error);
    }
  }
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("userInfo");
};

// Forgot Password
export const forgotPassword = async (email) => {
  return apiCall("/api/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({ Email: email }),
  });
};

// Verify Forgot Password OTP
export const verifyForgotPasswordOtp = async (data) => {
  return apiCall("/api/auth/verify-forgot-password-otp", {
    method: "POST",
    body: JSON.stringify(data),
  });
};

// Reset Password
export const resetPassword = async (data) => {
  return apiCall("/api/auth/reset-password", {
    method: "POST",
    body: JSON.stringify(data),
  });
};

// Change Password
export const changePassword = async (data) => {
  const headers = getAuthHeaders();
  return apiCall("/api/auth/change-password", {
    method: "POST",
    body: JSON.stringify(data),
    headers,
  });
};

// Check Authentication
export const isAuthenticated = () => {
  const token = localStorage.getItem("accessToken");
  return !!token;
};

// =================== PROFILE APIs ===================
export const getProfile = async () => {
  const headers = getAuthHeaders();
  const result = await apiCall("/api/users/profile", {
    method: "GET",
    headers,
  });
  return result?.data || null;
};

export const updateProfile = async (payload) => {
  const headers = getAuthHeaders();
  return apiCall("/api/users/profile", {
    method: "PUT",
    headers,
    body: JSON.stringify(payload),
  });
};

export const updateAvatar = async ({ file, createPost = false, postCaption = "", postLocation = "", postPrivacy = "public" }) => {
  const headers = getAuthHeaders();
  const form = new FormData();
  
  form.append("avatarFile", file);
  form.append("CreatePost", createPost ? "true" : "false");
  if (postCaption) form.append("PostCaption", postCaption);
  if (postLocation) form.append("PostLocation", postLocation);
  form.append("PostPrivacy", postPrivacy);

  const fetchHeaders = {};
  if (headers.Authorization) {
    fetchHeaders.Authorization = headers.Authorization;
  }

  const res = await fetch(`${API_BASE_URL}/api/users/profile/avatar`, {
    method: "POST",
    headers: fetchHeaders,
    body: form,
  });

  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {}
  if (!res.ok) {
    throw new Error(json?.message || `Cập nhật avatar thất bại (${res.status})`);
  }
  return json;
};

// =================== BUSINESS UPGRADE APIs ===================
export const requestBusinessUpgrade = async () => {
  const headers = getAuthHeaders();
  return apiCall("/api/Business/upgrade", {
    method: "POST",
    headers,
  });
};

export const checkPaymentStatus = async (paymentId) => {
  const headers = getAuthHeaders();
  return apiCall(`/api/Business/payment-status/${paymentId}`, {
    method: "GET",
    headers,
  });
};

// Restore Session
export const restoreSession = async () => {
  try {
    const access = localStorage.getItem("accessToken");
    const refresh = localStorage.getItem("refreshToken");
    if (!access && !refresh) return { ok: false };

    try {
      const profile = await getProfile();
      if (profile) {
        localStorage.setItem("userInfo", JSON.stringify(profile));
        return { ok: true, profile };
      }
    } catch (e) {
      try {
        await refreshToken();
        const profile = await getProfile();
        if (profile) {
          localStorage.setItem("userInfo", JSON.stringify(profile));
          return { ok: true, profile };
        }
      } catch (e2) {
        return { ok: false };
      }
    }
    return { ok: false };
  } catch {
    return { ok: false };
  }
};

// =================== POSTS APIs ===================
export const createPost = async ({ images = [], video = null, caption = "", location = "", privacy = "public", mentions = [], tags = [] }) => {
  const headers = getAuthHeaders();
  const form = new FormData();
  if (caption) form.append("Caption", caption);
  if (location) form.append("Location", location);
  form.append("Privacy", privacy);

  images.forEach((img) => {
    form.append("Images", img);
  });

  if (video) {
    form.append("Video", video);
  }

  try {
    if (Array.isArray(mentions) && mentions.length > 0) {
      form.append("Mentions", JSON.stringify(mentions));
    }
    if (Array.isArray(tags) && tags.length > 0) {
      form.append("Tags", JSON.stringify(tags));
    }
  } catch (e) {
    console.warn("[API] createPost: failed to append mentions/tags", e);
  }

  const fetchHeaders = {};
  if (headers.Authorization) {
    fetchHeaders.Authorization = headers.Authorization;
  }

  const res = await fetch(`${API_BASE_URL}/api/posts`, {
    method: "POST",
    headers: fetchHeaders,
    body: form,
  });

  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {}
  if (!res.ok) {
    throw new Error(json?.message || `Upload thất bại (${res.status})`);
  }
  return json;
};

export const getFeed = async (page = 1, pageSize = 20) => {
  const headers = getAuthHeaders();
  return apiCall(`/api/posts/feed?page=${page}&pageSize=${pageSize}`, {
    method: "GET",
    headers,
  });
};

export const getReels = async (page = 1, pageSize = 20) => {
  const headers = getAuthHeaders();
  return apiCall(`/api/posts/reels?page=${page}&pageSize=${pageSize}`, {
    method: "GET",
    headers,
  });
};

// Get video posts for Video page
export const getVideos = async (page = 1, pageSize = 20) => {
  const headers = getAuthHeaders();
  return apiCall(`/api/posts/feed?page=${page}&pageSize=${pageSize}`, {
    method: "GET",
    headers,
  });
};

export const getMyPosts = async (page = 1, pageSize = 20) => {
  const headers = getAuthHeaders();
  return apiCall(`/api/posts/me?page=${page}&pageSize=${pageSize}`, {
    method: "GET",
    headers,
  });
};

export const getUserPostsById = async (userId, page = 1, pageSize = 20) => {
  const headers = getAuthHeaders();
  return apiCall(`/api/posts/user/${userId}?page=${page}&pageSize=${pageSize}`, {
    method: "GET",
    headers,
  });
};

export const getPostById = async (postId) => {
  const headers = getAuthHeaders();
  return apiCall(`/api/posts/${postId}`, {
    method: "GET",
    headers,
  });
};

export const getUserProfile = async (userId) => {
  const headers = getAuthHeaders();
  const result = await apiCall(`/api/users/${userId}/profile`, {
    method: "GET",
    headers,
  });
  return result?.data || null;
};

export const getUserByUsername = async (username) => {
  try {
    const headers = getAuthHeaders();
    const result = await apiCall(`/api/users/username/${encodeURIComponent(username)}/profile`, {
      method: "GET",
      headers,
    });
    return result?.data || null;
  } catch (error) {
    console.log("[API] getUserByUsername error:", error);
    return null;
  }
};

// Follow/Unfollow
export const followUser = async (userId) => {
  const headers = getAuthHeaders();
  return apiCall(`/api/users/${userId}/follow`, {
    method: "POST",
    headers,
  });
};

export const unfollowUser = async (userId) => {
  const headers = getAuthHeaders();
  return apiCall(`/api/users/${userId}/follow`, {
    method: "DELETE",
    headers,
  });
};

export const getFollowers = async (userId) => {
  const headers = getAuthHeaders();
  const result = await apiCall(`/api/users/${userId}/followers`, {
    method: "GET",
    headers,
  });
  return result?.data || [];
};

export const getFollowing = async (userId) => {
  const headers = getAuthHeaders();
  const result = await apiCall(`/api/users/${userId}/following`, {
    method: "GET",
    headers,
  });
  return result?.data || [];
};

// Post Actions
export const updatePostPrivacy = async (postId, privacy) => {
  const headers = getAuthHeaders();
  return apiCall(`/api/posts/${postId}/privacy`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({ Privacy: privacy }),
  });
};

export const updatePostCaption = async (postId, caption) => {
  const headers = getAuthHeaders();
  return apiCall(`/api/posts/${postId}/caption`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({ Caption: caption }),
  });
};

export const updatePostTags = async (postId, tags = []) => {
  const headers = getAuthHeaders();
  return apiCall(`/api/posts/${postId}/tags`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({ Tags: tags }),
  });
};

export const deletePost = async (postId) => {
  const headers = getAuthHeaders();
  const res = await fetch(`${API_BASE_URL}/api/posts/${postId}`, {
    method: "DELETE",
    headers: { ...headers, Accept: "application/json" },
  });
  if (!res.ok && res.status !== 204) {
    const text = await res.text();
    let json = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {}
    throw new Error(json?.message || "Không thể xóa bài đăng");
  }
  return true;
};

// ====== REACTIONS API ======
export const addReaction = async (postId, reactionType) => {
  const headers = getAuthHeaders();
  const body = { postId, reactionType };

  const result = await apiCall("/api/reactions", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  return result;
};

export const getReactionSummary = async (postId) => {
  const headers = getAuthHeaders();
  const result = await apiCall(`/api/reactions/post/${postId}/summary`, {
    method: "GET",
    headers,
  });
  const reactionData = result?.data || result;
  return reactionData;
};

// ====== COMMENTS API ======
export const getComments = async (postId, page = 1, pageSize = 20) => {
  const headers = getAuthHeaders();
  return apiCall(`/api/comments/${postId}?page=${page}&pageSize=${pageSize}`, {
    method: "GET",
    headers,
  });
};

export const getCommentCount = async (postId) => {
  const headers = getAuthHeaders();
  const result = await apiCall(`/api/comments/${postId}/count`, {
    method: "GET",
    headers,
  });
  return result?.count || 0;
};

export const addComment = async (postId, content, parentCommentId = null) => {
  const headers = getAuthHeaders();
  return apiCall("/api/comments", {
    method: "POST",
    headers,
    body: JSON.stringify({ postId, content, parentCommentId }),
  });
};

export const updateComment = async (commentId, content) => {
  const headers = getAuthHeaders();
  return apiCall(`/api/comments/${commentId}`, {
    method: "PUT",
    headers,
    body: JSON.stringify({ content }),
  });
};

export const deleteComment = async (commentId) => {
  const headers = getAuthHeaders();
  const res = await fetch(`${API_BASE_URL}/api/comments/${commentId}`, {
    method: "DELETE",
    headers: { ...headers, Accept: "application/json" },
  });
  if (!res.ok && res.status !== 204) {
    const text = await res.text();
    let json = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {}
    throw new Error(json?.message || "Không thể xóa comment");
  }
  return true;
};

export const addCommentReaction = async (commentId, reactionType = "Like") => {
  const headers = getAuthHeaders();
  return apiCall("/api/comments/reactions", {
    method: "POST",
    headers,
    body: JSON.stringify({ commentId, reactionType }),
  });
};

export const removeCommentReaction = async (commentId) => {
  const headers = getAuthHeaders();
  const res = await fetch(`${API_BASE_URL}/api/comments/${commentId}/react`, {
    method: "DELETE",
    headers: { ...headers, Accept: "application/json" },
  });
  if (!res.ok && res.status !== 204) {
    const text = await res.text();
    let json = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {}
    throw new Error(json?.message || "Không thể xóa reaction");
  }
  return true;
};

// =================== STORIES APIs ===================
export const createStory = async ({ media, mediaType = "image", privacy = "public" }) => {
  const headers = getAuthHeaders();
  const form = new FormData();
  form.append("MediaType", mediaType);
  form.append("Privacy", privacy);
  if (media) {
    form.append("Media", media);
  }

  const fetchHeaders = {};
  if (headers.Authorization) {
    fetchHeaders.Authorization = headers.Authorization;
  }

  const res = await fetch(`${API_BASE_URL}/api/stories`, {
    method: "POST",
    headers: fetchHeaders,
    body: form,
  });

  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch (e) {
    console.warn("[createStory] failed to parse json", e);
  }
  if (!res.ok) {
    const serverMsg = json?.message || json?.Message || text || `Tạo story thất bại (${res.status})`;
    throw new Error(serverMsg);
  }
  return json;
};

export const getFeedStories = async () => {
  const headers = getAuthHeaders();
  const res = await fetch(`${API_BASE_URL}/api/stories/feed`, { headers });
  if (!res.ok) throw new Error("Không lấy được feed stories");
  return res.json();
};

export const getMyStories = async () => {
  const headers = getAuthHeaders();
  
  // Get current user ID from localStorage
  const userStr = localStorage.getItem('userInfo');
  if (!userStr) throw new Error("Không tìm thấy thông tin user");
  
  const user = JSON.parse(userStr);
  const userId = user?.user_id ?? user?.userId ?? user?.UserId ?? user?.id;
  if (!userId) throw new Error("Không tìm thấy user ID");
  
  const res = await fetch(`${API_BASE_URL}/api/stories/user/${userId}`, { headers });
  if (!res.ok) throw new Error("Không lấy được stories của bạn");
  return res.json();
};

export const viewStory = async (storyId) => {
  const headers = getAuthHeaders();
  const res = await fetch(`${API_BASE_URL}/api/stories/${storyId}/view`, {
    method: "POST",
    headers,
    body: JSON.stringify({}),
  });
  if (!res.ok) throw new Error("Không ghi được lượt xem");
  return res.json();
};

export const deleteStory = async (storyId) => {
  const headers = getAuthHeaders();
  const res = await fetch(`${API_BASE_URL}/api/stories/${storyId}`, {
    method: "DELETE",
    headers: { ...headers, Accept: "application/json" },
  });
  if (!res.ok && res.status !== 204) {
    const text = await res.text();
    let json = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {}
    throw new Error(json?.message || "Không thể xóa story");
  }
  return true;
};

// ====== SEARCH API ======
export const searchUsers = async (query, page = 1, pageSize = 20) => {
  const headers = getAuthHeaders();
  const encodedQuery = encodeURIComponent(query);
  return apiCall(`/api/search/users?q=${encodedQuery}&page=${page}&pageSize=${pageSize}`, {
    method: "GET",
    headers,
  });
};

export const searchPosts = async (query, page = 1, pageSize = 20) => {
  const headers = getAuthHeaders();
  const encodedQuery = encodeURIComponent(query);
  return apiCall(`/api/search/posts?q=${encodedQuery}&page=${page}&pageSize=${pageSize}`, {
    method: "GET",
    headers,
  });
};

export const getSearchSuggestions = async () => {
  const headers = getAuthHeaders();
  return apiCall("/api/search/suggestions", {
    method: "GET",
    headers,
  });
};

export const instantSearchUsers = async (query, limit = 5) => {
  const headers = getAuthHeaders();
  const encodedQuery = encodeURIComponent(query);
  return apiCall(`/api/search/users?q=${encodedQuery}&page=1&pageSize=${limit}`, {
    method: "GET",
    headers,
  });
};

export const instantSearchPosts = async (query, limit = 5) => {
  const headers = getAuthHeaders();
  const encodedQuery = encodeURIComponent(query);
  return apiCall(`/api/search/posts?q=${encodedQuery}&page=1&pageSize=${limit}`, {
    method: "GET",
    headers,
  });
};

// ============================================
// GROUP CHAT APIs
// ============================================
export const getGroupInfo = async (conversationId) => {
  const headers = getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/api/groupchat/${conversationId}`, {
    method: "GET",
    headers: { ...headers, Accept: "application/json" },
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorJson = null;
    try {
      errorJson = errorText ? JSON.parse(errorText) : null;
    } catch {}
    throw new Error(errorJson?.message || `HTTP error! status: ${response.status}`);
  }

  return await response.json();
};

export const getGroupMembers = async (conversationId) => {
  const headers = getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/api/groupchat/${conversationId}/members`, {
    method: "GET",
    headers: { ...headers, Accept: "application/json" },
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorJson = null;
    try {
      errorJson = errorText ? JSON.parse(errorText) : null;
    } catch {}
    throw new Error(errorJson?.message || `HTTP error! status: ${response.status}`);
  }

  const data = await response.json();
  return data.members || [];
};

export const updateGroupName = async (conversationId, newName) => {
  const headers = getAuthHeaders();
  const res = await fetch(`${API_BASE_URL}/api/groupchat/${conversationId}/name`, {
    method: "PUT",
    headers: {
      ...headers,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ name: newName }),
  });

  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {}
  if (!res.ok) {
    throw new Error(json?.message || `HTTP error! status: ${res.status}`);
  }
  return json;
};

export const inviteToGroup = async (conversationId, userId) => {
  const headers = getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/api/groupchat/${conversationId}/invite`, {
    method: "POST",
    headers: {
      ...headers,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ userId }),
  });

  const responseText = await response.text();
  let result = null;

  try {
    result = responseText ? JSON.parse(responseText) : null;
  } catch (parseError) {
    console.warn("[API] inviteToGroup parse error:", parseError);
    throw new Error("Server trả về dữ liệu không hợp lệ");
  }

  if (!response.ok) {
    throw new Error(result?.message || `HTTP error! status: ${response.status}`);
  }

  return result;
};

export const createGroup = async (groupName, memberIds, invitePermission = "all", maxMembers = null) => {
  const headers = getAuthHeaders();
  const requestBody = {
    name: groupName,
    memberIds: memberIds,
    invitePermission: invitePermission,
  };

  if (maxMembers) {
    requestBody.maxMembers = maxMembers;
  }

  const response = await fetch(`${API_BASE_URL}/api/groupchat/create`, {
    method: "POST",
    headers: {
      ...headers,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(requestBody),
  });

  const responseText = await response.text();
  let result = null;

  try {
    result = responseText ? JSON.parse(responseText) : null;
  } catch (parseError) {
    console.warn("[API] createGroup parse error:", parseError);
    throw new Error("Server trả về dữ liệu không hợp lệ");
  }

  if (!response.ok) {
    throw new Error(result?.message || `HTTP error! status: ${response.status}`);
  }

  return result;
};

export const getMyGroups = async () => {
  const headers = getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/api/groupchat/my-groups`, {
    method: "GET",
    headers: {
      ...headers,
      Accept: "application/json",
    },
  });

  const responseText = await response.text();
  let result = null;

  try {
    result = responseText ? JSON.parse(responseText) : null;
  } catch (parseError) {
    console.warn("[API] getMyGroups parse error:", parseError);
    throw new Error("Server trả về dữ liệu không hợp lệ");
  }

  if (!response.ok) {
    throw new Error(result?.message || `HTTP error! status: ${response.status}`);
  }

  return result.groups || [];
};

// ========================================
// SHARE API
// ========================================
export const createShare = async ({ postId, caption, privacy = "public" }) => {
  const headers = getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/api/shares`, {
    method: "POST",
    headers: {
      ...headers,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      PostId: postId,
      Caption: caption,
      Privacy: privacy,
    }),
  });

  const responseText = await response.text();
  let result = null;

  try {
    result = responseText ? JSON.parse(responseText) : null;
  } catch (parseError) {
    console.warn("[API] createShare parse error:", parseError);
    throw new Error("Server trả về dữ liệu không hợp lệ");
  }

  if (!response.ok) {
    throw new Error(result?.error || result?.message || `HTTP error! status: ${response.status}`);
  }

  return result.data;
};

export const getShareCount = async (postId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/shares/post/${postId}/count`, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    const responseText = await response.text();
    let result = null;

    try {
      result = responseText ? JSON.parse(responseText) : null;
    } catch (parseError) {
      console.warn("[API] getShareCount parse error:", parseError);
      return 0;
    }

    if (!response.ok) {
      console.warn("[API] getShareCount failed:", response.status);
      return 0;
    }

    return result?.count || 0;
  } catch (error) {
    console.log("[API] getShareCount error:", error);
    return 0;
  }
};

// Block/Unblock
export const blockUser = async (userId) => {
  const headers = getAuthHeaders();
  return apiCall(`/api/users/${userId}/block`, {
    method: "POST",
    headers,
  });
};

export const unblockUser = async (userId) => {
  const headers = getAuthHeaders();
  return apiCall(`/api/users/${userId}/block`, {
    method: "DELETE",
    headers,
  });
};

export const getBlockedUsers = async () => {
  const headers = getAuthHeaders();
  const result = await apiCall("/api/users/blocked", {
    method: "GET",
    headers,
  });
  return result?.data || [];
};

// Upload group avatar
export const uploadGroupAvatar = async (conversationId, file) => {
  const headers = getAuthHeaders();
  const form = new FormData();
  form.append("file", file);

  const fetchHeaders = {};
  if (headers.Authorization) {
    fetchHeaders.Authorization = headers.Authorization;
  }

  const res = await fetch(`${API_BASE_URL}/api/groupchat/${conversationId}/avatar`, {
    method: "POST",
    headers: fetchHeaders,
    body: form,
  });

  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch (e) {
    console.warn("[API] uploadGroupAvatar parse error", e);
  }

  if (!res.ok) {
    throw new Error(json?.message || `Upload thất bại (${res.status})`);
  }

  return json;
};
