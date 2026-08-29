import { AVATAR_PALETTES, hashString } from "@/components/ui/ProspectAvatar";

const SIZE_CLASSES: Record<"sm" | "md", string> = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
};

function getInitials(label: string): string {
  const namePart = label.split("@")[0] ?? label;
  const parts = namePart.split(/[._-]+/).filter(Boolean);
  const first = parts[0]?.[0] ?? label[0] ?? "?";
  const second = parts.length > 1 ? parts[1][0] : namePart[1];
  return (first + (second ?? "")).toUpperCase();
}

interface InitialsAvatarProps {
  // A stable per-person identifier used for both the initials and the
  // deterministic color pick — email, since that's all team rows carry.
  label: string;
  size?: "sm" | "md";
}

export function InitialsAvatar({ label, size = "md" }: InitialsAvatarProps) {
  const hash = hashString(label);
  const [from, to] = AVATAR_PALETTES[hash % AVATAR_PALETTES.length];

  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full font-medium text-zinc-700 ${SIZE_CLASSES[size]}`}
      style={{ backgroundImage: `linear-gradient(135deg, ${from}, ${to})` }}
      aria-hidden
    >
      {getInitials(label)}
    </div>
  );
}
