import { Tabs, useRouter } from "expo-router";
import { Platform, StyleSheet, View } from "react-native";
import React from "react";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";

export default function TabLayout() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const tabBarBottomPadding = Platform.select({
    web: 34,
    default: Math.max(insets.bottom, 10),
  });

  const tabBarHeight = 66 + tabBarBottomPadding;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors.brand.DEFAULT,
        tabBarInactiveTintColor: Colors.text.muted,
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          position: "absolute" as const,
          left: 12,
          right: 12,
          bottom: 8,
          borderRadius: 24,
          overflow: "hidden" as const,
          backgroundColor: Platform.select({
            ios: "transparent",
            android: "rgba(15, 23, 42, 0.95)",
            web: "rgba(15, 23, 42, 0.95)",
          }),
          borderTopWidth: 1,
          borderTopColor: Colors.dark.border,
          elevation: 14,
          height: tabBarHeight,
          paddingBottom: tabBarBottomPadding,
          paddingTop: 10,
          paddingHorizontal: 10,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.28,
          shadowRadius: 18,
        },
        tabBarItemStyle: {
          borderRadius: 16,
        },
        tabBarBackground: () =>
          Platform.OS === "ios" ? (
            <BlurView
              intensity={100}
              tint="dark"
              style={StyleSheet.absoluteFill}
            />
          ) : null,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Inicio",
          tabBarIcon: ({ color }) => (
            <Ionicons name="home" size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: "Historial",
          tabBarIcon: ({ color }) => (
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
          tabBarIcon: ({ color }) => (
            <MaterialCommunityIcons name="chart-donut" size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Personalizar",
          tabBarIcon: ({ color }) => (
            <Ionicons name="pencil" size={22} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  addButton: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: Colors.brand.DEFAULT,
    borderWidth: 3,
    borderColor: "rgba(2, 6, 23, 0.55)",
    alignItems: "center" as const,
    justifyContent: "center" as const,
    marginTop: -28,
    shadowColor: Colors.brand.DEFAULT,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 12,
  },
});
