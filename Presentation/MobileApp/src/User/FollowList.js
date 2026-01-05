import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, StyleSheet, ActivityIndicator } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { API_BASE_URL, getFollowers, getFollowing } from '../API/Api';
import { useUser } from '../Context/UserContext';

export default function FollowList() {
  const route = useRoute();
  const navigation = useNavigation();
  const { user: currentUser } = useUser(); // Lấy thông tin user hiện tại
  const { userId, type, username } = route.params; // type: 'followers' | 'following'
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Build full URL for avatar
  const getAvatarUri = (avatarUrl) => {
    if (!avatarUrl) return null;
    // ✅ FIX: Handle object avatarUrl
    if (typeof avatarUrl === 'object') {
      avatarUrl = avatarUrl.uri || avatarUrl.url || null;
      if (!avatarUrl) return null;
    }
    const avatarStr = String(avatarUrl);
    if (avatarStr.startsWith('http')) return avatarStr;
    return `${API_BASE_URL}${avatarStr}`;
  };

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        let data = [];
        if (type === 'followers') {
          data = await getFollowers(userId);
        } else {
          data = await getFollowing(userId);
        }
        if (alive) {
          setUsers(Array.isArray(data) ? data : []);
          setLoading(false);
        }
      } catch (e) {
        console.warn('[FOLLOW-LIST] Error:', e);
        if (alive) {
          setUsers([]);
          setLoading(false);
        }
      }
    })();
    return () => { alive = false; };
  }, [userId, type]);

  const renderUser = ({ item }) => {
    // Kiểm tra nếu user click vào chính mình
    const isCurrentUser = currentUser && item.userId === currentUser.id;
    
    return (
      <TouchableOpacity
        style={styles.userItem}
        onPress={() => {
          if (isCurrentUser) {
            // Nếu là chính mình, chuyển về Profile
            navigation.navigate('Profile');
          } else {
            // Nếu là người khác, mở UserProfilePublic
            navigation.push('UserProfilePublic', { userId: item.userId });
          }
        }}
      >
        {getAvatarUri(item.avatarUrl) ? (
          <Image source={{ uri: getAvatarUri(item.avatarUrl) }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <Ionicons name="person" size={24} color="#9ca3af" />
          </View>
        )}
        <View style={styles.userInfo}>
          <Text style={styles.username}>
            {item.username}
            {isCurrentUser && <Text style={styles.youBadge}> (Bạn)</Text>}
          </Text>
          <Text style={styles.fullName}>{item.fullName || ''}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={28} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {type === 'followers' ? 'Người theo dõi' : 'Đang theo dõi'}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0095F6" />
        </View>
      ) : (
        <FlatList
          data={users}
          renderItem={renderUser}
          keyExtractor={(item) => item.userId.toString()}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="people-outline" size={48} color="#9ca3af" />
              <Text style={styles.emptyText}>
                {type === 'followers' ? 'Chưa có người theo dõi' : 'Chưa theo dõi ai'}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
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
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingVertical: 8,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  avatarPlaceholder: {
    backgroundColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userInfo: {
    flex: 1,
  },
  username: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  youBadge: {
    fontSize: 13,
    fontWeight: '500',
    color: '#0095F6',
  },
  fullName: {
    fontSize: 13,
    color: '#6b7280',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 12,
  },
});
