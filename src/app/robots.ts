import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://bettercallz.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/admin", "/practice", "/profile", "/history", "/audio-check", "/accept-invite"] },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
