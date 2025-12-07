import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { requestBusinessUpgrade, checkPaymentStatus } from '../API/Api';

export default function MoMoQRPayment({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [qrCodeUrl, setQrCodeUrl] = useState(null);
  const [paymentId, setPaymentId] = useState(null);
  const [remainingSeconds, setRemainingSeconds] = useState(300); // 5 minutes = 300 seconds
  const [checkingPayment, setCheckingPayment] = useState(false);
  const pollingInterval = useRef(null);
  const countdownInterval = useRef(null);

  useEffect(() => {
    initiatePayment();
    return () => {
      // Cleanup intervals on unmount
      if (pollingInterval.current) clearInterval(pollingInterval.current);
      if (countdownInterval.current) clearInterval(countdownInterval.current);
    };
  }, []);

  const initiatePayment = async () => {
    try {
      setLoading(true);
      const response = await requestBusinessUpgrade();
      
      if (response?.success) {
        const { qrCodeUrl: qrUrl, paymentId: pId, remainingSeconds: remSec } = response.data;
        setQrCodeUrl(qrUrl);
        setPaymentId(pId);
        setRemainingSeconds(remSec || 300);
        
        // Start polling for payment status
        startPaymentPolling(pId);
        
        // Start countdown timer
        startCountdown();
      } else {
        throw new Error(response?.message || 'Không thể tạo mã QR thanh toán');
      }
    } catch (error) {
      console.error('Payment initiation error:', error);
      Alert.alert(
        'Lỗi',
        error.message || 'Không thể khởi tạo thanh toán. Vui lòng thử lại.',
        [
          {
            text: 'Thử lại',
            onPress: () => initiatePayment(),
          },
          {
            text: 'Quay lại',
            style: 'cancel',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } finally {
      setLoading(false);
    }
  };

  const startPaymentPolling = (pId) => {
    // Poll every 3 seconds
    pollingInterval.current = setInterval(async () => {
      await checkPayment(pId);
    }, 3000);
  };

  const startCountdown = () => {
    countdownInterval.current = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          // Time expired
          clearInterval(countdownInterval.current);
          clearInterval(pollingInterval.current);
          handlePaymentExpired();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const checkPayment = async (pId) => {
    if (checkingPayment) return; // Prevent multiple simultaneous checks
    
    try {
      setCheckingPayment(true);
      const response = await checkPaymentStatus(pId);
      
      if (response?.success) {
        const status = response.status?.toLowerCase();
        
        if (status === 'success' || status === 'completed') {
          // Payment successful!
          clearInterval(pollingInterval.current);
          clearInterval(countdownInterval.current);
          handlePaymentSuccess();
        } else if (status === 'failed') {
          clearInterval(pollingInterval.current);
          clearInterval(countdownInterval.current);
          handlePaymentFailed();
        } else if (status === 'expired') {
          clearInterval(pollingInterval.current);
          clearInterval(countdownInterval.current);
          handlePaymentExpired();
        }
        // If status is 'pending', continue polling
      }
    } catch (error) {
      console.error('Payment check error:', error);
      // Continue polling even if there's an error
    } finally {
      setCheckingPayment(false);
    }
  };

  const handlePaymentSuccess = () => {
    Alert.alert(
      'Thành công! 🎉',
      'Tài khoản của bạn đã được nâng cấp lên doanh nghiệp thành công!',
      [
        {
          text: 'OK',
          onPress: () => {
            // Navigate to Home and refresh profile
            navigation.reset({
              index: 0,
              routes: [{ name: 'Home' }],
            });
          },
        },
      ],
      { cancelable: false }
    );
  };

  const handlePaymentFailed = () => {
    Alert.alert(
      'Thanh toán thất bại',
      'Giao dịch không thành công. Vui lòng thử lại.',
      [
        {
          text: 'Thử lại',
          onPress: () => {
            navigation.goBack();
            setTimeout(() => navigation.navigate('MoMoQRPayment'), 100);
          },
        },
        {
          text: 'Hủy',
          style: 'cancel',
          onPress: () => {
            navigation.reset({
              index: 0,
              routes: [{ name: 'MainTabs', params: { screen: 'Profile' } }],
            });
          },
        },
      ]
    );
  };

  const handlePaymentExpired = () => {
    Alert.alert(
      'Mã QR đã hết hạn',
      'Mã QR thanh toán đã hết hiệu lực. Vui lòng tạo mã mới.',
      [
        {
          text: 'Tạo mã mới',
          onPress: () => initiatePayment(),
        },
        {
          text: 'Hủy',
          style: 'cancel',
          onPress: () => {
            navigation.reset({
              index: 0,
              routes: [{ name: 'MainTabs', params: { screen: 'Profile' } }],
            });
          },
        },
      ]
    );
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleCancel = () => {
    Alert.alert(
      'Hủy thanh toán',
      'Bạn có chắc chắn muốn hủy giao dịch này?',
      [
        {
          text: 'Không',
          style: 'cancel',
        },
        {
          text: 'Hủy giao dịch',
          style: 'destructive',
          onPress: () => {
            clearInterval(pollingInterval.current);
            clearInterval(countdownInterval.current);
            navigation.reset({
              index: 0,
              routes: [{ name: 'MainTabs', params: { screen: 'Profile' } }],
            });
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0095f6" />
        <Text style={styles.loadingText}>Đang tạo mã QR thanh toán...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleCancel} style={styles.backButton}>
          <Ionicons name="close" size={28} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Thanh toán MoMo</Text>
        <View style={{ width: 28 }} />
      </View>

      {/* Content */}
      <View style={styles.content}>
        {/* Timer */}
        <View style={[styles.timerContainer, remainingSeconds < 60 && styles.timerWarning]}>
          <Ionicons 
            name="time-outline" 
            size={24} 
            color={remainingSeconds < 60 ? '#ef4444' : '#0095f6'} 
          />
          <Text style={[styles.timerText, remainingSeconds < 60 && styles.timerTextWarning]}>
            Còn lại: {formatTime(remainingSeconds)}
          </Text>
        </View>

        <Text style={styles.title}>Quét mã QR để thanh toán</Text>
        <Text style={styles.subtitle}>
          Sử dụng ứng dụng MoMo để quét mã QR bên dưới
        </Text>

        {/* QR Code */}
        <View style={styles.qrContainer}>
          {qrCodeUrl ? (
            <Image 
              source={{ uri: qrCodeUrl }}
              style={styles.qrCode}
              resizeMode="contain"
            />
          ) : (
            <View style={styles.qrPlaceholder}>
              <Ionicons name="qr-code-outline" size={120} color="#d1d5db" />
            </View>
          )}
        </View>

        {/* Amount */}
        <View style={styles.amountContainer}>
          <Text style={styles.amountLabel}>Số tiền:</Text>
          <Text style={styles.amountValue}>1.000 VND</Text>
        </View>

        {/* Instructions */}
        <View style={styles.instructionsContainer}>
          <Text style={styles.instructionsTitle}>Hướng dẫn thanh toán:</Text>
          <View style={styles.instructionItem}>
            <Text style={styles.instructionNumber}>1.</Text>
            <Text style={styles.instructionText}>Mở ứng dụng MoMo trên điện thoại</Text>
          </View>
          <View style={styles.instructionItem}>
            <Text style={styles.instructionNumber}>2.</Text>
            <Text style={styles.instructionText}>Chọn "Quét mã QR"</Text>
          </View>
          <View style={styles.instructionItem}>
            <Text style={styles.instructionNumber}>3.</Text>
            <Text style={styles.instructionText}>Quét mã QR trên màn hình này</Text>
          </View>
          <View style={styles.instructionItem}>
            <Text style={styles.instructionNumber}>4.</Text>
            <Text style={styles.instructionText}>Xác nhận thanh toán 1.000 VND</Text>
          </View>
        </View>

        {/* Status */}
        <View style={styles.statusContainer}>
          <ActivityIndicator size="small" color="#0095f6" />
          <Text style={styles.statusText}>Đang chờ thanh toán...</Text>
        </View>
      </View>

      {/* Cancel Button */}
      <View style={styles.footer}>
        <TouchableOpacity 
          style={styles.cancelButton}
          onPress={handleCancel}
          activeOpacity={0.8}
        >
          <Text style={styles.cancelButtonText}>Hủy giao dịch</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  timerWarning: {
    backgroundColor: '#fef2f2',
  },
  timerText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0095f6',
    marginLeft: 8,
  },
  timerTextWarning: {
    color: '#ef4444',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  qrContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  qrCode: {
    width: 250,
    height: 250,
  },
  qrPlaceholder: {
    width: 250,
    height: 250,
    alignItems: 'center',
    justifyContent: 'center',
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  amountLabel: {
    fontSize: 16,
    color: '#6b7280',
  },
  amountValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0095f6',
    marginLeft: 8,
  },
  instructionsContainer: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  instructionsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  instructionItem: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  instructionNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0095f6',
    width: 20,
  },
  instructionText: {
    fontSize: 14,
    color: '#4b5563',
    flex: 1,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  statusText: {
    fontSize: 14,
    color: '#6b7280',
    marginLeft: 8,
  },
  footer: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  cancelButton: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  cancelButtonText: {
    color: '#ef4444',
    fontSize: 16,
    fontWeight: '600',
  },
});
