import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function BusinessPaymentPackage({ navigation }) {
  const handleSelectPackage = () => {
    Alert.alert(
      'Xác nhận thanh toán',
      'Bạn có chắc chắn muốn nâng cấp tài khoản doanh nghiệp với gói 1.000 VND/năm?',
      [
        {
          text: 'Hủy',
          style: 'cancel',
        },
        {
          text: 'Xác nhận',
          onPress: () => navigation.navigate('MoMoQRPayment'),
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chọn gói nâng cấp</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text style={styles.title}>Gói tài khoản doanh nghiệp</Text>
        <Text style={styles.subtitle}>
          Nâng tầm thương hiệu của bạn với tài khoản doanh nghiệp
        </Text>

        {/* Package Card */}
        <View style={styles.packageCard}>
          <View style={styles.packageHeader}>
            <View style={styles.packageIconContainer}>
              <Ionicons name="business" size={32} color="#0095f6" />
            </View>
            <Text style={styles.packageName}>Business Premium</Text>
          </View>

          <View style={styles.priceContainer}>
            <Text style={styles.priceAmount}>1.000 VND</Text>
            <Text style={styles.pricePeriod}>/năm</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.benefitsContainer}>
            <Text style={styles.benefitsTitle}>Quyền lợi bao gồm:</Text>
            
            <View style={styles.benefitItem}>
              <Ionicons name="checkmark-circle" size={20} color="#10b981" />
              <Text style={styles.benefitText}>Dấu tích xanh xác thực</Text>
            </View>

            <View style={styles.benefitItem}>
              <Ionicons name="checkmark-circle" size={20} color="#10b981" />
              <Text style={styles.benefitText}>Quảng cáo bài viết của bạn</Text>
            </View>

            <View style={styles.benefitItem}>
              <Ionicons name="checkmark-circle" size={20} color="#10b981" />
              <Text style={styles.benefitText}>Ưu tiên hiển thị nội dung</Text>
            </View>

            
          </View>

          <View style={styles.divider} />

          <View style={styles.durationContainer}>
            <Ionicons name="time-outline" size={20} color="#6b7280" />
            <Text style={styles.durationText}>Thời gian hiệu lực: 1 tháng</Text>
          </View>
        </View>

        {/* Payment Info */}
        <View style={styles.paymentInfo}>
          <Ionicons name="information-circle-outline" size={20} color="#6b7280" />
          <Text style={styles.paymentInfoText}>
            Thanh toán qua MoMo QR Code. Mã QR có hiệu lực trong 5 phút.
          </Text>
        </View>
      </View>

      {/* Bottom Button */}
      <View style={styles.footer}>
        <TouchableOpacity 
          style={styles.payButton}
          onPress={handleSelectPackage}
          activeOpacity={0.8}
        >
          <Text style={styles.payButtonText}>Tiếp tục thanh toán</Text>
          <Ionicons name="arrow-forward" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 12,
    backgroundColor: '#fff',
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
    paddingTop: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 32,
  },
  packageCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  packageHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  packageIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  packageName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    marginBottom: 24,
  },
  priceAmount: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#0095f6',
  },
  pricePeriod: {
    fontSize: 16,
    color: '#6b7280',
    marginLeft: 4,
  },
  divider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginVertical: 20,
  },
  benefitsContainer: {
    marginBottom: 0,
  },
  benefitsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 16,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  benefitText: {
    fontSize: 14,
    color: '#4b5563',
    marginLeft: 10,
  },
  durationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  durationText: {
    fontSize: 14,
    color: '#6b7280',
    marginLeft: 8,
  },
  paymentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginTop: 20,
  },
  paymentInfoText: {
    fontSize: 13,
    color: '#6b7280',
    marginLeft: 10,
    flex: 1,
  },
  footer: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  payButton: {
    backgroundColor: '#0095f6',
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  payButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
});
