import React, { useState, useCallback, useMemo } from "react";
import {
  StyleSheet,
  Text,
  View,
  Modal,
  Pressable,
  TextInput,
  ScrollView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";

interface Rates {
  bcv: number;
  parallel: number;
  eur: number;
  eurCross: number;
}

type CurrencyKey = "USD" | "VES" | "EUR";

interface CurrencyOption {
  key: CurrencyKey;
  label: string;
  symbol: string;
}

const CURRENCIES: CurrencyOption[] = [
  { key: "USD", label: "Dolar", symbol: "$" },
  { key: "VES", label: "Bolivares", symbol: "Bs" },
  { key: "EUR", label: "Euro", symbol: "\u20AC" },
];

interface Props {
  visible: boolean;
  onClose: () => void;
  rates: Rates;
}

export default function CurrencyCalculatorModal({ visible, onClose, rates }: Props) {
  const insets = useSafeAreaInsets();
  const [amount, setAmount] = useState("");
  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyKey>("USD");

  const webTopInset = Platform.OS === "web" ? 67 : 0;

  const conversions = useMemo(() => {
    const val = parseFloat(amount.replace(",", ".")) || 0;

    const results: { key: string; label: string; symbol: string; value: number }[] = [];

    if (selectedCurrency === "USD") {
      results.push({ key: "VES_BCV", label: "Bs (BCV)", symbol: "Bs", value: val * rates.bcv });
      results.push({ key: "VES_PAR", label: "Bs (Paralelo)", symbol: "Bs", value: val * rates.parallel });
      results.push({ key: "EUR", label: "Euro", symbol: "\u20AC", value: rates.eurCross > 0 ? val / rates.eurCross : 0 });
    } else if (selectedCurrency === "VES") {
      results.push({ key: "USD_BCV", label: "USD (BCV)", symbol: "$", value: rates.bcv > 0 ? val / rates.bcv : 0 });
      results.push({ key: "USD_PAR", label: "USD (Paralelo)", symbol: "$", value: rates.parallel > 0 ? val / rates.parallel : 0 });
      results.push({ key: "EUR", label: "Euro", symbol: "\u20AC", value: rates.eur > 0 ? val / rates.eur : 0 });
    } else {
      results.push({ key: "USD", label: "Dolar", symbol: "$", value: val * (rates.eurCross || 0) });
      results.push({ key: "VES_BCV", label: "Bs (BCV)", symbol: "Bs", value: val * rates.eur });
      results.push({ key: "VES_PAR", label: "Bs (Paralelo)", symbol: "Bs", value: val * (rates.eurCross || 0) * rates.parallel });
    }

    return results;
  }, [amount, selectedCurrency, rates]);

  const formatResult = (val: number): string => {
    if (val === 0) return "0.00";
    if (val >= 1000) return val.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return val.toFixed(2);
  };

  const handleClose = () => {
    setAmount("");
    setSelectedCurrency("USD");
    onClose();
  };

  const rateItems = [
    { label: "BCV", sub: "Tasa oficial", value: rates.bcv, unit: "Bs/$" },
    { label: "Paralelo", sub: "USDC / P2P", value: rates.parallel, unit: "Bs/$" },
    { label: "BCV EUR", sub: "Euro oficial", value: rates.eur, unit: "Bs/\u20AC" },
    { label: "EUR/USD", sub: "Cruce", value: rates.eurCross, unit: "$/\u20AC" },
    {
      label: "Brecha",
      sub: "Par. vs BCV",
      value: rates.bcv && rates.parallel ? ((rates.parallel - rates.bcv) / rates.bcv) * 100 : 0,
      unit: "%",
    },
  ];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={[styles.overlay, { paddingTop: insets.top + webTopInset }]}>
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
          <View style={styles.handleBar} />

          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Tasas y Convertidor</Text>
            <Pressable onPress={handleClose} hitSlop={12}>
              <Ionicons name="close" size={24} color={Colors.text.secondary} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollContent}>
            <Text style={styles.sectionLabel}>TASAS DE CAMBIO</Text>
            <View style={styles.ratesGrid}>
              {rateItems.map((r) => (
                <View key={r.label} style={styles.rateItem}>
                  <Text style={styles.rateValue}>
                    {r.unit === "%" ? `${r.value.toFixed(1)}%` : r.value.toFixed(2)}
                  </Text>
                  <Text style={styles.rateLabel}>{r.label}</Text>
                  <Text style={styles.rateSub}>{r.unit !== "%" ? r.unit : r.sub}</Text>
                </View>
              ))}
            </View>

            <View style={styles.divider} />

            <Text style={styles.sectionLabel}>CALCULADORA</Text>

            <View style={styles.currencyPicker}>
              {CURRENCIES.map((c) => (
                <Pressable
                  key={c.key}
                  onPress={() => setSelectedCurrency(c.key)}
                  style={[
                    styles.currencyChip,
                    selectedCurrency === c.key && styles.currencyChipActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.currencyChipText,
                      selectedCurrency === c.key && styles.currencyChipTextActive,
                    ]}
                  >
                    {c.symbol} {c.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputSymbol}>
                {CURRENCIES.find((c) => c.key === selectedCurrency)?.symbol}
              </Text>
              <TextInput
                style={styles.amountInput}
                value={amount}
                onChangeText={setAmount}
                placeholder="0.00"
                placeholderTextColor={Colors.text.disabled}
                keyboardType="decimal-pad"
                returnKeyType="done"
              />
            </View>

            <View style={styles.resultsContainer}>
              {conversions.map((c) => (
                <View key={c.key} style={styles.resultRow}>
                  <Text style={styles.resultLabel}>{c.label}</Text>
                  <View style={styles.resultRight}>
                    <Text style={styles.resultSymbol}>{c.symbol} </Text>
                    <Text style={styles.resultValue}>{formatResult(c.value)}</Text>
                  </View>
                </View>
              ))}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end" as const,
  },
  sheet: {
    backgroundColor: Colors.dark.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: "88%",
    borderWidth: 1,
    borderColor: Colors.dark.border,
    borderBottomWidth: 0,
  },
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignSelf: "center" as const,
    marginTop: 10,
    marginBottom: 6,
  },
  sheetHeader: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.borderSubtle,
  },
  sheetTitle: {
    fontFamily: "Outfit_700Bold",
    fontSize: 18,
    color: Colors.text.primary,
  },
  scrollContent: {
    paddingHorizontal: 24,
  },
  sectionLabel: {
    fontFamily: "Outfit_700Bold",
    fontSize: 10,
    color: Colors.text.muted,
    letterSpacing: 1.5,
    marginBottom: 12,
    marginTop: 20,
  },
  ratesGrid: {
    flexDirection: "row" as const,
    flexWrap: "wrap" as const,
    gap: 0,
  },
  rateItem: {
    width: "50%" as any,
    paddingVertical: 10,
    paddingRight: 8,
  },
  rateValue: {
    fontFamily: "Outfit_800ExtraBold",
    fontSize: 20,
    color: Colors.text.primary,
    letterSpacing: -0.5,
  },
  rateLabel: {
    fontFamily: "Outfit_700Bold",
    fontSize: 12,
    color: Colors.text.secondary,
    marginTop: 2,
  },
  rateSub: {
    fontFamily: "Outfit_400Regular",
    fontSize: 10,
    color: Colors.text.muted,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.dark.borderSubtle,
    marginTop: 16,
  },
  currencyPicker: {
    flexDirection: "row" as const,
    gap: 8,
    marginBottom: 14,
  },
  currencyChip: {
    flex: 1,
    alignItems: "center" as const,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  currencyChipActive: {
    backgroundColor: Colors.brand.DEFAULT + "18",
    borderColor: Colors.brand.DEFAULT + "50",
  },
  currencyChipText: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 13,
    color: Colors.text.secondary,
  },
  currencyChipTextActive: {
    color: Colors.brand.DEFAULT,
  },
  inputContainer: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    paddingHorizontal: 18,
    paddingVertical: 4,
    gap: 6,
    marginBottom: 14,
  },
  inputSymbol: {
    fontFamily: "Outfit_700Bold",
    fontSize: 22,
    color: Colors.brand.DEFAULT,
  },
  amountInput: {
    flex: 1,
    fontFamily: "Outfit_700Bold",
    fontSize: 28,
    color: Colors.text.primary,
    paddingVertical: 10,
  },
  resultsContainer: {
    gap: 4,
    paddingBottom: 24,
  },
  resultRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.borderSubtle,
  },
  resultLabel: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 14,
    color: Colors.text.secondary,
  },
  resultRight: {
    flexDirection: "row" as const,
    alignItems: "baseline" as const,
  },
  resultSymbol: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 14,
    color: Colors.text.muted,
  },
  resultValue: {
    fontFamily: "Outfit_800ExtraBold",
    fontSize: 20,
    color: Colors.text.primary,
  },
});
