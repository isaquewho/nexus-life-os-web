import { PluggyClient } from "pluggy-sdk";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const clientId = process.env.PLUGGY_CLIENT_ID;
    const clientSecret = process.env.PLUGGY_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return Response.json(
        { error: "Pluggy credentials not configured" },
        { status: 503 }
      );
    }

    const client = new PluggyClient({ clientId, clientSecret });
    const token = await client.createConnectToken();

    return Response.json({ accessToken: token.accessToken });
  } catch (error) {
    console.error("connect-token error:", error);
    return Response.json({ error: "Failed to create connect token" }, { status: 500 });
  }
}
