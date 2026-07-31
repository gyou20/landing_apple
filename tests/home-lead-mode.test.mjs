import assert from "node:assert/strict";
import test from "node:test";
import { resolveHomeLeadMode } from "../lib/home-lead-mode.ts";

test("maps all section 1 and 2 visibility combinations to the requested presentation", () => {
  assert.equal(resolveHomeLeadMode(true, true), "full-motion");
  assert.equal(resolveHomeLeadMode(true, false), "section-one-static");
  assert.equal(resolveHomeLeadMode(false, true), "section-two-direct");
  assert.equal(resolveHomeLeadMode(false, false), "sections-hidden");
});