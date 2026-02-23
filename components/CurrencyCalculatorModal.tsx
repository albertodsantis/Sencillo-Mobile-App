import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  StyleSheet,
  Text,
  View,
  Modal,
  Pressable,
  TextInput,
  ScrollView,
  Platform,
  Animated,
  Dimensions,
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
  { key: "EUR", label: "Euro", symbol: "€" },
];

interface Props {
  visible: boolean;
  onClose: () => void;
  rates: Rates;
  ratesTimestamp: number | null;
}

export default function CurrencyCalculatorModal({ visible, onClose, rates, ratesTimestamp }: Props) {
  const insets = useSafeAreaInsets();
  const [amount, setAmount] = useState("");
  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyKey>("USD");
  const [ratesDate, setRatesDate] = useState("");

  const webTopInset = Platform.OS === "web" ? 67 : 0;

  useEffect(() => {
    if (!visible) return;

    if (!ratesTimestamp) {
      setRatesDate("");
      return;
    }

    const d = new Date(ratesTimestamp);
    const day = d.getDate().toString().padStart(2, "0");
    const month = d.toLocaleDateString("es-ES", { month: "short" }).replace(".", "");
    const hours = d.getHours().toString().padStart(2, "0");
    const mins = d.getMinutes().toString().padStart(2, "0");
    setRatesDate(`${day} ${month} ${hours}:${mins}`);
  }, [visible, ratesTimestamp]);

  const handleAmountChange = (text: string) => {
    const normalized = text.replace(/,/g, ".").replace(/[^0-9.]/g, "");
    const [intPart, ...rest] = normalized.split(".");
    const sanitized = rest.length > 0 ? `${intPart}.${rest.join("")}` : intPart;

    setAmount(sanitized);
  };

  const conversions = useMemo(() => {
    const parsedValue = Number.parseFloat(amount);
    const val = Number.isFinite(parsedValue) ? parsedValue : 0;
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

  const brechaValue = rates.bcv && rates.parallel
    ? ((rates.parallel - rates.bcv) / rates.bcv) * 100
    : 0;
  const safeBrechaValue = Number.isFinite(brechaValue) ? brechaValue : 0;

  const slideAnim = useRef(new Animated.Value(-Dimensions.get("window").height)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(overlayAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          damping: 22,
          stiffness: 220,
          mass: 0.9,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [overlayAnim, slideAnim, visible]);

  const animateClose = () => {
    Animated.parallel([
      Animated.timing(overlayAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: -Dimensions.get("window").height,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      handleClose();
      slideAnim.setValue(-Dimensions.get("window").height);
      overlayAnim.setValue(0);
    });
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={animateClose}>
      <Animated.View style={[styles.overlay, { paddingTop: insets.top + webTopInset + 8, opacity: overlayAnim }]}>
        <Animated.View style={[styles.sheet, { paddingBottom: insets.bottom + 16, transform: [{ translateY: slideAnim }] }]}>
          <View style={styles.handleBar} />

          <Pressable onPress={animateClose} hitSlop={12} style={styles.closeBtn}>
            <Ionicons name="close" size={24} color={Colors.text.secondary} />
          </Pressable>

          <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollContent}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionLabel}>TASAS DE CAMBIO</Text>
              {ratesDate ? <Text style={styles.sectionDate}>{ratesDate}</Text> : null}
            </View>

            <View style={styles.ratesGrid}>
              <View style={styles.rateCard}>
                <View style={styles.rateCardHead}>
                  <Text style={styles.rateCardTitle}>Dolar BCV</Text>
                  <Text style={styles.rateCardFlag}>USD</Text>
                </View>
                <Text style={styles.rateCardValue}>{rates.bcv.toFixed(2)}</Text>
                <Text style={styles.rateCardUnit}>Bs</Text>
              </View>

              <View style={styles.rateCard}>
                <View style={styles.rateCardHead}>
                  <Text style={styles.rateCardTitle}>Dolar Paralelo</Text>
                  <Text style={styles.rateCardFlag}>USDC</Text>
                </View>
                <Text style={styles.rateCardValue}>{rates.parallel.toFixed(2)}</Text>
                <Text style={styles.rateCardUnit}>Bs</Text>
              </View>

              <View style={styles.rateCard}>
                <View style={styles.rateCardHead}>
                  <Text style={styles.rateCardTitle}>Euro BCV</Text>
                  <Text style={styles.rateCardFlag}>EUR</Text>
                </View>
                <Text style={styles.rateCardValue}>{rates.eur.toFixed(2)}</Text>
                <Text style={styles.rateCardUnit}>Bs</Text>
              </View>

              <View style={styles.rateCard}>
                <View style={styles.rateCardHead}>
                  <Text style={styles.rateCardTitle}>Cruce EUR/USD</Text>
                  <Text style={styles.rateCardFlag}>FX</Text>
                </View>
                <Text style={styles.rateCardValue}>{rates.eurCross.toFixed(2)}</Text>
                <Text style={styles.rateCardUnit}>$/\u20AC</Text>
              </View>
            </View>

            <View style={styles.brechaRow}>
              <Text style={styles.brechaLabel}>
                Brecha cambiaria
              </Text>
              <Text style={styles.brechaValue}>
                {safeBrechaValue > 0 ? "+" : ""}{safeBrechaValue.toFixed(1)}%
              </Text>
            </View>

            <View style={styles.divider} />

            <Text style={[styles.sectionLabel, { marginTop: 16, marginBottom: 12 }]}>CALCULADORA</Text>

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
                onChangeText={handleAmountChange}
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
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const CARD_BG = "#0f1729";

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-start" as const,
  },
  sheet: {
    backgroundColor: Colors.dark.surface,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    maxHeight: "90%",
    borderWidth: 1,
    borderColor: Colors.dark.border,
    borderTopWidth: 0,
  },
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignSelf: "center" as const,
    marginTop: 10,
    marginBottom: 4,
  },
  closeBtn: {
    alignSelf: "flex-end" as const,
    paddingHorizontal: 24,
    paddingVertical: 8,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  sectionHeader: {
    flexDirection: "row" as const,
    alignItems: "baseline" as const,
    justifyContent: "space-between" as const,
    marginBottom: 12,
  },
  sectionLabel: {
    fontFamily: "Outfit_700Bold",
    fontSize: 10,
    color: Colors.text.muted,
    letterSpacing: 1.5,
  },
  sectionDate: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 10,
    color: Colors.text.disabled,
  },
  ratesGrid: {
    flexDirection: "row" as const,
    flexWrap: "wrap" as const,
    gap: 10,
  },
  rateCard: {
    width: "47%" as any,
    backgroundColor: CARD_BG,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  rateCardHead: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    marginBottom: 8,
  },
  rateCardTitle: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 11,
    color: Colors.text.muted,
  },
  rateCardFlag: {
    fontFamily: "Outfit_700Bold",
    fontSize: 9,
    color: Colors.text.disabled,
    backgroundColor: "rgba(255,255,255,0.06)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: "hidden" as const,
    letterSpacing: 0.5,
  },
  rateCardValue: {
    fontFamily: "Outfit_700Bold",
    fontSize: 22,
    color: Colors.text.primary,
    letterSpacing: -0.8,
  },
  rateCardUnit: {
    fontFamily: "Outfit_400Regular",
    fontSize: 11,
    color: Colors.text.disabled,
    marginTop: 2,
  },
  brechaRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    paddingHorizontal: 4,
    marginTop: 10,
  },
  brechaLabel: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 12,
    color: Colors.text.muted,
  },
  brechaValue: {
    fontFamily: "Outfit_700Bold",
    fontSize: 14,
    letterSpacing: -0.3,
    color: Colors.text.secondary,
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
