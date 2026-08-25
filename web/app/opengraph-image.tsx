import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          background: "#FAF8F3",
          padding: "80px",
        }}
      >
        <div
          style={{
            fontSize: 28,
            fontWeight: 600,
            letterSpacing: 4,
            textTransform: "uppercase",
            color: "#4B473F",
            marginBottom: 24,
          }}
        >
          ทองคำออนไลน์ · ราคาวันนี้
        </div>
        <div
          style={{
            fontSize: 96,
            fontWeight: 600,
            color: "#14120F",
            lineHeight: 1.1,
          }}
        >
          ราคาทองคำวันนี้
        </div>
        <div
          style={{
            fontSize: 32,
            color: "#4B473F",
            marginTop: 28,
          }}
        >
          ราคาจริงจากสมาคมค้าทองคำ · คำนวณกำไรขาดทุน
        </div>
        <div
          style={{
            position: "absolute",
            bottom: 80,
            left: 80,
            width: 120,
            height: 6,
            background: "#9C7A1F",
          }}
        />
      </div>
    ),
    { ...size }
  );
}
