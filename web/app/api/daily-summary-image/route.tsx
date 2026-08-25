import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import fs from "node:fs";
import path from "node:path";

export const runtime = "nodejs";

const fmt = (n: string | null) => (n ? Number(n).toLocaleString("th-TH") : "-");

function logoDataUri() {
  const filePath = path.join(process.cwd(), "public", "images", "logo-badge.png");
  const bytes = fs.readFileSync(filePath);
  return `data:image/png;base64,${bytes.toString("base64")}`;
}

export async function GET(req: NextRequest) {
  const logo = logoDataUri();
  const { searchParams } = new URL(req.url);
  const open = fmt(searchParams.get("open"));
  const high = fmt(searchParams.get("high"));
  const low = fmt(searchParams.get("low"));
  const close = fmt(searchParams.get("close"));
  const date = searchParams.get("date") || "";
  const changeLabel = searchParams.get("changeLabel") || "";
  const changeUp = searchParams.get("changeUp") === "1";

  const Stat = ({ label, value }: { label: string; value: string }) => (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, gap: 4 }}>
      <div style={{ fontSize: 22, color: "#6b5a2e", display: "flex" }}>{label}</div>
      <div style={{ fontSize: 48, fontWeight: 700, color: "#211a0e", display: "flex" }}>{value}</div>
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
          gap: 26,
          background: "linear-gradient(180deg, #fdeec2 0%, #fef9ee 65%)",
          padding: "60px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div
            style={{
              width: 60,
              height: 60,
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "#fdeec2",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logo} width={48} height={48} alt="" />
          </div>
          <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: 3, textTransform: "uppercase", color: "#6b5a2e", display: "flex" }}>
            ทองวันนี้ราคา.com
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ fontSize: 50, fontWeight: 700, color: "#211a0e", display: "flex" }}>สรุปราคาทองคำวันนี้</div>
          <div style={{ fontSize: 24, color: "#6b5a2e", display: "flex" }}>ทองคำแท่ง 96.5% · {date}</div>
        </div>

        <div style={{ display: "flex", gap: 24 }}>
          <Stat label="เปิดตลาด" value={open} />
          <Stat label="สูงสุด" value={high} />
        </div>
        <div style={{ display: "flex", gap: 24 }}>
          <Stat label="ต่ำสุด" value={low} />
          <Stat label="ล่าสุด" value={close} />
        </div>

        {changeLabel && (
          <div
            style={{
              display: "flex",
              fontSize: 30,
              fontWeight: 600,
              color: changeUp ? "#1e7d3a" : "#c0392b",
            }}
          >
            {changeLabel}
          </div>
        )}

        <div
          style={{
            display: "flex",
            marginTop: 10,
            width: 120,
            height: 6,
            borderRadius: 3,
            background: "linear-gradient(90deg, #f0b429 0%, #b87d0a 100%)",
          }}
        />
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
