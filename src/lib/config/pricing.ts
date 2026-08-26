// Pricing copy on the landing page reads from here so the numbers can change
// in one place once real usage data comes in.
export const TRIAL_CALLS = 2;
export const TRIAL_CALL_MINUTES = 5;
export const CREDIT_PACK_CALLS = 40;
export const CREDIT_PACK_PRICE_INR = 999;

// Hard per-call duration cap, in seconds — applies to trial and paid-credit
// calls alike. Passed explicitly into the entitlement RPCs so the database
// never hardcodes its own copy of this number.
export const MAX_CALL_DURATION_SECONDS = TRIAL_CALL_MINUTES * 60;
