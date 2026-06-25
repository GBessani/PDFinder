import { extractText, getDocumentProxy } from "unpdf";

// extrai o texto de um PDF (digital). Para PDFs escaneados, retorna vazio.
export async function extrairTextoPDF(buffer: ArrayBuffer): Promise<string> {
  const pdf = await getDocumentProxy(new Uint8Array(buffer));
  const { text } = await extractText(pdf, { mergePages: true });
  return text.trim();
}
