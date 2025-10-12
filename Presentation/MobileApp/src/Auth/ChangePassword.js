import React, { useState } from 'react';
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
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { changePassword, verifyChangePasswordOtp } from '../API/Api';

export default function ChangePassword() {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  
  const navigation = useNavigation();

  const handleSendOtp = async () => {
    if (!oldPassword || !newPassword || !confirmPassword) {
      Alert.alert('Lỗi', 'Vui lòng điền đầy đủ thông tin.');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Lỗi', 'Mật khẩu xác nhận không khớp.');
      return;
    }

    if (newPassword.length < 8) {
      Alert.alert('Lỗi', 'Mật khẩu mới phải có ít nhất 8 ký tự.');
      return;
    }

    setIsLoading(true);

    try {
      const result = await changePassword({ 
        OldPassword: oldPassword, 
        NewPassword: newPassword 
      });
      if (result.success) {
        setOtpSent(true);
        Alert.alert('Thành công', 'Mã OTP đã được gửi đến email của bạn.');
      } else {
        Alert.alert('Lỗi', result.error || 'Không thể gửi mã OTP.');
      }
    } catch (error) {
      Alert.alert('Lỗi', error.message || 'Có lỗi xảy ra.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp || otp.length < 4) {
      Alert.alert('Lỗi', 'Vui lòng nhập mã OTP đầy đủ.');
      return;
    }

    setIsLoading(true);

    try {
      const result = await verifyChangePasswordOtp({ 
        Otp: otp, 
        NewPassword: newPassword 
      });
      if (result.success) {
        Alert.alert('Thành công', 'Đổi mật khẩu thành công!');
        navigation.goBack();
      } else {
        Alert.alert('Lỗi', result.error || 'Mã OTP không đúng.');
      }
    } catch (error) {
      Alert.alert('Lỗi', error.message || 'Xác thực OTP thất bại.');
    } finally {
      setIsLoading(false);
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

        {/* Card */}
        <View style={styles.card}>
          {/* Title */}
          <Text style={styles.title}>Đổi mật khẩu</Text>

          {!otpSent ? (
            <>
              {/* Instruction Text */}
              <Text style={styles.instruction}>
                Nhập mật khẩu hiện tại và mật khẩu mới để đổi mật khẩu.
              </Text>

              {/* Old Password Input */}
              <Text style={styles.label}>Mật khẩu hiện tại</Text>
              <TextInput
                style={styles.input}
                value={oldPassword}
                onChangeText={setOldPassword}
                placeholder="Nhập mật khẩu hiện tại"
                placeholderTextColor="#9CA3AF"
                secureTextEntry
                autoCapitalize="none"
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
              <Text style={styles.label}>Xác nhận mật khẩu mới</Text>
              <TextInput
                style={styles.input}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Nhập lại mật khẩu mới"
                placeholderTextColor="#9CA3AF"
                secureTextEntry
                autoCapitalize="none"
              />

              {/* Send OTP Button */}
              <TouchableOpacity 
                style={[styles.sendOtpButton, isLoading && styles.sendOtpButtonDisabled]} 
                onPress={handleSendOtp}
                disabled={isLoading}
              >
                <Text style={styles.sendOtpButtonText}>
                  {isLoading ? 'Đang gửi...' : 'Gửi mã OTP'}
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              {/* Instruction Text */}
              <Text style={styles.instruction}>
                Chúng tôi đã gửi mã OTP đến email của bạn. Vui lòng nhập mã để xác thực đổi mật khẩu.
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

              {/* Verify Button */}
              <TouchableOpacity 
                style={[styles.verifyButton, isLoading && styles.verifyButtonDisabled]} 
                onPress={handleVerifyOtp}
                disabled={isLoading}
              >
                <Text style={styles.verifyButtonText}>
                  {isLoading ? 'Đang xác thực...' : 'Xác nhận mã'}
                </Text>
              </TouchableOpacity>
            </>
          )}
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
    marginBottom: 16,
  },
  sendOtpButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  sendOtpButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  sendOtpButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  verifyButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  verifyButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  verifyButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
