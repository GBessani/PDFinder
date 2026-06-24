import { createClient } from "@/lib/supabase/server";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold tracking-tight">
        Início
      </h1>
      <p className="mt-1 text-sm text-muted">
        Conectado como{" "}
        <span className="font-mono text-ink">{user?.email}</span>.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <a
          href="/produtos"
          className="rounded-xl border border-line bg-surface p-5 transition hover:border-brand"
        >
          <h2 className="font-display text-lg font-semibold tracking-tight">
            Produtos
          </h2>
          <p className="mt-1 text-sm text-muted">
            Cadastre os artigos que seus clientes podem querer.
          </p>
        </a>
        <a
          href="/contatos"
          className="rounded-xl border border-line bg-surface p-5 transition hover:border-brand"
        >
          <h2 className="font-display text-lg font-semibold tracking-tight">
            Contatos
          </h2>
          <p className="mt-1 text-sm text-muted">
            Cadastre clientes e monte a lista de desejo de cada um.
          </p>
        </a>
      </div>
    </div>
  );
}
