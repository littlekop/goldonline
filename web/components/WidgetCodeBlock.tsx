"use client";

import { useState } from "react";
import { C } from "@/lib/theme";

export default function WidgetCodeBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard API unavailable — user can still select the text manually
    }
  }

  return (
    <div className="relative">
      <pre
        className="font-mono-led text-[12px] p-4 rounded-xl overflow-x-auto whitespace-pre-wrap break-all"
        style={{ background: C.cardSoft, color: C.ink }}
      >
        {code}
      </pre>
      <button
        onClick={handleCopy}
        className="absolute top-2 right-2 font-body text-[12px] font-semibold px-3 py-1.5 rounded-full transition"
        style={{ background: "var(--accent-gradient)", color: C.ink }}
      >
        {copied ? "คัดลอกแล้ว!" : "คัดลอกโค้ด"}
      </button>
    </div>
  );
}
