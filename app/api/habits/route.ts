import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// GET /api/habits — list all active habits + logs for authenticated user
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();

    if (authErr || !user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const [habitsRes, logsRes] = await Promise.all([
      supabase
        .from("habits")
        .select("*")
        .eq("uid", user.id)
        .eq("is_active", true),
      supabase
        .from("habit_logs")
        .select("*")
        .eq("uid", user.id),
    ]);

    if (habitsRes.error) {
      console.error("[/api/habits GET] habits:", habitsRes.error);
      return NextResponse.json({ error: habitsRes.error.message }, { status: 500 });
    }
    if (logsRes.error) {
      console.error("[/api/habits GET] logs:", logsRes.error);
      return NextResponse.json({ error: logsRes.error.message }, { status: 500 });
    }

    return NextResponse.json({ habits: habitsRes.data, logs: logsRes.data });
  } catch (err) {
    console.error("[/api/habits GET] unexpected:", err);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

// POST /api/habits — create a new habit
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();

    if (authErr || !user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const body = await request.json();
    const { name, emoji = "🎯", color = "#8b5cf6", frequency = "daily", xp_value = 30 } = body;

    if (!name) {
      return NextResponse.json({ error: "Campo obrigatório: name" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("habits")
      .insert({ uid: user.id, name, emoji, color, frequency, xp_value })
      .select()
      .single();

    if (error) {
      console.error("[/api/habits POST]", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (err) {
    console.error("[/api/habits POST] unexpected:", err);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
