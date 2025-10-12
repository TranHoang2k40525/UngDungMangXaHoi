import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Image,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

export default function Doanchat() {
  const [message, setMessage] = useState('');
  const navigation = useNavigation();

  const handleSend = () => {
    if (message.trim()) {
      // Xử lý gửi tin nhắn ở đây
      console.log('Sending message:', message);
      setMessage('');
      Keyboard.dismiss();
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      <StatusBar
        barStyle="dark-content"
        backgroundColor="#FFFFFF"
        translucent={false}
      />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="chevron-back" size={24} color="#111827" />
        </TouchableOpacity>
        
        <View style={styles.headerCenter}>
          <Image 
            source={require('../Assets/gai2.png')} 
            style={styles.headerAvatar}
          />
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerName}>Trang Thu</Text>
            <Text style={styles.headerUsername}>tr_thuu</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.headerIcon}>
          <Ionicons name="information-circle-outline" size={24} color="#111827" />
        </TouchableOpacity>
      </View>

      {/* Chat Content */}
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView 
          style={styles.chatContent}
          contentContainerStyle={styles.chatContentContainer}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.profileSection}>
            <Image 
              source={require('../Assets/gai2.png')} 
              style={styles.profileAvatar}
            />
            <Text style={styles.profileName}>Trang Thu</Text>
            <Text style={styles.profileUsername}>tr_thuu</Text>
            <Text style={styles.profileInfo}>96 người theo dõi · 26 bài viết</Text>
            <Text style={styles.profileBio}>
              Các bạn đang theo dõi nhau trên Snap67CS
            </Text>
           
            
            <TouchableOpacity style={styles.viewProfileButton}>
              <Text style={styles.viewProfileButtonText}>Xem trang cá nhân</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </TouchableWithoutFeedback>

      {/* Message Input */}
      <View style={styles.messageInputContainer}>
        <TouchableOpacity style={styles.cameraButton}>
          <Ionicons name="camera-outline" size={24} color="#111827" />
        </TouchableOpacity>
        
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.messageInput}
            value={message}
            onChangeText={setMessage}
            placeholder="Nhắn tin..."
            placeholderTextColor="#9CA3AF"
            multiline
          />
        </View>

        {message.trim() ? (
          <TouchableOpacity 
            style={styles.sendButton}
            onPress={handleSend}
          >
            <Ionicons name="arrow-up" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        ) : (
          <>
            <TouchableOpacity style={styles.micButton}>
              <Ionicons name="mic-outline" size={24} color="#111827" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.imageButton}>
              <Ionicons name="image-outline" size={24} color="#111827" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.likeButton}>
              <Ionicons name="add-circle-outline" size={24} color="#111827" />
            </TouchableOpacity>
          </>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingTop: Platform.OS === 'ios' ? 60 : 20,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  headerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  headerUsername: {
    fontSize: 12,
    color: '#6B7280',
  },
  headerIcon: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatContent: {
    flex: 1,
  },
  chatContentContainer: {
    paddingVertical: 40,
  },
  profileSection: {
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  profileAvatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    marginBottom: 16,
  },
  profileName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  profileUsername: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  profileInfo: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 8,
  },
  profileBio: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 4,
  },
  viewProfileButton: {
    marginTop: 16,
    paddingVertical: 8,
    paddingHorizontal: 32,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
  },
  viewProfileButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  messageInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    paddingBottom: Platform.OS === 'ios' ? 34 : 8,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  cameraButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputWrapper: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 8,
    minHeight: 36,
    justifyContent: 'center',
  },
  messageInput: {
    fontSize: 14,
    color: '#111827',
    maxHeight: 100,
  },
  sendButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
  },
  micButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 4,
  },
  imageButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 4,
  },
  likeButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
