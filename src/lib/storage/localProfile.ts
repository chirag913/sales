import { SalesProfile } from "@/lib/types";

const STORAGE_KEY = "cct:salesProfile";

export function loadSalesProfile(): SalesProfile | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SalesProfile;
  } catch {
    return null;
  }
}

export function saveSalesProfile(profile: SalesProfile): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
}
