import { createClient } from "@/lib/supabase/client";

/**
 * Generates recurring transactions for the current month if not already generated.
 * Called once per session after login (fire-and-forget).
 */
export async function generateRecurringTransactions(uid: string): Promise<void> {
  const supabase = createClient();

  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const today = now.getDate();

  // Fetch all recurring transactions for this user
  const { data: recurring, error } = await supabase
    .from("transactions")
    .select("*")
    .eq("uid", uid)
    .eq("is_recurring", true);

  if (error || !recurring?.length) return;

  for (const txn of recurring) {
    // Only generate on or after the configured recurring day
    if (txn.recurring_day && today < txn.recurring_day) continue;

    // Check if already generated this month
    const alreadyExists = await supabase
      .from("transactions")
      .select("id")
      .eq("uid", uid)
      .eq("description", txn.description)
      .eq("is_recurring", false)
      .like("date", `${currentMonth}%`)
      .maybeSingle();

    if (alreadyExists.data) continue; // already generated

    // Generate the transaction for this month on the configured day
    const generationDate = `${currentMonth}-${String(txn.recurring_day ?? 1).padStart(2, "0")}`;

    await supabase.from("transactions").insert({
      uid,
      description: txn.description,
      amount: txn.amount,
      category: txn.category,
      type: txn.type,
      date: generationDate,
      source: "recurring",
      transaction_layer: txn.transaction_layer,
      is_recurring: false,
      recurring_day: null,
    });

    // Update last_generated on the template
    await supabase
      .from("transactions")
      .update({ last_generated: generationDate })
      .eq("id", txn.id);
  }
}
