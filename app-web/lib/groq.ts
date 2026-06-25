import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const MODELO = process.env.GROQ_MODEL || "openai/gpt-oss-20b";

export type ProdutoParaMatch = { id: string; nome: string };

// extrai um objeto JSON do conteudo, mesmo se vier com texto ao redor
function parseIds(conteudo: string, validos: Set<string>): string[] {
  try {
    const match = conteudo.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(match ? match[0] : conteudo);
    const ids: unknown[] = Array.isArray(parsed.ids) ? parsed.ids : [];
    return ids.filter(
      (id): id is string => typeof id === "string" && validos.has(id)
    );
  } catch {
    return [];
  }
}

// dado o texto do PDF e os produtos cadastrados, retorna os ids dos que aparecem
export async function identificarProdutos(
  textoPDF: string,
  produtos: ProdutoParaMatch[]
): Promise<string[]> {
  if (produtos.length === 0) return [];

  const lista = produtos.map((p) => `- id: ${p.id} | nome: ${p.nome}`).join("\n");

  const prompt = `Você recebe o TEXTO de uma nota fiscal ou lista de chegada de mercadoria têxtil e uma LISTA DE PRODUTOS cadastrados.

Tarefa: identifique quais produtos da lista cadastrada aparecem no texto. Considere correspondência por SIGNIFICADO — o nome na nota pode estar abreviado, em ordem diferente, sem acento, com grafia ligeiramente diferente ou com código junto. Não exija correspondência exata de caracteres.

TEXTO DA NOTA:
"""
${textoPDF}
"""

PRODUTOS CADASTRADOS:
${lista}

Responda SOMENTE com um JSON no formato {"ids": ["..."]} contendo os ids dos produtos cadastrados que aparecem no texto. Se nenhum aparecer, responda {"ids": []}.`;

  const params = {
    model: MODELO,
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
    temperature: 0,
    reasoning_effort: "low",
  } as unknown as Parameters<typeof groq.chat.completions.create>[0];

  const resp = await groq.chat.completions.create(params);
  const conteudo =
    "choices" in resp ? (resp.choices[0]?.message?.content ?? "{}") : "{}";

  const validos = new Set(produtos.map((p) => p.id));
  return parseIds(conteudo, validos);
}
