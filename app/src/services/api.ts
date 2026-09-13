import * as SecureStore from "expo-secure-store";
import { File, Paths } from "expo-file-system";
import { Platform } from "react-native";

import type { PlannerState } from "@/models/planner";
import {
  cloudStateSignature,
  mergeCloudState,
  reconcileCloudState,
  stateForCloud,
  type CloudReconciliation,
} from "@/services/cloudState";

const apiBaseUrl = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, "") ?? "";
const sessionKey = "santai-api-session-v2";
const requestTimeoutMs = 12000;
const expirySafetyMs = 60_000;

export type AuthUser = {
  id: string;
  email: string;
  timezone: string;
  registeredOn: string;
  planRevision: number;
  createdAt: string;
};

export type AuthSession = {
  user: AuthUser;
  migrateLegacyPlan: boolean;
  preferRemotePlan: boolean;
};

type SessionRecord = {
  accessToken: string;
  expiresAt: string;
  user?: AuthUser;
  snapshotVersion?: number;
  lastSyncedSignature?: string;
};

type SessionResponse = {
  access_token: string;
  expires_at: string;
  user: unknown;
};

type PlannerStateResponse = {
  schema_version: 1;
  state: PlannerState;
  version: number;
  updated_at: string;
};

type PendingSave = {
  state: PlannerState;
  userId: string;
  authEpoch: number;
};

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly detail?: unknown,
  ) {
    super(message);
  }
}

export const cloudSyncEnabled = apiBaseUrl.length > 0;

let inMemorySession: SessionRecord | null | undefined;
let pendingSave: PendingSave | null = null;
let saveDrain: Promise<PlannerStateResponse | undefined> | null = null;
let authEpoch = 0;

function parseUser(value: unknown): AuthUser | undefined {
  if (!value || typeof value !== "object") return undefined;
  if (!("id" in value) || typeof value.id !== "string" || !/^[0-9a-f-]{36}$/i.test(value.id)) return undefined;
  if (!("email" in value) || typeof value.email !== "string" || !value.email.includes("@")) return undefined;
  if (!("timezone" in value) || typeof value.timezone !== "string") return undefined;
  const registeredOn = "registered_on" in value && typeof value.registered_on === "string"
    ? value.registered_on
    : "registeredOn" in value && typeof value.registeredOn === "string"
      ? value.registeredOn
      : "";
  const planRevision = "plan_revision" in value && Number.isInteger(value.plan_revision)
    ? Number(value.plan_revision)
    : "planRevision" in value && Number.isInteger(value.planRevision)
      ? Number(value.planRevision)
      : 0;
  const createdAt = "created_at" in value && typeof value.created_at === "string"
    ? value.created_at
    : "createdAt" in value && typeof value.createdAt === "string"
      ? value.createdAt
      : "";
  return { id: value.id, email: value.email, timezone: value.timezone, registeredOn, planRevision, createdAt };
}

function parseSession(raw: string | null): SessionRecord | null {
  if (!raw) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== "object") return null;
    if (!("accessToken" in value) || typeof value.accessToken !== "string" || !value.accessToken) return null;
    if (!("expiresAt" in value) || typeof value.expiresAt !== "string") return null;
    const snapshotVersion = "snapshotVersion" in value
      && Number.isInteger(value.snapshotVersion)
      && Number(value.snapshotVersion) >= 0
      ? Number(value.snapshotVersion)
      : undefined;
    const lastSyncedSignature = "lastSyncedSignature" in value
      && typeof value.lastSyncedSignature === "string"
      && /^[0-9a-f]{32}$/.test(value.lastSyncedSignature)
      ? value.lastSyncedSignature
      : undefined;
    return {
      accessToken: value.accessToken,
      expiresAt: value.expiresAt,
      user: "user" in value ? parseUser(value.user) : undefined,
      snapshotVersion,
      lastSyncedSignature,
    };
  } catch {
    return null;
  }
}

async function readSession(): Promise<SessionRecord | null> {
  if (inMemorySession !== undefined) return inMemorySession;
  try {
    const raw = Platform.OS === "web"
      ? localStorage.getItem(sessionKey)
      : await SecureStore.getItemAsync(sessionKey);
    inMemorySession = parseSession(raw);
  } catch {
    inMemorySession = null;
  }
  return inMemorySession;
}

async function writeSession(session: SessionRecord | null) {
  inMemorySession = session;
  if (Platform.OS === "web") {
    if (session) localStorage.setItem(sessionKey, JSON.stringify(session));
    else localStorage.removeItem(sessionKey);
    return;
  }
  if (session) await SecureStore.setItemAsync(sessionKey, JSON.stringify(session));
  else await SecureStore.deleteItemAsync(sessionKey);
}

async function clearAuthentication() {
  authEpoch += 1;
  pendingSave = null;
  await writeSession(null);
}

async function invalidateSession(session: SessionRecord) {
  const current = await readSession();
  if (current?.accessToken === session.accessToken) await clearAuthentication();
}

function errorMessage(detail: unknown, fallback: string) {
  if (detail && typeof detail === "object" && "message" in detail && typeof detail.message === "string") {
    return detail.message;
  }
  if (Array.isArray(detail) && detail.length && detail[0] && typeof detail[0] === "object"
      && "msg" in detail[0] && typeof detail[0].msg === "string") {
    return detail[0].msg.replace(/^Value error, /, "");
  }
  return fallback;
}

async function apiRequest<T>(path: string, init: RequestInit = {}, accessToken?: string): Promise<T> {
  if (!cloudSyncEnabled) throw new ApiError("The backend URL is not configured", 0);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);
  try {
    const response = await fetch(`${apiBaseUrl}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        ...(init.body ? { "Content-Type": "application/json" } : {}),
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        ...init.headers,
      },
    });
    const payload = response.status === 204 ? undefined : await response.json().catch(() => undefined);
    if (!response.ok) {
      const detail = payload && typeof payload === "object" && "detail" in payload ? payload.detail : payload;
      throw new ApiError(errorMessage(detail, `Santai API returned ${response.status}`), response.status, detail);
    }
    return payload as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error instanceof Error && error.name === "AbortError") {
      throw new ApiError("Santai took too long to respond", 0);
    }
    throw new ApiError("Santai is currently unreachable", 0, error);
  } finally {
    clearTimeout(timeout);
  }
}

function deviceTimezone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Singapore";
}

function sessionExpired(session: SessionRecord) {
  const expiry = Date.parse(session.expiresAt);
  return !Number.isFinite(expiry) || expiry <= Date.now() + expirySafetyMs;
}

async function storedSession() {
  const session = await readSession();
  if (!session) return null;
  const expiry = Date.parse(session.expiresAt);
  if (!Number.isFinite(expiry) || expiry <= Date.now()) {
    await clearAuthentication();
    return null;
  }
  if (!sessionExpired(session)) return session;
  try {
    const response = await apiRequest<SessionResponse>(
      "/v1/auth/refresh",
      { method: "POST" },
      session.accessToken,
    );
    const rotated = sessionFromResponse(response);
    rotated.snapshotVersion = session.snapshotVersion;
    rotated.lastSyncedSignature = session.lastSyncedSignature;
    authEpoch += 1;
    pendingSave = null;
    await writeSession(rotated);
    return rotated;
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      await clearAuthentication();
      return null;
    }
    // A still-valid token remains usable while the device is temporarily offline.
    return session;
  }
}

function sessionFromResponse(response: SessionResponse): SessionRecord {
  const user = parseUser(response?.user);
  if (!response || typeof response.access_token !== "string" || !response.access_token
      || typeof response.expires_at !== "string" || !Number.isFinite(Date.parse(response.expires_at))
      || !user) {
    throw new ApiError("Santai returned an invalid authentication response", 502);
  }
  return {
    accessToken: response.access_token,
    expiresAt: response.expires_at,
    user,
    snapshotVersion: 0,
  };
}

async function installSession(response: SessionResponse) {
  authEpoch += 1;
  pendingSave = null;
  const session = sessionFromResponse(response);
  await writeSession(session);
  return session;
}

async function requireSession(userId?: string) {
  const session = await storedSession();
  if (!session?.user || (userId && session.user.id !== userId)) {
    throw new ApiError("Your session expired. Sign in again.", 401);
  }
  return session;
}

export async function restoreAuthSession(): Promise<AuthSession | null> {
  const session = await storedSession();
  if (!session) return null;
  if (session.user) {
    return { user: session.user, migrateLegacyPlan: false, preferRemotePlan: false };
  }
  try {
    const response = await apiRequest<unknown>("/v1/me", {}, session.accessToken);
    const user = parseUser(response);
    if (!user) throw new ApiError("Santai returned an invalid account response", 502);
    session.user = user;
    await writeSession(session);
    return { user, migrateLegacyPlan: false, preferRemotePlan: false };
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      await invalidateSession(session);
      return null;
    }
    throw error;
  }
}

export async function signUp(email: string, password: string): Promise<AuthSession> {
  const response = await apiRequest<SessionResponse>("/v1/auth/signup", {
    method: "POST",
    body: JSON.stringify({ email, password, timezone: deviceTimezone() }),
  });
  const session = await installSession(response);
  return { user: session.user!, migrateLegacyPlan: true, preferRemotePlan: false };
}

export async function signIn(email: string, password: string): Promise<AuthSession> {
  const response = await apiRequest<SessionResponse>("/v1/auth/signin", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  const session = await installSession(response);
  return { user: session.user!, migrateLegacyPlan: false, preferRemotePlan: true };
}

export async function signOut() {
  const session = await storedSession();
  try {
    if (session) {
      await apiRequest<void>("/v1/auth/logout", { method: "POST" }, session.accessToken);
    }
  } finally {
    await clearAuthentication();
  }
}

/** Authenticated JSON transport shared by the normalized planning API adapter. */
export async function authenticatedRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const session = await requireSession();
  try {
    return await apiRequest<T>(path, init, session.accessToken);
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      await invalidateSession(session);
      throw new ApiError("Your session expired. Sign in again.", 401);
    }
    throw error;
  }
}

export async function refreshCurrentUser(): Promise<AuthUser> {
  const user = await authenticatedRequest<unknown>("/v1/me");
  const parsed = parseUser(user);
  if (!parsed) throw new ApiError("Santai returned an invalid account response", 502);
  const session = await requireSession();
  session.user = parsed;
  await writeSession(session);
  return parsed;
}

export function exportAccountData() {
  return authenticatedRequest<Record<string, unknown>>("/v1/me/export");
}

export async function saveAccountExport() {
  const payload = await exportAccountData();
  const filename = `santai-export-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
  const contents = JSON.stringify(payload, null, 2);
  if (Platform.OS === "web") {
    const url = URL.createObjectURL(new Blob([contents], { type: "application/json" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
    return filename;
  }
  const file = new File(Paths.document, filename);
  file.create();
  file.write(contents);
  return file.uri;
}

export async function deleteAccount() {
  await authenticatedRequest<void>("/v1/me", { method: "DELETE" });
  await clearAuthentication();
}

export async function loadCloudState(
  local: PlannerState,
  preferRemote = false,
  hasLocalCopy = !!local.registeredOn,
): Promise<CloudReconciliation | null> {
  const session = await requireSession();
  try {
    const result = await apiRequest<PlannerStateResponse>(
      "/v1/planner-state",
      {},
      session.accessToken,
    );
    const reconciled = preferRemote
      ? { state: mergeCloudState(result.state, local), cloudIsCurrent: true }
      : reconcileCloudState(result.state, local, session.lastSyncedSignature, hasLocalCopy);
    session.snapshotVersion = result.version;
    if (reconciled.cloudIsCurrent) {
      session.lastSyncedSignature = cloudStateSignature(reconciled.state);
    }
    await writeSession(session);
    return reconciled;
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      await invalidateSession(session);
      throw new ApiError("Your session expired. Sign in again.", 401);
    }
    if (error instanceof ApiError && error.status === 404) {
      session.snapshotVersion = 0;
      await writeSession(session);
      return null;
    }
    throw error;
  }
}

async function refreshSnapshotVersion(session: SessionRecord) {
  try {
    const current = await apiRequest<PlannerStateResponse>(
      "/v1/planner-state",
      {},
      session.accessToken,
    );
    session.snapshotVersion = current.version;
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      session.snapshotVersion = 0;
      return;
    }
    throw error;
  }
}

async function saveCloudState(state: PlannerState, userId: string): Promise<PlannerStateResponse> {
  const session = await requireSession(userId);
  const signature = cloudStateSignature(state);
  const save = async () => {
    const result = await apiRequest<PlannerStateResponse>(
      "/v1/planner-state",
      {
        method: "PUT",
        body: JSON.stringify({
          schema_version: 1,
          state: stateForCloud(state),
          expected_version: session.snapshotVersion ?? 0,
        }),
      },
      session.accessToken,
    );
    session.snapshotVersion = result.version;
    session.lastSyncedSignature = signature;
    await writeSession(session);
    return result;
  };

  try {
    return await save();
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      await invalidateSession(session);
      throw new ApiError("Your session expired. Sign in again.", 401);
    }
    if (error instanceof ApiError && error.status === 409) {
      await refreshSnapshotVersion(session);
      return await save();
    }
    throw error;
  }
}

export function queueCloudSave(state: PlannerState, userId: string) {
  pendingSave = { state, userId, authEpoch };
  if (!saveDrain) {
    saveDrain = (async () => {
      let result: PlannerStateResponse | undefined;
      while (pendingSave) {
        const latest = pendingSave;
        pendingSave = null;
        if (latest.authEpoch !== authEpoch) continue;
        result = await saveCloudState(latest.state, latest.userId);
      }
      return result;
    })().finally(() => {
      saveDrain = null;
    });
  }
  return saveDrain;
}
