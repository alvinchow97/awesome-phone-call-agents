import assert from "node:assert/strict";
import test from "node:test";
import { describeActivity } from "../src/calle";

test("a known kind gets its fixed label regardless of the provider's message", () => {
  assert.equal(describeActivity({ kind: "call", level: "info" }), "Provider call status update.");
});

test("an unrecognized kind falls back to a generic label by level, never a guess", () => {
  assert.equal(describeActivity({ kind: "transcript", level: "info" }), "Provider sent an update.");
  assert.equal(describeActivity({ kind: "transcript", level: "warning" }), "Provider reported a warning.");
  assert.equal(describeActivity({ kind: "transcript", level: "error" }), "Provider reported an error.");
});

test("an unknown kind's label cannot echo provider text, because the function never receives it", () => {
  // describeActivity's parameter type excludes `message` entirely, so a call
  // site cannot pass provider free text through even by mistake.
  const label = describeActivity({ kind: "unknown_future_kind", level: "info" });
  assert.doesNotMatch(label, /\d{4,}/);
});
