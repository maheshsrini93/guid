/**
 * Maintenance reminder storage — localStorage-based for now.
 * Will migrate to DB + push notifications in Phase 4.
 */

const STORAGE_KEY = "guid-maintenance-reminders";

export interface MaintenanceReminder {
  /** Product ID */
  productId: number;
  /** Product name for display */
  productName: string;
  /** Article number for linking */
  articleNumber: string;
  /** Reminder interval in days */
  intervalDays: number;
  /** When the reminder was created */
  createdAt: string;
  /** When the next reminder is due */
  nextDueAt: string;
  /** What type of maintenance (from chat context) */
  maintenanceType: string;
}

/**
 * Get all saved maintenance reminders.
 */
export function getReminders(): MaintenanceReminder[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Save a new maintenance reminder.
 * Replaces any existing reminder for the same product + maintenance type.
 */
export function saveReminder(reminder: MaintenanceReminder): void {
  if (typeof window === "undefined") return;
  const existing = getReminders();
  const filtered = existing.filter(
    (r) =>
      !(
        r.productId === reminder.productId &&
        r.maintenanceType === reminder.maintenanceType
      )
  );
  filtered.push(reminder);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
}

/**
 * Remove a maintenance reminder for a specific product and type.
 */
export function removeReminder(
  productId: number,
  maintenanceType: string
): void {
  if (typeof window === "undefined") return;
  const existing = getReminders();
  const filtered = existing.filter(
    (r) =>
      !(r.productId === productId && r.maintenanceType === maintenanceType)
  );
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
}

/**
 * Check if a reminder exists for a given product.
 */
export function hasReminder(productId: number): boolean {
  return getReminders().some((r) => r.productId === productId);
}

/**
 * Get all reminders that are currently due (nextDueAt <= now).
 */
export function getDueReminders(): MaintenanceReminder[] {
  const now = new Date().toISOString();
  return getReminders().filter((r) => r.nextDueAt <= now);
}

/** Common maintenance interval presets (in days). */
export const REMINDER_INTERVALS = [
  { label: "Every month", days: 30 },
  { label: "Every 3 months", days: 90 },
  { label: "Every 6 months", days: 180 },
  { label: "Yearly", days: 365 },
] as const;
