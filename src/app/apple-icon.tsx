import { ImageResponse } from "next/og";

export const runtime = "edge";

export const size = {
  width: 180,
  height: 180,
};
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)",
          borderRadius: 32,
        }}
      >
        <span
          style={{
            fontSize: 72,
            fontWeight: 700,
            color: "white",
            fontFamily: "system-ui, sans-serif",
          }}
        >
          iaz
        </span>
      </div>
    ),
    {
      ...size,
    }
  );
}
