import React from "react";
import { StyleSheet, View, Dimensions } from "react-native";
import Svg, { Defs, RadialGradient, Stop, Rect, Ellipse } from "react-native-svg";
import Colors from "@/constants/colors";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");

interface AmbientGlowProps {
  color?: string;
  intensity?: number;
}

export default function AmbientGlow({
  color = Colors.brand.DEFAULT,
  intensity = 0.18,
}: AmbientGlowProps) {
  return (
    <View style={styles.container} pointerEvents="none">
      <Svg width={SCREEN_W} height={SCREEN_H} style={StyleSheet.absoluteFill}>
        <Defs>
          <RadialGradient id="gA" cx="20%" cy="8%" rx="70%" ry="45%">
            <Stop offset="0" stopColor={color} stopOpacity={String(intensity)} />
            <Stop offset="0.5" stopColor={color} stopOpacity={String(intensity * 0.3)} />
            <Stop offset="1" stopColor={color} stopOpacity="0" />
          </RadialGradient>
          <RadialGradient id="gB" cx="85%" cy="18%" rx="55%" ry="40%">
            <Stop offset="0" stopColor="#60a5fa" stopOpacity={String(intensity * 0.6)} />
            <Stop offset="0.55" stopColor="#60a5fa" stopOpacity={String(intensity * 0.15)} />
            <Stop offset="1" stopColor="#60a5fa" stopOpacity="0" />
          </RadialGradient>
          <RadialGradient id="gC" cx="50%" cy="50%" rx="65%" ry="35%">
            <Stop offset="0" stopColor={color} stopOpacity={String(intensity * 0.35)} />
            <Stop offset="0.6" stopColor={color} stopOpacity={String(intensity * 0.08)} />
            <Stop offset="1" stopColor={color} stopOpacity="0" />
          </RadialGradient>
          <RadialGradient id="gD" cx="15%" cy="75%" rx="60%" ry="45%">
            <Stop offset="0" stopColor="#818cf8" stopOpacity={String(intensity * 0.4)} />
            <Stop offset="0.5" stopColor="#818cf8" stopOpacity={String(intensity * 0.1)} />
            <Stop offset="1" stopColor="#818cf8" stopOpacity="0" />
          </RadialGradient>
          <RadialGradient id="gE" cx="80%" cy="85%" rx="50%" ry="40%">
            <Stop offset="0" stopColor={color} stopOpacity={String(intensity * 0.3)} />
            <Stop offset="0.55" stopColor={color} stopOpacity={String(intensity * 0.06)} />
            <Stop offset="1" stopColor={color} stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#gA)" />
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#gB)" />
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#gC)" />
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#gD)" />
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#gE)" />
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
