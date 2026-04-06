"use client";

import { useMemo, useState } from "react";
import {
  Brain,
  Flame,
  Gamepad2,
  Joystick,
  Rocket,
  Shield,
  Sparkles,
  Swords,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ProfilePhotoValue } from "@/lib/profilePhotoStore";
import { cx } from "@/lib/utils";

const avatarIconMap: Record<string, LucideIcon> = {
  zap: Zap,
  gamepad2: Gamepad2,
  swords: Swords,
  joystick: Joystick,
  brain: Brain,
  shield: Shield,
  rocket: Rocket,
  flame: Flame,
  sparkles: Sparkles,
};

interface ProfilePhotoProps {
  photo: ProfilePhotoValue;
  fallbackText: string;
  className?: string;
  textClassName?: string;
  neon?: boolean;
}

export default function ProfilePhoto({
  photo,
  fallbackText,
  className,
  textClassName,
  neon = false,
}: ProfilePhotoProps) {
  const [brokenImage, setBrokenImage] = useState(false);

  const initials = useMemo(() => {
    const cleaned = fallbackText.replace("@", "").trim();
    if (!cleaned) return "U";
    const parts = cleaned.split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
  }, [fallbackText]);

  const Icon = photo.type === "icon" ? avatarIconMap[photo.value] ?? Zap : null;
  const canRenderImage = photo.type === "image" && photo.value.trim().length > 0 && !brokenImage;

  return (
    <div
      className={cx(
        "relative grid place-items-center overflow-hidden rounded-full border border-violet-400/40 bg-violet-500/15 text-violet-700 dark:text-violet-100",
        neon ? "shadow-[0_0_25px_rgba(139,92,246,0.35)]" : "",
        className
      )}
    >
      {canRenderImage ? (
        // Data URLs and arbitrary user URLs cannot be reliably pre-configured for next/image.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={photo.value}
          alt="Profile"
          className="h-full w-full object-cover"
          onError={() => setBrokenImage(true)}
        />
      ) : Icon ? (
        <Icon className={cx("h-1/2 w-1/2", textClassName)} />
      ) : (
        <span className={cx("font-sora font-bold uppercase", textClassName)}>{initials}</span>
      )}
    </div>
  );
}

export const profileAvatarIconKeys = [
  "zap",
  "gamepad2",
  "swords",
  "joystick",
  "brain",
  "shield",
  "rocket",
  "flame",
  "sparkles",
] as const;

export { avatarIconMap };
