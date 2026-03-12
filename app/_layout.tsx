import { Stack, usePathname, useRouter } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { StatusBar, View, Text, Image, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as Sentry from "@sentry/react-native";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AppProvider, useApp } from "@/lib/context/AppContext";
import { AuthProvider, useAuth } from "@/lib/context/AuthContext";
import { captureErrorBoundaryException } from "@/lib/monitoring/sentry";
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

const splashBackground = ["#020617", "#0b1730", "#111827", "#020617"] as const;

void SplashScreen.preventAutoHideAsync();

function BrandedSplash() {
  return (
    <View style={splashStyles.root}>
      <LinearGradient
        colors={splashBackground}
        locations={[0, 0.3, 0.6, 1]}
        style={StyleSheet.absoluteFill}
      />
      <Image
        source={require("@/assets/images/splash-icon.png")}
        style={splashStyles.logoImage}
      />
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
  logoImage: {
    width: 84,
    height: 84,
    resizeMode: "contain",
    marginBottom: 16,
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
        name="onboarding"
        options={{
          headerShown: false,
          gestureEnabled: false,
          animation: "fade",
        }}
      />
      <Stack.Screen
        name="transaction-modal"
        options={{
          presentation: "modal",
          headerShown: false,
          animation: "slide_from_bottom",
          gestureEnabled: true,
          fullScreenGestureEnabled: true,
          contentStyle: { backgroundColor: Colors.dark.surface },
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
        name="profile"
        options={{
          headerShown: false,
          animation: "slide_from_right",
        }}
      />
    </Stack>
  );
}

function RootMonitoringSync() {
  const pathname = usePathname();
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      Sentry.setUser(null);
      Sentry.setContext("auth", null);
      return;
    }

    Sentry.setUser({
      id: user.id,
      email: user.email,
      username: user.name,
    });
    Sentry.setContext("auth", { provider: user.provider });
  }, [user]);

  useEffect(() => {
    if (!pathname) return;

    Sentry.setTag("route", pathname);
    Sentry.addBreadcrumb({
      category: "navigation",
      message: `Route changed to ${pathname}`,
      level: "info",
    });
  }, [pathname]);

  return null;
}

function WorkspaceMonitoringSync() {
  const { activeWorkspaceId } = useApp();

  useEffect(() => {
    Sentry.setContext(
      "workspace",
      activeWorkspaceId ? { id: activeWorkspaceId } : null,
    );
  }, [activeWorkspaceId]);

  return null;
}

function AppNavigatorGate() {
  const { isLoading, needsOnboarding, bootstrapError } = useApp();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const isOnboardingRoute = pathname === "/onboarding";
    if (needsOnboarding && !isOnboardingRoute) {
      router.replace("/onboarding");
      return;
    }

    if (!needsOnboarding && isOnboardingRoute) {
      router.replace("/(tabs)");
    }
  }, [isLoading, needsOnboarding, pathname, router]);

  if (isLoading) {
    return <BrandedSplash />;
  }

  if (bootstrapError) {
    throw new Error(bootstrapError);
  }

  return <RootLayoutNav />;
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
      <WorkspaceMonitoringSync />
      <AppNavigatorGate />
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
    <ErrorBoundary onError={captureErrorBoundaryException}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <KeyboardProvider>
          <StatusBar barStyle="light-content" backgroundColor="#020617" />
          <AuthProvider>
            <RootMonitoringSync />
            <AuthGate />
          </AuthProvider>
        </KeyboardProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}
