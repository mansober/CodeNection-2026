const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

const filename = path.join(__dirname, "../src/services/cloudState.ts");
const compiled = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText;
const moduleUnderTest = { exports: {} };
new Function("require", "module", "exports", compiled)(require, moduleUnderTest, moduleUnderTest.exports);
const { cloudStateSignature, mergeCloudState, reconcileCloudState, stateForCloud } = moduleUnderTest.exports;

const state = (weeklyNote = "remote") => ({
  routineEntries: { study: { durationHours: 1, timesPerWeek: 5, condition: "Typical" } },
  feelAnswers: { time: 1 },
  commitments: [],
  modules: [{ id: "module-1", name: "Algorithms", days: [1] }],
  materials: [{
    id: "material-1",
    moduleId: "module-1",
    name: "notes.txt",
    topic: "Week 1",
    week: "2026-09-13",
    date: "2026-09-13",
    uri: "file:///private/notes.txt",
    cards: [],
  }],
  checks: {
    "2026-09-13": {
      stress: 2,
      causes: ["Private cause"],
      note: "Private diary",
      savedAt: "2026-09-13T12:00:00.000Z",
    },
  },
  recoveryResults: {},
  overrides: {},
  registeredOn: "2026-09-13",
  weeklyNote,
});

const local = state();
const projected = stateForCloud(local);
assert.deepEqual(projected.checks["2026-09-13"].causes, []);
assert.equal(projected.checks["2026-09-13"].note, "");
assert.equal(projected.materials[0].uri, "");
assert.equal(local.checks["2026-09-13"].note, "Private diary");
const reordered = {
  weeklyNote: local.weeklyNote,
  ...Object.fromEntries(Object.entries(local).filter(([key]) => key !== "weeklyNote")),
};
assert.equal(cloudStateSignature(reordered), cloudStateSignature(local));
assert.equal(cloudStateSignature(local).length, 32);

const merged = mergeCloudState(projected, local);
assert.equal(merged.checks["2026-09-13"].note, "Private diary");
assert.deepEqual(merged.checks["2026-09-13"].causes, ["Private cause"]);
assert.equal(merged.materials[0].uri, "file:///private/notes.txt");

const oldRemote = stateForCloud(state("old remote"));
const newerRemote = stateForCloud(state("new remote"));
const unsyncedLocal = state("offline local edit");
const localWins = reconcileCloudState(newerRemote, unsyncedLocal, cloudStateSignature(oldRemote));
assert.equal(localWins.cloudIsCurrent, false);
assert.equal(localWins.state.weeklyNote, "offline local edit");

const remoteWins = reconcileCloudState(newerRemote, oldRemote, cloudStateSignature(oldRemote));
assert.equal(remoteWins.cloudIsCurrent, true);
assert.equal(remoteWins.state.weeklyNote, "new remote");

const emptyLocal = { ...state(""), registeredOn: undefined };
const recovered = reconcileCloudState(newerRemote, emptyLocal);
assert.equal(recovered.cloudIsCurrent, true);
assert.equal(recovered.state.weeklyNote, "new remote");

const partialOffline = state("unfinished setup edit");
partialOffline.registeredOn = undefined;
const partialRecovered = reconcileCloudState(newerRemote, partialOffline, cloudStateSignature(oldRemote), true);
assert.equal(partialRecovered.cloudIsCurrent, false);
assert.equal(partialRecovered.state.weeklyNote, "unfinished setup edit");

const privateOnlyLocal = state("new remote");
const privacyMerge = reconcileCloudState(newerRemote, privateOnlyLocal, cloudStateSignature(newerRemote));
assert.equal(privacyMerge.cloudIsCurrent, true);
assert.equal(privacyMerge.state.checks["2026-09-13"].note, "Private diary");

console.log("Cloud state checks passed: privacy projection, offline-local protection, remote updates, and cloud recovery.");
