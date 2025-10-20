import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';

export default function Editprofile() {
  const navigation = useNavigation();
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState('user123');
  const [fullName, setFullName] = useState('Nguyễn Văn A');
  const [dob, setDob] = useState('01/01/1990');
  const [phone, setPhone] = useState('0123456789');
  const [email, setEmail] = useState('example@gmail.com');
  const [password, setPassword] = useState('password123');
  const [address, setAddress] = useState('123 Đường ABC, Hà Nội');
  const [gender, setGender] = useState('Male');
  const [avatar, setAvatar] = useState('https://i.pravatar.cc/150?img=3');

  const handleSave = () => {
    // Here you can add logic to save the changes, e.g., API call
    setIsEditing(false);
  };

  const handleCancel = () => {
    // Reset to original values if needed
    setIsEditing(false);
    navigation.goBack();
  };

  const pickImage = async () => {
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        alert('Sorry, we need camera roll permissions to make this work!');
        return;
      }
    }
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (!result.cancelled) {
      setAvatar(result.uri);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleCancel}>
          <Text style={styles.cancelButton}>Hủy</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Chỉnh sửa hồ sơ</Text>
        {isEditing ? (
          <TouchableOpacity onPress={handleSave}>
            <Text style={styles.doneButton}>Lưu</Text>
          </TouchableOpacity>
        ) : (
          <Text style={styles.doneButton}></Text> // Placeholder to keep alignment
        )}
      </View>

      <View style={styles.profileSection}>
        <Image
          source={{ uri: avatar }}
          style={styles.profileImage}
        />
        {isEditing && (
          <>
            <TouchableOpacity onPress={pickImage}>
              <Text style={styles.changePhoto}>Tải ảnh từ thiết bị</Text>
            </TouchableOpacity>
            <TouchableOpacity>
              <Text style={styles.changePhoto}>Thay đổi ảnh đại diện</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      <View style={styles.formContainer}>
        <View style={styles.form}>
          <View style={styles.inputRow}>
            <View style={styles.labelContainer}>
              <Text style={styles.label}>Tên người dùng:</Text>
            </View>
            <View style={styles.valueContainer}>
              {isEditing ? (
                <TextInput
                  style={styles.input}
                  value={name}
                  onChangeText={setName}
                />
              ) : (
                <Text style={styles.value}>{name}</Text>
              )}
            </View>
          </View>
          <View style={styles.inputRow}>
            <View style={styles.labelContainer}>
              <Text style={styles.label}>Họ và tên:</Text>
            </View>
            <View style={styles.valueContainer}>
              {isEditing ? (
                <TextInput
                  style={styles.input}
                  value={fullName}
                  onChangeText={setFullName}
                />
              ) : (
                <Text style={styles.value}>{fullName}</Text>
              )}
            </View>
          </View>
          <View style={styles.inputRow}>
            <View style={styles.labelContainer}>
              <Text style={styles.label}>Ngày sinh: dd/mm/yyyy</Text>
            </View>
            <View style={styles.valueContainer}>
              {isEditing ? (
                <TextInput
                  style={styles.input}
                  value={dob}
                  onChangeText={setDob}
                />
              ) : (
                <Text style={styles.value}>{dob}</Text>
              )}
            </View>
          </View>
          <View style={styles.inputRow}>
            <View style={styles.labelContainer}>
              <Text style={styles.label}>Giới tính:</Text>
            </View>
            <View style={styles.valueContainer}>
              {isEditing ? (
                <View style={styles.genderContainer}>
                  <TouchableOpacity
                    style={styles.radioButton}
                    onPress={() => setGender('Male')}
                  >
                    <View style={styles.radioCircle}>
                      {gender === 'Male' && <View style={styles.selectedRb} />}
                    </View>
                    <Text style={styles.radioText}>Nam</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.radioButton}
                    onPress={() => setGender('Female')}
                  >
                    <View style={styles.radioCircle}>
                      {gender === 'Female' && <View style={styles.selectedRb} />}
                    </View>
                    <Text style={styles.radioText}>Nữ</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <Text style={styles.value}>{gender === 'Male' ? 'Nam' : 'Nữ'}</Text>
              )}
            </View>
          </View>
          <View style={styles.inputRow}>
            <View style={styles.labelContainer}>
              <Text style={styles.label}>Số điện thoại:</Text>
            </View>
            <View style={styles.valueContainer}>
              {isEditing ? (
                <TextInput
                  style={styles.input}
                  value={phone}
                  onChangeText={setPhone}
                />
              ) : (
                <Text style={styles.value}>{phone}</Text>
              )}
            </View>
          </View>
          <View style={styles.inputRow}>
            <View style={styles.labelContainer}>
              <Text style={styles.label}>Email:</Text>
            </View>
            <View style={styles.valueContainer}>
              {isEditing ? (
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                />
              ) : (
                <Text style={styles.value}>{email}</Text>
              )}
            </View>
          </View>
          <View style={styles.inputRow}>
            <View style={styles.labelContainer}>
              <Text style={styles.label}>Mật khẩu:</Text>
            </View>
            <View style={styles.valueContainer}>
              {isEditing ? (
                <TextInput
                  style={styles.input}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                />
              ) : (
                <Text style={styles.value}>********</Text>
              )}
            </View>
          </View>
          <View style={styles.inputRow}>
            <View style={styles.labelContainer}>
              <Text style={styles.label}>Địa chỉ:</Text>
            </View>
            <View style={styles.valueContainer}>
              {isEditing ? (
                <TextInput
                  style={styles.input}
                  value={address}
                  onChangeText={setAddress}
                />
              ) : (
                <Text style={styles.value}>{address}</Text>
              )}
            </View>
          </View>
        </View>
      </View>

      {!isEditing && (
        <View style={styles.buttonWrapper}>
          <TouchableOpacity 
            style={styles.editButton}
            onPress={() => setIsEditing(true)}
          >
            <Text style={styles.editButtonText}>Sửa thông tin</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 50, // Push header down by 150px
  },
  cancelButton: {
    color: '#007AFF',
    fontSize: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  doneButton: {
    color: '#007AFF',
    fontSize: 16,
  },
  profileSection: {
    alignItems: 'center',
    marginBottom: 10, // Reduced from 20 to 10 to bring form closer to avatar
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 10,
  },
  changePhoto: {
    color: '#007AFF',
    fontSize: 14,
    marginTop: 5,
  },
  formContainer: {
    flex: 1,
    justifyContent: 'flex-start', // Changed to flex-start to pull form up
    alignItems: 'center',
  },
  form: {
    width: '80%', // Reduce width to center content better
    maxWidth: 400,
  },
  inputRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  labelContainer: {
    flex: 1,
    marginRight: 10,
  },
  valueContainer: {
    flex: 2,
  },
  label: {
    color: '#8E8E93',
    fontSize: 14,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D3D3D3',
    borderRadius: 5,
    padding: 10,
    fontSize: 14,
    flex: 1,
  },
  value: {
    fontSize: 14,
    color: '#000000',
  },
  genderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  radioButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20,
  },
  radioCircle: {
    height: 20,
    width: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedRb: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#007AFF',
  },
  radioText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#000',
  },
  buttonWrapper: {
    position: 'absolute',
    bottom: 100, // Position 100px from the bottom
    width: '100%',
    alignItems: 'center',
  },
  editButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    borderRadius: 5,
    marginLeft: 48,
    width: '80%',
    maxWidth: 400,
  },
  editButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 95,
  },
});
