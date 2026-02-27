import React, { useState, useCallback, useMemo, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  TextInput,
  Platform,
  Modal,
  KeyboardAvoidingView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import AmbientGlow from "@/components/AmbientGlow";
import { useApp } from "@/lib/context/AppContext";
import { formatCurrency, convertUSDToDisplayCurrency, getDisplayCurrencySymbol } from "@/lib/domain/finance";
import dayjs from "dayjs";

const BUDGET_GUIDE_DISMISSED_KEY = "guide_dismissed_budget";

function ProgressBar({
  progress,
  color,
  inverted,
}: {
  progress: number;
  color: string;
  inverted?: boolean;
}) {
  const clampedProgress = Math.min(Math.max(progress, 0), 100);
  const barColor = inverted
    ? clampedProgress >= 100
      ? "#34d399"
      : clampedProgress >= 70
        ? "#eab308"
        : color
    : clampedProgress > 90
      ? "#ef4444"
      : clampedProgress > 70
        ? "#eab308"
        : color;
  return (
    <View style={styles.progressBarBg}>
      <View
        style={[
          styles.progressBarFill,
          {
            width: `${clampedProgress}%` as any,
            backgroundColor: barColor,
          },
        ]}
      />
    </View>
  );
}

interface ReorderableCardProps {
  isReordering: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  isFirst: boolean;
  isLast: boolean;
  children: React.ReactNode;
}

function ReorderableCard({
  isReordering,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
  children,
}: ReorderableCardProps) {
  const handleMove = (direction: "up" | "down") => {
    if (direction === "up") onMoveUp();
    else onMoveDown();
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  return (
    <View style={styles.categoryCard}>
      <View style={styles.cardInner}>
        {isReordering && (
          <View style={styles.arrowColumn}>
            <Pressable
              onPress={() => handleMove("up")}
              disabled={isFirst}
              style={[styles.arrowBtn, isFirst && styles.arrowBtnDisabled]}
            >
              <Ionicons
                name="chevron-up"
                size={18}
                color={isFirst ? Colors.text.disabled : Colors.text.secondary}
              />
            </Pressable>
            <Pressable
              onPress={() => handleMove("down")}
              disabled={isLast}
              style={[styles.arrowBtn, isLast && styles.arrowBtnDisabled]}
            >
              <Ionicons
                name="chevron-down"
                size={18}
                color={isLast ? Colors.text.disabled : Colors.text.secondary}
              />
            </Pressable>
          </View>
        )}
        <View style={styles.cardContent}>{children}</View>
      </View>
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
    updatePnlStructure,
    savingsGoals,
    updateSavingsGoals,
    transactions,
    rates,
    displayCurrency,
    currentBudgetPeriodLabel,
    canCopyPreviousBudgets,
    copyPreviousBudgets,
  } = useApp();
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [editingGoal, setEditingGoal] = useState<string | null>(null);
  const [goalValue, setGoalValue] = useState("");
  const [showGuide, setShowGuide] = useState(false);
  const [dontShowGuideAgain, setDontShowGuideAgain] = useState(false);
  const [activeTab, setActiveTab] = useState<"presupuestos" | "ahorro">(
    "presupuestos",
  );
  const [isReordering, setIsReordering] = useState(false);

  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const topPadding = insets.top + webTopInset + 16;
  const keyboardBehavior = Platform.OS === "ios" ? "padding" : "height";
  const keyboardVerticalOffset = Platform.OS === "ios" ? 90 : 24;
  const currencySymbol = getDisplayCurrencySymbol(displayCurrency);
  const toDisplay = useCallback((value: number) => convertUSDToDisplayCurrency(value, displayCurrency, rates), [displayCurrency, rates]);

  const variableCategories = pnlStructure.gastos_variables;
  const ahorroCategories = pnlStructure.ahorro;

  const savingsSpending = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const spending: { [category: string]: number } = {};
    transactions.forEach((t) => {
      const d = dayjs(t.date);
      if (
        d.isValid() &&
        d.month() === currentMonth &&
        d.year() === currentYear &&
        t.segment === "ahorro"
      ) {
        spending[t.category] = (spending[t.category] || 0) + (t.amountUSD || 0);
      }
    });
    return spending;
  }, [transactions]);

  const totalSavingsGoal = useMemo(() => {
    return Object.values(savingsGoals).reduce((s, v) => s + v, 0);
  }, [savingsGoals]);

  const totalSaved = useMemo(() => {
    let total = 0;
    ahorroCategories.forEach((cat) => {
      if (savingsGoals[cat]) {
        total += savingsSpending[cat] || 0;
      }
    });
    return total;
  }, [ahorroCategories, savingsGoals, savingsSpending]);

  const overallSavingsProgress =
    totalSavingsGoal > 0 ? (totalSaved / totalSavingsGoal) * 100 : 0;

  useEffect(() => {
    let mounted = true;
    const loadGuidePreference = async () => {
      const dismissed = await AsyncStorage.getItem(BUDGET_GUIDE_DISMISSED_KEY);
      if (!mounted) return;
      const isDismissed = dismissed === "true";
      setDontShowGuideAgain(isDismissed);
      setShowGuide(!isDismissed);
    };

    loadGuidePreference();

    return () => {
      mounted = false;
    };
  }, []);

  const closeGuide = useCallback(async () => {
    if (dontShowGuideAgain) {
      await AsyncStorage.setItem(BUDGET_GUIDE_DISMISSED_KEY, "true");
    } else {
      await AsyncStorage.removeItem(BUDGET_GUIDE_DISMISSED_KEY);
    }
    setShowGuide(false);
  }, [dontShowGuideAgain]);

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
    [editValue, budgets, updateBudgets],
  );

  const handleRemoveBudget = useCallback(
    async (category: string) => {
      const updated = { ...budgets };
      delete updated[category];
      await updateBudgets(updated);
    },
    [budgets, updateBudgets],
  );

  const handleSaveGoal = useCallback(
    async (category: string) => {
      const value = parseFloat(goalValue);
      if (isNaN(value) || value < 0) {
        setEditingGoal(null);
        return;
      }
      const updated = { ...savingsGoals, [category]: value };
      await updateSavingsGoals(updated);
      setEditingGoal(null);
    },
    [goalValue, savingsGoals, updateSavingsGoals],
  );

  const handleRemoveGoal = useCallback(
    async (category: string) => {
      const updated = { ...savingsGoals };
      delete updated[category];
      await updateSavingsGoals(updated);
    },
    [savingsGoals, updateSavingsGoals],
  );

  const moveCategory = useCallback(
    (
      segment: "gastos_variables" | "ahorro",
      fromIdx: number,
      toIdx: number,
    ) => {
      const cats = [...pnlStructure[segment]];
      if (toIdx < 0 || toIdx >= cats.length) return;
      const [moved] = cats.splice(fromIdx, 1);
      cats.splice(toIdx, 0, moved);
      const updated = { ...pnlStructure, [segment]: cats };
      updatePnlStructure(updated);
    },
    [pnlStructure, updatePnlStructure],
  );

  const toggleReordering = useCallback(() => {
    if (isReordering && Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    setIsReordering((prev) => !prev);
  }, [isReordering]);

  const overallProgress = budgetSummary.progress;
  const overallColor =
    overallProgress > 90
      ? "#ef4444"
      : overallProgress > 70
        ? "#eab308"
        : Colors.brand.DEFAULT;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={keyboardBehavior}
      keyboardVerticalOffset={keyboardVerticalOffset}
    >
      <AmbientGlow />
      <ScrollView
        style={{ flex: 1, paddingHorizontal: 24 }}
        contentContainerStyle={{ paddingTop: topPadding, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
      >
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Presupuestos y Ahorro</Text>
            <Text style={styles.subtitle}>
              Control mensual de gastos variables y metas de ahorro
            </Text>
          </View>
          <View style={styles.headerActions}>
            <Pressable onPress={toggleReordering} hitSlop={8}>
              <Ionicons
                name={isReordering ? "checkmark-circle" : "swap-vertical"}
                size={24}
                color={isReordering ? Colors.brand.DEFAULT : Colors.text.muted}
              />
            </Pressable>
            <Pressable onPress={() => setShowGuide(true)} hitSlop={8}>
              <Ionicons
                name="help-circle-outline"
                size={28}
                color={Colors.text.muted}
              />
            </Pressable>
          </View>
        </View>

        <View style={styles.segmentControl}>
          {(
            [
              { id: "presupuestos" as const, label: "Presupuesto" },
              { id: "ahorro" as const, label: "Ahorro" },
            ] as const
          ).map((tab) => (
            <Pressable
              key={tab.id}
              onPress={() => {
                setActiveTab(tab.id);
                setIsReordering(false);
              }}
              style={[
                styles.segmentButton,
                activeTab === tab.id && styles.segmentButtonActive,
              ]}
            >
              <Text
                style={[
                  styles.segmentText,
                  activeTab === tab.id && styles.segmentTextActive,
                ]}
              >
                {tab.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.periodLabel}>{currentBudgetPeriodLabel}</Text>
        {canCopyPreviousBudgets && (
          <Pressable onPress={copyPreviousBudgets} style={styles.copyPreviousBudgetsBtn}>
            <Text style={styles.copyPreviousBudgetsText}>Copiar presupuestos del mes anterior</Text>
          </Pressable>
        )}

        {activeTab === "presupuestos" &&
          budgetSummary.totalBudget > 0 &&
          !isReordering && (
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
                  Gastado: {currencySymbol}{formatCurrency(toDisplay(budgetSummary.variableTotal))}
                </Text>
                <Text style={styles.overallBudget}>
                  Presupuesto: {currencySymbol}{formatCurrency(toDisplay(budgetSummary.totalBudget))}
                </Text>
              </View>
            </View>
          )}

        {activeTab === "presupuestos" &&
          variableCategories.map((cat, idx) => {
            const budget = budgets[cat] || 0;
            const spent = budgetSummary.spending[cat] || 0;
            const catProgress = budget > 0 ? (spent / budget) * 100 : 0;
            const isEditing = editingCategory === cat;

            return (
              <ReorderableCard
                key={cat}
                isReordering={isReordering}
                isFirst={idx === 0}
                isLast={idx === variableCategories.length - 1}
                onMoveUp={() => moveCategory("gastos_variables", idx, idx - 1)}
                onMoveDown={() =>
                  moveCategory("gastos_variables", idx, idx + 1)
                }
              >
                <View style={styles.catHeader}>
                  <Text style={styles.catName}>{cat}</Text>
                  {budget > 0 && !isReordering && (
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
                      keyboardType="decimal-pad"
                      placeholder={`Monto en ${displayCurrency}`}
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
                      <Ionicons
                        name="close"
                        size={20}
                        color={Colors.text.muted}
                      />
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
                        {currencySymbol}{formatCurrency(toDisplay(spent))}
                      </Text>
                      <Text style={styles.catBudget}>
                        / {currencySymbol}{formatCurrency(toDisplay(budget))}
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
                      size={18}
                      color={Colors.segments.gastos_variables.color}
                    />
                    <Text
                      style={[
                        styles.setBudgetText,
                        { color: Colors.segments.gastos_variables.color },
                      ]}
                    >
                      Establecer presupuesto
                    </Text>
                  </Pressable>
                )}
              </ReorderableCard>
            );
          })}

        {activeTab === "ahorro" && totalSavingsGoal > 0 && !isReordering && (
          <View
            style={[
              styles.overallCard,
              { borderColor: "rgba(96,165,250,0.15)" },
            ]}
          >
            <View style={styles.overallHeader}>
              <Text style={styles.overallLabel}>Progreso Total</Text>
              <Text
                style={[
                  styles.overallPercent,
                  {
                    color:
                      overallSavingsProgress >= 100
                        ? "#34d399"
                        : overallSavingsProgress >= 70
                          ? "#eab308"
                          : "#60a5fa",
                  },
                ]}
              >
                {overallSavingsProgress.toFixed(0)}%
              </Text>
            </View>
            <ProgressBar
              progress={overallSavingsProgress}
              color="#60a5fa"
              inverted
            />
            <View style={styles.overallFooter}>
              <Text style={styles.overallSpent}>
                Ahorrado: {currencySymbol}{formatCurrency(toDisplay(totalSaved))}
              </Text>
              <Text style={styles.overallBudget}>
                Meta: {currencySymbol}{formatCurrency(toDisplay(totalSavingsGoal))}
              </Text>
            </View>
          </View>
        )}

        {activeTab === "ahorro" &&
          ahorroCategories.map((cat, idx) => {
            const goal = savingsGoals[cat] || 0;
            const saved = savingsSpending[cat] || 0;
            const catProgress = goal > 0 ? (saved / goal) * 100 : 0;
            const isEditing = editingGoal === cat;

            return (
              <ReorderableCard
                key={cat}
                isReordering={isReordering}
                isFirst={idx === 0}
                isLast={idx === ahorroCategories.length - 1}
                onMoveUp={() => moveCategory("ahorro", idx, idx - 1)}
                onMoveDown={() => moveCategory("ahorro", idx, idx + 1)}
              >
                <View style={styles.catHeader}>
                  <Text style={styles.catName}>{cat}</Text>
                  {goal > 0 && !isReordering && (
                    <Pressable onPress={() => handleRemoveGoal(cat)}>
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
                      style={[styles.editInput, { borderColor: "#60a5fa" }]}
                      value={goalValue}
                      onChangeText={setGoalValue}
                      keyboardType="decimal-pad"
                      placeholder={`Meta en ${displayCurrency}`}
                      placeholderTextColor={Colors.text.disabled}
                      autoFocus
                    />
                    <Pressable
                      onPress={() => handleSaveGoal(cat)}
                      style={[styles.saveBtn, { backgroundColor: "#60a5fa" }]}
                    >
                      <Ionicons name="checkmark" size={20} color="#fff" />
                    </Pressable>
                    <Pressable
                      onPress={() => setEditingGoal(null)}
                      style={styles.cancelBtn}
                    >
                      <Ionicons
                        name="close"
                        size={20}
                        color={Colors.text.muted}
                      />
                    </Pressable>
                  </View>
                ) : goal > 0 ? (
                  <Pressable
                    onPress={() => {
                      setGoalValue(goal.toString());
                      setEditingGoal(cat);
                    }}
                  >
                    <View style={styles.catValues}>
                      <Text style={styles.catSpent}>
                        {currencySymbol}{formatCurrency(toDisplay(saved))}
                      </Text>
                      <Text style={styles.catBudget}>
                        / {currencySymbol}{formatCurrency(toDisplay(goal))}
                      </Text>
                    </View>
                    <ProgressBar
                      progress={catProgress}
                      color="#60a5fa"
                      inverted
                    />
                  </Pressable>
                ) : (
                  <Pressable
                    onPress={() => {
                      setGoalValue("");
                      setEditingGoal(cat);
                    }}
                    style={styles.setBudgetBtn}
                  >
                    <Ionicons
                      name="add-circle-outline"
                      size={18}
                      color="#60a5fa"
                    />
                    <Text style={[styles.setBudgetText, { color: "#60a5fa" }]}>
                      Establecer meta
                    </Text>
                  </Pressable>
                )}
              </ReorderableCard>
            );
          })}

        <Modal
          visible={showGuide}
          transparent
          animationType="fade"
          onRequestClose={closeGuide}
        >
          <Pressable
            style={guideStyles.overlay}
            onPress={closeGuide}
          >
            <Pressable
              style={guideStyles.card}
              onPress={(e) => e.stopPropagation()}
            >
              <Text style={guideStyles.sectionTitle}>Presupuestos para tus gastos variables</Text>
              <Text style={guideStyles.sectionDesc}>
                Controla tus gastos variables definiendo un tope para cada categoria. Cuando te acerques al
                limite, la barra cambiara de color.
              </Text>

              <View style={guideStyles.infoBox}>
                <Text style={guideStyles.infoTitle}>Disponible Flexible</Text>
                <Text style={guideStyles.infoDesc}>
                  Así le llamaremos al dinero que te queda para los gastos variables (flexibles) despues de restar Ahorros y
                  Gastos Fijos a tus Ingresos.
                </Text>
                <View style={guideStyles.formulaRow}>
                  <Text style={guideStyles.formulaText}>INGRESOS</Text>
                  <Text style={guideStyles.formulaOp}> - </Text>
                  <Text style={guideStyles.formulaText}>AHORRO</Text>
                  <Text style={guideStyles.formulaOp}> - </Text>
                  <Text style={guideStyles.formulaText}>FIJOS</Text>
                </View>
              </View>

              <Text style={guideStyles.sectionTitle}>Objetivos de Ahorro</Text>
              <Text style={guideStyles.sectionDesc}>
                Define metas mensuales para tus categorias de{" "}
                <Text style={guideStyles.bold}>Ahorro</Text>. A medida que
                registres movimientos de ahorro, veras tu progreso hacia cada
                meta.
              </Text>

              <Pressable
                onPress={closeGuide}
                style={guideStyles.dismissBtn}
              >
                <Text style={guideStyles.dismissText}>Entendido</Text>
              </Pressable>

              <Pressable
                onPress={() => setDontShowGuideAgain((prev) => !prev)}
                style={guideStyles.checkboxRow}
              >
                <Ionicons
                  name={dontShowGuideAgain ? "checkbox" : "square-outline"}
                  size={20}
                  color={Colors.text.secondary}
                />
                <Text style={guideStyles.checkboxText}>No volver a mostrar</Text>
              </Pressable>
            </Pressable>
          </Pressable>
        </Modal>
      </ScrollView>
    </KeyboardAvoidingView>
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
  checkboxRow: {
    marginTop: 14,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
    alignSelf: "center" as const,
  },
  checkboxText: {
    fontFamily: "Outfit_400Regular",
    fontSize: 13,
    color: Colors.text.muted,
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.base,
  },
  headerRow: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "flex-start" as const,
    marginBottom: 20,
  },
  headerActions: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 20,
  },
  title: {
    fontFamily: "Outfit_900Black",
    fontSize: 22,
    color: Colors.text.primary,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontFamily: "Outfit_500Medium",
    fontSize: 13,
    color: Colors.text.muted,
    marginTop: 4,
  },
  segmentControl: {
    flexDirection: "row" as const,
    backgroundColor: "rgba(15, 23, 42, 0.55)",
    borderRadius: 16,
    padding: 4,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: "center" as const,
  },
  segmentButtonActive: {
    backgroundColor: "#fff",
  },
  segmentText: {
    fontFamily: "Outfit_700Bold",
    fontSize: 13,
    color: Colors.text.muted,
  },
  segmentTextActive: {
    color: "#000",
  },
  periodLabel: {
    fontFamily: "Outfit_500Medium",
    fontSize: 12,
    color: Colors.text.muted,
    marginTop: -8,
    marginBottom: 4,
    textTransform: "capitalize" as const,
  },
  copyPreviousBudgetsBtn: {
    alignSelf: "flex-start" as const,
    marginBottom: 16,
  },
  copyPreviousBudgetsText: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 13,
    color: Colors.brand.DEFAULT,
    textDecorationLine: "underline" as const,
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
    backgroundColor: Colors.dark.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    marginBottom: 10,
    overflow: "hidden" as const,
  },
  cardInner: {
    flexDirection: "row" as const,
    alignItems: "stretch" as const,
  },
  arrowColumn: {
    width: 36,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: 2,
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRightWidth: 1,
    borderRightColor: Colors.dark.borderSubtle,
  },
  arrowBtn: {
    padding: 4,
  },
  arrowBtnDisabled: {
    opacity: 0.3,
  },
  cardContent: {
    flex: 1,
    padding: 16,
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
    backgroundColor: "rgba(255,255,255,0.06)",
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
    justifyContent: "center" as const,
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.dark.borderSubtle,
    borderStyle: "dashed" as const,
  },
  setBudgetText: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 13,
    color: Colors.brand.DEFAULT,
  },
  editRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
  },
  editInput: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
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
