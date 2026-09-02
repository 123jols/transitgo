export const RIDER_TYPE_STORAGE_KEY = "transitgo-user-type";

export const RIDER_TYPES = [
  { id: "regular", label: "Regular", discount: 0 },
  { id: "student", label: "Student", discount: 0.2 },
  { id: "pwd", label: "PWD", discount: 0.3 },
  { id: "tourist", label: "Tourist", discount: 0.1 },
];

export function getStoredRiderType() {
  try {
    const stored = localStorage.getItem(RIDER_TYPE_STORAGE_KEY);
    return RIDER_TYPES.some((t) => t.id === stored) ? stored : "regular";
  } catch {
    return "regular";
  }
}

export function setStoredRiderType(id) {
  try {
    localStorage.setItem(RIDER_TYPE_STORAGE_KEY, id);
  } catch {
    // best-effort only
  }
}
