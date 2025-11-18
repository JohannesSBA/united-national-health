export function normalizeContactEmail(value?: string | null) {
  if (!value) return "";
  const trimmed = value.trim().toLowerCase();
  return trimmed;
}

export function normalizeContactPhone(value?: string | null) {
  if (!value) return "";
  const trimmed = value.trim();
  if (!trimmed) return "";
  const cleaned = trimmed.replace(/[^+\d]/g, "");
  return cleaned;
}
