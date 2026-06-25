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

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "Nenhum arquivo enviado." },
      { status: 400 }
    );
  }

  // 1. extrai o texto do PDF
  let texto = "";
  try {
    texto = await extrairTextoPDF(await file.arrayBuffer());
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

  // 2. produtos do usuario (RLS aplica)
  const { data: produtos } = await supabase.from("produtos").select("id, nome");
  if (!produtos || produtos.length === 0) {
    return NextResponse.json(
      { error: "Cadastre produtos antes de importar." },
      { status: 422 }
    );
  }

  // 3. identifica quais produtos aparecem no texto
  let idsEncontrados: string[] = [];
  try {
    idsEncontrados = await identificarProdutos(texto, produtos);
  } catch {
    return NextResponse.json(
      { error: "Falha ao analisar o conteúdo com a IA." },
      { status: 502 }
    );
  }

  // 4. para cada produto encontrado, busca quem deseja (com opt-in)
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
    fileName: file.name,
    totalProdutos: produtos.length,
    amostraTexto: texto.slice(0, 240),
    encontrados,
  });
}
