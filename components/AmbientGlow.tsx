import React from "react";
import { StyleSheet, View, Dimensions } from "react-native";
import Svg, {
  Defs,
  LinearGradient,
  RadialGradient,
  Stop,
  Rect,
} from "react-native-svg";
import Colors from "@/constants/colors";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");

interface AmbientGlowProps {
  color?: string;
  intensity?: number;
}

export default function AmbientGlow({
  color = Colors.brand.DEFAULT,
  intensity = 0.24,
}: AmbientGlowProps) {
  const clampOpacity = (value: number) => Math.min(Math.max(value, 0), 0.8);

  return (
    <View style={styles.container} pointerEvents="none">
      <Svg width={SCREEN_W} height={SCREEN_H} style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id="gBase" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0" stopColor="#0b1220" stopOpacity="0.06" />
            <Stop offset="0.42" stopColor="#111b31" stopOpacity="0.16" />
            <Stop offset="1" stopColor="#020617" stopOpacity="0.28" />
          </LinearGradient>
          <LinearGradient id="gAccentSweep" x1="10%" y1="0%" x2="90%" y2="95%">
            <Stop
              offset="0"
              stopColor="#22d3ee"
              stopOpacity={String(clampOpacity(intensity * 0.5))}
            />
            <Stop
              offset="0.5"
              stopColor={color}
              stopOpacity={String(clampOpacity(intensity * 0.24))}
            />
            <Stop offset="1" stopColor="#a78bfa" stopOpacity={String(clampOpacity(intensity * 0.3))} />
          </LinearGradient>
          <RadialGradient id="gA" cx="20%" cy="8%" rx="70%" ry="45%">
            <Stop offset="0" stopColor={color} stopOpacity={String(clampOpacity(intensity * 1.2))} />
            <Stop
              offset="0.48"
              stopColor={color}
              stopOpacity={String(clampOpacity(intensity * 0.45))}
            />
            <Stop offset="1" stopColor={color} stopOpacity="0" />
          </RadialGradient>
          <RadialGradient id="gB" cx="85%" cy="18%" rx="55%" ry="40%">
            <Stop
              offset="0"
              stopColor="#67e8f9"
              stopOpacity={String(clampOpacity(intensity * 0.72))}
            />
            <Stop
              offset="0.55"
              stopColor="#60a5fa"
              stopOpacity={String(clampOpacity(intensity * 0.22))}
            />
            <Stop offset="1" stopColor="#60a5fa" stopOpacity="0" />
          </RadialGradient>
          <RadialGradient id="gC" cx="50%" cy="50%" rx="65%" ry="35%">
            <Stop
              offset="0"
              stopColor="#38bdf8"
              stopOpacity={String(clampOpacity(intensity * 0.4))}
            />
            <Stop
              offset="0.65"
              stopColor={color}
              stopOpacity={String(clampOpacity(intensity * 0.12))}
            />
            <Stop offset="1" stopColor={color} stopOpacity="0" />
          </RadialGradient>
          <RadialGradient id="gD" cx="15%" cy="75%" rx="60%" ry="45%">
            <Stop offset="0" stopColor="#a78bfa" stopOpacity={String(clampOpacity(intensity * 0.55))} />
            <Stop
              offset="0.5"
              stopColor="#818cf8"
              stopOpacity={String(clampOpacity(intensity * 0.16))}
            />
            <Stop offset="1" stopColor="#818cf8" stopOpacity="0" />
          </RadialGradient>
          <RadialGradient id="gE" cx="80%" cy="85%" rx="50%" ry="40%">
            <Stop offset="0" stopColor={color} stopOpacity={String(clampOpacity(intensity * 0.5))} />
            <Stop
              offset="0.55"
              stopColor="#14b8a6"
              stopOpacity={String(clampOpacity(intensity * 0.12))}
            />
            <Stop offset="1" stopColor={color} stopOpacity="0" />
          </RadialGradient>
          <RadialGradient id="gCenterLift" cx="50%" cy="35%" rx="60%" ry="42%">
            <Stop
              offset="0"
              stopColor="#e0f2fe"
              stopOpacity={String(clampOpacity(intensity * 0.24))}
            />
            <Stop
              offset="0.6"
              stopColor="#bfdbfe"
              stopOpacity={String(clampOpacity(intensity * 0.08))}
            />
            <Stop offset="1" stopColor="#bfdbfe" stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#gBase)" />
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#gAccentSweep)" />
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#gA)" />
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#gB)" />
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#gC)" />
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#gD)" />
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#gE)" />
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#gCenterLift)" />
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
