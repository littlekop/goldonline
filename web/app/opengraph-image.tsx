import { ImageResponse } from "next/og";
import fs from "node:fs";
import path from "node:path";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

function logoDataUri() {
  const filePath = path.join(process.cwd(), "public", "images", "logo-badge.png");
  const bytes = fs.readFileSync(filePath);
  return `data:image/png;base64,${bytes.toString("base64")}`;
}

export default async function Image() {
  const logo = logoDataUri();
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          background: "linear-gradient(180deg, #fdeec2 0%, #fef9ee 65%)",
          padding: "80px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 20,
            marginBottom: 32,
          }}
        >
          <div
            style={{
              width: 80,
              height: 80,
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "#fdeec2",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logo} width={64} height={64} alt="" />
          </div>
          <div
            style={{
              fontSize: 30,
              fontWeight: 700,
              color: "#6b5a2e",
              display: "flex",
            }}
          >
            ทองวันนี้ราคา.com
          </div>
        </div>
        <div
          style={{
            fontSize: 96,
            fontWeight: 600,
            color: "#211a0e",
            lineHeight: 1.1,
            display: "flex",
          }}
        >
          ราคาทองคำวันนี้
        </div>
        <div
          style={{
            fontSize: 32,
            color: "#6b5a2e",
            marginTop: 28,
            display: "flex",
          }}
        >
          ราคาจริงจากสมาคมค้าทองคำ · คำนวณกำไรขาดทุน · อัปเดตเรียลไทม์
        </div>
        <div
          style={{
            position: "absolute",
            bottom: 80,
            left: 80,
            width: 120,
            height: 6,
            borderRadius: 3,
            background: "linear-gradient(90deg, #f0b429 0%, #b87d0a 100%)",
          }}
        />
      </div>
    ),
    { ...size }
  );
}
