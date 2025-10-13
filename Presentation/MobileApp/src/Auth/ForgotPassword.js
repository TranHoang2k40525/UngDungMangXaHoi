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
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { forgotPassword } from '../API/Api';

export default function ForgotPassword() {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
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
      // API trả về response trực tiếp, không có wrapper success
      if (result) {
        Alert.alert('Thành công', 'Mã OTP đã được gửi đến email của bạn.');
        setStep(2);
      } else {
        Alert.alert('Lỗi', 'Không thể gửi mã OTP.');
      }
    } catch (error) {
      Alert.alert('Lỗi', error.message || 'Có lỗi xảy ra.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!verificationCode) {
      Alert.alert('Lỗi', 'Vui lòng nhập mã xác thực');
      return;
    }
    
    setIsLoading(true);
    try {
      const result = await verifyForgotPasswordOtp({ Email: email, Otp: verificationCode });
      // API trả về response trực tiếp, không có wrapper success
      if (result) {
        Alert.alert('Thành công', 'Mã xác thực hợp lệ. Chuyển đến trang đặt lại mật khẩu...');
        // Chuyển sang trang VerifyForgotPasswordOtp với email và OTP
        navigation.navigate('VerifyForgotPasswordOtp', { 
          email: email, 
          otp: verificationCode 
        });
      } else {
        Alert.alert('Lỗi', 'Mã xác thực không đúng.');
      }
    } catch (error) {
      Alert.alert('Lỗi', error.message || 'Xác thực mã thất bại.');
    } finally {
      setIsLoading(false);
    }
  };


  const handleResendCode = async () => {
    setIsLoading(true);
    try {
      const result = await forgotPassword(email);
      // API trả về response trực tiếp, không có wrapper success
      if (result) {
        Alert.alert('Thành công', 'Mã xác thực đã được gửi lại!');
      } else {
        Alert.alert('Lỗi', 'Không thể gửi lại mã OTP.');
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
                    {isLoading ? (
                      <View style={styles.loadingContainer}>
                        <ActivityIndicator size="small" color="#FFFFFF" />
                        <Text style={[styles.buttonText, { marginLeft: 8 }]}>
                          Đang gửi...
                        </Text>
                      </View>
                    ) : (
                      <Text style={styles.buttonText}>Gửi mã OTP</Text>
                    )}
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
                    style={[styles.button, isLoading && styles.buttonDisabled]}
                    onPress={handleVerifyCode}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <View style={styles.loadingContainer}>
                        <ActivityIndicator size="small" color="#FFFFFF" />
                        <Text style={[styles.buttonText, { marginLeft: 8 }]}>
                          Đang xác nhận...
                        </Text>
                      </View>
                    ) : (
                      <Text style={styles.buttonText}>Xác nhận mã</Text>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={[styles.resendButton, isLoading && styles.resendButtonDisabled]}
                    onPress={handleResendCode}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <View style={styles.loadingContainer}>
                        <ActivityIndicator size="small" color="#3B82F6" />
                        <Text style={[styles.resendText, { marginLeft: 8 }]}>
                          Đang gửi lại...
                        </Text>
                      </View>
                    ) : (
                      <Text style={styles.resendText}>Gửi lại mã</Text>
                    )}
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
  resendButtonDisabled: {
    backgroundColor: '#F3F4F6',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
