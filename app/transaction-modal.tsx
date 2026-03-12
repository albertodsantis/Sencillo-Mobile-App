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
  Keyboard,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import BottomSheetPicker from "@/components/BottomSheetPicker";
import DatePickerSheet from "@/components/DatePickerSheet";
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
  getLocalDateString,
  formatCurrency,
  convertUSDToDisplayCurrency,
  getDisplayCurrencySymbol,
} from "@/lib/domain/finance";
import {
  convertUsingOriginalRate,
  resolveInitialCustomRate,
  resolveInitialRateType,
  shouldPreserveHistoricalRate,
} from "@/lib/domain/transactionEditing";
import {
  buildTransactionDraft,
  expandTransactionDrafts,
} from "@/lib/domain/transactionDrafts";

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
    displayCurrency,
  } = useApp();

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
  const amountInputRef = useRef<TextInput>(null);

  const [currency, setCurrency] = useState<Currency>(
    editingTx?.currency || "VES"
  );
  const initialRateType = useMemo(
    () => resolveInitialRateType(editingTx, rates),
    [editingTx, rates]
  );
  const initialCustomRate = useMemo(
    () => resolveInitialCustomRate(editingTx, initialRateType),
    [editingTx, initialRateType]
  );
  const [rateType, setRateType] = useState<RateType>(
    initialRateType
  );
  const [customRate, setCustomRate] = useState(initialCustomRate);
  const [category, setCategory] = useState(editingTx?.category || "");
  const [description, setDescription] = useState(editingTx?.description || "");
  const [date, setDate] = useState(
    editingTx?.date
      ? getLocalDateString(new Date(editingTx.date))
      : getLocalDateString()
  );
  const [recurrence, setRecurrence] = useState<RecurrenceType>("none");
  const [registerAsSavings, setRegisterAsSavings] = useState(false);
  const [showCategorySheet, setShowCategorySheet] = useState(false);
  const [showRecurrenceSheet, setShowRecurrenceSheet] = useState(false);
  const [showDateSheet, setShowDateSheet] = useState(false);

  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const topPadding = insets.top + webTopInset + 16;

  const segmentType = SEGMENT_CONFIG[segment].type;
  const segColor = SEGMENT_CONFIG[segment].color;
  const categories = pnlStructure[segment] || [];
  const currencyInfo = CURRENCIES.find((c) => c.id === currency) || CURRENCIES[0];
  const parsedAmount = parseFloat(amount) || 0;

  const currentRate = useMemo(() => {
    return getFinalRate(
      currency,
      rates,
      rateType,
      customRate ? parseFloat(customRate) : undefined
    );
  }, [currency, rates, rateType, customRate]);

  const preservesHistoricalRate = useMemo(() => {
    return shouldPreserveHistoricalRate({
      amount: parsedAmount,
      currency,
      customRate,
      editingTx,
      rateType,
      rates,
    });
  }, [currency, customRate, editingTx, parsedAmount, rateType, rates]);

  const resolvedOriginalRate = useMemo(() => {
    if (!editingTx || currency !== editingTx.currency) return currentRate;
    if (currency === "USD") return 1;
    if (preservesHistoricalRate) return editingTx.originalRate;
    return currentRate;
  }, [currency, currentRate, editingTx, preservesHistoricalRate]);

  const amountUSD = useMemo(() => {
    if (editingTx && currency === editingTx.currency && preservesHistoricalRate) {
      return convertUsingOriginalRate(parsedAmount, currency, editingTx.originalRate);
    }

    return convertToUSD(
      parsedAmount,
      currency,
      rates,
      rateType,
      customRate ? parseFloat(customRate) : undefined
    );
  }, [currency, customRate, editingTx, parsedAmount, preservesHistoricalRate, rateType, rates]);

  const displayAmount = useMemo(
    () => convertUSDToDisplayCurrency(amountUSD, displayCurrency, rates),
    [amountUSD, displayCurrency, rates]
  );
  const displaySymbol = getDisplayCurrencySymbol(displayCurrency);

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

    const txDate = new Date(date + "T12:00:00").toISOString();
    const txData = buildTransactionDraft({
      type: segmentType,
      segment,
      amount: amt,
      currency,
      originalRate: resolvedOriginalRate,
      amountUSD,
      category,
      description,
      date: txDate,
    });

    try {
      if (editingTx) {
        await updateTx({ ...editingTx, ...txData });
      } else {
        const drafts = expandTransactionDrafts({
          draft: txData,
          recurrence,
          registerAsSavings,
          savingsCategory: pnlStructure.ahorro[0] || "Ahorro General",
        });

        if (drafts.length > 1) {
          await addMultipleTx(drafts);
        } else {
          await addTx(drafts[0]);
        }
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : "No se pudo guardar la transaccion";
      if (Platform.OS === "web") {
        alert(msg);
      } else {
        Alert.alert("Error", msg);
      }
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
  }, [
    amount, category, segmentType, segment, currency,
    resolvedOriginalRate, amountUSD, description, date, recurrence,
    editingTx, addTx, addMultipleTx, updateTx, registerAsSavings, pnlStructure.ahorro, router,
  ]);

  const handleDelete = useCallback(async () => {
    if (!editingTx) return;
    const doDelete = async () => {
      await deleteTx(editingTx.id);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      router.back();
    };
    if (Platform.OS === "web") {
      if (confirm("Eliminar movimiento?\nEsta accion no se puede deshacer.")) doDelete();
    } else {
      Alert.alert(
        "Eliminar movimiento?",
        "Esta accion no se puede deshacer.",
        [
          { text: "Cancelar", style: "cancel" },
          { text: "Eliminar", style: "destructive", onPress: doDelete },
        ]
      );
    }
  }, [editingTx, deleteTx, router]);

  const recurrenceLabel = RECURRENCE_OPTIONS.find((r) => r.id === recurrence)?.label || "No repetir";

  return (
    <KeyboardAvoidingView
      style={styles.keyboardAvoidingView}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={{
          paddingTop: topPadding,
          paddingBottom: insets.bottom + 100,
        }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <View style={styles.dragHandleWrap}>
          <View style={styles.dragHandle} />
        </View>

        <View style={styles.header}>
          <Text style={styles.title}>
            {editingTx ? "Editar Movimiento" : "Registrar Movimiento"}
          </Text>
          <Pressable
            onPress={() => router.back()}
            style={styles.closeBtn}
            accessibilityRole="button"
            accessibilityLabel="Cerrar modal de movimiento"
          >
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
                accessibilityRole="button"
                accessibilityLabel={`Seleccionar segmento ${config.label}`}
                accessibilityState={{ selected: isActive }}
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
          accessibilityRole="button"
          accessibilityLabel="Editar monto"
        >
          <View style={styles.amountRow}>
            <Text style={[styles.amountSymbol, { color: segColor }]}>
              {currencyInfo.symbol}
            </Text>
            <TextInput
              ref={amountInputRef}
              style={[
                styles.amountInput,
                { color: segColor },
                Platform.OS === "web" && { outlineStyle: "none" as any },
              ]}
              value={amount}
              onChangeText={(text) => {
                const cleaned = text.replace(/[^0-9.,]/g, "").replace(",", ".");
                const parts = cleaned.split(".");
                if (parts.length > 2) return;
                if (parts[1] && parts[1].length > 2) return;
                setAmount(cleaned);
              }}
              keyboardType="decimal-pad"
              returnKeyType="done"
              keyboardAppearance="dark"
              autoCorrect={false}
              spellCheck={false}
              placeholder="0.00"
              placeholderTextColor={Colors.text.disabled}
              selectionColor={segColor}
              textAlign="center"
            />
            {amount.length > 0 && (
              <Pressable
                onPress={() => Keyboard.dismiss()}
                hitSlop={8}
                style={styles.amountDoneBtn}
              >
                <Ionicons name="checkmark-circle" size={26} color={segColor} />
              </Pressable>
            )}
          </View>
          <Text style={styles.currencyFullLabel}>{currencyInfo.fullLabel}</Text>
        </Pressable>

        <View style={styles.currencySelector}>
          {CURRENCIES.map((c) => {
            const isActive = currency === c.id;
            return (
              <Pressable
                key={c.id}
                onPress={() => {
                  setCurrency(c.id);
                  Haptics.selectionAsync();
                }}
                accessibilityRole="button"
                accessibilityLabel={`Seleccionar moneda ${c.label}`}
                accessibilityState={{ selected: isActive }}
                style={[
                  styles.currencySelectorButton,
                  isActive && styles.currencySelectorButtonActive,
                ]}
              >
                <Text
                  style={[
                    styles.currencySelectorText,
                    isActive && styles.currencySelectorTextActive,
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
            <Pressable
              onPress={() => setShowDateSheet(true)}
              style={styles.inlineValueBox}
              accessibilityRole="button"
              accessibilityLabel="Seleccionar fecha"
            >
              <View style={styles.inlineValueInner}>
                <Text style={styles.inlineValueText}>
                  {formatDisplayDate(date)}
                </Text>
                <Ionicons name="calendar-outline" size={16} color={Colors.text.muted} />
              </View>
            </Pressable>
          </View>
          <View style={styles.inlineField}>
            <Text style={[styles.inlineLabel, category ? { color: segColor } : undefined]}>
              CATEGORIA
            </Text>
            <Pressable
              onPress={() => setShowCategorySheet(true)}
              style={[
                styles.inlineValueBox,
                {
                  borderColor: segColor,
                  backgroundColor: `${segColor}12`,
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel={category ? `Categoria seleccionada ${category}` : "Seleccionar categoria"}
            >
              <View style={styles.inlineValueInner}>
                <Text
                  style={[
                    styles.inlineValueText,
                    !category && { color: Colors.text.disabled },
                    category ? { color: segColor } : undefined,
                  ]}
                  numberOfLines={1}
                >
                  {category || "Seleccionar"}
                </Text>
                <Ionicons
                  name="chevron-down"
                  size={16}
                  color={category ? segColor : Colors.text.muted}
                />
              </View>
            </Pressable>
          </View>
        </View>

        {!editingTx && (
          <View style={styles.repeatRow}>
            <Pressable
              onPress={() => setShowRecurrenceSheet(true)}
              style={[styles.dropdownBtn, styles.repeatField]}
              accessibilityRole="button"
              accessibilityLabel={`Seleccionar repeticion. Actual ${recurrenceLabel}`}
            >
              <Text style={styles.dropdownBtnText}>{recurrenceLabel}</Text>
              <Ionicons name="chevron-down" size={18} color={Colors.text.muted} />
            </Pressable>

            {segment === "ingresos" && (
              <Pressable
                onPress={() => setRegisterAsSavings((prev) => !prev)}
                style={[
                  styles.savingsChip,
                  registerAsSavings && styles.savingsChipActive,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Registrar ingreso tambien como ahorro"
                accessibilityState={{ selected: registerAsSavings }}
              >
                <Text
                  style={[
                    styles.savingsChipText,
                    registerAsSavings && styles.savingsChipTextActive,
                  ]}
                >
                  Registrar como Ahorro
                </Text>
              </Pressable>
            )}
          </View>
        )}

        {currency === "EUR" && (
          <Text style={styles.eurRateInfo}>
            EUR/$ {rates.eur > 0 && rates.bcv > 0 ? (rates.eur / rates.bcv).toFixed(4) : "--"}
          </Text>
        )}

        {currency === "VES" && (
          <View style={styles.rateButtonsRow}>
            <Pressable
              onPress={() => { setRateType("bcv"); Haptics.selectionAsync(); }}
              style={[styles.rateButton, rateType === "bcv" && styles.rateButtonActive]}
              accessibilityRole="button"
              accessibilityLabel="Usar tasa BCV"
              accessibilityState={{ selected: rateType === "bcv" }}
            >
              <Text style={[styles.rateButtonLabel, rateType === "bcv" && styles.rateButtonLabelActive]}>
                BCV
              </Text>
              <Text style={[styles.rateButtonValue, rateType === "bcv" && styles.rateButtonValueActive]}>
                {rates.bcv > 0 ? rates.bcv.toFixed(2) : "--"}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => { setRateType("parallel"); Haptics.selectionAsync(); }}
              style={[styles.rateButton, rateType === "parallel" && styles.rateButtonActive]}
              accessibilityRole="button"
              accessibilityLabel="Usar tasa USDC"
              accessibilityState={{ selected: rateType === "parallel" }}
            >
              <Text style={[styles.rateButtonLabel, rateType === "parallel" && styles.rateButtonLabelActive]}>
                USDC
              </Text>
              <Text style={[styles.rateButtonValue, rateType === "parallel" && styles.rateButtonValueActive]}>
                {rates.parallel > 0 ? rates.parallel.toFixed(2) : "--"}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => { setRateType("manual"); Haptics.selectionAsync(); }}
              style={[styles.rateButton, rateType === "manual" && styles.rateButtonActive]}
              accessibilityRole="button"
              accessibilityLabel="Usar tasa manual"
              accessibilityState={{ selected: rateType === "manual" }}
            >
              <Text style={[styles.rateButtonLabel, rateType === "manual" && styles.rateButtonLabelActive]}>
                Manual
              </Text>
            </Pressable>
          </View>
        )}

        {rateType === "manual" && currency === "VES" && (
          <TextInput
            style={styles.manualRateInput}
            value={customRate}
            onChangeText={setCustomRate}
            keyboardType="decimal-pad"
            returnKeyType="done"
            keyboardAppearance="dark"
            autoCorrect={false}
            spellCheck={false}
            placeholder="Tasa Bs/$"
            placeholderTextColor={Colors.text.disabled}
          />
        )}

        <TextInput
          style={styles.noteInput}
          value={description}
          onChangeText={setDescription}
          placeholder="Nota opcional"
          placeholderTextColor={Colors.text.disabled}
          keyboardAppearance="dark"
          autoCorrect={false}
          spellCheck={false}
        />

        <View style={styles.usdRefRow}>
          <Text style={styles.usdRefLabel}>Ref. {displayCurrency} Reporte:</Text>
          <Text style={[styles.usdRefValue, { color: segColor }]}>
            {displaySymbol}{formatCurrency(displayAmount)}
          </Text>
        </View>

        <Pressable
          onPress={handleSave}
          accessibilityRole="button"
          accessibilityLabel={editingTx ? "Guardar cambios del movimiento" : "Guardar movimiento"}
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
            accessibilityRole="button"
            accessibilityLabel="Eliminar movimiento"
            accessibilityHint="Borra este movimiento de forma permanente"
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

      <BottomSheetPicker
        visible={showCategorySheet}
        onClose={() => setShowCategorySheet(false)}
        title="Categoria"
      >
        <ScrollView style={{ maxHeight: 320 }} showsVerticalScrollIndicator={false}>
          {categories.length > 0 ? (
            categories.map((cat) => {
              const isActive = category === cat;
              return (
                <Pressable
                  key={cat}
                  onPress={() => {
                    setCategory(cat);
                    setShowCategorySheet(false);
                    Haptics.selectionAsync();
                  }}
                  style={[
                    styles.sheetOption,
                    isActive && { backgroundColor: `${segColor}15` },
                  ]}
                >
                  <View style={[styles.sheetDot, { backgroundColor: isActive ? segColor : Colors.dark.highlight }]} />
                  <Text
                    style={[
                      styles.sheetOptionText,
                      isActive && { color: segColor, fontFamily: "Outfit_700Bold" },
                    ]}
                    numberOfLines={1}
                  >
                    {cat}
                  </Text>
                  {isActive && <Ionicons name="checkmark-circle" size={20} color={segColor} />}
                </Pressable>
              );
            })
          ) : (
            <View style={styles.sheetOption}>
              <Text style={styles.noCategoriesText}>No hay categorias configuradas</Text>
            </View>
          )}
        </ScrollView>
      </BottomSheetPicker>

      <BottomSheetPicker
        visible={showRecurrenceSheet}
        onClose={() => setShowRecurrenceSheet(false)}
        title="Repetir"
      >
        <ScrollView style={{ maxHeight: 320 }} showsVerticalScrollIndicator={false}>
          {RECURRENCE_OPTIONS.map((opt) => {
            const isActive = recurrence === opt.id;
            return (
              <Pressable
                key={opt.id}
                onPress={() => {
                  setRecurrence(opt.id);
                  setShowRecurrenceSheet(false);
                  Haptics.selectionAsync();
                }}
                style={[
                  styles.sheetOption,
                  isActive && { backgroundColor: "rgba(16,185,129,0.1)" },
                ]}
              >
                <Text
                  style={[
                    styles.sheetOptionText,
                    isActive && { color: Colors.brand.light, fontFamily: "Outfit_700Bold" },
                  ]}
                >
                  {opt.label}
                </Text>
                {isActive && <Ionicons name="checkmark-circle" size={20} color={Colors.brand.light} />}
              </Pressable>
            );
          })}
        </ScrollView>
      </BottomSheetPicker>

      <DatePickerSheet
        visible={showDateSheet}
        onClose={() => setShowDateSheet(false)}
        dateStr={date}
        onConfirm={setDate}
      />

    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardAvoidingView: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: Colors.dark.surface,
    paddingHorizontal: 24,
  },
  header: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    marginBottom: 20,
  },
  dragHandleWrap: {
    alignItems: "center" as const,
    justifyContent: "center" as const,
    paddingTop: 4,
    paddingBottom: 12,
  },
  dragHandle: {
    width: 44,
    height: 5,
    borderRadius: 999,
    backgroundColor: Colors.dark.highlight,
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
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  segmentChipText: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 13,
    color: Colors.text.secondary,
  },
  amountSection: {
    alignItems: "center" as const,
    marginBottom: 16,
    paddingVertical: 8,
    width: "100%" as any,
  },
  amountRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    width: "100%" as any,
  },
  amountDoneBtn: {
    marginLeft: 8,
    padding: 2,
  },
  amountSymbol: {
    fontFamily: "Outfit_700Bold",
    fontSize: 28,
    marginRight: 6,
  },
  amountInput: {
    fontFamily: "Outfit_800ExtraBold",
    fontSize: 44,
    letterSpacing: -1.5,
    minWidth: 100,
    maxWidth: "70%" as any,
    height: 56,
    paddingVertical: 0,
    textAlign: "center" as const,
  },
  currencyFullLabel: {
    fontFamily: "Outfit_700Bold",
    fontSize: 11,
    color: Colors.text.muted,
    letterSpacing: 1.5,
    marginTop: 4,
    textTransform: "uppercase" as const,
  },
  currencySelector: {
    flexDirection: "row" as const,
    backgroundColor: "rgba(15, 23, 42, 0.42)",
    borderRadius: 16,
    padding: 4,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    marginBottom: 24,
  },
  currencySelectorButton: {
    flex: 1,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    paddingVertical: 10,
    borderRadius: 12,
  },
  currencySelectorButtonActive: {
    backgroundColor: "#fff",
  },
  currencySelectorText: {
    fontFamily: "Outfit_700Bold",
    fontSize: 12,
    color: Colors.text.muted,
  },
  currencySelectorTextActive: {
    color: "#000",
  },
  inlineRow: {
    flexDirection: "row" as const,
    gap: 10,
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
    backgroundColor: "#0f1729",
    borderWidth: 1,
    borderColor: Colors.dark.border,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  inlineValueInner: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
  },
  inlineValueText: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 14,
    color: Colors.text.primary,
    flex: 1,
  },
  dropdownBtn: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    backgroundColor: "#0f1729",
    borderWidth: 1,
    borderColor: Colors.dark.border,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  repeatRow: {
    flexDirection: "row" as const,
    gap: 10,
    marginBottom: 16,
  },
  repeatField: {
    flex: 1,
  },
  savingsChip: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    backgroundColor: "#0f1729",
    alignItems: "center" as const,
    justifyContent: "center" as const,
    paddingHorizontal: 12,
    paddingVertical: 14,
  },
  savingsChipActive: {
    borderColor: Colors.segments.ahorro.color,
    backgroundColor: Colors.segments.ahorro.bg,
  },
  savingsChipText: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 13,
    color: Colors.text.secondary,
    textAlign: "center" as const,
  },
  savingsChipTextActive: {
    color: Colors.segments.ahorro.color,
  },
  dropdownBtnText: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 14,
    color: Colors.text.primary,
  },
  rateButtonsRow: {
    flexDirection: "row" as const,
    gap: 10,
    marginBottom: 16,
  },
  rateButton: {
    flex: 1,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: "#0f1729",
    borderWidth: 1,
    borderColor: Colors.dark.border,
    minHeight: 56,
  },
  rateButtonActive: {
    backgroundColor: "rgba(255,255,255,0.10)",
    borderColor: Colors.dark.highlight,
  },
  rateButtonLabel: {
    fontFamily: "Outfit_700Bold",
    fontSize: 13,
    color: Colors.text.secondary,
  },
  rateButtonLabelActive: {
    color: Colors.text.primary,
  },
  rateButtonValue: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 12,
    color: Colors.text.muted,
    marginTop: 2,
  },
  rateButtonValueActive: {
    color: Colors.text.primary,
  },
  eurRateInfo: {
    fontFamily: "Outfit_500Medium",
    fontSize: 14,
    color: Colors.text.secondary,
    textAlign: "center" as const,
    marginTop: 8,
    marginBottom: 4,
  },
  manualRateInput: {
    backgroundColor: "#0f1729",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontFamily: "Outfit_600SemiBold",
    fontSize: 14,
    color: Colors.text.primary,
    borderWidth: 1,
    borderColor: Colors.brand.DEFAULT + "50",
    marginBottom: 16,
  },
  noteInput: {
    backgroundColor: "#0f1729",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontFamily: "Outfit_500Medium",
    fontSize: 14,
    letterSpacing: 0.2,
    lineHeight: 20,
    color: Colors.text.primary,
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
    letterSpacing: -0.5,
  },
  saveButton: {
    backgroundColor: "rgba(148, 163, 184, 0.16)",
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: "center" as const,
    borderWidth: 1,
    borderColor: "rgba(203, 213, 225, 0.45)",
  },
  saveButtonText: {
    fontFamily: "Outfit_700Bold",
    fontSize: 17,
    color: "#E2E8F0",
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
  sheetOption: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.borderSubtle,
    gap: 12,
  },
  sheetDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  sheetOptionText: {
    fontFamily: "Outfit_500Medium",
    fontSize: 15,
    color: Colors.text.secondary,
    flex: 1,
  },
  noCategoriesText: {
    fontFamily: "Outfit_500Medium",
    fontSize: 13,
    color: Colors.text.disabled,
    fontStyle: "italic" as const,
  },
});
