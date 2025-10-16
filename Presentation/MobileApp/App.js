import React from "react"; 
import { SafeAreaProvider } from "react-native-safe-area-context";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
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
import Doanchat from "./src/Messegers/Doanchat";
import Messenger from "./src/Messegers/Messenger";
import Search from "./src/Searchs/Search";
import Profile from "./src/User/Profile";
import Editprofile from "./src/User/Editprofile";
import PhotoPreview from "./src/User/PhotoPreview";
import { View, ActivityIndicator, StyleSheet } from "react-native";

const Stack = createStackNavigator();

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
        initialRouteName={isAuthenticated ? "Home" : "Login"}
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
            <Stack.Screen name="Home" component={Home} />
            <Stack.Screen name="Messenger" component={Messenger} />
            <Stack.Screen name="Doanchat" component={Doanchat} />
            <Stack.Screen name="ChangePassword" component={ChangePassword} />
            <Stack.Screen name="Search" component={Search} />
            <Stack.Screen name="Video" component={Video} />
            <Stack.Screen name="Thongbao" component={Thongbao} />
            <Stack.Screen name="Profile" component={Profile} />
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
            <Stack.Screen name="VerifyForgotPasswordOtp" component={VerifyForgotPasswordOtp} />
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
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
});  
