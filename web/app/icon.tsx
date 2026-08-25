import { ImageResponse } from "next/og";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: "50%",
          background: "linear-gradient(135deg, #f0b429 0%, #b87d0a 100%)",
        }}
      >
        <div
          style={{
            fontSize: 36,
            fontWeight: 700,
            color: "#211a0e",
            display: "flex",
          }}
        >
          ฿
        </div>
      </div>
    ),
    { ...size }
  );
}
