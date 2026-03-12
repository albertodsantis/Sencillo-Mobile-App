import React, { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { useRouter } from "expo-router";
import Colors from "@/constants/colors";

export default function AddPlaceholder() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/transaction-modal");
  }, [router]);

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: Colors.dark.base,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <ActivityIndicator size="small" color={Colors.brand.DEFAULT} />
    </View>
  );
}
