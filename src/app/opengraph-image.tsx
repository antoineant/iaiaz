import { ImageResponse } from "next/og";

export const runtime = "edge";

export const alt = "iaiaz - IA Accessible, Zéro engagement";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #7c3aed 0%, #4f46e5 50%, #2563eb 100%)",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        {/* Logo */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 40,
          }}
        >
          <span
            style={{
              fontSize: 120,
              fontWeight: 800,
              color: "white",
              letterSpacing: "-0.02em",
            }}
          >
            iaiaz
          </span>
        </div>

        {/* Tagline */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 16,
          }}
        >
          <span
            style={{
              fontSize: 48,
              fontWeight: 600,
              color: "rgba(255, 255, 255, 0.95)",
              textAlign: "center",
            }}
          >
            L&apos;IA premium, sans l&apos;abonnement
          </span>
          <span
            style={{
              fontSize: 28,
              color: "rgba(255, 255, 255, 0.8)",
              textAlign: "center",
            }}
          >
            Claude • GPT-5 • Gemini • Mistral
          </span>
        </div>

        {/* Badge */}
        <div
          style={{
            display: "flex",
            marginTop: 48,
            padding: "16px 32px",
            background: "rgba(255, 255, 255, 0.15)",
            borderRadius: 50,
            border: "2px solid rgba(255, 255, 255, 0.3)",
          }}
        >
          <span
            style={{
              fontSize: 24,
              color: "white",
              fontWeight: 600,
            }}
          >
            1€ offert à l&apos;inscription
          </span>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
