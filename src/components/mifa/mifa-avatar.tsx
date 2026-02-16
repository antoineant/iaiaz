"use client";

import Image from "next/image";
import { MIFA_ASSETS } from "@/lib/mifa/avatar-assets";

interface MifaAvatarProps {
  avatar: string;
  avatarType?: "emoji" | "asset" | "generated";
  size?: number;
  className?: string;
}

export function MifaAvatar({ avatar, avatarType = "emoji", size = 48, className = "" }: MifaAvatarProps) {
  if (avatarType === "generated" && avatar) {
    return (
      <Image
        src={avatar}
        alt="Mifa avatar"
        width={size}
        height={size}
        className={`rounded-full object-cover ${className}`}
      />
    );
  }

  // Check if the avatar string is an asset key (even if avatarType wasn't set)
  const asset = MIFA_ASSETS[avatar];
  if (avatarType === "asset" || asset) {
    if (asset) {
      return (
        <Image
          src={asset.src}
          alt={avatar}
          width={size}
          height={size}
          className={className}
        />
      );
    }
    // Asset key not found — render generic fallback
    return (
      <span className={className} style={{ fontSize: size * 0.6, lineHeight: 1 }}>
        {"🤖"}
      </span>
    );
  }

  return (
    <span className={className} style={{ fontSize: size * 0.6, lineHeight: 1 }}>
      {avatar}
    </span>
  );
}
