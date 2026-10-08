"use client";

import { useState } from "react";

export function CopyButton({ text, label, className = "btn" }: { text: string; label: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className={className}
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      }}
    >
      <span aria-live="polite">{copied ? "Copiado" : label}</span>
    </button>
  );
}
