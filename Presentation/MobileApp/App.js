import React from "react"; 
import { SafeAreaProvider } from "react-native-safe-area-context";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { UserProvider } from "./src/Context/UserContext";
import Login from "./src/Auth/Login";
import SignUp from "./src/Auth/SignUp";
import VerifyOtp from "./src/Auth/VerifyOtp";
import ForgotPassword from "./src/Auth/ForgotPassword";
import VerifyForgotPasswordOtp from "./src/Auth/VerifyForgotPasswordOtp";
import ChangePassword from "./src/Auth/ChangePassword";
// import Home from "./src/Home/Home";
// import Doanchat from "./src/Messegers/Doanchat";
// import Messenger from "./src/Messegers/Messenger";

const Stack = createStackNavigator();

export default function App() {
  return (
    <UserProvider>
      <SafeAreaProvider>
        <NavigationContainer>
          <Stack.Navigator initialRouteName="Login">
            <Stack.Screen name="Login" component={Login} options={{ headerShown: false }} />
            <Stack.Screen name="SignUp" component={SignUp} options={{ headerShown: false}} />
            <Stack.Screen name="VerifyOtp" component={VerifyOtp} options={{ headerShown: false}} />
            <Stack.Screen name="ForgotPassword" component={ForgotPassword} options={{ headerShown: false}} />
            <Stack.Screen name="VerifyForgotPasswordOtp" component={VerifyForgotPasswordOtp} options={{ headerShown: false}} />
            <Stack.Screen name="ChangePassword" component={ChangePassword} options={{ headerShown: false}} />
            {/* <Stack.Screen name="Home" component={Home} options={{ headerShown: false}}/>
            <Stack.Screen name="Messenger" component={Messenger} options={{ headerShown: false}}/>
            <Stack.Screen name="Doanchat" component={Doanchat} options={{ headerShown: false}}/> */}
          </Stack.Navigator>
        </NavigationContainer>
      </SafeAreaProvider>
    </UserProvider>
  );
}  