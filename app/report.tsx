import React, { useState, useMemo } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { useApp } from "@/lib/context/AppContext";
import {
  type Segment,
  type Granularity,
  SEGMENT_CONFIG,
} from "@/lib/domain/types";
import {
  computePnLReport,
  getLocalDateString,
  convertUSDToDisplayCurrency,
  getDisplayCurrencySymbol,
} from "@/lib/domain/finance";

const GRANULARITIES: { id: Granularity; label: string }[] = [
  { id: "daily", label: "Diario" },
  { id: "weekly", label: "Semanal" },
  { id: "monthly", label: "Mensual" },
  { id: "yearly", label: "Anual" },
];

export default function ReportScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { transactions, rates, displayCurrency } = useApp();

  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const topPadding = insets.top + webTopInset + 16;

  const [granularity, setGranularity] = useState<Granularity>("monthly");

  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const endOfYear = new Date(now.getFullYear(), 11, 31);

  const [startDate] = useState(getLocalDateString(startOfYear));
  const [endDate] = useState(getLocalDateString(endOfYear));

  const periods = useMemo(() => {
    const start = new Date(startDate + "T12:00:00");
    const end = new Date(endDate + "T12:00:00");
    const arr: { id: string; label: string }[] = [];
    let current = new Date(start);
    let count = 0;

    while (current <= end && count < 1000) {
      if (granularity === "daily") {
        arr.push({
          id: current.toISOString().split("T")[0],
          label: current.toLocaleDateString("es-ES", {
            day: "2-digit",
            month: "short",
          }),
        });
        current.setDate(current.getDate() + 1);
      } else if (granularity === "weekly") {
        arr.push({
          id: current.toISOString().split("T")[0],
          label: `${current.getDate()}/${current.getMonth() + 1}`,
        });
        current.setDate(current.getDate() + 7);
      } else if (granularity === "monthly") {
        arr.push({
          id: `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, "0")}`,
          label: current.toLocaleDateString("es-ES", {
            month: "short",
            year: "2-digit",
          }),
        });
        current.setDate(1);
        current.setMonth(current.getMonth() + 1);
      } else if (granularity === "yearly") {
        arr.push({
          id: `${current.getFullYear()}`,
          label: `${current.getFullYear()}`,
        });
        current.setFullYear(current.getFullYear() + 1);
      }
      count++;
    }
    return arr;
  }, [startDate, endDate, granularity]);

  const reportData = useMemo(
    () =>
      computePnLReport(
        transactions,
        periods,
        granularity,
        startDate,
        endDate,
        rates
      ),
    [transactions, periods, granularity, startDate, endDate, rates]
  );

  const currencySymbol = getDisplayCurrencySymbol(displayCurrency);
  const toDisplayRounded = (value: number) =>
    Math.round(convertUSDToDisplayCurrency(value, displayCurrency, rates)).toLocaleString();

  const segmentOrder: Segment[] = [
    "ingresos",
    "ahorro",
    "gastos_fijos",
    "gastos_variables",
  ];

  return (
    <View style={[styles.container, { paddingTop: topPadding }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons
            name="arrow-back"
            size={22}
            color={Colors.text.secondary}
          />
        </Pressable>
        <Text style={styles.title}>Reporte P&L</Text>
        <Text style={styles.currencyBadge}>{displayCurrency}</Text>
      </View>

      <View style={styles.granularityRow}>
        {GRANULARITIES.map((g) => (
          <Pressable
            key={g.id}
            onPress={() => setGranularity(g.id)}
            style={[
              styles.granularityBtn,
              granularity === g.id && styles.granularityBtnActive,
            ]}
          >
            <Text
              style={[
                styles.granularityText,
                granularity === g.id && styles.granularityTextActive,
              ]}
            >
              {g.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 120 }}
        >
          <View style={styles.table}>
            <View style={styles.tableHeaderRow}>
              <View style={styles.stickyCol}>
                <Text style={styles.tableHeaderText}></Text>
              </View>
              {periods.map((p) => (
                <View key={p.id} style={styles.periodCol}>
                  <Text style={styles.tableHeaderText}>{p.label}</Text>
                </View>
              ))}
            </View>

            {segmentOrder.map((seg) => {
              const config = SEGMENT_CONFIG[seg];
              const concepts = reportData[seg]?.concepts || {};
              const totals = reportData[seg]?.total || {};

              return (
                <View key={seg}>
                  <View style={styles.segmentHeaderRow}>
                    <View style={styles.stickyCol}>
                      <Text
                        style={[
                          styles.segmentHeaderText,
                          { color: config.color },
                        ]}
                      >
                        {config.label.toUpperCase()}
                      </Text>
                    </View>
                    {periods.map((p) => (
                      <View key={p.id} style={styles.periodCol} />
                    ))}
                  </View>

                  {Object.entries(concepts).map(
                    ([concept, values]: [string, any]) => (
                      <View key={concept} style={styles.conceptRow}>
                        <View style={styles.stickyCol}>
                          <Text
                            style={styles.conceptText}
                            numberOfLines={1}
                          >
                            {concept}
                          </Text>
                        </View>
                        {periods.map((p) => (
                          <View key={p.id} style={styles.periodCol}>
                            <Text style={styles.cellText}>
                              {values[p.id] === 0
                                ? "-"
                                : `${currencySymbol}${toDisplayRounded(values[p.id])}`}
                            </Text>
                          </View>
                        ))}
                      </View>
                    )
                  )}

                  <View style={styles.totalRow}>
                    <View style={styles.stickyCol}>
                      <Text style={styles.totalText}>
                        Total {config.label}
                      </Text>
                    </View>
                    {periods.map((p) => (
                      <View key={p.id} style={styles.periodCol}>
                        <Text style={styles.totalCellText}>
                          {`${currencySymbol}${toDisplayRounded(totals[p.id] || 0)}`}
                        </Text>
                      </View>
                    ))}
                  </View>

                  {seg === "ahorro" && (
                    <View style={styles.availableRow}>
                      <View style={styles.stickyCol}>
                        <Text style={styles.availableText}>
                          DISPONIBLE
                        </Text>
                      </View>
                      {periods.map((p) => (
                        <View key={p.id} style={styles.periodCol}>
                          <Text style={styles.availableCellText}>
                            {`${currencySymbol}${toDisplayRounded(reportData.available?.[p.id] || 0)}`}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {seg === "gastos_fijos" && (
                    <View style={styles.flexRow}>
                      <View style={styles.stickyCol}>
                        <Text style={styles.flexText}>
                          FLEX. DISPONIBLE
                        </Text>
                      </View>
                      {periods.map((p) => (
                        <View key={p.id} style={styles.periodCol}>
                          <Text style={styles.flexCellText}>
                            {`${currencySymbol}${toDisplayRounded(reportData.flexibleAvailable?.[p.id] || 0)}`}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              );
            })}

            <View style={styles.netRow}>
              <View style={styles.stickyCol}>
                <Text style={styles.netText}>NETO</Text>
              </View>
              {periods.map((p) => {
                const val = reportData.net?.[p.id] || 0;
                return (
                  <View key={p.id} style={styles.periodCol}>
                    <Text
                      style={[
                        styles.netCellText,
                        { color: val >= 0 ? Colors.brand.light : "#ef4444" },
                      ]}
                    >
                      {`${currencySymbol}${toDisplayRounded(val)}`}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        </ScrollView>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.base,
  },
  header: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.05)",
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  title: {
    fontFamily: "Outfit_900Black",
    fontSize: 20,
    color: Colors.text.primary,
    letterSpacing: -0.5,
  },
  currencyBadge: {
    minWidth: 40,
    textAlign: "center" as const,
    fontFamily: "Outfit_700Bold",
    fontSize: 11,
    color: Colors.text.muted,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    backgroundColor: Colors.dark.surface,
  },
  granularityRow: {
    flexDirection: "row" as const,
    marginHorizontal: 24,
    backgroundColor: Colors.dark.surface,
    borderRadius: 14,
    padding: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  granularityBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: "center" as const,
  },
  granularityBtnActive: {
    backgroundColor: "#fff",
  },
  granularityText: {
    fontFamily: "Outfit_700Bold",
    fontSize: 11,
    color: Colors.text.muted,
  },
  granularityTextActive: {
    color: "#000",
  },
  table: {
    paddingHorizontal: 8,
  },
  tableHeaderRow: {
    flexDirection: "row" as const,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
  },
  stickyCol: {
    width: 130,
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  periodCol: {
    width: 80,
    paddingVertical: 10,
    alignItems: "flex-end" as const,
    paddingHorizontal: 8,
  },
  tableHeaderText: {
    fontFamily: "Outfit_700Bold",
    fontSize: 10,
    color: Colors.text.muted,
    textTransform: "uppercase" as const,
  },
  segmentHeaderRow: {
    flexDirection: "row" as const,
    backgroundColor: "rgba(255,255,255,0.02)",
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.borderSubtle,
  },
  segmentHeaderText: {
    fontFamily: "Outfit_800ExtraBold",
    fontSize: 10,
    letterSpacing: 1,
  },
  conceptRow: {
    flexDirection: "row" as const,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.borderSubtle,
  },
  conceptText: {
    fontFamily: "Outfit_400Regular",
    fontSize: 11,
    color: Colors.text.muted,
  },
  cellText: {
    fontFamily: "Outfit_400Regular",
    fontSize: 11,
    color: Colors.text.secondary,
  },
  totalRow: {
    flexDirection: "row" as const,
    backgroundColor: "rgba(255,255,255,0.03)",
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
  },
  totalText: {
    fontFamily: "Outfit_700Bold",
    fontSize: 11,
    color: Colors.text.primary,
  },
  totalCellText: {
    fontFamily: "Outfit_700Bold",
    fontSize: 11,
    color: Colors.text.primary,
  },
  availableRow: {
    flexDirection: "row" as const,
    backgroundColor: "rgba(96,165,250,0.05)",
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
  },
  availableText: {
    fontFamily: "Outfit_800ExtraBold",
    fontSize: 10,
    color: "#60a5fa",
    letterSpacing: 0.5,
  },
  availableCellText: {
    fontFamily: "Outfit_700Bold",
    fontSize: 11,
    color: "#60a5fa",
  },
  flexRow: {
    flexDirection: "row" as const,
    backgroundColor: "rgba(52,211,153,0.05)",
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
  },
  flexText: {
    fontFamily: "Outfit_800ExtraBold",
    fontSize: 10,
    color: Colors.brand.light,
    letterSpacing: 0.5,
  },
  flexCellText: {
    fontFamily: "Outfit_700Bold",
    fontSize: 11,
    color: Colors.brand.light,
  },
  netRow: {
    flexDirection: "row" as const,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderTopWidth: 2,
    borderTopColor: Colors.dark.highlight,
    marginTop: 4,
  },
  netText: {
    fontFamily: "Outfit_900Black",
    fontSize: 11,
    color: Colors.text.primary,
    letterSpacing: 1,
  },
  netCellText: {
    fontFamily: "Outfit_800ExtraBold",
    fontSize: 12,
  },
});
