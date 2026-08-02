import assert from "node:assert/strict";
import test from "node:test";

import { mergePageSectionOrder, validatePageSectionOrder } from "../db/page-section-orders.ts";

test("page section orders accept fixed and dynamic stable ids", () => {
  const dynamicId = "section-12345678-1234-1234-1234-123456789abc";
  assert.deepEqual(validatePageSectionOrder("home", ["home-section-04", "home-section-01", dynamicId]), {
    pageId: "home",
    sectionIds: ["home-section-04", "home-section-01", dynamicId],
  });
});

test("page section orders reject duplicates and unstable ids", () => {
  assert.throws(() => validatePageSectionOrder("home", ["home-section-01", "home-section-01"]), /invalid-section-order/);
  assert.throws(() => validatePageSectionOrder("home", ["section-three"]), /invalid-section-order/);
  assert.throws(() => validatePageSectionOrder("unknown", ["home-section-01"]), /invalid-section-order-page/);
});

test("published section order ignores removed ids and appends new renderers", () => {
  assert.deepEqual(
    mergePageSectionOrder(["home-section-04", "removed-section", "home-section-01"], ["home-section-01", "home-section-02", "home-section-04"]),
    ["home-section-04", "home-section-01", "home-section-02"],
  );
});