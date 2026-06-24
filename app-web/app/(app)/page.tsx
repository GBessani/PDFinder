import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "@/components/layout/logout-button";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div>
      <div className="flex items-center justify-between">
        <span className="font-display text-lg font-semibold tracking-tight text-brand">
          PDFinder
        </span>
        <LogoutButton />
      </div>

      <div className="mt-12 rounded-xl border border-line bg-surface p-8">
        <h1 className="font-display text-2xl font-semibold tracking-tight">
          Você está dentro.
        </h1>
        <p className="mt-2 text-sm text-muted">
          Conectado como{" "}
          <span className="font-mono text-ink">{user?.email}</span>. As telas de
          produtos, contatos e importação entram aqui em seguida.
        </p>
      </div>
    </div>
  );
}