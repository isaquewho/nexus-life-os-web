import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// POST /api/habit-logs — upsert (toggle) a habit log for a given date_key
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();

    if (authErr || !user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const body = await request.json();
    const { habit_id, date_key, completed } = body;

    if (!habit_id || !date_key || completed === undefined) {
      return NextResponse.json(
        { error: "Campos obrigatórios: habit_id, date_key, completed" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("habit_logs")
      .upsert(
        {
          habit_id,
          uid: user.id,
          date_key,
          completed,
          logged_at: new Date().toISOString(),
        },
        { onConflict: "habit_id,date_key" }
      )
      .select()
      .single();

    if (error) {
      console.error("[/api/habit-logs POST]", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (err) {
    console.error("[/api/habit-logs POST] unexpected:", err);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
