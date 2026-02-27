import { Tabs, useRouter } from "expo-router";
import { Platform, StyleSheet, View, useWindowDimensions } from "react-native";
import React from "react";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function TabLayout() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();

  const tabBarBottomPadding = Platform.select({
    web: 10,
    default: 10,
  });

  const tabBarBottomOffset = Platform.select({
    web: 12,
    default: Math.max(insets.bottom + 6, 12),
  });

  const tabBarHeight = 56 + tabBarBottomPadding;
  const tabBarWidth = Math.min(screenWidth * 0.84, 420);
  const tabBarHorizontalOffset = (screenWidth - tabBarWidth) / 2;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#e2e8f0",
        tabBarInactiveTintColor: "#94a3b8",
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          position: "absolute" as const,
          left: tabBarHorizontalOffset,
          right: tabBarHorizontalOffset,
          bottom: tabBarBottomOffset,
          borderRadius: 24,
          backgroundColor: Platform.OS === "web" ? "rgba(15, 23, 42, 0.3)" : "transparent",
          borderTopWidth: 0,
          borderWidth: 1,
          borderColor: "rgba(148, 163, 184, 0.16)",
          elevation: 0,
          height: tabBarHeight,
          paddingBottom: tabBarBottomPadding,
          paddingTop: 8,
          shadowColor: "#020617",
          shadowOffset: { width: 0, height: 12 },
          shadowOpacity: 0.42,
          shadowRadius: 24,
          overflow: "hidden" as const,
        },
        tabBarBackground: () =>
          Platform.OS !== "web" ? (
            <View style={StyleSheet.absoluteFill} pointerEvents="none">
              <BlurView
                intensity={75}
                tint="dark"
                experimentalBlurMethod="dimezisBlurView"
                style={StyleSheet.absoluteFill}
              />
              <LinearGradient
                colors={[
                  "rgba(255, 255, 255, 0.16)",
                  "rgba(148, 163, 184, 0.08)",
                  "rgba(15, 23, 42, 0.34)",
                ]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <LinearGradient
                colors={["rgba(255, 255, 255, 0.08)", "rgba(255, 255, 255, 0)"]}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 0.75 }}
                style={styles.glassSheen}
              />
              <View style={styles.topShine} />
            </View>
          ) : (
            <LinearGradient
              colors={["rgba(255, 255, 255, 0.08)", "rgba(15, 23, 42, 0.36)"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
          ),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Inicio",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name="home" size={focused ? 24 : 22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: "Historial",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name="time" size={focused ? 24 : 22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="add"
        options={{
          title: "",
          tabBarIcon: () => (
            <View style={styles.addButton}>
              <Ionicons name="add" size={30} color="#e2e8f0" />
            </View>
          ),
          tabBarLabel: () => null,
        }}
        listeners={{
          tabPress: (e) => {
            e.preventDefault();
            router.push("/transaction-modal");
          },
        }}
      />
      <Tabs.Screen
        name="budget"
        options={{
          title: "Presupuesto",
          tabBarIcon: ({ color, focused }) => (
            <MaterialCommunityIcons name="chart-donut" size={focused ? 24 : 22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Personalizar",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name="options-outline" size={focused ? 24 : 22} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  addButton: {
    width: 44,
    height: 44,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    marginTop: -1,
  },
  glassSheen: {
    ...StyleSheet.absoluteFillObject,
  },
  topShine: {
    position: "absolute" as const,
    top: 0,
    left: 20,
    right: 20,
    height: 1,
    backgroundColor: "rgba(148, 163, 184, 0.3)",
  },
});
