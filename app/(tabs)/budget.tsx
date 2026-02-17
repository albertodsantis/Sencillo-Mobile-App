import React, { useState, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  TextInput,
  Platform,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { useApp } from "@/lib/context/AppContext";
import { formatCurrency } from "@/lib/domain/finance";

function ProgressBar({
  progress,
  color,
}: {
  progress: number;
  color: string;
}) {
  const clampedProgress = Math.min(Math.max(progress, 0), 100);
  return (
    <View style={styles.progressBarBg}>
      <View
        style={[
          styles.progressBarFill,
          {
            width: `${clampedProgress}%` as any,
            backgroundColor:
              clampedProgress > 90 ? "#ef4444" : clampedProgress > 70 ? "#eab308" : color,
          },
        ]}
      />
    </View>
  );
}

export default function BudgetScreen() {
  const insets = useSafeAreaInsets();
  const {
    pnlStructure,
    budgets,
    budgetSummary,
    updateBudgets,
  } = useApp();
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const topPadding = insets.top + webTopInset + 16;

  const variableCategories = pnlStructure.gastos_variables;

  const handleSaveBudget = useCallback(
    async (category: string) => {
      const value = parseFloat(editValue);
      if (isNaN(value) || value < 0) {
        setEditingCategory(null);
        return;
      }
      const updated = { ...budgets, [category]: value };
      await updateBudgets(updated);
      setEditingCategory(null);
    },
    [editValue, budgets, updateBudgets]
  );

  const handleRemoveBudget = useCallback(
    async (category: string) => {
      const updated = { ...budgets };
      delete updated[category];
      await updateBudgets(updated);
    },
    [budgets, updateBudgets]
  );

  const overallProgress = budgetSummary.progress;
  const overallColor =
    overallProgress > 90
      ? "#ef4444"
      : overallProgress > 70
        ? "#eab308"
        : Colors.brand.DEFAULT;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingTop: topPadding, paddingBottom: 120 }}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.title}>Presupuesto</Text>
      <Text style={styles.subtitle}>Control de gastos variables del mes</Text>

      <View style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Ingresos</Text>
            <Text style={[styles.summaryValue, { color: Colors.brand.light }]}>
              ${formatCurrency(budgetSummary.income)}
            </Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Ahorro</Text>
            <Text style={[styles.summaryValue, { color: "#60a5fa" }]}>
              ${formatCurrency(budgetSummary.savings)}
            </Text>
          </View>
        </View>
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Fijos</Text>
            <Text style={[styles.summaryValue, { color: "#fb923c" }]}>
              ${formatCurrency(budgetSummary.fixed)}
            </Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Flexible</Text>
            <Text
              style={[
                styles.summaryValue,
                {
                  color:
                    budgetSummary.realAvailable < 0 ? "#ef4444" : Colors.brand.light,
                },
              ]}
            >
              ${formatCurrency(budgetSummary.realAvailable)}
            </Text>
          </View>
        </View>
      </View>

      {budgetSummary.totalBudget > 0 && (
        <View style={styles.overallCard}>
          <View style={styles.overallHeader}>
            <Text style={styles.overallLabel}>Progreso Total</Text>
            <Text style={[styles.overallPercent, { color: overallColor }]}>
              {overallProgress.toFixed(0)}%
            </Text>
          </View>
          <ProgressBar progress={overallProgress} color={overallColor} />
          <View style={styles.overallFooter}>
            <Text style={styles.overallSpent}>
              Gastado: ${formatCurrency(budgetSummary.variableTotal)}
            </Text>
            <Text style={styles.overallBudget}>
              Presupuesto: ${formatCurrency(budgetSummary.totalBudget)}
            </Text>
          </View>
        </View>
      )}

      <Text style={styles.sectionTitle}>Categorias Variables</Text>

      {variableCategories.map((cat) => {
        const budget = budgets[cat] || 0;
        const spent = budgetSummary.spending[cat] || 0;
        const catProgress = budget > 0 ? (spent / budget) * 100 : 0;
        const isEditing = editingCategory === cat;

        return (
          <View key={cat} style={styles.categoryCard}>
            <View style={styles.catHeader}>
              <Text style={styles.catName}>{cat}</Text>
              {budget > 0 && (
                <Pressable onPress={() => handleRemoveBudget(cat)}>
                  <Ionicons
                    name="close-circle"
                    size={18}
                    color={Colors.text.disabled}
                  />
                </Pressable>
              )}
            </View>

            {isEditing ? (
              <View style={styles.editRow}>
                <TextInput
                  style={styles.editInput}
                  value={editValue}
                  onChangeText={setEditValue}
                  keyboardType="numeric"
                  placeholder="Monto en USD"
                  placeholderTextColor={Colors.text.disabled}
                  autoFocus
                />
                <Pressable
                  onPress={() => handleSaveBudget(cat)}
                  style={styles.saveBtn}
                >
                  <Ionicons name="checkmark" size={20} color="#fff" />
                </Pressable>
                <Pressable
                  onPress={() => setEditingCategory(null)}
                  style={styles.cancelBtn}
                >
                  <Ionicons name="close" size={20} color={Colors.text.muted} />
                </Pressable>
              </View>
            ) : budget > 0 ? (
              <Pressable
                onPress={() => {
                  setEditValue(budget.toString());
                  setEditingCategory(cat);
                }}
              >
                <View style={styles.catValues}>
                  <Text style={styles.catSpent}>
                    ${formatCurrency(spent)}
                  </Text>
                  <Text style={styles.catBudget}>
                    / ${formatCurrency(budget)}
                  </Text>
                </View>
                <ProgressBar
                  progress={catProgress}
                  color={Colors.segments.gastos_variables.color}
                />
              </Pressable>
            ) : (
              <Pressable
                onPress={() => {
                  setEditValue("");
                  setEditingCategory(cat);
                }}
                style={styles.setBudgetBtn}
              >
                <Ionicons
                  name="add-circle-outline"
                  size={16}
                  color={Colors.brand.DEFAULT}
                />
                <Text style={styles.setBudgetText}>
                  Establecer presupuesto
                </Text>
              </Pressable>
            )}
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.base,
    paddingHorizontal: 24,
  },
  title: {
    fontFamily: "Outfit_900Black",
    fontSize: 24,
    color: Colors.text.primary,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontFamily: "Outfit_500Medium",
    fontSize: 13,
    color: Colors.text.muted,
    marginBottom: 20,
    marginTop: 4,
  },
  summaryCard: {
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    marginBottom: 16,
    gap: 12,
  },
  summaryRow: {
    flexDirection: "row" as const,
    gap: 12,
  },
  summaryItem: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.dark.borderSubtle,
  },
  summaryLabel: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 10,
    color: Colors.text.muted,
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  summaryValue: {
    fontFamily: "Outfit_800ExtraBold",
    fontSize: 18,
    letterSpacing: -0.5,
  },
  overallCard: {
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    marginBottom: 20,
  },
  overallHeader: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    marginBottom: 10,
  },
  overallLabel: {
    fontFamily: "Outfit_700Bold",
    fontSize: 14,
    color: Colors.text.primary,
  },
  overallPercent: {
    fontFamily: "Outfit_800ExtraBold",
    fontSize: 18,
  },
  overallFooter: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    marginTop: 8,
  },
  overallSpent: {
    fontFamily: "Outfit_500Medium",
    fontSize: 11,
    color: Colors.text.muted,
  },
  overallBudget: {
    fontFamily: "Outfit_500Medium",
    fontSize: 11,
    color: Colors.text.muted,
  },
  sectionTitle: {
    fontFamily: "Outfit_700Bold",
    fontSize: 16,
    color: Colors.text.primary,
    marginBottom: 12,
  },
  categoryCard: {
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    marginBottom: 10,
  },
  catHeader: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    marginBottom: 8,
  },
  catName: {
    fontFamily: "Outfit_700Bold",
    fontSize: 14,
    color: Colors.text.primary,
  },
  catValues: {
    flexDirection: "row" as const,
    alignItems: "baseline" as const,
    gap: 4,
    marginBottom: 8,
  },
  catSpent: {
    fontFamily: "Outfit_800ExtraBold",
    fontSize: 16,
    color: Colors.text.primary,
  },
  catBudget: {
    fontFamily: "Outfit_500Medium",
    fontSize: 12,
    color: Colors.text.muted,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 3,
    overflow: "hidden" as const,
  },
  progressBarFill: {
    height: 6,
    borderRadius: 3,
  },
  setBudgetBtn: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
  },
  setBudgetText: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 12,
    color: Colors.brand.DEFAULT,
  },
  editRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
  },
  editInput: {
    flex: 1,
    backgroundColor: Colors.dark.surface,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontFamily: "Outfit_600SemiBold",
    fontSize: 14,
    color: Colors.text.primary,
    borderWidth: 1,
    borderColor: Colors.brand.DEFAULT,
  },
  saveBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.brand.DEFAULT,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  cancelBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.05)",
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
});
