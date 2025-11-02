import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Image,
    FlatList,
    Dimensions,
    ActivityIndicator,
    Alert,
    Linking,
    Platform,
    PermissionsAndroid,
    RefreshControl,
} from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import * as MediaLibrary from 'expo-media-library';
import * as ImagePicker from 'expo-image-picker';

const { width } = Dimensions.get("window");
const numColumns = 3;
const imageSize = width / numColumns;
const LOG = '[CreatePost:Permissions]';
const ANDROID_VISUAL_SELECTED = PermissionsAndroid?.PERMISSIONS?.READ_MEDIA_VISUAL_USER_SELECTED || 'android.permission.READ_MEDIA_VISUAL_USER_SELECTED';

// Helpers
const asItem = (asset) => ({ id: asset.id, uri: asset.uri, mediaType: asset.mediaType });

export default function CreatePost() {
    const navigation = useNavigation();
    const [selectedTab, setSelectedTab] = useState("Library");
    const [assets, setAssets] = useState([]); // all device media assets (photo+video)
    const [endCursor, setEndCursor] = useState(null);
    const [hasNextPage, setHasNextPage] = useState(true);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [permStatus, setPermStatus] = useState('undetermined'); // undetermined | granted | denied | limited
    const [iosAccess, setIosAccess] = useState(null); // iOS only: 'all' | 'limited' | 'none'
    const [selectedImage, setSelectedImage] = useState(null);
    const [selectedItems, setSelectedItems] = useState([]);
    const [multipleSelectMode, setMultipleSelectMode] = useState(false);
    const [canAskAgain, setCanAskAgain] = useState(true);
    const [showLimitedOverlay, setShowLimitedOverlay] = useState(true); // used as a non-blocking banner now
    const [successToast, setSuccessToast] = useState(null); // string | null
    const [androidAccess, setAndroidAccess] = useState(null); // 'all' | 'limited' | null

    // Permissions + initial load
    useEffect(() => {
        let mounted = true;
        (async () => {
            // Check current permission first for better UX
            try {
                if (Platform.OS === 'android') {
                    console.log(`${LOG} ANDROID initial: checking current permissions`);
                    const ok = await androidCheckMediaPermissions();
                    console.log(`${LOG} Android check result (initial) ->`, ok);
                    if (ok) {
                        setPermStatus('granted');
                        await loadAssets(true);
                    } else {
                        setPermStatus('denied');
                    }
                    if (mounted) setLoading(false);
                    return;
                }
                const current = await MediaLibrary.getPermissionsAsync();
                console.log(`${LOG} getPermissionsAsync (initial iOS) ->`, {
                    status: current?.status,
                    canAskAgain: current?.canAskAgain,
                    accessPrivileges: current?.accessPrivileges,
                });
                if (!mounted) return;
                setCanAskAgain(current.canAskAgain ?? true);
                setPermStatus(current.status);
                if (current.accessPrivileges) {
                    setIosAccess(current.accessPrivileges);
                }
                if (current.status === 'granted' || current.accessPrivileges === 'limited') {
                    await loadAssets(true);
                    if (mounted) setLoading(false);
                    return;
                }
                console.log(`${LOG} requestPermissionsAsync (initial iOS ask) ...`);
                const ask = await MediaLibrary.requestPermissionsAsync();
                console.log(`${LOG} requestPermissionsAsync (initial iOS result) ->`, {
                    status: ask?.status,
                    canAskAgain: ask?.canAskAgain,
                    accessPrivileges: ask?.accessPrivileges,
                });
                if (!mounted) return;
                setPermStatus(ask.status);
                setCanAskAgain(ask.canAskAgain ?? true);
                if (ask.accessPrivileges) {
                    setIosAccess(ask.accessPrivileges);
                }
                if (ask.status === 'granted' || ask.accessPrivileges === 'limited') {
                    await loadAssets(true);
                }
                if (mounted) setLoading(false);
            } catch (e) {
                console.log(`${LOG} ERROR (initial flow)`, e);
                // Final fallback for Android: suggest settings
                if (Platform.OS === 'android') {
                    Alert.alert('Không thể kiểm tra quyền', 'Vui lòng mở Cài đặt và cấp quyền Ảnh/Video cho ứng dụng. Sau đó quay lại màn hình này.');
                } else {
                    Alert.alert('Không thể yêu cầu quyền', 'Vui lòng mở Cài đặt hệ thống để cấp quyền Thư viện/Ảnh cho ứng dụng.');
                }
                if (mounted) setLoading(false);
            }
        })();
        return () => { mounted = false; };
    }, []);

    // Re-check permission when screen regains focus (e.g., after returning from Settings)
    useFocusEffect(
        useCallback(() => {
            let alive = true;
            (async () => {
                if (Platform.OS === 'android') {
                    // Avoid calling MediaLibrary.getPermissionsAsync on Android to prevent AUDIO permission error
                    const ok = await androidCheckMediaPermissions();
                    if (!alive) return;
                    setPermStatus(ok ? 'granted' : 'denied');
                    if (ok) {
                        setLoading(true);
                        await loadAssets(true);
                        setLoading(false);
                    }
                    return;
                }
                const cur = await MediaLibrary.getPermissionsAsync();
                console.log(`${LOG} getPermissionsAsync (focus) ->`, {
                    status: cur?.status,
                    canAskAgain: cur?.canAskAgain,
                    accessPrivileges: cur?.accessPrivileges,
                });
                if (!alive) return;
                setPermStatus(cur.status);
                if (cur.accessPrivileges) {
                    setIosAccess(cur.accessPrivileges);
                }
                setCanAskAgain(cur.canAskAgain ?? true);
                if (cur.status === 'granted' || cur.accessPrivileges === 'limited') {
                    setLoading(true);
                    await loadAssets(true);
                    setLoading(false);
                }
            })();
            return () => { alive = false; };
        }, [])
    );

    // Android: check current media permissions (no request, suitable for Expo Go)
    const androidCheckMediaPermissions = useCallback(async () => {
        if (Platform.OS !== 'android') return false;
        try {
            const sdk = typeof Platform.Version === 'number' ? Platform.Version : parseInt(Platform.Version, 10);
            if (sdk >= 33) {
                const hasImages = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES);
                const hasVideos = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.READ_MEDIA_VIDEO);
                const hasAudio = PermissionsAndroid.PERMISSIONS.READ_MEDIA_AUDIO
                    ? await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.READ_MEDIA_AUDIO)
                    : true;
                const hasVisualSelected = await PermissionsAndroid.check(ANDROID_VISUAL_SELECTED).catch(() => false);
                console.log(`${LOG} Android check ->`, { hasImages, hasVideos, hasAudio, hasVisualSelected });
                if (hasImages || hasVideos) {
                    setAndroidAccess('all');
                    return true;
                }
                if (hasVisualSelected) {
                    setAndroidAccess('limited');
                    return true; // coi limited là hợp lệ: grid có thể rỗng nhưng luồng vẫn mở
                }
                setAndroidAccess(null);
                return false;
            } else {
                const hasStorage = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE);
                console.log(`${LOG} Android check (READ_EXTERNAL_STORAGE) ->`, hasStorage);
                setAndroidAccess(hasStorage ? 'all' : null);
                return hasStorage;
            }
        } catch (e) {
            console.log(`${LOG} Android check error`, e);
            setAndroidAccess(null);
            return false;
        }
    }, []);

    const showPermissionSuccess = useCallback((msg) => {
        setSuccessToast(msg);
        setTimeout(() => setSuccessToast(null), 2500);
    }, []);

    // Open system photo picker (works without full storage permission on Android 13+ and iOS)
    const openSystemPicker = useCallback(async () => {
        try {
            // Chọn tất cả loại media với fallback tương thích các phiên bản Expo
            const pickerMediaTypes = ['images', 'videos'];
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: pickerMediaTypes,
                allowsMultipleSelection: multipleSelectMode,
                selectionLimit: multipleSelectMode ? 10 : 1,
                quality: 1,
            });
            if (result.canceled) return;
            const picked = (result.assets || []).map(a => ({
                id: a.assetId || a.uri,
                uri: a.uri,
                mediaType: a.type === 'video' ? 'video' : 'photo',
            }));
            if (picked.length === 0) return;
            // Rule: nếu có video được chọn, chỉ lấy 1 video; nếu không, cho phép nhiều ảnh theo chế độ hiện tại
            const chosenList = (() => {
                const vid = picked.find(p => p.mediaType === 'video');
                if (vid) return [vid];
                return multipleSelectMode ? picked : [picked[0]];
            })();
            const first = chosenList[0];
            navigation.navigate("SharePost", {
                selectedImage: first,
                selectedImages: chosenList,
            });
        } catch (e) {
            console.log(`${LOG} ImagePicker error`, e);
            Alert.alert('Lỗi', 'Không thể mở bộ chọn ảnh/video của hệ thống.');
        }
    }, [multipleSelectMode, navigation]);

    const handleRequestPermissions = useCallback(async () => {
        try {
            if (Platform.OS === 'android') {
                console.log(`${LOG} ANDROID manual: open settings instead of requesting`);
                Linking.openSettings();
                return;
            }

            // iOS flow using media-library API
            console.log(`${LOG} requestPermissionsAsync (manual iOS) ...`);
            const res = await MediaLibrary.requestPermissionsAsync();
            console.log(`${LOG} requestPermissionsAsync (manual iOS result) ->`, {
                status: res?.status,
                canAskAgain: res?.canAskAgain,
                accessPrivileges: res?.accessPrivileges,
            });
            setPermStatus(res.status);
            setCanAskAgain(res.canAskAgain ?? true);
            if (res.accessPrivileges) {
                setIosAccess(res.accessPrivileges);
            }
            if (res.status === 'granted' || res.accessPrivileges === 'limited') {
                setLoading(true);
                await loadAssets(true);
                setLoading(false);
                if (res.accessPrivileges === 'limited') {
                    showPermissionSuccess('Đã cấp quyền (Ảnh được chọn). Bạn có thể sử dụng thư viện.');
                } else {
                    showPermissionSuccess('Đã cấp quyền. Bạn có thể chọn ảnh/video.');
                }
                return;
            }
            // If still denied and cannot ask again, open Settings automatically (iOS)
            const cur = await MediaLibrary.getPermissionsAsync();
            if (cur.status !== 'granted' && cur.canAskAgain === false) {
                console.log(`${LOG} cannot ask again, opening settings`);
                Alert.alert(
                    'Cần cấp quyền trong Cài đặt',
                    'Hệ thống đã chặn hộp thoại xin quyền. Mình sẽ mở Cài đặt để bạn cấp quyền Ảnh/Video cho ứng dụng.',
                    [
                        { text: 'Hủy' },
                        { text: 'Mở Cài đặt', onPress: () => Linking.openSettings() },
                    ]
                );
                return;
            }
            // Otherwise, prompt the user to try again or go to settings
            Alert.alert('Chưa có quyền', 'Vui lòng cấp quyền để tiếp tục. Bạn có thể nhấn Cấp quyền lại hoặc Mở Cài đặt.', [
                { text: 'Để sau' },
                { text: 'Mở Cài đặt', onPress: () => Linking.openSettings() },
            ]);
        } catch (e) {
            console.log(`${LOG} ERROR (manual request)`, e);
            // Android: nothing else to try here
            Alert.alert('Lỗi', 'Không thể yêu cầu quyền. Vui lòng mở Cài đặt để cấp quyền cho ứng dụng.');
        }
    }, [loadAssets, showPermissionSuccess]);

    const loadAssets = async (reset = false) => {
        if (reset) {
            setEndCursor(null);
            setHasNextPage(true);
        }
        if (!hasNextPage && !reset) return;
        // Guard: ensure we have at least limited permission before accessing library
        if (Platform.OS === 'android') {
            const ok = await androidCheckMediaPermissions();
            if (!ok) {
                console.log(`${LOG} loadAssets aborted: no permission (android)`);
                return;
            }
        } else {
            const perm = await MediaLibrary.getPermissionsAsync();
            const granted = perm?.status === 'granted' || perm?.accessPrivileges === 'limited';
            if (!granted) {
                console.log(`${LOG} loadAssets aborted: no permission (ios)`);
                return;
            }
        }
        const pageSize = 24; // smaller initial page to load faster
        const res = await MediaLibrary.getAssetsAsync({
            mediaType: [MediaLibrary.MediaType.photo, MediaLibrary.MediaType.video],
            sortBy: [MediaLibrary.SortBy.creationTime],
            first: pageSize,
            after: reset ? undefined : endCursor || undefined,
        });
        setAssets(prev => reset ? res.assets.map(asItem) : [...prev, ...res.assets.map(asItem)]);
        setEndCursor(res.endCursor || null);
        setHasNextPage(!!res.hasNextPage);
        // Set default preview
        if (reset && res.assets.length > 0) {
            const first = asItem(res.assets[0]);
            setSelectedImage(first);
        }
    };

    const onRefresh = useCallback(async () => {
        try {
            setRefreshing(true);
            await loadAssets(true);
        } finally {
            setRefreshing(false);
        }
    }, [endCursor]);

    const filteredAssets = useMemo(() => {
        if (selectedTab === 'Photo') return assets.filter(a => (a.mediaType === 'photo' || a.mediaType === 'image'));
        if (selectedTab === 'Video') return assets.filter(a => a.mediaType === 'video');
        return assets;
    }, [assets, selectedTab]);

    const handleSelectImage = (item) => {
        if (multipleSelectMode) {
            const hasVideoSelected = selectedItems.some(i => (i.mediaType === 'video' || i.type === 'video'));
            const isItemVideo = (item.mediaType === 'video' || item.type === 'video');

            // Rule: chỉ cho chọn 1 video hoặc nhiều ảnh; không trộn lẫn để đơn giản
            if (isItemVideo) {
                setSelectedItems([item]);
            } else {
                if (hasVideoSelected) {
                    setSelectedItems([item]);
                } else {
                    const isSelected = selectedItems.find((i) => i.id === item.id);
                    if (isSelected) {
                        setSelectedItems(selectedItems.filter((i) => i.id !== item.id));
                    } else {
                        setSelectedItems([...selectedItems, item]);
                    }
                }
            }
        } else {
            setSelectedImage(item);
        }
    };

    const toggleMultipleSelect = () => {
        setMultipleSelectMode(!multipleSelectMode);
        if (!multipleSelectMode) {
            if (selectedImage) setSelectedItems([selectedImage]);
        } else {
            setSelectedItems([]);
        }
    };

    const handleNext = () => {
        const imageToShare =
            multipleSelectMode && selectedItems.length > 0
                ? selectedItems[0]
                : selectedImage;

        navigation.navigate("SharePost", {
            selectedImage: imageToShare,
            selectedImages: multipleSelectMode ? selectedItems : (selectedImage ? [selectedImage] : []),
        });
    };

    const renderLibraryItem = ({ item }) => {
        const isSelected = multipleSelectMode && selectedItems.find((i) => i.id === item.id);
        const selectionNumber = isSelected ? selectedItems.findIndex((i) => i.id === item.id) + 1 : null;

        const isVideo = (item.mediaType === 'video' || item.type === 'video');
        return (
            <TouchableOpacity style={styles.libraryItem} onPress={() => handleSelectImage(item)}>
                <Image source={{ uri: item.uri }} style={styles.libraryImage} />
                {isVideo && (
                    <View style={styles.videoBadge}>
                        <Text style={styles.videoBadgeText}>▶</Text>
                    </View>
                )}
                {multipleSelectMode && (
                    <View style={styles.selectionIndicator}>
                        {isSelected ? (
                            <View style={styles.selectedCircle}>
                                <Text style={styles.selectionNumber}>{selectionNumber}</Text>
                            </View>
                        ) : (
                            <View style={styles.unselectedCircle} />
                        )}
                    </View>
                )}
            </TouchableOpacity>
        );
    };

    return (
        // Là màn trong Tab, bỏ safe-area cạnh dưới để không tạo dải tràn trên tab bar
        <SafeAreaView edges={['top']} style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.recentsButton}>
                    <Text style={styles.recentsText}>Recents</Text>
                    <Text style={styles.chevron}>▼</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={handleNext}>
                    <Text style={styles.nextText}>Next</Text>
                </TouchableOpacity>
            </View>

            {/* (Permission overlay moved to top-level modal below) */}

            {/* Preview media */}
            <View style={styles.previewContainer}>
                {selectedImage ? (
                    <Image
                        source={{ uri: selectedImage.uri }}
                        style={styles.previewImage}
                        resizeMode="cover"
                    />
                ) : (
                    <View style={[styles.previewImage, {alignItems:'center', justifyContent:'center'}]}>
                        <Text>Chưa chọn media</Text>
                    </View>
                )}

                {/* Select Multiple Button */}
                <TouchableOpacity
                    style={styles.selectMultipleButton}
                    onPress={toggleMultipleSelect}
                >
                    <View style={styles.selectMultipleIcon}>
                        {multipleSelectMode && (
                            <View style={styles.selectMultipleCheck} />
                        )}
                    </View>
                    <Text style={styles.selectMultipleText}>
                        SELECT MULTIPLE
                    </Text>
                </TouchableOpacity>

            </View>

            {/* Tab Navigation */}
            <View style={styles.tabContainer}>
                <TouchableOpacity
                    style={[
                        styles.tab,
                        selectedTab === "Library" && styles.activeTab,
                    ]}
                    onPress={() => setSelectedTab("Library")}
                >
                    <Text
                        style={[
                            styles.tabText,
                            selectedTab === "Library" && styles.activeTabText,
                        ]}
                    >
                        Library
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[
                        styles.tab,
                        selectedTab === "Photo" && styles.activeTab,
                    ]}
                    onPress={() => setSelectedTab("Photo")}
                >
                    <Text
                        style={[
                            styles.tabText,
                            selectedTab === "Photo" && styles.activeTabText,
                        ]}
                    >
                        Photo
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[
                        styles.tab,
                        selectedTab === "Video" && styles.activeTab,
                    ]}
                    onPress={() => setSelectedTab("Video")}
                >
                    <Text
                        style={[
                            styles.tabText,
                            selectedTab === "Video" && styles.activeTabText,
                        ]}
                    >
                        Video
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Gallery Grid */}
            {loading ? (
                <View style={{flex:1, alignItems:'center', justifyContent:'center'}}>
                    <ActivityIndicator size="large" color="#0095F6" />
                </View>
            ) : (
                <FlatList
                    data={filteredAssets}
                    renderItem={renderLibraryItem}
                    keyExtractor={(item) => item.id}
                    numColumns={numColumns}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.galleryContainer}
                    removeClippedSubviews
                    windowSize={9}
                    initialNumToRender={24}
                    maxToRenderPerBatch={24}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                    onEndReachedThreshold={0.5}
                    onEndReached={async () => {
                        if (loadingMore || !hasNextPage) return;
                        setLoadingMore(true);
                        try { await loadAssets(false); } finally { setLoadingMore(false); }
                    }}
                    ListFooterComponent={loadingMore ? (
                        <View style={{ paddingVertical: 12 }}>
                            <ActivityIndicator size="small" color="#999" />
                        </View>
                    ) : null}
                />
            )}
            {(!loading && (filteredAssets.length === 0)) ? (
                <View style={{ alignItems:'center', paddingVertical: 16 }}>
                    <Text style={{ color:'#666', marginBottom: 8 }}>Không tìm thấy ảnh/video</Text>
                    <View style={{ flexDirection: 'row', gap: 10 }}>
                        <TouchableOpacity onPress={onRefresh} style={{ paddingHorizontal: 12, paddingVertical: 8, backgroundColor:'#eee', borderRadius:8 }}>
                            <Text style={{ fontWeight:'600' }}>Tải lại</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={openSystemPicker} style={{ paddingHorizontal: 12, paddingVertical: 8, backgroundColor:'#0095F6', borderRadius:8 }}>
                            <Text style={{ fontWeight:'700', color:'#fff' }}>Chọn ảnh/video…</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            ) : null}

            {/* Permission Overlay Modal */}
            { ((Platform.OS === 'ios') ? (permStatus !== 'granted' && iosAccess !== 'limited') : (permStatus !== 'granted' && androidAccess !== 'limited')) ? (
                <View style={styles.permOverlay}>
                    <View style={styles.permCard}>
                        <Text style={styles.permTitle}>Cần quyền truy cập ảnh và video</Text>
                        <Text style={styles.permDesc}>
                            {Platform.OS === 'android'
                                ? 'Trên thiết bị Android khi chạy bằng Expo Go, hãy cấp quyền trong Cài đặt hệ thống cho Expo Go: Ảnh/Video. Sau khi cấp, quay lại màn hình này.'
                                : 'Hãy cấp quyền để hiển thị thư viện và đăng bài.'}
                        </Text>
                        <View style={styles.permActions}>
                            {Platform.OS === 'android' ? (
                                <>
                                    <TouchableOpacity
                                        onPress={() => Linking.openSettings()}
                                        style={[styles.permBtn, { backgroundColor: '#0095F6' }]}
                                    >
                                        <Text style={[styles.permBtnText, { color: '#fff' }]}>Mở Cài đặt</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        onPress={async () => {
                                            const ok = await androidCheckMediaPermissions();
                                            console.log(`${LOG} Android check (manual recheck) ->`, ok);
                                            if (ok) {
                                                setPermStatus('granted');
                                                setLoading(true);
                                                await loadAssets(true);
                                                setLoading(false);
                                                showPermissionSuccess('Đã cấp quyền. Bạn có thể chọn ảnh/video.');
                                            } else {
                                                Alert.alert('Chưa có quyền', 'Vui lòng cấp quyền trong Cài đặt cho Expo Go rồi thử lại.');
                                            }
                                        }}
                                        style={[styles.permBtn, { backgroundColor: '#eee' }]}
                                    >
                                        <Text style={[styles.permBtnText, { color: '#111' }]}>Kiểm tra lại</Text>
                                    </TouchableOpacity>
                                </>
                            ) : (
                                <>
                                    <TouchableOpacity
                                        onPress={handleRequestPermissions}
                                        style={[styles.permBtn, { backgroundColor: '#0095F6' }]}
                                    >
                                        <Text style={[styles.permBtnText, { color: '#fff' }]}>Cấp quyền</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        onPress={() => Linking.openSettings()}
                                        style={[styles.permBtn, { backgroundColor: '#eee' }]}
                                    >
                                        <Text style={[styles.permBtnText, { color: '#111' }]}>Mở Cài đặt</Text>
                                    </TouchableOpacity>
                                </>
                            )}
                        </View>
                    </View>
                </View>
            ) : null}

            {/* iOS limited access helper banner (non-blocking) */}
            {(Platform.OS === 'ios' && iosAccess === 'limited' && showLimitedOverlay) ? (
                <View style={styles.limitedBanner}>
                    <Text style={styles.limitedText}>Đang dùng quyền “Ảnh được chọn”. Bạn có thể thêm ảnh/video hoặc chuyển sang “Tất cả ảnh”.</Text>
                    <View style={styles.limitedActions}>
                        <TouchableOpacity
                            onPress={async () => {
                                try {
                                    if (MediaLibrary.presentPermissionsPickerAsync) {
                                        await MediaLibrary.presentPermissionsPickerAsync();
                                        const p = await MediaLibrary.getPermissionsAsync();
                                        setIosAccess(p.accessPrivileges || iosAccess);
                                    } else {
                                        Alert.alert('Không hỗ trợ', 'Thiết bị/phiên bản hiện tại không hỗ trợ chọn thêm ảnh trong chế độ hạn chế.');
                                    }
                                } catch {}
                            }}
                            style={[styles.permBtn, { backgroundColor: '#0095F6' }]}
                        >
                            <Text style={[styles.permBtnText, { color: '#fff' }]}>Chọn thêm ảnh…</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => Linking.openSettings()}
                            style={[styles.permBtn, { backgroundColor: '#eee' }]}
                        >
                            <Text style={[styles.permBtnText, { color: '#111' }]}>Mở Cài đặt</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => setShowLimitedOverlay(false)}
                            style={[styles.permBtn, { backgroundColor: '#f0f0f0' }]}
                        >
                            <Text style={[styles.permBtnText, { color: '#333' }]}>Ẩn</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            ) : null}

            {/* Android limited access banner (non-blocking) */}
            {(Platform.OS === 'android' && androidAccess === 'limited' && showLimitedOverlay) ? (
                <View style={styles.limitedBanner}>
                    <Text style={styles.limitedText}>Đang ở quyền “Truy cập bị hạn chế”. Bạn có thể tiếp tục dùng, chọn ảnh/video từ thiết bị hoặc mở Cài đặt để chuyển sang “Luôn cho phép tất cả”.</Text>
                    <View style={styles.limitedActions}>
                        <TouchableOpacity
                            onPress={openSystemPicker}
                            style={[styles.permBtn, { backgroundColor: '#0095F6' }]}
                        >
                            <Text style={[styles.permBtnText, { color: '#fff' }]}>Chọn ảnh/video…</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => Linking.openSettings()}
                            style={[styles.permBtn, { backgroundColor: '#eee' }]}
                        >
                            <Text style={[styles.permBtnText, { color: '#111' }]}>Mở Cài đặt</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => setShowLimitedOverlay(false)}
                            style={[styles.permBtn, { backgroundColor: '#f0f0f0' }]}
                        >
                            <Text style={[styles.permBtnText, { color: '#333' }]}>Ẩn</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            ) : null}

            {/* Success toast */}
            {successToast ? (
                <View style={styles.successToast}>
                    <Text style={styles.successToastText}>{successToast}</Text>
                </View>
            ) : null}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#FFFFFF",
    },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 0.5,
        borderBottomColor: "#DBDBDB",
    },
    cancelText: {
        fontSize: 16,
        color: "#000000",
    },
    recentsButton: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
    },
    recentsText: {
        fontSize: 16,
        fontWeight: "600",
        color: "#000000",
    },
    chevron: {
        fontSize: 10,
        color: "#000000",
    },
    nextText: {
        fontSize: 16,
        fontWeight: "600",
        color: "#0095F6",
    },
    previewContainer: {
        width: width,
        height: width,
        position: "relative",
    },
    previewImage: {
        width: "100%",
        height: "100%",
    },
    selectMultipleButton: {
        position: "absolute",
        bottom: 16,
        right: 16,
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "rgba(0, 0, 0, 0.6)",
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        gap: 6,
    },
    selectMultipleIcon: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: "#FFFFFF",
        justifyContent: "center",
        alignItems: "center",
    },
    selectMultipleCheck: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: "#0095F6",
    },
    selectMultipleText: {
        color: "#FFFFFF",
        fontSize: 12,
        fontWeight: "600",
    },
    tabContainer: {
        flexDirection: "row",
        borderBottomWidth: 0.5,
        borderBottomColor: "#DBDBDB",
    },
    tab: {
        flex: 1,
        paddingVertical: 12,
        alignItems: "center",
    },
    activeTab: {
        borderBottomWidth: 2,
        borderBottomColor: "#000000",
    },
    tabText: {
        fontSize: 14,
        color: "#8E8E8E",
    },
    activeTabText: {
        color: "#000000",
        fontWeight: "600",
    },
    galleryContainer: {
        paddingBottom: 20,
    },
    libraryItem: {
        width: imageSize,
        height: imageSize,
        position: "relative",
    },
    libraryImage: {
        width: "100%",
        height: "100%",
        borderWidth: 0.5,
        borderColor: "#FFFFFF",
    },
    videoBadge: {
        position: 'absolute',
        bottom: 6,
        left: 6,
        backgroundColor: 'rgba(0,0,0,0.6)',
        borderRadius: 10,
        paddingHorizontal: 6,
        paddingVertical: 2,
    },
    videoBadgeText: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 12,
    },
    selectionIndicator: {
        position: "absolute",
        top: 8,
        right: 8,
    },
    selectedCircle: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: "#0095F6",
        justifyContent: "center",
        alignItems: "center",
    },
    unselectedCircle: {
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: "#FFFFFF",
        backgroundColor: "transparent",
    },
    selectionNumber: {
        color: "#FFFFFF",
        fontSize: 12,
        fontWeight: "600",
    },
    // Permission overlay styles
    permOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    permCard: {
        width: '100%',
        maxWidth: 420,
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        shadowColor: '#000',
        shadowOpacity: 0.15,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
        elevation: 6,
    },
    permTitle: {
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 8,
        color: '#111',
        textAlign: 'center',
    },
    permDesc: {
        fontSize: 14,
        color: '#555',
        textAlign: 'center',
        marginBottom: 16,
    },
    permActions: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 12,
    },
    permBtn: {
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 8,
        minWidth: 120,
        alignItems: 'center',
    },
    permBtnText: {
        fontWeight: '700',
    },
    // Limited banner
    limitedBanner: {
        marginHorizontal: 12,
        marginTop: 8,
        marginBottom: 4,
        backgroundColor: '#FFF8E1',
        borderColor: '#FFECB3',
        borderWidth: 1,
        borderRadius: 10,
        padding: 12,
    },
    limitedText: {
        color: '#7A5E00',
        marginBottom: 8,
        textAlign: 'center',
    },
    limitedActions: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 8,
        flexWrap: 'wrap',
    },
    successToast: {
        position: 'absolute',
        top: 16,
        left: 16,
        right: 16,
        backgroundColor: '#e6fbec',
        borderColor: '#b1f0c3',
        borderWidth: 1,
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
        elevation: 3,
    },
    successToastText: {
        color: '#116f3f',
        fontWeight: '600',
        textAlign: 'center',
    },
});
