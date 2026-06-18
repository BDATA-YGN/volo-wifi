"use client";

import { Moon, Sun } from "lucide-react";
import clsx from "clsx";
import { useMobileThemeStore, type MobileColorScheme } from "../mobileThemeStore";
import shellStyles from "./mobile.module.css";

interface MobileThemeToggleProps {
  className?: string;
  /** Compact pill for profile row; default segmented control */
  variant?: "segmented" | "row";
}

export default function MobileThemeToggle({
  className,
  variant = "segmented",
}: MobileThemeToggleProps) {
  const theme = useMobileThemeStore((s) => s.theme);
  const setTheme = useMobileThemeStore((s) => s.setTheme);

  const select = (next: MobileColorScheme) => setTheme(next);

  if (variant === "row") {
    return (
      <div className={clsx(shellStyles.themeSegmented, className)} role="group" aria-label="Appearance">
        <button
          type="button"
          className={clsx(shellStyles.themeOption, theme === "light" && shellStyles.themeOptionActive)}
          aria-pressed={theme === "light"}
          onClick={() => select("light")}
        >
          <Sun size={16} aria-hidden />
          Light
        </button>
        <button
          type="button"
          className={clsx(shellStyles.themeOption, theme === "dark" && shellStyles.themeOptionActive)}
          aria-pressed={theme === "dark"}
          onClick={() => select("dark")}
        >
          <Moon size={16} aria-hidden />
          Dark
        </button>
      </div>
    );
  }

  return (
    <div className={clsx(shellStyles.themeSegmented, className)} role="group" aria-label="Appearance">
      {(["light", "dark"] as const).map((mode) => {
        const Icon = mode === "light" ? Sun : Moon;
        const active = theme === mode;
        return (
          <button
            key={mode}
            type="button"
            className={clsx(shellStyles.themeOption, active && shellStyles.themeOptionActive)}
            aria-pressed={active}
            onClick={() => select(mode)}
          >
            <Icon size={16} aria-hidden />
            {mode === "light" ? "Light" : "Dark"}
          </button>
        );
      })}
    </div>
  );
}
