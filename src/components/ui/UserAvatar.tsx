"use client";

import { useState } from "react";

interface UserAvatarProps {
  user: {
    name?: string | null;
    avatarUrl?: string | null;
  };
  size?: "sm" | "md" | "lg";
}

const sizeClasses = {
  sm: "w-8 h-8 text-xs",
  md: "w-10 h-10 text-sm",
  lg: "w-20 h-20 text-xl",
};

function getInitials(name?: string | null): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function UserAvatar({ user, size = "md" }: UserAvatarProps) {
  const [imgError, setImgError] = useState(false);
  const classes = sizeClasses[size];

  if (user.avatarUrl && !imgError) {
    return (
      <div className={`${classes} rounded-full overflow-hidden flex-shrink-0`}>
        <img
          src={user.avatarUrl}
          alt={user.name || "Avatar"}
          className="rounded-full object-cover w-full h-full"
          onError={() => setImgError(true)}
        />
      </div>
    );
  }

  return (
    <div
      className={`${classes} rounded-full bg-[#D57828] flex items-center justify-center flex-shrink-0`}
    >
      <span className="text-white font-semibold">{getInitials(user.name)}</span>
    </div>
  );
}
