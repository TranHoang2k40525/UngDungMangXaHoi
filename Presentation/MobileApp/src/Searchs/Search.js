import React, { useState, useEffect, useCallback } from "react";
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
    ActivityIndicator,
    Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { onTabTriple } from "../Utils/TabRefreshEmitter";
import {
    searchUsers,
    searchPosts,
    getSearchSuggestions,
    followUser,
    unfollowUser,
    instantSearchUsers,
    instantSearchPosts,
    API_BASE_URL,
} from "../API/Api";
import SearchUserItem from "./SearchUserItem";
import SearchPostItem from "./SearchPostItem";

const SEARCH_HISTORY_KEY = "search_history";
const MAX_HISTORY_ITEMS = 10;

export default function Search() {
    const navigation = useNavigation();
    const [searchText, setSearchText] = useState("");
    const [searchHistory, setSearchHistory] = useState([]);
    const [searchMode, setSearchMode] = useState("all"); // 'all', 'users', 'posts'
    const [searching, setSearching] = useState(false);
    const [searchResults, setSearchResults] = useState({
        users: [],
        posts: [],
    });
    const [suggestions, setSuggestions] = useState({
        trendingHashtags: [],
        popularUsers: [],
    });
    const [hasSearched, setHasSearched] = useState(false);

    // Thêm states cho instant suggestions
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [instantSuggestions, setInstantSuggestions] = useState({
        users: [],
        posts: [],
    });
    const [loadingSuggestions, setLoadingSuggestions] = useState(false);

    // Load search history từ AsyncStorage
    useEffect(() => {
        loadSearchHistory();
        loadSuggestions();
    }, []);

    const loadSearchHistory = async () => {
        try {
            const history = await AsyncStorage.getItem(SEARCH_HISTORY_KEY);
            if (history) {
                setSearchHistory(JSON.parse(history));
            }
        } catch (error) {
            console.error("Error loading search history:", error);
        }
    };

    const loadSuggestions = async () => {
        try {
            const result = await getSearchSuggestions();
            if (result?.data) {
                setSuggestions({
                    trendingHashtags:
                        result.data.TrendingHashtags ||
                        result.data.trendingHashtags ||
                        [],
                    popularUsers:
                        result.data.PopularUsers ||
                        result.data.popularUsers ||
                        [],
                });
            }
        } catch (error) {
            console.error("Error loading suggestions:", error);
        }
    };

    const saveToHistory = async (query) => {
        try {
            const trimmed = query.trim();
            if (!trimmed) return;

            let newHistory = [
                trimmed,
                ...searchHistory.filter((h) => h !== trimmed),
            ];
            newHistory = newHistory.slice(0, MAX_HISTORY_ITEMS);

            setSearchHistory(newHistory);
            await AsyncStorage.setItem(
                SEARCH_HISTORY_KEY,
                JSON.stringify(newHistory)
            );
        } catch (error) {
            console.error("Error saving search history:", error);
        }
    };

    const removeHistoryItem = async (item) => {
        try {
            const newHistory = searchHistory.filter((h) => h !== item);
            setSearchHistory(newHistory);
            await AsyncStorage.setItem(
                SEARCH_HISTORY_KEY,
                JSON.stringify(newHistory)
            );
        } catch (error) {
            console.error("Error removing history item:", error);
        }
    };

    const clearAllHistory = async () => {
        try {
            setSearchHistory([]);
            await AsyncStorage.removeItem(SEARCH_HISTORY_KEY);
        } catch (error) {
            console.error("Error clearing history:", error);
        }
    }; // Helper function để filter kết quả theo yêu cầu chữ cái đầu
    const filterUsersByFirstLetter = (users, searchTerm) => {
        if (!searchTerm || !searchTerm.startsWith("@")) {
            return users;
        }

        // Lấy ký tự sau @
        const searchChar = searchTerm.substring(1).toLowerCase();
        if (!searchChar) {
            return users;
        }

        return users.filter((user) => {
            const fullName = (
                user.fullName ||
                user.FullName ||
                ""
            ).toLowerCase();
            const userName = (
                user.userName ||
                user.UserName ||
                ""
            ).toLowerCase();

            // Kiểm tra chữ cái đầu tiên của tên hoặc username
            return (
                fullName.startsWith(searchChar) ||
                userName.startsWith(searchChar)
            );
        });
    };

    // Hàm tìm kiếm tức thời cho suggestions
    const performInstantSearch = useCallback(async (query) => {
        if (!query.trim() || query.length < 2) {
            setShowSuggestions(false);
            setInstantSuggestions({ users: [], posts: [] });
            return;
        }

        setLoadingSuggestions(true);
        setShowSuggestions(true);

        try {
            const trimmedQuery = query.trim(); // Xác định loại tìm kiếm dựa trên ký tự đầu
            if (trimmedQuery.startsWith("@")) {
                // Chỉ tìm users với ưu tiên following
                const result = await instantSearchUsers(trimmedQuery, 20); // Lấy nhiều hơn để filter
                const filteredUsers = filterUsersByFirstLetter(
                    result?.data?.Results || result?.data?.results || [],
                    trimmedQuery
                );
                setInstantSuggestions({
                    users: filteredUsers.slice(0, 8), // Giới hạn lại sau khi filter
                    posts: [],
                });
            } else if (trimmedQuery.startsWith("#")) {
                // Chỉ tìm posts
                const result = await instantSearchPosts(trimmedQuery, 8);
                setInstantSuggestions({
                    users: [],
                    posts: result?.data?.Results || result?.data?.results || [],
                });
            } else {
                // Tìm cả hai với số lượng giới hạn
                const [usersResult, postsResult] = await Promise.all([
                    instantSearchUsers(trimmedQuery, 10), // Lấy nhiều hơn để filter
                    instantSearchPosts(trimmedQuery, 4),
                ]);

                const allUsers =
                    usersResult?.data?.Results ||
                    usersResult?.data?.results ||
                    [];
                const filteredUsers = filterUsersByFirstLetter(
                    allUsers,
                    `@${trimmedQuery}`
                );

                setInstantSuggestions({
                    users: filteredUsers.slice(0, 4), // Giới hạn lại
                    posts:
                        postsResult?.data?.Results ||
                        postsResult?.data?.results ||
                        [],
                });
            }
        } catch (error) {
            console.error("Error performing instant search:", error);
        } finally {
            setLoadingSuggestions(false);
        }
    }, []);

    // Hàm tìm kiếm
    const performSearch = useCallback(async (query) => {
        if (!query.trim()) {
            setSearchResults({ users: [], posts: [] });
            setHasSearched(false);
            setShowSuggestions(false);
            return;
        }

        setSearching(true);
        setHasSearched(true);
        setShowSuggestions(false); // Ẩn suggestions khi tìm kiếm chính thức

        try {
            const trimmedQuery = query.trim(); // Xác định loại tìm kiếm dựa trên ký tự đầu
            if (trimmedQuery.startsWith("@")) {
                // Tìm kiếm users
                const result = await searchUsers(trimmedQuery, 1, 50); // Lấy nhiều hơn để filter
                const filteredUsers = filterUsersByFirstLetter(
                    result?.data?.Results || result?.data?.results || [],
                    trimmedQuery
                );
                setSearchResults({
                    users: filteredUsers.slice(0, 20), // Giới hạn lại
                    posts: [],
                });
                setSearchMode("users");
            } else if (trimmedQuery.startsWith("#")) {
                // Tìm kiếm posts với hashtag
                const result = await searchPosts(trimmedQuery, 1, 20);
                setSearchResults({
                    users: [],
                    posts: result?.data?.Results || result?.data?.results || [],
                });
                setSearchMode("posts");
            } else {
                // Tìm kiếm cả hai
                const [usersResult, postsResult] = await Promise.all([
                    searchUsers(trimmedQuery, 1, 20),
                    searchPosts(trimmedQuery, 1, 10),
                ]);

                const allUsers =
                    usersResult?.data?.Results ||
                    usersResult?.data?.results ||
                    [];
                const filteredUsers = filterUsersByFirstLetter(
                    allUsers,
                    `@${trimmedQuery}`
                );

                setSearchResults({
                    users: filteredUsers.slice(0, 10), // Giới hạn lại
                    posts:
                        postsResult?.data?.Results ||
                        postsResult?.data?.results ||
                        [],
                });
                setSearchMode("all");
            }

            // Lưu vào lịch sử
            saveToHistory(trimmedQuery);
        } catch (error) {
            console.error("Error performing search:", error);
            Alert.alert("Lỗi", "Không thể tìm kiếm. Vui lòng thử lại.");
        } finally {
            setSearching(false);
        }
    }, []); // Debounce search cho instant suggestions
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            if (searchText && searchText.length >= 2) {
                performInstantSearch(searchText);
            } else {
                setShowSuggestions(false);
            }
        }, 300); // Delay ngắn hơn cho instant suggestions

        return () => clearTimeout(timeoutId);
    }, [searchText, performInstantSearch]);

    // Debounce search chính thức
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            if (searchText && searchText.length >= 3) {
                // Chỉ search chính thức khi >= 3 ký tự
                performSearch(searchText);
            }
        }, 1000); // Delay dài hơn cho search chính thức

        return () => clearTimeout(timeoutId);
    }, [searchText, performSearch]);

    const [refreshing, setRefreshing] = useState(false);
    const onRefresh = async () => {
        setRefreshing(true);
        await loadSuggestions();
        if (searchText) {
            await performSearch(searchText);
        }
        setRefreshing(false);
    };
    useEffect(() => {
        const unsub = onTabTriple("Search", () => {
            try {
                onRefresh();
            } catch (e) {
                console.warn("[Search] triple refresh", e);
            }
        });
        return unsub;
    }, [searchText]); // Handle suggestion selection - khi chọn 1 suggestion sẽ tìm kiếm luôn
    const handleSuggestionSelect = (item, type) => {
        if (type === "user") {
            // Với user, navigate trực tiếp đến profile
            handleUserPress(item);
        } else if (type === "post") {
            // Với post, navigate trực tiếp đến post detail
            handlePostPress(item);
        }

        // Đồng thời cũng set search text và ẩn suggestions
        const searchQuery =
            type === "user"
                ? `@${item.userName || item.UserName || ""}`
                : (item.caption || item.Caption || "").substring(0, 50);

        setSearchText(searchQuery);
        setShowSuggestions(false);
        saveToHistory(searchQuery);
    };

    // Handle user press
    const handleUserPress = (user) => {
        navigation.navigate("UserProfilePublic", {
            userId: user.userId || user.UserId,
        });
    }; // Helper function để build full media URL
    const buildFullMediaUrl = (mediaUrl) => {
        if (!mediaUrl) return null;

        // Nếu đã là full URL
        if (mediaUrl.startsWith("http")) {
            return mediaUrl;
        }

        // Backend đã trả về /Assets/Images/ hoặc /Assets/Videos/
        // Chỉ cần thêm base URL
        return `${API_BASE_URL}${mediaUrl}`;
    };

    // Handle post press
    const handlePostPress = (post) => {
        // Chuyển đổi post data từ search format sang PostDetail format
        const thumbnailUrl = post.thumbnailUrl || post.ThumbnailUrl;
        const fullMediaUrl = buildFullMediaUrl(thumbnailUrl);

        console.log("[Search] handlePostPress:", {
            postId: post.postId,
            thumbnailUrl,
            fullMediaUrl,
            mediaType: post.mediaType || post.MediaType,
        });

        const postDetailData = {
            id: post.postId || post.PostId,
            caption: post.caption || post.Caption || "",
            createdAt:
                post.createdAt || post.CreatedAt || new Date().toISOString(),
            location: post.location || post.Location || null,
            privacy: post.privacy || "public",
            user: {
                id: post.userId || post.UserId,
                username: post.userName || post.UserName || "unknown",
                fullName:
                    post.userFullName || post.UserFullName || "Unknown User",
                avatarUrl: post.userAvatarUrl || post.UserAvatarUrl || null,
            },
            media: fullMediaUrl
                ? [
                      {
                          type: (
                              post.mediaType ||
                              post.MediaType ||
                              "image"
                          ).toLowerCase(),
                          url: fullMediaUrl, // Full URL đã được build
                      },
                  ]
                : [],
            likesCount: post.likesCount || post.LikesCount || 0,
            commentsCount: post.commentsCount || post.CommentsCount || 0,
            sharesCount: post.sharesCount || post.SharesCount || 0,
        };

        // Navigate đến PostDetail với single post data
        navigation.navigate("PostDetail", {
            singlePost: postDetailData,
            userId: post.userId || post.UserId,
        });
    };

    // Handle follow/unfollow
    const handleFollowPress = async (user) => {
        try {
            const userId = user.userId || user.UserId;
            if (user.isFollowing) {
                await unfollowUser(userId);
                // Update local state
                setSearchResults((prev) => ({
                    ...prev,
                    users: prev.users.map((u) =>
                        (u.userId || u.UserId) === userId
                            ? {
                                  ...u,
                                  isFollowing: false,
                                  followersCount: (u.followersCount || 0) - 1,
                              }
                            : u
                    ),
                }));
            } else {
                await followUser(userId);
                // Update local state
                setSearchResults((prev) => ({
                    ...prev,
                    users: prev.users.map((u) =>
                        (u.userId || u.UserId) === userId
                            ? {
                                  ...u,
                                  isFollowing: true,
                                  followersCount: (u.followersCount || 0) + 1,
                              }
                            : u
                    ),
                }));
            }
        } catch (error) {
            console.error("Error following/unfollowing user:", error);
            Alert.alert("Lỗi", "Không thể thực hiện thao tác này.");
        }
    }; // Handle suggestion press
    const handleSuggestionPress = (suggestion) => {
        setSearchText(suggestion);
        setShowSuggestions(false);
        performSearch(suggestion);
    };

    // Render instant suggestions
    const renderInstantSuggestions = () => {
        if (
            !showSuggestions ||
            (!instantSuggestions.users.length &&
                !instantSuggestions.posts.length &&
                !loadingSuggestions)
        ) {
            return null;
        }

        return (
            <View style={styles.suggestionsContainer}>
                {loadingSuggestions && (
                    <View style={styles.suggestionItem}>
                        <ActivityIndicator size="small" color="#3B82F6" />
                        <Text style={styles.suggestionText}>
                            Đang tìm kiếm...
                        </Text>
                    </View>
                )}

                {/* User suggestions */}
                {instantSuggestions.users.map((user, index) => (
                    <TouchableOpacity
                        key={`user-${user.userId || user.UserId || index}`}
                        style={styles.suggestionItem}
                        onPress={() => handleSuggestionSelect(user, "user")}
                    >
                        <View style={styles.suggestionIcon}>
                            <Ionicons
                                name="person-outline"
                                size={20}
                                color="#6B7280"
                            />
                        </View>
                        <View style={styles.suggestionContent}>
                            <Text
                                style={styles.suggestionMainText}
                                numberOfLines={1}
                            >
                                {user.fullName ||
                                    user.FullName ||
                                    "Unknown User"}
                            </Text>
                            <Text
                                style={styles.suggestionSubText}
                                numberOfLines={1}
                            >
                                @{user.userName || user.UserName || "unknown"}
                            </Text>
                        </View>
                        <Ionicons
                            name="arrow-up-outline"
                            size={16}
                            color="#9CA3AF"
                            style={styles.suggestionArrow}
                        />
                    </TouchableOpacity>
                ))}

                {/* Post suggestions */}
                {instantSuggestions.posts.map((post, index) => (
                    <TouchableOpacity
                        key={`post-${post.postId || post.PostId || index}`}
                        style={styles.suggestionItem}
                        onPress={() => handleSuggestionSelect(post, "post")}
                    >
                        <View style={styles.suggestionIcon}>
                            <Ionicons
                                name="document-text-outline"
                                size={20}
                                color="#6B7280"
                            />
                        </View>
                        <View style={styles.suggestionContent}>
                            <Text
                                style={styles.suggestionMainText}
                                numberOfLines={1}
                            >
                                {(
                                    post.caption ||
                                    post.Caption ||
                                    "Bài viết không có caption"
                                ).substring(0, 50)}
                                {(post.caption || post.Caption || "").length >
                                50
                                    ? "..."
                                    : ""}
                            </Text>
                            <Text
                                style={styles.suggestionSubText}
                                numberOfLines={1}
                            >
                                bởi
                                {post.userFullName ||
                                    post.UserFullName ||
                                    "Unknown User"}
                            </Text>
                        </View>
                        <Ionicons
                            name="arrow-up-outline"
                            size={16}
                            color="#9CA3AF"
                            style={styles.suggestionArrow}
                        />
                    </TouchableOpacity>
                ))}
            </View>
        );
    };

    // Render search results
    const renderSearchResults = () => {
        if (searching) {
            return (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#3B82F6" />
                    <Text style={styles.loadingText}>Đang tìm kiếm...</Text>
                </View>
            );
        }

        if (!hasSearched) {
            return null;
        }

        const hasResults =
            searchResults.users.length > 0 || searchResults.posts.length > 0;

        if (!hasResults) {
            return (
                <View style={styles.emptyState}>
                    <Ionicons name="search-outline" size={64} color="#D1D5DB" />
                    <Text style={styles.emptyText}>Không tìm thấy kết quả</Text>
                    <Text style={styles.emptySubtext}>
                        Thử tìm kiếm với từ khóa khác
                    </Text>
                </View>
            );
        }

        return (
            <ScrollView style={styles.resultsContainer}>
                {/* Users Results */}
                {searchResults.users.length > 0 && (
                    <View style={styles.resultSection}>
                        <View style={styles.sectionHeader}>
                            <Ionicons
                                name="person-outline"
                                size={20}
                                color="#111827"
                            />
                            <Text style={styles.sectionTitle}>
                                Người dùng ({searchResults.users.length})
                            </Text>
                        </View>
                        {searchResults.users.map((user, index) => (
                            <SearchUserItem
                                key={user.userId || user.UserId || index}
                                user={user}
                                onPress={handleUserPress}
                                onFollowPress={handleFollowPress}
                            />
                        ))}
                    </View>
                )}

                {/* Posts Results */}
                {searchResults.posts.length > 0 && (
                    <View style={styles.resultSection}>
                        <View style={styles.sectionHeader}>
                            <Ionicons
                                name="grid-outline"
                                size={20}
                                color="#111827"
                            />
                            <Text style={styles.sectionTitle}>
                                Bài đăng ({searchResults.posts.length})
                            </Text>
                        </View>
                        {searchResults.posts.map((post, index) => (
                            <SearchPostItem
                                key={post.postId || post.PostId || index}
                                post={post}
                                onPress={handlePostPress}
                            />
                        ))}
                    </View>
                )}
            </ScrollView>
        );
    };

    return (
        <View style={styles.container}>
            <StatusBar
                barStyle="dark-content"
                backgroundColor="#FFFFFF"
                translucent={false}
            />
            <View style={styles.searchHeader}>
                <View style={styles.searchBarContainer}>
                    <Ionicons
                        name="search"
                        size={20}
                        color="#9CA3AF"
                        style={styles.searchIcon}
                    />
                    <TextInput
                        style={styles.searchInput}
                        value={searchText}
                        onChangeText={setSearchText}
                        placeholder="Tìm kiếm (@ cho user, # cho hashtag)"
                        placeholderTextColor="#9CA3AF"
                        autoFocus={false}
                        onFocus={() => {
                            if (searchText.length >= 2) {
                                setShowSuggestions(true);
                            }
                        }}
                        onBlur={() => {
                            // Delay để cho phép click vào suggestion
                            setTimeout(() => setShowSuggestions(false), 200);
                        }}
                    />
                    {searchText.length > 0 && (
                        <TouchableOpacity
                            onPress={() => {
                                setSearchText("");
                                setSearchResults({ users: [], posts: [] });
                                setHasSearched(false);
                                setShowSuggestions(false);
                            }}
                            style={styles.clearButton}
                        >
                            <Ionicons
                                name="close-circle"
                                size={20}
                                color="#9CA3AF"
                            />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {/* Instant Suggestions - hiển thị ngay dưới search bar */}
            {renderInstantSuggestions()}

            {/* Search Content */}
            <ScrollView
                style={styles.content}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                    />
                }
            >
                {searchText.length === 0 ? (
                    // Recent Searches & Suggestions
                    <View style={styles.recentSection}>
                        {/* Search History */}
                        {searchHistory.length > 0 && (
                            <>
                                <View style={styles.recentHeader}>
                                    <Text style={styles.recentTitle}>
                                        Tìm kiếm gần đây
                                    </Text>
                                    <TouchableOpacity onPress={clearAllHistory}>
                                        <Text style={styles.clearAllText}>
                                            Xóa tất cả
                                        </Text>
                                    </TouchableOpacity>
                                </View>

                                <FlatList
                                    data={searchHistory}
                                    keyExtractor={(item, index) =>
                                        index.toString()
                                    }
                                    scrollEnabled={false}
                                    renderItem={({ item }) => (
                                        <TouchableOpacity
                                            style={styles.historyItem}
                                            onPress={() => setSearchText(item)}
                                        >
                                            <Ionicons
                                                name="time-outline"
                                                size={20}
                                                color="#6B7280"
                                            />
                                            <Text style={styles.historyText}>
                                                {item}
                                            </Text>
                                            <TouchableOpacity
                                                onPress={() =>
                                                    removeHistoryItem(item)
                                                }
                                                style={styles.removeButton}
                                            >
                                                <Ionicons
                                                    name="close"
                                                    size={20}
                                                    color="#9CA3AF"
                                                />
                                            </TouchableOpacity>
                                        </TouchableOpacity>
                                    )}
                                />
                            </>
                        )}

                        {/* Trending Hashtags */}
                        {suggestions.trendingHashtags.length > 0 && (
                            <>
                                <View style={styles.sectionHeader}>
                                    <Ionicons
                                        name="trending-up"
                                        size={20}
                                        color="#111827"
                                    />
                                    <Text style={styles.sectionTitle}>
                                        Hashtag thịnh hành
                                    </Text>
                                </View>
                                <View style={styles.tagsContainer}>
                                    {suggestions.trendingHashtags.map(
                                        (tag, index) => (
                                            <TouchableOpacity
                                                key={index}
                                                style={styles.tagChip}
                                                onPress={() =>
                                                    handleSuggestionPress(tag)
                                                }
                                            >
                                                <Text style={styles.tagText}>
                                                    {tag}
                                                </Text>
                                            </TouchableOpacity>
                                        )
                                    )}
                                </View>
                            </>
                        )}

                        {searchHistory.length === 0 &&
                            suggestions.trendingHashtags.length === 0 && (
                                <View style={styles.emptyState}>
                                    <Ionicons
                                        name="search-outline"
                                        size={64}
                                        color="#D1D5DB"
                                    />
                                    <Text style={styles.emptyText}>
                                        Bắt đầu tìm kiếm
                                    </Text>
                                    <Text style={styles.emptySubtext}>
                                        Sử dụng @ để tìm người dùng{"\n"}
                                        Sử dụng # để tìm hashtag
                                    </Text>
                                </View>
                            )}
                    </View>
                ) : (
                    // Search Results
                    renderSearchResults()
                )}
            </ScrollView>

            {/* Bottom tab bar is provided globally by the Tab Navigator */}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#FFFFFF",
    },
    searchHeader: {
        paddingTop: Platform.OS === "ios" ? 60 : 20,
        paddingHorizontal: 16,
        paddingBottom: 12,
        backgroundColor: "#FFFFFF",
        borderBottomWidth: 1,
        borderBottomColor: "#F3F4F6",
    },
    searchBarContainer: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#F3F4F6",
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
        color: "#111827",
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
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 16,
        marginBottom: 12,
    },
    recentTitle: {
        fontSize: 16,
        fontWeight: "600",
        color: "#111827",
    },
    clearAllText: {
        fontSize: 14,
        color: "#3B82F6",
        fontWeight: "500",
    },
    historyItem: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    historyText: {
        flex: 1,
        fontSize: 15,
        color: "#111827",
        marginLeft: 12,
    },
    removeButton: {
        padding: 4,
    },
    sectionHeader: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 16,
        marginTop: 20,
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: "600",
        color: "#111827",
        marginLeft: 8,
    },
    tagsContainer: {
        flexDirection: "row",
        flexWrap: "wrap",
        paddingHorizontal: 12,
    },
    tagChip: {
        backgroundColor: "#EFF6FF",
        borderRadius: 16,
        paddingHorizontal: 16,
        paddingVertical: 8,
        margin: 4,
    },
    tagText: {
        fontSize: 14,
        color: "#3B82F6",
        fontWeight: "500",
    },
    emptyState: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingTop: 60,
        paddingHorizontal: 32,
    },
    emptyText: {
        fontSize: 17,
        fontWeight: "600",
        color: "#6B7280",
        marginTop: 16,
    },
    emptySubtext: {
        fontSize: 14,
        color: "#9CA3AF",
        textAlign: "center",
        marginTop: 8,
        lineHeight: 20,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingTop: 60,
    },
    loadingText: {
        fontSize: 15,
        color: "#6B7280",
        marginTop: 12,
    },
    resultsContainer: {
        flex: 1,
    },
    resultSection: {
        marginBottom: 20,
    },
    // Styles cho instant suggestions
    suggestionsContainer: {
        backgroundColor: "#FFFFFF",
        borderBottomWidth: 1,
        borderBottomColor: "#F3F4F6",
        maxHeight: 300,
    },
    suggestionItem: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: "#F3F4F6",
    },
    suggestionIcon: {
        marginRight: 12,
    },
    suggestionContent: {
        flex: 1,
    },
    suggestionMainText: {
        fontSize: 15,
        fontWeight: "500",
        color: "#111827",
    },
    suggestionSubText: {
        fontSize: 13,
        color: "#6B7280",
        marginTop: 2,
    },
    suggestionArrow: {
        transform: [{ rotate: "45deg" }],
    },
    suggestionText: {
        fontSize: 15,
        color: "#6B7280",
        marginLeft: 8,
    },
});
