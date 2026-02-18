import React from "react";
import { View, StyleSheet } from "react-native";
import Svg, {
  Path,
  Defs,
  Filter,
  FeGaussianBlur,
  G,
} from "react-native-svg";

interface Segment {
  value: number;
  color: string;
}

interface GlowRingChartProps {
  data: Segment[];
  size?: number;
  strokeWidth?: number;
  gapDeg?: number;
  glowIntensity?: number;
  children?: React.ReactNode;
}

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function arcPath(
  cx: number,
  cy: number,
  r: number,
  startAngle: number,
  endAngle: number
) {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const sweep = endAngle - startAngle;
  const largeArc = sweep > 180 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y}`;
}

export default function GlowRingChart({
  data,
  size = 120,
  strokeWidth = 14,
  gapDeg = 4,
  glowIntensity = 6,
  children,
}: GlowRingChartProps) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  if (total === 0) return null;

  const cx = size / 2;
  const cy = size / 2;
  const radius = (size - strokeWidth * 2 - glowIntensity * 2) / 2;

  const totalGap = gapDeg * data.length;
  const availableDeg = 360 - totalGap;

  const segments: { startAngle: number; endAngle: number; color: string }[] = [];
  let cursor = 0;

  data.forEach((d, i) => {
    const segDeg = (d.value / total) * availableDeg;
    const start = cursor + gapDeg / 2;
    const end = start + segDeg;
    if (segDeg > 0.5) {
      segments.push({ startAngle: start, endAngle: end, color: d.color });
    }
    cursor = end + gapDeg / 2;
  });

  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Defs>
          <Filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <FeGaussianBlur stdDeviation={String(glowIntensity)} result="blur" />
          </Filter>
        </Defs>

        {segments.map((seg, i) => (
          <G key={i}>
            <Path
              d={arcPath(cx, cy, radius, seg.startAngle, seg.endAngle)}
              stroke={seg.color}
              strokeWidth={strokeWidth + glowIntensity * 2}
              strokeLinecap="round"
              fill="none"
              opacity={0.35}
              filter="url(#glow)"
            />
            <Path
              d={arcPath(cx, cy, radius, seg.startAngle, seg.endAngle)}
              stroke={seg.color}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              fill="none"
            />
          </G>
        ))}
      </Svg>
      {children && (
        <View style={StyleSheet.absoluteFill}>
          <View style={innerStyles.center}>{children}</View>
        </View>
      )}
    </View>
  );
}

const innerStyles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
