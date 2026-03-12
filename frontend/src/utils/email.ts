export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function isValidEmailFormat(value: string): boolean {
  const email = normalizeEmail(value);
  if (!email) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
