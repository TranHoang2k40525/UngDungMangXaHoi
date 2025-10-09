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
} from 'react-native';
import { useNavigation } from '@react-navigation/native';

export default function SignUp() {
  const [fullName, setFullName] = useState('');
  const [lastName, setLastName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [gender, setGender] = useState('female'); // 'male' or 'female'
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigation = useNavigation();

  const handleSignUp = () => {
    console.log('Sign up with:', {
      fullName,
      lastName,
      birthDate,
      gender,
      phoneNumber,
      email,
      password,
    });
    navigation.navigate('Login');
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
            {/* Tên người dùng */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Tên người dùng:</Text>
              <TextInput
                style={styles.input}
                value={fullName}
                onChangeText={setFullName}
                placeholder=""
                placeholderTextColor="#9CA3AF"
                autoCapitalize="words"
              />
            </View>

            {/* Họ và tên */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Họ và tên:</Text>
              <TextInput
                style={styles.input}
                value={lastName}
                onChangeText={setLastName}
                placeholder=""
                placeholderTextColor="#9CA3AF"
                autoCapitalize="words"
              />
            </View>

            {/* Ngày sinh và Giới tính */}
            <View style={styles.rowContainer}>
              <View style={styles.dateContainer}>
                <Text style={styles.label}>Ngày sinh: dd/mm/yy</Text>
                <TextInput
                  style={styles.input}
                  value={birthDate}
                  onChangeText={setBirthDate}
                  placeholder=""
                  placeholderTextColor="#9CA3AF"
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.genderContainer}>
                <Text style={styles.label}>Giới tính:</Text>
                <View style={styles.radioGroup}>
                  <TouchableOpacity
                    style={styles.radioOption}
                    onPress={() => setGender('male')}
                  >
                    <View style={styles.radioOuter}>
                      {gender === 'male' && <View style={styles.radioInner} />}
                    </View>
                    <Text style={styles.radioLabel}>Male</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.radioOption}
                    onPress={() => setGender('female')}
                  >
                    <View style={styles.radioOuter}>
                      {gender === 'female' && <View style={styles.radioInner} />}
                    </View>
                    <Text style={styles.radioLabel}>Female</Text>
                  </TouchableOpacity>
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
                placeholder=""
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
                placeholder=""
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
                placeholder=""
                placeholderTextColor="#9CA3AF"
                secureTextEntry
                autoCapitalize="none"
              />
            </View>

            {/* Đăng ký Button */}
            <TouchableOpacity style={styles.signupButton} onPress={handleSignUp}>
              <Text style={styles.signupButtonText}>Đăng ký</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

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
});
