import assert from "node:assert/strict";
import test from "node:test";
import { moveSelectedItems } from "../app/admin/section-selection-order.ts";

const items = ["01", "02", "03", "04", "05"].map((id) => ({ id }));
const ids = (values) => values.map((item) => item.id);

test("moves multiple selected sections together while preserving their order", () => {
  assert.deepEqual(ids(moveSelectedItems(items, ["02", "03"], -1)), ["02", "03", "01", "04", "05"]);
  assert.deepEqual(ids(moveSelectedItems(items, ["02", "03"], 1)), ["01", "04", "02", "03", "05"]);
});

test("moves multiple selected sections to either boundary", () => {
  assert.deepEqual(ids(moveSelectedItems(items, ["02", "04"], "first")), ["02", "04", "01", "03", "05"]);
  assert.deepEqual(ids(moveSelectedItems(items, ["02", "04"], "last")), ["01", "03", "05", "02", "04"]);
  assert.deepEqual(ids(moveSelectedItems(items, ["01", "03"], "first")), ["01", "03", "02", "04", "05"]);
  assert.deepEqual(ids(moveSelectedItems(items, ["03", "05"], "last")), ["01", "02", "04", "03", "05"]);
});

test("does not create a new array when the selection cannot move", () => {
  assert.equal(moveSelectedItems(items, ["01", "02"], -1), items);
  assert.equal(moveSelectedItems(items, ["04", "05"], 1), items);
  assert.equal(moveSelectedItems(items, ["01", "02", "03", "04", "05"], "first"), items);
});
