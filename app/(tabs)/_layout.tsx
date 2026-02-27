import { Tabs, useRouter } from "expo-router";
import { Platform, StyleSheet, View } from "react-native";
import React from "react";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function TabLayout() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const tabBarBottomPadding = Platform.select({
    web: 34,
    default: Math.max(insets.bottom, 12),
  });

  const tabBarHeight = 62 + tabBarBottomPadding;

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
          bottom: 10,
          borderRadius: 28,
          backgroundColor: Platform.OS === "web" ? "rgba(15, 23, 42, 0.85)" : "transparent",
          borderTopWidth: 0,
          borderWidth: 1,
          borderColor: "rgba(148, 163, 184, 0.22)",
          elevation: 0,
          height: tabBarHeight,
          paddingBottom: tabBarBottomPadding - 2,
          paddingTop: 10,
          shadowColor: "#020617",
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 0.3,
          shadowRadius: 22,
        },
        tabBarBackground: () =>
          Platform.OS !== "web" ? (
            <BlurView
              intensity={80}
              tint="dark"
              experimentalBlurMethod="dimezisBlurView"
              style={StyleSheet.absoluteFill}
            />
          ) : null,
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
              <Ionicons name="add" size={28} color="#fff" />
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
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "rgba(226, 232, 240, 0.22)",
    borderWidth: 1,
    borderColor: "rgba(226, 232, 240, 0.55)",
    alignItems: "center" as const,
    justifyContent: "center" as const,
    marginTop: -22,
    shadowColor: "#020617",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 12,
  },
});
