import { z } from "zod";

// ─── User / Profile ─────────────────────────────────────────────────────────

export const ProfileSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  display_name: z.string().nullable(),
  avatar_url: z.string().nullable(),
  total_xp: z.number().default(0),
  onboarding_complete: z.boolean().default(false),
  created_at: z.string(),
});
export type Profile = z.infer<typeof ProfileSchema>;

// ─── Finance ─────────────────────────────────────────────────────────────────

export const FinancialConfigSchema = z.object({
  id: z.string().uuid(),
  uid: z.string().uuid(),
  salary: z.number().default(0),
  updated_at: z.string(),
});
export type FinancialConfig = z.infer<typeof FinancialConfigSchema>;

export const FixedExpenseSchema = z.object({
  id: z.string().uuid(),
  uid: z.string().uuid(),
  name: z.string(),
  amount: z.number(),
  category: z.string(),
  is_active: z.boolean().default(true),
  created_at: z.string(),
});
export type FixedExpense = z.infer<typeof FixedExpenseSchema>;

export const TransactionLayerSchema = z.enum([
  "fixed",
  "extra",
  "variable",
]);
export type TransactionLayer = z.infer<typeof TransactionLayerSchema>;

export const TransactionSchema = z.object({
  id: z.string().uuid(),
  uid: z.string().uuid(),
  type: z.enum(["income", "expense"]),
  amount: z.number(),
  category: z.string(),
  description: z.string(),
  date: z.string(),
  source: z.string().default("manual"),
  transaction_layer: TransactionLayerSchema.default("variable"),
  is_recurring: z.boolean().default(false),
  recurring_day: z.number().nullable().optional(),
  recurring_source_id: z.string().uuid().nullable().optional(),
  last_generated: z.string().nullable().optional(),
  created_at: z.string(),
});
export type Transaction = z.infer<typeof TransactionSchema>;



// ─── Habits ───────────────────────────────────────────────────────────────────

export const HabitSchema = z.object({
  id: z.string().uuid(),
  uid: z.string().uuid(),
  name: z.string(),
  emoji: z.string().default("⭐"),
  color: z.string().default("#8B5CF6"),
  frequency: z.enum(["daily", "weekly"]).default("daily"),
  xp_value: z.number().default(30),
  streak: z.number().default(0),
  is_active: z.boolean().default(true),
  created_at: z.string(),
});
export type Habit = z.infer<typeof HabitSchema>;

export const HabitLogSchema = z.object({
  id: z.string().uuid(),
  habit_id: z.string().uuid(),
  uid: z.string().uuid(),
  date_key: z.string(), // YYYY-MM-DD
  completed: z.boolean().default(false),
  logged_at: z.string(),
});
export type HabitLog = z.infer<typeof HabitLogSchema>;

// ─── Goals ────────────────────────────────────────────────────────────────────

export const GoalSchema = z.object({
  id: z.string().uuid(),
  uid: z.string().uuid(),
  name: z.string(),
  category: z.string(),
  emoji: z.string().default("🎯"),
  target_amount: z.number(),
  saved_amount: z.number().default(0),
  deadline: z.string().nullable(),
  monthly_planned: z.number().default(0),
  created_at: z.string(),
});
export type Goal = z.infer<typeof GoalSchema>;

export const GoalContributionSchema = z.object({
  id: z.string().uuid(),
  goal_id: z.string().uuid(),
  uid: z.string().uuid(),
  amount: z.number(),
  note: z.string().nullable(),
  date: z.string(),
  created_at: z.string(),
});
export type GoalContribution = z.infer<typeof GoalContributionSchema>;

// ─── Atlas ────────────────────────────────────────────────────────────────────

export const AtlasMessageSchema = z.object({
  id: z.string(),
  role: z.enum(["user", "atlas"]),
  content: z.string(),
  created_at: z.string(),
});
export type AtlasMessage = z.infer<typeof AtlasMessageSchema>;

// ─── Finance Summary ─────────────────────────────────────────────────────────

export interface FinanceSummary {
  salary: number;
  totalFixed: number;
  availableBalance: number;
  totalExtras: number;
  totalVariable: number;
  realBalance: number;
  fixedPercent: number;
  savingsPercent: number;
}
