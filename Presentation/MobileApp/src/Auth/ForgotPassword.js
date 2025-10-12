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
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { forgotPassword } from '../API/Api';

export default function ForgotPassword() {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigation = useNavigation();

  const handleSendCode = async () => {
    if (!email) {
      Alert.alert('Lỗi', 'Vui lòng nhập email của bạn.');
      return;
    }

    setIsLoading(true);
    try {
      const result = await forgotPassword(email);
      if (result.success) {
        Alert.alert('Thành công', 'Mã OTP đã được gửi đến email của bạn.');
        setStep(2);
      } else {
        Alert.alert('Lỗi', result.error || 'Không thể gửi mã OTP.');
      }
    } catch (error) {
      Alert.alert('Lỗi', error.message || 'Có lỗi xảy ra.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = () => {
    if (verificationCode) {
      console.log('Verifying code:', verificationCode);
      setStep(3);
    } else {
      Alert.alert('Lỗi', 'Vui lòng nhập mã xác thực');
    }
  };

  const handleResetPassword = () => {
    if (!newPassword || !confirmPassword) {
      Alert.alert('Lỗi', 'Vui lòng nhập đầy đủ thông tin');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Lỗi', 'Mật khẩu xác nhận không khớp');
      return;
    }
    if (newPassword.length < 8) {
      Alert.alert('Lỗi', 'Mật khẩu phải có ít nhất 8 ký tự');
      return;
    }
    
    console.log('Password reset successful');
    Alert.alert('Thành công', 'Mật khẩu đã được đặt lại thành công!');
    navigation.navigate('Login');
  };

  const handleResendCode = async () => {
    setIsLoading(true);
    try {
      const result = await forgotPassword(email);
      if (result.success) {
        Alert.alert('Thành công', 'Mã xác thực đã được gửi lại!');
      } else {
        Alert.alert('Lỗi', result.error || 'Không thể gửi lại mã OTP.');
      }
    } catch (error) {
      Alert.alert('Lỗi', error.message || 'Có lỗi xảy ra.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackPress = () => {
    if (step > 1) {
      setStep(step - 1);
    } else {
      navigation.navigate('Login');
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
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity 
              style={styles.backButton} 
              onPress={handleBackPress}
            >
              <Text style={styles.backIcon}>←</Text>
            </TouchableOpacity>
          </View>

          {/* Step 1: Enter Email */}
          {step === 1 && (
            <View style={styles.formContainer}>
              <View style={styles.card}>
                <View style={styles.iconContainer}>
                  <View style={styles.lockIcon}>
                    <Text style={styles.lockText}>🔒</Text>
                  </View>
                </View>
                <Text style={styles.title}>Quên mật khẩu</Text>
                <Text style={styles.subtitle}>
                  Nhập email của bạn để nhận mã OTP đặt lại mật khẩu
                </Text>

                <View style={styles.form}>
                  <Text style={styles.label}>Email</Text>
                  <TextInput
                    style={styles.input}
                    value={email}
                    onChangeText={setEmail}
                    placeholder="Nhập email của bạn"
                    placeholderTextColor="#9CA3AF"
                    autoCapitalize="none"
                    keyboardType="email-address"
                    autoFocus
                  />

                  <TouchableOpacity 
                    style={[styles.button, isLoading && styles.buttonDisabled]}
                    onPress={handleSendCode}
                    disabled={isLoading}
                  >
                    <Text style={styles.buttonText}>
                      {isLoading ? 'Đang gửi...' : 'Gửi mã OTP'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}

          {/* Step 2: Enter Verification Code */}
          {step === 2 && (
            <View style={styles.formContainer}>
              <View style={styles.card}>
                <View style={styles.iconContainer}>
                  <View style={styles.lockIcon}>
                    <Text style={styles.lockText}>📧</Text>
                  </View>
                </View>
                <Text style={styles.title}>Nhập mã xác thực</Text>
                <Text style={styles.subtitle}>
                  Chúng tôi đã gửi mã OTP đến địa chỉ email của bạn. Vui lòng nhập mã để tiếp tục đặt lại mật khẩu.
                </Text>

                <View style={styles.form}>
                  <Text style={styles.label}>Mã xác thực</Text>
                  <TextInput
                    style={[styles.input, styles.codeInput]}
                    value={verificationCode}
                    onChangeText={setVerificationCode}
                    placeholder="Nhập mã gồm 4-6 số"
                    placeholderTextColor="#9CA3AF"
                    maxLength={6}
                    keyboardType="numeric"
                    autoFocus
                  />

                  <TouchableOpacity 
                    style={styles.button}
                    onPress={handleVerifyCode}
                  >
                    <Text style={styles.buttonText}>Xác nhận mã</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={styles.resendButton}
                    onPress={handleResendCode}
                    disabled={isLoading}
                  >
                    <Text style={styles.resendText}>
                      {isLoading ? 'Đang gửi lại...' : 'Gửi lại mã'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}

          {/* Step 3: Reset Password */}
          {step === 3 && (
            <View style={styles.formContainer}>
              <View style={styles.card}>
                <View style={styles.iconContainer}>
                  <View style={styles.lockIcon}>
                    <Text style={styles.lockText}>🔑</Text>
                  </View>
                </View>

                <Text style={styles.title}>Đặt lại mật khẩu mới</Text>
                <Text style={styles.subtitle}>
                  Nhập mật khẩu mới cho tài khoản của bạn
                </Text>

                <View style={styles.form}>
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

                  <TouchableOpacity 
                    style={styles.button}
                    onPress={handleResetPassword}
                  >
                    <Text style={styles.buttonText}>Đặt lại mật khẩu</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
        </ScrollView>
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
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 20,
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  backIcon: {
    fontSize: 28,
    color: '#374151',
    fontWeight: '600',
  },
  formContainer: {
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 32,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  lockIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#DBEAFE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lockText: {
    fontSize: 36,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 20,
  },
  form: {
    width: '100%',
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#111827',
  },
  codeInput: {
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '600',
    letterSpacing: 4,
  },
  button: {
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 24,
    shadowColor: '#3B82F6',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  buttonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  resendButton: {
    alignItems: 'center',
    marginTop: 16,
    paddingVertical: 8,
  },
  resendText: {
    color: '#3B82F6',
    fontSize: 16,
    fontWeight: '600',
  },
});
