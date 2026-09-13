import type { PlannerState } from "@/models/planner";

/** Remove fields that are intentionally device-private before hashing or upload. */
export function stateForCloud(state: PlannerState): PlannerState {
  return {
    ...state,
    checks: Object.fromEntries(Object.entries(state.checks).map(([date, check]) => [
      date,
      { ...check, note: "", causes: [] },
    ])),
    materials: state.materials.map(material => ({ ...material, uri: "" })),
  };
}

/** A stable-enough signature for immutable PlannerState objects with insertion-ordered keys. */
function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value)
      .filter(([, item]) => item !== undefined)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => [key, canonicalize(item)]),
  );
}

/** Compact deterministic fingerprint; this is change detection, not a security hash. */
export function cloudStateSignature(state: PlannerState) {
  const input = JSON.stringify(canonicalize(stateForCloud(state)));
  let h1 = 1779033703;
  let h2 = 3144134277;
  let h3 = 1013904242;
  let h4 = 2773480762;
  for (let index = 0; index < input.length; index += 1) {
    const code = input.charCodeAt(index);
    h1 = h2 ^ Math.imul(h1 ^ code, 597399067);
    h2 = h3 ^ Math.imul(h2 ^ code, 2869860233);
    h3 = h4 ^ Math.imul(h3 ^ code, 951274213);
    h4 = h1 ^ Math.imul(h4 ^ code, 2716044179);
  }
  h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
  h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
  h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
  h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
  return [h1, h2, h3, h4].map(value => (value >>> 0).toString(16).padStart(8, "0")).join("");
}

/** Restore private fields from this device without allowing them into the cloud copy. */
export function mergeCloudState(remote: PlannerState, local: PlannerState): PlannerState {
  const localChecks = local.checks;
  const localMaterials = new Map(local.materials.map(material => [material.id, material]));
  return {
    ...remote,
    checks: Object.fromEntries(Object.entries(remote.checks).map(([date, check]) => [
      date,
      {
        ...check,
        note: localChecks[date]?.note ?? "",
        causes: localChecks[date]?.causes ?? [],
      },
    ])),
    materials: remote.materials.map(material => ({
      ...material,
      uri: localMaterials.get(material.id)?.uri ?? "",
    })),
  };
}

export type CloudReconciliation = {
  state: PlannerState;
  cloudIsCurrent: boolean;
};

/**
 * Prefer unsynced local work over an older snapshot. If local state still equals
 * the last successful upload, the remote snapshot is newer and wins. A missing
 * local registration means there is no local plan to protect.
 */
export function reconcileCloudState(
  remote: PlannerState,
  local: PlannerState,
  lastSyncedSignature?: string,
  hasLocalCopy = !!local.registeredOn,
): CloudReconciliation {
  const localSignature = cloudStateSignature(local);
  const remoteSignature = cloudStateSignature(remote);
  const localChangedSinceSync = lastSyncedSignature
    ? localSignature !== lastSyncedSignature
    : localSignature !== remoteSignature;
  const hasUnsyncedLocalPlan = hasLocalCopy
    && localChangedSinceSync
    && localSignature !== remoteSignature;

  if (hasUnsyncedLocalPlan) return { state: local, cloudIsCurrent: false };
  return { state: mergeCloudState(remote, local), cloudIsCurrent: true };
}
