import assert from "node:assert/strict";
import test from "node:test";
import { handleCases } from "../api/carecall/cases";
import { MemoryDurableStore } from "../api/_lib/durable-store";
import { issueOperatorSession } from "../api/_lib/operator-auth";

const ACCESS_CODE = "test-operator-code";
const ACCESS_CODE_SHA256 = "1427b7e058bb398ae674d86981bc0e4f796661abc0ccbba06c3e9ec611f9f07f";

function environment() {
  const durableStore = new MemoryDurableStore();
  return {
    durableStore,
    env: {
      CARECALL_SESSION_SECRET: "test-session-secret-that-is-at-least-32-characters",
      CARECALL_OPERATORS_JSON: JSON.stringify([
        { id: "mei-chen", name: "Mei Chen", role: "coordinator", access_code_sha256: ACCESS_CODE_SHA256, senior_ids: ["mdm-lim"] },
        { id: "priya-nair", name: "Priya Nair", role: "viewer", access_code_sha256: ACCESS_CODE_SHA256, senior_ids: ["mdm-lim"] },
      ]),
      durableStore,
    },
  };
}

test("an open case is visible to a scoped operator and hidden once acknowledged", async () => {
  const { env, durableStore } = environment();
  await durableStore.set("carecall:case:case-1", { id: "case-1", seniorId: "mdm-lim", title: "Reports feeling low" }, 3600);
  await durableStore.addToIndex("carecall:cases:index", Date.now(), "case-1");
  const token = await issueOperatorSession("mei-chen", ACCESS_CODE, env);
  assert.ok(token);

  const list = await handleCases(new Request("https://example.test/api/carecall/cases", { headers: { authorization: `Bearer ${token}` } }), env);
  assert.equal((await list.json()).cases.length, 1);

  const acknowledge = await handleCases(
    new Request("https://example.test/api/carecall/cases", { method: "PATCH", headers: { authorization: `Bearer ${token}` }, body: JSON.stringify({ case_id: "case-1", acknowledged: true }) }),
    env,
  );
  assert.equal(acknowledge.status, 200);

  const listAfter = await handleCases(new Request("https://example.test/api/carecall/cases", { headers: { authorization: `Bearer ${token}` } }), env);
  assert.equal((await listAfter.json()).cases.length, 0, "an acknowledged case must not still read as open");
});

test("a viewer-scoped operator cannot acknowledge a case, but can still read the open list", async () => {
  const { env, durableStore } = environment();
  await durableStore.set("carecall:case:case-2", { id: "case-2", seniorId: "mdm-lim", title: "Needs transport" }, 3600);
  await durableStore.addToIndex("carecall:cases:index", Date.now(), "case-2");
  const token = await issueOperatorSession("priya-nair", ACCESS_CODE, env);
  assert.ok(token);

  const acknowledge = await handleCases(
    new Request("https://example.test/api/carecall/cases", { method: "PATCH", headers: { authorization: `Bearer ${token}` }, body: JSON.stringify({ case_id: "case-2", acknowledged: true }) }),
    env,
  );
  assert.equal(acknowledge.status, 403);
  assert.equal((await acknowledge.json()).error, "role_not_permitted");
  assert.equal((await durableStore.get<{ acknowledged?: boolean }>("carecall:case:case-2"))?.acknowledged, undefined, "a viewer's acknowledge attempt must not touch the case");

  const list = await handleCases(new Request("https://example.test/api/carecall/cases", { headers: { authorization: `Bearer ${token}` } }), env);
  assert.equal(list.status, 200, "a viewer must still be able to read open cases");
  assert.equal((await list.json()).cases.length, 1);
});
