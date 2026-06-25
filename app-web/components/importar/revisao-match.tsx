"use client";

import { useState } from "react";

export type ContatoConsolidado = {
  contatoId: string;
  nome: string;
  telefone: string;
  produtoIds: string[];
  produtoNomes: string[];
  books: { path: string; fileName: string }[];
};

export type Consolidado = {
  contatos: ContatoConsolidado[];
  totalArquivos: number;
  totalProdutos: number;
  totalContatos: number;
  totalBooks: number;
};

export function RevisaoMatch({ consolidado }: { consolidado: Consolidado }) {
  const [anexar, setAnexar] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [progresso, setProgresso] = useState({ atual: 0, total: 0 });
  const [resumo, setResumo] = useState<{ enviados: number; erros: number } | null>(
    null
  );

  async function disparar() {
    setEnviando(true);
    setProgresso({ atual: 0, total: consolidado.contatos.length });
    let enviados = 0;
    let erros = 0;

    for (let i = 0; i < consolidado.contatos.length; i++) {
      setProgresso({ atual: i + 1, total: consolidado.contatos.length });
      const c = consolidado.contatos[i];
      try {
        const resp = await fetch("/api/disparar", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contatoId: c.contatoId,
            produtoIds: c.produtoIds,
            books: c.books,
            anexarBook: anexar,
          }),
        });
        const data = await resp.json();
        if (data.status === "enviado") enviados++;
        else if (data.status === "erro") erros++;
      } catch {
        erros++;
      }
      // pausa entre contatos pra reduzir risco de bloqueio
      if (i < consolidado.contatos.length - 1) {
        await new Promise((r) => setTimeout(r, 2500 + Math.random() * 1500));
      }
    }

    setResumo({ enviados, erros });
    setEnviando(false);
  }

  if (consolidado.totalContatos === 0) {
    return (
      <div className="rounded-xl border border-dashed border-line p-10 text-center">
        <p className="text-sm text-muted">
          Analisei {consolidado.totalArquivos}{" "}
          {consolidado.totalArquivos === 1 ? "arquivo" : "arquivos"}, mas nenhum
          contato com opt-in espera pelos produtos identificados.
        </p>
      </div>
    );
  }

  if (resumo) {
    return (
      <div className="rounded-xl border border-line bg-surface p-8 text-center">
        <p className="font-display text-3xl font-semibold text-brand">
          {resumo.enviados}
        </p>
        <p className="mt-1 text-sm text-muted">
          {resumo.enviados === 1 ? "cliente avisado" : "clientes avisados"}
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
        <Stat valor={consolidado.totalArquivos} rotulo="arquivos lidos" />
        <Stat valor={consolidado.totalProdutos} rotulo="produtos achados" cor="brand" />
        <Stat valor={consolidado.totalContatos} rotulo="clientes a avisar" cor="accent" />
      </div>

      <ul className="space-y-2">
        {consolidado.contatos.map((c) => (
          <li
            key={c.contatoId}
            className="rounded-xl border border-line bg-surface px-4 py-3"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{c.nome}</p>
                <p className="font-mono text-xs text-muted">+{c.telefone}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-medium text-brand">
                  {c.produtoNomes.length}{" "}
                  {c.produtoNomes.length === 1 ? "produto" : "produtos"}
                </span>
                <span className="text-xs text-muted">
                  {c.books.length} {c.books.length === 1 ? "book" : "books"}
                </span>
              </div>
            </div>
            <p className="mt-1.5 truncate text-xs text-muted">
              {c.produtoNomes.join(", ")}
            </p>
          </li>
        ))}
      </ul>

      <div className="mt-6 rounded-xl border border-line bg-surface p-4">
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={anexar}
            onChange={(e) => setAnexar(e.target.checked)}
            className="h-4 w-4 accent-[var(--color-accent)]"
          />
          Anexar os arquivos (books) junto com a mensagem
        </label>

        <button
          onClick={disparar}
          disabled={enviando}
          className="mt-4 w-full rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-95 disabled:opacity-60"
        >
          {enviando
            ? `Enviando ${progresso.atual} de ${progresso.total}…`
            : `Avisar ${consolidado.totalContatos} ${consolidado.totalContatos === 1 ? "cliente" : "clientes"} no WhatsApp`}
        </button>
      </div>
    </div>
  );
}

function Stat({
  valor,
  rotulo,
  cor = "ink",
}: {
  valor: number;
  rotulo: string;
  cor?: "ink" | "brand" | "accent";
}) {
  const corClasse =
    cor === "brand" ? "text-brand" : cor === "accent" ? "text-accent" : "text-ink";
  return (
    <div className="rounded-xl border border-line bg-surface px-4 py-3">
      <p className={`font-display text-2xl font-semibold ${corClasse}`}>{valor}</p>
      <p className="text-xs text-muted">{rotulo}</p>
    </div>
  );
}