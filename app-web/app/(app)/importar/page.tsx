"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  RevisaoMatch,
  type Consolidado,
  type ContatoConsolidado,
} from "@/components/importar/revisao-match";

type Fase = "idle" | "upload" | "analise" | "pronto";

export default function ImportarPage() {
  const [arquivos, setArquivos] = useState<File[]>([]);
  const [fase, setFase] = useState<Fase>("idle");
  const [progresso, setProgresso] = useState({ atual: 0, total: 0 });
  const [erro, setErro] = useState<string | null>(null);
  const [consolidado, setConsolidado] = useState<Consolidado | null>(null);

  const ocupado = fase === "upload" || fase === "analise";

  async function analisar() {
    if (arquivos.length === 0) return;
    setErro(null);
    setConsolidado(null);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setErro("Sessão expirada. Entre novamente.");
        return;
      }

      // 1) sobe todos os arquivos pro Storage
      setFase("upload");
      const books: { path: string; fileName: string }[] = [];
      for (let i = 0; i < arquivos.length; i++) {
        setProgresso({ atual: i + 1, total: arquivos.length });
        const path = `${user.id}/${crypto.randomUUID()}.pdf`;
        const { error: upErr } = await supabase.storage
          .from("notas")
          .upload(path, arquivos[i], { contentType: "application/pdf" });
        if (!upErr) books.push({ path, fileName: arquivos[i].name });
      }

      // 2) analisa um por um e consolida por contato
      setFase("analise");
      const porContato = new Map<
        string,
        {
          contato: { id: string; nome: string; telefone: string };
          produtos: Map<string, string>;
          books: Map<string, string>;
        }
      >();
      const produtosUnicos = new Set<string>();
      const booksComMatch = new Set<string>();

      for (let i = 0; i < books.length; i++) {
        setProgresso({ atual: i + 1, total: books.length });
        const resp = await fetch("/api/importar", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(books[i]),
        });
        if (!resp.ok) continue;
        const data = await resp.json();
        for (const item of data.encontrados as {
          produto: { id: string; nome: string };
          contatos: { id: string; nome: string; telefone: string }[];
        }[]) {
          if (item.contatos.length > 0) {
            produtosUnicos.add(item.produto.id);
            booksComMatch.add(books[i].path);
          }
          for (const c of item.contatos) {
            if (!porContato.has(c.id)) {
              porContato.set(c.id, {
                contato: c,
                produtos: new Map(),
                books: new Map(),
              });
            }
            const e = porContato.get(c.id)!;
            e.produtos.set(item.produto.id, item.produto.nome);
            e.books.set(books[i].path, books[i].fileName);
          }
        }
      }

      const contatos: ContatoConsolidado[] = Array.from(
        porContato.values()
      ).map((e) => ({
        contatoId: e.contato.id,
        nome: e.contato.nome,
        telefone: e.contato.telefone,
        produtoIds: Array.from(e.produtos.keys()),
        produtoNomes: Array.from(e.produtos.values()),
        books: Array.from(e.books.entries()).map(([path, fileName]) => ({
          path,
          fileName,
        })),
      }));

      setConsolidado({
        contatos,
        totalArquivos: books.length,
        totalProdutos: produtosUnicos.size,
        totalContatos: contatos.length,
        totalBooks: booksComMatch.size,
      });
      setFase("pronto");
    } catch {
      setErro("Erro ao processar os arquivos.");
      setFase("idle");
    }
  }

  return (
    <div>
      <header className="mb-6">
        <h1 className="font-display text-2xl font-semibold tracking-tight">
          Importar notas
        </h1>
        <p className="mt-1 text-sm text-muted">
          Suba um ou vários PDFs de uma vez (notas, listas ou books). O sistema
          analisa todos e mostra um resumo de quem avisar.
        </p>
      </header>

      <div className="rounded-xl border border-line bg-surface p-5">
        <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-line bg-paper px-4 py-8 text-center transition hover:border-brand">
          <input
            type="file"
            accept="application/pdf"
            multiple
            className="hidden"
            disabled={ocupado}
            onChange={(e) => {
              setArquivos(Array.from(e.target.files ?? []));
              setConsolidado(null);
              setErro(null);
              setFase("idle");
            }}
          />
          <span className="text-sm font-medium">
            {arquivos.length === 0
              ? "Escolher arquivos PDF"
              : `${arquivos.length} ${arquivos.length === 1 ? "arquivo selecionado" : "arquivos selecionados"}`}
          </span>
          <span className="text-xs text-muted">
            {arquivos.length === 0
              ? "Pode selecionar vários de uma vez"
              : "Clique em analisar abaixo"}
          </span>
        </label>

        <button
          onClick={analisar}
          disabled={arquivos.length === 0 || ocupado}
          className="mt-4 w-full rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-95 disabled:opacity-60"
        >
          {fase === "upload"
            ? `Enviando ${progresso.atual} de ${progresso.total}…`
            : fase === "analise"
              ? `Analisando ${progresso.atual} de ${progresso.total}…`
              : `Analisar ${arquivos.length > 0 ? arquivos.length : ""} ${arquivos.length === 1 ? "arquivo" : "arquivos"}`}
        </button>

        {erro && <p className="mt-3 text-sm text-red-600">{erro}</p>}
      </div>

      {consolidado && (
        <div className="mt-8">
          <RevisaoMatch consolidado={consolidado} />
        </div>
      )}
    </div>
  );
}