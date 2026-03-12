import { generateRecurrences } from "./finance";
import type {
  Currency,
  RecurrenceType,
  Segment,
  Transaction,
  TransactionType,
} from "./types";

interface BuildTransactionDraftInput {
  type: TransactionType;
  segment: Segment;
  amount: number;
  currency: Currency;
  originalRate: number;
  amountUSD: number;
  category: string;
  description: string;
  date: string;
}

interface ExpandTransactionDraftsInput {
  draft: Omit<Transaction, "id">;
  recurrence: RecurrenceType;
  registerAsSavings: boolean;
  savingsCategory: string;
}

export function buildTransactionDraft({
  type,
  segment,
  amount,
  currency,
  originalRate,
  amountUSD,
  category,
  description,
  date,
}: BuildTransactionDraftInput): Omit<Transaction, "id"> {
  return {
    type,
    segment,
    amount,
    currency,
    originalRate,
    amountUSD,
    category,
    description,
    date,
    profileId: "",
  };
}

export function expandTransactionDrafts({
  draft,
  recurrence,
  registerAsSavings,
  savingsCategory,
}: ExpandTransactionDraftsInput): Omit<Transaction, "id">[] {
  const dates =
    recurrence !== "none"
      ? [draft.date, ...generateRecurrences(draft.date, recurrence)]
      : [draft.date];

  if (!registerAsSavings || draft.segment !== "ingresos") {
    return dates.map((date) => ({ ...draft, date }));
  }

  return dates.flatMap((date) => {
    const incomeDraft = { ...draft, date };
    const savingsDraft: Omit<Transaction, "id"> = {
      ...draft,
      date,
      type: "expense",
      segment: "ahorro",
      category: savingsCategory,
    };

    return [incomeDraft, savingsDraft];
  });
}
