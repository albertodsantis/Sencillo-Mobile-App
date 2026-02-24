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
  NativeSyntheticEvent,
  NativeScrollEvent,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import GlowRingChart from "@/components/GlowRingChart";
import Colors from "@/constants/colors";
import AmbientGlow from "@/components/AmbientGlow";
import CurrencyCalculatorModal from "@/components/CurrencyCalculatorModal";
import { useApp } from "@/lib/context/AppContext";
import {
  type ViewMode,
  type Segment,
  type DisplayCurrency,
  type Rates,
} from "@/lib/domain/types";
import { formatCurrency, convertUSDToDisplayCurrency, getDisplayCurrencySymbol } from "@/lib/domain/finance";

const VIEW_MODES: { id: ViewMode; label: string }[] = [
  { id: "month", label: "Mes" },
  { id: "ytd", label: "Acumulado" },
  { id: "year", label: "Anual" },
];

const SCREEN_WIDTH = Dimensions.get("window").width;
const CARD_WIDTH = SCREEN_WIDTH - 56;
const CARD_GAP = 12;

const SEGMENT_PALETTES: Record<string, string[]> = {
  ingresos: [
    "#6ee7b7",
    "#34d399",
    "#10b981",
    "#059669",
    "#047857",
    "#065f46",
    "#064e3b",
    "#022c22",
  ],
  gastos_fijos: [
    "#fed7aa",
    "#fdba74",
    "#fb923c",
    "#f97316",
    "#ea580c",
    "#c2410c",
    "#9a3412",
    "#7c2d12",
  ],
  gastos_variables: [
    "#fecdd3",
    "#fda4af",
    "#fb7185",
    "#f43f5e",
    "#e11d48",
    "#be123c",
    "#9f1239",
    "#881337",
  ],
  ahorro: [
    "#bfdbfe",
    "#93c5fd",
    "#60a5fa",
    "#3b82f6",
    "#2563eb",
    "#1d4ed8",
    "#1e40af",
    "#1e3a8a",
  ],
};

interface CategoryStat {
  name: string;
  total: number;
  count: number;
  pct: number;
}

function KpiCard({
  label,
  total,
  vesAmount,
  hardAmount,
  color,
  segment,
  icon,
  count,
  categories,
  onPress,
  hidden,
  displayCurrency,
  rates,
}: {
  label: string;
  total: number;
  vesAmount: number;
  hardAmount: number;
  color: string;
  segment: string;
  icon: React.ReactNode;
  count: number;
  categories: CategoryStat[];
  onPress?: () => void;
  hidden?: boolean;
  displayCurrency: DisplayCurrency;
  rates: Rates;
}) {
  const palette = SEGMENT_PALETTES[segment] || SEGMENT_PALETTES.ingresos;
  const currencySymbol = getDisplayCurrencySymbol(displayCurrency);
  const totalDisplay = convertUSDToDisplayCurrency(total, displayCurrency, rates);
  const hardDisplay = convertUSDToDisplayCurrency(hardAmount, displayCurrency, rates);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.kpiCard,
        pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
      ]}
    >
      <View style={styles.kpiCardHeader}>
        <View style={[styles.kpiIconCircle, { backgroundColor: color + "20" }]}>
          {icon}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.kpiCardLabel}>{label}</Text>
          <Text style={styles.kpiCardCount}>
            {count} registro{count !== 1 ? "s" : ""}
          </Text>
        </View>
        <View>
          <Text style={[styles.kpiCardTotal, { color }]} numberOfLines={1}>
            {hidden
              ? `${currencySymbol} ••••`
              : `${currencySymbol}${Math.round(totalDisplay).toLocaleString("en-US")}`}
          </Text>
        </View>
      </View>

      <View style={styles.kpiCurrencyRow}>
        <View style={[styles.kpiCurrencyPill, { borderColor: color + "30" }]}>
          <Text style={[styles.kpiCurrencySymbol, { color: color + "90" }]}>
            {displayCurrency}
          </Text>
          <Text style={styles.kpiCurrencyVal}>
            {hidden
              ? "••••"
              : `${currencySymbol}${Math.round(hardDisplay).toLocaleString("en-US")}`}
          </Text>
        </View>
        <View style={[styles.kpiCurrencyPill, { borderColor: color + "30" }]}>
          <Text style={[styles.kpiCurrencySymbol, { color: color + "90" }]}>
            Bs
          </Text>
          <Text style={styles.kpiCurrencyVal}>
            {hidden ? "••••" : Math.round(vesAmount).toLocaleString("en-US")}
          </Text>
        </View>
      </View>

      {categories.length > 0 ? (
        <>
          <View style={styles.kpiDonutSection}>
            <GlowRingChart
              data={categories.slice(0, 8).map((cat, i) => ({
                value: cat.total,
                color: palette[i % palette.length],
              }))}
              size={140}
              strokeWidth={14}
              gapDeg={20}
              glowIntensity={2}
            >
              <View style={styles.kpiDonutCenter}>
                <Text style={[styles.kpiDonutCenterVal, { color }]}>
                  {categories.length}
                </Text>
              </View>
            </GlowRingChart>
            <View style={styles.kpiLegend}>
              {categories.slice(0, 5).map((cat, i) => (
                <View key={cat.name} style={styles.kpiLegendRow}>
                  <View
                    style={[
                      styles.kpiLegendDot,
                      { backgroundColor: palette[i % palette.length] },
                    ]}
                  />
                  <Text style={styles.kpiLegendName} numberOfLines={1}>
                    {cat.name}
                  </Text>
                  <Text
                    style={[
                      styles.kpiLegendPct,
                      { color: palette[i % palette.length] },
                    ]}
                  >
                    {cat.pct.toFixed(0)}%
                  </Text>
                </View>
              ))}
            </View>
          </View>

          {categories.filter((c) => c.count > 1).length > 0 && (
            <View style={styles.kpiAvgSection}>
              <Text style={styles.kpiAvgTitle}>Promedios</Text>
              {categories
                .filter((c) => c.count > 1)
                .slice(0, 4)
                .map((cat, i) => (
                  <View key={cat.name} style={styles.kpiAvgRow}>
                    <Text style={styles.kpiAvgName} numberOfLines={1}>
                      {cat.name}
                    </Text>
                    <Text style={styles.kpiAvgVal}>
                      {hidden
                        ? `${currencySymbol} ••••`
                        : `${currencySymbol}${Math.round(convertUSDToDisplayCurrency(cat.total / cat.count, displayCurrency, rates)).toLocaleString("en-US")}`}
                    </Text>
                    <Text style={styles.kpiAvgCount}>x{cat.count}</Text>
                  </View>
                ))}
            </View>
          )}
        </>
      ) : (
        <View style={styles.kpiEmptyCat}>
          <Text style={styles.kpiEmptyCatText}>Sin registros</Text>
        </View>
      )}
    </Pressable>
  );
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const {
    rates,
    ratesTimestamp,
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
    displayCurrency,
    setDisplayCurrency,
  } = useApp();

  const [showGuide, setShowGuide] = useState(false);
  const [showCalc, setShowCalc] = useState(false);
  const [activeCardIdx, setActiveCardIdx] = useState(0);
  const [hiddenBalances, setHiddenBalances] = useState(false);

  const filteredByPeriod = useMemo(() => {
    return transactions.filter((t) => {
      const d = new Date(t.date);
      if (viewMode === "month") {
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      } else if (viewMode === "ytd") {
        return d.getFullYear() === currentYear && d.getMonth() <= currentMonth;
      }
      return d.getFullYear() === currentYear;
    });
  }, [transactions, viewMode, currentMonth, currentYear]);

  const buildCategoryStats = useCallback(
    (segment: Segment): { count: number; categories: CategoryStat[] } => {
      const items = filteredByPeriod.filter((t) => t.segment === segment);
      const catMap: Record<string, { total: number; count: number }> = {};
      items.forEach((t) => {
        if (!catMap[t.category]) catMap[t.category] = { total: 0, count: 0 };
        catMap[t.category].total += t.amountUSD;
        catMap[t.category].count += 1;
      });
      const totalUSD = items.reduce((s, t) => s + t.amountUSD, 0);
      const categories = Object.entries(catMap)
        .sort((a, b) => b[1].total - a[1].total)
        .map(([name, { total, count }]) => ({
          name,
          total,
          count,
          pct: totalUSD > 0 ? (total / totalUSD) * 100 : 0,
        }));
      return { count: items.length, categories };
    },
    [filteredByPeriod],
  );

  const ingresosStats = useMemo(
    () => buildCategoryStats("ingresos"),
    [buildCategoryStats],
  );
  const fijoStats = useMemo(
    () => buildCategoryStats("gastos_fijos"),
    [buildCategoryStats],
  );
  const varStats = useMemo(
    () => buildCategoryStats("gastos_variables"),
    [buildCategoryStats],
  );
  const ahorroStats = useMemo(
    () => buildCategoryStats("ahorro"),
    [buildCategoryStats],
  );

  const handleKpiScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const x = e.nativeEvent.contentOffset.x;
      const idx = Math.round(x / (CARD_WIDTH + CARD_GAP));
      setActiveCardIdx(Math.max(0, Math.min(idx, 3)));
    },
    [],
  );

  const displayName = profile.firstName || "Sencillo";

  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const topPadding = insets.top + webTopInset + 16;

  const monthLabel = new Date(currentYear, currentMonth).toLocaleDateString(
    "es-ES",
    { month: "long", year: "numeric" },
  );
  const capitalizedMonth =
    monthLabel.charAt(0).toUpperCase() +
    monthLabel.slice(1).replace(" de ", " ");

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
      ? "ACUMULADO (Lo que va de año)"
      : viewMode === "year"
        ? "BALANCE ANUAL"
        : "BALANCE NETO";

  const balanceDisplay = formatCurrency(
    convertUSDToDisplayCurrency(dashboardData.balance, displayCurrency, rates),
    2
  );
  const [balanceWhole = "0", balanceFraction = "00"] =
    balanceDisplay.split(".");

  return (
    <View style={styles.container}>
      <AmbientGlow />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: topPadding,
          paddingBottom: 120,
          paddingHorizontal: 24,
        }}
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
          <View style={styles.headerLeft}>
            <Pressable onPress={() => router.push("/profile")}>
              <Ionicons
                name="person-outline"
                size={26}
                color={Colors.text.secondary}
              />
            </Pressable>
            <Text style={styles.headerTitle}>{displayName}</Text>
          </View>
          <View style={styles.headerRight}>
            <Pressable
              onPress={() => setDisplayCurrency(displayCurrency === "USD" ? "EUR" : "USD")}
              hitSlop={8}
              style={styles.headerIconBtn}
            >
              <Text style={styles.currencyToggleText}>
                {displayCurrency === "USD" ? "$" : "€"}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setShowCalc(true)}
              hitSlop={8}
              style={styles.headerIconBtn}
            >
              <Ionicons
                name="calculator-outline"
                size={24}
                color={Colors.text.muted}
              />
            </Pressable>
            <Pressable
              onPress={() => setHiddenBalances(!hiddenBalances)}
              hitSlop={8}
              style={styles.headerIconBtn}
            >
              <Ionicons
                name={hiddenBalances ? "eye-off-outline" : "eye-outline"}
                size={26}
                color={Colors.text.muted}
              />
            </Pressable>
            <Pressable
              onPress={() => setShowGuide(true)}
              hitSlop={8}
              style={styles.headerIconBtn}
            >
              <Ionicons
                name="help-circle-outline"
                size={28}
                color={Colors.text.muted}
              />
            </Pressable>
          </View>
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

        <View style={styles.monthNav}>
          <Pressable onPress={prevMonth} style={styles.navButton}>
            <Ionicons
              name="chevron-back"
              size={26}
              color={Colors.text.secondary}
            />
          </Pressable>
          <Text style={styles.monthLabel}>
            {viewMode === "year" ? `${currentYear}` : capitalizedMonth}
          </Text>
          <Pressable onPress={nextMonth} style={styles.navButton}>
            <Ionicons
              name="chevron-forward"
              size={26}
              color={Colors.text.secondary}
            />
          </Pressable>
        </View>

        <Pressable
          onPress={() => router.push("/report")}
          style={styles.balanceSection}
        >
          <Text style={styles.balanceLabel}>{balanceLabel}</Text>
          {hiddenBalances ? (
            <Text style={styles.balanceValue}>{`${getDisplayCurrencySymbol(displayCurrency)} ••••••`}</Text>
          ) : (
            <View style={styles.balanceRow}>
              <Text style={styles.balanceValue}>
                {getDisplayCurrencySymbol(displayCurrency)}
                {balanceWhole}
              </Text>
              <Text style={styles.balanceDecimals}>
                .
                {balanceFraction}
              </Text>
            </View>
          )}
          <View style={styles.reportLink}>
            <Text style={styles.reportLinkText}>Ver Reporte</Text>
            <Feather name="arrow-right" size={12} color={Colors.text.muted} />
          </View>
        </Pressable>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.kpiScroll}
          contentContainerStyle={styles.kpiRow}
          snapToInterval={CARD_WIDTH + CARD_GAP}
          decelerationRate="fast"
          onScroll={handleKpiScroll}
          scrollEventThrottle={16}
        >
          <KpiCard
            label="Ingresos"
            total={dashboardData.ingresos}
            vesAmount={dashboardData.ingresosVES}
            hardAmount={dashboardData.ingresosHard}
            color={Colors.segments.ingresos.color}
            segment="ingresos"
            icon={
              <Ionicons
                name="trending-up"
                size={18}
                color={Colors.segments.ingresos.color}
              />
            }
            count={ingresosStats.count}
            categories={ingresosStats.categories}
            onPress={() => navigateToHistory("ingresos")}
            hidden={hiddenBalances}
            displayCurrency={displayCurrency}
            rates={rates}
          />
          <KpiCard
            label="Gastos Fijos"
            total={dashboardData.gastosFijos}
            vesAmount={dashboardData.gastosFijosVES}
            hardAmount={dashboardData.gastosFijosHard}
            color={Colors.segments.gastos_fijos.color}
            segment="gastos_fijos"
            icon={
              <MaterialCommunityIcons
                name="credit-card"
                size={18}
                color={Colors.segments.gastos_fijos.color}
              />
            }
            count={fijoStats.count}
            categories={fijoStats.categories}
            onPress={() => navigateToHistory("gastos")}
            hidden={hiddenBalances}
            displayCurrency={displayCurrency}
            rates={rates}
          />
          <KpiCard
            label="Gastos Variables"
            total={dashboardData.gastosVariables}
            vesAmount={dashboardData.gastosVariablesVES}
            hardAmount={dashboardData.gastosVariablesHard}
            color={Colors.segments.gastos_variables.color}
            segment="gastos_variables"
            icon={
              <Ionicons
                name="trending-down"
                size={18}
                color={Colors.segments.gastos_variables.color}
              />
            }
            count={varStats.count}
            categories={varStats.categories}
            onPress={() => navigateToHistory("gastos")}
            hidden={hiddenBalances}
            displayCurrency={displayCurrency}
            rates={rates}
          />
          <KpiCard
            label="Ahorro"
            total={dashboardData.ahorro}
            vesAmount={dashboardData.ahorroVES}
            hardAmount={dashboardData.ahorroHard}
            color={Colors.segments.ahorro.color}
            segment="ahorro"
            icon={
              <MaterialCommunityIcons
                name="piggy-bank"
                size={18}
                color={Colors.segments.ahorro.color}
              />
            }
            count={ahorroStats.count}
            categories={ahorroStats.categories}
            onPress={() => navigateToHistory("ahorro")}
            hidden={hiddenBalances}
            displayCurrency={displayCurrency}
            rates={rates}
          />
        </ScrollView>

        <View style={styles.kpiDots}>
          {[0, 1, 2, 3].map((i) => (
            <View
              key={i}
              style={[
                styles.kpiDot,
                i === activeCardIdx && styles.kpiDotActive,
              ]}
            />
          ))}
        </View>

        <CurrencyCalculatorModal
          visible={showCalc}
          onClose={() => setShowCalc(false)}
          rates={rates}
          ratesTimestamp={ratesTimestamp}
        />

        <Modal
          visible={showGuide}
          transparent
          animationType="fade"
          onRequestClose={() => setShowGuide(false)}
        >
          <Pressable
            style={guideStyles.overlay}
            onPress={() => setShowGuide(false)}
          >
            <Pressable
              style={guideStyles.card}
              onPress={(e) => e.stopPropagation()}
            >
              <View style={guideStyles.step}>
                <View style={guideStyles.iconCircle}>
                  <Ionicons
                    name="color-palette"
                    size={22}
                    color={Colors.text.secondary}
                  />
                </View>
                <View style={guideStyles.stepContent}>
                  <Text style={guideStyles.stepTitle}>1. Personalizacion</Text>
                  <Text style={guideStyles.stepDesc}>
                    Configura tus categorias de ingresos, gastos fijos y
                    variables para adaptar la app a ti.
                  </Text>
                </View>
              </View>

              <View style={guideStyles.step}>
                <View
                  style={[
                    guideStyles.iconCircle,
                    { backgroundColor: "rgba(16,185,129,0.15)" },
                  ]}
                >
                  <Ionicons name="add" size={22} color={Colors.brand.DEFAULT} />
                </View>
                <View style={guideStyles.stepContent}>
                  <Text style={guideStyles.stepTitle}>
                    2. Agregar Movimientos
                  </Text>
                  <Text style={guideStyles.stepDesc}>
                    Registra ingresos o gastos usando el boton central. Puedes
                    usar Bs, USD o EUR.
                  </Text>
                </View>
              </View>

              <View style={guideStyles.step}>
                <View style={guideStyles.iconCircle}>
                  <MaterialCommunityIcons
                    name="chart-donut"
                    size={22}
                    color={Colors.text.secondary}
                  />
                </View>
                <View style={guideStyles.stepContent}>
                  <Text style={guideStyles.stepTitle}>3. Presupuestos</Text>
                  <Text style={guideStyles.stepDesc}>
                    Define limites para tus Gastos Variables y manten siempre
                    positivo tu Disponible Flexible.
                  </Text>
                </View>
              </View>

              <View style={[guideStyles.step, { borderBottomWidth: 0 }]}>
                <View style={guideStyles.iconCircle}>
                  <Ionicons
                    name="time"
                    size={22}
                    color={Colors.text.secondary}
                  />
                </View>
                <View style={guideStyles.stepContent}>
                  <Text style={guideStyles.stepTitle}>4. Historial</Text>
                  <Text style={guideStyles.stepDesc}>
                    Revisa todos tus movimientos, filtra por tipo y edita o
                    elimina lo que necesites.
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
    </View>
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
    marginBottom: 28,
  },
  headerLeft: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
  },
  headerTitle: {
    fontFamily: "Outfit_400Regular",
    fontSize: 16,
    color: Colors.text.primary,
    letterSpacing: -0.3,
  },
  headerRight: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 12,
  },
  headerIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  currencyToggleText: {
    color: Colors.text.muted,
    fontFamily: "Outfit_700Bold",
    fontSize: 22,
    lineHeight: 22,
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
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  monthNav: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    marginBottom: 12,
  },
  navButton: {
    padding: 6,
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
    backgroundColor: "rgba(15, 23, 42, 0.55)",
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
  balanceSection: {
    alignItems: "center" as const,
    marginBottom: 20,
    paddingVertical: 8,
  },
  balanceLabel: {
    fontFamily: "Outfit_700Bold",
    fontSize: 11,
    color: Colors.text.muted,
    letterSpacing: 2,
    textTransform: "uppercase" as const,
    marginBottom: 6,
  },
  balanceRow: {
    flexDirection: "row" as const,
    alignItems: "baseline" as const,
  },
  balanceValue: {
    fontFamily: "Outfit_900Black",
    fontSize: 42,
    color: Colors.text.primary,
    letterSpacing: -1.5,
  },
  balanceDecimals: {
    fontFamily: "Outfit_700Bold",
    fontSize: 22,
    color: Colors.text.secondary,
    letterSpacing: -0.5,
  },
  reportLink: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
    marginTop: 10,
  },
  reportLinkText: {
    fontFamily: "Outfit_700Bold",
    fontSize: 10,
    color: Colors.text.muted,
    letterSpacing: 1,
    textTransform: "uppercase" as const,
  },
  kpiScroll: {
    marginBottom: 8,
    marginHorizontal: -24,
  },
  kpiRow: {
    flexDirection: "row" as const,
    gap: CARD_GAP,
    paddingHorizontal: 24,
    paddingRight: 24 + (SCREEN_WIDTH - CARD_WIDTH - 48),
  },
  kpiCard: {
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 20,
    paddingVertical: 22,
    paddingHorizontal: 22,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    width: CARD_WIDTH,
  },
  kpiCardHeader: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 12,
    marginBottom: 14,
  },
  kpiIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  kpiCardLabel: {
    fontFamily: "Outfit_700Bold",
    fontSize: 14,
    color: Colors.text.primary,
  },
  kpiCardCount: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 11,
    color: Colors.text.muted,
    marginTop: 1,
  },
  kpiCardTotal: {
    fontFamily: "Outfit_900Black",
    fontSize: 18,
    letterSpacing: -0.5,
  },
  kpiCurrencyRow: {
    flexDirection: "row" as const,
    gap: 8,
    marginBottom: 14,
  },
  kpiCurrencyPill: {
    flex: 1,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
    backgroundColor: "rgba(255,255,255,0.02)",
  },
  kpiCurrencySymbol: {
    fontFamily: "Outfit_700Bold",
    fontSize: 10,
    letterSpacing: 0.5,
  },
  kpiCurrencyVal: {
    fontFamily: "Outfit_700Bold",
    fontSize: 12,
    color: Colors.text.secondary,
  },
  kpiDonutSection: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 16,
  },
  kpiDonutCenter: {
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  kpiDonutCenterVal: {
    fontFamily: "Outfit_800ExtraBold",
    fontSize: 18,
  },
  kpiDonutCenterSub: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 9,
    color: Colors.text.muted,
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
  },
  kpiLegend: {
    flex: 1,
    gap: 6,
  },
  kpiLegendRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 7,
  },
  kpiLegendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  kpiLegendName: {
    flex: 1,
    fontFamily: "Outfit_600SemiBold",
    fontSize: 11,
    color: Colors.text.secondary,
  },
  kpiLegendPct: {
    fontFamily: "Outfit_700Bold",
    fontSize: 11,
    color: Colors.text.primary,
    minWidth: 30,
    textAlign: "right" as const,
  },
  kpiAvgSection: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.06)",
    paddingTop: 10,
    gap: 5,
  },
  kpiAvgTitle: {
    fontFamily: "Outfit_700Bold",
    fontSize: 10,
    color: Colors.text.muted,
    letterSpacing: 0.8,
    textTransform: "uppercase" as const,
    marginBottom: 2,
  },
  kpiAvgRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
  },
  kpiAvgName: {
    flex: 1,
    fontFamily: "Outfit_600SemiBold",
    fontSize: 11,
    color: Colors.text.secondary,
  },
  kpiAvgVal: {
    fontFamily: "Outfit_700Bold",
    fontSize: 11,
    color: Colors.text.primary,
  },
  kpiAvgCount: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 9,
    color: Colors.text.disabled,
    minWidth: 20,
    textAlign: "right" as const,
  },
  kpiEmptyCat: {
    paddingVertical: 12,
    alignItems: "center" as const,
  },
  kpiEmptyCatText: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 11,
    color: Colors.text.disabled,
  },
  kpiDots: {
    flexDirection: "row" as const,
    justifyContent: "center" as const,
    gap: 6,
    marginBottom: 16,
  },
  kpiDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  kpiDotActive: {
    backgroundColor: Colors.brand.DEFAULT,
    width: 18,
    borderRadius: 4,
  },
});
