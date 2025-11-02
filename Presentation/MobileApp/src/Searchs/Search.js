import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  FlatList,
  ScrollView,
  RefreshControl,
  Platform,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { onTabTriple } from '../Utils/TabRefreshEmitter';

export default function Search() {
  const [searchText, setSearchText] = useState('');
  const [searchHistory, setSearchHistory] = useState([
    'React Native',
    'Instagram UI',
    'Mobile Design',
    'Photography',
  ]);

  const removeHistoryItem = (item) => {
    setSearchHistory(searchHistory.filter(h => h !== item));
  };

  const clearAllHistory = () => {
    setSearchHistory([]);
  };

  const navigation = useNavigation();
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = async () => {
    setRefreshing(true);
    // Placeholder: có thể gọi API tìm kiếm nổi bật hoặc gợi ý
    setTimeout(() => setRefreshing(false), 600);
  };

  useEffect(() => {
    const unsub = onTabTriple('Search', () => { try { onRefresh(); } catch(e){ console.warn('[Search] triple refresh', e); } });
    return unsub;
  }, [onRefresh]);

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="#FFFFFF"
        translucent={false}
      />
      
      {/* Search Header */}
      <View style={styles.searchHeader}>
        <View style={styles.searchBarContainer}>
          <Ionicons name="search" size={20} color="#9CA3AF" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            value={searchText}
            onChangeText={setSearchText}
            placeholder="Tìm kiếm"
            placeholderTextColor="#9CA3AF"
            autoFocus={false}
          />
          {searchText.length > 0 && (
            <TouchableOpacity 
              onPress={() => setSearchText('')}
              style={styles.clearButton}
            >
              <Ionicons name="close-circle" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Search Content */}
      <ScrollView style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {searchText.length === 0 ? (
          // Recent Searches
          <View style={styles.recentSection}>
            <View style={styles.recentHeader}>
              <Text style={styles.recentTitle}>Gần đây</Text>
              {searchHistory.length > 0 && (
                <TouchableOpacity onPress={clearAllHistory}>
                  <Text style={styles.clearAllText}>Xóa tất cả</Text>
                </TouchableOpacity>
              )}
            </View>

            {searchHistory.length > 0 ? (
              <FlatList
                data={searchHistory}
                keyExtractor={(item, index) => index.toString()}
                renderItem={({ item }) => (
                  <View style={styles.historyItem}>
                    <Ionicons name="time-outline" size={20} color="#6B7280" />
                    <Text style={styles.historyText}>{item}</Text>
                    <TouchableOpacity 
                      onPress={() => removeHistoryItem(item)}
                      style={styles.removeButton}
                    >
                      <Ionicons name="close" size={20} color="#9CA3AF" />
                    </TouchableOpacity>
                  </View>
                )}
              />
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>Không có tìm kiếm gần đây</Text>
              </View>
            )}
          </View>
        ) : (
          // Search Results (placeholder)
          <View style={styles.resultsContainer}>
            <Text style={styles.resultsPlaceholder}>{`Đang tìm kiếm: "${searchText}"`}</Text>
          </View>
        )}
      </ScrollView>

      {/* Bottom tab bar is provided globally by the Tab Navigator */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  searchHeader: {
    paddingTop: Platform.OS === 'ios' ? 60 : 20,
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#111827',
    padding: 0,
  },
  clearButton: {
    padding: 4,
  },
  content: {
    flex: 1,
  },
  recentSection: {
    flex: 1,
    paddingTop: 16,
  },
  recentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  recentTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  clearAllText: {
    fontSize: 14,
    color: '#3B82F6',
    fontWeight: '500',
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  historyText: {
    flex: 1,
    fontSize: 15,
    color: '#111827',
    marginLeft: 12,
  },
  removeButton: {
    padding: 4,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyText: {
    fontSize: 15,
    color: '#9CA3AF',
  },
  resultsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultsPlaceholder: {
    fontSize: 15,
    color: '#6B7280',
  },
  // local bottom navigation styles removed; using global Tab Navigator
});
