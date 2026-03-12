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
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import AmbientGlow from "@/components/AmbientGlow";
import Colors from "@/constants/colors";
import { useApp } from "@/lib/context/AppContext";
import { getDisplayCurrencySymbol } from "@/lib/domain/finance";
import {
  FIXED_EXPENSE_OPTIONS,
  getOnboardingStepDescription,
  getOnboardingStepTitle,
  TOTAL_ONBOARDING_STEPS,
  VARIABLE_EXPENSE_OPTIONS,
} from "@/lib/domain/onboarding";

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
  width,
  onPress,
}: {
  label: string;
  emoji: string;
  active: boolean;
  accentColor: string;
  width: number;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      style={({ pressed }) => [
        styles.chip,
        { width },
        {
          borderColor: active ? accentColor : Colors.dark.border,
          backgroundColor: active ? `${accentColor}18` : "rgba(255,255,255,0.03)",
        },
        pressed && styles.chipPressed,
      ]}
    >
      <View style={styles.chipMain}>
        <View
          style={[
            styles.chipIconWrap,
            active && {
              backgroundColor: `${accentColor}22`,
              borderColor: `${accentColor}55`,
            },
          ]}
        >
          <Text style={styles.chipEmoji}>{emoji}</Text>
        </View>
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
      </View>
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
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
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
  const shellPadding = windowWidth < 390 ? 18 : 24;
  const cardPadding = windowWidth < 390 ? 18 : 24;
  const chipGap = 10;
  const contentMaxWidth = 640;
  const topPadding = insets.top + webTopInset + 12;
  const bottomPadding = insets.bottom + 24;
  const cardWidth = Math.min(windowWidth - shellPadding * 2, contentMaxWidth);
  const cardInnerWidth = Math.max(cardWidth - cardPadding * 2, 0);
  const useTwoColumnChips = cardInnerWidth >= 320;
  const chipWidth = useTwoColumnChips ? (cardInnerWidth - chipGap) / 2 : cardInnerWidth;
  const contentMinHeight = Math.max(windowHeight - topPadding - bottomPadding, 0);
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
    setStep((prev) => Math.min(prev + 1, TOTAL_ONBOARDING_STEPS - 1));
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
            : "No se pudo guardar la configuracion inicial.";

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
    if (step === TOTAL_ONBOARDING_STEPS - 1) {
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

  const stepTitle = useMemo(
    () => getOnboardingStepTitle(step, budgetCategory),
    [budgetCategory, step],
  );
  const stepDescription = useMemo(
    () => getOnboardingStepDescription(step, budgetCategory),
    [budgetCategory, step],
  );

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
          flexGrow: 1,
          paddingTop: topPadding,
          paddingBottom: bottomPadding,
        }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View
          style={[
            styles.shell,
            {
              paddingHorizontal: shellPadding,
              minHeight: contentMinHeight,
              maxWidth: contentMaxWidth + shellPadding * 2,
            },
          ]}
        >
          <View style={styles.header}>
            <View style={styles.headerRow}>
              <Pressable
                onPress={() => {
                  if (step === 0) return;
                  setStep((prev) => Math.max(prev - 1, 0));
                }}
                disabled={step === 0 || isSaving}
                accessibilityRole="button"
                accessibilityLabel="Volver al paso anterior"
                style={[styles.backButton, step === 0 && styles.backButtonDisabled]}
              >
                <Ionicons name="arrow-back" size={18} color={Colors.text.secondary} />
              </Pressable>
              <Text style={styles.stepLabel}>Paso {step + 1} de {TOTAL_ONBOARDING_STEPS}</Text>
              <View style={styles.currencyBadge}>
                <Text style={styles.currencyBadgeText}>{displayCurrency}</Text>
              </View>
            </View>
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${((step + 1) / TOTAL_ONBOARDING_STEPS) * 100}%`,
                    backgroundColor: accentColor,
                  },
                ]}
              />
            </View>
          </View>

          <View style={[styles.card, { padding: cardPadding }]}>
            <Text style={styles.eyebrow}>Configuracion inicial</Text>
            <Text style={styles.title}>{stepTitle}</Text>
            <Text style={styles.description}>{stepDescription}</Text>

            {step === 0 ? (
              <View style={[styles.chipGrid, { gap: chipGap }]}>
                {FIXED_EXPENSE_OPTIONS.map((option) => (
                  <SelectionChip
                    key={option.id}
                    label={option.id}
                    emoji={option.emoji}
                    active={fixedCategories.includes(option.id)}
                    accentColor={Colors.segments.gastos_fijos.color}
                    width={chipWidth}
                    onPress={() => toggleMultiSelect(option.id, setFixedCategories)}
                  />
                ))}
              </View>
            ) : null}

            {step === 1 ? (
              <View style={[styles.chipGrid, { gap: chipGap }]}>
                {VARIABLE_EXPENSE_OPTIONS.map((option) => (
                  <SelectionChip
                    key={option.id}
                    label={option.id}
                    emoji={option.emoji}
                    active={variableCategories.includes(option.id)}
                    accentColor={Colors.segments.gastos_variables.color}
                    width={chipWidth}
                    onPress={() => toggleMultiSelect(option.id, setVariableCategories)}
                  />
                ))}
              </View>
            ) : null}

            {step === 2 ? (
              <View style={styles.inputStep}>
                {variableCategories.length > 0 ? (
                  <>
                    <Text style={styles.selectorLabel}>Categoria a presupuestar</Text>
                    <View style={[styles.chipGrid, { gap: chipGap }]}>
                      {variableCategories.map((category) => {
                        const chipConfig = VARIABLE_EXPENSE_OPTIONS.find((option) => option.id === category);
                        return (
                          <SelectionChip
                            key={category}
                            label={category}
                            emoji={chipConfig?.emoji ?? "Extra"}
                            active={budgetCategory === category}
                            accentColor={Colors.segments.gastos_variables.color}
                            width={chipWidth}
                            onPress={() => setBudgetCategory(category)}
                          />
                        );
                      })}
                    </View>
                    <View style={styles.bigInputCard}>
                      <Text style={styles.bigInputLabel}>Limite mensual en {displayCurrency}</Text>
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
                    <Text style={styles.emptyStateTitle}>Todavia no hay categoria seleccionada</Text>
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
                  Si prefieres, puedes saltar este paso y registrar tus ingresos reales despues.
                </Text>
              </View>
            ) : null}

            <View style={styles.actions}>
              <Pressable
                onPress={handleContinue}
                disabled={isSaving}
                accessibilityRole="button"
                accessibilityLabel={step === TOTAL_ONBOARDING_STEPS - 1 ? "Guardar configuracion inicial" : "Continuar onboarding"}
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
                    {step === TOTAL_ONBOARDING_STEPS - 1 ? "Guardar configuracion" : "Continuar"}
                  </Text>
                )}
              </Pressable>

              <Pressable
                onPress={handleSkipStep}
                disabled={isSaving}
                accessibilityRole="button"
                accessibilityLabel="Saltar este paso"
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
    width: "100%",
    alignSelf: "center",
  },
  header: {
    marginBottom: 14,
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
    height: 6,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.06)",
    overflow: "hidden",
  },
  progressFill: {
    height: 6,
    borderRadius: 999,
  },
  card: {
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 28,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    flexGrow: 1,
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
    fontSize: 25,
    lineHeight: 30,
    color: Colors.text.primary,
    letterSpacing: -0.8,
  },
  description: {
    fontFamily: "Outfit_500Medium",
    fontSize: 14,
    lineHeight: 20,
    color: Colors.text.secondary,
    marginTop: 8,
    marginBottom: 18,
  },
  chipGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  chip: {
    minHeight: 76,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  chipPressed: {
    transform: [{ scale: 0.98 }],
  },
  chipMain: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  chipIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.04)",
  },
  chipEmoji: {
    fontSize: 20,
  },
  chipText: {
    fontFamily: "Outfit_600SemiBold",
    flex: 1,
    fontSize: 15,
    lineHeight: 18,
    color: Colors.text.secondary,
  },
  chipCheck: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  inputStep: {
    gap: 14,
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
    paddingHorizontal: 18,
    paddingVertical: 16,
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
    fontSize: 28,
  },
  bigInput: {
    flex: 1,
    fontFamily: "Outfit_900Black",
    fontSize: 34,
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
    paddingVertical: 22,
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
    marginTop: "auto",
    paddingTop: 20,
    gap: 10,
  },
  primaryButton: {
    borderRadius: 18,
    paddingVertical: 15,
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
