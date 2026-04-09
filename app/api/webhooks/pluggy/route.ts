import { PluggyClient } from "pluggy-sdk";
import { createClient } from "@/lib/supabase/server";

// ──────────────────────────────────────────────────────────────
// Types for Pluggy webhook events
// ──────────────────────────────────────────────────────────────
interface PluggyWebhookEvent {
  event: string;
  itemId: string;
  error?: { code: string; message: string };
}

// ──────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────
function getPluggyClient(): PluggyClient {
  const clientId = process.env.PLUGGY_CLIENT_ID;
  const clientSecret = process.env.PLUGGY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Pluggy credentials not configured");
  }

  return new PluggyClient({ clientId, clientSecret });
}

/**
 * Fetches all accounts from a Pluggy item, then fetches transactions
 * from the last 30 days and upserts them into Supabase.
 */
async function syncBankTransactions(itemId: string): Promise<void> {
  const supabase = await createClient();
  const pluggy = getPluggyClient();

  // 1. Resolve item → find the uid from our bank_connections table
  const { data: bankConn, error: bankError } = await supabase
    .from("bank_connections")
    .select("uid, bank_name")
    .eq("item_id", itemId)
    .single();

  if (bankError || !bankConn) {
    console.error(`[pluggy-webhook] bank_connection not found for itemId=${itemId}`);
    return;
  }

  const { uid, bank_name } = bankConn;

  // 2. Fetch all accounts for this item
  const accountsResponse = await pluggy.fetchAccounts(itemId);
  const accounts = accountsResponse.results;

  if (!accounts?.length) {
    console.log(`[pluggy-webhook] No accounts found for itemId=${itemId}`);
    return;
  }

  // 3. Sync transactions from the last 30 days for each account
  const dateFrom = new Date();
  dateFrom.setDate(dateFrom.getDate() - 30);
  const dateFromStr = dateFrom.toISOString().split("T")[0];

  let totalSynced = 0;

  for (const account of accounts) {
    try {
      const transactions = await pluggy.fetchAllTransactions(account.id, {
        dateFrom: dateFromStr,
      });

      if (!transactions?.length) continue;

      // 4. Map Pluggy transactions → Supabase format
      const rows = transactions.map((txn) => ({
        uid,
        description: txn.description ?? `${bank_name} - transação`,
        amount: Math.abs(txn.amount),
        category: normalizeCategory(txn.category ?? ""),
        // Pluggy: positive = credit (income), negative = debit (expense)
        type: txn.amount > 0 ? "income" : "expense",
        date: new Date(txn.date).toISOString().split("T")[0],
        source: "pluggy",
        transaction_layer: "bank",
        pluggy_id: txn.id,
      }));

      // 5. Upsert with pluggy_id conflict to avoid duplicates
      const { error: upsertError } = await supabase
        .from("transactions")
        .upsert(rows, { onConflict: "pluggy_id", ignoreDuplicates: true });

      if (upsertError) {
        console.error(
          `[pluggy-webhook] upsert error for account ${account.id}:`,
          upsertError.message
        );
      } else {
        totalSynced += rows.length;
      }
    } catch (err) {
      console.error(
        `[pluggy-webhook] Error fetching transactions for account ${account.id}:`,
        err
      );
    }
  }

  // 6. Update last_sync timestamp in bank_connections
  await supabase
    .from("bank_connections")
    .update({ last_sync: new Date().toISOString() })
    .eq("item_id", itemId);

  console.log(
    `[pluggy-webhook] Synced ${totalSynced} transactions for itemId=${itemId}`
  );
}

/**
 * Updates bank_connections.status for a given itemId.
 */
async function updateBankStatus(
  itemId: string,
  status: "active" | "error" | "outdated"
): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("bank_connections")
    .update({ status, last_sync: new Date().toISOString() })
    .eq("item_id", itemId);

  if (error) {
    console.error(
      `[pluggy-webhook] Failed to update status for itemId=${itemId}:`,
      error.message
    );
  } else {
    console.log(
      `[pluggy-webhook] Updated status=${status} for itemId=${itemId}`
    );
  }
}

/**
 * Maps Pluggy category strings to our internal categories.
 */
function normalizeCategory(pluggyCategory: string): string {
  const map: Record<string, string> = {
    Food: "alimentacao",
    "Food and Drink": "alimentacao",
    Transport: "transporte",
    Transportation: "transporte",
    Health: "saude",
    "Health and Fitness": "saude",
    Entertainment: "lazer",
    Shopping: "roupas",
    Education: "educacao",
    Housing: "moradia",
    Travel: "viagem",
    Subscription: "assinatura",
    Income: "salario",
    Investment: "investimento",
    Transfer: "outros",
    Other: "outros",
  };
  return map[pluggyCategory] ?? "outros";
}

// ──────────────────────────────────────────────────────────────
// POST handler — Pluggy Webhook endpoint
// ──────────────────────────────────────────────────────────────
export async function POST(req: Request) {
  let event: PluggyWebhookEvent;

  try {
    event = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  console.log(`[pluggy-webhook] Received event: ${event.event} itemId=${event.itemId}`);

  try {
    switch (event.event) {
      // Item successfully updated — sync new transactions
      case "item/updated":
        await syncBankTransactions(event.itemId);
        break;

      // Item login failed or credentials expired
      case "item/error":
        await updateBankStatus(event.itemId, "error");
        break;

      // Item credentials are outdated (needs re-auth)
      case "item/login_succeeded":
        await updateBankStatus(event.itemId, "active");
        break;

      // Item waiting for user action (MFA, etc.)
      case "item/waiting_user_input":
        console.log(`[pluggy-webhook] Item ${event.itemId} waiting for user input`);
        break;

      default:
        console.log(`[pluggy-webhook] Unhandled event: ${event.event}`);
    }
  } catch (err) {
    console.error(`[pluggy-webhook] Handler error:`, err);
    // Return 200 anyway — Pluggy retries on non-2xx
    return Response.json(
      { received: true, warning: "Handler failed, check logs" },
      { status: 200 }
    );
  }

  return Response.json({ received: true });
}
