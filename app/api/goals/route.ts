import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const GOAL_EMOJIS: Record<string, string> = {
  viagem: "✈️", educação: "📚", tecnologia: "💻", casa: "🏠",
  carro: "🚗", investimento: "📈", emergência: "🛟", presente: "🎁", outros: "🎯",
};

// GET /api/goals — list all goals for authenticated user
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();

    if (authErr || !user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("goals")
      .select("*")
      .eq("uid", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[/api/goals GET]", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (err) {
    console.error("[/api/goals GET] unexpected:", err);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

// POST /api/goals — create a new goal
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();

    if (authErr || !user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const body = await request.json();
    const { name, category = "outros", target_amount, deadline, monthly_planned = 0 } = body;

    if (!name || !target_amount) {
      return NextResponse.json(
        { error: "Campos obrigatórios: name, target_amount" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("goals")
      .insert({
        uid: user.id,
        name,
        category,
        emoji: GOAL_EMOJIS[category] ?? "🎯",
        target_amount: parseFloat(String(target_amount).replace(",", ".")),
        saved_amount: 0,
        deadline: deadline || null,
        monthly_planned: parseFloat(String(monthly_planned).replace(",", ".")) || 0,
      })
      .select()
      .single();

    if (error) {
      console.error("[/api/goals POST]", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (err) {
    console.error("[/api/goals POST] unexpected:", err);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
