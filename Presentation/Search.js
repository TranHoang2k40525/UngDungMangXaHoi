import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  FlatList,
  Platform,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

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
      <View style={styles.content}>
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
            <Text style={styles.resultsPlaceholder}>
              Đang tìm kiếm: "{searchText}"
            </Text>
          </View>
        )}
      </View>

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem}>
          <Image
            source={require('./assets/icons8-home-32.png')}
            style={[styles.homeIconImage, { width: 33, height: 33 }]}
          />
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem}>
          <View style={styles.searchIconWrapper}>
            <View style={styles.searchCircle} />
            <View style={styles.searchHandle} />
          </View>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem}>
          <View style={styles.addIconWrapper}>
            <View style={styles.addSquare} />
            <View style={styles.addHorizontal} />
            <View style={styles.addVertical} />
          </View>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.navItem}
          onPress={() => navigation.navigate('Video')}
        >
          <View style={styles.reelsIconWrapper}>
            <View style={styles.reelsSquare} />
            <View style={styles.reelsPlay} />
          </View>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem}>
          <Image
            source={{ uri: 'https://i.pravatar.cc/150?img=9' }}
            style={styles.profileIcon}
          />
        </TouchableOpacity>
      </View>
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
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 0.5,
    borderTopColor: '#DBDBDB',
    backgroundColor: '#FFFFFF',
    marginBottom: 35, // Raised the bottom navigation by adding marginBottom: 50
  },
  navItem: {
    padding: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  homeIconImage: {
    width: 30,
    height: 30,
    borderRadius: 0,
  },
  searchIconWrapper: {
    width: 26,
    height: 26,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  searchCircle: {
    width: 18,
    height: 18,
    borderWidth: 2.5,
    borderColor: '#000',
    borderRadius: 9,
    position: 'absolute',
    top: 2,
    left: 2,
  },
  searchHandle: {
    width: 8,
    height: 2.5,
    backgroundColor: '#000',
    position: 'absolute',
    bottom: 2,
    right: 2,
    transform: [{ rotate: '45deg' }],
    borderRadius: 2,
  },
  addIconWrapper: {
    width: 26,
    height: 26,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  addSquare: {
    width: 24,
    height: 24,
    borderWidth: 2.5,
    borderColor: '#000',
    borderRadius: 3,
  },
  addHorizontal: {
    width: 12,
    height: 2.5,
    backgroundColor: '#000',
    position: 'absolute',
    borderRadius: 2,
  },
  addVertical: {
    width: 2.5,
    height: 12,
    backgroundColor: '#000',
    position: 'absolute',
    borderRadius: 2,
  },
  reelsIconWrapper: {
    width: 26,
    height: 26,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  reelsSquare: {
    width: 24,
    height: 24,
    borderWidth: 2.5,
    borderColor: '#000',
    borderRadius: 4,
  },
  reelsPlay: {
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderTopWidth: 5,
    borderBottomWidth: 5,
    borderLeftColor: '#000',
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    position: 'absolute',
    left: 10,
  },
  profileIcon: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: '#000',
  },
});