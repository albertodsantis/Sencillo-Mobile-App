import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import AmbientGlow from "@/components/AmbientGlow";
import Colors from "@/constants/colors";
import { useApp } from "@/lib/context/AppContext";
import { getDisplayCurrencySymbol } from "@/lib/domain/finance";

const TOTAL_STEPS = 4;

const FIXED_EXPENSE_OPTIONS = [
  { id: "Alquiler/Hipoteca", emoji: "🏠" },
  { id: "Luz", emoji: "⚡" },
  { id: "Agua", emoji: "💧" },
  { id: "Internet", emoji: "🌐" },
  { id: "Teléfono", emoji: "📱" },
  { id: "Gimnasio", emoji: "💪" },
  { id: "Suscripciones", emoji: "🎬" },
] as const;

const VARIABLE_EXPENSE_OPTIONS = [
  { id: "Supermercado", emoji: "🛒" },
  { id: "Cafeterías", emoji: "☕" },
  { id: "Restaurantes", emoji: "🍽️" },
  { id: "Transporte", emoji: "🚗" },
  { id: "Ropa", emoji: "👕" },
  { id: "Farmacia", emoji: "💊" },
] as const;

function sanitizeNumericInput(value: string): string {
  const cleaned = value.replace(/[^0-9.,]/g, "").replace(",", ".");
  const parts = cleaned.split(".");

  if (parts.length <= 2) return cleaned;
  return `${parts[0]}.${parts.slice(1).join("")}`;
}

function parsePositiveNumber(value: string): number | null {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function SelectionChip({
  label,
  emoji,
  active,
  accentColor,
  onPress,
}: {
  label: string;
  emoji: string;
  active: boolean;
  accentColor: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        {
          borderColor: active ? accentColor : Colors.dark.border,
          backgroundColor: active ? `${accentColor}18` : "rgba(255,255,255,0.03)",
        },
        pressed && styles.chipPressed,
      ]}
    >
      <Text style={styles.chipEmoji}>{emoji}</Text>
      <Text
        style={[
          styles.chipText,
          active && {
            color: Colors.text.primary,
            fontFamily: "Outfit_700Bold",
          },
        ]}
      >
        {label}
      </Text>
      <View
        style={[
          styles.chipCheck,
          active && {
            backgroundColor: accentColor,
            borderColor: accentColor,
          },
        ]}
      >
        {active ? <Ionicons name="checkmark" size={12} color="#fff" /> : null}
      </View>
    </Pressable>
  );
}

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { completeOnboarding, displayCurrency } = useApp();

  const [step, setStep] = useState(0);
  const [fixedCategories, setFixedCategories] = useState<string[]>([]);
  const [variableCategories, setVariableCategories] = useState<string[]>([]);
  const [budgetCategory, setBudgetCategory] = useState<string | null>(null);
  const [budgetLimit, setBudgetLimit] = useState("");
  const [monthlyIncome, setMonthlyIncome] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const topPadding = insets.top + webTopInset + 20;
  const accentColor = useMemo(() => {
    if (step === 0) return Colors.segments.gastos_fijos.color;
    if (step === 1 || step === 2) return Colors.segments.gastos_variables.color;
    return Colors.segments.ingresos.color;
  }, [step]);
  const currencySymbol = getDisplayCurrencySymbol(displayCurrency);

  useEffect(() => {
    if (!budgetCategory || !variableCategories.includes(budgetCategory)) {
      setBudgetCategory(variableCategories[0] ?? null);
    }
  }, [budgetCategory, variableCategories]);

  const toggleMultiSelect = useCallback((value: string, setter: React.Dispatch<React.SetStateAction<string[]>>) => {
    setter((prev) => (
      prev.includes(value)
        ? prev.filter((item) => item !== value)
        : [...prev, value]
    ));
  }, []);

  const goToNextStep = useCallback(() => {
    setStep((prev) => Math.min(prev + 1, TOTAL_STEPS - 1));
  }, []);

  const handleFinish = useCallback(
    async (overrides?: { budgetLimit?: number | null; monthlyIncome?: number | null }) => {
      const parsedBudget = overrides?.budgetLimit ?? parsePositiveNumber(budgetLimit);
      const parsedIncome = overrides?.monthlyIncome ?? parsePositiveNumber(monthlyIncome);

      setIsSaving(true);
      try {
        await completeOnboarding({
          fixedCategories,
          variableCategories,
          budgetCategory: parsedBudget && budgetCategory ? budgetCategory : null,
          budgetLimit: parsedBudget,
          monthlyIncome: parsedIncome,
        });
        router.replace("/(tabs)");
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "No se pudo guardar la configuración inicial.";

        if (Platform.OS === "web") {
          alert(message);
        } else {
          Alert.alert("Error", message);
        }
      } finally {
        setIsSaving(false);
      }
    },
    [
      budgetCategory,
      budgetLimit,
      completeOnboarding,
      fixedCategories,
      monthlyIncome,
      router,
      variableCategories,
    ],
  );

  const handleContinue = useCallback(() => {
    if (step === TOTAL_STEPS - 1) {
      void handleFinish();
      return;
    }

    goToNextStep();
  }, [goToNextStep, handleFinish, step]);

  const handleSkipStep = useCallback(() => {
    if (step === 0) {
      setFixedCategories([]);
      goToNextStep();
      return;
    }

    if (step === 1) {
      setVariableCategories([]);
      setBudgetCategory(null);
      setBudgetLimit("");
      goToNextStep();
      return;
    }

    if (step === 2) {
      setBudgetLimit("");
      goToNextStep();
      return;
    }

    setMonthlyIncome("");
    void handleFinish({ monthlyIncome: null });
  }, [goToNextStep, handleFinish, step]);

  const stepTitle = useMemo(() => {
    if (step === 0) return "¿Cuáles son tus gastos fijos mensuales?";
    if (step === 1) return "¿En qué sueles gastar en el día a día?";
    if (step === 2) {
      return budgetCategory
        ? `¿Cuánto es lo máximo que te gustaría gastar al mes en ${budgetCategory}?`
        : "Define tu primer presupuesto cuando tengas una categoría variable.";
    }
    return "¿Cuál es tu ingreso mensual aproximado para calcular tu capacidad de ahorro?";
  }, [budgetCategory, step]);

  const stepDescription = useMemo(() => {
    if (step === 0) {
      return "Elige solo lo que realmente quieres ver como compromiso fijo dentro de tu presupuesto.";
    }

    if (step === 1) {
      return "Esto nos ayuda a dejar listo el presupuesto de tus gastos más frecuentes desde el primer día.";
    }

    if (step === 2) {
      return budgetCategory
        ? "Este límite aparecerá en tu pantalla de Presupuesto y podrás ajustarlo más tarde."
        : "Si todavía no elegiste una categoría variable, puedes saltar este paso y configurarlo luego.";
    }

    return "Este dato es opcional. Si lo completas, dejaremos un ingreso inicial para que tu tablero no arranque vacío.";
  }, [budgetCategory, step]);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 24}
    >
      <AmbientGlow />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{
          paddingTop: topPadding,
          paddingBottom: insets.bottom + 34,
        }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.shell}>
          <View style={styles.header}>
            <View style={styles.headerRow}>
              <Pressable
                onPress={() => {
                  if (step === 0) return;
                  setStep((prev) => Math.max(prev - 1, 0));
                }}
                disabled={step === 0 || isSaving}
                style={[styles.backButton, step === 0 && styles.backButtonDisabled]}
              >
                <Ionicons name="arrow-back" size={18} color={Colors.text.secondary} />
              </Pressable>
              <Text style={styles.stepLabel}>Paso {step + 1} de {TOTAL_STEPS}</Text>
              <View style={styles.currencyBadge}>
                <Text style={styles.currencyBadgeText}>{displayCurrency}</Text>
              </View>
            </View>
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${((step + 1) / TOTAL_STEPS) * 100}%`,
                    backgroundColor: accentColor,
                  },
                ]}
              />
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.eyebrow}>Configuración inicial</Text>
            <Text style={styles.title}>{stepTitle}</Text>
            <Text style={styles.description}>{stepDescription}</Text>

            {step === 0 ? (
              <View style={styles.chipGrid}>
                {FIXED_EXPENSE_OPTIONS.map((option) => (
                  <SelectionChip
                    key={option.id}
                    label={option.id}
                    emoji={option.emoji}
                    active={fixedCategories.includes(option.id)}
                    accentColor={Colors.segments.gastos_fijos.color}
                    onPress={() => toggleMultiSelect(option.id, setFixedCategories)}
                  />
                ))}
              </View>
            ) : null}

            {step === 1 ? (
              <View style={styles.chipGrid}>
                {VARIABLE_EXPENSE_OPTIONS.map((option) => (
                  <SelectionChip
                    key={option.id}
                    label={option.id}
                    emoji={option.emoji}
                    active={variableCategories.includes(option.id)}
                    accentColor={Colors.segments.gastos_variables.color}
                    onPress={() => toggleMultiSelect(option.id, setVariableCategories)}
                  />
                ))}
              </View>
            ) : null}

            {step === 2 ? (
              <View style={styles.inputStep}>
                {variableCategories.length > 0 ? (
                  <>
                    <Text style={styles.selectorLabel}>Categoría a presupuestar</Text>
                    <View style={styles.chipGrid}>
                      {variableCategories.map((category) => {
                        const chipConfig = VARIABLE_EXPENSE_OPTIONS.find((option) => option.id === category);
                        return (
                          <SelectionChip
                            key={category}
                            label={category}
                            emoji={chipConfig?.emoji ?? "✨"}
                            active={budgetCategory === category}
                            accentColor={Colors.segments.gastos_variables.color}
                            onPress={() => setBudgetCategory(category)}
                          />
                        );
                      })}
                    </View>
                    <View style={styles.bigInputCard}>
                      <Text style={styles.bigInputLabel}>Límite mensual en {displayCurrency}</Text>
                      <View style={styles.bigInputRow}>
                        <Text style={[styles.bigInputSymbol, { color: Colors.segments.gastos_variables.color }]}>
                          {currencySymbol}
                        </Text>
                        <TextInput
                          value={budgetLimit}
                          onChangeText={(text) => setBudgetLimit(sanitizeNumericInput(text))}
                          placeholder="0.00"
                          placeholderTextColor={Colors.text.disabled}
                          keyboardType="decimal-pad"
                          style={styles.bigInput}
                          returnKeyType="done"
                        />
                      </View>
                    </View>
                  </>
                ) : (
                  <View style={styles.emptyState}>
                    <Ionicons
                      name="sparkles-outline"
                      size={28}
                      color={Colors.text.muted}
                    />
                    <Text style={styles.emptyStateTitle}>Todavía no hay categoría seleccionada</Text>
                    <Text style={styles.emptyStateText}>
                      Puedes volver al paso anterior para elegir una o seguir y configurarlo luego desde Presupuesto.
                    </Text>
                  </View>
                )}
              </View>
            ) : null}

            {step === 3 ? (
              <View style={styles.inputStep}>
                <View style={styles.bigInputCard}>
                  <Text style={styles.bigInputLabel}>Ingreso mensual aproximado en {displayCurrency}</Text>
                  <View style={styles.bigInputRow}>
                    <Text style={[styles.bigInputSymbol, { color: Colors.segments.ingresos.color }]}>
                      {currencySymbol}
                    </Text>
                    <TextInput
                      value={monthlyIncome}
                      onChangeText={(text) => setMonthlyIncome(sanitizeNumericInput(text))}
                      placeholder="0.00"
                      placeholderTextColor={Colors.text.disabled}
                      keyboardType="decimal-pad"
                      style={styles.bigInput}
                      returnKeyType="done"
                    />
                  </View>
                </View>
                <Text style={styles.helperText}>
                  Si prefieres, puedes saltar este paso y registrar tus ingresos reales después.
                </Text>
              </View>
            ) : null}

            <View style={styles.actions}>
              <Pressable
                onPress={handleContinue}
                disabled={isSaving}
                style={({ pressed }) => [
                  styles.primaryButton,
                  { backgroundColor: accentColor },
                  pressed && !isSaving && styles.primaryButtonPressed,
                  isSaving && styles.primaryButtonDisabled,
                ]}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.primaryButtonText}>
                    {step === TOTAL_STEPS - 1 ? "Guardar configuración" : "Continuar"}
                  </Text>
                )}
              </Pressable>

              <Pressable
                onPress={handleSkipStep}
                disabled={isSaving}
                style={({ pressed }) => [
                  styles.skipButton,
                  pressed && !isSaving && styles.skipButtonPressed,
                ]}
              >
                <Text style={styles.skipButtonText}>Saltar este paso</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.base,
  },
  scroll: {
    flex: 1,
  },
  shell: {
    paddingHorizontal: 24,
  },
  header: {
    marginBottom: 18,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: Colors.dark.border,
    alignItems: "center",
    justifyContent: "center",
  },
  backButtonDisabled: {
    opacity: 0.4,
  },
  stepLabel: {
    fontFamily: "Outfit_700Bold",
    fontSize: 13,
    color: Colors.text.secondary,
  },
  currencyBadge: {
    minWidth: 54,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: Colors.dark.border,
    alignItems: "center",
  },
  currencyBadgeText: {
    fontFamily: "Outfit_700Bold",
    fontSize: 11,
    color: Colors.text.primary,
    letterSpacing: 0.8,
  },
  progressTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.06)",
    overflow: "hidden",
  },
  progressFill: {
    height: 8,
    borderRadius: 999,
  },
  card: {
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 28,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    padding: 24,
  },
  eyebrow: {
    fontFamily: "Outfit_700Bold",
    fontSize: 11,
    color: Colors.text.muted,
    textTransform: "uppercase",
    letterSpacing: 1.4,
    marginBottom: 10,
  },
  title: {
    fontFamily: "Outfit_900Black",
    fontSize: 28,
    lineHeight: 34,
    color: Colors.text.primary,
    letterSpacing: -0.8,
  },
  description: {
    fontFamily: "Outfit_500Medium",
    fontSize: 14,
    lineHeight: 22,
    color: Colors.text.secondary,
    marginTop: 10,
    marginBottom: 22,
  },
  chipGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  chip: {
    width: "48%",
    minHeight: 92,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 14,
    justifyContent: "space-between",
  },
  chipPressed: {
    transform: [{ scale: 0.98 }],
  },
  chipEmoji: {
    fontSize: 24,
    marginBottom: 10,
  },
  chipText: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 14,
    lineHeight: 18,
    color: Colors.text.secondary,
    paddingRight: 28,
  },
  chipCheck: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  inputStep: {
    gap: 18,
  },
  selectorLabel: {
    fontFamily: "Outfit_700Bold",
    fontSize: 12,
    color: Colors.text.muted,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: -6,
  },
  bigInputCard: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    paddingHorizontal: 20,
    paddingVertical: 18,
  },
  bigInputLabel: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 13,
    color: Colors.text.muted,
    marginBottom: 12,
  },
  bigInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  bigInputSymbol: {
    fontFamily: "Outfit_800ExtraBold",
    fontSize: 32,
  },
  bigInput: {
    flex: 1,
    fontFamily: "Outfit_900Black",
    fontSize: 38,
    color: Colors.text.primary,
    letterSpacing: -1.1,
    paddingVertical: 0,
  },
  helperText: {
    fontFamily: "Outfit_500Medium",
    fontSize: 13,
    lineHeight: 20,
    color: Colors.text.muted,
  },
  emptyState: {
    borderRadius: 22,
    paddingHorizontal: 20,
    paddingVertical: 26,
    alignItems: "center",
    backgroundColor: Colors.dark.surface,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  emptyStateTitle: {
    fontFamily: "Outfit_700Bold",
    fontSize: 16,
    color: Colors.text.primary,
    marginTop: 12,
    marginBottom: 8,
    textAlign: "center",
  },
  emptyStateText: {
    fontFamily: "Outfit_500Medium",
    fontSize: 13,
    lineHeight: 20,
    color: Colors.text.muted,
    textAlign: "center",
  },
  actions: {
    marginTop: 26,
    gap: 10,
  },
  primaryButton: {
    borderRadius: 18,
    paddingVertical: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
  primaryButtonDisabled: {
    opacity: 0.7,
  },
  primaryButtonText: {
    fontFamily: "Outfit_700Bold",
    fontSize: 16,
    color: "#fff",
  },
  skipButton: {
    paddingVertical: 12,
    alignItems: "center",
  },
  skipButtonPressed: {
    opacity: 0.75,
  },
  skipButtonText: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 14,
    color: Colors.text.muted,
  },
});
