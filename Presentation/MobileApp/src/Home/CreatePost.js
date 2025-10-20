import React, { useState } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    SafeAreaView,
    Image,
    FlatList,
    Dimensions,
} from "react-native";
import { useNavigation } from "@react-navigation/native";

const { width } = Dimensions.get("window");
const numColumns = 3;
const imageSize = width / numColumns;

// Dữ liệu mẫu cho thư viện ảnh
const libraryData = [
    {
        id: "1",
        uri: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=400",
        type: "image",
    },
    {
        id: "2",
        uri: "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=400",
        type: "image",
    },
    {
        id: "3",
        uri: "https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=400",
        type: "image",
    },
    {
        id: "4",
        uri: "https://images.unsplash.com/photo-1518837695005-2083093ee35b?w=400",
        type: "image",
    },
    {
        id: "5",
        uri: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400",
        type: "image",
    },
    {
        id: "6",
        uri: "https://images.unsplash.com/photo-1519681393784-d120267933ba?w=400",
        type: "image",
    },
    {
        id: "7",
        uri: "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=400",
        type: "image",
    },
    {
        id: "8",
        uri: "https://images.unsplash.com/photo-1511593358241-7eea1f3c84e5?w=400",
        type: "image",
    },
    {
        id: "9",
        uri: "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=400",
        type: "image",
    },
    {
        id: "10",
        uri: "https://images.unsplash.com/photo-1472214103451-9374bd1c798e?w=400",
        type: "image",
    },
    {
        id: "11",
        uri: "https://images.unsplash.com/photo-1426604966848-d7adac402bff?w=400",
        type: "image",
    },
    {
        id: "12",
        uri: "https://images.unsplash.com/photo-1502082553048-f009c37129b9?w=400",
        type: "image",
    },
];

export default function CreatePost() {
    const navigation = useNavigation();
    const [selectedTab, setSelectedTab] = useState("Library");
    const [selectedImage, setSelectedImage] = useState(libraryData[0]);
    const [selectedItems, setSelectedItems] = useState([]);
    const [multipleSelectMode, setMultipleSelectMode] = useState(false);

    const handleSelectImage = (item) => {
        if (multipleSelectMode) {
            const isSelected = selectedItems.find((i) => i.id === item.id);
            if (isSelected) {
                setSelectedItems(selectedItems.filter((i) => i.id !== item.id));
            } else {
                setSelectedItems([...selectedItems, item]);
            }
        } else {
            setSelectedImage(item);
        }
    };

    const toggleMultipleSelect = () => {
        setMultipleSelectMode(!multipleSelectMode);
        if (!multipleSelectMode) {
            setSelectedItems([selectedImage]);
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
            selectedImage: imageToShare.uri,
            selectedImages: multipleSelectMode
                ? selectedItems
                : [selectedImage],
        });
    };

    const renderLibraryItem = ({ item }) => {
        const isSelected =
            multipleSelectMode && selectedItems.find((i) => i.id === item.id);
        const selectionNumber = isSelected
            ? selectedItems.findIndex((i) => i.id === item.id) + 1
            : null;

        return (
            <TouchableOpacity
                style={styles.libraryItem}
                onPress={() => handleSelectImage(item)}
            >
                <Image source={{ uri: item.uri }} style={styles.libraryImage} />
                {multipleSelectMode && (
                    <View style={styles.selectionIndicator}>
                        {isSelected ? (
                            <View style={styles.selectedCircle}>
                                <Text style={styles.selectionNumber}>
                                    {selectionNumber}
                                </Text>
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
        <SafeAreaView style={styles.container}>
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

            {/* Preview Image */}
            <View style={styles.previewContainer}>
                <Image
                    source={{ uri: selectedImage.uri }}
                    style={styles.previewImage}
                    resizeMode="cover"
                />

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
            <FlatList
                data={libraryData}
                renderItem={renderLibraryItem}
                keyExtractor={(item) => item.id}
                numColumns={numColumns}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.galleryContainer}
            />
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
});
