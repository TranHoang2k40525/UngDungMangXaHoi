import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Platform,
  KeyboardAvoidingView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";

export default function VerifyForgotPasswordOtp() {
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);

  const navigation = useNavigation();
  const route = useRoute();

  const email = route.params?.email || "";

  // Countdown timer
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [countdown]);

  // Đặt lại mật khẩu với OTP
  const handleResetPassword = async () => {
    if (!otp || otp.length < 4) {
      Alert.alert("Lỗi", "Vui lòng nhập mã OTP đầy đủ.");
      return;
    }

    if (!newPassword || !confirmPassword) {
      Alert.alert("Lỗi", "Vui lòng nhập đầy đủ mật khẩu mới.");
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert("Lỗi", "Mật khẩu xác nhận không khớp.");
      return;
    }

    if (newPassword.length < 8) {
      Alert.alert("Lỗi", "Mật khẩu phải có ít nhất 8 ký tự.");
      return;
    }

    setIsLoading(true);

    try {
      console.log("🔐 Resetting password...");
      console.log("📧 Email:", email);
      console.log("🔢 OTP:", otp);

      const response = await fetch(
        "http://192.168.0.109:5297/api/auth/reset-password-with-otp",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            Email: email,
            Otp: otp,
            NewPassword: newPassword,
          }),
        }
      );

      console.log("📥 Response Status:", response.status);
      console.log("📥 Response OK:", response.ok);

      if (response.ok) {
        // ✅ THÀNH CÔNG - KHÔNG ĐỌC BODY NỮA
        console.log("✅ Password reset successful!");

        setIsLoading(false); // Tắt loading trước

        Alert.alert(
          "Thành công!",
          "Mật khẩu của bạn đã được đặt lại thành công. Bạn có thể đăng nhập với mật khẩu mới.",
          [
            {
              text: "Đăng nhập ngay",
              onPress: () => navigation.navigate("Login"),
            },
          ]
        );
        return; // Thoát luôn, không làm gì thêm
      }

      // ❌ LỖI - Mới đọc body để lấy error message
      console.log("❌ Request failed, reading error...");
      let errorMessage = "Mã OTP không đúng hoặc đã hết hạn.";

      try {
        const errorData = await response.json();
        console.log("📥 Error data:", errorData);
        errorMessage = errorData?.message || errorData?.Message || errorMessage;
      } catch (parseError) {
        console.log("⚠️ Could not parse error response:", parseError.message);
      }

      Alert.alert("Lỗi", errorMessage);
    } catch (error) {
      console.error("❌ Network Error:", error);
      console.error("❌ Error details:", error.message);
      Alert.alert(
        "Lỗi",
        "Không thể kết nối đến server. Vui lòng kiểm tra kết nối mạng."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (!canResend) return;

    setResendLoading(true);
    setCanResend(false);
    setCountdown(60);

    try {
      console.log("🔄 Resending OTP...");

      const response = await fetch(
        "http://192.168.0.109:5297/api/auth/forgot-password",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            Email: email,
          }),
        }
      );

      console.log("📥 Resend Status:", response.status);

      if (response.ok) {
        Alert.alert("Thành công", "Mã OTP mới đã được gửi đến email của bạn.");
        setOtp(""); // Reset OTP field
      } else {
        let errorMessage = "Không thể gửi lại mã OTP.";

        try {
          const errorData = await response.json();
          errorMessage =
            errorData?.message || errorData?.Message || errorMessage;
        } catch (e) {
          console.log("⚠️ Could not parse error response");
        }

        Alert.alert("Lỗi", errorMessage);
        setCanResend(true);
      }
    } catch (error) {
      console.error("❌ Resend Error:", error);
      Alert.alert("Lỗi", "Không thể kết nối đến server.");
      setCanResend(true);
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="#FFFFFF"
        translucent={false}
      />
      <KeyboardAvoidingView
        style={styles.content}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        {/* Back Button */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>

        {/* Card */}
        <View style={styles.card}>
          <Text style={styles.title}>Đặt lại mật khẩu</Text>

          <Text style={styles.instruction}>
            Nhập mã OTP đã được gửi đến email{"\n"}
            <Text style={styles.emailHighlight}>{email}</Text>
            {"\n"}và mật khẩu mới của bạn.
          </Text>

          {/* OTP Input */}
          <Text style={styles.label}>Mã xác thực (OTP)</Text>
          <TextInput
            style={styles.input}
            value={otp}
            onChangeText={setOtp}
            placeholder="Nhập mã gồm 4-6 số"
            placeholderTextColor="#9CA3AF"
            keyboardType="numeric"
            maxLength={6}
            autoFocus
          />

          {/* New Password Input */}
          <Text style={styles.label}>Mật khẩu mới</Text>
          <TextInput
            style={styles.input}
            value={newPassword}
            onChangeText={setNewPassword}
            placeholder="Nhập mật khẩu mới (ít nhất 8 ký tự)"
            placeholderTextColor="#9CA3AF"
            secureTextEntry
            autoCapitalize="none"
          />

          {/* Confirm Password Input */}
          <Text style={styles.label}>Xác nhận mật khẩu</Text>
          <TextInput
            style={styles.input}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="Nhập lại mật khẩu mới"
            placeholderTextColor="#9CA3AF"
            secureTextEntry
            autoCapitalize="none"
          />

          {/* Submit Button */}
          <TouchableOpacity
            style={[
              styles.primaryButton,
              isLoading && styles.primaryButtonDisabled,
            ]}
            onPress={handleResetPassword}
            disabled={isLoading}
          >
            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color="#FFFFFF" />
                <Text style={[styles.primaryButtonText, { marginLeft: 8 }]}>
                  Đang xử lý...
                </Text>
              </View>
            ) : (
              <Text style={styles.primaryButtonText}>Đặt lại mật khẩu</Text>
            )}
          </TouchableOpacity>

          {/* Resend Button */}
          <TouchableOpacity
            style={[
              styles.resendButton,
              (!canResend || resendLoading) && styles.resendButtonDisabled,
            ]}
            onPress={handleResendOtp}
            disabled={!canResend || resendLoading}
          >
            {resendLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color="#3B82F6" />
                <Text style={[styles.resendButtonText, { marginLeft: 8 }]}>
                  Đang gửi...
                </Text>
              </View>
            ) : (
              <Text
                style={[
                  styles.resendButtonText,
                  (!canResend || resendLoading) &&
                    styles.resendButtonTextDisabled,
                ]}
              >
                {canResend ? "Gửi lại mã OTP" : `Gửi lại mã (${countdown}s)`}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F3F4F6",
  },
  content: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  backButton: {
    position: "absolute",
    top: 50,
    left: 20,
    zIndex: 10,
    padding: 10,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  backIcon: {
    fontSize: 24,
    color: "#374151",
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#111827",
    textAlign: "center",
    marginBottom: 12,
  },
  instruction: {
    fontSize: 15,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 24,
  },
  emailHighlight: {
    fontWeight: "600",
    color: "#3B82F6",
  },
  label: {
    fontSize: 15,
    color: "#374151",
    fontWeight: "600",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1.5,
    borderColor: "#D1D5DB",
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: "#111827",
    marginBottom: 16,
    backgroundColor: "#F9FAFB",
  },
  primaryButton: {
    backgroundColor: "#3B82F6",
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 8,
    marginBottom: 12,
    shadowColor: "#3B82F6",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonDisabled: {
    backgroundColor: "#9CA3AF",
    shadowOpacity: 0,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  resendButton: {
    alignItems: "center",
    paddingVertical: 12,
  },
  resendButtonDisabled: {
    opacity: 0.5,
  },
  resendButtonText: {
    color: "#3B82F6",
    fontSize: 15,
    fontWeight: "600",
  },
  resendButtonTextDisabled: {
    color: "#9CA3AF",
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
});
