import type { NextConfig } from "next";

// Baseline security headers only — CSP deliberately left out for now.
// This app loads three third-party surfaces from the browser (OpenAI's
// Realtime WebRTC endpoint, Razorpay's checkout widget — which itself fans
// out to different sub-domains depending on the payment method the user
// picks — and Cloudflare Turnstile), and getting a CSP wrong here fails
// silently: a call that won't connect or a checkout that won't open, not an
// error. That needs verifying against live WebRTC/mic and an actual
// payment run-through, not just a static review — tracked as a follow-up.
const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
