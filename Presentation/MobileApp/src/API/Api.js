import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImageManipulator from "expo-image-manipulator";
import * as FileSystem from "expo-file-system";
import { Platform } from "react-native";

// Base URL - Chỉ cần thay đổi ở đây khi đổi IP/port
// Nếu test trên máy tính: dùng localhost
// Nếu test trên điện thoại thật: dùng IP của máy tính (xem bằng ipconfig)
export const API_BASE_URL = "http://172.20.10.10:5297"; // Backend đang chạy trên IP máy tính

// Hàm helper để gọi API
const apiCall = async (endpoint, options = {}) => {
  try {
    console.log(`[API-CALL] Making API call to: ${API_BASE_URL}${endpoint}`);
    console.log(`[API-CALL] Options:`, JSON.stringify(options, null, 2));

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...options.headers,
      },
      timeout: 10000, // 10 seconds timeout
    });

    console.log(`[API-CALL] Response status: ${response.status}`);

    // Đọc response text trước
    const responseText = await response.text();
    console.log(`[API-CALL] Response text:`, responseText);

    // Parse JSON nếu có content
    let result = null;
    if (responseText) {
      try {
        result = JSON.parse(responseText);
      } catch (parseError) {
        console.warn(
          "[API-CALL] Could not parse response as JSON:",
          parseError
        );
        // Nếu không parse được JSON, throw error
        throw new Error("Server trả về dữ liệu không hợp lệ");
      }
    }

    if (!response.ok) {
      // Nếu 401: thử refresh token 1 lần rồi gọi lại
      if (response.status === 401 && !options._retry) {
        try {
          const storedRefresh = await AsyncStorage.getItem("refreshToken");
          if (storedRefresh) {
            // refresh trực tiếp, không gọi hàm để tránh vấn đề hoisting
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
                await AsyncStorage.setItem("accessToken", newAccess);
                await AsyncStorage.setItem("refreshToken", newRefresh);

                // Thêm Authorization rồi gọi lại
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
                  const em =
                    retryJson?.message ||
                    `HTTP error! status: ${retryRes.status}`;
                  throw new Error(em);
                }
                return retryJson;
              }
            }
          }
        } catch (rfErr) {
          console.error("[API-CALL] Refresh-on-401 failed:", rfErr);
          // fallthrough -> throw dưới
        }
      }
      // Xử lý error response
      let errorMessage =
        result?.message ||
        result?.Message ||
        `HTTP error! status: ${response.status}`;
      console.error("[API-CALL] Error:", errorMessage);
      throw new Error(errorMessage);
    }

    console.log("[API-CALL] API call successful");
    return result;
  } catch (error) {
    console.error("[API-CALL] API Error:", error);

    // Detect Android native OOM error string and provide a clearer message
    const msg = String(error?.message || error);
    if (
      msg.includes("OutOfMemoryError") ||
      msg.includes("Failed to allocate")
    ) {
      throw new Error(
        "Thiết bị không đủ bộ nhớ để xử lý tệp lớn. Vui lòng thử nén ảnh/video hoặc dùng tệp nhỏ hơn."
      );
    }
    // Xử lý các loại lỗi khác nhau
    if (
      error.name === "TypeError" &&
      error.message.includes("Network request failed")
    ) {
      throw new Error(
        "Không thể kết nối đến server. Vui lòng kiểm tra kết nối mạng."
      );
    } else if (error.name === "AbortError") {
      throw new Error("Yêu cầu bị hủy do timeout.");
    } else {
      throw error;
    }
  }
};

// Compress an image URI using expo-image-manipulator to avoid large uploads / OOM on Android
const compressImage = async (uri, maxWidth = 1080, compress = 0.7) => {
  try {
    if (!uri) return uri;
    console.log("[API] compressImage input:", uri);
    const manip = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: maxWidth } }],
      { compress, format: ImageManipulator.SaveFormat.JPEG }
    );
    console.log("[API] compressImage result:", manip?.uri);
    return manip?.uri || uri;
  } catch (e) {
    console.warn("[API] compressImage failed, fallback to original uri", e);
    return uri;
  }
};

// Helper: Convert iOS ph:// URI to file:// URI (copy to cache)
const normalizeUri = async (uri) => {
  if (!uri) return uri;

  // iOS ph:// URIs need to be copied to cache first
  if (Platform.OS === "ios" && uri.startsWith("ph://")) {
    try {
      const filename = uri.split("/").pop() || "asset";
      const ext = filename.includes(".") ? "" : ".jpg";
      const dest = `${FileSystem.cacheDirectory}${filename}${ext}`;

      // Copy from PhotoKit to cache
      await FileSystem.copyAsync({
        from: uri,
        to: dest,
      });

      console.log(`[API] Converted iOS ph:// URI to: ${dest}`);
      return dest;
    } catch (e) {
      console.warn("[API] Failed to convert iOS ph:// URI:", e);
      return uri; // Fallback
    }
  }

  return uri;
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

  // Lưu token vào AsyncStorage sau khi verify thành công
  const access = result?.AccessToken || result?.accessToken;
  const refresh = result?.RefreshToken || result?.refreshToken;
  if (access && refresh) {
    await AsyncStorage.setItem("accessToken", access);
    await AsyncStorage.setItem("refreshToken", refresh);
  }

  return result;
};

// Login
export const login = async (credentials) => {
  const result = await apiCall("/api/auth/login", {
    method: "POST",
    body: JSON.stringify(credentials),
  });

  // Lưu token
  const access = result?.AccessToken || result?.accessToken;
  const refresh = result?.RefreshToken || result?.refreshToken;
  if (access && refresh) {
    await AsyncStorage.setItem("accessToken", access);
    await AsyncStorage.setItem("refreshToken", refresh);
  }

  return result;
};

// Helper để lấy token (dùng cho các API authenticated sau này)
export const getAuthHeaders = async () => {
  const token = await AsyncStorage.getItem("accessToken");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// Refresh token
export const refreshToken = async () => {
  const refreshToken = await AsyncStorage.getItem("refreshToken");
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
    await AsyncStorage.setItem("accessToken", access);
    await AsyncStorage.setItem("refreshToken", refresh);
  }

  return result;
};

// Logout
export const logout = async () => {
  const refreshToken = await AsyncStorage.getItem("refreshToken");
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
  await AsyncStorage.multiRemove(["accessToken", "refreshToken", "userInfo"]);
};

// =================== PROFILE APIs ===================
export const getProfile = async () => {
  const headers = await getAuthHeaders();
  const result = await apiCall("/api/users/profile", {
    method: "GET",
    headers,
  });
  // API trả { message, data }
  return result?.data || null;
};

export const updateProfile = async (payload) => {
  const headers = await getAuthHeaders();
  return apiCall("/api/users/profile", {
    method: "PUT",
    headers,
    body: JSON.stringify(payload),
  });
};

export const updateAvatar = async ({
  uri,
  name = "avatar.jpg",
  type = "image/jpeg",
  createPost = false,
  postCaption = "",
  postLocation = "",
  postPrivacy = "public",
}) => {
  const headers = await getAuthHeaders();
  const form = new FormData();
  // Compress avatar to reduce memory and upload size
  try {
    const compressed = await compressImage(uri, 800, 0.75);
    uri = compressed || uri;
  } catch (e) {
    console.warn("[API] updateAvatar compress failed", e);
  }
  form.append("avatarFile", { uri, name, type });
  form.append("CreatePost", createPost ? "true" : "false");
  if (postCaption) form.append("PostCaption", postCaption);
  if (postLocation) form.append("PostLocation", postLocation);
  form.append("PostPrivacy", postPrivacy);

  const res = await fetch(`${API_BASE_URL}/api/users/profile/avatar`, {
    method: "POST",
    headers: {
      ...headers,
      Accept: "application/json",
    },
    body: form,
  });

  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {}
  if (!res.ok) {
    throw new Error(
      json?.message || `Cập nhật avatar thất bại (${res.status})`
    );
  }
  // trả { message, data: { avatarUrl } }
  return json;
};

// Quên mật khẩu
export const forgotPassword = async (email) => {
  console.log("[FORGOT-PASSWORD] Calling API with email:", email);
  return apiCall("/api/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({ Email: email }),
  });
};

// Xác thực OTP quên mật khẩu
export const verifyForgotPasswordOtp = async (data) => {
  console.log("[VERIFY-FORGOT-PASSWORD-OTP] Calling API with data:", data);
  return apiCall("/api/auth/verify-forgot-password-otp", {
    method: "POST",
    body: JSON.stringify(data),
  });
};

// Reset mật khẩu
export const resetPassword = async (data) => {
  console.log("[RESET-PASSWORD] Calling API with data:", {
    Email: data.Email,
    NewPassword: "***",
  });
  return apiCall("/api/auth/reset-password", {
    method: "POST",
    body: JSON.stringify(data),
  });
};

// Đổi mật khẩu
export const changePassword = async (data) => {
  const headers = await getAuthHeaders();
  return apiCall("/api/auth/change-password", {
    method: "POST",
    body: JSON.stringify(data),
    headers,
  });
};

// Xác thực OTP đổi mật khẩu
export const verifyChangePasswordOtp = async (data) => {
  const headers = await getAuthHeaders();
  return apiCall("/api/auth/verify-change-password-otp", {
    method: "POST",
    body: JSON.stringify(data),
    headers,
  });
};

// Helper functions
export const isAuthenticated = async () => {
  try {
    const token = await AsyncStorage.getItem("accessToken");
    return !!token;
  } catch (error) {
    console.error("Error checking authentication:", error);
    return false;
  }
};

// Auto refresh token khi token hết hạn
export const setupTokenRefresh = () => {
  // Kiểm tra token mỗi 5 phút
  setInterval(async () => {
    try {
      const refreshTokenValue = await AsyncStorage.getItem("refreshToken");
      if (refreshTokenValue) {
        await refreshToken();
      }
    } catch (error) {
      console.error("Token refresh failed:", error);
      await logout();
    }
  }, 5 * 60 * 1000); // 5 phút
};

// Khởi tạo/khôi phục session khi mở app: cố lấy profile, nếu 401 thì refresh rồi thử lại
export const restoreSession = async () => {
  try {
    const access = await AsyncStorage.getItem("accessToken");
    const refresh = await AsyncStorage.getItem("refreshToken");
    if (!access && !refresh) return { ok: false };

    // Thử lấy profile bằng access token hiện tại
    try {
      const profile = await getProfile();
      if (profile) {
        await AsyncStorage.setItem("userInfo", JSON.stringify(profile));
        return { ok: true, profile };
      }
    } catch (e) {
      // Nếu lỗi có thể do hết hạn, thử refresh
      try {
        await refreshToken();
        const profile = await getProfile();
        if (profile) {
          await AsyncStorage.setItem("userInfo", JSON.stringify(profile));
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
// Tạo bài đăng (multipart/form-data): images[] (nhiều), video (1), Caption, Location, Privacy
export const createPost = async ({
  images = [],
  video = null,
  caption = "",
  location = "",
  privacy = "public",
}) => {
  const headers = await getAuthHeaders();
  const form = new FormData();
  if (caption) form.append("Caption", caption);
  if (location) form.append("Location", location);
  form.append("Privacy", privacy);

  // Compress images before append to avoid OOM on Android
  for (let idx = 0; idx < images.length; idx++) {
    const img = images[idx];
    try {
      // Normalize iOS ph:// URIs first
      const normalizedUri = await normalizeUri(img.uri);
      const compressed = await compressImage(normalizedUri, 1080, 0.75);
      form.append("Images", {
        uri: compressed || normalizedUri,
        name: img.name || `image_${idx}.jpg`,
        type: img.type || "image/jpeg",
      });
    } catch (e) {
      console.warn("[API] createPost compress image failed", e);
      const normalizedUri = await normalizeUri(img.uri);
      form.append("Images", {
        uri: normalizedUri,
        name: img.name || `image_${idx}.jpg`,
        type: img.type || "image/jpeg",
      });
    }
  }

  if (video) {
    // Normalize iOS ph:// URIs for video too
    const normalizedVideoUri = await normalizeUri(video.uri);
    form.append("Video", {
      uri: normalizedVideoUri,
      name: video.name || "video.mp4",
      type: video.type || "video/mp4",
    });
  }

  const res = await fetch(`${API_BASE_URL}/api/posts`, {
    method: "POST",
    headers: {
      ...headers,
      // KHÔNG set 'Content-Type' để RN tự thêm boundary của multipart
      Accept: "application/json",
    },
    body: form,
  });

  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    /* noop */
  }
  if (!res.ok) {
    throw new Error(json?.message || `Upload thất bại (${res.status})`);
  }
  return json;
};

export const getFeed = async (page = 1, pageSize = 20) => {
  const headers = await getAuthHeaders();
  return apiCall(`/api/posts/feed?page=${page}&pageSize=${pageSize}`, {
    method: "GET",
    headers,
  });
};

export const getReels = async (page = 1, pageSize = 20) => {
  const headers = await getAuthHeaders();
  return apiCall(`/api/posts/reels?page=${page}&pageSize=${pageSize}`, {
    method: "GET",
    headers,
  });
};

export const getAllReels = async () => {
  const headers = await getAuthHeaders();
  return apiCall("/api/posts/reels/all", {
    method: "GET",
    headers,
  });
};

// Get reels from users that current user is following
export const getFollowingReels = async (page = 1, pageSize = 20) => {
  const headers = await getAuthHeaders();
  return apiCall(
    `/api/posts/reels/following?page=${page}&pageSize=${pageSize}`,
    {
      method: "GET",
      headers,
    }
  );
};

export const getMyPosts = async (page = 1, pageSize = 20) => {
  const headers = await getAuthHeaders();
  return apiCall(`/api/posts/me?page=${page}&pageSize=${pageSize}`, {
    method: "GET",
    headers,
  });
};

// Lấy bài đăng của 1 user bất kỳ (public/followers/private sẽ do backend lọc theo quyền)
export const getUserPostsById = async (userId, page = 1, pageSize = 20) => {
  const headers = await getAuthHeaders();
  return apiCall(
    `/api/posts/user/${userId}?page=${page}&pageSize=${pageSize}`,
    {
      method: "GET",
      headers,
    }
  );
};

// Lấy thông tin profile public của user khác
export const getUserProfile = async (userId) => {
  const headers = await getAuthHeaders();
  const result = await apiCall(`/api/users/${userId}/profile`, {
    method: "GET",
    headers,
  });
  return result?.data || null;
};

// Follow user
export const followUser = async (userId) => {
  const headers = await getAuthHeaders();
  return apiCall(`/api/users/${userId}/follow`, {
    method: "POST",
    headers,
  });
};

// Unfollow user
export const unfollowUser = async (userId) => {
  const headers = await getAuthHeaders();
  return apiCall(`/api/users/${userId}/follow`, {
    method: "DELETE",
    headers,
  });
};

// Get followers list
export const getFollowers = async (userId) => {
  const headers = await getAuthHeaders();
  const result = await apiCall(`/api/users/${userId}/followers`, {
    method: "GET",
    headers,
  });
  return result?.data || [];
};

// Get following list
export const getFollowing = async (userId) => {
  const headers = await getAuthHeaders();
  const result = await apiCall(`/api/users/${userId}/following`, {
    method: "GET",
    headers,
  });
  return result?.data || [];
};

// Cập nhật quyền riêng tư của bài đăng
export const updatePostPrivacy = async (postId, privacy) => {
  const headers = await getAuthHeaders();
  return apiCall(`/api/posts/${postId}/privacy`, {
    method: "PATCH",
    headers: {
      ...headers,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ Privacy: privacy }),
  });
};

// Cập nhật caption bài đăng
export const updatePostCaption = async (postId, caption) => {
  const headers = await getAuthHeaders();
  return apiCall(`/api/posts/${postId}/caption`, {
    method: "PATCH",
    headers: {
      ...headers,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ Caption: caption }),
  });
};

// Xóa bài đăng
export const deletePost = async (postId) => {
  const headers = await getAuthHeaders();
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
// Thêm hoặc cập nhật reaction cho bài đăng
// reactionType: 1=Like, 2=Love, 3=Haha, 4=Wow, 5=Sad, 6=Angry
export const addReaction = async (postId, reactionType) => {
  const headers = await getAuthHeaders();
  return apiCall("/api/reactions", {
    method: "POST",
    headers: {
      ...headers,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ postId, reactionType }),
  });
};

// Lấy thống kê reactions của bài đăng
export const getReactionSummary = async (postId) => {
  const headers = await getAuthHeaders();
  return apiCall(`/api/reactions/post/${postId}/summary`, {
    method: "GET",
    headers: {
      ...headers,
      Accept: "application/json",
    },
  });
};
