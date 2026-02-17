import React, { useState, useMemo, useCallback } from "react";
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
} from "@/lib/domain/finance";

const CURRENCIES: { id: Currency; label: string; symbol: string }[] = [
  { id: "VES", label: "Bolivares", symbol: "Bs" },
  { id: "USD", label: "Dolares", symbol: "$" },
  { id: "EUR", label: "Euros", symbol: "EUR" },
];

const RATE_TYPES: { id: RateType; label: string }[] = [
  { id: "bcv", label: "BCV" },
  { id: "parallel", label: "Paralelo" },
  { id: "manual", label: "Manual" },
];

function ChipSelector<T extends string>({
  options,
  selected,
  onSelect,
  getLabel,
  getColor,
}: {
  options: T[];
  selected: T;
  onSelect: (v: T) => void;
  getLabel: (v: T) => string;
  getColor?: (v: T) => string;
}) {
  return (
    <View style={styles.chipRow}>
      {options.map((opt) => {
        const isSelected = selected === opt;
        const color = getColor?.(opt) || Colors.brand.DEFAULT;
        return (
          <Pressable
            key={opt}
            onPress={() => {
              Haptics.selectionAsync();
              onSelect(opt);
            }}
            style={[
              styles.chip,
              isSelected && { backgroundColor: color, borderColor: color },
            ]}
          >
            <Text
              style={[
                styles.chipText,
                isSelected && { color: "#fff" },
              ]}
            >
              {getLabel(opt)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
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
    editingTx?.currency || "USD"
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

  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const topPadding = insets.top + webTopInset + 16;

  const segmentType = SEGMENT_CONFIG[segment].type;
  const categories = pnlStructure[segment] || [];

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
      if (Platform.OS === "web") {
        alert("Ingresa un monto y selecciona una categoria");
      } else {
        Alert.alert("Error", "Ingresa un monto y selecciona una categoria");
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
        const recDates = generateRecurrences(
          txData.date,
          recurrence
        );
        const allTxs = [txData, ...recDates.map((d) => ({ ...txData, date: d }))];
        await addMultipleTx(allTxs);
      } else {
        await addTx(txData);
      }
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
  }, [
    amount,
    category,
    segmentType,
    segment,
    currency,
    currentRate,
    amountUSD,
    description,
    date,
    recurrence,
    editingTx,
    addTx,
    addMultipleTx,
    updateTx,
    router,
  ]);

  const handleDelete = useCallback(async () => {
    if (!editingTx) return;

    const doDelete = async () => {
      await deleteTx(editingTx.id);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      router.back();
    };

    if (Platform.OS === "web") {
      if (confirm("Eliminar esta transaccion?")) doDelete();
    } else {
      Alert.alert("Eliminar", "Eliminar esta transaccion?", [
        { text: "Cancelar", style: "cancel" },
        { text: "Eliminar", style: "destructive", onPress: doDelete },
      ]);
    }
  }, [editingTx, deleteTx, router]);

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
            {editingTx ? "Editar" : "Nueva Transaccion"}
          </Text>
          <Pressable onPress={() => router.back()} style={styles.closeBtn}>
            <Ionicons name="close" size={24} color={Colors.text.secondary} />
          </Pressable>
        </View>

        <Text style={styles.label}>Segmento</Text>
        <ChipSelector
          options={
            Object.keys(SEGMENT_CONFIG) as Segment[]
          }
          selected={segment}
          onSelect={(s) => {
            setSegment(s);
            setCategory("");
          }}
          getLabel={(s) => SEGMENT_CONFIG[s].label}
          getColor={(s) => SEGMENT_CONFIG[s].color}
        />

        <Text style={styles.label}>Monto</Text>
        <View style={styles.amountRow}>
          <TextInput
            style={styles.amountInput}
            value={amount}
            onChangeText={setAmount}
            keyboardType="numeric"
            placeholder="0.00"
            placeholderTextColor={Colors.text.disabled}
          />
        </View>

        <Text style={styles.label}>Moneda</Text>
        <ChipSelector
          options={CURRENCIES.map((c) => c.id)}
          selected={currency}
          onSelect={setCurrency}
          getLabel={(c) =>
            CURRENCIES.find((x) => x.id === c)?.label || c
          }
        />

        {currency === "VES" && (
          <>
            <Text style={styles.label}>Tipo de Tasa</Text>
            <ChipSelector
              options={RATE_TYPES.map((r) => r.id)}
              selected={rateType}
              onSelect={setRateType}
              getLabel={(r) =>
                RATE_TYPES.find((x) => x.id === r)?.label || r
              }
            />
            {rateType === "manual" && (
              <TextInput
                style={styles.manualRateInput}
                value={customRate}
                onChangeText={setCustomRate}
                keyboardType="numeric"
                placeholder="Tasa manual (Bs/$)"
                placeholderTextColor={Colors.text.disabled}
              />
            )}
          </>
        )}

        {currency === "EUR" && rateType === "manual" && (
          <TextInput
            style={styles.manualRateInput}
            value={customRate}
            onChangeText={setCustomRate}
            keyboardType="numeric"
            placeholder="Tasa manual EUR (Bs/EUR)"
            placeholderTextColor={Colors.text.disabled}
          />
        )}

        {(currency === "VES" || currency === "EUR") && (
          <View style={styles.conversionPreview}>
            <Text style={styles.conversionLabel}>
              Tasa: {currentRate.toFixed(2)} Bs/$ | Equivale a:
            </Text>
            <Text style={styles.conversionValue}>
              ${amountUSD.toFixed(2)} USD
            </Text>
          </View>
        )}

        <Text style={styles.label}>Categoria</Text>
        {categories.length > 0 ? (
          <View style={styles.chipRow}>
            {categories.map((cat) => (
              <Pressable
                key={cat}
                onPress={() => {
                  setCategory(cat);
                  Haptics.selectionAsync();
                }}
                style={[
                  styles.chip,
                  category === cat && {
                    backgroundColor: SEGMENT_CONFIG[segment].color,
                    borderColor: SEGMENT_CONFIG[segment].color,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.chipText,
                    category === cat && { color: "#fff" },
                  ]}
                >
                  {cat}
                </Text>
              </Pressable>
            ))}
          </View>
        ) : (
          <Text style={styles.noCategoriesText}>
            No hay categorias. Agrega en Ajustes.
          </Text>
        )}

        <Text style={styles.label}>Descripcion (opcional)</Text>
        <TextInput
          style={styles.descInput}
          value={description}
          onChangeText={setDescription}
          placeholder="Nota breve..."
          placeholderTextColor={Colors.text.disabled}
        />

        <Text style={styles.label}>Fecha</Text>
        <TextInput
          style={styles.dateInput}
          value={date}
          onChangeText={setDate}
          placeholder="YYYY-MM-DD"
          placeholderTextColor={Colors.text.disabled}
        />

        {!editingTx && (
          <>
            <Text style={styles.label}>Recurrencia</Text>
            <View style={styles.chipRow}>
              {RECURRENCE_OPTIONS.map((opt) => (
                <Pressable
                  key={opt.id}
                  onPress={() => {
                    setRecurrence(opt.id);
                    Haptics.selectionAsync();
                  }}
                  style={[
                    styles.chip,
                    recurrence === opt.id && {
                      backgroundColor: Colors.brand.DEFAULT,
                      borderColor: Colors.brand.DEFAULT,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      recurrence === opt.id && { color: "#fff" },
                    ]}
                  >
                    {opt.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </>
        )}

        <Pressable
          onPress={handleSave}
          style={({ pressed }) => [
            styles.saveButton,
            pressed && { opacity: 0.8, transform: [{ scale: 0.98 }] },
          ]}
        >
          <Text style={styles.saveButtonText}>
            {editingTx ? "Guardar Cambios" : "Registrar"}
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
            <Text style={styles.deleteButtonText}>
              Eliminar Transaccion
            </Text>
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
    marginBottom: 24,
  },
  title: {
    fontFamily: "Outfit_900Black",
    fontSize: 22,
    color: Colors.text.primary,
    letterSpacing: -0.5,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.05)",
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  label: {
    fontFamily: "Outfit_700Bold",
    fontSize: 12,
    color: Colors.text.muted,
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
    marginBottom: 8,
    marginTop: 16,
  },
  chipRow: {
    flexDirection: "row" as const,
    flexWrap: "wrap" as const,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.dark.highlight,
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  chipText: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 12,
    color: Colors.text.secondary,
  },
  amountRow: {
    flexDirection: "row" as const,
    gap: 12,
  },
  amountInput: {
    flex: 1,
    backgroundColor: Colors.dark.surface,
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 14,
    fontFamily: "Outfit_700Bold",
    fontSize: 24,
    color: Colors.text.primary,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  manualRateInput: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontFamily: "Outfit_600SemiBold",
    fontSize: 14,
    color: Colors.text.primary,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    marginTop: 8,
  },
  conversionPreview: {
    backgroundColor: "rgba(16,185,129,0.08)",
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: "rgba(16,185,129,0.2)",
  },
  conversionLabel: {
    fontFamily: "Outfit_500Medium",
    fontSize: 11,
    color: Colors.text.muted,
    marginBottom: 2,
  },
  conversionValue: {
    fontFamily: "Outfit_800ExtraBold",
    fontSize: 18,
    color: Colors.brand.light,
  },
  noCategoriesText: {
    fontFamily: "Outfit_500Medium",
    fontSize: 13,
    color: Colors.text.disabled,
    fontStyle: "italic" as const,
  },
  descInput: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontFamily: "Outfit_500Medium",
    fontSize: 14,
    color: Colors.text.primary,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  dateInput: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontFamily: "Outfit_600SemiBold",
    fontSize: 14,
    color: Colors.text.primary,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  saveButton: {
    backgroundColor: Colors.brand.DEFAULT,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center" as const,
    marginTop: 28,
    shadowColor: Colors.brand.DEFAULT,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  saveButtonText: {
    fontFamily: "Outfit_700Bold",
    fontSize: 16,
    color: "#fff",
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
