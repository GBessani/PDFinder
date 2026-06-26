import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const WORKER_URL = process.env.WA_WORKER_URL || "http://localhost:3001";

export const runtime = "nodejs";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  try {
    const r = await fetch(`${WORKER_URL}/status`, { cache: "no-store" });
    if (!r.ok) return NextResponse.json({ connected: false, reachable: false });
    const data = await r.json();
    return NextResponse.json({ connected: !!data.connected, reachable: true });
  } catch {
    // worker fora do ar / inalcançável
    return NextResponse.json({ connected: false, reachable: false });
  }
}
