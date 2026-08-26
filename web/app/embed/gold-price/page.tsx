"use client";

import { useEffect, useState } from "react";

const fmt = (n: number) => Math.round(n).toLocaleString("th-TH");

type Market = { barBuy: number; barSell: number; jewelryBuy: number; jewelrySell: number };

export default function GoldPriceWidget() {
  const [market, setMarket] = useState<Market | null>(null);
  const [status, setStatus] = useState<"loading" | "live" | "estimated" | "error">("loading");
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/live-prices", { cache: "no-store" });
        const data = await res.json();
        if (cancelled) return;
        if (data?.market) {
          setMarket(data.market);
          setStatus(data.source === "gta" ? "live" : "estimated");
          setUpdatedAt(new Date());
        } else {
          setStatus("error");
        }
      } catch {
        if (!cancelled) setStatus("error");
      }
    }
    load();
    const t = setInterval(load, 5 * 60 * 1000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, []);

  return (
    <div
      style={{
        fontFamily: "'IBM Plex Sans Thai', system-ui, sans-serif",
        background: "#fef9ee",
        border: "1px solid #f3ddab",
        borderRadius: 14,
        padding: "14px 16px",
        maxWidth: 320,
        margin: "0 auto",
        color: "#211a0e",
        boxSizing: "border-box",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: 0.3 }}>ราคาทองคำวันนี้</span>
        <span
          style={{
            fontSize: 10,
            fontWeight: 600,
            padding: "2px 8px",
            borderRadius: 999,
            background: status === "live" ? "rgba(18,168,84,0.14)" : status === "estimated" ? "rgba(220,156,20,0.16)" : "#f3ddab",
            color: status === "live" ? "#12a854" : status === "estimated" ? "#b87d0a" : "#8c7950",
          }}
        >
          {status === "live" ? "สด" : status === "estimated" ? "ประมาณการ" : status === "loading" ? "กำลังโหลด" : "—"}
        </span>
      </div>

      {market ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <Row label="ทองคำแท่ง 96.5%" buy={market.barBuy} sell={market.barSell} />
          <Row label="ทองรูปพรรณ 96.5%" buy={market.jewelryBuy} sell={market.jewelrySell} />
        </div>
      ) : (
        <div style={{ fontSize: 13, color: "#8c7950", padding: "8px 0" }}>
          {status === "error" ? "ดึงราคาไม่สำเร็จ" : "กำลังโหลดราคา..."}
        </div>
      )}

      {updatedAt && (
        <div style={{ fontSize: 10, color: "#8c7950", marginTop: 8 }}>
          อัปเดต {updatedAt.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })}
        </div>
      )}

      <a
        href="https://xn--42cf1cja4dza0cybnb6a3v.com/"
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          marginTop: 10,
          paddingTop: 10,
          borderTop: "1px solid #f3ddab",
          fontSize: 11,
          color: "#b87d0a",
          textDecoration: "none",
          fontWeight: 600,
        }}
      >
        ดูราคาแบบเต็ม + คำนวณกำไรขาดทุน · ทองวันนี้ราคา.com
      </a>
    </div>
  );
}

function Row({ label, buy, sell }: { label: string; buy: number; sell: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
      <span style={{ fontSize: 12, color: "#5c4b2e", flex: 1 }}>{label}</span>
      <span style={{ fontSize: 13, fontFamily: "'Space Mono', monospace", fontWeight: 700 }}>{fmt(buy)}</span>
      <span style={{ fontSize: 13, fontFamily: "'Space Mono', monospace", fontWeight: 700, color: "#e13d2b" }}>{fmt(sell)}</span>
    </div>
  );
}
