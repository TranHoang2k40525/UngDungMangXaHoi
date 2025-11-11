import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
  RefreshControl,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { getProfile, updateProfile, API_BASE_URL } from '../API/Api';
import { Ionicons } from '@expo/vector-icons';

export default function Editprofile() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [isEditing, setIsEditing] = useState(true);
  const [name, setName] = useState('');
  const [initialName, setInitialName] = useState('');
  const [fullName, setFullName] = useState('');
  const [dob, setDob] = useState('');
  const [address, setAddress] = useState('');
  const [gender, setGender] = useState('Khác');
  const [avatar, setAvatar] = useState(null);
  const [bio, setBio] = useState('');
  const [website, setWebsite] = useState('');
  const [hometown, setHometown] = useState('');
  const [job, setJob] = useState('');
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const me = await getProfile();
        if (me) {
          setName(me.username || '');
          setInitialName(me.username || '');
          setFullName(me.fullName || '');
          setDob(me.dateOfBirth ? new Date(me.dateOfBirth).toISOString().slice(0,10) : '');
          setAddress(me.address || '');
          // Map gender from server ("Nam"/"Nữ"/"Khác") to local values used in UI ('Male'/'Female'/others)
          const g = (me.gender || '').toLowerCase();
          setGender(g.includes('nam') ? 'Male' : g.includes('nữ') || g.includes('nu') || g.includes('female') ? 'Female' : 'Khác');
          const rawAvatar = me.avatarUrl;
          const avatarUri = rawAvatar ? (rawAvatar.startsWith('http') ? rawAvatar : `${API_BASE_URL}${rawAvatar}`) : null;
          setAvatar(avatarUri);
          setBio(me.bio || '');
          setWebsite(me.website || '');
          setHometown(me.hometown || '');
          setJob(me.job || '');
        }
      } catch (e) {
        console.warn('Load profile error', e);
      }
    })();
  }, []);

  const handleSave = async () => {
    try {
      setSaving(true);
      // Map lại giới tính về format server mong muốn ("Nam"/"Nữ"/"Khác")
      const serverGender = gender === 'Male' ? 'Nam' : gender === 'Female' ? 'Nữ' : 'Khác';
      // Lưu ý: Endpoint hiện tại chưa hỗ trợ đổi username. Chỉ gửi các trường được hỗ trợ.
      const payload = {
        FullName: fullName,
        Gender: serverGender,
        Bio: bio,
        DateOfBirth: dob ? new Date(dob).toISOString() : null,
        Address: address,
        Hometown: hometown,
        Job: job,
        Website: website,
      };
      // Nếu người dùng đổi username, thông báo trước (vì backend chưa hỗ trợ tại endpoint này)
      if (name && initialName && name !== initialName) {
        // Không chặn lưu các trường khác; chỉ cảnh báo đổi username chưa được áp dụng
        // Có thể thay bằng Alert.alert nếu muốn popup
        console.log('[Editprofile] Username change is not supported by current endpoint.');
      }
      await updateProfile(payload);
      // Sau khi cập nhật, lấy lại profile để đảm bảo hiển thị mới nhất
      try {
        const refreshed = await getProfile();
        if (refreshed) {
          setName(refreshed.username || name);
          setFullName(refreshed.fullName || fullName);
          setDob(refreshed.dateOfBirth ? new Date(refreshed.dateOfBirth).toISOString().slice(0,10) : dob);
          setAddress(refreshed.address ?? address);
          const g = (refreshed.gender || '').toLowerCase();
          setGender(g.includes('nam') ? 'Male' : g.includes('nữ') || g.includes('nu') ? 'Female' : 'Khác');
          setBio(refreshed.bio ?? bio);
          setWebsite(refreshed.website ?? website);
          setHometown(refreshed.hometown ?? hometown);
          setJob(refreshed.job ?? job);
        }
      } catch {}
      setIsEditing(false);
      navigation.goBack();
    } catch (e) {
      console.warn('Update profile error', e);
      alert('Cập nhật hồ sơ thất bại');
    } finally {
      setSaving(false);
    }
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
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={(insets?.top || 0) + 56}
      >
        {/* Top bar */}
        <View style={[styles.header, { paddingTop: insets.top }] }>
          <TouchableOpacity onPress={handleCancel} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={styles.cancelButton}>Hủy</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Chỉnh sửa hồ sơ</Text>
          <TouchableOpacity onPress={handleSave} disabled={saving} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={[styles.doneButton, saving && { opacity: 0.6 }]}>{saving ? 'Đang lưu…' : 'Lưu'}</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: (insets.bottom || 0) + 24, flexGrow: 1 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async ()=>{
            try {
              setRefreshing(true);
              const me = await getProfile();
              if (me) {
                setName(me.username || '');
                setInitialName(me.username || '');
                setFullName(me.fullName || '');
                setDob(me.dateOfBirth ? new Date(me.dateOfBirth).toISOString().slice(0,10) : '');
                setAddress(me.address || '');
                const g = (me.gender || '').toLowerCase();
                setGender(g.includes('nam') ? 'Male' : g.includes('nữ') || g.includes('nu') || g.includes('female') ? 'Female' : 'Khác');
                const rawAvatar = me.avatarUrl;
                const avatarUri = rawAvatar ? (rawAvatar.startsWith('http') ? rawAvatar : `${API_BASE_URL}${rawAvatar}`) : null;
                setAvatar(avatarUri);
                setBio(me.bio || '');
                setWebsite(me.website || '');
                setHometown(me.hometown || '');
                setJob(me.job || '');
              }
            } catch(e){ console.warn('Editprofile refresh error', e);} finally { setRefreshing(false);} }} />}
        >
          {/* Avatar */}
          <View style={styles.profileSection}>
            {avatar ? (
              <Image source={{ uri: avatar }} style={styles.profileImage} />
            ) : (
              <View style={[styles.profileImage, { justifyContent: 'center', alignItems: 'center', backgroundColor: '#e5e7eb' }]}>
                <Ionicons name="person" size={40} color="#9ca3af" />
              </View>
            )}
            <TouchableOpacity onPress={pickImage}>
              <Text style={styles.changePhoto}>Tải ảnh từ thiết bị</Text>
            </TouchableOpacity>
            <Text style={styles.avatarHint}>Mẹo: Bạn có thể đổi avatar nhanh ở trang Hồ sơ bằng cách chạm vào ảnh.</Text>
          </View>

          {/* Form */}
          <View style={styles.formContainer}>
            <View style={styles.form}>
              {/* Họ và tên */}
              <Text style={styles.inputLabel}>Họ và tên</Text>
              <TextInput
                style={styles.input}
                value={fullName}
                onChangeText={setFullName}
                placeholder="Nhập họ và tên"
                placeholderTextColor="#9CA3AF"
                autoCapitalize="words"
              />

              {/* Tên người dùng */}
              <Text style={styles.inputLabel}>Tên người dùng</Text>
              <TextInput
                style={[styles.input, { backgroundColor: '#F3F4F6', color: '#6B7280' }]}
                value={name}
                onChangeText={setName}
                editable={false}
                placeholder="Ví dụ: hoangtest"
                placeholderTextColor="#9CA3AF"
                autoCapitalize="none"
              />
              <Text style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>
                Tên người dùng hiện chưa thể đổi tại màn hình này.
              </Text>

              {/* Ngày sinh */}
              <Text style={styles.inputLabel}>Ngày sinh (YYYY-MM-DD)</Text>
              <TextInput
                style={styles.input}
                value={dob}
                onChangeText={setDob}
                placeholder="2004-05-25"
                placeholderTextColor="#9CA3AF"
                keyboardType="numbers-and-punctuation"
              />

              {/* Giới tính */}
              <Text style={styles.inputLabel}>Giới tính</Text>
              <View style={styles.genderRow}>
                <TouchableOpacity
                  style={[styles.genderPill, gender === 'Male' && styles.genderPillActive]}
                  onPress={() => setGender('Male')}
                >
                  <Text style={[styles.genderText, gender === 'Male' && styles.genderTextActive]}>Nam</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.genderPill, gender === 'Female' && styles.genderPillActive]}
                  onPress={() => setGender('Female')}
                >
                  <Text style={[styles.genderText, gender === 'Female' && styles.genderTextActive]}>Nữ</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.genderPill, gender !== 'Male' && gender !== 'Female' && styles.genderPillActive]}
                  onPress={() => setGender('Khác')}
                >
                  <Text style={[styles.genderText, gender !== 'Male' && gender !== 'Female' && styles.genderTextActive]}>Khác</Text>
                </TouchableOpacity>
              </View>

              {/* Website */}
              <Text style={styles.inputLabel}>Website</Text>
              <TextInput
                style={styles.input}
                value={website}
                onChangeText={setWebsite}
                placeholder="https://example.com"
                placeholderTextColor="#9CA3AF"
                autoCapitalize="none"
              />

              {/* Nghề nghiệp */}
              <Text style={styles.inputLabel}>Nghề nghiệp</Text>
              <TextInput
                style={styles.input}
                value={job}
                onChangeText={setJob}
                placeholder="VD: Lập trình viên"
                placeholderTextColor="#9CA3AF"
              />

              {/* Quê quán */}
              <Text style={styles.inputLabel}>Quê quán</Text>
              <TextInput
                style={styles.input}
                value={hometown}
                onChangeText={setHometown}
                placeholder="VD: TP.HCM"
                placeholderTextColor="#9CA3AF"
              />

              {/* Địa chỉ */}
              <Text style={styles.inputLabel}>Địa chỉ</Text>
              <TextInput
                style={styles.input}
                value={address}
                onChangeText={setAddress}
                placeholder="Địa chỉ hiện tại"
                placeholderTextColor="#9CA3AF"
              />

              {/* Tiểu sử */}
              <Text style={styles.inputLabel}>Tiểu sử</Text>
              <TextInput
                style={[styles.input, { height: 90, textAlignVertical: 'top' }]}
                value={bio}
                onChangeText={setBio}
                placeholder="Giới thiệu ngắn về bạn"
                placeholderTextColor="#9CA3AF"
                multiline
              />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFFFFF' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
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
    paddingTop: 16,
    paddingBottom: 8,
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
  avatarHint: {
    marginTop: 6,
    fontSize: 12,
    color: '#6B7280',
  },
  formContainer: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  form: {
    width: '92%',
    maxWidth: 520,
    paddingHorizontal: 4,
  },
  inputLabel: { color: '#374151', fontSize: 14, marginTop: 12, marginBottom: 6, fontWeight: '500' },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    backgroundColor: '#FFFFFF',
  },
  genderRow: { flexDirection: 'row', gap: 8 },
  genderPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  genderPillActive: { backgroundColor: '#111827', borderColor: '#111827' },
  genderText: { color: '#111827', fontSize: 14, fontWeight: '500' },
  genderTextActive: { color: '#FFFFFF' },
});
