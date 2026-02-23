import React from "react";
import { StyleSheet, View, Dimensions } from "react-native";
import Svg, {
  Defs,
  LinearGradient,
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
  intensity = 0.16,
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
          <LinearGradient id="gA" x1="0%" y1="0%" x2="45%" y2="28%">
            <Stop offset="0" stopColor={color} stopOpacity={String(clampOpacity(intensity * 0.72))} />
            <Stop
              offset="0.48"
              stopColor={color}
              stopOpacity={String(clampOpacity(intensity * 0.22))}
            />
            <Stop offset="1" stopColor={color} stopOpacity="0" />
          </LinearGradient>
          <LinearGradient id="gB" x1="100%" y1="0%" x2="58%" y2="28%">
            <Stop
              offset="0"
              stopColor="#67e8f9"
              stopOpacity={String(clampOpacity(intensity * 0.46))}
            />
            <Stop
              offset="0.55"
              stopColor="#60a5fa"
              stopOpacity={String(clampOpacity(intensity * 0.16))}
            />
            <Stop offset="1" stopColor="#60a5fa" stopOpacity="0" />
          </LinearGradient>
          <LinearGradient id="gC" x1="12%" y1="62%" x2="88%" y2="38%">
            <Stop
              offset="0"
              stopColor="#38bdf8"
              stopOpacity={String(clampOpacity(intensity * 0.24))}
            />
            <Stop
              offset="0.65"
              stopColor={color}
              stopOpacity={String(clampOpacity(intensity * 0.08))}
            />
            <Stop offset="1" stopColor={color} stopOpacity="0" />
          </LinearGradient>
          <LinearGradient id="gD" x1="0%" y1="100%" x2="42%" y2="52%">
            <Stop offset="0" stopColor="#a78bfa" stopOpacity={String(clampOpacity(intensity * 0.34))} />
            <Stop
              offset="0.5"
              stopColor="#818cf8"
              stopOpacity={String(clampOpacity(intensity * 0.1))}
            />
            <Stop offset="1" stopColor="#818cf8" stopOpacity="0" />
          </LinearGradient>
          <LinearGradient id="gE" x1="100%" y1="100%" x2="60%" y2="58%">
            <Stop offset="0" stopColor={color} stopOpacity={String(clampOpacity(intensity * 0.3))} />
            <Stop
              offset="0.55"
              stopColor="#14b8a6"
              stopOpacity={String(clampOpacity(intensity * 0.08))}
            />
            <Stop offset="1" stopColor={color} stopOpacity="0" />
          </LinearGradient>
          <LinearGradient id="gCenterLift" x1="50%" y1="8%" x2="50%" y2="72%">
            <Stop
              offset="0"
              stopColor="#e0f2fe"
              stopOpacity={String(clampOpacity(intensity * 0.16))}
            />
            <Stop
              offset="0.6"
              stopColor="#bfdbfe"
              stopOpacity={String(clampOpacity(intensity * 0.05))}
            />
            <Stop offset="1" stopColor="#bfdbfe" stopOpacity="0" />
          </LinearGradient>
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
