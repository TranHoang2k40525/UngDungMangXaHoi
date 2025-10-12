import React from "react"; 
import { SafeAreaProvider } from "react-native-safe-area-context";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import Login from "./src/Auth/Login";
import SignUp from "./src/Auth/SignUp";
import Home from "./src/Home/Home";
import Doanchat from "./src/Messegers/Doanchat";
import Messenger from "./src/Messegers/Messenger";
const Stack = createStackNavigator();
export default function App() {

  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Home" >
        <Stack.Screen name="Login" component={Login} options={{ headerShown: false }} />
        <Stack.Screen name="SignUp" component={SignUp} options={{ headerShown: false}} />
        <Stack.Screen name="Home" component={Home} options={{ headerShown: false}}/>
        <Stack.Screen name="Messenger" component={Messenger} options={{ headerShown: false}}/>
        <Stack.Screen name="Doanchat" component={Doanchat} options={{ headerShown: false}}/>
      </Stack.Navigator>
    </NavigationContainer>
  );
}