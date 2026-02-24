import React, { useMemo, useState, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  Pressable,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import dayjs from "dayjs";
import "dayjs/locale/es";
import Colors from "@/constants/colors";
import AmbientGlow from "@/components/AmbientGlow";
import { useApp } from "@/lib/context/AppContext";
import { formatCurrency, convertUSDToDisplayCurrency, getDisplayCurrencySymbol } from "@/lib/domain/finance";
import type { Transaction, DisplayCurrency, Rates } from "@/lib/domain/types";

const FILTERS = [
  { id: "all", label: "Todos" },
  { id: "ingresos", label: "Ingresos" },
  { id: "gastos", label: "Gastos" },
  { id: "ahorro", label: "Ahorro" },
];

function TransactionRow({
  item,
  rates,
  onPress,
  displayCurrency,
}: {
  item: Transaction;
  rates: Rates;
  onPress: () => void;
  displayCurrency: DisplayCurrency;
}) {
  const isVesSaving =
    item.segment === "ahorro" && item.currency === "VES";
  let devaluation = 0;
  if (isVesSaving && rates.bcv && item.originalRate) {
    devaluation = ((item.originalRate / rates.bcv) - 1) * 100;
  }
  const isIncome = item.type === "income";
  const dateLabel = dayjs(item.date).locale("es").format("ddd D MMM");
  const currencySymbol = getDisplayCurrencySymbol(displayCurrency);
  const displayAmount = convertUSDToDisplayCurrency(item.amountUSD || 0, displayCurrency, rates);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.txRow,
        pressed && { opacity: 0.8, transform: [{ scale: 0.98 }] },
        isVesSaving && devaluation < -0.1 && styles.txRowDanger,
      ]}
    >
      <View style={styles.txLeft}>
        <View
          style={[
            styles.txIcon,
            {
              backgroundColor: isIncome
                ? Colors.segments.ingresos.bg
                : Colors.segments.gastos_variables.bg,
            },
          ]}
        >
          <Feather
            name={isIncome ? "arrow-up-right" : "arrow-down-right"}
            size={16}
            color={
              isIncome
                ? Colors.segments.ingresos.color
                : Colors.segments.gastos_variables.color
            }
          />
        </View>
        <View style={styles.txInfo}>
          <Text style={styles.txCategory} numberOfLines={1}>
            {item.category}
          </Text>
          <View style={styles.txMetaRow}>
            <Text style={styles.txDate}>
              {dateLabel}{item.description ? ` · ${item.description}` : ""}
            </Text>
            {isVesSaving && devaluation < -0.1 && (
              <View style={styles.devalBadge}>
                <Ionicons
                  name="trending-down"
                  size={10}
                  color="#f87171"
                />
                <Text style={styles.devalText}>
                  {devaluation.toFixed(0)}% Val.
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>
      <View style={styles.txRight}>
        <Text
          style={[
            styles.txAmount,
            { color: isIncome ? Colors.brand.light : Colors.text.primary },
          ]}
        >
          {isIncome ? "+" : "-"}{currencySymbol}{formatCurrency(displayAmount)}
        </Text>
        <View style={styles.currencyBadge}>
          <Text style={styles.currencyText}>
            {item.currency === "USD"
              ? "USD"
              : item.currency === "EUR"
                ? `EUR ${item.amount}`
                : `Bs ${item.amount}`}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

export default function HistoryScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { transactions, rates, historyFilter, setHistoryFilter, displayCurrency } = useApp();
  const [currentDate, setCurrentDate] = useState(new Date());

  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const topPadding = insets.top + webTopInset + 16;

  const filteredTransactions = useMemo(() => {
    return transactions
      .filter((t) => {
        if (!t.date) return false;
        const d = dayjs(t.date);
        if (!d.isValid()) return false;
        if (
          d.month() !== currentDate.getMonth() ||
          d.year() !== currentDate.getFullYear()
        )
          return false;

        if (
          historyFilter === "ingresos" &&
          t.segment !== "ingresos"
        )
          return false;
        if (
          historyFilter === "ahorro" &&
          t.segment !== "ahorro"
        )
          return false;
        if (
          historyFilter === "gastos" &&
          t.segment !== "gastos_fijos" &&
          t.segment !== "gastos_variables"
        )
          return false;

        return true;
      })
      .sort(
        (a, b) =>
          new Date(b.date).getTime() - new Date(a.date).getTime()
      );
  }, [transactions, currentDate, historyFilter]);

  const prevMonth = useCallback(() => {
    const d = new Date(currentDate);
    d.setMonth(d.getMonth() - 1);
    setCurrentDate(d);
  }, [currentDate]);

  const nextMonth = useCallback(() => {
    const d = new Date(currentDate);
    d.setMonth(d.getMonth() + 1);
    setCurrentDate(d);
  }, [currentDate]);

  const monthLabel = currentDate.toLocaleDateString("es-ES", {
    month: "long",
    year: "numeric",
  });
  const capitalizedMonth =
    monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1).replace(" de ", " ");

  const handleEditTx = useCallback(
    (tx: Transaction) => {
      router.push({
        pathname: "/transaction-modal",
        params: { editId: tx.id },
      });
    },
    [router]
  );

  const renderItem = useCallback(
    ({ item }: { item: Transaction }) => (
      <TransactionRow
        item={item}
        rates={rates}
        onPress={() => handleEditTx(item)}
        displayCurrency={displayCurrency}
      />
    ),
    [rates, handleEditTx, displayCurrency]
  );

  return (
    <View style={[styles.container, { paddingTop: topPadding }]}>
      <AmbientGlow />
      <View style={styles.header}>
        <Text style={styles.title}>Movimientos</Text>
        <View style={styles.monthSelector}>
          <Pressable onPress={prevMonth} style={styles.monthBtn}>
            <Ionicons
              name="chevron-back"
              size={16}
              color={Colors.text.secondary}
            />
          </Pressable>
          <Text style={styles.monthText}>{capitalizedMonth}</Text>
          <Pressable onPress={nextMonth} style={styles.monthBtn}>
            <Ionicons
              name="chevron-forward"
              size={16}
              color={Colors.text.secondary}
            />
          </Pressable>
        </View>
      </View>

      <View style={styles.filterBar}>
        {FILTERS.map((f) => (
          <Pressable
            key={f.id}
            onPress={() => setHistoryFilter(f.id)}
            style={[
              styles.filterBtn,
              historyFilter === f.id && styles.filterBtnActive,
            ]}
          >
            <Text
              style={[
                styles.filterText,
                historyFilter === f.id && styles.filterTextActive,
              ]}
            >
              {f.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <FlatList
        data={filteredTransactions}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        scrollEnabled={filteredTransactions.length > 0}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons
              name="receipt-outline"
              size={40}
              color={Colors.text.disabled}
            />
            <Text style={styles.emptyText}>
              No hay movimientos con este filtro
            </Text>
          </View>
        }
      />
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
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    paddingHorizontal: 24,
    marginBottom: 12,
  },
  title: {
    fontFamily: "Outfit_900Black",
    fontSize: 24,
    color: Colors.text.primary,
    letterSpacing: -0.5,
  },
  monthSelector: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    backgroundColor: Colors.dark.card,
    borderRadius: 12,
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  monthBtn: {
    padding: 6,
    borderRadius: 8,
  },
  monthText: {
    fontFamily: "Outfit_700Bold",
    fontSize: 11,
    color: Colors.text.primary,
    textTransform: "uppercase" as const,
    minWidth: 90,
    textAlign: "center" as const,
  },
  filterBar: {
    flexDirection: "row" as const,
    marginHorizontal: 24,
    backgroundColor: "rgba(15, 23, 42, 0.55)",
    borderRadius: 14,
    padding: 4,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  filterBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: "center" as const,
  },
  filterBtnActive: {
    backgroundColor: "#fff",
  },
  filterText: {
    fontFamily: "Outfit_700Bold",
    fontSize: 11,
    color: Colors.text.muted,
  },
  filterTextActive: {
    color: "#000",
  },
  listContent: {
    paddingHorizontal: 24,
    paddingBottom: 120,
    gap: 10,
  },
  txRow: {
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 18,
    padding: 14,
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  txRowDanger: {
    borderColor: "rgba(239,68,68,0.4)",
  },
  txLeft: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 12,
    flex: 1,
  },
  txIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    borderWidth: 1,
    borderColor: Colors.dark.borderSubtle,
  },
  txInfo: {
    flex: 1,
  },
  txCategory: {
    fontFamily: "Outfit_700Bold",
    fontSize: 15,
    color: Colors.text.primary,
  },
  txMetaRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
    marginTop: 2,
  },
  txDate: {
    fontFamily: "Outfit_500Medium",
    fontSize: 12,
    color: Colors.text.muted,
  },
  devalBadge: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 3,
    backgroundColor: "rgba(239,68,68,0.15)",
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.2)",
  },
  devalText: {
    fontFamily: "Outfit_700Bold",
    fontSize: 9,
    color: "#f87171",
  },
  txRight: {
    alignItems: "flex-end" as const,
  },
  txAmount: {
    fontFamily: "Outfit_700Bold",
    fontSize: 16,
  },
  currencyBadge: {
    backgroundColor: "rgba(0,0,0,0.3)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
  },
  currencyText: {
    fontFamily: "Outfit_700Bold",
    fontSize: 10,
    color: Colors.text.muted,
  },
  emptyState: {
    alignItems: "center" as const,
    paddingVertical: 60,
    gap: 12,
  },
  emptyText: {
    fontFamily: "Outfit_500Medium",
    fontSize: 14,
    color: Colors.text.muted,
  },
});
