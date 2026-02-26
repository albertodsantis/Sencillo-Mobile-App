import { QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { StatusBar, View, Text, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { queryClient } from "@/lib/query-client";
import { AppProvider } from "@/lib/context/AppContext";
import { AuthProvider, useAuth } from "@/lib/context/AuthContext";
import "@/lib/notifications";
import LoginScreen from "@/components/LoginScreen";
import Colors from "@/constants/colors";
import {
  useFonts,
  Outfit_400Regular,
  Outfit_500Medium,
  Outfit_600SemiBold,
  Outfit_700Bold,
  Outfit_800ExtraBold,
  Outfit_900Black,
} from "@expo-google-fonts/outfit";

SplashScreen.preventAutoHideAsync();

function BrandedSplash() {
  return (
    <View style={splashStyles.root}>
      <LinearGradient
        colors={[Colors.brand.dark, Colors.brand.DEFAULT, Colors.brand.mist]}
        locations={[0, 0.55, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View style={splashStyles.logoCircle}>
        <LinearGradient
          colors={[Colors.brand.DEFAULT, Colors.brand.dark]}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
        <Text style={splashStyles.logoText}>S</Text>
      </View>
      <Text style={splashStyles.appName}>Sencillo</Text>
    </View>
  );
}

const splashStyles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.dark.base,
    alignItems: "center",
    justifyContent: "center",
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 24,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  logoText: {
    fontFamily: "Outfit_800ExtraBold",
    fontSize: 40,
    color: "#fff",
    zIndex: 1,
  },
  appName: {
    fontFamily: "Outfit_700Bold",
    fontSize: 28,
    color: Colors.text.primary,
  },
});

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="transaction-modal"
        options={{
          presentation: "modal",
          headerShown: false,
          animation: "slide_from_bottom",
          gestureEnabled: true,
          fullScreenGestureEnabled: true,
        }}
      />
      <Stack.Screen
        name="currency-calculator-modal"
        options={{
          presentation: "modal",
          headerShown: false,
          animation: "slide_from_bottom",
          gestureEnabled: true,
          fullScreenGestureEnabled: true,
          contentStyle: { backgroundColor: "transparent" },
        }}
      />
      <Stack.Screen
        name="report"
        options={{
          headerShown: false,
          animation: "slide_from_right",
        }}
      />
      <Stack.Screen
        name="categories"
        options={{
          presentation: "modal",
          headerShown: false,
          animation: "slide_from_bottom",
        }}
      />
      <Stack.Screen
        name="profile"
        options={{
          headerShown: false,
          animation: "slide_from_right",
        }}
      />
    </Stack>
  );
}

function AuthGate() {
  const { user, isLoading } = useAuth();
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    if (!isLoading) {
      const timer = setTimeout(() => setShowSplash(false), 1200);
      return () => clearTimeout(timer);
    }
  }, [isLoading]);

  if (showSplash) return <BrandedSplash />;

  if (!user) {
    return <LoginScreen />;
  }

  return (
    <AppProvider>
      <RootLayoutNav />
    </AppProvider>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Outfit_400Regular,
    Outfit_500Medium,
    Outfit_600SemiBold,
    Outfit_700Bold,
    Outfit_800ExtraBold,
    Outfit_900Black,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <KeyboardProvider>
            <StatusBar barStyle="light-content" backgroundColor={Colors.brand.dark} />
            <AuthProvider>
              <AuthGate />
            </AuthProvider>
          </KeyboardProvider>
        </GestureHandlerRootView>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
