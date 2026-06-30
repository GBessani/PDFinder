import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const MODELO = process.env.GROQ_MODEL || "openai/gpt-oss-120b";

export type ProdutoParaMatch = { id: string; nome: string };

// remove ruído repetido (cabeçalho/rodapé que aparece em toda página) e linhas vazias
function limparTexto(texto: string): string {
  const linhas = texto
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const freq = new Map<string, number>();
  for (const l of linhas) freq.set(l, (freq.get(l) ?? 0) + 1);

  // descarta linhas curtas que se repetem muito (são cabeçalho/rodapé/slogan)
  const limpas = linhas.filter((l) => {
    const repete = freq.get(l) ?? 0;
    if (repete >= 4 && l.length < 60) return false;
    return true;
  });

  return limpas.join("\n");
}

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

  const texto = limparTexto(textoPDF);
  const lista = produtos
    .map((p) => `- id: ${p.id} | nome: ${p.nome}`)
    .join("\n");

  const prompt = `Você analisa o TEXTO extraído de um catálogo, nota fiscal ou "book" de produtos têxteis e diz quais produtos de uma LISTA CADASTRADA aparecem nele.

O texto foi extraído automaticamente de um PDF, então pode estar FRAGMENTADO e bagunçado:
- O nome de um produto pode estar quebrado em linhas separadas. Ex.: "OXFORD" numa linha e "ESTAMPADO MESA" na seguinte formam o produto "OXFORD ESTAMPADO MESA". Junte mentalmente as partes vizinhas.
- O nome costuma vir acompanhado de um CÓDIGO numérico (ex.: "260642"), de MEDIDAS (ex.: "1,47 L", "179 Gr/Ml") e de composição (ex.: "100% Poliéster"). IGNORE códigos, números e medidas — eles não fazem parte do nome.
- Há ruído de cabeçalho, rodapé e slogans. Ignore.

Faça a correspondência por SIGNIFICADO, não por caracteres exatos: aceite abreviações, ordem trocada, ausência de acento e grafia aproximada. Quando houver vários produtos parecidos na lista (ex.: vários começando com "OXFORD"), escolha o que MELHOR corresponde ao texto, não todos. Só inclua um produto se houver razoável certeza de que ele aparece de fato no texto.

TEXTO:
"""
${texto}
"""

PRODUTOS CADASTRADOS (id | nome):
${lista}

Responda SOMENTE com um JSON no formato {"ids": ["..."]} contendo os ids dos produtos cadastrados que aparecem no texto. Se nenhum aparecer, responda {"ids": []}.`;

  const params = {
    model: MODELO,
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
    temperature: 0,
    reasoning_effort: "medium",
  } as unknown as Parameters<typeof groq.chat.completions.create>[0];

  const resp = await groq.chat.completions.create(params);
  const conteudo =
    "choices" in resp ? (resp.choices[0]?.message?.content ?? "{}") : "{}";

  const validos = new Set(produtos.map((p) => p.id));
  return parseIds(conteudo, validos);
}