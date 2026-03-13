import type { DisplayCurrency, Transaction } from "./types";
import { fromDisplayValueToUSD } from "./displayCurrency";

export const TOTAL_ONBOARDING_STEPS = 4;

export const FIXED_EXPENSE_OPTIONS = [
  { id: "Alquiler/Hipoteca", iconName: "home-outline" },
  { id: "Luz", iconName: "flash-outline" },
  { id: "Agua", iconName: "water-outline" },
  { id: "Internet", iconName: "wifi-outline" },
  { id: "Telefono", iconName: "phone-portrait-outline" },
  { id: "Gimnasio", iconName: "barbell-outline" },
  { id: "Suscripciones", iconName: "play-circle-outline" },
] as const;

export const VARIABLE_EXPENSE_OPTIONS = [
  { id: "Supermercado", iconName: "cart-outline" },
  { id: "Cafeterias", iconName: "cafe-outline" },
  { id: "Restaurantes", iconName: "restaurant-outline" },
  { id: "Transporte", iconName: "car-outline" },
  { id: "Ropa", iconName: "shirt-outline" },
  { id: "Farmacia", iconName: "medical-outline" },
] as const;

export function getOnboardingStepTitle(step: number, budgetCategory: string | null): string {
  if (step === 0) return "Cuales son tus gastos fijos mensuales?";
  if (step === 1) return "En que sueles gastar en el dia a dia?";
  if (step === 2) {
    return budgetCategory
      ? `Cuanto es lo maximo que te gustaria gastar al mes en ${budgetCategory}?`
      : "Define tu primer presupuesto cuando tengas una categoria variable.";
  }

  return "Cual es tu ingreso mensual aproximado para calcular tu capacidad de ahorro?";
}

export function getOnboardingStepDescription(
  step: number,
  budgetCategory: string | null,
): string {
  if (step === 0) {
    return "Elige solo lo que realmente quieres ver como compromiso fijo dentro de tu presupuesto.";
  }

  if (step === 1) {
    return "Esto nos ayuda a dejar listo el presupuesto de tus gastos mas frecuentes desde el primer dia.";
  }

  if (step === 2) {
    return budgetCategory
      ? "Este limite aparecera en tu pantalla de Presupuesto y podras ajustarlo mas tarde."
      : "Si todavia no elegiste una categoria variable, puedes saltar este paso y configurarlo luego.";
  }

  return "Este dato es opcional. Si lo completas, dejaremos un ingreso inicial para que tu tablero no arranque vacio.";
}

export function buildInitialIncomeTransaction({
  date,
  displayCurrency,
  eurCross,
  incomeCategory,
  monthlyIncome,
}: {
  date: string;
  displayCurrency: DisplayCurrency;
  eurCross: number;
  incomeCategory: string;
  monthlyIncome: number;
}): Omit<Transaction, "id"> {
  const normalizedIncomeUSD = fromDisplayValueToUSD(monthlyIncome, displayCurrency, eurCross);

  return {
    type: "income",
    segment: "ingresos",
    amount: monthlyIncome,
    currency: displayCurrency,
    originalRate: displayCurrency === "EUR" ? eurCross : 1,
    amountUSD: normalizedIncomeUSD,
    category: incomeCategory,
    description: "Configuracion inicial",
    date,
    profileId: "",
  };
}
