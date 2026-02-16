import { useState } from "react";
import { Image, Text as RNText } from "react-native";

const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000";

const MIFA_ASSETS: Record<string, { src: string; fallbackEmoji: string }> = {
  "mifa-studi": { src: "/avatars/studi.png", fallbackEmoji: "🎓" },
  "mifa-inki": { src: "/avatars/inki.png", fallbackEmoji: "✍️" },
  "mifa-sigma": { src: "/avatars/sigma.png", fallbackEmoji: "🧮" },
  "mifa-arty": { src: "/avatars/arti.png", fallbackEmoji: "🎨" },
  "mifa-atlas": { src: "/avatars/atlas.png", fallbackEmoji: "🌍" },
};

interface MifaAvatarProps {
  avatar: string;
  avatarType?: "emoji" | "asset" | "generated" | null;
  size?: number;
}

export function MifaAvatar({ avatar, avatarType, size = 48 }: MifaAvatarProps) {
  const [imgError, setImgError] = useState(false);

  // Generated avatar — render directly from URL
  if (avatarType === "generated" && avatar && !imgError) {
    return (
      <Image
        source={{ uri: avatar }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
        resizeMode="cover"
        onError={() => setImgError(true)}
      />
    );
  }

  // Check if the avatar string is an asset key (even if avatarType wasn't set)
  const asset = MIFA_ASSETS[avatar];
  const shouldRenderAsset = (avatarType === "asset" || asset) && !imgError;

  if (shouldRenderAsset && asset) {
    return (
      <Image
        source={{ uri: `${API_URL}${asset.src}` }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
        resizeMode="cover"
        onError={() => setImgError(true)}
      />
    );
  }

  // Fallback: if we have an asset entry, use its fallback emoji; otherwise render avatar string
  const emoji = asset?.fallbackEmoji || avatar || "🤖";

  return (
    <RNText style={{ fontSize: size * 0.6, lineHeight: size * 0.8, textAlign: "center" }}>
      {emoji}
    </RNText>
  );
}
