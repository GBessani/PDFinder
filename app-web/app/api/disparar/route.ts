import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { enviarTexto, enviarDocumento } from "@/lib/wa";
import type { Database } from "@/lib/database.types";

type NotificacaoInsert =
  Database["public"]["Tables"]["notificacoes"]["Insert"];

export const runtime = "nodejs";
export const maxDuration = 60;

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
      ? `recebemos um novo artigo da sua lista de desejos: ${produtos[0]}`
      : `recebemos novos artigos da sua lista de desejos: ${produtos.join(", ")}`;
  const anexo = comAnexo ? " Segue o material em anexo." : "";
  return `Olá, ${primeiroNome(nome)}! Tudo bem? ${intro.charAt(0).toUpperCase()}${intro.slice(1)}.${anexo} Qualquer coisa, é só chamar! 🧵`;
}

type BookRef = { path: string; fileName: string };

// dispara para UM contato (o navegador chama em sequência, com pausa entre eles)
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const { contatoId, produtoIds, books, anexarBook } = await request.json();

  // valida o contato (RLS) e o consentimento
  const { data: contato } = await supabase
    .from("contatos")
    .select("id, nome, telefone, opt_in")
    .eq("id", contatoId)
    .maybeSingle();
  if (!contato || !contato.opt_in) {
    return NextResponse.json({ status: "pulado" });
  }

  // valida os produtos (RLS) e pega os nomes reais
  const { data: produtos } = await supabase
    .from("produtos")
    .select("id, nome")
    .in("id", Array.isArray(produtoIds) ? produtoIds : []);
  if (!produtos || produtos.length === 0) {
    return NextResponse.json({ status: "pulado" });
  }

  const livros: BookRef[] = Array.isArray(books) ? books : [];
  const comAnexo = !!anexarBook && livros.length > 0;
  const msg = montarMensagem(
    contato.nome,
    produtos.map((p) => p.nome),
    comAnexo
  );

  let ok = false;

  if (comAnexo) {
    // a saudação vai como legenda do PRIMEIRO book; os demais seguem sem texto
    for (let i = 0; i < livros.length; i++) {
      const b = livros[i];
      const { data: signed } = await supabase.storage
        .from("notas")
        .createSignedUrl(b.path, 600);
      if (!signed?.signedUrl) continue;
      const legenda = i === 0 ? msg : "";
      const enviado = await enviarDocumento(
        contato.telefone,
        legenda,
        signed.signedUrl,
        b.fileName || "material.pdf"
      );
      if (i === 0) ok = enviado;
    }
  } else {
    // sem anexo: uma única mensagem de texto
    ok = await enviarTexto(contato.telefone, msg);
  }

  // registra uma linha por produto
  const origem = livros.map((b) => b.fileName).join(", ") || null;
  const registros: NotificacaoInsert[] = produtos.map((p) => ({
    id: crypto.randomUUID(),
    user_id: user.id,
    contato_id: contato.id,
    produto_id: p.id,
    pdf_origem: origem,
    status: ok ? "enviado" : "erro",
    enviado_em: ok ? new Date().toISOString() : null,
  }));
  await supabase.from("notificacoes").insert(registros);

  return NextResponse.json({ status: ok ? "enviado" : "erro" });
}