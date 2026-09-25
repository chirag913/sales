"use client";

import { useEffect, useState } from "react";
import { trackEvent } from "@/lib/analytics";

// The official BetterCallz WhatsApp number, digits only with country code.
// NEXT_PUBLIC_WHATSAPP_NUMBER overrides it per environment.
const WHATSAPP_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "918447355977";
const MESSAGE = "Hi, I saw BetterCallz and want to know more about AI calling.";
const HREF = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(MESSAGE)}`;

// Elements the button must never sit on top of: the lead form and the footer.
// While either is on screen the button fades out.
const AVOID = ["#get-started", "footer"];

function WhatsAppIcon() {
  return (
    <svg aria-hidden width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="shrink-0 text-[#25D366]">
      <path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.64.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48 0 1.46 1.07 2.88 1.21 3.07.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.62.71.23 1.36.2 1.87.12.57-.08 1.76-.72 2.01-1.41.25-.7.25-1.29.17-1.41-.07-.13-.27-.2-.57-.35ZM12.05 21.5h-.01a9.43 9.43 0 0 1-4.8-1.32l-.35-.2-3.57.93.95-3.48-.22-.36A9.42 9.42 0 0 1 2.6 12c0-5.2 4.24-9.44 9.46-9.44a9.4 9.4 0 0 1 6.68 2.77 9.38 9.38 0 0 1 2.76 6.68c0 5.21-4.24 9.45-9.45 9.45Zm8.04-17.5A11.3 11.3 0 0 0 12.05.67C5.78.67.68 5.77.67 12.04c0 2 .52 3.96 1.52 5.68L.57 23.67l6.09-1.6a11.35 11.35 0 0 0 5.39 1.37h.01c6.26 0 11.36-5.1 11.37-11.37a11.3 11.3 0 0 0-3.34-8.04Z" />
    </svg>
  );
}

export function WhatsAppButton() {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const targets = AVOID.flatMap((s) => Array.from(document.querySelectorAll(s)));
    if (targets.length === 0) return;
    const visible = new Set<Element>();
    const observer = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting) visible.add(e.target);
        else visible.delete(e.target);
      }
      setHidden(visible.size > 0);
    });
    targets.forEach((t) => observer.observe(t));
    return () => observer.disconnect();
  }, []);

  return (
    <a
      href={HREF}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with BetterCallz on WhatsApp"
      aria-hidden={hidden || undefined}
      tabIndex={hidden ? -1 : undefined}
      onClick={() => trackEvent("whatsapp_click")}
      style={{ bottom: "max(1.25rem, env(safe-area-inset-bottom))" }}
      className={`shadow-premium fixed right-4 z-40 inline-flex h-12 w-12 items-center justify-center gap-2 rounded-full border border-zinc-200 bg-white text-sm font-medium text-zinc-800 transition-all duration-200 hover:-translate-y-px hover:border-zinc-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600/40 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:border-zinc-700 sm:right-5 sm:h-auto sm:w-auto sm:px-4 sm:py-2.5 ${
        hidden ? "pointer-events-none translate-y-2 opacity-0" : "opacity-100"
      }`}
    >
      <WhatsAppIcon />
      <span className="hidden sm:inline">Chat on WhatsApp</span>
    </a>
  );
}
