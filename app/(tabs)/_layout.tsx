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
    default: Math.max(insets.bottom, 12),
  });

  const tabBarHeight = 56 + tabBarBottomPadding + 8;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors.brand.DEFAULT,
        tabBarInactiveTintColor: Colors.text.muted,
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          position: "absolute" as const,
          backgroundColor: Platform.select({
            ios: "transparent",
            android: Colors.dark.base,
            web: Colors.dark.base,
          }),
          borderTopWidth: 0,
          elevation: 0,
          height: tabBarHeight,
          paddingBottom: tabBarBottomPadding,
          paddingTop: 8,
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
            <Ionicons name="color-palette" size={22} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  addButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.brand.DEFAULT,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    marginTop: -20,
    shadowColor: Colors.brand.DEFAULT,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
});
