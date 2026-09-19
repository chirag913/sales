import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://bettercallz.com";

// Public marketing pages only. The signed-in app (/practice, /profile,
// /history, /admin, /audio-check) is intentionally left out.
export default function sitemap(): MetadataRoute.Sitemap {
  return ["/", "/outbound", "/privacy", "/terms", "/refund"].map((path) => ({
    url: `${SITE_URL}${path}`,
    lastModified: new Date(),
  }));
}
