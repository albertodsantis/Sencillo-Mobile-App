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
  Modal,
  Dimensions,
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
  const [showGuide, setShowGuide] = useState(false);

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
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>Presupuesto</Text>
          <Text style={styles.subtitle}>Control de gastos variables del mes</Text>
        </View>
        <Pressable
          onPress={() => setShowGuide(true)}
          style={styles.helpBtn}
        >
          <Ionicons name="help-circle-outline" size={26} color={Colors.text.muted} />
        </Pressable>
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
      <Modal
        visible={showGuide}
        transparent
        animationType="fade"
        onRequestClose={() => setShowGuide(false)}
      >
        <Pressable style={guideStyles.overlay} onPress={() => setShowGuide(false)}>
          <Pressable style={guideStyles.card} onPress={(e) => e.stopPropagation()}>
            <View style={guideStyles.iconRow}>
              <View style={guideStyles.iconCircle}>
                <Ionicons name="information-circle" size={28} color="#a78bfa" />
              </View>
              <Text style={guideStyles.cardTitle}>Guia de Presupuestos</Text>
            </View>

            <Text style={guideStyles.intro}>
              Controla aqui tus <Text style={guideStyles.bold}>Gastos Variables</Text>.
            </Text>

            <View style={guideStyles.infoBox}>
              <Text style={guideStyles.infoTitle}>Disponible Flexible</Text>
              <Text style={guideStyles.infoDesc}>
                Es el dinero que te queda libre despues de restar Ahorros y Gastos Fijos a tus Ingresos.
              </Text>
              <View style={guideStyles.formulaRow}>
                <Text style={guideStyles.formulaText}>INGRESOS</Text>
                <Text style={guideStyles.formulaOp}> - </Text>
                <Text style={guideStyles.formulaText}>AHORRO</Text>
                <Text style={guideStyles.formulaOp}> - </Text>
                <Text style={guideStyles.formulaText}>FIJOS</Text>
              </View>
            </View>

            <Text style={guideStyles.sectionTitle}>Partidas de Gastos</Text>
            <Text style={guideStyles.sectionDesc}>
              Aqui estan tus categorias de Gastos Variables (configuradas en Personalizacion). Define un tope para cada una y aumenta tu capacidad de ahorro.
            </Text>

            <Pressable
              onPress={() => setShowGuide(false)}
              style={guideStyles.dismissBtn}
            >
              <Text style={guideStyles.dismissText}>Entendido</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}

const guideStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center" as const,
    alignItems: "center" as const,
    padding: 28,
  },
  card: {
    backgroundColor: Colors.dark.card,
    borderRadius: 24,
    padding: 24,
    width: "100%",
    maxWidth: 360,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  iconRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 12,
    marginBottom: 16,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(167,139,250,0.15)",
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  cardTitle: {
    fontFamily: "Outfit_800ExtraBold",
    fontSize: 18,
    color: Colors.text.primary,
    flex: 1,
  },
  intro: {
    fontFamily: "Outfit_500Medium",
    fontSize: 14,
    color: Colors.text.secondary,
    marginBottom: 16,
    lineHeight: 20,
  },
  bold: {
    fontFamily: "Outfit_700Bold",
    color: Colors.text.primary,
  },
  infoBox: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.dark.borderSubtle,
  },
  infoTitle: {
    fontFamily: "Outfit_700Bold",
    fontSize: 14,
    color: "#a78bfa",
    marginBottom: 8,
  },
  infoDesc: {
    fontFamily: "Outfit_500Medium",
    fontSize: 13,
    color: Colors.text.secondary,
    lineHeight: 19,
    marginBottom: 12,
  },
  formulaRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    backgroundColor: "rgba(0,0,0,0.25)",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  formulaText: {
    fontFamily: "Outfit_700Bold",
    fontSize: 12,
    color: Colors.text.muted,
    letterSpacing: 0.5,
  },
  formulaOp: {
    fontFamily: "Outfit_500Medium",
    fontSize: 14,
    color: Colors.text.disabled,
  },
  sectionTitle: {
    fontFamily: "Outfit_700Bold",
    fontSize: 14,
    color: Colors.text.primary,
    marginBottom: 6,
  },
  sectionDesc: {
    fontFamily: "Outfit_500Medium",
    fontSize: 13,
    color: Colors.text.secondary,
    lineHeight: 19,
    marginBottom: 20,
  },
  dismissBtn: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center" as const,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  dismissText: {
    fontFamily: "Outfit_700Bold",
    fontSize: 15,
    color: Colors.text.primary,
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.base,
    paddingHorizontal: 24,
  },
  headerRow: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "flex-start" as const,
    marginBottom: 20,
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
    marginTop: 4,
  },
  helpBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.05)",
    alignItems: "center" as const,
    justifyContent: "center" as const,
    marginTop: 2,
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
