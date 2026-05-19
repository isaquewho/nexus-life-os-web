import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// GET /api/transactions — list last 50 for authenticated user
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();

    if (authErr || !user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("transactions")
      .select("*")
      .eq("uid", user.id)
      .order("date", { ascending: false })
      .limit(50);

    if (error) {
      console.error("[/api/transactions GET]", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (err) {
    console.error("[/api/transactions GET] unexpected:", err);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

// POST /api/transactions — create a new transaction
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();

    if (authErr || !user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const body = await request.json();
    const {
      description,
      amount,
      category = "outros",
      type,
      date,
      transaction_layer = "variable",
      is_recurring = false,
      recurring_day = null,
    } = body;

    if (!description || !amount || !type || !date) {
      return NextResponse.json(
        { error: "Campos obrigatórios: description, amount, type, date" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("transactions")
      .insert({
        uid: user.id,
        description,
        amount: parseFloat(String(amount).replace(",", ".")),
        category,
        type,
        date,
        source: "manual",
        transaction_layer,
        is_recurring,
        recurring_day: is_recurring ? recurring_day : null,
      })
      .select()
      .single();

    if (error) {
      console.error("[/api/transactions POST]", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (err) {
    console.error("[/api/transactions POST] unexpected:", err);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

// DELETE /api/transactions?id=<uuid>
export async function DELETE(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();

    if (authErr || !user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID obrigatório" }, { status: 400 });
    }

    const { error } = await supabase
      .from("transactions")
      .delete()
      .eq("id", id)
      .eq("uid", user.id); // garante que só deleta o próprio dado

    if (error) {
      console.error("[/api/transactions DELETE]", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[/api/transactions DELETE] unexpected:", err);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
