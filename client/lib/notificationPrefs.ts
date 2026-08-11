export interface NotificationPrefs {
  postPublished: boolean;
  postFailed: boolean;
  weeklyDigest: boolean;
  newFollowers: boolean;
  aiSuggestions: boolean;
  billingAlerts: boolean;
  productUpdates: boolean;
}

export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  postPublished: true,
  postFailed: true,
  weeklyDigest: true,
  newFollowers: false,
  aiSuggestions: true,
  billingAlerts: true,
  productUpdates: false,
};

// localStorage is used as a fast local cache; the source of truth is the server
// (GET/PATCH /auth/me/notification-prefs). The cache survives page reloads and
// prevents a flash of default values while the API call is in flight.
function storageKey(userId: string) {
  return `relay_notif_prefs_${userId}`;
}

export function loadNotificationPrefs(userId: string): NotificationPrefs {
  if (typeof window === 'undefined') return DEFAULT_NOTIFICATION_PREFS;
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return DEFAULT_NOTIFICATION_PREFS;
    return { ...DEFAULT_NOTIFICATION_PREFS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_NOTIFICATION_PREFS;
  }
}

export function saveNotificationPrefs(userId: string, prefs: NotificationPrefs) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(storageKey(userId), JSON.stringify(prefs));
}
