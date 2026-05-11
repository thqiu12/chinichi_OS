// Normalization for dedupe. Keep tight — over-aggressive collapsing causes false positives.

export function normalizePhone(raw?: string | null): string | null {
  if (!raw) return null;
  let s = raw.trim().replace(/[\s\-()]/g, "");
  // Strip leading + and common country codes (CN: 86, JP: 81). Keep last 11/10 digits.
  s = s.replace(/^\+?(86|81)/, "");
  s = s.replace(/^0/, "");
  s = s.replace(/[^\d]/g, "");
  return s || null;
}

export function normalizeWechat(raw?: string | null): string | null {
  if (!raw) return null;
  const s = raw.trim().toLowerCase().replace(/[\s_@]/g, "");
  return s || null;
}

export function normalizeName(raw?: string | null): string | null {
  if (!raw) return null;
  const s = raw.normalize("NFKC").trim().replace(/\s+/g, "");
  return s || null;
}
