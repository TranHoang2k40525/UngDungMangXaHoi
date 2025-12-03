import React, { useRef } from "react";
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { UserProvider, useUser } from "./src/Context/UserContext";
import { FollowProvider } from "./src/Context/FollowContext";
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
import GroupListScreen from "./src/Messegers/GroupListScreen";
import GroupDetailScreen from "./src/Messegers/GroupDetailScreen";
import GroupChatScreen from "./src/Messegers/GroupChatScreen";
import GroupMembersScreen from "./src/Messegers/GroupMembersScreen";
import PinnedMessagesScreen from "./src/Messegers/PinnedMessagesScreen";
import MediaLinksScreen from "./src/Messegers/MediaLinksScreen";
import InviteMemberScreen from "./src/Messegers/InviteMemberScreen";
import CreateGroupScreen from "./src/Messegers/CreateGroupScreen";
import Search from "./src/Searchs/Search";
import Profile from "./src/User/Profile";
import UserProfilePublic from "./src/User/UserProfilePublic";
import FollowList from "./src/User/FollowList";
import PostDetail from "./src/Home/PostDetail";
import Editprofile from "./src/User/Editprofile";
import PhotoPreview from "./src/User/PhotoPreview";
import { View, ActivityIndicator, StyleSheet, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { API_BASE_URL } from "./src/API/Api";
import { TouchableOpacity } from "react-native";
import { emitTabTriple } from "./src/Utils/TabRefreshEmitter";

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

function TabProfileIcon({ focused }) {
  const { user } = useUser();
  const size = focused ? 30 : 30;
  const borderColor = focused ? "#000" : "#9CA3AF";

  // Build avatar URL
  let uri = user?.avatarUrl || user?.AvatarUrl || null;
  if (uri && !uri.startsWith("http")) {
    // Add full path if relative
    if (!uri.startsWith("/")) {
      uri = `/uploads/avatars/${uri}`;
    }
    uri = `${API_BASE_URL}${uri}`;
  }

  // If no avatar, show icon instead
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
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        overflow: "hidden",
        borderWidth: 2,
        borderColor,
      }}
    >
      <Image
        source={{ uri }}
        style={{ width: "100%", height: "100%" }}
        resizeMode="cover"
      />
    </View>
  );
}

function TabBarButton({
  children,
  onPress,
  onLongPress,
  route,
  style,
  accessibilityState,
  ...rest
}) {
  // triple-tap detector
  const taps = useRef([]);
  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={onPress}
      onLongPress={onLongPress || onPress}
      style={[
        { flex: 1, alignItems: "center", justifyContent: "center" },
        style,
      ]}
      accessibilityState={accessibilityState}
      {...rest}
      onPressIn={() => {
        const now = Date.now();
        taps.current = (taps.current || []).filter((t) => now - t < 400);
        taps.current.push(now);
        if (taps.current.length >= 3) {
          // emit an event on navigation to tell that this tab was triple-pressed
          // Use navigation from children via a synthetic event: navigation.emit supported below
          try {
            // children are icons only; route param contains key/name we can use to emit event
            // We use the global navigation container by navigating to the same route with a param
            // that listeners can pick up via navigation.addListener('tabTriplePress', ...)
            // Here we navigate programmatically to the same route which will trigger no-op but we emit an event
            // Use setTimeout to allow normal onPress to process first
            setTimeout(() => {
              // Emit our custom triple-tap event for this tab
              try {
                emitTabTriple(route.name);
              } catch (e) {}
            }, 50);
          } catch (e) {}
        }
      }}
    >
      {children}
    </TouchableOpacity>
  );
}

function MainTabs() {
  const insets = useSafeAreaInsets();
  const baseHeight = 60; // base tab height
  const bottomInset = insets?.bottom || 0;
  return (
    <Tab.Navigator
      id="MainTabs"
      screenOptions={({ route, navigation }) => {
        // Check if current route is Video to invert colors
        const state = navigation.getState();
        const currentRoute = state?.routes[state.index];
        const isVideoRoute = currentRoute?.name === "Video";

        // Inverted colors for Video tab
        const bgColor = isVideoRoute ? "#000000" : "#FFFFFF";
        const borderColor = isVideoRoute ? "rgba(255,255,255,0.1)" : "#DBDBDB";
        const focusedColor = isVideoRoute ? "#FFFFFF" : "#000000";
        const unfocusedColor = isVideoRoute
          ? "rgba(255,255,255,0.6)"
          : "#9CA3AF";

        return {
          headerShown: false,
          tabBarShowLabel: false,
          tabBarHideOnKeyboard: true,
          // Custom tabBarButton to detect triple-tap and emit a refresh event
          tabBarButton: (props) => {
            // route is closed-over from screenOptions
            return <TabBarButton {...props} route={route} />;
          },
          // Ensure the tab bar clears device navigation area by including bottom safe-area inset
          tabBarStyle: {
            height: baseHeight + bottomInset,
            paddingBottom: bottomInset,
            paddingTop: 1,
            borderTopColor: borderColor,
            borderTopWidth: StyleSheet.hairlineWidth,
            backgroundColor: bgColor,
          },
          tabBarIcon: ({ focused, color, size }) => {
            const iconFocusedColor = focused ? focusedColor : unfocusedColor;

            switch (route.name) {
              case "Home":
                return (
                  <Ionicons
                    name={focused ? "home" : "home-outline"}
                    size={28}
                    color={iconFocusedColor}
                  />
                );
              case "Search":
                return (
                  <Ionicons
                    name={focused ? "search" : "search-outline"}
                    size={28}
                    color={iconFocusedColor}
                  />
                );
              case "CreatePost":
                return (
                  <Ionicons
                    name={focused ? "add-circle" : "add-circle-outline"}
                    size={30}
                    color={iconFocusedColor}
                  />
                );
              case "Video":
                return (
                  <Ionicons
                    name={focused ? "play-circle" : "play-circle-outline"}
                    size={30}
                    color={iconFocusedColor}
                  />
                );
              case "Profile":
                return <TabProfileIcon focused={focused} />;
              default:
                return null;
            }
          },
        };
      }}
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
                    translateX: current.progress.interpolate({
                      inputRange: [0, 1],
                      outputRange: [layouts.screen.width, 0],
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
            <Stack.Screen name="GroupList" component={GroupListScreen} />
            <Stack.Screen name="GroupDetail" component={GroupDetailScreen} />
            <Stack.Screen name="GroupChat" component={GroupChatScreen} />
            <Stack.Screen name="GroupMembers" component={GroupMembersScreen} />
            <Stack.Screen
              name="PinnedMessages"
              component={PinnedMessagesScreen}
            />
            <Stack.Screen name="MediaLinks" component={MediaLinksScreen} />
            <Stack.Screen name="InviteMember" component={InviteMemberScreen} />
            <Stack.Screen name="CreateGroup" component={CreateGroupScreen} />
            <Stack.Screen name="CreateStory" component={CreateStory} />
            <Stack.Screen name="ChangePassword" component={ChangePassword} />
            <Stack.Screen name="Thongbao" component={Thongbao} />
            <Stack.Screen name="SharePost" component={SharePost} />
            <Stack.Screen name="PostDetail" component={PostDetail} />
            <Stack.Screen
              name="UserProfilePublic"
              component={UserProfilePublic}
            />
            <Stack.Screen name="FollowList" component={FollowList} />
            <Stack.Screen name="CommentsModal" component={CommentsModal} />
            <Stack.Screen name="StoryViewer" component={StoryViewer} />
            <Stack.Screen name="Editprofile" component={Editprofile} />
            <Stack.Screen name="PhotoPreview" component={PhotoPreview} />
          </>
        ) : (
          // Unauthenticated screens
          <>
            <Stack.Screen name="Login" component={Login} />
            <Stack.Screen name="SignUp" component={SignUp} />
            <Stack.Screen name="VerifyOtp" component={VerifyOtp} />
            <Stack.Screen name="ForgotPassword" component={ForgotPassword} />
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
    <GestureHandlerRootView style={{ flex: 1 }}>
      <UserProvider>
        <FollowProvider>
          <SafeAreaProvider>
            <AppNavigator />
          </SafeAreaProvider>
        </FollowProvider>
      </UserProvider>
    </GestureHandlerRootView>
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
