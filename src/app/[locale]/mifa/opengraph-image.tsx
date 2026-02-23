import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "mifa by iaiaz";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const isFr = locale === "fr";

  const tagline = isFr
    ? "L'IA en famille, en confiance"
    : "Family AI, with confidence";
  const subtitle = isFr
    ? "Contrôle parental · Supervision adaptée à l'âge · Crédits partagés"
    : "Parental controls · Age-adaptive supervision · Shared credits";

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
          background: "linear-gradient(135deg, #7c3aed 0%, #6366f1 40%, #3b82f6 100%)",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        {/* mifa wordmark */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 32,
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
            m&#299;f&#257;
          </span>
        </div>

        {/* Tagline */}
        <span
          style={{
            fontSize: 44,
            fontWeight: 600,
            color: "rgba(255, 255, 255, 0.95)",
            textAlign: "center",
            marginBottom: 20,
          }}
        >
          {tagline}
        </span>

        {/* Subtitle */}
        <span
          style={{
            fontSize: 26,
            color: "rgba(255, 255, 255, 0.75)",
            textAlign: "center",
            maxWidth: 900,
          }}
        >
          {subtitle}
        </span>

        {/* by iaiaz */}
        <div
          style={{
            display: "flex",
            marginTop: 48,
            padding: "12px 28px",
            background: "rgba(255, 255, 255, 0.15)",
            borderRadius: 50,
            border: "2px solid rgba(255, 255, 255, 0.25)",
          }}
        >
          <span
            style={{
              fontSize: 22,
              color: "rgba(255, 255, 255, 0.9)",
              fontWeight: 500,
            }}
          >
            by iaiaz
          </span>
        </div>
      </div>
    ),
    { ...size }
  );
}
