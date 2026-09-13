import { File, Paths } from "expo-file-system";
import { Platform } from "react-native";

const legacyStorageKey = "margin-planner-v2";
const legacyOwnerKey = "margin-planner-v2-owner";

function storageKey(userId: string) {
  return `margin-planner-v3-${encodeURIComponent(userId)}`;
}

function syncKey(userId: string) {
  return `margin-planner-v3-sync-${encodeURIComponent(userId)}`;
}

async function readValue(key: string): Promise<string | null> {
  if (Platform.OS === "web") return localStorage.getItem(key);
  const file = new File(Paths.document, `${key}.json`);
  return file.exists ? file.text() : null;
}

function writeValue(key: string, value: string) {
  if (Platform.OS === "web") {
    localStorage.setItem(key, value);
    return;
  }
  const file = new File(Paths.document, `${key}.json`);
  if (!file.exists) file.create();
  file.write(value);
}

export type SavedPlan = {
  value: string | null;
  fromLegacyStorage: boolean;
  lastSyncedSignature: string | null;
};

export async function readSavedPlan(userId: string, includeLegacy = false): Promise<SavedPlan> {
  const scoped = await readValue(storageKey(userId));
  if (scoped !== null) return { value: scoped, fromLegacyStorage: false, lastSyncedSignature: await readValue(syncKey(userId)) };
  if (!includeLegacy) return { value: null, fromLegacyStorage: false, lastSyncedSignature: null };

  const owner = await readValue(legacyOwnerKey);
  if (owner && owner !== userId) return { value: null, fromLegacyStorage: false, lastSyncedSignature: null };
  return { value: await readValue(legacyStorageKey), fromLegacyStorage: true, lastSyncedSignature: null };
}

export function writeSavedPlan(value: string, userId: string, lastSyncedSignature?: string) {
  writeValue(storageKey(userId), value);
  if (lastSyncedSignature !== undefined) writeValue(syncKey(userId), lastSyncedSignature);
}

export function claimLegacyPlan(value: string, userId: string) {
  writeSavedPlan(value, userId);
  writeValue(legacyOwnerKey, userId);
}

export function deleteSavedPlan(userId: string, materialUris: string[] = []) {
  if (Platform.OS === "web") {
    localStorage.removeItem(storageKey(userId));
    localStorage.removeItem(syncKey(userId));
    return;
  }
  const plan = new File(Paths.document, `${storageKey(userId)}.json`);
  if (plan.exists) plan.delete();
  const sync = new File(Paths.document, `${syncKey(userId)}.json`);
  if (sync.exists) sync.delete();
  for (const uri of materialUris) {
    try {
      const material = new File(uri);
      if (material.exists) material.delete();
    } catch {
      // A stale picker URI must not prevent the rest of the account from being removed.
    }
  }
}
