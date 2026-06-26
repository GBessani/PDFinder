import { createClient } from "@/lib/supabase/server";

const WORKER_URL = process.env.WA_WORKER_URL || "http://localhost:3001";

export const runtime = "nodejs";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return new Response(null, { status: 401 });
  }

  try {
    const r = await fetch(`${WORKER_URL}/qr.png`, { cache: "no-store" });
    if (!r.ok) return new Response(null, { status: 404 });
    const buf = await r.arrayBuffer();
    return new Response(buf, {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return new Response(null, { status: 502 });
  }
}
