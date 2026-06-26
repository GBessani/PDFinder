"use client";

import { useEffect, useRef, useState } from "react";

type Status = { connected: boolean; reachable: boolean } | null;

export default function ConexaoPage() {
  const [status, setStatus] = useState<Status>(null);
  const [qrTick, setQrTick] = useState(Date.now());
  const ativoRef = useRef(true);

  useEffect(() => {
    ativoRef.current = true;
    async function checar() {
      try {
        const r = await fetch("/api/wa/status", { cache: "no-store" });
        const data = await r.json();
        if (ativoRef.current) setStatus(data);
      } catch {
        if (ativoRef.current) setStatus({ connected: false, reachable: false });
      }
      if (ativoRef.current) {
        setQrTick(Date.now());
        setTimeout(checar, 4000);
      }
    }
    checar();
    return () => {
      ativoRef.current = false;
    };
  }, []);

  return (
    <div>
      <header className="mb-6">
        <h1 className="font-display text-2xl font-semibold tracking-tight">
          Conexão do WhatsApp
        </h1>
        <p className="mt-1 text-sm text-muted">
          É deste número que saem os avisos. Mantenha-o conectado.
        </p>
      </header>

      {status === null && (
        <div className="rounded-xl border border-line bg-surface p-8 text-center text-sm text-muted">
          Verificando conexão…
        </div>
      )}

      {status && !status.reachable && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6">
          <p className="font-display text-lg font-semibold text-red-700">
            Serviço fora do ar
          </p>
          <p className="mt-1 text-sm text-red-700/80">
            O serviço de WhatsApp não está acessível. Confirme se o worker está
            rodando e tente novamente em instantes.
          </p>
        </div>
      )}

      {status && status.reachable && status.connected && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-6">
          <p className="font-display text-lg font-semibold text-green-700">
            WhatsApp conectado
          </p>
          <p className="mt-1 text-sm text-green-700/80">
            Tudo certo. Os avisos podem ser enviados normalmente.
          </p>
        </div>
      )}

      {status && status.reachable && !status.connected && (
        <div className="rounded-xl border border-line bg-surface p-6 text-center">
          <p className="font-display text-lg font-semibold tracking-tight">
            Escaneie para conectar
          </p>
          <p className="mt-1 text-sm text-muted">
            No celular: WhatsApp → Aparelhos conectados → Conectar um aparelho.
          </p>
          {/* a imagem se atualiza sozinha; some se ainda não houver QR */}
          <img
            key={qrTick}
            src={`/api/wa/qr?t=${qrTick}`}
            alt="QR code"
            className="mx-auto mt-5 h-72 w-72 rounded-xl border border-line"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.visibility = "hidden";
            }}
          />
          <p className="mt-4 text-xs text-muted">
            A página detecta sozinha quando conectar.
          </p>
        </div>
      )}
    </div>
  );
}
