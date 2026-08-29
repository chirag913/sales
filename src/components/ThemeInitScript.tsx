"use client";

import { useServerInsertedHTML } from "next/navigation";

// Applies a stored theme choice before hydration, avoiding a flash of the
// wrong theme. Deliberately does NOT read prefers-color-scheme — light is
// the default for every first-time visitor regardless of OS setting; dark
// only applies once someone has explicitly opted in via ThemeToggle, which
// is what "theme" ever gets set to in localStorage.
const THEME_INIT_SCRIPT = `
(function () {
  try {
    if (localStorage.getItem("theme") === "dark") {
      document.documentElement.classList.add("dark");
    }
  } catch (e) {}
})();
`;

// useServerInsertedHTML's callback only runs during the server's HTML
// stream — the <script> it returns is written directly into that stream,
// not reconciled as part of this component's client-side render tree
// (which is always null). That's why this needs to exist as its own
// component rather than a raw <script> tag inline in layout.tsx: a plain
// <script> child re-enters the tree on every client render/remount, and
// React 19 warns loudly that scripts inserted that way never execute
// ("Encountered a script tag while rendering React component") — a real,
// if usually dev-only, warning, not a false alarm to suppress. Routing it
// through the server-insertion stream sidesteps the client tree entirely,
// while keeping the exact same parse-time execution this needs to beat
// the paint and avoid a flash of the wrong theme.
export function ThemeInitScript() {
  useServerInsertedHTML(() => <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />);
  return null;
}
