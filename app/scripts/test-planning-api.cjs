/* eslint-env node */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

function compile(filename, resolve) {
  const source = fs.readFileSync(filename, "utf8");
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const module = { exports: {} };
  new Function("require", "module", "exports", output)(resolve, module, module.exports);
  return module.exports;
}

const models = {};
models.margin = compile(path.join(__dirname, "../src/models/margin.ts"), () => { throw new Error("Unexpected import"); });
models.planner = compile(path.join(__dirname, "../src/models/planner.ts"), request => {
  if (request === "./margin") return models.margin;
  throw new Error(`Unexpected planner import: ${request}`);
});

class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

let revision = 0;
let sequence = 0;
let baseline = null;
const modules = [];
const assignments = [];
const commitments = [];
let mutations = 0;
const response = value => structuredClone(value);
const body = init => init?.body ? JSON.parse(init.body) : undefined;
const id = kind => `${kind}-0000-4000-8000-${String(++sequence).padStart(12, "0")}`;
const changed = () => { revision += 1; mutations += 1; };

async function authenticatedRequest(url, init = {}) {
  const method = init.method ?? "GET";
  if (url === "/v1/baseline" && method === "GET") {
    if (!baseline) throw new ApiError("missing", 404);
    return response(baseline);
  }
  if (url === "/v1/baseline" && method === "PUT") {
    const { expected_revision: _expected, ...value } = body(init);
    baseline = { id: id("baseline"), effective_from: "2026-09-13", version: 1, ...value };
    changed();
    return response(baseline);
  }
  if (url.startsWith("/v1/modules") && method === "GET") return response(modules);
  if (url === "/v1/modules" && method === "POST") {
    const row = { id: id("module"), version: 1, ...body(init) };
    modules.push(row); changed(); return response(row);
  }
  if (url.startsWith("/v1/assignments") && method === "GET") return response(assignments);
  if (url === "/v1/assignments" && method === "POST") {
    const value = body(init);
    const row = { id: id("assignment"), version: 1, name: "Algorithms assignment", ...value };
    assignments.push(row); changed(); return response(row);
  }
  if (url.startsWith("/v1/commitments") && method === "GET") return response(commitments);
  if (url === "/v1/commitments" && method === "POST") {
    const row = { id: id("commitment"), version: 1, ...body(init), module_id: null, assignment_id: null, deadline: null };
    commitments.push(row); changed(); return response(row);
  }
  if (url.startsWith("/v1/check-ins") && method === "GET") return [];
  if (url === "/v1/dashboard" && method === "GET") return { weekly_note: null };
  if (url.startsWith("/v1/weekly-notes/") && method === "PUT") {
    changed(); return { week_start: "2026-09-07", version: 1, ...body(init) };
  }
  if (url.startsWith("/v1/recovery") && method === "GET") return [{ date: "2026-09-13", result: null }];
  throw new Error(`Unhandled request: ${method} ${url}`);
}

const api = {
  ApiError,
  authenticatedRequest,
  refreshCurrentUser: async () => ({
    id: "user-0000-4000-8000-000000000001",
    email: "student@example.com",
    timezone: "Asia/Singapore",
    registeredOn: "2026-09-13",
    planRevision: revision,
    createdAt: "2026-09-13T00:00:00Z",
  }),
};

const planning = compile(path.join(__dirname, "../src/services/planningApi.ts"), request => {
  if (request === "@/models/margin") return models.margin;
  if (request === "@/models/planner") return models.planner;
  if (request === "@/services/api") return api;
  throw new Error(`Unexpected planning API import: ${request}`);
});

const initial = {
  routineEntries: { study: { durationHours: 1, timesPerWeek: 5, condition: "Typical" } },
  feelAnswers: { mental: 1, time: 2 },
  recoveryChoice: 1,
  commitments: [{
    id: "club-practice",
    name: "Club practice",
    category: "Club",
    schedule: "2026-09-15",
    scheduleType: "Fixed",
    startDate: "2026-09-15",
    endDate: "2026-09-15",
    flexibility: "Fixed",
    durationHours: 1,
    time: 5,
    mental: 10,
    physical: 5,
    social: 20,
  }],
  modules: [{ id: "local-module", name: "Algorithms", days: [], assignment: { start: "2026-09-13", due: "2026-09-20" } }],
  materials: [],
  checks: {},
  recoveryResults: {},
  overrides: {},
  registeredOn: "2026-09-13",
  weeklyNote: "",
};

(async () => {
  const first = await planning.syncPlanningState(initial);
  assert.match(first.modules[0].serverId, /^module-/);
  assert.match(first.modules[0].assignment.serverId, /^assignment-/);
  assert.match(first.commitments.find(item => item.id === "club-practice").serverId, /^commitment-/);
  assert.equal(modules.length, 1);
  assert.equal(assignments.length, 1);
  assert.equal(commitments.length, 1);
  const firstMutationCount = mutations;

  const second = await planning.syncPlanningState(first);
  assert.equal(modules.length, 1);
  assert.equal(assignments.length, 1);
  assert.equal(commitments.length, 1);
  assert.equal(mutations, firstMutationCount, "an unchanged state must not write again");
  assert.equal(second.pendingModuleDeletes.length, 0);

  baseline = null;
  assignments.length = 0;
  commitments.length = 0;
  const partial = await planning.initializePlanningState({ ...initial, registeredOn: undefined, modules: [] });
  assert.equal(partial.registeredOn, undefined, "account creation must not masquerade as completed onboarding");
  console.log("Planning API checks passed: normalized migration, stable server IDs, and idempotent resync.");
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
