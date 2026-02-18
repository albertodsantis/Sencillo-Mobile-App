import React from "react";
import { StyleSheet, View, Dimensions } from "react-native";
import Svg, { Defs, RadialGradient, Stop, Rect, Ellipse } from "react-native-svg";
import Colors from "@/constants/colors";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");

interface AmbientGlowProps {
  color?: string;
  secondaryColor?: string;
  intensity?: number;
}

export default function AmbientGlow({
  color = Colors.brand.DEFAULT,
  secondaryColor = "#1e40af",
  intensity = 0.18,
}: AmbientGlowProps) {
  return (
    <View style={styles.container} pointerEvents="none">
      <Svg width={SCREEN_W} height={SCREEN_H} style={StyleSheet.absoluteFill}>
        <Defs>
          <RadialGradient id="glow1" cx="20%" cy="8%" rx="60%" ry="40%">
            <Stop offset="0" stopColor={color} stopOpacity={String(intensity)} />
            <Stop offset="0.5" stopColor={color} stopOpacity={String(intensity * 0.3)} />
            <Stop offset="1" stopColor={color} stopOpacity="0" />
          </RadialGradient>
          <RadialGradient id="glow2" cx="85%" cy="35%" rx="50%" ry="35%">
            <Stop offset="0" stopColor={secondaryColor} stopOpacity={String(intensity * 0.5)} />
            <Stop offset="0.6" stopColor={secondaryColor} stopOpacity={String(intensity * 0.12)} />
            <Stop offset="1" stopColor={secondaryColor} stopOpacity="0" />
          </RadialGradient>
          <RadialGradient id="glow3" cx="40%" cy="90%" rx="55%" ry="30%">
            <Stop offset="0" stopColor={color} stopOpacity={String(intensity * 0.35)} />
            <Stop offset="0.5" stopColor={color} stopOpacity={String(intensity * 0.08)} />
            <Stop offset="1" stopColor={color} stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill={Colors.dark.base} />
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#glow1)" />
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#glow2)" />
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#glow3)" />
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
