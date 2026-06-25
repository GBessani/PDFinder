import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { enviarTexto, enviarDocumento } from "@/lib/wa";
import type { Database } from "@/lib/database.types";

type NotificacaoInsert =
  Database["public"]["Tables"]["notificacoes"]["Insert"];

export const runtime = "nodejs";
export const maxDuration = 60;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function primeiroNome(nome: string): string {
  return nome.trim().split(/\s+/)[0] || nome;
}

function montarMensagem(
  nome: string,
  produtos: string[],
  comAnexo: boolean
): string {
  const intro =
    produtos.length === 1
      ? `Chegou um item da sua lista: ${produtos[0]}.`
      : `Chegaram itens da sua lista: ${produtos.join(", ")}.`;
  const anexo = comAnexo
    ? " Mando em anexo o material pra você conferir."
    : "";
  return `Olá, ${primeiroNome(nome)}! Tudo bem? ${intro}${anexo} Qualquer coisa, é só chamar! 🧵`;
}

type ContatoRow = {
  id: string;
  nome: string;
  telefone: string;
  opt_in: boolean;
};

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const { produtoIds, path, fileName, anexarBook } = await request.json();
  if (!Array.isArray(produtoIds) || produtoIds.length === 0) {
    return NextResponse.json({ error: "Nada para enviar." }, { status: 400 });
  }

  // produtos (RLS)
  const { data: produtos } = await supabase
    .from("produtos")
    .select("id, nome")
    .in("id", produtoIds);
  if (!produtos || produtos.length === 0) {
    return NextResponse.json(
      { error: "Produtos não encontrados." },
      { status: 422 }
    );
  }

  // agrupa por contato: cada contato -> lista de produtos que ele deseja
  const porContato = new Map<
    string,
    { contato: ContatoRow; produtos: { id: string; nome: string }[] }
  >();

  for (const prod of produtos) {
    const { data: rows } = await supabase
      .from("wishlist")
      .select("contatos(id, nome, telefone, opt_in)")
      .eq("produto_id", prod.id);
    for (const r of rows ?? []) {
      const c = (r as { contatos: ContatoRow | null }).contatos;
      if (!c || !c.opt_in) continue;
      if (!porContato.has(c.id)) {
        porContato.set(c.id, { contato: c, produtos: [] });
      }
      porContato.get(c.id)!.produtos.push({ id: prod.id, nome: prod.nome });
    }
  }

  if (porContato.size === 0) {
    return NextResponse.json({ enviados: 0, erros: 0, contatos: 0 });
  }

  // signed URL do book (10 min) se for anexar
  let fileUrl: string | null = null;
  if (anexarBook && typeof path === "string" && path) {
    const { data: signed } = await supabase.storage
      .from("notas")
      .createSignedUrl(path, 600);
    fileUrl = signed?.signedUrl ?? null;
  }

  let enviados = 0;
  let erros = 0;
  const registros: NotificacaoInsert[] = [];
  let primeiro = true;

  for (const { contato, produtos: prods } of porContato.values()) {
    // espaça os envios pra reduzir risco de bloqueio
    if (!primeiro) await sleep(2000 + Math.random() * 1500);
    primeiro = false;

    const msg = montarMensagem(
      contato.nome,
      prods.map((p) => p.nome),
      !!fileUrl
    );

    let ok = false;
    if (fileUrl) {
      ok = await enviarDocumento(
        contato.telefone,
        msg,
        fileUrl,
        fileName || "material.pdf"
      );
    } else {
      ok = await enviarTexto(contato.telefone, msg);
    }

    if (ok) enviados++;
    else erros++;

    for (const p of prods) {
      registros.push({
        id: crypto.randomUUID(),
        user_id: user.id,
        contato_id: contato.id,
        produto_id: p.id,
        pdf_origem: fileName ?? null,
        status: ok ? "enviado" : "erro",
        enviado_em: ok ? new Date().toISOString() : null,
      });
    }
  }

  if (registros.length > 0) {
    await supabase.from("notificacoes").insert(registros);
  }

  return NextResponse.json({ enviados, erros, contatos: porContato.size });
}