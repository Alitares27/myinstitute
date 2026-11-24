import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";
import type { LocalNotificationSchema } from "@capacitor/local-notifications";

export type ReminderPlan = { key: string; title: string; body: string; href: string; at: string };
const cacheKey = 'android-reminder-plan';
const enabledKey = 'android-reminders-enabled';
const channel = 'gestionar-recordatorios';
export const isAndroidNotifications = () => Capacitor.getPlatform() === 'android';
let generation = 0;
let work: Promise<void> = Promise.resolve();
export function notificationId(key: string) { let hash = 0; for (const char of key) hash = (Math.imul(hash, 31) + char.charCodeAt(0)) | 0; return (hash & 0x7fffffff) || 1; }
export async function androidNotificationPermission() {
  if (!isAndroidNotifications()) return 'unsupported';
  return (await LocalNotifications.checkPermissions()).display;
}
export async function enableAndroidNotifications() {
  if (!isAndroidNotifications()) return false;
  const result = await LocalNotifications.requestPermissions();
  const granted = result.display === 'granted';
  localStorage.setItem(enabledKey, String(granted));
  window.dispatchEvent(new window.Event('notifications:native-enable'));
  return granted;
}
export function clearAndroidReminders() {
  generation++;
  if (!isAndroidNotifications()) return Promise.resolve();
  work = work.catch(() => { }).then(async () => {
    const pending = await LocalNotifications.getPending();
    if (pending.notifications.length) await LocalNotifications.cancel({ notifications: pending.notifications.map(item => ({ id: item.id })) });
    await LocalNotifications.removeAllDeliveredNotifications();
    localStorage.removeItem(cacheKey);
  });
  return work.catch(() => { });
}
export function synchronizeAndroidReminders(userId: string, plan: ReminderPlan[]) {
  if (!isAndroidNotifications() || localStorage.getItem(enabledKey) !== 'true') return Promise.resolve();
  const run = generation;
  work = work.catch(() => { }).then(async () => {
    if (run !== generation || (await androidNotificationPermission()) !== 'granted') return;
    const currentUser = () => String(JSON.parse(localStorage.getItem('user') || '{}')?.id ?? '');
    if (currentUser() !== userId) return;
    await LocalNotifications.createChannel({ id: channel, name: 'Recordatorios de GestionAR', description: 'Actividades, consejos y asistencia', importance: 4, visibility: 0 });
    let cached: { userId: string; items: Record<string, { id: number; at: string }> } = { userId, items: {} };
    try { const stored = JSON.parse(localStorage.getItem(cacheKey) || 'null'); if (stored?.userId === userId) cached = stored; } catch {/* Rebuild invalid metadata. */ }
    const pending = await LocalNotifications.getPending();
    const pendingIds = new Set(pending.notifications.map(item => item.id));
    const used = new Set<number>(), wanted = new Set<number>(), next: typeof cached.items = {};
    const notifications: LocalNotificationSchema[] = [];
    const now = Date.now();
    for (const item of plan.slice(0, 450)) {
      const timestamp = new Date(item.at).getTime(); if (!Number.isFinite(timestamp)) continue;
      let id = cached.items[item.key]?.id ?? notificationId(item.key); while (used.has(id)) id = id === 2147483647 ? 1 : id + 1;
      used.add(id); wanted.add(id); next[item.key] = { id, at: item.at };
      const old = cached.items[item.key];
      if (old?.at === item.at && (pendingIds.has(id) || timestamp <= now)) continue;
      notifications.push({ id, title: item.title, body: item.body, channelId: channel, smallIcon: 'ic_notification', autoCancel: true, schedule: { at: new Date(Math.max(timestamp, now + 5000)), allowWhileIdle: true }, extra: { key: item.key, href: item.href, userId } });
    }
    const obsolete = pending.notifications.filter(item => !wanted.has(item.id)).map(item => ({ id: item.id }));
    if (run !== generation || currentUser() !== userId) return;
    if (obsolete.length) await LocalNotifications.cancel({ notifications: obsolete });
    if (notifications.length) await LocalNotifications.schedule({ notifications });
    if (run === generation && currentUser() === userId) localStorage.setItem(cacheKey, JSON.stringify({ userId, items: next }));
  });
  return work;
}
export async function listenAndroidNotifications(onOpen: (href: string) => void) {
  if (!isAndroidNotifications()) return { remove: async () => { } };
  return LocalNotifications.addListener('localNotificationActionPerformed', event => {
    const extra = event.notification.extra;
    const current = String(JSON.parse(localStorage.getItem('user') || '{}')?.id ?? '');
    if (current && current === extra?.userId && typeof extra.href === 'string' && /^\/(actividades|asistencia|consejos\/\d+)$/.test(extra.href)) onOpen(extra.href);
  });
}
