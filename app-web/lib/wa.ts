const WORKER_URL = process.env.WA_WORKER_URL || "http://localhost:3001";
const WORKER_TOKEN = process.env.WA_WORKER_TOKEN || "";

async function chamar(rota: string, body: unknown): Promise<boolean> {
  try {
    const r = await fetch(`${WORKER_URL}${rota}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-auth-token": WORKER_TOKEN,
      },
      body: JSON.stringify(body),
    });
    return r.ok;
  } catch {
    return false;
  }
}

export function enviarTexto(phone: string, message: string) {
  return chamar("/send", { phone, message });
}

export function enviarDocumento(
  phone: string,
  message: string,
  fileUrl: string,
  fileName: string
) {
  return chamar("/send-doc", { phone, message, fileUrl, fileName });
}
