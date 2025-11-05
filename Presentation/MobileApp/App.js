import React from "react";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { UserProvider, useUser } from "./src/Context/UserContext";
import Login from "./src/Auth/Login";
import SignUp from "./src/Auth/SignUp";
import VerifyOtp from "./src/Auth/VerifyOtp";
import ForgotPassword from "./src/Auth/ForgotPassword";
import VerifyForgotPasswordOtp from "./src/Auth/VerifyForgotPasswordOtp";
import ChangePassword from "./src/Auth/ChangePassword";
import Home from "./src/Home/Home";
import Video from "./src/Home/Video";
import Thongbao from "./src/Home/Thongbao";
import CreatePost from "./src/Home/CreatePost";
import SharePost from "./src/Home/SharePost";
import StoryViewer from "./src/Home/StoryViewer";
import CommentsModal from "./src/Home/CommentsModal";
import CreateStory from "./src/Home/CreateStory";

import Doanchat from "./src/Messegers/Doanchat";
import Messenger from "./src/Messegers/Messenger";
import Search from "./src/Searchs/Search";
import Profile from "./src/User/Profile";
import Editprofile from "./src/User/Editprofile";
import PhotoPreview from "./src/User/PhotoPreview";
import { View, ActivityIndicator, StyleSheet, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { API_BASE_URL } from "./src/API/Api";

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

function TabProfileIcon({ focused }) {
    const { user } = useUser();
    const size = focused ? 24 : 24;
    const borderColor = focused ? "#000" : "#9CA3AF";
    let uri = user?.avatarUrl || user?.AvatarUrl || null;
    if (uri && !uri.startsWith("http")) {
        uri = `${API_BASE_URL}${uri}`;
    }
    if (!uri) {
        return (
            <Ionicons
                name={focused ? "person-circle" : "person-circle-outline"}
                size={size + 2}
                color={focused ? "#000" : "#9CA3AF"}
            />
        );
    }
    return (
        <View style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            overflow: "hidden",
            borderWidth: 2,
            borderColor,
        }}>
            <Image source={{ uri }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
        </View>
    );
}

function MainTabs() {
    const insets = useSafeAreaInsets();
    const baseHeight = 56; // base tab height
    const bottomInset = insets?.bottom || 0;
    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                headerShown: false,
                tabBarShowLabel: false,
                tabBarHideOnKeyboard: true,
                // Ensure the tab bar clears device navigation area by including bottom safe-area inset
                tabBarStyle: {
                    height: baseHeight + bottomInset,
                    paddingBottom: bottomInset, // chỉ đệm đúng phần safe-area, không thêm khoảng trắng
                    paddingTop: 0,
                    borderTopColor: "#DBDBDB",
                    borderTopWidth: StyleSheet.hairlineWidth,
                    backgroundColor: "#FFFFFF",
                },
                tabBarIcon: ({ focused, color, size }) => {
                    switch (route.name) {
                        case "Home":
                            return (
                                <Ionicons
                                    name={focused ? "home" : "home-outline"}
                                    size={24}
                                    color={focused ? "#000" : "#9CA3AF"}
                                />
                            );
                        case "Search":
                            return (
                                <Ionicons
                                    name={focused ? "search" : "search-outline"}
                                    size={24}
                                    color={focused ? "#000" : "#9CA3AF"}
                                />
                            );
                        case "CreatePost":
                            return (
                                <Ionicons
                                    name={focused ? "add-circle" : "add-circle-outline"}
                                    size={26}
                                    color={focused ? "#000" : "#9CA3AF"}
                                />
                            );
                        case "Video":
                            return (
                                <Ionicons
                                    name={focused ? "play-circle" : "play-circle-outline"}
                                    size={26}
                                    color={focused ? "#000" : "#9CA3AF"}
                                />
                            );
                        case "Profile":
                            return <TabProfileIcon focused={focused} />;
                        default:
                            return null;
                    }
                },
            })}
        >
            <Tab.Screen name="Home" component={Home} />
            <Tab.Screen name="Search" component={Search} />
            <Tab.Screen name="CreatePost" component={CreatePost} />
            <Tab.Screen name="Video" component={Video} />
            <Tab.Screen name="Profile" component={Profile} />

        </Tab.Navigator>
    );
}

// Component để xử lý navigation dựa trên trạng thái đăng nhập
function AppNavigator() {
    const { isAuthenticated, isLoading } = useUser();

    if (isLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#3B82F6" />
            </View>
        );
    }

    return (
        <NavigationContainer>
            <Stack.Navigator
                initialRouteName={isAuthenticated ? "MainTabs" : "Login"}
                screenOptions={{
                    headerShown: false,
                    gestureEnabled: true,
                    cardStyleInterpolator: ({ current, layouts }) => {
                        return {
                            cardStyle: {
                                transform: [
                                    {
                                        translateX:
                                            current.progress.interpolate({
                                                inputRange: [0, 1],
                                                outputRange: [
                                                    layouts.screen.width,
                                                    0,
                                                ],
                                            }),
                                    },
                                ],
                            },
                        };
                    },
                }}
            >
                {isAuthenticated ? (
                    // Authenticated screens
                    <>
                        <Stack.Screen name="MainTabs" component={MainTabs} />
                        <Stack.Screen name="Messenger" component={Messenger} />
                        <Stack.Screen name="Doanchat" component={Doanchat} />
                        <Stack.Screen name="CreateStory" component={CreateStory} />
                        <Stack.Screen
                            name="ChangePassword"
                            component={ChangePassword}
                        />
                        <Stack.Screen name="Thongbao" component={Thongbao} />
                        <Stack.Screen name="SharePost" component={SharePost} />
                        <Stack.Screen
                            name="CommentsModal"
                            component={CommentsModal}
                        />
                        <Stack.Screen
                            name="StoryViewer"
                            component={StoryViewer}
                        />
                        <Stack.Screen
                            name="Editprofile"
                            component={Editprofile}
                        />
                        <Stack.Screen
                            name="PhotoPreview"
                            component={PhotoPreview}
                        />
                    </>
                ) : (
                    // Unauthenticated screens
                    <>
                        <Stack.Screen name="Login" component={Login} />
                        <Stack.Screen name="SignUp" component={SignUp} />
                        <Stack.Screen name="VerifyOtp" component={VerifyOtp} />
                        <Stack.Screen
                            name="ForgotPassword"
                            component={ForgotPassword}
                        />
                        <Stack.Screen
                            name="VerifyForgotPasswordOtp"
                            component={VerifyForgotPasswordOtp}
                        />
                    </>
                )}
            </Stack.Navigator>
        </NavigationContainer>
    );
}

export default function App() {
    return (
        <UserProvider>
            <SafeAreaProvider>
                <AppNavigator />
            </SafeAreaProvider>
        </UserProvider>
    );
}

const styles = StyleSheet.create({
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#FFFFFF",
    },
});
