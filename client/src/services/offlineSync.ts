import type { AxiosRequestConfig } from "axios";
import { App } from "@capacitor/app";
import { Capacitor, registerPlugin } from "@capacitor/core";

const DATABASE = "gestionar-offline-v1";
const DATABASE_VERSION = 3;
const CACHE_STORE = "responses";
const OUTBOX_STORE = "outbox";
const SESSION_STORE = "sessions";
const META_STORE = "meta";
const STATE_EVENT = "gestionar:offline-state";

export interface OfflineState {
  online: boolean;
  pending: number;
  syncing: boolean;
  message: string;
}

interface CachedResponse {
  key: string;
  userId: string;
  url: string;
  data: unknown;
  savedAt: number;
}

interface NativeSyncState {
  activeUserId: string;
  pendingIds: string[];
  mappings: Array<{ userId: string; localId: number; serverId: number | string }>;
  message: string;
}

const NativeOfflineSync = registerPlugin<{
  setSession(options: { userId: string; token: string; apiBase: string }): Promise<void>;
  clearSession(options: { userId: string }): Promise<void>;
  enqueue(options: { operation: PendingMutation }): Promise<void>;
  getState(): Promise<NativeSyncState>;
  acknowledgeMappings(options: { localIds: number[] }): Promise<void>;
}>("NativeOfflineSync");

const isNativeAndroid = () => Capacitor.getPlatform() === "android";

export interface PendingMutation {
  id: string;
  userId: string;
  method: string;
  url: string;
  data?: unknown;
  localId?: number;
  createdAt: number;
}

let databasePromise: Promise<IDBDatabase> | undefined;
let syncing = false;
let syncMessage = "";

function apiBaseUrl(): string {
  return (import.meta.env.VITE_API_URL || "http://localhost:5000/api").replace(/\/+$/, "");
}

function currentUserId(): string | null {
  try {
    const user = JSON.parse(localStorage.getItem("user") || "null");
    return user?.id == null ? null : String(user.id);
  } catch {
    return null;
  }
}

function openDatabase(): Promise<IDBDatabase> {
  if (!databasePromise) {
    databasePromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DATABASE, DATABASE_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(CACHE_STORE)) {
          const cache = db.createObjectStore(CACHE_STORE, { keyPath: "key" });
          cache.createIndex("userId", "userId", { unique: false });
        }
        if (!db.objectStoreNames.contains(OUTBOX_STORE)) {
          const outbox = db.createObjectStore(OUTBOX_STORE, { keyPath: "id" });
          outbox.createIndex("userId", "userId", { unique: false });
        }
        if (!db.objectStoreNames.contains(SESSION_STORE)) db.createObjectStore(SESSION_STORE, { keyPath: "userId" });
        if (!db.objectStoreNames.contains(META_STORE)) db.createObjectStore(META_STORE, { keyPath: "key" });
      };
      request.onsuccess = () => {
        request.result.onversionchange = () => request.result.close();
        resolve(request.result);
      };
      request.onerror = () => reject(request.error);
    });
  }
  return databasePromise;
}

function storeRequest<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function withStore<T>(name: string, mode: IDBTransactionMode, action: (store: IDBObjectStore) => Promise<T>): Promise<T> {
  const db = await openDatabase();
  const transaction = db.transaction(name, mode);
  return action(transaction.objectStore(name));
}

function stableParams(params: unknown): string {
  if (!params || typeof params !== "object") return "";
  return Object.entries(params as Record<string, unknown>)
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join("&");
}

function requestUrl(config: AxiosRequestConfig): string {
  const raw = config.url || "/";
  const path = raw.startsWith("http") ? new URL(raw).pathname : raw.split("?")[0];
  const params = stableParams(config.params);
  const rawQuery = raw.includes("?") ? raw.slice(raw.indexOf("?") + 1) : "";
  const query = [rawQuery, params].filter(Boolean).join("&");
  return `${path}${query ? `?${query}` : ""}`;
}

function cacheKey(userId: string, url: string): string {
  return `${userId}:${url}`;
}

export async function cacheGetResponse(userId: string, url: string, data: unknown): Promise<void> {
  const entry: CachedResponse = { key: cacheKey(userId, url), userId, url, data, savedAt: Date.now() };
  await withStore(CACHE_STORE, "readwrite", (store) => storeRequest(store.put(entry)));
}

export async function readCachedGet(userId: string, url: string): Promise<unknown | undefined> {
  const entry = await withStore(CACHE_STORE, "readonly", (store) => storeRequest<CachedResponse | undefined>(store.get(cacheKey(userId, url))));
  return entry?.data;
}

function parseRequestData(data: unknown): unknown {
  if (typeof data !== "string") return data;
  try { return JSON.parse(data); } catch { return data; }
}

function nextLocalId(): number {
  const key = "gestionar:offline-next-id";
  const previous = Number(localStorage.getItem(key) || 0);
  const next = previous > 0 ? previous + 1 : 1;
  localStorage.setItem(key, String(next));
  return -next;
}

function notifyState(): void {
  void getOfflineState().then((state) => window.dispatchEvent(new CustomEvent<OfflineState>(STATE_EVENT, { detail: state })));
}

export function subscribeOfflineState(listener: (state: OfflineState) => void): () => void {
  const handler = (event: Event) => listener((event as CustomEvent<OfflineState>).detail);
  window.addEventListener(STATE_EVENT, handler);
  return () => window.removeEventListener(STATE_EVENT, handler);
}

export async function getOfflineState(): Promise<OfflineState> {
  if (isNativeAndroid()) {
    try {
      const nativeState = await NativeOfflineSync.getState();
      const userId = currentUserId();
      if (userId && nativeState.activeUserId === userId) {
        return { online: navigator.onLine, pending: nativeState.pendingIds.length, syncing, message: nativeState.message || syncMessage };
      }
    } catch {
    }
  }
  let pending = 0;
  const userId = currentUserId();
  if (userId) {
    const entries = await withStore(OUTBOX_STORE, "readonly", (store) => storeRequest<PendingMutation[]>(store.index("userId").getAll(userId)));
    pending = entries.length;
  }
  return { online: navigator.onLine, pending, syncing, message: syncMessage };
}

export async function enqueueMutation(config: AxiosRequestConfig): Promise<{ data: unknown; queued: boolean }> {
  const userId = currentUserId();
  if (!userId) throw new Error("Inicia sesión con conexión antes de realizar cambios sin conexión.");
  const token = localStorage.getItem("token");
  if (token) await rememberOfflineSession(token);
  const method = (config.method || "post").toUpperCase();
  const url = requestUrl(config);
  const localId = method === "POST" ? nextLocalId() : undefined;
  const record: PendingMutation = {
    id: crypto.randomUUID(), userId, method, url,
    data: parseRequestData(config.data), localId, createdAt: Date.now(),
  };
  await withStore(OUTBOX_STORE, "readwrite", (store) => storeRequest(store.put(record)));
  if (isNativeAndroid()) {
    try { await NativeOfflineSync.enqueue({ operation: record }); }
    catch (error) {
      await removeMutation(record);
      throw error;
    }
  }
  notifyState();
  if (!isNativeAndroid()) {
    void navigator.serviceWorker?.ready.then((registration) => (registration as any).sync?.register("gestionar-outbox")).catch(() => undefined);
  }

  const payload = record.data && typeof record.data === "object" ? record.data as Record<string, unknown> : {};
  const result = { ...payload, ...(localId ? { id: localId } : {}), _offlinePending: true };
  return { data: url.startsWith("/users?") || url === "/users" ? { user: result, ...result } : result, queued: true };
}

export async function rememberOfflineSession(token: string): Promise<void> {
  const userId = currentUserId();
  if (!userId) return;
  const session = { userId, token, apiBase: apiBaseUrl() };
  try { await withStore(SESSION_STORE, "readwrite", (store) => storeRequest(store.put(session))); }
  catch { /* Authentication still works if local session storage is unavailable. */ }
  if (isNativeAndroid()) {
    try { await NativeOfflineSync.setSession(session); }
    catch { syncMessage = "No se pudo preparar la sincronización nativa de Android."; }
  }
}

export async function forgetOfflineSession(): Promise<void> {
  const userId = currentUserId();
  if (!userId) return;
  try { await withStore(SESSION_STORE, "readwrite", (store) => storeRequest(store.delete(userId))); }
  catch { /* Keep local sign-out available even if IndexedDB is unavailable. */ }
  if (isNativeAndroid()) {
    try { await NativeOfflineSync.clearSession({ userId }); } catch { /* Local sign-out must still complete. */ }
  }
}

async function acquireSyncLock(owner: string): Promise<boolean> {
  const db = await openDatabase();
  return new Promise((resolve) => {
    const transaction = db.transaction(META_STORE, "readwrite");
    const store = transaction.objectStore(META_STORE);
    let acquired = false;
    const request = store.get("sync-lock");
    request.onsuccess = () => {
      if (!request.result || request.result.expiresAt <= Date.now()) {
        store.put({ key: "sync-lock", owner, expiresAt: Date.now() + 120_000 });
        acquired = true;
      }
    };
    transaction.oncomplete = () => resolve(acquired);
    transaction.onerror = () => resolve(false);
    transaction.onabort = () => resolve(false);
  });
}

async function releaseSyncLock(owner: string): Promise<void> {
  const db = await openDatabase();
  await new Promise<void>((resolve) => {
    const transaction = db.transaction(META_STORE, "readwrite");
    const store = transaction.objectStore(META_STORE);
    const request = store.get("sync-lock");
    request.onsuccess = () => { if (request.result?.owner === owner) store.delete("sync-lock"); };
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => resolve();
    transaction.onabort = () => resolve();
  });
}

export async function cacheSuccessfulGet(userId: string | null, config: AxiosRequestConfig, data: unknown): Promise<void> {
  if (!userId) return;
  try { await cacheGetResponse(userId, requestUrl(config), data); } catch { /* Offline storage is an enhancement; keep online use available. */ }
}

export async function readOfflineGet(config: AxiosRequestConfig): Promise<{ data: unknown; cached: boolean }> {
  const userId = currentUserId();
  if (!userId) throw new Error("No hay una sesión disponible sin conexión.");
  let data = await readCachedGet(userId, requestUrl(config));
  if (data === undefined) throw new Error("Esta información todavía no está guardada en el dispositivo. Ábrela con conexión para usarla sin conexión.");
  const url = requestUrl(config);
  const readPath = url.split("?")[0].split("/").filter(Boolean);
  const readRoot = readPath[0];
  const changes = await withStore(OUTBOX_STORE, "readonly", (store) => storeRequest<PendingMutation[]>(store.index("userId").getAll(userId)));
  for (const change of changes.sort((left, right) => left.createdAt - right.createdAt)) {
    const writePath = change.url.split("?")[0].split("/").filter(Boolean);
    const sameCollection = writePath[0] === readRoot && (
      readPath.length === 1 ||
      (readPath.length === 2 && readPath[1] === "members" && readRoot === "users")
    );
    if (!sameCollection || writePath.length > 2) continue;
    const targetId = writePath.length === 2 ? Number(writePath[1]) : null;
    const payload = change.data && typeof change.data === "object" ? change.data as Record<string, unknown> : {};
    const cachedList = Array.isArray(data) ? data : data && typeof data === "object" && Array.isArray((data as any).items) ? (data as any).items : null;
    if (!cachedList) continue;
    let items = [...cachedList];
    if (change.method === "POST" && !targetId) {
      const entry = { ...payload, ...(change.localId ? { id: change.localId } : {}), _offlinePending: true };
      if (!items.some((item: any) => item?.id === entry.id)) items.push(entry);
      data = Array.isArray(data) ? items : { ...(data as object), items, total: Number((data as any).total || 0) + 1 };
    } else if (["PUT", "PATCH"].includes(change.method) && targetId !== null) {
      items = items.map((item: any) => item?.id === targetId ? { ...item, ...payload, _offlinePending: true } : item);
      data = Array.isArray(data) ? items : { ...(data as object), items };
    } else if (change.method === "DELETE" && targetId !== null) {
      const before = items.length;
      items = items.filter((item: any) => item?.id !== targetId);
      data = Array.isArray(data) ? items : { ...(data as object), items, total: Math.max(0, Number((data as any).total || 0) - (before - items.length)) };
    }
  }
  return { data, cached: true };
}

function replaceLocalId(value: unknown, localId: number, serverId: unknown): unknown {
  if (value === localId || value === String(localId)) return serverId;
  if (Array.isArray(value)) return value.map((item) => replaceLocalId(item, localId, serverId));
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, replaceLocalId(item, localId, serverId)]));
  }
  return value;
}

async function saveLocalIdMapping(localId: number, serverId: unknown, userId: string): Promise<void> {
  const entries = await withStore(OUTBOX_STORE, "readonly", (store) => storeRequest<PendingMutation[]>(store.index("userId").getAll(userId)));
  const escapedId = String(localId).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const idPattern = new RegExp(`(^|[^\\d])${escapedId}(?=$|[^\\d])`, "g");
  await withStore(OUTBOX_STORE, "readwrite", (store) => Promise.all(entries.filter((entry) => entry.localId !== localId).map((entry) => {
    const updated = { ...entry, url: entry.url.replace(idPattern, `$1${serverId}`), data: replaceLocalId(entry.data, localId, serverId) };
    return storeRequest(store.put(updated));
  })));
}

async function applyCachedIdMapping(localId: number, serverId: unknown, userId: string): Promise<void> {
  const entries = await withStore(CACHE_STORE, "readonly", (store) => storeRequest<CachedResponse[]>(store.index("userId").getAll(userId)));
  await withStore(CACHE_STORE, "readwrite", (store) => Promise.all(entries.map((entry) => {
    const updated = { ...entry, data: replaceLocalId(entry.data, localId, serverId) };
    return storeRequest(store.put(updated));
  })));
}

async function synchronizeNativeQueue(): Promise<void> {
  const userId = currentUserId();
  const token = localStorage.getItem("token");
  if (!userId || !token) return;
  await rememberOfflineSession(token);
  syncing = true;
  notifyState();
  try {
    const state = await NativeOfflineSync.getState();
    if (state.activeUserId !== userId) return;
    for (const mapping of state.mappings || []) {
      if (mapping.userId !== userId) continue;
      await saveLocalIdMapping(mapping.localId, mapping.serverId, userId);
      await applyCachedIdMapping(mapping.localId, mapping.serverId, userId);
    }
    if (state.mappings?.length) {
      await NativeOfflineSync.acknowledgeMappings({ localIds: state.mappings.filter((mapping) => mapping.userId === userId).map((mapping) => mapping.localId) });
    }
    const pendingIds = new Set(state.pendingIds || []);
    const localEntries = await withStore(OUTBOX_STORE, "readonly", (store) => storeRequest<PendingMutation[]>(store.index("userId").getAll(userId)));
    await withStore(OUTBOX_STORE, "readwrite", (store) => Promise.all(localEntries.filter((entry) => !pendingIds.has(entry.id)).map((entry) => storeRequest(store.delete(entry.id)))));
    syncMessage = state.message || "";
  } catch {
    syncMessage = "La cola nativa de Android se sincronizará cuando la app vuelva a conectarse.";
  } finally {
    syncing = false;
    notifyState();
  }
}

async function removeMutation(record: PendingMutation): Promise<void> {
  await withStore(OUTBOX_STORE, "readwrite", (store) => storeRequest(store.delete(record.id)));
}

export async function synchronizePendingChanges(): Promise<void> {
  if (isNativeAndroid()) {
    await synchronizeNativeQueue();
    return;
  }
  if (syncing || !navigator.onLine) return;
  const userId = currentUserId();
  const token = localStorage.getItem("token");
  if (!userId || !token) return;
  const lockOwner = crypto.randomUUID();
  if (!await acquireSyncLock(lockOwner)) return;
  syncing = true;
  syncMessage = "Sincronizando cambios…";
  notifyState();
  try {
    const entries = await withStore(OUTBOX_STORE, "readonly", (store) => storeRequest<PendingMutation[]>(store.index("userId").getAll(userId)));
    entries.sort((left, right) => left.createdAt - right.createdAt);
    for (const entry of entries) {
      if (!navigator.onLine || currentUserId() !== userId || localStorage.getItem("token") !== token) break;
      const response = await fetch(`${apiBaseUrl()}${entry.url}`, {
        method: entry.method,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, "X-Offline-Queue-Id": entry.id },
        ...(entry.data === undefined ? {} : { body: JSON.stringify(entry.data) }),
      });
      if (!response.ok) {
        if (response.status === 401) syncMessage = "Vuelve a iniciar sesión para sincronizar los cambios pendientes.";
        else syncMessage = `No se pudo sincronizar un cambio (HTTP ${response.status}); se conserva en el dispositivo.`;
        break;
      }
      const responseData = await response.json().catch(() => ({}));
      const createdId = responseData?.id ?? responseData?.user?.id;
      if (entry.localId && createdId != null) await saveLocalIdMapping(entry.localId, createdId, userId);
      await removeMutation(entry);
    }
  } catch {
    syncMessage = "La sincronización se reintentará cuando vuelva la conexión.";
  } finally {
    syncing = false;
    await releaseSyncLock(lockOwner);
    const state = await getOfflineState();
    if (state.pending === 0) syncMessage = "";
    notifyState();
  }
}

if (typeof window !== "undefined") {
  window.addEventListener("online", () => { void synchronizePendingChanges(); });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") void synchronizePendingChanges();
  });
  if (isNativeAndroid()) {
    void App.addListener("appStateChange", ({ isActive }) => {
      if (isActive) void synchronizePendingChanges();
    });
    window.setInterval(() => {
      if (document.visibilityState === "visible") notifyState();
    }, 15_000);
  }
  navigator.serviceWorker?.addEventListener("message", (event: MessageEvent) => {
    if (event.data?.type === "gestionar:offline-sync-complete") notifyState();
  });
  window.addEventListener("load", () => { void synchronizePendingChanges(); }, { once: true });
}
