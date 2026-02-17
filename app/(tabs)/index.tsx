import React, { useState, useCallback, useMemo } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Platform,
  RefreshControl,
  Modal,
  Dimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { PieChart, BarChart } from "react-native-gifted-charts";
import Colors from "@/constants/colors";
import { useApp } from "@/lib/context/AppContext";
import { type ViewMode, type Segment } from "@/lib/domain/types";
import { formatCurrency, formatCompact } from "@/lib/domain/finance";

const VIEW_MODES: { id: ViewMode; label: string }[] = [
  { id: "month", label: "Mes" },
  { id: "ytd", label: "Acumulado" },
  { id: "year", label: "Anual" },
];

const CHART_CATEGORY_COLORS = [
  "#fb7185", "#fb923c", "#f59e0b", "#a78bfa",
  "#38bdf8", "#e879f9", "#f472b6", "#facc15",
];

function MiniKpi({
  label,
  total,
  vesAmount,
  hardAmount,
  color,
  icon,
  onPress,
}: {
  label: string;
  total: number;
  vesAmount: number;
  hardAmount: number;
  color: string;
  icon: React.ReactNode;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.miniKpi,
        pressed && { opacity: 0.8 },
      ]}
    >
      <View style={styles.miniKpiTop}>
        <View style={[styles.miniKpiIcon, { backgroundColor: color + "18" }]}>
          {icon}
        </View>
        <Text style={styles.miniKpiLabel} numberOfLines={1}>{label}</Text>
      </View>
      <Text style={[styles.miniKpiValue, { color }]} numberOfLines={1}>
        ${formatCompact(total)}
      </Text>
      <View style={styles.miniKpiBreakdown}>
        <View style={styles.miniKpiTag}>
          <Text style={styles.miniKpiTagPrefix}>$</Text>
          <Text style={styles.miniKpiTagVal}>{formatCompact(hardAmount)}</Text>
        </View>
        <View style={styles.miniKpiTag}>
          <Text style={styles.miniKpiTagPrefix}>Bs</Text>
          <Text style={styles.miniKpiTagVal}>{formatCompact(vesAmount)}</Text>
        </View>
      </View>
    </Pressable>
  );
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const {
    rates,
    dashboardData,
    transactions,
    viewMode,
    setViewMode,
    currentMonth,
    currentYear,
    setCurrentMonth,
    setCurrentYear,
    isLoading,
    isRefreshingRates,
    refreshRates,
    setHistoryFilter,
    profile,
  } = useApp();

  const [showGuide, setShowGuide] = useState(false);

  const expensesByCategory = useMemo(() => {
    const filtered = transactions.filter((t) => {
      const d = new Date(t.date);
      if (viewMode === "month") {
        return t.type === "expense" && d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      } else if (viewMode === "ytd") {
        return t.type === "expense" && d.getFullYear() === currentYear && d.getMonth() <= currentMonth;
      }
      return t.type === "expense" && d.getFullYear() === currentYear;
    });
    const map: Record<string, number> = {};
    filtered.forEach((t) => {
      if (t.segment === "ahorro") return;
      map[t.category] = (map[t.category] || 0) + t.amountUSD;
    });
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .map(([cat, val], i) => ({
        value: val,
        color: CHART_CATEGORY_COLORS[i % CHART_CATEGORY_COLORS.length],
        text: cat,
      }));
  }, [transactions, viewMode, currentMonth, currentYear]);

  const totalExpenses = dashboardData.gastosFijos + dashboardData.gastosVariables;
  const barData = useMemo(() => {
    const maxVal = Math.max(dashboardData.ingresos, totalExpenses, 1);
    return [
      {
        value: dashboardData.ingresos,
        label: "Ingresos",
        frontColor: Colors.segments.ingresos.color,
        topLabelComponent: () => (
          <Text style={{ fontFamily: "Outfit_700Bold", fontSize: 10, color: Colors.segments.ingresos.color, marginBottom: 4 }}>
            ${formatCompact(dashboardData.ingresos)}
          </Text>
        ),
      },
      {
        value: totalExpenses,
        label: "Gastos",
        frontColor: "#fb7185",
        topLabelComponent: () => (
          <Text style={{ fontFamily: "Outfit_700Bold", fontSize: 10, color: "#fb7185", marginBottom: 4 }}>
            ${formatCompact(totalExpenses)}
          </Text>
        ),
      },
    ];
  }, [dashboardData.ingresos, totalExpenses]);

  const displayName =
    (profile.firstName || profile.lastName)
      ? `${profile.firstName} ${profile.lastName}`.trim()
      : "Sencillo";

  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const topPadding = insets.top + webTopInset + 16;

  const monthLabel = new Date(currentYear, currentMonth).toLocaleDateString(
    "es-ES",
    { month: "long", year: "numeric" }
  );
  const capitalizedMonth =
    monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1);

  const prevMonth = useCallback(() => {
    if (viewMode === "year") {
      setCurrentYear(currentYear - 1);
    } else {
      if (currentMonth === 0) {
        setCurrentMonth(11);
        setCurrentYear(currentYear - 1);
      } else {
        setCurrentMonth(currentMonth - 1);
      }
    }
  }, [viewMode, currentMonth, currentYear, setCurrentMonth, setCurrentYear]);

  const nextMonth = useCallback(() => {
    if (viewMode === "year") {
      setCurrentYear(currentYear + 1);
    } else {
      if (currentMonth === 11) {
        setCurrentMonth(0);
        setCurrentYear(currentYear + 1);
      } else {
        setCurrentMonth(currentMonth + 1);
      }
    }
  }, [viewMode, currentMonth, currentYear, setCurrentMonth, setCurrentYear]);

  const navigateToHistory = (filter: string) => {
    setHistoryFilter(filter);
    router.push("/(tabs)/history");
  };

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { paddingTop: topPadding }]}>
        <ActivityIndicator size="large" color={Colors.brand.DEFAULT} />
      </View>
    );
  }

  const balanceLabel =
    viewMode === "ytd"
      ? "BALANCE ACUMULADO"
      : viewMode === "year"
        ? "BALANCE ANUAL"
        : "BALANCE NETO";

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingTop: topPadding, paddingBottom: 120, paddingHorizontal: 24 }}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshingRates}
          onRefresh={refreshRates}
          tintColor={Colors.brand.DEFAULT}
          colors={[Colors.brand.DEFAULT]}
        />
      }
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{displayName}</Text>
        <View style={styles.headerActions}>
          <Pressable onPress={() => setShowGuide(true)} style={styles.helpBtn}>
            <Ionicons name="help-circle-outline" size={24} color={Colors.text.muted} />
          </Pressable>
          <Pressable onPress={() => router.push("/profile")} style={styles.profileBtn}>
            <Ionicons name="person" size={20} color={Colors.text.secondary} />
          </Pressable>
        </View>
      </View>

      <View style={styles.monthNav}>
        <Pressable onPress={prevMonth} style={styles.navButton}>
          <Ionicons name="chevron-back" size={22} color={Colors.text.secondary} />
        </Pressable>
        <Text style={styles.monthLabel}>
          {viewMode === "year" ? `${currentYear}` : capitalizedMonth}
        </Text>
        <Pressable onPress={nextMonth} style={styles.navButton}>
          <Ionicons name="chevron-forward" size={22} color={Colors.text.secondary} />
        </Pressable>
      </View>

      <View style={styles.segmentControl}>
        {VIEW_MODES.map((mode) => (
          <Pressable
            key={mode.id}
            onPress={() => setViewMode(mode.id)}
            style={[
              styles.segmentButton,
              viewMode === mode.id && styles.segmentButtonActive,
            ]}
          >
            <Text
              style={[
                styles.segmentText,
                viewMode === mode.id && styles.segmentTextActive,
              ]}
            >
              {mode.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <Pressable
        onPress={refreshRates}
        style={styles.ratesBar}
      >
        <View style={styles.ratesRow}>
          <View style={styles.rateItem}>
            <Text style={styles.rateLabel}>BCV $</Text>
            <Text style={styles.rateValue}>
              {rates.bcv?.toFixed(2) || "---"}
            </Text>
          </View>
          <View style={styles.rateDivider} />
          <View style={styles.rateItem}>
            <Text style={styles.rateLabel}>USDC</Text>
            <Text style={styles.rateValue}>
              {rates.parallel?.toFixed(2) || "---"}
            </Text>
          </View>
          <View style={styles.rateDivider} />
          <View style={styles.rateItem}>
            <Text style={styles.rateLabel}>BRECHA</Text>
            <Text style={styles.rateValue}>
              {rates.bcv && rates.parallel
                ? `${(((rates.parallel - rates.bcv) / rates.bcv) * 100).toFixed(1)}%`
                : "---"}
            </Text>
          </View>
          <View style={styles.rateDivider} />
          <View style={styles.rateItem}>
            <Text style={styles.rateLabel}>BCV EUR</Text>
            <View style={styles.eurRow}>
              <Text style={styles.rateValue}>
                {rates.eur?.toFixed(2) || "---"}
              </Text>
              <Text style={styles.eurCrossText}>
                {rates.eurCross ? `$/€ ${rates.eurCross.toFixed(2)}` : ""}
              </Text>
            </View>
          </View>
        </View>
      </Pressable>

      <Pressable onPress={() => router.push("/report")}>
        <LinearGradient
          colors={["#047857", "#065f46", "#064e3b"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.balanceCard}
        >
          <Text style={styles.balanceLabel}>{balanceLabel}</Text>
          <Text style={styles.balanceValue}>
            ${formatCurrency(dashboardData.balance)}
          </Text>
          <View style={styles.reportLink}>
            <Text style={styles.reportLinkText}>Ver Reporte Detallado</Text>
            <Feather name="arrow-right" size={12} color="rgba(255,255,255,0.7)" />
          </View>
        </LinearGradient>
      </Pressable>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.kpiScroll}
        contentContainerStyle={styles.kpiRow}
      >
        <MiniKpi
          label="Ingresos"
          total={dashboardData.ingresos}
          vesAmount={dashboardData.ingresosVES}
          hardAmount={dashboardData.ingresosHard}
          color={Colors.segments.ingresos.color}
          icon={<Ionicons name="trending-up" size={12} color={Colors.segments.ingresos.color} />}
          onPress={() => navigateToHistory("ingresos")}
        />
        <MiniKpi
          label="G. Fijos"
          total={dashboardData.gastosFijos}
          vesAmount={dashboardData.gastosFijosVES}
          hardAmount={dashboardData.gastosFijosHard}
          color={Colors.segments.gastos_fijos.color}
          icon={<MaterialCommunityIcons name="credit-card" size={12} color={Colors.segments.gastos_fijos.color} />}
          onPress={() => navigateToHistory("gastos")}
        />
        <MiniKpi
          label="G. Var."
          total={dashboardData.gastosVariables}
          vesAmount={dashboardData.gastosVariablesVES}
          hardAmount={dashboardData.gastosVariablesHard}
          color={Colors.segments.gastos_variables.color}
          icon={<Ionicons name="trending-down" size={12} color={Colors.segments.gastos_variables.color} />}
          onPress={() => navigateToHistory("gastos")}
        />
        <MiniKpi
          label="Ahorro"
          total={dashboardData.ahorro}
          vesAmount={dashboardData.ahorroVES}
          hardAmount={dashboardData.ahorroHard}
          color={Colors.segments.ahorro.color}
          icon={<MaterialCommunityIcons name="piggy-bank" size={12} color={Colors.segments.ahorro.color} />}
          onPress={() => navigateToHistory("ahorro")}
        />
      </ScrollView>

      <View style={styles.chartsContainer}>
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Ingresos vs Gastos</Text>
          {dashboardData.ingresos > 0 || totalExpenses > 0 ? (
            <View style={styles.barChartWrap}>
              <BarChart
                data={barData}
                width={Dimensions.get("window").width - 120}
                height={120}
                barWidth={40}
                spacing={50}
                noOfSections={4}
                barBorderRadius={6}
                yAxisThickness={0}
                xAxisThickness={0}
                xAxisLabelTextStyle={{ fontFamily: "Outfit_600SemiBold", fontSize: 10, color: Colors.text.muted }}
                yAxisTextStyle={{ fontFamily: "Outfit_600SemiBold", fontSize: 9, color: Colors.text.disabled }}
                hideRules
                backgroundColor="transparent"
                isAnimated
              />
            </View>
          ) : (
            <Text style={styles.chartEmpty}>Sin datos para este periodo</Text>
          )}
        </View>

        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Gastos por Categoria</Text>
          {expensesByCategory.length > 0 ? (
            <View style={styles.donutWrap}>
              <PieChart
                data={expensesByCategory}
                donut
                radius={70}
                innerRadius={45}
                innerCircleColor={Colors.dark.surface}
                centerLabelComponent={() => (
                  <View style={styles.donutCenter}>
                    <Text style={styles.donutCenterValue}>${formatCompact(totalExpenses)}</Text>
                    <Text style={styles.donutCenterLabel}>total</Text>
                  </View>
                )}
                isAnimated
              />
              <View style={styles.legendList}>
                {expensesByCategory.slice(0, 6).map((item, i) => (
                  <View key={item.text} style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                    <Text style={styles.legendText} numberOfLines={1}>{item.text}</Text>
                    <Text style={styles.legendValue}>${formatCompact(item.value)}</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : (
            <Text style={styles.chartEmpty}>Sin gastos registrados</Text>
          )}
        </View>
      </View>
      <Modal
        visible={showGuide}
        transparent
        animationType="fade"
        onRequestClose={() => setShowGuide(false)}
      >
        <Pressable style={guideStyles.overlay} onPress={() => setShowGuide(false)}>
          <Pressable style={guideStyles.card} onPress={(e) => e.stopPropagation()}>
            <View style={guideStyles.step}>
              <View style={guideStyles.iconCircle}>
                <Ionicons name="color-palette" size={22} color={Colors.text.secondary} />
              </View>
              <View style={guideStyles.stepContent}>
                <Text style={guideStyles.stepTitle}>1. Personalizacion</Text>
                <Text style={guideStyles.stepDesc}>
                  Configura tus categorias de ingresos, gastos fijos y variables para adaptar la app a ti.
                </Text>
              </View>
            </View>

            <View style={guideStyles.step}>
              <View style={[guideStyles.iconCircle, { backgroundColor: "rgba(16,185,129,0.15)" }]}>
                <Ionicons name="add" size={22} color={Colors.brand.DEFAULT} />
              </View>
              <View style={guideStyles.stepContent}>
                <Text style={guideStyles.stepTitle}>2. Agregar Movimientos</Text>
                <Text style={guideStyles.stepDesc}>
                  Registra ingresos o gastos usando el boton central. Puedes usar Bs, USD o EUR.
                </Text>
              </View>
            </View>

            <View style={guideStyles.step}>
              <View style={guideStyles.iconCircle}>
                <MaterialCommunityIcons name="chart-donut" size={22} color={Colors.text.secondary} />
              </View>
              <View style={guideStyles.stepContent}>
                <Text style={guideStyles.stepTitle}>3. Presupuestos</Text>
                <Text style={guideStyles.stepDesc}>
                  Define limites para tus Gastos Variables y manten siempre positivo tu Disponible Flexible.
                </Text>
              </View>
            </View>

            <View style={[guideStyles.step, { borderBottomWidth: 0 }]}>
              <View style={guideStyles.iconCircle}>
                <Ionicons name="time" size={22} color={Colors.text.secondary} />
              </View>
              <View style={guideStyles.stepContent}>
                <Text style={guideStyles.stepTitle}>4. Historial</Text>
                <Text style={guideStyles.stepDesc}>
                  Revisa todos tus movimientos, filtra por tipo y edita o elimina lo que necesites.
                </Text>
              </View>
            </View>

            <Pressable
              onPress={() => setShowGuide(false)}
              style={guideStyles.dismissBtn}
            >
              <Text style={guideStyles.dismissText}>Entendido</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}

const guideStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center" as const,
    alignItems: "center" as const,
    padding: 28,
  },
  card: {
    backgroundColor: Colors.dark.card,
    borderRadius: 24,
    padding: 24,
    width: "100%",
    maxWidth: 380,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  step: {
    flexDirection: "row" as const,
    gap: 14,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.borderSubtle,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.06)",
    alignItems: "center" as const,
    justifyContent: "center" as const,
    marginTop: 2,
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontFamily: "Outfit_700Bold",
    fontSize: 15,
    color: Colors.text.primary,
    marginBottom: 4,
  },
  stepDesc: {
    fontFamily: "Outfit_400Regular",
    fontSize: 13,
    color: Colors.text.muted,
    lineHeight: 19,
  },
  dismissBtn: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center" as const,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    marginTop: 20,
  },
  dismissText: {
    fontFamily: "Outfit_700Bold",
    fontSize: 15,
    color: Colors.text.primary,
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.base,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: Colors.dark.base,
    justifyContent: "center" as const,
    alignItems: "center" as const,
  },
  header: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    marginBottom: 16,
  },
  headerTitle: {
    fontFamily: "Outfit_900Black",
    fontSize: 22,
    color: Colors.text.primary,
    letterSpacing: -0.5,
  },
  headerActions: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
  },
  helpBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.05)",
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  profileBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.dark.card,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  monthNav: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    marginBottom: 12,
  },
  navButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.05)",
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  monthLabel: {
    fontFamily: "Outfit_700Bold",
    fontSize: 18,
    color: Colors.text.primary,
    letterSpacing: -0.3,
  },
  segmentControl: {
    flexDirection: "row" as const,
    backgroundColor: Colors.dark.surface,
    borderRadius: 16,
    padding: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: "center" as const,
  },
  segmentButtonActive: {
    backgroundColor: "#fff",
  },
  segmentText: {
    fontFamily: "Outfit_700Bold",
    fontSize: 12,
    color: Colors.text.muted,
  },
  segmentTextActive: {
    color: "#000",
  },
  ratesBar: {
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    marginBottom: 16,
  },
  ratesRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
  },
  rateItem: {
    alignItems: "center" as const,
  },
  rateLabel: {
    fontFamily: "Outfit_700Bold",
    fontSize: 9,
    color: "rgba(167,243,208,0.5)",
    letterSpacing: 0.8,
    textTransform: "uppercase" as const,
    marginBottom: 2,
  },
  rateValue: {
    fontFamily: "Outfit_700Bold",
    fontSize: 14,
    color: Colors.text.primary,
  },
  eurRow: {
    flexDirection: "row" as const,
    alignItems: "baseline" as const,
    gap: 4,
  },
  eurCrossText: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 9,
    color: Colors.text.muted,
  },
  rateDivider: {
    width: 1,
    height: 24,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  balanceCard: {
    borderRadius: 24,
    paddingVertical: 18,
    paddingHorizontal: 20,
    alignItems: "center" as const,
    marginBottom: 16,
    shadowColor: Colors.brand.DEFAULT,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 12,
  },
  balanceLabel: {
    fontFamily: "Outfit_700Bold",
    fontSize: 11,
    color: "rgba(167,243,208,0.8)",
    letterSpacing: 2,
    textTransform: "uppercase" as const,
    marginBottom: 4,
  },
  balanceValue: {
    fontFamily: "Outfit_900Black",
    fontSize: 34,
    color: Colors.text.primary,
    letterSpacing: -1.5,
  },
  reportLink: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
    marginTop: 12,
  },
  reportLinkText: {
    fontFamily: "Outfit_700Bold",
    fontSize: 10,
    color: "rgba(255,255,255,0.7)",
    letterSpacing: 1,
    textTransform: "uppercase" as const,
  },
  kpiScroll: {
    marginBottom: 16,
    marginHorizontal: -24,
  },
  kpiRow: {
    flexDirection: "row" as const,
    gap: 10,
    paddingHorizontal: 24,
  },
  miniKpi: {
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    alignItems: "center" as const,
    minWidth: 90,
  },
  miniKpiTop: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 5,
    marginBottom: 6,
  },
  miniKpiIcon: {
    width: 22,
    height: 22,
    borderRadius: 7,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  miniKpiLabel: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 10,
    color: Colors.text.muted,
  },
  miniKpiValue: {
    fontFamily: "Outfit_800ExtraBold",
    fontSize: 16,
    letterSpacing: -0.3,
    marginBottom: 6,
  },
  miniKpiBreakdown: {
    gap: 3,
    alignSelf: "stretch" as const,
  },
  miniKpiTag: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    backgroundColor: "rgba(255,255,255,0.05)",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },
  miniKpiTagPrefix: {
    fontFamily: "Outfit_700Bold",
    fontSize: 8,
    color: "rgba(148,163,184,0.7)",
  },
  miniKpiTagVal: {
    fontFamily: "Outfit_700Bold",
    fontSize: 8,
    color: Colors.text.secondary,
  },
  chartsContainer: {
    gap: 16,
  },
  chartCard: {
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  chartTitle: {
    fontFamily: "Outfit_700Bold",
    fontSize: 14,
    color: Colors.text.primary,
    marginBottom: 16,
  },
  chartEmpty: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 12,
    color: Colors.text.disabled,
    textAlign: "center" as const,
    paddingVertical: 24,
  },
  barChartWrap: {
    alignItems: "center" as const,
  },
  donutWrap: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 20,
  },
  donutCenter: {
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  donutCenterValue: {
    fontFamily: "Outfit_800ExtraBold",
    fontSize: 14,
    color: Colors.text.primary,
  },
  donutCenterLabel: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 9,
    color: Colors.text.muted,
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
  },
  legendList: {
    flex: 1,
    gap: 6,
  },
  legendItem: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    flex: 1,
    fontFamily: "Outfit_600SemiBold",
    fontSize: 11,
    color: Colors.text.secondary,
  },
  legendValue: {
    fontFamily: "Outfit_700Bold",
    fontSize: 11,
    color: Colors.text.primary,
  },
});
