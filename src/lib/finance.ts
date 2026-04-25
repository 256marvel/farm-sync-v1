import type { Database } from "@/integrations/supabase/types";

export type TxKind = Database["public"]["Enums"]["transaction_kind"];
export type TxCategory = Database["public"]["Enums"]["transaction_category"];
export type FarmTransaction = Database["public"]["Tables"]["farm_transactions"]["Row"];

export const INCOME_CATEGORIES: { value: TxCategory; label: string }[] = [
  { value: "egg_sales", label: "Egg Sales" },
  { value: "bird_sales", label: "Bird Sales" },
  { value: "manure_sales", label: "Manure Sales" },
  { value: "other_income", label: "Other Income" },
];

export const EXPENSE_CATEGORIES: { value: TxCategory; label: string }[] = [
  { value: "feed", label: "Feed" },
  { value: "medicine", label: "Medicine" },
  { value: "vaccines", label: "Vaccines" },
  { value: "utilities", label: "Utilities (water, power)" },
  { value: "repairs", label: "Repairs & Maintenance" },
  { value: "transport", label: "Transport" },
  { value: "salaries", label: "Salaries" },
  { value: "equipment", label: "Equipment" },
  { value: "other_expense", label: "Other Expense" },
];

export const LOSS_CATEGORIES: { value: TxCategory; label: string }[] = [
  { value: "mortality_loss", label: "Mortality Loss" },
  { value: "theft", label: "Theft" },
  { value: "damage", label: "Damage" },
  { value: "other_loss", label: "Other Loss" },
];

export const CATEGORIES_BY_KIND: Record<TxKind, { value: TxCategory; label: string }[]> = {
  income: INCOME_CATEGORIES,
  expense: EXPENSE_CATEGORIES,
  loss: LOSS_CATEGORIES,
};

export const PAYMENT_METHODS = ["Cash", "Mobile Money", "Bank Transfer", "Cheque", "Credit"] as const;

export const formatCategory = (c: TxCategory): string =>
  c.replace(/_/g, " ").replace(/\b\w/g, (s) => s.toUpperCase());

export const KIND_META: Record<TxKind, { label: string; tone: string; ring: string }> = {
  income: { label: "Income", tone: "text-secondary", ring: "ring-secondary/30" },
  expense: { label: "Expense", tone: "text-destructive", ring: "ring-destructive/30" },
  loss: { label: "Loss", tone: "text-amber-600 dark:text-amber-400", ring: "ring-amber-500/30" },
};
