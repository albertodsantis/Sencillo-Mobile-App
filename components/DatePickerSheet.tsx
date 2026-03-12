import React, { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import BottomSheetPicker from "@/components/BottomSheetPicker";

const MONTHS_FULL = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

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

interface DatePickerSheetProps {
  visible: boolean;
  onClose: () => void;
  dateStr: string;
  onConfirm: (dateStr: string) => void;
}

export default function DatePickerSheet({
  visible,
  onClose,
  dateStr,
  onConfirm,
}: DatePickerSheetProps) {
  const parsed = parseDateString(dateStr);
  const [day, setDay] = useState(parsed.day);
  const [month, setMonth] = useState(parsed.month);
  const [year, setYear] = useState(parsed.year);

  useEffect(() => {
    if (!visible) return;
    const nextDate = parseDateString(dateStr);
    setDay(nextDate.day);
    setMonth(nextDate.month);
    setYear(nextDate.year);
  }, [dateStr, visible]);

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, index) => currentYear - 2 + index);
  const maxDay = daysInMonth(month, year);
  const effectiveDay = Math.min(day, maxDay);

  const handleConfirm = () => {
    const normalizedDay = String(effectiveDay).padStart(2, "0");
    const normalizedMonth = String(month).padStart(2, "0");
    onConfirm(`${year}-${normalizedMonth}-${normalizedDay}`);
    onClose();
  };

  return (
    <BottomSheetPicker visible={visible} onClose={onClose} title="Seleccionar Fecha">
      <View style={styles.container}>
        <View style={styles.columnsRow}>
          <View style={styles.column}>
            <Text style={styles.columnLabel}>DIA</Text>
            <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
              {Array.from({ length: maxDay }, (_, index) => index + 1).map((value) => (
                <Pressable
                  key={value}
                  onPress={() => {
                    setDay(value);
                    Haptics.selectionAsync();
                  }}
                  style={[styles.option, effectiveDay === value && styles.optionActive]}
                  accessibilityRole="button"
                  accessibilityLabel={`Dia ${value}`}
                  accessibilityState={{ selected: effectiveDay === value }}
                >
                  <Text
                    style={[
                      styles.optionText,
                      effectiveDay === value && styles.optionTextActive,
                    ]}
                  >
                    {value}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>

          <View style={styles.column}>
            <Text style={styles.columnLabel}>MES</Text>
            <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
              {MONTHS_FULL.map((value, index) => (
                <Pressable
                  key={value}
                  onPress={() => {
                    setMonth(index + 1);
                    Haptics.selectionAsync();
                  }}
                  style={[styles.option, month === index + 1 && styles.optionActive]}
                  accessibilityRole="button"
                  accessibilityLabel={value}
                  accessibilityState={{ selected: month === index + 1 }}
                >
                  <Text
                    style={[
                      styles.optionText,
                      month === index + 1 && styles.optionTextActive,
                    ]}
                  >
                    {value}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>

          <View style={styles.column}>
            <Text style={styles.columnLabel}>ANO</Text>
            <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
              {years.map((value) => (
                <Pressable
                  key={value}
                  onPress={() => {
                    setYear(value);
                    Haptics.selectionAsync();
                  }}
                  style={[styles.option, year === value && styles.optionActive]}
                  accessibilityRole="button"
                  accessibilityLabel={`Ano ${value}`}
                  accessibilityState={{ selected: year === value }}
                >
                  <Text
                    style={[
                      styles.optionText,
                      year === value && styles.optionTextActive,
                    ]}
                  >
                    {value}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>

        <Pressable
          onPress={handleConfirm}
          style={styles.confirmBtn}
          accessibilityRole="button"
          accessibilityLabel="Confirmar fecha"
        >
          <Text style={styles.confirmText}>Confirmar</Text>
        </Pressable>
      </View>
    </BottomSheetPicker>
  );
}

const styles = StyleSheet.create({
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
