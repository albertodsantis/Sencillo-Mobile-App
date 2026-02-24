export type Segment = 'ingresos' | 'ahorro' | 'gastos_fijos' | 'gastos_variables';
export type TransactionType = 'income' | 'expense';
export type Currency = 'VES' | 'USD' | 'EUR';
export type DisplayCurrency = 'USD' | 'EUR';
export type RateType = 'bcv' | 'parallel' | 'manual';
export type ViewMode = 'month' | 'ytd' | 'year';
export type Granularity = 'daily' | 'weekly' | 'monthly' | 'yearly';
export type RecurrenceType = 'none' | 'weekly' | 'monthly' | 'quarterly' | 'quadrimester' | 'biannual';

export interface Rates {
  bcv: number;
  parallel: number;
  eur: number;
  eurCross: number;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  segment: Segment;
  amount: number;
  currency: Currency;
  originalRate: number;
  amountUSD: number;
  category: string;
  description?: string;
  date: string;
  profileId: string;
}

export interface PnlStructure {
  ingresos: string[];
  gastos_fijos: string[];
  gastos_variables: string[];
  ahorro: string[];
}

export interface Budgets {
  [category: string]: number;
}

export interface SavingsGoals {
  [category: string]: number;
}

export interface DashboardData {
  balance: number;
  ingresos: number;
  ingresosVES: number;
  ingresosHard: number;
  gastosFijos: number;
  gastosFijosVES: number;
  gastosFijosHard: number;
  gastosVariables: number;
  gastosVariablesVES: number;
  gastosVariablesHard: number;
  ahorro: number;
  ahorroVES: number;
  ahorroHard: number;
}

export interface BudgetSummary {
  variableTotal: number;
  income: number;
  savings: number;
  fixed: number;
  realAvailable: number;
  totalBudget: number;
  progress: number;
  spending: { [category: string]: number };
}

export const SEGMENT_CONFIG: Record<Segment, { label: string; type: TransactionType; color: string; bg: string }> = {
  ingresos: { label: 'Ingresos', type: 'income', color: '#34d399', bg: 'rgba(52, 211, 153, 0.1)' },
  ahorro: { label: 'Ahorro', type: 'expense', color: '#60a5fa', bg: 'rgba(96, 165, 250, 0.1)' },
  gastos_fijos: { label: 'Gastos Fijos', type: 'expense', color: '#fb923c', bg: 'rgba(251, 146, 60, 0.1)' },
  gastos_variables: { label: 'Gastos Variables', type: 'expense', color: '#fb7185', bg: 'rgba(251, 113, 133, 0.1)' },
};

export const DEFAULT_PNL: PnlStructure = {
  ingresos: ['Sueldo', 'Honorarios', 'Ventas'],
  gastos_fijos: ['Alquiler', 'Internet', 'Condominio', 'Colegio', 'Suscripciones'],
  gastos_variables: ['Mercado', 'Salidas', 'Salud', 'Transporte', 'Gustos'],
  ahorro: ['Ahorro General'],
};

export interface UserProfile {
  firstName: string;
  lastName: string;
  phonePrefix: string;
  phoneNumber: string;
  email: string;
  password: string;
}

export const DEFAULT_PROFILE: UserProfile = {
  firstName: '',
  lastName: '',
  phonePrefix: '+58',
  phoneNumber: '',
  email: '',
  password: '',
};

export const RECURRENCE_OPTIONS: { id: RecurrenceType; label: string }[] = [
  { id: 'none', label: 'No repetir' },
  { id: 'weekly', label: 'Semanalmente' },
  { id: 'monthly', label: 'Mensualmente' },
  { id: 'quarterly', label: 'Trimestral (c/3 meses)' },
  { id: 'quadrimester', label: 'Cuatrimestral (c/4 meses)' },
  { id: 'biannual', label: 'Semestral (c/6 meses)' },
];
