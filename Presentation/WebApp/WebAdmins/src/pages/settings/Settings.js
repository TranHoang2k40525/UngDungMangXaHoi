import { useState, useEffect } from "react";
import { adminAPI, authAPI } from "../../services/api.js";
import { useAuth } from "../../contexts/AuthContext.js";
import { useAdmin } from "../../contexts/AdminContext.js";
import "./Settings.css";

export default function Settings() {
    const { user } = useAuth();
    const { updateAdminData } = useAdmin();
    const [activeTab, setActiveTab] = useState("profile");
    const [profileData, setProfileData] = useState({
        fullName: "",
        email: "",
        phone: "",
        bio: "",
        address: "",
        hometown: "",
        job: "",
        website: "",
        dateOfBirth: "",
        gender: "Nam",
        isPrivate: false,
        adminLevel: "moderator",
        avatarUrl: "",
    });
    const [avatarFile, setAvatarFile] = useState(null);
    const [avatarPreview, setAvatarPreview] = useState("");
    const [passwordData, setPasswordData] = useState({
        oldPassword: "",
        newPassword: "",
        confirmPassword: "",
        otp: "",
    });
    const [otpSent, setOtpSent] = useState(false);
    const [otpTimer, setOtpTimer] = useState(0);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ type: "", text: "" });
    useEffect(() => {
        loadAdminProfile();
    }, []);

    useEffect(() => {
        if (otpTimer > 0) {
            const timer = setTimeout(() => setOtpTimer(otpTimer - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [otpTimer]);

    const loadAdminProfile = async () => {
        try {
            const response = await adminAPI.getProfile();
            const profile = response.data || response;

            setProfileData({
                fullName: profile.fullName || "",
                email: profile.email || user?.email || "",
                phone: profile.phone || "",
                bio: profile.bio || "",
                address: profile.address || "",
                hometown: profile.hometown || "",
                job: profile.job || "",
                website: profile.website || "",
                dateOfBirth: profile.dateOfBirth
                    ? profile.dateOfBirth.split("T")[0]
                    : "",
                gender: profile.gender || "Nam",
                isPrivate: profile.isPrivate || false,
                adminLevel: profile.adminLevel || "moderator",
                avatarUrl: profile.avatarUrl || "",
            });

            setAvatarPreview(profile.avatarUrl || "");
        } catch (error) {
            console.error("Error loading profile:", error);
        }
    };

    const handleAvatarChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                setMessage({
                    type: "error",
                    text: "Kích thước ảnh không được vượt quá 5MB",
                });
                return;
}

            setAvatarFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setAvatarPreview(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };
    const handleProfileSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage({ type: "", text: "" });

        try {
            let avatarUrl = profileData.avatarUrl;

            // Nếu có chọn avatar mới, upload lên server trước
            if (avatarFile) {
                console.log("Uploading new avatar...");
                try {
                    const uploadResponse = await adminAPI.uploadAvatar(
                        avatarFile
                    );
                    const uploadData = uploadResponse.data || uploadResponse;
                    avatarUrl = uploadData.avatarUrl || avatarUrl;
                    console.log("Avatar uploaded successfully:", avatarUrl);
                } catch (uploadError) {
                    console.error("Avatar upload failed:", uploadError);
                    setMessage({
                        type: "error",
                        text:
                            uploadError.response?.data?.message ||
                            uploadError.response?.data ||
                            "Upload ảnh thất bại. Vui lòng thử lại.",
                    });
                    setLoading(false);
                    return;
                }
            }

            // Cập nhật profile
            const updateData = {
                FullName: profileData.fullName.trim(),
                Phone: profileData.phone?.trim() || null,
                Bio: profileData.bio?.trim() || null,
                Address: profileData.address?.trim() || null,
                Hometown: profileData.hometown?.trim() || null,
                Job: profileData.job?.trim() || null,
                Website: profileData.website?.trim() || null,
                DateOfBirth: profileData.dateOfBirth || null,
                Gender: profileData.gender,
                IsPrivate: profileData.isPrivate,
                AvatarUrl: avatarUrl || null,
            };

            console.log("Updating profile with data:", updateData);
            const response = await adminAPI.updateProfile(updateData);
            console.log("Profile update response:", response);

            // Cập nhật AdminContext
            updateAdminData({
                fullName: updateData.FullName,
                email: profileData.email,
                phone: updateData.Phone,
                bio: updateData.Bio,
                address: updateData.Address,
                hometown: updateData.Hometown,
                job: updateData.Job,
                website: updateData.Website,
                dateOfBirth: updateData.DateOfBirth,
                gender: updateData.Gender,
isPrivate: updateData.IsPrivate,
                avatarUrl: avatarUrl,
            });

            // Cập nhật local state
            setProfileData((prev) => ({ ...prev, avatarUrl: avatarUrl }));
            setAvatarPreview(avatarUrl);
            setAvatarFile(null);

            setMessage({
                type: "success",
                text: "Cập nhật thông tin thành công!",
            });
        } catch (error) {
            console.error("Profile update error:", error);
            console.error("Error response:", error.response);
            setMessage({
                type: "error",
                text:
                    error.response?.data?.message ||
                    error.response?.data ||
                    error.message ||
                    "Cập nhật thông tin thất bại",
            });
        } finally {
            setLoading(false);
        }
    };
    const handlePasswordSubmit = async (e) => {
        e.preventDefault();

        if (passwordData.newPassword !== passwordData.confirmPassword) {
            setMessage({ type: "error", text: "Mật khẩu xác nhận không khớp" });
            return;
        }

        if (passwordData.newPassword.length < 6) {
            setMessage({
                type: "error",
                text: "Mật khẩu mới phải có ít nhất 6 ký tự",
            });
            return;
        }

        setLoading(true);
        setMessage({ type: "", text: "" });

        try {
            if (!otpSent) {
                // Bước 1: Gửi OTP
                const response = await adminAPI.changePassword({
                    OldPassword: passwordData.oldPassword,
                    NewPassword: passwordData.newPassword,
                });

                setOtpSent(true);
                setOtpTimer(60); // 60 giây countdown
                setMessage({
                    type: "success",
                    text:
                        response.message ||
                        "OTP đã được gửi đến email của bạn. Vui lòng kiểm tra và nhập OTP.",
                });
            } else {
                // Bước 2: Xác thực OTP và đổi mật khẩu
                if (!passwordData.otp || passwordData.otp.length !== 6) {
                    setMessage({
                        type: "error",
                        text: "Vui lòng nhập OTP gồm 6 chữ số",
                    });
                    setLoading(false);
                    return;
                }

                const response = await adminAPI.verifyChangePasswordOtp({
                    Otp: passwordData.otp,
                    NewPassword: passwordData.newPassword,
                });

                setMessage({
                    type: "success",
                    text: response.message || "Đổi mật khẩu thành công!",
                });

                // Reset form
                setPasswordData({
                    oldPassword: "",
newPassword: "",
                    confirmPassword: "",
                    otp: "",
                });
                setOtpSent(false);
                setOtpTimer(0);
            }
        } catch (error) {
            console.error("Password change error:", error);
            setMessage({
                type: "error",
                text:
                    error.response?.data?.message ||
                    error.message ||
                    "Có lỗi xảy ra. Vui lòng thử lại.",
            });
        } finally {
            setLoading(false);
        }
    };

    const handleCancelOtp = () => {
        setOtpSent(false);
        setOtpTimer(0);
        setPasswordData({
            oldPassword: "",
            newPassword: "",
            confirmPassword: "",
            otp: "",
        });
        setMessage({ type: "", text: "" });
    };

    return (
        <div className="settings-page">
            {" "}
            <div className="page-header">
                <h1>Cài đặt</h1>
                <p>Quản lý tài khoản cá nhân</p>
            </div>
            <div className="settings-container">
                <div className="settings-tabs">
                    <button
                        className={`tab-btn ${
                            activeTab === "profile" ? "active" : ""
                        }`}
                        onClick={() => setActiveTab("profile")}
                    >
                        👤 Thông tin cá nhân
                    </button>
                    <button
                        className={`tab-btn ${
                            activeTab === "password" ? "active" : ""
                        }`}
                        onClick={() => setActiveTab("password")}
                    >
                        🔒 Đổi mật khẩu
                    </button>
                </div>

                <div className="card settings-content">
                    {activeTab === "profile" && (
                        <form onSubmit={handleProfileSubmit}>
                            <h3>Chỉnh sửa thông tin Admin</h3>

                            <div className="avatar-upload-section">
                                <div className="avatar-preview">
                                    <img
                                        src={
                                            avatarPreview ||
                                            `https://ui-avatars.com/api/?name=${encodeURIComponent(
                                                profileData.fullName || "Admin"
                                            )}&background=6366F1&color=fff&size=150`
                                        }
                                        alt="Avatar"
                                        className="profile-avatar-large"
                                    />
                                    <label
                                        htmlFor="avatar-input"
className="avatar-upload-btn"
                                    >
                                        📷 Thay đổi ảnh
                                    </label>
                                    <input
                                        id="avatar-input"
                                        type="file"
                                        accept="image/*"
                                        onChange={handleAvatarChange}
                                        style={{ display: "none" }}
                                    />
                                </div>{" "}
                                <div className="avatar-info">
                                    <h4>{profileData.fullName || "Admin"}</h4>
                                    <p>
                                        <strong>Email:</strong>{" "}
                                        {profileData.email}
                                    </p>
                                    <p className="text-muted">
                                        Email không thể thay đổi
                                    </p>
                                </div>
                            </div>

                            <div className="form-grid">
                                <div className="form-group">
                                    <label>Họ và tên *</label>
                                    <input
                                        type="text"
                                        value={profileData.fullName}
                                        onChange={(e) =>
                                            setProfileData({
                                                ...profileData,
                                                fullName: e.target.value,
                                            })
                                        }
                                        className="input"
                                        required
                                    />
                                </div>

                                <div className="form-group">
                                    <label>Số điện thoại</label>
                                    <input
                                        type="tel"
                                        value={profileData.phone}
                                        onChange={(e) =>
                                            setProfileData({
                                                ...profileData,
                                                phone: e.target.value,
                                            })
                                        }
                                        className="input"
                                        placeholder="0123456789"
                                    />
                                </div>

                                <div className="form-group">
<label>Ngày sinh *</label>
                                    <input
                                        type="date"
                                        value={profileData.dateOfBirth}
                                        onChange={(e) =>
                                            setProfileData({
                                                ...profileData,
                                                dateOfBirth: e.target.value,
                                            })
                                        }
                                        className="input"
                                        max={
                                            new Date()
                                                .toISOString()
                                                .split("T")[0]
                                        }
                                        required
                                    />
                                </div>

                                <div className="form-group">
                                    <label>Giới tính *</label>
                                    <select
                                        value={profileData.gender}
                                        onChange={(e) =>
                                            setProfileData({
                                                ...profileData,
                                                gender: e.target.value,
                                            })
                                        }
                                        className="input"
                                        required
                                    >
                                        <option value="Nam">Nam</option>
                                        <option value="Nữ">Nữ</option>
                                        <option value="Khác">Khác</option>
                                    </select>
                                </div>

                                <div className="form-group">
                                    <label>Địa chỉ</label>
                                    <input
                                        type="text"
                                        value={profileData.address}
                                        onChange={(e) =>
                                            setProfileData({
                                                ...profileData,
                                                address: e.target.value,
                                            })
                                        }
                                        className="input"
                                        placeholder="123 Đường ABC, Quận 1, TP.HCM"
                                    />
                                </div>

                                <div className="form-group">
<label>Quê quán</label>
                                    <input
                                        type="text"
                                        value={profileData.hometown}
                                        onChange={(e) =>
                                            setProfileData({
                                                ...profileData,
                                                hometown: e.target.value,
                                            })
                                        }
                                        className="input"
                                        placeholder="TP. Hồ Chí Minh"
                                    />
                                </div>

                                <div className="form-group">
                                    <label>Công việc</label>
                                    <input
                                        type="text"
                                        value={profileData.job}
                                        onChange={(e) =>
                                            setProfileData({
                                                ...profileData,
                                                job: e.target.value,
                                            })
                                        }
                                        className="input"
                                        placeholder="Quản trị viên hệ thống"
                                    />
                                </div>

                                <div className="form-group">
                                    <label>Website</label>
                                    <input
                                        type="url"
                                        value={profileData.website}
                                        onChange={(e) =>
                                            setProfileData({
                                                ...profileData,
                                                website: e.target.value,
                                            })
                                        }
                                        className="input"
                                        placeholder="https://example.com"
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <label>Giới thiệu</label>
                                <textarea
                                    value={profileData.bio}
                                    onChange={(e) =>
                                        setProfileData({
                                            ...profileData,
                                            bio: e.target.value,
                                        })
}
                                    className="input"
                                    rows={4}
                                    placeholder="Viết vài dòng giới thiệu về bản thân..."
                                />
                            </div>

                            <div className="form-group">
                                <label className="checkbox-label">
                                    <input
                                        type="checkbox"
                                        checked={profileData.isPrivate}
                                        onChange={(e) =>
                                            setProfileData({
                                                ...profileData,
                                                isPrivate: e.target.checked,
                                            })
                                        }
                                    />
                                    <span>Tài khoản riêng tư</span>
                                </label>
                                <p className="text-muted">
                                    Ẩn thông tin cá nhân khỏi người dùng khác
                                </p>
                            </div>

                            {message.text && (
                                <div className={`message ${message.type}`}>
                                    {message.text}
                                </div>
                            )}

                            <button
                                type="submit"
                                className="btn btn-primary"
                                disabled={loading}
                            >
                                {loading ? (
                                    <span className="loading"></span>
                                ) : (
                                    "💾 Lưu thay đổi"
                                )}
                            </button>
                        </form>
                    )}{" "}
                    {activeTab === "password" && (
                        <form onSubmit={handlePasswordSubmit}>
                            <h3>Đổi mật khẩu</h3>

                            {!otpSent ? (
                                <>
                                    <div className="form-group">
                                        <label>Mật khẩu hiện tại *</label>
                                        <input
                                            type="password"
                                            value={passwordData.oldPassword}
                                            onChange={(e) =>
                                                setPasswordData({
                                                    ...passwordData,
                                                    oldPassword: e.target.value,
})
                                            }
                                            className="input"
                                            required
                                            placeholder="Nhập mật khẩu hiện tại"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Mật khẩu mới *</label>
                                        <input
                                            type="password"
                                            value={passwordData.newPassword}
                                            onChange={(e) =>
                                                setPasswordData({
                                                    ...passwordData,
                                                    newPassword: e.target.value,
                                                })
                                            }
                                            className="input"
                                            required
                                            minLength={6}
                                            placeholder="Tối thiểu 6 ký tự"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Xác nhận mật khẩu mới *</label>
                                        <input
                                            type="password"
                                            value={passwordData.confirmPassword}
                                            onChange={(e) =>
                                                setPasswordData({
                                                    ...passwordData,
                                                    confirmPassword:
                                                        e.target.value,
                                                })
                                            }
                                            className="input"
                                            required
                                            placeholder="Nhập lại mật khẩu mới"
                                        />
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="otp-info-box">
                                        <p>
                                            📧 Mã OTP đã được gửi đến email của
                                            bạn.
                                            <br />
                                            Vui lòng kiểm tra hộp thư và nhập mã
                                            xác thực.
</p>
                                        {otpTimer > 0 && (
                                            <p className="otp-timer">
                                                ⏱️ OTP có hiệu lực trong:{" "}
                                                <strong>{otpTimer}s</strong>
                                            </p>
                                        )}
                                    </div>
                                    <div className="form-group">
                                        <label>Mã OTP *</label>
                                        <input
                                            type="text"
                                            value={passwordData.otp}
                                            onChange={(e) => {
                                                const value = e.target.value
                                                    .replace(/\D/g, "")
                                                    .slice(0, 6);
                                                setPasswordData({
                                                    ...passwordData,
                                                    otp: value,
                                                });
                                            }}
                                            className="input otp-input"
                                            required
                                            maxLength={6}
                                            placeholder="Nhập 6 chữ số"
                                            autoFocus
                                        />
                                        <small className="text-muted">
                                            Nhập mã OTP gồm 6 chữ số từ email
                                        </small>
                                    </div>
                                </>
                            )}

                            {message.text && (
                                <div className={`message ${message.type}`}>
                                    {message.text}
                                </div>
                            )}

                            <div className="form-actions">
                                {otpSent && (
                                    <button
                                        type="button"
                                        className="btn btn-secondary"
                                        onClick={handleCancelOtp}
                                        disabled={loading}
                                    >
                                        ← Quay lại
                                    </button>
                                )}
                                <button
                                    type="submit"
                                    className="btn btn-primary"
disabled={loading}
                                >
                                    {loading ? (
                                        <span className="loading"></span>
                                    ) : otpSent ? (
                                        "✓ Xác nhận đổi mật khẩu"
                                    ) : (
                                        "📧 Gửi mã OTP"
                                    )}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
