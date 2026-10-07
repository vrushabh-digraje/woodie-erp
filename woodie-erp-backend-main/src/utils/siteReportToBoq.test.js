const test = require("node:test");
const assert = require("node:assert/strict");
const {
  itemsFromWorkItems,
  mergeBoqItems,
  workItemDescription,
  projectNameFromInquiry,
} = require("./siteReportToBoq");

test("workItemDescription combines type, description, finish, notes", () => {
  const d = workItemDescription({
    workType: "Gypsum partition",
    description: "Office cabin",
    finishMaterial: "12mm board",
    notes: "Include paint",
  });
  assert.match(d, /Gypsum partition/);
  assert.match(d, /Include paint/);
});

test("itemsFromWorkItems maps qty and unit", () => {
  const items = itemsFromWorkItems([
    { workType: "Flooring", description: "SPC", quantity: 2, unit: "LS", finishMaterial: "", notes: "" },
  ]);
  assert.equal(items.length, 1);
  assert.equal(items[0].quantity, 2);
  assert.equal(items[0].unit, "LS");
  assert.equal(items[0].unitPrice, 0);
});

test("mergeBoqItems appends only new descriptions", () => {
  const existing = [{ description: "Line A", itemCode: "A", category: "Labor", quantity: 1, unit: "LS", unitPrice: 100 }];
  const incoming = [
    { description: "Line A", itemCode: "B", category: "Labor", quantity: 1, unit: "LS", unitPrice: 0 },
    { description: "Line B", itemCode: "C", category: "Labor", quantity: 1, unit: "LS", unitPrice: 0 },
  ];
  const { items: merged, addedCount } = mergeBoqItems(existing, incoming, { replace: false });
  assert.equal(merged.length, 2);
  assert.equal(addedCount, 1);
  assert.equal(merged[0].unitPrice, 100);
});

test("projectNameFromInquiry prefers scopeOfWork", () => {
  assert.equal(
    projectNameFromInquiry({ scopeOfWork: "Office 1104 renovation", siteDetails: "", category: "X", inquiryNumber: "INQ-1" }),
    "Office 1104 renovation",
  );
});
