"use client";

export type ContatoMatch = {
  id: string;
  nome: string;
  telefone: string;
};

export type ProdutoMatch = {
  produto: { id: string; nome: string };
  contatos: ContatoMatch[];
};

export type ResultadoImport = {
  fileName: string;
  totalProdutos: number;
  amostraTexto?: string;
  encontrados: ProdutoMatch[];
};

export function RevisaoMatch({ resultado }: { resultado: ResultadoImport }) {
  const { encontrados } = resultado;
  const totalAvisos = encontrados.reduce((s, e) => s + e.contatos.length, 0);
  const comInteresse = encontrados.filter((e) => e.contatos.length > 0);

  if (encontrados.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-line p-10 text-center">
        <p className="text-sm text-muted">
          Nenhum produto cadastrado foi identificado nesta nota.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap gap-3">
        <div className="rounded-xl border border-line bg-surface px-4 py-3">
          <p className="font-display text-2xl font-semibold text-brand">
            {encontrados.length}
          </p>
          <p className="text-xs text-muted">
            {encontrados.length === 1
              ? "produto identificado"
              : "produtos identificados"}
          </p>
        </div>
        <div className="rounded-xl border border-line bg-surface px-4 py-3">
          <p className="font-display text-2xl font-semibold text-accent">
            {totalAvisos}
          </p>
          <p className="text-xs text-muted">
            {totalAvisos === 1 ? "aviso a enviar" : "avisos a enviar"}
          </p>
        </div>
      </div>

      <ul className="space-y-3">
        {encontrados.map((e) => (
          <li
            key={e.produto.id}
            className="overflow-hidden rounded-xl border border-line bg-surface"
          >
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <span className="text-sm font-medium">{e.produto.nome}</span>
              <span className="rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-medium text-brand">
                {e.contatos.length}{" "}
                {e.contatos.length === 1 ? "contato" : "contatos"}
              </span>
            </div>
            {e.contatos.length === 0 ? (
              <p className="px-4 py-3 text-sm text-muted">
                Ninguém com opt-in espera este produto.
              </p>
            ) : (
              <ul className="divide-y divide-line">
                {e.contatos.map((c) => (
                  <li
                    key={c.id}
                    className="flex items-center justify-between px-4 py-2.5"
                  >
                    <span className="text-sm">{c.nome}</span>
                    <span className="font-mono text-xs text-muted">
                      +{c.telefone}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>

      {comInteresse.length > 0 && (
        <div className="mt-6 rounded-xl border border-dashed border-line bg-paper p-4 text-sm text-muted">
          O disparo dos avisos no WhatsApp entra na próxima etapa. Por ora, esta
          é a revisão do que <em>seria</em> enviado.
        </div>
      )}
    </div>
  );
}
