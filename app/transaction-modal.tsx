import React, { useState, useMemo, useCallback, useRef } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  TextInput,
  Platform,
  Alert,
  KeyboardAvoidingView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { useApp } from "@/lib/context/AppContext";
import {
  type Segment,
  type Currency,
  type RateType,
  type RecurrenceType,
  SEGMENT_CONFIG,
  RECURRENCE_OPTIONS,
} from "@/lib/domain/types";
import {
  convertToUSD,
  getFinalRate,
  generateRecurrences,
  getLocalDateString,
  formatCurrency,
} from "@/lib/domain/finance";

const CURRENCIES: { id: Currency; label: string; symbol: string; fullLabel: string }[] = [
  { id: "VES", label: "Bs", symbol: "Bs", fullLabel: "BOLIVARES (VES)" },
  { id: "USD", label: "USD", symbol: "$", fullLabel: "DOLARES (USD)" },
  { id: "EUR", label: "EUR", symbol: "EUR", fullLabel: "EUROS (EUR)" },
];

const MONTHS_ES = [
  "Ene", "Feb", "Mar", "Abr", "May", "Jun",
  "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
];

function formatDisplayDate(dateStr: string): string {
  try {
    const parts = dateStr.split("-");
    const day = parseInt(parts[2], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = parseInt(parts[0], 10);
    return `${day} ${MONTHS_ES[month]} ${year}`;
  } catch {
    return dateStr;
  }
}

export default function TransactionModal() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ editId?: string }>();
  const {
    transactions,
    rates,
    pnlStructure,
    addTx,
    addMultipleTx,
    updateTx,
    deleteTx,
  } = useApp();
  const amountInputRef = useRef<TextInput>(null);

  const editingTx = useMemo(
    () =>
      params.editId
        ? transactions.find((t) => t.id === params.editId) || null
        : null,
    [params.editId, transactions]
  );

  const [segment, setSegment] = useState<Segment>(
    editingTx?.segment || "ingresos"
  );
  const [amount, setAmount] = useState(editingTx?.amount.toString() || "");
  const [currency, setCurrency] = useState<Currency>(
    editingTx?.currency || "VES"
  );
  const [rateType, setRateType] = useState<RateType>(
    editingTx?.currency === "VES"
      ? editingTx?.originalRate === rates.bcv
        ? "bcv"
        : editingTx?.originalRate === rates.parallel
          ? "parallel"
          : "manual"
      : "bcv"
  );
  const [customRate, setCustomRate] = useState("");
  const [category, setCategory] = useState(editingTx?.category || "");
  const [description, setDescription] = useState(editingTx?.description || "");
  const [date, setDate] = useState(
    editingTx?.date
      ? getLocalDateString(new Date(editingTx.date))
      : getLocalDateString()
  );
  const [recurrence, setRecurrence] = useState<RecurrenceType>("none");
  const [showRecurrencePicker, setShowRecurrencePicker] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showDateEdit, setShowDateEdit] = useState(false);

  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const topPadding = insets.top + webTopInset + 16;

  const segmentType = SEGMENT_CONFIG[segment].type;
  const categories = pnlStructure[segment] || [];
  const currencyInfo = CURRENCIES.find((c) => c.id === currency) || CURRENCIES[0];

  const currentRate = useMemo(() => {
    return getFinalRate(
      currency,
      rates,
      rateType,
      customRate ? parseFloat(customRate) : undefined
    );
  }, [currency, rates, rateType, customRate]);

  const amountUSD = useMemo(() => {
    const amt = parseFloat(amount) || 0;
    return convertToUSD(
      amt,
      currency,
      rates,
      rateType,
      customRate ? parseFloat(customRate) : undefined
    );
  }, [amount, currency, rates, rateType, customRate]);

  const handleSave = useCallback(async () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0 || !category) {
      const msg = !category
        ? "Selecciona una categoria"
        : "Ingresa un monto valido";
      if (Platform.OS === "web") {
        alert(msg);
      } else {
        Alert.alert("Error", msg);
      }
      return;
    }

    const txData = {
      type: segmentType,
      segment,
      amount: amt,
      currency,
      originalRate: currentRate,
      amountUSD,
      category,
      description,
      date: new Date(date + "T12:00:00").toISOString(),
      profileId: "default",
    };

    if (editingTx) {
      await updateTx({ ...editingTx, ...txData });
    } else {
      if (recurrence !== "none") {
        const recDates = generateRecurrences(txData.date, recurrence);
        const allTxs = [txData, ...recDates.map((d) => ({ ...txData, date: d }))];
        await addMultipleTx(allTxs);
      } else {
        await addTx(txData);
      }
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
  }, [
    amount, category, segmentType, segment, currency,
    currentRate, amountUSD, description, date, recurrence,
    editingTx, addTx, addMultipleTx, updateTx, router,
  ]);

  const handleDelete = useCallback(async () => {
    if (!editingTx) return;
    const doDelete = async () => {
      await deleteTx(editingTx.id);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      router.back();
    };
    if (Platform.OS === "web") {
      if (confirm("Eliminar este movimiento?")) doDelete();
    } else {
      Alert.alert("Eliminar", "Eliminar este movimiento?", [
        { text: "Cancelar", style: "cancel" },
        { text: "Eliminar", style: "destructive", onPress: doDelete },
      ]);
    }
  }, [editingTx, deleteTx, router]);

  const recurrenceLabel = RECURRENCE_OPTIONS.find((r) => r.id === recurrence)?.label || "No repetir";

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={90}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={{
          paddingTop: topPadding,
          paddingBottom: insets.bottom + 100,
        }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={styles.title}>
            {editingTx ? "Editar Movimiento" : "Nuevo Movimiento"}
          </Text>
          <Pressable onPress={() => router.back()} style={styles.closeBtn}>
            <Ionicons name="close" size={22} color={Colors.text.secondary} />
          </Pressable>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.segmentScroll}
          contentContainerStyle={styles.segmentScrollContent}
        >
          {(Object.keys(SEGMENT_CONFIG) as Segment[]).map((seg) => {
            const config = SEGMENT_CONFIG[seg];
            const isActive = segment === seg;
            return (
              <Pressable
                key={seg}
                onPress={() => {
                  setSegment(seg);
                  setCategory("");
                  Haptics.selectionAsync();
                }}
                style={[
                  styles.segmentChip,
                  isActive && {
                    backgroundColor: config.color,
                    borderColor: config.color,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.segmentChipText,
                    isActive && { color: "#fff" },
                  ]}
                  numberOfLines={1}
                >
                  {config.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <Pressable
          style={styles.amountSection}
          onPress={() => amountInputRef.current?.focus()}
        >
          <TextInput
            ref={amountInputRef}
            style={[
              styles.amountDisplay,
              segment === "ingresos" && { color: Colors.brand.light },
              (segment === "gastos_fijos" || segment === "gastos_variables") && { color: "#fb7185" },
              segment === "ahorro" && { color: "#60a5fa" },
            ]}
            value={amount || "0.00"}
            onChangeText={(text) => {
              const cleaned = text.replace(/[^0-9.]/g, "");
              setAmount(cleaned === "0.00" ? "" : cleaned);
            }}
            onFocus={() => {
              if (amount === "" || amount === "0.00") setAmount("");
            }}
            keyboardType="numeric"
            placeholder="0.00"
            placeholderTextColor={Colors.text.disabled}
            selectionColor={Colors.brand.DEFAULT}
          />
          <Text style={styles.currencyFullLabel}>{currencyInfo.fullLabel}</Text>
        </Pressable>

        <View style={styles.currencyPillRow}>
          {CURRENCIES.map((c) => {
            const isActive = currency === c.id;
            return (
              <Pressable
                key={c.id}
                onPress={() => {
                  setCurrency(c.id);
                  Haptics.selectionAsync();
                }}
                style={[
                  styles.currencyPill,
                  isActive && styles.currencyPillActive,
                ]}
              >
                <Text
                  style={[
                    styles.currencyPillText,
                    isActive && styles.currencyPillTextActive,
                  ]}
                >
                  {c.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.inlineRow}>
          <View style={styles.inlineField}>
            <Text style={styles.inlineLabel}>FECHA</Text>
            {showDateEdit ? (
              <TextInput
                style={styles.dateEditInput}
                value={date}
                onChangeText={setDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={Colors.text.disabled}
                autoFocus
                onBlur={() => setShowDateEdit(false)}
              />
            ) : (
              <Pressable
                onPress={() => setShowDateEdit(true)}
                style={styles.inlineValueBox}
              >
                <Text style={styles.inlineValueText}>
                  {formatDisplayDate(date)}
                </Text>
              </Pressable>
            )}
          </View>
          <View style={styles.inlineField}>
            <Text style={styles.inlineLabel}>CATEGORIA</Text>
            <Pressable
              onPress={() => setShowCategoryPicker(!showCategoryPicker)}
              style={styles.inlineValueBox}
            >
              <Text
                style={[
                  styles.inlineValueText,
                  !category && { color: Colors.text.disabled },
                ]}
                numberOfLines={1}
              >
                {category || "Seleccionar"}
              </Text>
            </Pressable>
          </View>
        </View>

        {showCategoryPicker && (
          <View style={styles.categoryPicker}>
            {categories.length > 0 ? (
              <View style={styles.categoryGrid}>
                {categories.map((cat) => (
                  <Pressable
                    key={cat}
                    onPress={() => {
                      setCategory(cat);
                      setShowCategoryPicker(false);
                      Haptics.selectionAsync();
                    }}
                    style={[
                      styles.categoryOption,
                      category === cat && {
                        backgroundColor: SEGMENT_CONFIG[segment].color,
                        borderColor: SEGMENT_CONFIG[segment].color,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.categoryOptionText,
                        category === cat && { color: "#fff" },
                      ]}
                      numberOfLines={1}
                    >
                      {cat}
                    </Text>
                  </Pressable>
                ))}
              </View>
            ) : (
              <Text style={styles.noCategoriesText}>
                No hay categorias configuradas
              </Text>
            )}
          </View>
        )}

        {!editingTx && (
          <>
            <Text style={styles.fieldLabel}>REPETIR</Text>
            <Pressable
              onPress={() => setShowRecurrencePicker(!showRecurrencePicker)}
              style={styles.dropdownBtn}
            >
              <Text style={styles.dropdownBtnText}>{recurrenceLabel}</Text>
              <Ionicons
                name={showRecurrencePicker ? "chevron-up" : "chevron-down"}
                size={18}
                color={Colors.text.muted}
              />
            </Pressable>
            {showRecurrencePicker && (
              <View style={styles.recurrencePicker}>
                {RECURRENCE_OPTIONS.map((opt) => (
                  <Pressable
                    key={opt.id}
                    onPress={() => {
                      setRecurrence(opt.id);
                      setShowRecurrencePicker(false);
                      Haptics.selectionAsync();
                    }}
                    style={[
                      styles.recurrenceOption,
                      recurrence === opt.id && styles.recurrenceOptionActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.recurrenceOptionText,
                        recurrence === opt.id && styles.recurrenceOptionTextActive,
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}
          </>
        )}

        {(currency === "VES" || currency === "EUR") && (
          <View style={styles.rateButtonsRow}>
            <Pressable
              onPress={() => {
                setRateType("bcv");
                Haptics.selectionAsync();
              }}
              style={[
                styles.rateButton,
                rateType === "bcv" && styles.rateButtonActive,
              ]}
            >
              <Text
                style={[
                  styles.rateButtonLabel,
                  rateType === "bcv" && styles.rateButtonLabelActive,
                ]}
              >
                BCV
              </Text>
              <Text
                style={[
                  styles.rateButtonValue,
                  rateType === "bcv" && styles.rateButtonValueActive,
                ]}
              >
                {rates.bcv > 0 ? rates.bcv.toFixed(2) : "--"}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => {
                setRateType("parallel");
                Haptics.selectionAsync();
              }}
              style={[
                styles.rateButton,
                rateType === "parallel" && styles.rateButtonActive,
              ]}
            >
              <Text
                style={[
                  styles.rateButtonLabel,
                  rateType === "parallel" && styles.rateButtonLabelActive,
                ]}
              >
                USDC
              </Text>
              <Text
                style={[
                  styles.rateButtonValue,
                  rateType === "parallel" && styles.rateButtonValueActive,
                ]}
              >
                {rates.parallel > 0 ? rates.parallel.toFixed(2) : "--"}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => {
                setRateType("manual");
                Haptics.selectionAsync();
              }}
              style={[
                styles.rateButton,
                rateType === "manual" && styles.rateButtonActive,
              ]}
            >
              <Text
                style={[
                  styles.rateButtonLabel,
                  rateType === "manual" && styles.rateButtonLabelActive,
                ]}
              >
                Manual
              </Text>
            </Pressable>
          </View>
        )}

        {rateType === "manual" && (currency === "VES" || currency === "EUR") && (
          <TextInput
            style={styles.manualRateInput}
            value={customRate}
            onChangeText={setCustomRate}
            keyboardType="numeric"
            placeholder={currency === "EUR" ? "Tasa Bs/EUR" : "Tasa Bs/$"}
            placeholderTextColor={Colors.text.disabled}
          />
        )}

        <TextInput
          style={styles.noteInput}
          value={description}
          onChangeText={setDescription}
          placeholder="Nota opcional"
          placeholderTextColor={Colors.text.disabled}
        />

        <View style={styles.usdRefRow}>
          <Text style={styles.usdRefLabel}>Ref. USD Reporte:</Text>
          <Text style={styles.usdRefValue}>
            ${formatCurrency(amountUSD)}
          </Text>
        </View>

        <Pressable
          onPress={handleSave}
          style={({ pressed }) => [
            styles.saveButton,
            pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
          ]}
        >
          <Text style={styles.saveButtonText}>
            {editingTx ? "Guardar Cambios" : "Guardar"}
          </Text>
        </Pressable>

        {editingTx && (
          <Pressable
            onPress={handleDelete}
            style={({ pressed }) => [
              styles.deleteButton,
              pressed && { opacity: 0.8 },
            ]}
          >
            <Ionicons name="trash" size={18} color="#ef4444" />
            <Text style={styles.deleteButtonText}>Eliminar Movimiento</Text>
          </Pressable>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.base,
    paddingHorizontal: 24,
  },
  header: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    marginBottom: 20,
  },
  title: {
    fontFamily: "Outfit_900Black",
    fontSize: 22,
    color: Colors.text.primary,
    letterSpacing: -0.5,
  },
  closeBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.07)",
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  segmentScroll: {
    marginBottom: 24,
    flexGrow: 0,
  },
  segmentScrollContent: {
    gap: 8,
    paddingRight: 8,
  },
  segmentChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.dark.highlight,
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  segmentChipText: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 13,
    color: Colors.text.secondary,
  },
  amountSection: {
    alignItems: "center" as const,
    marginBottom: 16,
  },
  amountDisplay: {
    fontFamily: "Outfit_800ExtraBold",
    fontSize: 48,
    color: Colors.text.primary,
    textAlign: "center" as const,
    letterSpacing: -2,
    minWidth: 120,
  },
  currencyFullLabel: {
    fontFamily: "Outfit_700Bold",
    fontSize: 11,
    color: Colors.text.muted,
    letterSpacing: 1.5,
    marginTop: 4,
    textTransform: "uppercase" as const,
  },
  currencyPillRow: {
    flexDirection: "row" as const,
    justifyContent: "center" as const,
    gap: 0,
    marginBottom: 24,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 24,
    padding: 3,
    alignSelf: "center" as const,
  },
  currencyPill: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  currencyPillActive: {
    backgroundColor: Colors.dark.card,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 3,
  },
  currencyPillText: {
    fontFamily: "Outfit_700Bold",
    fontSize: 14,
    color: Colors.text.muted,
  },
  currencyPillTextActive: {
    color: Colors.text.primary,
  },
  inlineRow: {
    flexDirection: "row" as const,
    gap: 12,
    marginBottom: 16,
  },
  inlineField: {
    flex: 1,
  },
  inlineLabel: {
    fontFamily: "Outfit_700Bold",
    fontSize: 10,
    color: Colors.text.muted,
    letterSpacing: 1,
    marginBottom: 6,
  },
  inlineValueBox: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  inlineValueText: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 14,
    color: Colors.text.primary,
  },
  dateEditInput: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: Colors.brand.DEFAULT,
    fontFamily: "Outfit_600SemiBold",
    fontSize: 14,
    color: Colors.text.primary,
  },
  categoryPicker: {
    marginBottom: 16,
  },
  categoryGrid: {
    flexDirection: "row" as const,
    flexWrap: "wrap" as const,
    gap: 8,
  },
  categoryOption: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.dark.highlight,
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  categoryOptionText: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 13,
    color: Colors.text.secondary,
  },
  noCategoriesText: {
    fontFamily: "Outfit_500Medium",
    fontSize: 13,
    color: Colors.text.disabled,
    fontStyle: "italic" as const,
    paddingVertical: 8,
  },
  fieldLabel: {
    fontFamily: "Outfit_700Bold",
    fontSize: 10,
    color: Colors.text.muted,
    letterSpacing: 1,
    marginBottom: 6,
    marginTop: 4,
  },
  dropdownBtn: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    backgroundColor: Colors.dark.surface,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    marginBottom: 8,
  },
  dropdownBtnText: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 14,
    color: Colors.text.primary,
  },
  recurrencePicker: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    overflow: "hidden" as const,
    marginBottom: 16,
  },
  recurrenceOption: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.borderSubtle,
  },
  recurrenceOptionActive: {
    backgroundColor: "rgba(16,185,129,0.1)",
  },
  recurrenceOptionText: {
    fontFamily: "Outfit_500Medium",
    fontSize: 14,
    color: Colors.text.secondary,
  },
  recurrenceOptionTextActive: {
    color: Colors.brand.light,
    fontFamily: "Outfit_700Bold",
  },
  rateButtonsRow: {
    flexDirection: "row" as const,
    gap: 10,
    marginBottom: 16,
    marginTop: 4,
  },
  rateButton: {
    flex: 1,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.dark.highlight,
    backgroundColor: "rgba(255,255,255,0.03)",
    minHeight: 56,
  },
  rateButtonActive: {
    backgroundColor: Colors.brand.dark,
    borderColor: Colors.brand.DEFAULT,
  },
  rateButtonLabel: {
    fontFamily: "Outfit_700Bold",
    fontSize: 13,
    color: Colors.text.secondary,
  },
  rateButtonLabelActive: {
    color: Colors.brand.light,
  },
  rateButtonValue: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 12,
    color: Colors.text.muted,
    marginTop: 2,
  },
  rateButtonValueActive: {
    color: Colors.brand.light,
  },
  manualRateInput: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontFamily: "Outfit_600SemiBold",
    fontSize: 14,
    color: Colors.text.primary,
    borderWidth: 1,
    borderColor: Colors.brand.DEFAULT,
    marginBottom: 16,
  },
  noteInput: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontFamily: "Outfit_500Medium",
    fontSize: 14,
    color: Colors.text.primary,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    marginBottom: 20,
  },
  usdRefRow: {
    flexDirection: "row" as const,
    alignItems: "baseline" as const,
    justifyContent: "center" as const,
    gap: 8,
    marginBottom: 16,
  },
  usdRefLabel: {
    fontFamily: "Outfit_500Medium",
    fontSize: 13,
    color: Colors.text.muted,
  },
  usdRefValue: {
    fontFamily: "Outfit_800ExtraBold",
    fontSize: 22,
    color: Colors.brand.light,
    letterSpacing: -0.5,
  },
  saveButton: {
    backgroundColor: Colors.brand.dark,
    borderRadius: 18,
    paddingVertical: 18,
    alignItems: "center" as const,
    borderWidth: 1,
    borderColor: Colors.brand.DEFAULT,
  },
  saveButtonText: {
    fontFamily: "Outfit_700Bold",
    fontSize: 17,
    color: Colors.brand.light,
  },
  deleteButton: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: 8,
    paddingVertical: 14,
    marginTop: 12,
  },
  deleteButtonText: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 14,
    color: "#ef4444",
  },
});
