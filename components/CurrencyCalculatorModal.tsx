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
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";

interface Rates {
  bcv: number;
  parallel: number;
  eur: number;
  eurCross: number;
}

type CurrencyKey = "USD" | "BS_BCV" | "BS_PARALLEL" | "EUR";

interface CurrencyOption {
  key: CurrencyKey;
  label: string;
  symbol: string;
  flag: string;
}

const CURRENCIES: CurrencyOption[] = [
  { key: "USD", label: "Dolar", symbol: "$", flag: "USD" },
  { key: "BS_BCV", label: "Bolivares (BCV)", symbol: "Bs", flag: "BCV" },
  { key: "BS_PARALLEL", label: "Bolivares (Paralelo)", symbol: "Bs", flag: "PAR" },
  { key: "EUR", label: "Euro", symbol: "\u20AC", flag: "EUR" },
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

  const convertToUSD = useCallback(
    (val: number, from: CurrencyKey): number => {
      if (from === "USD") return val;
      if (from === "BS_BCV" && rates.bcv > 0) return val / rates.bcv;
      if (from === "BS_PARALLEL" && rates.parallel > 0) return val / rates.parallel;
      if (from === "EUR" && rates.eurCross > 0) return val * rates.eurCross;
      return 0;
    },
    [rates]
  );

  const convertFromUSD = useCallback(
    (usd: number, to: CurrencyKey): number => {
      if (to === "USD") return usd;
      if (to === "BS_BCV") return usd * rates.bcv;
      if (to === "BS_PARALLEL") return usd * rates.parallel;
      if (to === "EUR" && rates.eurCross > 0) return usd / rates.eurCross;
      return 0;
    },
    [rates]
  );

  const conversions = useMemo(() => {
    const val = parseFloat(amount.replace(",", ".")) || 0;
    if (val === 0) return CURRENCIES.filter((c) => c.key !== selectedCurrency).map((c) => ({ ...c, value: 0 }));
    const usd = convertToUSD(val, selectedCurrency);
    return CURRENCIES.filter((c) => c.key !== selectedCurrency).map((c) => ({
      ...c,
      value: convertFromUSD(usd, c.key),
    }));
  }, [amount, selectedCurrency, convertToUSD, convertFromUSD]);

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

  const rateRows = [
    { label: "BCV", sublabel: "Tasa oficial", value: rates.bcv, unit: "Bs/$" },
    { label: "Paralelo", sublabel: "USDC / P2P", value: rates.parallel, unit: "Bs/$" },
    { label: "BCV EUR", sublabel: "Euro oficial", value: rates.eur, unit: "Bs/\u20AC" },
    { label: "EUR/USD", sublabel: "Cruce", value: rates.eurCross, unit: "$/\u20AC" },
    {
      label: "Brecha",
      sublabel: "Paralelo vs BCV",
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
            <View style={styles.ratesSection}>
              <Text style={styles.sectionLabel}>TASAS DE CAMBIO</Text>
              <View style={styles.ratesGrid}>
                {rateRows.map((r) => (
                  <View key={r.label} style={styles.rateCard}>
                    <View>
                      <Text style={styles.rateCardLabel}>{r.label}</Text>
                      <Text style={styles.rateCardSub}>{r.sublabel}</Text>
                    </View>
                    <View style={styles.rateCardRight}>
                      <Text style={styles.rateCardValue}>
                        {r.unit === "%" ? `${r.value.toFixed(1)}` : r.value.toFixed(2)}
                      </Text>
                      <Text style={styles.rateCardUnit}>{r.unit}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>

            <View style={styles.calcSection}>
              <Text style={styles.sectionLabel}>CALCULADORA</Text>

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

              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.currencyPicker}>
                {CURRENCIES.map((c) => (
                  <Pressable
                    key={c.key}
                    onPress={() => setSelectedCurrency(c.key)}
                    style={[
                      styles.currencyChip,
                      selectedCurrency === c.key && styles.currencyChipActive,
                    ]}
                  >
                    <Text style={styles.currencyChipFlag}>{c.flag}</Text>
                    <Text
                      style={[
                        styles.currencyChipText,
                        selectedCurrency === c.key && styles.currencyChipTextActive,
                      ]}
                    >
                      {c.label}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>

              <View style={styles.resultsContainer}>
                {conversions.map((c) => (
                  <View key={c.key} style={styles.resultRow}>
                    <View style={styles.resultLeft}>
                      <View style={styles.resultBadge}>
                        <Text style={styles.resultBadgeText}>{c.flag}</Text>
                      </View>
                      <Text style={styles.resultLabel}>{c.label}</Text>
                    </View>
                    <View style={styles.resultRight}>
                      <Text style={styles.resultSymbol}>{c.symbol}</Text>
                      <Text style={styles.resultValue}>{formatResult(c.value)}</Text>
                    </View>
                  </View>
                ))}
              </View>
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
    maxHeight: "92%",
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
  ratesSection: {},
  ratesGrid: {
    gap: 8,
  },
  rateCard: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  rateCardLabel: {
    fontFamily: "Outfit_700Bold",
    fontSize: 14,
    color: Colors.text.primary,
  },
  rateCardSub: {
    fontFamily: "Outfit_400Regular",
    fontSize: 11,
    color: Colors.text.muted,
    marginTop: 1,
  },
  rateCardRight: {
    flexDirection: "row" as const,
    alignItems: "baseline" as const,
    gap: 4,
  },
  rateCardValue: {
    fontFamily: "Outfit_800ExtraBold",
    fontSize: 20,
    color: Colors.text.primary,
  },
  rateCardUnit: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 11,
    color: Colors.text.muted,
  },
  calcSection: {
    paddingBottom: 24,
  },
  inputContainer: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    paddingHorizontal: 18,
    paddingVertical: 6,
    gap: 6,
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
    paddingVertical: 12,
  },
  currencyPicker: {
    marginTop: 12,
    marginBottom: 16,
  },
  currencyChip: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: Colors.dark.border,
    marginRight: 8,
  },
  currencyChipActive: {
    backgroundColor: Colors.brand.DEFAULT + "18",
    borderColor: Colors.brand.DEFAULT + "50",
  },
  currencyChipFlag: {
    fontFamily: "Outfit_700Bold",
    fontSize: 10,
    color: Colors.text.muted,
    letterSpacing: 0.5,
  },
  currencyChipText: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 13,
    color: Colors.text.secondary,
  },
  currencyChipTextActive: {
    color: Colors.brand.DEFAULT,
  },
  resultsContainer: {
    gap: 6,
  },
  resultRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  resultLeft: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 10,
  },
  resultBadge: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  resultBadgeText: {
    fontFamily: "Outfit_700Bold",
    fontSize: 10,
    color: Colors.text.muted,
    letterSpacing: 0.5,
  },
  resultLabel: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 14,
    color: Colors.text.secondary,
  },
  resultRight: {
    flexDirection: "row" as const,
    alignItems: "baseline" as const,
    gap: 3,
  },
  resultSymbol: {
    fontFamily: "Outfit_700Bold",
    fontSize: 14,
    color: Colors.text.muted,
  },
  resultValue: {
    fontFamily: "Outfit_800ExtraBold",
    fontSize: 20,
    color: Colors.text.primary,
  },
});
