import { emptySalesProfile, SalesProfile } from "@/lib/types";

const STORAGE_KEY = "cct:salesProfile";

export function loadSalesProfile(): SalesProfile | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<SalesProfile>;
    const defaults = emptySalesProfile();
    // Merge onto defaults so fields added after a profile was saved
    // (e.g. an older stored profile from before a new field existed)
    // are never left undefined.
    return {
      company: { ...defaults.company, ...parsed.company },
      offer: { ...defaults.offer, ...parsed.offer },
      targetCustomer: { ...defaults.targetCustomer, ...parsed.targetCustomer },
      proof: { ...defaults.proof, ...parsed.proof },
      salesObjective: parsed.salesObjective ?? defaults.salesObjective,
      importantInfo: { ...defaults.importantInfo, ...parsed.importantInfo },
    };
  } catch {
    return null;
  }
}

export function saveSalesProfile(profile: SalesProfile): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
}
