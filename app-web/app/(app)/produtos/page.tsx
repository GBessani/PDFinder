"use client";

import { useEffect, useState } from "react";
import {
  listarProdutos,
  criarProduto,
  excluirProduto,
} from "@/lib/queries";
import type { Produto } from "@/lib/types";

export default function ProdutosPage() {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [nome, setNome] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function carregar() {
    try {
      setProdutos(await listarProdutos());
    } catch {
      setErro("Não foi possível carregar os produtos.");
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  async function adicionar(e: React.FormEvent) {
    e.preventDefault();
    const limpo = nome.trim();
    if (!limpo) return;
    setSalvando(true);
    setErro(null);
    try {
      await criarProduto(limpo);
      setNome("");
      await carregar();
    } catch (err) {
      const code = (err as { code?: string })?.code;
      setErro(
        code === "23505"
          ? "Esse produto já está cadastrado."
          : "Não foi possível salvar o produto."
      );
    } finally {
      setSalvando(false);
    }
  }

  async function remover(id: string) {
    const antes = produtos;
    setProdutos((p) => p.filter((x) => x.id !== id)); // atualizacao otimista
    try {
      await excluirProduto(id);
    } catch {
      setProdutos(antes); // reverte se falhar
      setErro("Não foi possível excluir.");
    }
  }

  return (
    <div>
      <header className="mb-6">
        <h1 className="font-display text-2xl font-semibold tracking-tight">
          Produtos
        </h1>
        <p className="mt-1 text-sm text-muted">
          Cadastre os artigos que seus clientes podem querer. Só o nome basta.
        </p>
      </header>

      <form onSubmit={adicionar} className="mb-6 flex gap-2">
        <input
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="Nome do produto"
          className="flex-1 rounded-lg border border-line bg-surface px-3 py-2.5 text-sm outline-none transition focus:border-brand"
        />
        <button
          type="submit"
          disabled={salvando || !nome.trim()}
          className="rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-95 disabled:opacity-60"
        >
          {salvando ? "Salvando…" : "Adicionar"}
        </button>
      </form>

      {erro && <p className="mb-4 text-sm text-red-600">{erro}</p>}

      {carregando ? (
        <p className="text-sm text-muted">Carregando…</p>
      ) : produtos.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line p-10 text-center">
          <p className="text-sm text-muted">
            Nenhum produto ainda. Adicione o primeiro acima.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
          {produtos.map((p) => (
            <li
              key={p.id}
              className="flex items-center justify-between px-4 py-3"
            >
              <span className="text-sm">{p.nome}</span>
              <button
                onClick={() => remover(p.id)}
                className="text-xs font-medium text-muted transition hover:text-red-600"
              >
                Excluir
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
