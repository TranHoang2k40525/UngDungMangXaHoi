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
  ScrollView,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useUser } from '../Context/UserContext';

export default function SignUp() {
  const [username, setUsername] = useState(''); // Thêm field Username
  const [fullName, setFullName] = useState(''); // Tên (first name)
  const [lastName, setLastName] = useState(''); // Họ (last name)
  const [birthDate, setBirthDate] = useState(''); // dd/mm/yyyy
  const [gender, setGender] = useState('Nữ'); // 'Nam', 'Nữ', 'Khác'
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigation = useNavigation();
  const { register } = useUser();

  const parseDateOfBirth = (dateStr) => {
    if (!dateStr) return new Date();
    const [day, month, year] = dateStr.split('/').map(Number);
    return new Date(year, month - 1, day); // JS Date: month 0-based
  };

  const handleSignUp = async () => {
    if (!username || !fullName || !lastName || !birthDate || !phoneNumber || !email || !password) {
      Alert.alert('Lỗi', 'Vui lòng điền đầy đủ thông tin.');
      return;
    }

    setIsLoading(true);

    const fullNameCombined = `${lastName} ${fullName}`; // Họ + Tên
    const dateOfBirth = parseDateOfBirth(birthDate);

    const userData = {
      Username: username,
      FullName: fullNameCombined,
      DateOfBirth: dateOfBirth.toISOString(), // Backend mong DateTime, gửi ISO string
      Email: email,
      Phone: phoneNumber,
      Password: password,
      Gender: gender,
    };

    try {
      const result = await register(userData);
      if (result.success) {
        Alert.alert('Thành công', result.data.message || 'OTP đã gửi đến email. Vui lòng verify.');
        navigation.navigate('VerifyOtp', { email }); // Navigate đến VerifyOtp screen
      } else {
        Alert.alert('Lỗi', result.error || 'Đăng ký thất bại.');
      }
    } catch (error) {
      Alert.alert('Lỗi', error.message || 'Đăng ký thất bại.');
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
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
              <Text style={styles.backIcon}>←</Text>
            </TouchableOpacity>
            <Text style={styles.title}>SIGN UP</Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {/* Username */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Tên người dùng (Username):</Text>
              <TextInput
                style={styles.input}
                value={username}
                onChangeText={setUsername}
                placeholder="Nhập username"
                placeholderTextColor="#9CA3AF"
                autoCapitalize="none"
              />
            </View>

            {/* Họ */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Họ:</Text>
              <TextInput
                style={styles.input}
                value={lastName}
                onChangeText={setLastName}
                placeholder="Nhập họ"
                placeholderTextColor="#9CA3AF"
                autoCapitalize="words"
              />
            </View>

            {/* Tên */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Tên:</Text>
              <TextInput
                style={styles.input}
                value={fullName}
                onChangeText={setFullName}
                placeholder="Nhập tên"
                placeholderTextColor="#9CA3AF"
                autoCapitalize="words"
              />
            </View>

            {/* Ngày sinh và Giới tính */}
            <View style={styles.rowContainer}>
              <View style={styles.dateContainer}>
                <Text style={styles.label}>Ngày sinh: dd/mm/yyyy</Text>
                <TextInput
                  style={styles.input}
                  value={birthDate}
                  onChangeText={setBirthDate}
                  placeholder="dd/mm/yyyy"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.genderContainer}>
                <Text style={styles.label}>Giới tính:</Text>
                <View style={styles.radioGroup}>
                  {['Nam', 'Nữ', 'Khác'].map((option) => (
                    <TouchableOpacity
                      key={option}
                      style={styles.radioOption}
                      onPress={() => setGender(option)}
                    >
                      <View style={styles.radioOuter}>
                        {gender === option && <View style={styles.radioInner} />}
                      </View>
                      <Text style={styles.radioLabel}>{option}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>

            {/* Số điện thoại */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Số điện thoại:</Text>
              <TextInput
                style={styles.input}
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                placeholder="Nhập số điện thoại"
                placeholderTextColor="#9CA3AF"
                keyboardType="phone-pad"
              />
            </View>

            {/* Email */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Email:</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="Nhập email"
                placeholderTextColor="#9CA3AF"
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>

            {/* Mật khẩu */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Mật khẩu:</Text>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="Nhập mật khẩu (ít nhất 8 ký tự)"
                placeholderTextColor="#9CA3AF"
                secureTextEntry
                autoCapitalize="none"
              />
            </View>

            {/* Đăng ký Button */}
            <TouchableOpacity 
              style={[styles.signupButton, isLoading && styles.signupButtonDisabled]} 
              onPress={handleSignUp}
              disabled={isLoading}
            >
              <Text style={styles.signupButtonText}>
                {isLoading ? 'Đang đăng ký...' : 'Đăng ký'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

// Styles giữ nguyên như file cũ
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
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
    position: 'relative',
    paddingTop: 80,
    paddingBottom: 30,
    paddingHorizontal: 24,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    position: 'absolute',
    left: 24,
    top: 80,
    zIndex: 10,
  },
  backIcon: {
    fontSize: 28,
    color: '#374151',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    letterSpacing: 1,
  },
  form: {
    paddingHorizontal: 32,
    paddingTop: 20,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 14,
    color: '#111827',
  },
  rowContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  dateContainer: {
    flex: 1,
    marginRight: 12,
  },
  genderContainer: {
    flex: 1,
    marginLeft: 12,
  },
  radioGroup: {
    flexDirection: 'column',
    gap: 12,
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#3B82F6',
  },
  radioLabel: {
    fontSize: 14,
    color: '#374151',
  },
  signupButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 25,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 20,
    shadowColor: '#3B82F6',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  signupButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  signupButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
});