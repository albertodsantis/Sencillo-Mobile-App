import { Tabs, useRouter } from "expo-router";
import { Platform, StyleSheet, View } from "react-native";
import React from "react";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function TabLayout() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const tabBarBottomPadding = Platform.select({
    web: 18,
    default: Math.max(insets.bottom - 8, 8),
  });

  const tabBarHeight = 54 + tabBarBottomPadding;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#e2e8f0",
        tabBarInactiveTintColor: "#94a3b8",
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          position: "absolute" as const,
          left: 16,
          right: 16,
          bottom: 8,
          borderRadius: 24,
          backgroundColor: Platform.OS === "web" ? "rgba(15, 23, 42, 0.5)" : "transparent",
          borderTopWidth: 0,
          borderWidth: 1,
          borderColor: "rgba(226, 232, 240, 0.22)",
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
                intensity={85}
                tint="dark"
                experimentalBlurMethod="dimezisBlurView"
                style={StyleSheet.absoluteFill}
              />
              <LinearGradient
                colors={[
                  "rgba(255, 255, 255, 0.26)",
                  "rgba(148, 163, 184, 0.12)",
                  "rgba(15, 23, 42, 0.5)",
                ]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <LinearGradient
                colors={["rgba(255, 255, 255, 0.14)", "rgba(255, 255, 255, 0)"]}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 0.75 }}
                style={styles.glassSheen}
              />
              <View style={styles.topShine} />
            </View>
          ) : (
            <LinearGradient
              colors={["rgba(255, 255, 255, 0.12)", "rgba(15, 23, 42, 0.58)"]}
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
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: "Historial",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="time" size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="add"
        options={{
          title: "",
          tabBarIcon: () => (
            <View style={styles.addButton}>
              <Ionicons name="add" size={24} color="#fff" />
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
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="chart-donut" size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Personalizar",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="options-outline" size={22} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  addButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "rgba(226, 232, 240, 0.22)",
    borderWidth: 1,
    borderColor: "rgba(241, 245, 249, 0.65)",
    alignItems: "center" as const,
    justifyContent: "center" as const,
    marginTop: 0,
    shadowColor: "#020617",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 14,
    elevation: 8,
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
    backgroundColor: "rgba(255, 255, 255, 0.45)",
  },
});
