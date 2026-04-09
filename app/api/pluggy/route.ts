import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const clientId = process.env.NEXT_PUBLIC_PLUGGY_CLIENT_ID;
    const clientSecret = process.env.PLUGGY_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return NextResponse.json(
        { error: "Pluggy credentials not configured" },
        { status: 503 }
      );
    }

    // Get Pluggy API key
    const authRes = await fetch("https://api.pluggy.ai/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId, clientSecret }),
    });

    if (!authRes.ok) {
      return NextResponse.json({ error: "Pluggy auth failed" }, { status: 502 });
    }

    const { apiKey } = await authRes.json();

    // Create connect token
    const tokenRes = await fetch("https://api.pluggy.ai/connect_token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-KEY": apiKey,
      },
      body: JSON.stringify({ clientUserId: session.user.id }),
    });

    if (!tokenRes.ok) {
      return NextResponse.json({ error: "Failed to create connect token" }, { status: 502 });
    }

    const { accessToken } = await tokenRes.json();
    return NextResponse.json({ accessToken });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
