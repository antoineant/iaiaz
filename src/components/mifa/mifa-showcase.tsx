"use client";

import { useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Plus } from "lucide-react";

const MIFA_CARDS = [
  {
    key: "card1",
    asset: "/avatars/studi.png",
    color: "#818CF8",
    gauges: { creativity: 2, patience: 5, humor: 1, rigor: 4, curiosity: 3 },
  },
  {
    key: "card2",
    asset: "/avatars/inki.png",
    color: "#A855F7",
    gauges: { creativity: 4, patience: 3, humor: 2, rigor: 4, curiosity: 3 },
  },
  {
    key: "card3",
    asset: "/avatars/sigma.png",
    color: "#34D399",
    gauges: { creativity: 2, patience: 4, humor: 1, rigor: 5, curiosity: 3 },
  },
  {
    key: "card4",
    asset: "/avatars/arti.png",
    color: "#FB923C",
    gauges: { creativity: 5, patience: 3, humor: 4, rigor: 1, curiosity: 5 },
  },
  {
    key: "card5",
    asset: "/avatars/atlas.png",
    color: "#2DD4BF",
    gauges: { creativity: 3, patience: 3, humor: 2, rigor: 3, curiosity: 5 },
  },
] as const;

const GAUGE_KEYS = ["creativity", "patience", "humor", "rigor", "curiosity"] as const;

export function MifaShowcase() {
  const t = useTranslations("mifa.landing.mifas");
  const [flipped, setFlipped] = useState<string | null>(null);

  return (
    <div className="flex flex-wrap justify-center gap-5 mb-10">
      {MIFA_CARDS.map((card) => {
        const isFlipped = flipped === card.key;

        return (
          <div
            key={card.key}
            className="w-[calc(50%-10px)] md:w-[calc(33.333%-14px)] cursor-pointer"
            style={{ perspective: "800px" }}
            onClick={() => setFlipped(isFlipped ? null : card.key)}
          >
            <div
              className="relative w-full transition-transform duration-500"
              style={{
                transformStyle: "preserve-3d",
                transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
              }}
            >
              {/* Front */}
              <div
                className="rounded-2xl p-5 text-center border-2 hover:shadow-lg hover:scale-105 transition-all"
                style={{
                  backfaceVisibility: "hidden",
                  borderColor: `${card.color}80`,
                  background: `linear-gradient(135deg, ${card.color}15, white)`,
                }}
              >
                <Image
                  src={card.asset}
                  alt=""
                  width={110}
                  height={110}
                  className="mx-auto mb-3 rounded-full"
                />
                <p className="font-bold text-base mb-0.5">{t(`${card.key}.name`)}</p>
                <p className="text-sm text-[var(--muted-foreground)]">{t(`${card.key}.role`)}</p>
                <div className="flex gap-1 mt-3 justify-center">
                  {[card.gauges.creativity, card.gauges.patience, card.gauges.humor].map((v, i) => (
                    <div key={i} className="flex gap-0.5">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <div
                          key={n}
                          className="w-2 h-1.5 rounded-full"
                          style={{ backgroundColor: n <= v ? card.color : `${card.color}20` }}
                        />
                      ))}
                    </div>
                  ))}
                </div>
              </div>

              {/* Back */}
              <div
                className="absolute inset-0 rounded-2xl p-5 border-2 flex flex-col justify-center"
                style={{
                  backfaceVisibility: "hidden",
                  transform: "rotateY(180deg)",
                  borderColor: card.color,
                  background: `linear-gradient(160deg, white 50%, ${card.color}18)`,
                  boxShadow: `0 4px 20px ${card.color}25`,
                }}
              >
                <p className="font-bold text-base mb-1 text-center">{t(`${card.key}.name`)}</p>
                <p className="text-xs text-[var(--muted-foreground)] mb-4 text-center leading-relaxed">
                  {t(`${card.key}.desc`)}
                </p>
                <div className="space-y-2">
                  {GAUGE_KEYS.map((gauge) => {
                    const value = card.gauges[gauge];
                    return (
                      <div key={gauge} className="flex items-center gap-1.5">
                        <span className="text-[10px] font-medium w-16 text-right text-[var(--muted-foreground)]">
                          {t(`gaugeLabels.${gauge}`)}
                        </span>
                        <div className="flex-1 flex gap-0.5">
                          {[1, 2, 3, 4, 5].map((n) => (
                            <div
                              key={n}
                              className="h-2 flex-1 rounded-full"
                              style={{
                                backgroundColor: n <= value ? card.color : `${card.color}15`,
                              }}
                            />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        );
      })}

      {/* Create your own CTA card */}
      <Link
        href="/mifa"
        className="w-[calc(50%-10px)] md:w-[calc(33.333%-14px)] no-underline"
      >
        <div className="rounded-2xl p-5 text-center border-2 border-dashed border-[var(--muted-foreground)]/30 hover:border-[var(--muted-foreground)]/60 hover:shadow-lg hover:scale-105 transition-all flex flex-col items-center justify-center h-full min-h-[200px] bg-[var(--muted)]/30">
          <div className="w-16 h-16 rounded-full bg-[var(--muted)] flex items-center justify-center mb-3">
            <Plus className="w-8 h-8 text-[var(--muted-foreground)]" />
          </div>
          <p className="font-bold text-base text-[var(--foreground)]">{t("createCard")}</p>
        </div>
      </Link>
    </div>
  );
}
