// Accepts common ways someone might type a Philippine mobile number —
// "09171234567", "9171234567", "639171234567", "+639171234567", with or
// without spaces/dashes — and normalizes all of them to one canonical form
// so the same number is never stored two different ways.
export function normalizePhilippineMobile(raw) {
  const kept = (raw || "").replace(/[^\d+]/g, "");
  const withoutCountryCode = kept.replace(/^\+?63/, "").replace(/^0/, "");
  if (!/^9\d{9}$/.test(withoutCountryCode)) return null;
  return `+63${withoutCountryCode}`;
}

export function isValidPhilippineMobile(raw) {
  return normalizePhilippineMobile(raw) !== null;
}
