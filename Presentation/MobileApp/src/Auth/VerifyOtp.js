import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useUser } from '../Context/UserContext';

export default function VerifyOtp() {
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);
  
  const navigation = useNavigation();
  const route = useRoute();
  const { verifyOtp, register } = useUser();
  
  const email = route.params?.email || '';

  // Countdown timer
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [countdown]);

  const handleVerifyOtp = async () => {
    if (!otp || otp.length < 4) {
      Alert.alert('Lỗi', 'Vui lòng nhập mã OTP đầy đủ.');
      return;
    }

    setIsLoading(true);

    try {
      const result = await verifyOtp({ Email: email, Otp: otp });
      if (result.success) {
        Alert.alert('Thành công', 'Xác thực OTP thành công!');
        // Navigation sẽ được xử lý tự động bởi App.js dựa trên isAuthenticated state
        // Không cần navigate thủ công
      } else {
        Alert.alert('Lỗi', result.error || 'Mã OTP không đúng.');
      }
    } catch (error) {
      Alert.alert('Lỗi', error.message || 'Xác thực OTP thất bại.');
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
      // Gửi lại OTP bằng cách đăng ký lại (hoặc có thể tạo API riêng)
      const result = await register({ Email: email });
      if (result.success) {
        Alert.alert('Thành công', 'Mã OTP mới đã được gửi đến email của bạn.');
      } else {
        Alert.alert('Lỗi', result.error || 'Không thể gửi lại mã OTP.');
        setCanResend(true);
      }
    } catch (error) {
      Alert.alert('Lỗi', error.message || 'Không thể gửi lại mã OTP.');
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
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Back Button */}
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>

        {/* Verification Card */}
        <View style={styles.card}>
          {/* Title */}
          <Text style={styles.title}>Nhập mã xác thực</Text>

          {/* Instruction Text */}
          <Text style={styles.instruction}>
            Chúng tôi đã gửi mã xác thực đến địa chỉ email của bạn. Vui lòng nhập mã để tiếp tục đặt lại mật khẩu.
          </Text>

          {/* OTP Input Label */}
          <Text style={styles.label}>Mã xác thực</Text>

          {/* OTP Input Field */}
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

          {/* Confirm Button */}
          <TouchableOpacity 
            style={[styles.confirmButton, isLoading && styles.confirmButtonDisabled]} 
            onPress={handleVerifyOtp}
            disabled={isLoading}
          >
            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color="#FFFFFF" />
                <Text style={[styles.confirmButtonText, { marginLeft: 8 }]}>
                  Đang xác thực...
                </Text>
              </View>
            ) : (
              <Text style={styles.confirmButtonText}>Xác nhận mã</Text>
            )}
          </TouchableOpacity>

          {/* Resend Button */}
          <TouchableOpacity 
            style={[styles.resendButton, (!canResend || resendLoading) && styles.resendButtonDisabled]} 
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
              <Text style={[styles.resendButtonText, (!canResend || resendLoading) && styles.resendButtonTextDisabled]}>
                {canResend ? 'Gửi lại mã' : `Gửi lại mã (${countdown}s)`}
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
    backgroundColor: '#F3F4F6',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    zIndex: 10,
    padding: 10,
  },
  backIcon: {
    fontSize: 24,
    color: '#374151',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 16,
  },
  instruction: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
    marginBottom: 24,
    textAlign: 'center',
    letterSpacing: 2,
  },
  confirmButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  confirmButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  resendButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  resendButtonDisabled: {
    opacity: 0.5,
  },
  resendButtonText: {
    color: '#3B82F6',
    fontSize: 16,
    fontWeight: '500',
  },
  resendButtonTextDisabled: {
    color: '#9CA3AF',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
