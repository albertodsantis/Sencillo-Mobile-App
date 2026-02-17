import React, { useState, useCallback } from "react";
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
import Colors from "@/constants/colors";
import { useApp } from "@/lib/context/AppContext";
import { type ViewMode } from "@/lib/domain/types";
import { formatCurrency, formatCompact } from "@/lib/domain/finance";

const VIEW_MODES: { id: ViewMode; label: string }[] = [
  { id: "month", label: "Mes" },
  { id: "ytd", label: "Acumulado" },
  { id: "year", label: "Anual" },
];

function KpiCard({
  label,
  total,
  vesAmount,
  hardAmount,
  color,
  bgColor,
  icon,
  onPress,
  devalPercent,
}: {
  label: string;
  total: number;
  vesAmount: number;
  hardAmount: number;
  color: string;
  bgColor: string;
  icon: React.ReactNode;
  onPress?: () => void;
  devalPercent?: number;
}) {
  const hasDeval = devalPercent !== undefined && Math.abs(devalPercent) > 0.1;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.kpiCard,
        pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] },
      ]}
    >
      <View style={[styles.kpiIconContainer, { backgroundColor: bgColor }]}>
        {icon}
      </View>
      <Text style={styles.kpiLabel}>{label}</Text>
      <Text style={[styles.kpiValue, { color }]}>
        ${formatCurrency(total)}
      </Text>
      <View style={styles.kpiBreakdown}>
        <View style={styles.kpiTag}>
          <Text style={styles.kpiTagPrefix}>$</Text>
          <Text style={styles.kpiTagValue}>
            {formatCompact(hardAmount)}
          </Text>
        </View>
        <View
          style={[
            styles.kpiTag,
            hasDeval &&
              devalPercent! < 0 && {
                backgroundColor: "rgba(239,68,68,0.1)",
              },
            hasDeval &&
              devalPercent! >= 0 && {
                backgroundColor: "rgba(52,211,153,0.1)",
              },
          ]}
        >
          <Text
            style={[
              styles.kpiTagPrefix,
              hasDeval && devalPercent! < 0 && { color: "#f87171" },
              hasDeval && devalPercent! >= 0 && { color: "#34d399" },
            ]}
          >
            Bs
          </Text>
          <Text
            style={[
              styles.kpiTagValue,
              hasDeval && devalPercent! < 0 && { color: "#f87171" },
              hasDeval && devalPercent! >= 0 && { color: "#34d399" },
            ]}
          >
            {formatCompact(vesAmount)}
            {hasDeval
              ? ` (${devalPercent! > 0 ? "+" : ""}${devalPercent!.toFixed(0)}%)`
              : ""}
          </Text>
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
        onPress={() =>
          router.push({
            pathname: "/report",
          })
        }
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
            <Text style={[styles.rateValue, { color: Colors.brand.light }]}>
              {rates.parallel?.toFixed(2) || "---"}
            </Text>
          </View>
          <View style={styles.rateDivider} />
          <View style={styles.rateItem}>
            <Text style={styles.rateLabel}>BCV EUR</Text>
            <Text style={[styles.rateValue, { color: "#60a5fa" }]}>
              {rates.eur?.toFixed(2) || "---"}
            </Text>
          </View>
        </View>
        <Feather name="refresh-cw" size={14} color={Colors.brand.DEFAULT} />
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

      <View style={styles.kpiGrid}>
        <KpiCard
          label="Ingresos"
          total={dashboardData.ingresos}
          vesAmount={dashboardData.ingresosVES}
          hardAmount={dashboardData.ingresosHard}
          color={Colors.segments.ingresos.color}
          bgColor={Colors.segments.ingresos.bg}
          icon={
            <Ionicons
              name="trending-up"
              size={14}
              color={Colors.segments.ingresos.color}
            />
          }
          onPress={() => navigateToHistory("ingresos")}
        />
        <KpiCard
          label="Gastos Fijos"
          total={dashboardData.gastosFijos}
          vesAmount={dashboardData.gastosFijosVES}
          hardAmount={dashboardData.gastosFijosHard}
          color={Colors.segments.gastos_fijos.color}
          bgColor={Colors.segments.gastos_fijos.bg}
          icon={
            <MaterialCommunityIcons
              name="credit-card"
              size={14}
              color={Colors.segments.gastos_fijos.color}
            />
          }
          onPress={() => navigateToHistory("gastos")}
        />
        <KpiCard
          label="Ahorro"
          total={dashboardData.ahorro}
          vesAmount={dashboardData.ahorroVES}
          hardAmount={dashboardData.ahorroHard}
          color={Colors.segments.ahorro.color}
          bgColor={Colors.segments.ahorro.bg}
          icon={
            <MaterialCommunityIcons
              name="piggy-bank"
              size={14}
              color={Colors.segments.ahorro.color}
            />
          }
          onPress={() => navigateToHistory("ahorro")}
        />
        <KpiCard
          label="Gastos Var."
          total={dashboardData.gastosVariables}
          vesAmount={dashboardData.gastosVariablesVES}
          hardAmount={dashboardData.gastosVariablesHard}
          color={Colors.segments.gastos_variables.color}
          bgColor={Colors.segments.gastos_variables.bg}
          icon={
            <Ionicons
              name="trending-down"
              size={14}
              color={Colors.segments.gastos_variables.color}
            />
          }
          onPress={() => navigateToHistory("gastos")}
        />
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
    padding: 14,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    marginBottom: 16,
  },
  ratesRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 16,
  },
  rateItem: {
    alignItems: "flex-start" as const,
  },
  rateLabel: {
    fontFamily: "Outfit_700Bold",
    fontSize: 9,
    color: "rgba(167,243,208,0.5)",
    letterSpacing: 1,
    textTransform: "uppercase" as const,
  },
  rateValue: {
    fontFamily: "Outfit_700Bold",
    fontSize: 14,
    color: Colors.text.primary,
  },
  rateDivider: {
    width: 1,
    height: 24,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  balanceCard: {
    borderRadius: 32,
    paddingVertical: 28,
    paddingHorizontal: 24,
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
    fontSize: 42,
    color: Colors.text.primary,
    letterSpacing: -2,
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
  kpiGrid: {
    flexDirection: "row" as const,
    flexWrap: "wrap" as const,
    gap: 12,
  },
  kpiCard: {
    width: "47%" as any,
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  kpiIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    marginBottom: 10,
  },
  kpiLabel: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 11,
    color: Colors.text.muted,
    marginBottom: 4,
  },
  kpiValue: {
    fontFamily: "Outfit_800ExtraBold",
    fontSize: 18,
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  kpiBreakdown: {
    flexDirection: "row" as const,
    flexWrap: "wrap" as const,
    gap: 4,
  },
  kpiTag: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 3,
    backgroundColor: "rgba(255,255,255,0.05)",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },
  kpiTagPrefix: {
    fontFamily: "Outfit_700Bold",
    fontSize: 9,
    color: "rgba(148,163,184,0.8)",
  },
  kpiTagValue: {
    fontFamily: "Outfit_700Bold",
    fontSize: 9,
    color: Colors.text.secondary,
  },
});
