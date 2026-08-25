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
        <svg width="70%" height="70%" viewBox="0 0 100 100">
          <polygon points="15,78 25,42 75,42 85,78" fill="#8a5a06" stroke="#4a3005" strokeWidth="2" />
          <polygon points="25,42 35,26 65,26 75,42" fill="#fbdb84" stroke="#4a3005" strokeWidth="2" />
        </svg>
      </div>
    ),
    { ...size }
  );
}
