import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function BusinessUpgradeTerms({ navigation }) {
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const handleContinue = () => {
    if (!agreedToTerms) {
      Alert.alert('Thông báo', 'Vui lòng đồng ý với điều khoản để tiếp tục');
      return;
    }
    navigation.navigate('BusinessPaymentPackage');
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Nâng cấp tài khoản doanh nghiệp</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Điều khoản và Điều kiện</Text>
          <Text style={styles.paragraph}>
            Chào mừng bạn đến với chương trình nâng cấp tài khoản doanh nghiệp của chúng tôi. Vui lòng đọc kỹ các điều khoản sau đây trước khi tiến hành nâng cấp.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionSubtitle}>1. Quyền lợi tài khoản doanh nghiệp</Text>
          <Text style={styles.paragraph}>
            • Dấu tích xanh xác thực bên cạnh tên tài khoản{'\n'}
            • Hiển thị bài viết quảng cáo trong nguồn cấp của người dùng{'\n'}
            • Tăng độ ưu tiên hiển thị nội dung{'\n'}
            • Thống kê chi tiết về tương tác và tiếp cận{'\n'}
            • Hỗ trợ khách hàng ưu tiên
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionSubtitle}>2. Chi phí và thanh toán</Text>
          <Text style={styles.paragraph}>
            • Phí nâng cấp: 1.000 VND/năm{'\n'}
            • Thanh toán qua MoMo QR Code{'\n'}
            • Thời gian hiệu lực: 30 ngày kể từ ngày thanh toán thành công{'\n'}
            • Mã QR có hiệu lực trong 5 phút
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionSubtitle}>3. Chính sách hoàn tiền</Text>
          <Text style={styles.paragraph}>
            • Không hoàn tiền sau khi đã nâng cấp thành công{'\n'}
            • Trong trường hợp thanh toán bị lỗi, số tiền sẽ được hoàn lại tự động trong vòng 24 giờ
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionSubtitle}>4. Quy định sử dụng</Text>
          <Text style={styles.paragraph}>
            • Tài khoản doanh nghiệp phải tuân thủ các quy định cộng đồng{'\n'}
            • Nội dung quảng cáo phải phù hợp và không vi phạm pháp luật{'\n'}
            • Chúng tôi có quyền tạm ngưng tài khoản nếu phát hiện hành vi gian lận hoặc vi phạm{'\n'}
            • Không được chuyển nhượng quyền lợi tài khoản doanh nghiệp cho người khác
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionSubtitle}>5. Liên hệ hỗ trợ</Text>
          <Text style={styles.paragraph}>
            Nếu bạn có bất kỳ thắc mắc nào, vui lòng liên hệ:{'\n'}
            Email: hoangzai2k403@gmail.com{'\n'}
            Hotline: 0388672504
          </Text>
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Checkbox and Button */}
      <View style={styles.footer}>
        <TouchableOpacity 
          style={styles.checkboxContainer} 
          onPress={() => setAgreedToTerms(!agreedToTerms)}
          activeOpacity={0.7}
        >
          <View style={[styles.checkbox, agreedToTerms && styles.checkboxChecked]}>
            {agreedToTerms && <Ionicons name="checkmark" size={18} color="#fff" />}
          </View>
          <Text style={styles.checkboxLabel}>
            Tôi đồng ý với các điều khoản và điều kiện
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.continueButton, !agreedToTerms && styles.continueButtonDisabled]}
          onPress={handleContinue}
          disabled={!agreedToTerms}
          activeOpacity={0.8}
        >
          <Text style={styles.continueButtonText}>Xác nhận</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
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
  },
  section: {
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 12,
  },
  sectionSubtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  paragraph: {
    fontSize: 14,
    lineHeight: 22,
    color: '#4b5563',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 5,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#d1d5db',
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#0095f6',
    borderColor: '#0095f6',
  },
  checkboxLabel: {
    fontSize: 14,
    color: '#1f2937',
    flex: 1,
  },
  continueButton: {
    backgroundColor: '#0095f6',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  continueButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  continueButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
