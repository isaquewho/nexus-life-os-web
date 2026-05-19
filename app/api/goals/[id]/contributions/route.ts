import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// POST /api/goals/[id]/contributions — add a contribution to a goal
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();

    if (authErr || !user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const { id: goalId } = await params;
    const body = await request.json();
    const { amount, note, current_saved } = body;

    if (!amount || current_saved === undefined) {
      return NextResponse.json(
        { error: "Campos obrigatórios: amount, current_saved" },
        { status: 400 }
      );
    }

    const parsedAmount = parseFloat(String(amount).replace(",", "."));
    const newSaved = parseFloat(String(current_saved)) + parsedAmount;

    const [contribRes, updateRes] = await Promise.all([
      supabase.from("goal_contributions").insert({
        goal_id: goalId,
        uid: user.id,
        amount: parsedAmount,
        note: note || null,
        date: new Date().toISOString().split("T")[0],
      }),
      supabase
        .from("goals")
        .update({ saved_amount: newSaved })
        .eq("id", goalId)
        .eq("uid", user.id), // garante que só atualiza a própria meta
    ]);

    if (contribRes.error) {
      console.error("[/api/goals/[id]/contributions POST] contrib:", contribRes.error);
      return NextResponse.json({ error: contribRes.error.message }, { status: 500 });
    }
    if (updateRes.error) {
      console.error("[/api/goals/[id]/contributions POST] update:", updateRes.error);
      return NextResponse.json({ error: updateRes.error.message }, { status: 500 });
    }

    return NextResponse.json({ new_saved: newSaved }, { status: 201 });
  } catch (err) {
    console.error("[/api/goals/[id]/contributions POST] unexpected:", err);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
