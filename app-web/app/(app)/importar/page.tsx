"use client";

import { useState } from "react";
import {
  RevisaoMatch,
  type ResultadoImport,
} from "@/components/importar/revisao-match";

export default function ImportarPage() {
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [analisando, setAnalisando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [resultado, setResultado] = useState<ResultadoImport | null>(null);

  async function analisar() {
    if (!arquivo) return;
    setAnalisando(true);
    setErro(null);
    setResultado(null);
    try {
      const fd = new FormData();
      fd.append("file", arquivo);
      const resp = await fetch("/api/importar", { method: "POST", body: fd });
      const data = await resp.json();
      if (!resp.ok) {
        setErro(data.error || "Falha na análise.");
      } else {
        setResultado(data);
      }
    } catch {
      setErro("Erro de conexão com o servidor.");
    } finally {
      setAnalisando(false);
    }
  }

  return (
    <div>
      <header className="mb-6">
        <h1 className="font-display text-2xl font-semibold tracking-tight">
          Importar nota
        </h1>
        <p className="mt-1 text-sm text-muted">
          Suba o PDF da nota ou lista de chegada. O sistema identifica os
          produtos e mostra quem espera por eles.
        </p>
      </header>

      <div className="rounded-xl border border-line bg-surface p-5">
        <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-line bg-paper px-4 py-8 text-center transition hover:border-brand">
          <input
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={(e) => {
              setArquivo(e.target.files?.[0] ?? null);
              setResultado(null);
              setErro(null);
            }}
          />
          <span className="text-sm font-medium">
            {arquivo ? arquivo.name : "Escolher arquivo PDF"}
          </span>
          <span className="text-xs text-muted">
            {arquivo ? "Clique em analisar abaixo" : "Clique para selecionar"}
          </span>
        </label>

        <button
          onClick={analisar}
          disabled={!arquivo || analisando}
          className="mt-4 w-full rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-95 disabled:opacity-60"
        >
          {analisando ? "Analisando…" : "Analisar"}
        </button>

        {erro && <p className="mt-3 text-sm text-red-600">{erro}</p>}
      </div>

      {resultado && (
        <div className="mt-8">
          <RevisaoMatch resultado={resultado} />
        </div>
      )}
    </div>
  );
}
