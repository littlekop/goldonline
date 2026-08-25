import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import fs from "node:fs";
import path from "node:path";

export const runtime = "nodejs";

const fmtBaht = (n: number) => n.toLocaleString("th-TH");

function logoDataUri() {
  const filePath = path.join(process.cwd(), "public", "images", "logo-badge.png");
  const bytes = fs.readFileSync(filePath);
  return `data:image/png;base64,${bytes.toString("base64")}`;
}

export async function GET(req: NextRequest) {
  const logo = logoDataUri();
  const { searchParams } = new URL(req.url);
  const open = Number(searchParams.get("open")) || 0;
  const high = Number(searchParams.get("high")) || 0;
  const low = Number(searchParams.get("low")) || 0;
  const close = Number(searchParams.get("close")) || 0;
  const date = searchParams.get("date") || "";
  const changeLabel = searchParams.get("changeLabel") || "";
  const changeUp = searchParams.get("changeUp") === "1";
  const flat = close === open;

  const accent = flat ? "#f0b429" : changeUp ? "#3ddc84" : "#ff6b5e";
  const accentSoft = flat ? "rgba(240,180,41,0.16)" : changeUp ? "rgba(61,220,132,0.16)" : "rgba(255,107,94,0.16)";
  const arrow = flat ? "→" : changeUp ? "▲" : "▼";

  // --- mini chart: open -> high -> low -> close path, scaled to the day's range ---
  const chartW = 460;
  const chartH = 170;
  const padX = 30;
  const padY = 24;
  const range = high - low || 1;
  const xs = [padX, padX + (chartW - padX * 2) / 3, padX + ((chartW - padX * 2) * 2) / 3, chartW - padX];
  const vals = [open, high, low, close];
  const ys = vals.map((v) => padY + (1 - (v - low) / range) * (chartH - padY * 2));
  const linePoints = xs.map((x, i) => `${x},${ys[i]}`).join(" ");
  const areaPoints = `${xs[0]},${chartH} ${linePoints} ${xs[3]},${chartH}`;
  const chartLabels = ["เปิด", "สูงสุด", "ต่ำสุด", "ปิด"];

  const StatChip = ({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1 }}>
      <div style={{ fontSize: 18, color: "#a3906a", display: "flex" }}>{label}</div>
      <div style={{ fontSize: 30, fontWeight: 700, color: highlight ? accent : "#fbf1de", display: "flex" }}>
        {fmtBaht(value)}
      </div>
    </div>
  );

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "linear-gradient(135deg, #1c1408 0%, #241a0c 45%, #2f2210 100%)",
          padding: "56px 64px",
          position: "relative",
        }}
      >
        {/* glow accents */}
        <div
          style={{
            position: "absolute",
            top: -140,
            right: -140,
            width: 420,
            height: 420,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(240,180,41,0.22) 0%, rgba(240,180,41,0) 70%)",
            display: "flex",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -160,
            left: -100,
            width: 380,
            height: 380,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(240,180,41,0.12) 0%, rgba(240,180,41,0) 70%)",
            display: "flex",
          }}
        />

        {/* header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div
              style={{
                width: 54,
                height: 54,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "rgba(240,180,41,0.14)",
                border: "1px solid rgba(240,180,41,0.35)",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={logo} width={40} height={40} alt="" />
            </div>
            <div style={{ fontSize: 26, fontWeight: 700, color: "#c9b183", display: "flex" }}>
              ทองวันนี้ราคา.com
            </div>
          </div>
          <div style={{ fontSize: 26, fontWeight: 700, color: "#fbf1de", display: "flex" }}>{date}</div>
        </div>

        {/* body: price + chart side by side */}
        <div style={{ display: "flex", alignItems: "center", gap: 56, marginTop: 34, flex: 1 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14, width: 420 }}>
            <div style={{ fontSize: 24, fontWeight: 600, color: "#c9b183", display: "flex" }}>
              สรุปราคาทองคำวันนี้ · ทองคำแท่ง 96.5%
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
              <div style={{ fontSize: 96, fontWeight: 800, color: "#fbf1de", display: "flex", lineHeight: 1 }}>
                {fmtBaht(close)}
              </div>
              <div style={{ fontSize: 28, color: "#a3906a", display: "flex" }}>บาท</div>
            </div>
            {changeLabel && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "10px 18px",
                  borderRadius: 999,
                  background: accentSoft,
                  width: "fit-content",
                  fontSize: 24,
                  fontWeight: 700,
                  color: accent,
                }}
              >
                <span style={{ display: "flex" }}>{arrow}</span>
                <span style={{ display: "flex" }}>{changeLabel}</span>
              </div>
            )}
          </div>

          {/* chart */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14, flex: 1 }}>
            <svg width={chartW} height={chartH} viewBox={`0 0 ${chartW} ${chartH}`}>
              <polygon points={areaPoints} fill={accentSoft} />
              <polyline points={linePoints} fill="none" stroke={accent} strokeWidth="5" strokeLinejoin="round" strokeLinecap="round" />
              {xs.map((x, i) => (
                <circle key={i} cx={x} cy={ys[i]} r={8} fill="#1c1408" stroke={accent} strokeWidth="4" />
              ))}
            </svg>
            <div style={{ display: "flex", gap: 20 }}>
              {chartLabels.map((label, i) => (
                <StatChip key={label} label={label} value={vals[i]} highlight={i === 3} />
              ))}
            </div>
          </div>
        </div>

        {/* footer */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", width: 90, height: 5, borderRadius: 3, background: `linear-gradient(90deg, ${accent} 0%, #b87d0a 100%)` }} />
          <div style={{ fontSize: 18, color: "#8c7950", display: "flex" }}>อัปเดตราคาทองคำทุกวัน · ทองวันนี้ราคา.com</div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
