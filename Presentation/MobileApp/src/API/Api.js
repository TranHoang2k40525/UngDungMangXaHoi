import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImageManipulator from "expo-image-manipulator";
import * as FileSystem from "expo-file-system/legacy";
import * as MediaLibrary from "expo-media-library";
import { Platform } from "react-native";

// Base URL - Chỉ cần thay đổi ở đây khi đổi IP/port
// Nếu test trên máy tính: dùng localhost
// Nếu test trên điện thoại thật: dùng IP của máy tính (xem bằng ipconfig)
export const API_BASE_URL = "http://10.62.201.105:5297"; // Backend đang chạy trên IP máy tính

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
      // Nếu 401 hoặc 403: thử refresh token 1 lần rồi gọi lại
      if (
        (response.status === 401 || response.status === 403) &&
        !options._retry
      ) {
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

  // iOS ph:// URIs need to be converted to file:// URIs
  if (Platform.OS === "ios" && uri.startsWith("ph://")) {
    try {
      // Extract asset ID from ph:// URI
      // Format: ph://ASSET-ID/L0/001 or similar
      const assetId = uri.replace("ph://", "").split("/")[0];

      // Get asset info from MediaLibrary
      const asset = await MediaLibrary.getAssetInfoAsync(assetId);

      if (asset && asset.localUri) {
        // Remove iOS metadata hash if present (e.g., #YnBsaXN0MDDRAQJf...)
        const cleanUri = asset.localUri.split("#")[0];
        console.log(`[API] Converted iOS ph:// URI to: ${cleanUri}`);
        return cleanUri;
      } else if (asset && asset.uri) {
        // Remove iOS metadata hash if present
        const cleanUri = asset.uri.split("#")[0];
        console.log(`[API] Converted iOS ph:// URI to: ${cleanUri}`);
        return cleanUri;
      }

      console.warn("[API] Could not convert iOS ph:// URI, no localUri found");
      return uri;
    } catch (e) {
      console.warn("[API] Failed to convert iOS ph:// URI:", e);
      return uri; // Fallback
    }
  }

  // For non-ph:// URIs, also strip hash if present
  if (uri && uri.includes("#")) {
    return uri.split("#")[0];
  }

  return uri;
};

/**
 * Helper để đảm bảo tên file luôn có đuôi mở rộng hợp lệ
 * @param {string} uri - URI của file
 * @param {string} currentName - Tên file hiện tại (có thể không có đuôi)
 * @param {string} defaultExtension - Đuôi mở rộng mặc định (ví dụ: '.jpg', '.mp4')
 * @returns {string} - Tên file với đuôi mở rộng hợp lệ
 */
const ensureFileExtension = (uri, currentName, defaultExtension) => {
  // Nếu currentName đã có đuôi hợp lệ, dùng luôn
  if (currentName && /\.[a-zA-Z0-9]{2,4}$/.test(currentName)) {
    return currentName;
  }

  // Thử lấy tên file từ URI
  try {
    const uriPath = uri.split("?")[0]; // Bỏ query params nếu có
    const fileName = uriPath.split("/").pop();
    if (fileName && /\.[a-zA-Z0-9]{2,4}$/.test(fileName)) {
      return fileName;
    }
  } catch (e) {
    console.warn("[ensureFileExtension] Không thể lấy tên file từ URI:", e);
  }

  // Nếu không có đuôi hợp lệ, thêm defaultExtension
  const baseName = currentName || "file";
  // Loại bỏ các ký tự đặc biệt trong tên file
  const cleanName = baseName.replace(/[^a-zA-Z0-9_-]/g, "_");
  return cleanName + defaultExtension;
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

  // Đảm bảo tên file có đuôi mở rộng hợp lệ
  const validName = ensureFileExtension(uri, name, ".jpg");
  form.append("avatarFile", { uri, name: validName, type });
  form.append("CreatePost", createPost ? "true" : "false");
  if (postCaption) form.append("PostCaption", postCaption);
  if (postLocation) form.append("PostLocation", postLocation);
  form.append("PostPrivacy", postPrivacy);

  // Build headers object - only include Authorization if it exists
  const fetchHeaders = {};
  if (headers.Authorization) {
    fetchHeaders.Authorization = headers.Authorization;
  }
  // Do NOT set Content-Type - let fetch set it automatically with boundary

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
    throw new Error(
      json?.message || `Cập nhật avatar thất bại (${res.status})`
    );
  }
  // trả { message, data: { avatarUrl } }
  return json;
};

// =================== BLOCK APIs ===================
export const blockUser = async (userId) => {
  const headers = await getAuthHeaders();
  return apiCall(`/api/users/${userId}/block`, {
    method: "POST",
    headers,
  });
};

export const unblockUser = async (userId) => {
  const headers = await getAuthHeaders();
  return apiCall(`/api/users/${userId}/block`, {
    method: "DELETE",
    headers,
  });
};

export const getBlockedUsers = async () => {
  const headers = await getAuthHeaders();
  const result = await apiCall("/api/users/blocked", {
    method: "GET",
    headers,
  });
  return result?.data || [];
};

// Upload group avatar and persist on server
export const uploadGroupAvatar = async (
  conversationId,
  { uri, name = "group_avatar.jpg", type = "image/jpeg" }
) => {
  const headers = await getAuthHeaders();
  const form = new FormData();

  try {
    const compressed = await compressImage(uri, 1080, 0.8);
    uri = compressed || uri;
  } catch (e) {
    console.warn("[API] uploadGroupAvatar compress failed", e);
  }

  // Normalize iOS ph:// URIs
  try {
    uri = await normalizeUri(uri);
  } catch (e) {
    console.warn("[API] normalizeUri failed", e);
  }

  // Đảm bảo tên file có đuôi mở rộng hợp lệ
  const validName = ensureFileExtension(uri, name, ".jpg");
  form.append("file", { uri, name: validName, type });

  // Build headers object - only include Authorization if it exists
  const fetchHeaders = {};
  if (headers.Authorization) {
    fetchHeaders.Authorization = headers.Authorization;
  }
  // Do NOT set Content-Type - let fetch set it automatically with boundary

  const res = await fetch(
    `${API_BASE_URL}/api/groupchat/${conversationId}/avatar`,
    {
      method: "POST",
      headers: fetchHeaders,
      body: form,
    }
  );

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

  // return { success: true, data: { avatarUrl } }
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

// =================== BUSINESS UPGRADE APIs ===================
// Request Business Upgrade (returns QR code, payment ID, and expiry)
export const requestBusinessUpgrade = async () => {
  const headers = await getAuthHeaders();
  return apiCall("/api/Business/upgrade", {
    method: "POST",
    headers,
  });
};

// Check payment status
export const checkPaymentStatus = async (paymentId) => {
  const headers = await getAuthHeaders();
  return apiCall(`/api/Business/payment-status/${paymentId}`, {
    method: "GET",
    headers,
  });
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
  mentions = [], // array of user ids
  tags = [], // array of user ids (tagged users)
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
      const validName = ensureFileExtension(img.uri, img.name, ".jpg");
      form.append("Images", {
        uri: compressed || normalizedUri,
        name: validName,
        type: img.type || "image/jpeg",
      });
    } catch (e) {
      console.warn("[API] createPost compress image failed", e);
      const normalizedUri = await normalizeUri(img.uri);
      const validName = ensureFileExtension(img.uri, img.name, ".jpg");
      form.append("Images", {
        uri: normalizedUri,
        name: validName,
        type: img.type || "image/jpeg",
      });
    }
  }

  if (video) {
    // Normalize iOS ph:// URIs for video too
    const normalizedVideoUri = await normalizeUri(video.uri);
    console.log("[API] createPost video - original:", video.uri);
    console.log("[API] createPost video - normalized:", normalizedVideoUri);
    console.log("[API] createPost video - name:", video.name);
    console.log("[API] createPost video - type:", video.type);
    const validVideoName = ensureFileExtension(video.uri, video.name, ".mp4");
    form.append("Video", {
      uri: normalizedVideoUri,
      name: validVideoName,
      type: video.type || "video/mp4",
    });
  }

  // Attach mentions/tags as JSON strings in the multipart form so backend can consume if supported
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

  // Build headers object - only include Authorization if it exists
  const fetchHeaders = {};
  if (headers.Authorization) {
    fetchHeaders.Authorization = headers.Authorization;
  }
  // Do NOT set Content-Type - let fetch set it automatically with boundary

  const res = await fetch(`${API_BASE_URL}/api/posts`, {
    method: "POST",
    headers: fetchHeaders,
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

// Lấy thông tin 1 bài đăng theo ID
export const getPostById = async (postId) => {
  const headers = await getAuthHeaders();
  return apiCall(`/api/posts/${postId}`, {
    method: "GET",
    headers,
  });
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

// Tìm user theo username - Gọi endpoint backend để lấy thông tin user
export const getUserByUsername = async (username) => {
  try {
    const headers = await getAuthHeaders();
    const result = await apiCall(
      `/api/users/username/${encodeURIComponent(username)}/profile`,
      {
        method: "GET",
        headers,
      }
    );
    return result?.data || null;
  } catch (error) {
    console.log("[API] getUserByUsername error:", error);
    return null;
  }
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
  // If caller didn't provide userId, attempt to resolve current user id from storage or profile
  let uid = userId;
  if (uid == null) {
    try {
      const stored = await AsyncStorage.getItem("userInfo");
      if (stored) {
        const u = JSON.parse(stored);
        uid = u?.user_id ?? u?.userId ?? u?.UserId ?? u?.id ?? null;
      }
    } catch (e) {
      console.warn(
        "[API] getFollowers: failed to read AsyncStorage userInfo",
        e
      );
    }
    if (uid == null) {
      try {
        const prof = await getProfile().catch(() => null);
        uid = prof?.userId ?? prof?.UserId ?? prof?.user_id ?? null;
      } catch (e) {
        // ignore
      }
    }
  }
  if (uid == null) {
    // No user id to query -> return empty list to avoid making a bad request
    console.warn(
      "[API] getFollowers: no userId available, returning empty array"
    );
    return [];
  }
  const result = await apiCall(`/api/users/${uid}/followers`, {
    method: "GET",
    headers,
  });
  return result?.data || [];
};

// Get following list
export const getFollowing = async (userId) => {
  const headers = await getAuthHeaders();
  // Resolve userId when not provided (try AsyncStorage -> profile)
  let uid = userId;
  if (uid == null) {
    try {
      const stored = await AsyncStorage.getItem("userInfo");
      if (stored) {
        const u = JSON.parse(stored);
        uid = u?.user_id ?? u?.userId ?? u?.UserId ?? u?.id ?? null;
      }
    } catch (e) {
      console.warn(
        "[API] getFollowing: failed to read AsyncStorage userInfo",
        e
      );
    }
    if (uid == null) {
      try {
        const prof = await getProfile().catch(() => null);
        uid = prof?.userId ?? prof?.UserId ?? prof?.user_id ?? null;
      } catch (e) {
        // ignore
      }
    }
  }
  if (uid == null) {
    console.warn(
      "[API] getFollowing: no userId available, returning empty array"
    );
    return [];
  }

  const result = await apiCall(`/api/users/${uid}/following`, {
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
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {}
  if (!res.ok) {
    throw new Error(json?.message || "Không thể cập nhật quyền riêng tư");
  }
  return json; // server trả về post dto
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
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {}
  if (!res.ok) {
    throw new Error(json?.message || "Không thể cập nhật caption");
  }
  return json;
};

// Update tags for a post (replace entire tag list)
export const updatePostTags = async (postId, tags = []) => {
  const headers = await getAuthHeaders();
  return apiCall(`/api/posts/${postId}/tags`, {
    method: "PATCH",
    headers: {
      ...headers,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ Tags: tags }),
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
  console.log(
    `[API] 🎯 addReaction called - postId: ${postId}, reactionType: ${reactionType}`
  );
  const headers = await getAuthHeaders();
  console.log(`[API] addReaction headers:`, headers);

  // Check if we have a valid token
  const token = await AsyncStorage.getItem("accessToken");
  console.log(`[API] addReaction token exists:`, !!token);
  if (token) {
    console.log(
      `[API] addReaction token preview:`,
      token.substring(0, 20) + "..."
    );
  }

  const body = { postId, reactionType };
  console.log(`[API] addReaction request body:`, body);

  const result = await apiCall("/api/reactions", {
    method: "POST",
    headers: {
      ...headers,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
  });

  console.log(`[API] ✅ addReaction response:`, result);
  return result;
};

// Lấy thống kê reactions của bài đăng
export const getReactionSummary = async (postId) => {
  console.log(`[API] 📊 getReactionSummary called - postId: ${postId}`);
  const headers = await getAuthHeaders();

  const result = await apiCall(`/api/reactions/post/${postId}/summary`, {
    method: "GET",
    headers: {
      ...headers,
      Accept: "application/json",
    },
  });

  console.log(
    `[API] ✅ getReactionSummary raw response for post ${postId}:`,
    result
  );

  // Backend returns { data: { totalReactions, reactionCounts, userReaction } }
  // Extract the data field
  const reactionData = result?.data || result;
  console.log(
    `[API] ✅ getReactionSummary extracted data for post ${postId}:`,
    reactionData
  );

  return reactionData;
};

// ====== COMMENTS API ======
// Lấy danh sách comments của bài đăng
export const getComments = async (postId, page = 1, pageSize = 20) => {
  const headers = await getAuthHeaders();
  return apiCall(`/api/comments/${postId}?page=${page}&pageSize=${pageSize}`, {
    method: "GET",
    headers: {
      ...headers,
      Accept: "application/json",
    },
  });
};

// Lấy số lượng comments của bài đăng
export const getCommentCount = async (postId) => {
  const headers = await getAuthHeaders();
  const result = await apiCall(`/api/comments/${postId}/count`, {
    method: "GET",
    headers: {
      ...headers,
      Accept: "application/json",
    },
  });
  return result?.count || 0;
};

// Thêm comment mới
export const addComment = async (postId, content, parentCommentId = null) => {
  const headers = await getAuthHeaders();
  return apiCall("/api/comments", {
    method: "POST",
    headers: {
      ...headers,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ postId, content, parentCommentId }),
  });
};

// Sửa comment
export const updateComment = async (commentId, content) => {
  const headers = await getAuthHeaders();
  return apiCall(`/api/comments/${commentId}`, {
    method: "PUT",
    headers: {
      ...headers,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ content }),
  });
};

// Xóa comment
export const deleteComment = async (commentId) => {
  const headers = await getAuthHeaders();
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

// Thêm reaction cho comment
// reactionType: "Like", "Love", "Haha", "Wow", "Sad", "Angry" (string, not number)
export const addCommentReaction = async (commentId, reactionType = "Like") => {
  const headers = await getAuthHeaders();
  return apiCall("/api/comments/reactions", {
    method: "POST",
    headers: {
      ...headers,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ commentId, reactionType }),
  });
};

// Xóa reaction khỏi comment
export const removeCommentReaction = async (commentId) => {
  const headers = await getAuthHeaders();
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
// Create story (multipart/form-data): Media (file), MediaType (image|video), Privacy
export const createStory = async ({
  media,
  mediaType = "image",
  privacy = "public",
  userId = null,
}) => {
  const headers = await getAuthHeaders();
  const form = new FormData();
  form.append("MediaType", mediaType);
  form.append("Privacy", privacy);
  if (userId) form.append("UserId", String(userId));
  if (media) {
    const defaultExt = mediaType === "video" ? ".mp4" : ".jpg";
    const validMediaName = ensureFileExtension(
      media.uri,
      media.name,
      defaultExt
    );
    form.append("Media", {
      uri: media.uri,
      name: validMediaName,
      type: media.type || (mediaType === "video" ? "video/mp4" : "image/jpeg"),
    });
  }

  // Build headers object - only include Authorization if it exists
  const fetchHeaders = {};
  if (headers.Authorization) {
    fetchHeaders.Authorization = headers.Authorization;
  }
  // Do NOT set Content-Type - let fetch set it automatically with boundary

  const res = await fetch(`${API_BASE_URL}/api/stories`, {
    method: "POST",
    headers: fetchHeaders,
    body: form,
  });

  const text = await res.text();
  console.log("[createStory] response status:", res.status);
  console.log("[createStory] response text:", text);
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch (e) {
    console.warn("[createStory] failed to parse json", e);
  }
  if (!res.ok) {
    // Provide detailed error in client logs to help diagnose 404/500
    const serverMsg =
      json?.message ||
      json?.Message ||
      text ||
      `Tạo story thất bại (${res.status})`;
    throw new Error(serverMsg);
  }
  return json;
};

export const getUserStories = async (userId) => {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE_URL}/api/stories/user/${userId}`, {
    headers,
  });
  if (!res.ok) throw new Error("Không lấy được stories của user");
  return res.json();
};

export const getFeedStories = async () => {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE_URL}/api/stories/feed`, { headers });
  if (!res.ok) throw new Error("Không lấy được feed stories");
  return res.json();
};

export const viewStory = async (storyId) => {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE_URL}/api/stories/${storyId}/view`, {
    method: "POST",
    headers: {
      ...headers,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({}),
  });
  if (!res.ok) throw new Error("Không ghi được lượt xem");
  return res.json();
};

export const deleteStory = async (storyId) => {
  const headers = await getAuthHeaders();
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
// Tìm kiếm users theo từ khóa (hỗ trợ @ cho username)
// Ví dụ: searchUsers("quan") hoặc searchUsers("@quan")
export const searchUsers = async (query, page = 1, pageSize = 20) => {
  const headers = await getAuthHeaders();
  const encodedQuery = encodeURIComponent(query);
  return apiCall(
    `/api/search/users?q=${encodedQuery}&page=${page}&pageSize=${pageSize}`,
    {
      method: "GET",
      headers,
    }
  );
};

// Tìm kiếm posts theo caption/hashtags (hỗ trợ # cho hashtags)
// Ví dụ: searchPosts("travel") hoặc searchPosts("#travel")
export const searchPosts = async (query, page = 1, pageSize = 20) => {
  const headers = await getAuthHeaders();
  const encodedQuery = encodeURIComponent(query);
  return apiCall(
    `/api/search/posts?q=${encodedQuery}&page=${page}&pageSize=${pageSize}`,
    {
      method: "GET",
      headers,
    }
  );
};

// Tìm kiếm tổng hợp cả users và posts
export const searchAll = async (query) => {
  const headers = await getAuthHeaders();
  const encodedQuery = encodeURIComponent(query);
  return apiCall(`/api/search/all?q=${encodedQuery}`, {
    method: "GET",
    headers,
  });
};

// Lấy gợi ý tìm kiếm (trending hashtags, popular users)
export const getSearchSuggestions = async () => {
  const headers = await getAuthHeaders();
  return apiCall("/api/search/suggestions", {
    method: "GET",
    headers,
  });
};

// ====== INSTANT SEARCH API (for suggestions) ======
// Tìm kiếm tức thời với kết quả giới hạn cho suggestions
export const instantSearchUsers = async (query, limit = 5) => {
  const headers = await getAuthHeaders();
  const encodedQuery = encodeURIComponent(query);
  return apiCall(
    `/api/search/users?q=${encodedQuery}&page=1&pageSize=${limit}`,
    {
      method: "GET",
      headers,
    }
  );
};

export const instantSearchPosts = async (query, limit = 5) => {
  const headers = await getAuthHeaders();
  const encodedQuery = encodeURIComponent(query);
  return apiCall(
    `/api/search/posts?q=${encodedQuery}&page=1&pageSize=${limit}`,
    {
      method: "GET",
      headers,
    }
  );
};
// ============================================
// GROUP CHAT APIs
// ============================================

// Lấy thông tin chi tiết của một nhóm chat
export const getGroupInfo = async (conversationId) => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(
      `${API_BASE_URL}/api/groupchat/${conversationId}`,
      {
        method: "GET",
        headers: { ...headers, Accept: "application/json" },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      let errorJson = null;
      try {
        errorJson = errorText ? JSON.parse(errorText) : null;
      } catch {}
      throw new Error(
        errorJson?.message || `HTTP error! status: ${response.status}`
      );
    }

    return await response.json();
  } catch (error) {
    console.log("[API] getGroupInfo error:", error);
    throw error;
  }
};

// Lấy danh sách thành viên của một nhóm
export const getGroupMembers = async (conversationId) => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(
      `${API_BASE_URL}/api/groupchat/${conversationId}/members`,
      {
        method: "GET",
        headers: { ...headers, Accept: "application/json" },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      let errorJson = null;
      try {
        errorJson = errorText ? JSON.parse(errorText) : null;
      } catch {}
      throw new Error(
        errorJson?.message || `HTTP error! status: ${response.status}`
      );
    }

    const data = await response.json();
    return data.members || [];
  } catch (error) {
    console.log("[API] getGroupMembers error:", error);
    throw error;
  }
};

// Update group name via API (persist and let server broadcast)
export const updateGroupName = async (conversationId, newName) => {
  const headers = await getAuthHeaders();
  const res = await fetch(
    `${API_BASE_URL}/api/groupchat/${conversationId}/name`,
    {
      method: "PUT",
      headers: {
        ...headers,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ name: newName }),
    }
  );

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

// Mời một user vào nhóm chat
export const inviteToGroup = async (conversationId, userId) => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(
      `${API_BASE_URL}/api/groupchat/${conversationId}/invite`,
      {
        method: "POST",
        headers: {
          ...headers,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ userId }),
      }
    );

    const responseText = await response.text();
    let result = null;

    try {
      result = responseText ? JSON.parse(responseText) : null;
    } catch (parseError) {
      console.warn("[API] inviteToGroup parse error:", parseError);
      throw new Error("Server trả về dữ liệu không hợp lệ");
    }

    if (!response.ok) {
      throw new Error(
        result?.message || `HTTP error! status: ${response.status}`
      );
    }

    return result;
  } catch (error) {
    console.log("[API] inviteToGroup error:", error);
    throw error;
  }
};

// Tạo nhóm chat mới
export const createGroup = async (
  groupName,
  memberIds,
  invitePermission = "all",
  maxMembers = null
) => {
  try {
    const headers = await getAuthHeaders();
    const requestBody = {
      name: groupName,
      memberIds: memberIds,
      invitePermission: invitePermission,
    };

    // Chỉ thêm maxMembers nếu có giá trị
    if (maxMembers) {
      requestBody.maxMembers = maxMembers;
    }

    console.log("[API] createGroup request:", requestBody);

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
      throw new Error(
        result?.message || `HTTP error! status: ${response.status}`
      );
    }

    console.log("[API] createGroup success:", result);
    return result;
  } catch (error) {
    console.log("[API] createGroup error:", error);
    throw error;
  }
};

// Lấy danh sách tất cả nhóm chat của user
export const getMyGroups = async () => {
  try {
    const headers = await getAuthHeaders();

    console.log("[API] getMyGroups request");

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
      throw new Error(
        result?.message || `HTTP error! status: ${response.status}`
      );
    }

    console.log("[API] getMyGroups success:", result.groups?.length, "groups");
    return result.groups || [];
  } catch (error) {
    console.log("[API] getMyGroups error:", error);
    throw error;
  }
};

// ========================================
// 🔄 SHARE API
// ========================================

// Tạo share mới
export const createShare = async ({ postId, caption, privacy = "public" }) => {
  try {
    const headers = await getAuthHeaders();

    console.log("[API] createShare request:", { postId, caption, privacy });

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
      throw new Error(
        result?.error ||
          result?.message ||
          `HTTP error! status: ${response.status}`
      );
    }

    console.log("[API] createShare success:", result);
    return result.data;
  } catch (error) {
    console.log("[API] createShare error:", error);
    throw error;
  }
};

// Lấy số lượng shares của một bài đăng
export const getShareCount = async (postId) => {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/shares/post/${postId}/count`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      }
    );

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

// Lấy danh sách shares của một bài đăng
export const getSharesByPost = async (postId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/shares/post/${postId}`, {
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
      console.warn("[API] getSharesByPost parse error:", parseError);
      return [];
    }

    if (!response.ok) {
      console.warn("[API] getSharesByPost failed:", response.status);
      return [];
    }

    return result?.data || [];
  } catch (error) {
    console.log("[API] getSharesByPost error:", error);
    return [];
  }
};

// Xóa một share
export const deleteShare = async (shareId) => {
  try {
    const headers = await getAuthHeaders();

    console.log("[API] deleteShare request:", shareId);

    const response = await fetch(`${API_BASE_URL}/api/shares/${shareId}`, {
      method: "DELETE",
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
      console.warn("[API] deleteShare parse error:", parseError);
    }

    if (!response.ok) {
      throw new Error(
        result?.error ||
          result?.message ||
          `HTTP error! status: ${response.status}`
      );
    }

    console.log("[API] deleteShare success");
    return result;
  } catch (error) {
    console.log("[API] deleteShare error:", error);
    throw error;
  }
};
