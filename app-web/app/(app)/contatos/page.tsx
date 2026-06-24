"use client";

import { useEffect, useState } from "react";
import {
  listarContatosComDesejos,
  listarProdutos,
  excluirContato,
} from "@/lib/queries";
import type { ContatoComDesejos, Produto } from "@/lib/types";
import { ContatoForm } from "@/components/contatos/contato-form";
import { WishlistEditor } from "@/components/contatos/wishlist-editor";

export default function ContatosPage() {
  const [contatos, setContatos] = useState<ContatoComDesejos[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [editando, setEditando] = useState<ContatoComDesejos | null>(null);

  async function carregar() {
    const [cs, ps] = await Promise.all([
      listarContatosComDesejos(),
      listarProdutos(),
    ]);
    setContatos(cs);
    setProdutos(ps);
    setCarregando(false);
  }

  useEffect(() => {
    carregar();
  }, []);

  async function remover(id: string) {
    const antes = contatos;
    setContatos((c) => c.filter((x) => x.id !== id));
    try {
      await excluirContato(id);
    } catch {
      setContatos(antes);
    }
  }

  return (
    <div>
      <header className="mb-6">
        <h1 className="font-display text-2xl font-semibold tracking-tight">
          Contatos
        </h1>
        <p className="mt-1 text-sm text-muted">
          Cadastre seus clientes e marque os produtos que cada um quer.
        </p>
      </header>

      <div className="mb-6">
        <ContatoForm onCriado={() => carregar()} />
      </div>

      {carregando ? (
        <p className="text-sm text-muted">Carregando…</p>
      ) : contatos.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line p-10 text-center">
          <p className="text-sm text-muted">
            Nenhum contato ainda. Adicione o primeiro acima.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
          {contatos.map((c) => (
            <li
              key={c.id}
              className="flex items-center justify-between gap-3 px-4 py-3"
            >
              <button
                onClick={() => setEditando(c)}
                className="min-w-0 flex-1 text-left"
              >
                <p className="truncate text-sm font-medium">{c.nome}</p>
                <p className="font-mono text-xs text-muted">+{c.telefone}</p>
              </button>

              <div className="flex shrink-0 items-center gap-3">
                <span className="rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-medium text-brand">
                  {c.desejos.length}{" "}
                  {c.desejos.length === 1 ? "desejo" : "desejos"}
                </span>
                {!c.opt_in && (
                  <span className="text-xs text-muted" title="Sem consentimento">
                    sem opt-in
                  </span>
                )}
                <button
                  onClick={() => remover(c.id)}
                  className="text-xs font-medium text-muted transition hover:text-red-600"
                >
                  Excluir
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {editando && (
        <WishlistEditor
          contato={editando}
          produtos={produtos}
          desejosIniciais={editando.desejos.map((d) => d.id)}
          onFechar={() => {
            setEditando(null);
            carregar();
          }}
        />
      )}
    </div>
  );
}
