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
  Modal,
  Dimensions,
  Keyboard,
  InputAccessoryView,
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

const MONTHS_FULL = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
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

function parseDateString(dateStr: string): { day: number; month: number; year: number } {
  try {
    const parts = dateStr.split("-");
    return {
      year: parseInt(parts[0], 10),
      month: parseInt(parts[1], 10),
      day: parseInt(parts[2], 10),
    };
  } catch {
    const now = new Date();
    return { day: now.getDate(), month: now.getMonth() + 1, year: now.getFullYear() };
  }
}

function daysInMonth(month: number, year: number): number {
  return new Date(year, month, 0).getDate();
}

function BottomSheetPicker({
  visible,
  onClose,
  title,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={sheetStyles.overlay} onPress={onClose}>
        <Pressable style={sheetStyles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={sheetStyles.handle} />
          <View style={sheetStyles.header}>
            <Text style={sheetStyles.title}>{title}</Text>
            <Pressable onPress={onClose} style={sheetStyles.closeBtn}>
              <Ionicons name="close" size={20} color={Colors.text.secondary} />
            </Pressable>
          </View>
          {children}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const sheetStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end" as const,
  },
  sheet: {
    backgroundColor: Colors.dark.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 40,
    maxHeight: Dimensions.get("window").height * 0.6,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.dark.highlight,
    alignSelf: "center" as const,
    marginTop: 10,
    marginBottom: 8,
  },
  header: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.borderSubtle,
  },
  title: {
    fontFamily: "Outfit_700Bold",
    fontSize: 16,
    color: Colors.text.primary,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.06)",
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
});

function DatePickerSheet({
  visible,
  onClose,
  dateStr,
  onConfirm,
}: {
  visible: boolean;
  onClose: () => void;
  dateStr: string;
  onConfirm: (dateStr: string) => void;
}) {
  const parsed = parseDateString(dateStr);
  const [day, setDay] = useState(parsed.day);
  const [month, setMonth] = useState(parsed.month);
  const [year, setYear] = useState(parsed.year);

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);
  const maxDay = daysInMonth(month, year);
  const effectiveDay = Math.min(day, maxDay);

  const handleConfirm = () => {
    const d = String(effectiveDay).padStart(2, "0");
    const m = String(month).padStart(2, "0");
    onConfirm(`${year}-${m}-${d}`);
    onClose();
  };

  return (
    <BottomSheetPicker visible={visible} onClose={onClose} title="Seleccionar Fecha">
      <View style={dateStyles.container}>
        <View style={dateStyles.columnsRow}>
          <View style={dateStyles.column}>
            <Text style={dateStyles.columnLabel}>DIA</Text>
            <ScrollView style={dateStyles.scroll} showsVerticalScrollIndicator={false}>
              {Array.from({ length: maxDay }, (_, i) => i + 1).map((d) => (
                <Pressable
                  key={d}
                  onPress={() => { setDay(d); Haptics.selectionAsync(); }}
                  style={[dateStyles.option, effectiveDay === d && dateStyles.optionActive]}
                >
                  <Text style={[dateStyles.optionText, effectiveDay === d && dateStyles.optionTextActive]}>
                    {d}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
          <View style={dateStyles.column}>
            <Text style={dateStyles.columnLabel}>MES</Text>
            <ScrollView style={dateStyles.scroll} showsVerticalScrollIndicator={false}>
              {MONTHS_FULL.map((m, i) => (
                <Pressable
                  key={i}
                  onPress={() => { setMonth(i + 1); Haptics.selectionAsync(); }}
                  style={[dateStyles.option, month === i + 1 && dateStyles.optionActive]}
                >
                  <Text style={[dateStyles.optionText, month === i + 1 && dateStyles.optionTextActive]}>
                    {m}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
          <View style={dateStyles.column}>
            <Text style={dateStyles.columnLabel}>ANO</Text>
            <ScrollView style={dateStyles.scroll} showsVerticalScrollIndicator={false}>
              {years.map((y) => (
                <Pressable
                  key={y}
                  onPress={() => { setYear(y); Haptics.selectionAsync(); }}
                  style={[dateStyles.option, year === y && dateStyles.optionActive]}
                >
                  <Text style={[dateStyles.optionText, year === y && dateStyles.optionTextActive]}>
                    {y}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
        <Pressable onPress={handleConfirm} style={dateStyles.confirmBtn}>
          <Text style={dateStyles.confirmText}>Confirmar</Text>
        </Pressable>
      </View>
    </BottomSheetPicker>
  );
}

const dateStyles = StyleSheet.create({
  container: {
    padding: 20,
  },
  columnsRow: {
    flexDirection: "row" as const,
    gap: 8,
    marginBottom: 20,
  },
  column: {
    flex: 1,
  },
  columnLabel: {
    fontFamily: "Outfit_700Bold",
    fontSize: 10,
    color: Colors.text.muted,
    letterSpacing: 1,
    textAlign: "center" as const,
    marginBottom: 8,
  },
  scroll: {
    maxHeight: 200,
  },
  option: {
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 10,
    alignItems: "center" as const,
    marginBottom: 2,
  },
  optionActive: {
    backgroundColor: Colors.brand.dark,
  },
  optionText: {
    fontFamily: "Outfit_500Medium",
    fontSize: 15,
    color: Colors.text.secondary,
  },
  optionTextActive: {
    color: Colors.brand.light,
    fontFamily: "Outfit_700Bold",
  },
  confirmBtn: {
    backgroundColor: Colors.brand.DEFAULT,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center" as const,
  },
  confirmText: {
    fontFamily: "Outfit_700Bold",
    fontSize: 15,
    color: "#fff",
  },
});

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
  const INPUT_ACCESSORY_ID = "sencillo-keyboard-done";

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
  const [showCategorySheet, setShowCategorySheet] = useState(false);
  const [showRecurrenceSheet, setShowRecurrenceSheet] = useState(false);
  const [showDateSheet, setShowDateSheet] = useState(false);

  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const topPadding = insets.top + webTopInset + 16;

  const segmentType = SEGMENT_CONFIG[segment].type;
  const segColor = SEGMENT_CONFIG[segment].color;
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
      if (confirm("¿Eliminar movimiento?\nEsta acción no se puede deshacer.")) doDelete();
    } else {
      Alert.alert(
        "¿Eliminar movimiento?",
        "Esta acción no se puede deshacer.",
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
              keyboardAppearance="dark"
              autoCorrect={false}
              spellCheck={false}
              placeholder="0.00"
              placeholderTextColor={Colors.text.disabled}
              selectionColor={segColor}
              textAlign="center"
              inputAccessoryViewID={Platform.OS === "ios" ? INPUT_ACCESSORY_ID : undefined}
            />
          </View>
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
            <Pressable
              onPress={() => setShowDateSheet(true)}
              style={styles.inlineValueBox}
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
                category ? {
                  borderColor: segColor,
                  backgroundColor: `${segColor}12`,
                } : undefined,
              ]}
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
          <>
            <Text style={styles.fieldLabel}>REPETIR</Text>
            <Pressable
              onPress={() => setShowRecurrenceSheet(true)}
              style={styles.dropdownBtn}
            >
              <Text style={styles.dropdownBtnText}>{recurrenceLabel}</Text>
              <Ionicons name="chevron-down" size={18} color={Colors.text.muted} />
            </Pressable>
          </>
        )}

        {(currency === "VES" || currency === "EUR") && (
          <View style={styles.rateButtonsRow}>
            <Pressable
              onPress={() => { setRateType("bcv"); Haptics.selectionAsync(); }}
              style={[styles.rateButton, rateType === "bcv" && styles.rateButtonActive]}
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
            >
              <Text style={[styles.rateButtonLabel, rateType === "manual" && styles.rateButtonLabelActive]}>
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
            keyboardAppearance="dark"
            autoCorrect={false}
            spellCheck={false}
            placeholder={currency === "EUR" ? "Tasa Bs/EUR" : "Tasa Bs/$"}
            placeholderTextColor={Colors.text.disabled}
            inputAccessoryViewID={Platform.OS === "ios" ? INPUT_ACCESSORY_ID : undefined}
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
          inputAccessoryViewID={Platform.OS === "ios" ? INPUT_ACCESSORY_ID : undefined}
        />

        <View style={styles.usdRefRow}>
          <Text style={styles.usdRefLabel}>Ref. USD Reporte:</Text>
          <Text style={[styles.usdRefValue, { color: segColor }]}>
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

      {Platform.OS === "ios" && (
        <InputAccessoryView nativeID={INPUT_ACCESSORY_ID} backgroundColor="#2c2c2e">
          <View style={styles.keyboardToolbar}>
            <View style={{ flex: 1 }} />
            <Pressable
              style={styles.keyboardDoneBtn}
              onPress={() => Keyboard.dismiss()}
              hitSlop={8}
            >
              <Ionicons name="checkmark-circle" size={28} color="#0a84ff" />
            </Pressable>
          </View>
        </InputAccessoryView>
      )}
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
    paddingVertical: 8,
  },
  amountRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
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
    height: 56,
    paddingVertical: 0,
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
    marginBottom: 16,
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
  keyboardToolbar: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    backgroundColor: "#2c2c2e",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  keyboardDoneBtn: {
    padding: 4,
  },
});
