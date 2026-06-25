"use client";

import { useState } from "react";

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
  path: string;
  totalProdutos: number;
  encontrados: ProdutoMatch[];
};

export function RevisaoMatch({ resultado }: { resultado: ResultadoImport }) {
  const { encontrados } = resultado;
  const totalAvisos = encontrados.reduce((s, e) => s + e.contatos.length, 0);

  const [anexar, setAnexar] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [resumo, setResumo] = useState<{
    enviados: number;
    erros: number;
    contatos: number;
  } | null>(null);

  async function disparar() {
    setEnviando(true);
    setErro(null);
    try {
      const produtoIds = encontrados.map((e) => e.produto.id);
      const resp = await fetch("/api/disparar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          produtoIds,
          path: resultado.path,
          fileName: resultado.fileName,
          anexarBook: anexar,
        }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        setErro(data.error || "Falha ao enviar os avisos.");
      } else {
        setResumo(data);
      }
    } catch {
      setErro("Erro de conexão ao enviar.");
    } finally {
      setEnviando(false);
    }
  }

  if (encontrados.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-line p-10 text-center">
        <p className="text-sm text-muted">
          Nenhum produto cadastrado foi identificado nesta nota.
        </p>
      </div>
    );
  }

  // ja disparou: mostra o resumo
  if (resumo) {
    return (
      <div className="rounded-xl border border-line bg-surface p-8 text-center">
        <p className="font-display text-3xl font-semibold text-brand">
          {resumo.enviados}
        </p>
        <p className="mt-1 text-sm text-muted">
          {resumo.enviados === 1 ? "aviso enviado" : "avisos enviados"}
          {resumo.erros > 0 && ` · ${resumo.erros} com falha`}
        </p>
        <p className="mt-4 text-xs text-muted">
          O histórico fica registrado na aba Avisos.
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

      {totalAvisos > 0 && (
        <div className="mt-6 rounded-xl border border-line bg-surface p-4">
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={anexar}
              onChange={(e) => setAnexar(e.target.checked)}
              className="h-4 w-4 accent-[var(--color-accent)]"
            />
            Anexar o arquivo (book) junto com a mensagem
          </label>

          {erro && <p className="mt-3 text-sm text-red-600">{erro}</p>}

          <button
            onClick={disparar}
            disabled={enviando}
            className="mt-4 w-full rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-95 disabled:opacity-60"
          >
            {enviando
              ? "Enviando avisos…"
              : `Enviar ${totalAvisos} ${totalAvisos === 1 ? "aviso" : "avisos"} no WhatsApp`}
          </button>
        </div>
      )}
    </div>
  );
}
