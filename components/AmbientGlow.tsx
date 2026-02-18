import React from "react";
import { StyleSheet, View, Dimensions } from "react-native";
import Svg, { Defs, RadialGradient, Stop, Rect } from "react-native-svg";
import Colors from "@/constants/colors";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");

interface AmbientGlowProps {
  color?: string;
  intensity?: number;
}

export default function AmbientGlow({
  color = Colors.brand.DEFAULT,
  intensity = 0.22,
}: AmbientGlowProps) {
  return (
    <View style={styles.container} pointerEvents="none">
      <Svg width={SCREEN_W} height={SCREEN_H} style={StyleSheet.absoluteFill}>
        <Defs>
          <RadialGradient id="topGlow" cx="50%" cy="0%" rx="70%" ry="45%">
            <Stop offset="0" stopColor={color} stopOpacity={String(intensity)} />
            <Stop offset="0.35" stopColor={color} stopOpacity={String(intensity * 0.45)} />
            <Stop offset="0.65" stopColor={color} stopOpacity={String(intensity * 0.12)} />
            <Stop offset="1" stopColor={color} stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#topGlow)" />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },
});
