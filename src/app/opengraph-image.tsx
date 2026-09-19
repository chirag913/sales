import { ImageResponse } from "next/og";

export const alt = "BetterCallz — You already paid for the lead. Make sure someone calls it.";
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
          <div style={{ display: "flex", flexDirection: "column", fontSize: 68, fontWeight: 600, lineHeight: 1.08, letterSpacing: -2.5, maxWidth: 1056 }}>
            <div style={{ display: "flex" }}>You already paid for the lead.</div>
            <div style={{ display: "flex" }}>Make sure someone calls it.</div>
          </div>
          <div style={{ marginTop: 28, fontSize: 30, color: "#a1a1aa", maxWidth: 960 }}>
            BetterCallz starts the first conversation with your new and existing leads, and hands your sales team the ones worth following up.
          </div>
        </div>
      </div>
    ),
    size
  );
}
