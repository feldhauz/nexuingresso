"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

/** Tempo que resta da reserva. Ao zerar, recarrega a tela para mostrar o pedido vencido. */
export function Countdown({ until }: { until: string }) {
  const router = useRouter();
  const [left, setLeft] = useState<number | null>(null);

  useEffect(() => {
    const end = new Date(until).getTime();
    const tick = () => {
      const seconds = Math.max(0, Math.ceil((end - Date.now()) / 1000));
      setLeft(seconds);
      if (seconds === 0) {
        clearInterval(timer);
        router.refresh();
      }
    };
    const timer = setInterval(tick, 1000);
    tick();
    return () => clearInterval(timer);
  }, [until, router]);

  if (left === null) return <span className="tabular-nums">--:--</span>;
  const minutes = Math.floor(left / 60);
  const seconds = String(left % 60).padStart(2, "0");
  return (
    <span className="tabular-nums" role="timer">
      {minutes}:{seconds}
    </span>
  );
}

/** Enquanto o pagamento não é confirmado, pergunta ao servidor a cada poucos segundos. */
export function AutoRefresh({ seconds = 4 }: { seconds?: number }) {
  const router = useRouter();
  useEffect(() => {
    const timer = setInterval(() => router.refresh(), seconds * 1000);
    return () => clearInterval(timer);
  }, [router, seconds]);
  return null;
}
