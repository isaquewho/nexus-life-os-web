import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

async function assertAdmin() {
  const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase();
  if (!adminEmail) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Admin email not configured." },
        { status: 500 }
      ),
    };
  }

  const supabase = await createClient();
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) {
    return {
      ok: false,
      response: NextResponse.json({ error: error.message }, { status: 500 }),
    };
  }

  const userEmail = session?.user?.email?.toLowerCase();
  if (!userEmail || userEmail !== adminEmail) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Forbidden." }, { status: 403 }),
    };
  }

  return { ok: true, adminEmail };
}

export async function GET() {
  const guard = await assertAdmin();
  if (!guard.ok) return guard.response;

  const service = createServiceClient();
  const { data, error } = await service
    .from("allowed_emails")
    .select("id, email, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ emails: data ?? [] });
}

export async function POST(request: NextRequest) {
  const guard = await assertAdmin();
  if (!guard.ok) return guard.response;

  let body: { email?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const email =
    typeof body.email === "string" ? body.email.trim().toLowerCase() : "";

  if (!email) {
    return NextResponse.json({ error: "Email is required." }, { status: 400 });
  }

  const service = createServiceClient();
  const { data, error } = await service
    .from("allowed_emails")
    .insert({ email })
    .select("id, email, created_at")
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "Email already exists." },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ email: data });
}

export async function DELETE(request: NextRequest) {
  const guard = await assertAdmin();
  if (!guard.ok) return guard.response;
  const adminEmail = guard.adminEmail;

  let body: { id?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const id = typeof body.id === "string" ? body.id.trim() : "";
  if (!id) {
    return NextResponse.json({ error: "Id is required." }, { status: 400 });
  }

  const service = createServiceClient();
  const { data: existing, error: fetchError } = await service
    .from("allowed_emails")
    .select("email")
    .eq("id", id)
    .maybeSingle();

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  if (!existing) {
    return NextResponse.json({ error: "Email not found." }, { status: 404 });
  }

  if (existing.email?.toLowerCase() === adminEmail) {
    return NextResponse.json(
      { error: "You cannot remove your own access." },
      { status: 400 }
    );
  }

  const { error } = await service.from("allowed_emails").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
