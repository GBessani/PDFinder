"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export function WaStatusBanner() {
  const [conectado, setConectado] = useState<boolean | null>(null);
  const ativoRef = useRef(true);
  const path = usePathname();

  useEffect(() => {
    ativoRef.current = true;
    async function checar() {
      try {
        const r = await fetch("/api/wa/status", { cache: "no-store" });
        const data = await r.json();
        if (ativoRef.current) setConectado(!!data.connected);
      } catch {
        if (ativoRef.current) setConectado(false);
      }
      if (ativoRef.current) setTimeout(checar, 30000);
    }
    checar();
    return () => {
      ativoRef.current = false;
    };
  }, []);

  // não mostra enquanto carrega, quando conectado, ou já na própria página
  if (conectado !== false || path === "/conexao") return null;

  return (
    <div className="border-b border-red-200 bg-red-50">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-5 py-2 text-sm">
        <span className="text-red-700">
          WhatsApp desconectado — os avisos não serão enviados.
        </span>
        <Link
          href="/conexao"
          className="shrink-0 font-medium text-red-700 underline underline-offset-2"
        >
          Reconectar
        </Link>
      </div>
    </div>
  );
}
