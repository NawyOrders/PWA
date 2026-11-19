"use client";

import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";
import { useApp } from "@/components/providers";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function InstallButton({ variant = "light" }: { variant?: "light" | "dark" }) {
  const { t } = useApp();
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const handler = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (!promptEvent || dismissed) return null;

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={async () => {
          await promptEvent.prompt();
          const choice = await promptEvent.userChoice;
          if (choice.outcome === "accepted") setPromptEvent(null);
        }}
        className={
          variant === "dark"
            ? "inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-xs font-bold text-white backdrop-blur transition hover:bg-white/25"
            : "inline-flex items-center gap-2 rounded-full border border-line bg-white px-4 py-2 text-xs font-bold text-brand transition hover:border-brand/40 hover:bg-brand-soft"
        }
      >
        <Download className="size-4" />
        {t("تثبيت التطبيق")}
      </button>
      <button
        type="button"
        aria-label={t("إغلاق")}
        onClick={() => setDismissed(true)}
        className={variant === "dark" ? "text-white/70 hover:text-white" : "text-muted hover:text-ink"}
      >
        <X className="size-4" />
      </button>
    </div>
  );
}
