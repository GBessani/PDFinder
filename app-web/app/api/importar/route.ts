import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { extrairTextoPDF } from "@/lib/pdf";
import { identificarProdutos } from "@/lib/groq";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const { path, fileName } = await request.json();
  if (!path || typeof path !== "string") {
    return NextResponse.json({ error: "Arquivo não informado." }, { status: 400 });
  }

  // baixa o arquivo do Storage (RLS garante que é do proprio usuario)
  const { data: blob, error: dlErr } = await supabase.storage
    .from("notas")
    .download(path);
  if (dlErr || !blob) {
    return NextResponse.json(
      { error: "Não foi possível ler o arquivo." },
      { status: 422 }
    );
  }

  // extrai o texto
  let texto = "";
  try {
    texto = await extrairTextoPDF(await blob.arrayBuffer());
  } catch {
    return NextResponse.json(
      { error: "Não foi possível ler o PDF." },
      { status: 422 }
    );
  }
  if (!texto) {
    return NextResponse.json(
      { error: "O PDF não tem texto legível — pode ser um documento escaneado." },
      { status: 422 }
    );
  }

  // produtos do usuario
  const { data: produtos } = await supabase.from("produtos").select("id, nome");
  if (!produtos || produtos.length === 0) {
    return NextResponse.json(
      { error: "Cadastre produtos antes de importar." },
      { status: 422 }
    );
  }

  // identifica os produtos no texto
  let idsEncontrados: string[] = [];
  try {
    idsEncontrados = await identificarProdutos(texto, produtos);
  } catch {
    return NextResponse.json(
      { error: "Falha ao analisar o conteúdo com a IA." },
      { status: 502 }
    );
  }

  // para cada produto, quem deseja (com opt-in)
  const encontrados = [];
  for (const id of idsEncontrados) {
    const produto = produtos.find((p) => p.id === id);
    if (!produto) continue;
    const { data: rows } = await supabase
      .from("wishlist")
      .select("contatos(id, nome, telefone, opt_in)")
      .eq("produto_id", id);
    const contatos = (rows ?? [])
      .map((r: { contatos: unknown }) => r.contatos)
      .filter(
        (c): c is { id: string; nome: string; telefone: string; opt_in: boolean } =>
          !!c && (c as { opt_in?: boolean }).opt_in === true
      );
    encontrados.push({ produto, contatos });
  }

  return NextResponse.json({
    fileName: fileName ?? "material.pdf",
    path,
    totalProdutos: produtos.length,
    encontrados,
  });
}