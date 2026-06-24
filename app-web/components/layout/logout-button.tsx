"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function LogoutButton() {
  const router = useRouter();
  const supabase = createClient();

  async function sair() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      onClick={sair}
      className="rounded-lg border border-line bg-surface px-3 py-1.5 text-sm font-medium transition hover:bg-paper"
    >
      Sair
    </button>
  );
}
