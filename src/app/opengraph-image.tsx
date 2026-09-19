import { ImageResponse } from "next/og";

export const alt = "BetterCallz — Turn every lead into a conversation";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Social preview: wordmark and headline on a plain dark ground. Generated at
// build time, no external assets.
export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#0a0a0a",
          color: "#fafafa",
          padding: "72px",
        }}
      >
        <div style={{ display: "flex", fontSize: 40, fontWeight: 600, letterSpacing: -1 }}>
          bettercallz<span style={{ color: "#2dd4bf" }}>.</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 84, fontWeight: 600, lineHeight: 1.05, letterSpacing: -3, maxWidth: 960 }}>
            Turn every lead into a conversation.
          </div>
          <div style={{ marginTop: 28, fontSize: 30, color: "#a1a1aa", maxWidth: 900 }}>
            Respond to new leads faster. Recover the ones you&apos;ve already paid for.
          </div>
        </div>
      </div>
    ),
    size
  );
}
