import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  allocateByWeights,
  allocateEqual,
  allocateMealCosts,
  calculateMealRateRoundedPaisa,
} from "../src/shared/financeUtils.js";

describe("financeUtils - integer-safe financial calculations", () => {
  it("distributes equal expense shares with exact paisa preservation", () => {
    // 10000 paisa (৳100) among 3 members => 3334, 3333, 3333
    const shares = allocateEqual(10000, ["m3", "m1", "m2"]);
    assert.equal(shares.length, 3);
    const total = shares.reduce((sum, s) => sum + s.amountPaisa, 0);
    assert.equal(total, 10000);
    assert.deepEqual(shares, [
      { membershipId: "m1", amountPaisa: 3334 },
      { membershipId: "m2", amountPaisa: 3333 },
      { membershipId: "m3", amountPaisa: 3333 },
    ]);
  });

  it("allocates meal-based expenses proportionally using largest-remainder method", () => {
    // 10000 paisa among weights 10, 20, 30 (total 60)
    const shares = allocateByWeights(10000, [
      { membershipId: "m1", weight: 10 },
      { membershipId: "m2", weight: 20 },
      { membershipId: "m3", weight: 30 },
    ]);
    const total = shares.reduce((sum, s) => sum + s.amountPaisa, 0);
    assert.equal(total, 10000);
    // 1/6 = 1666.67 -> 1667, 2/6 = 3333.33 -> 3333, 3/6 = 5000 -> 5000
    assert.deepEqual(shares, [
      { membershipId: "m1", amountPaisa: 1667 },
      { membershipId: "m2", amountPaisa: 3333 },
      { membershipId: "m3", amountPaisa: 5000 },
    ]);
  });

  it("handles zero total meals without division by zero", () => {
    const rate = calculateMealRateRoundedPaisa(50000, 0);
    assert.equal(rate, 0);

    const costs = allocateMealCosts(50000, [
      { membershipId: "m1", mealHalfUnits: 0 },
      { membershipId: "m2", mealHalfUnits: 0 },
    ]);
    assert.deepEqual(costs, [
      { membershipId: "m1", amountPaisa: 0 },
      { membershipId: "m2", amountPaisa: 0 },
    ]);
  });

  it("calculates meal rate and member meal costs with exact total bazar preservation", () => {
    // ৳1500.00 = 150000 paisa, 41.5 meals = 83 half-units
    // Rate per meal = 150000 * 2 / 83 = 3614.4578... => rounded 3614 paisa (৳36.14)
    const rate = calculateMealRateRoundedPaisa(150000, 83);
    assert.equal(rate, 3614);

    const mealCosts = allocateMealCosts(150000, [
      { membershipId: "m1", mealHalfUnits: 30 }, // 15 meals
      { membershipId: "m2", mealHalfUnits: 28 }, // 14 meals
      { membershipId: "m3", mealHalfUnits: 25 }, // 12.5 meals
    ]);
    const sumMealCosts = mealCosts.reduce((sum, c) => sum + c.amountPaisa, 0);
    assert.equal(sumMealCosts, 150000);
  });

  it("verifies full mess sample balance calculation (costs - credits = net balance)", () => {
    // Sample: 3 members
    // Total bazar: ৳900 (90000 paisa), paid by m1 (৳500 = 50000) and cashbox (৳400 = 40000)
    // Meals: m1 = 20 half-units (10 meals), m2 = 20 half-units (10 meals), m3 = 20 half-units (10 meals)
    // Meal rate = 90000 * 2 / 60 = 3000 paisa (৳30.00/meal)
    // Meal cost each = 30000 paisa
    const mealCosts = allocateMealCosts(90000, [
      { membershipId: "m1", mealHalfUnits: 20 },
      { membershipId: "m2", mealHalfUnits: 20 },
      { membershipId: "m3", mealHalfUnits: 20 },
    ]);
    assert.equal(mealCosts.reduce((s, x) => s + x.amountPaisa, 0), 90000);

    // Other expense: Rent ৳6000 (600000 paisa) EQUAL => 200000 each
    const rentShares = allocateEqual(600000, ["m1", "m2", "m3"]);
    assert.equal(rentShares.reduce((s, x) => s + x.amountPaisa, 0), 600000);

    // Credits:
    // m1: deposit 200000 + bazarPaid 50000 = 250000; cost = 230000 => net = -20000 (receives ৳200)
    // m2: deposit 200000 = 200000; cost = 230000 => net = +30000 (owes ৳300)
    // m3: deposit 230000 = 230000; cost = 230000 => net = 0 (settled)
    const m1Net = 30000 + 200000 - (200000 + 50000);
    const m2Net = 30000 + 200000 - 200000;
    const m3Net = 30000 + 200000 - 230000;
    assert.equal(m1Net, -20000);
    assert.equal(m2Net, 30000);
    assert.equal(m3Net, 0);
  });
});
