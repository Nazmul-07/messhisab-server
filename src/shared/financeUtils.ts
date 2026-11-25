export interface WeightedAllocationInput {
  membershipId: string;
  weight: number;
}

export interface AllocationResult {
  membershipId: string;
  amountPaisa: number;
}

/**
 * Deterministically divides totalPaisa equally among memberIds.
 * Remainder paisa are distributed +1 each to the first `remainder` members
 * sorted lexicographically by membershipId, guaranteeing exact sum preservation.
 */
export const allocateEqual = (
  totalPaisa: number,
  membershipIds: readonly string[],
): AllocationResult[] => {
  if (membershipIds.length === 0) {
    return [];
  }
  const sortedIds = [...membershipIds].sort();
  const count = sortedIds.length;
  const baseShare = Math.floor(totalPaisa / count);
  const remainder = totalPaisa - baseShare * count;

  return sortedIds.map((membershipId, index) => ({
    membershipId,
    amountPaisa: baseShare + (index < remainder ? 1 : 0),
  }));
};

/**
 * Deterministically allocates totalPaisa proportionally to integer weights
 * using the Hamilton (largest-remainder) method with integer arithmetic.
 * Ties in remainder are broken lexicographically by membershipId.
 * Guarantees sum of allocated amountPaisa === totalPaisa.
 */
export const allocateByWeights = (
  totalPaisa: number,
  items: readonly WeightedAllocationInput[],
): AllocationResult[] => {
  if (items.length === 0) {
    return [];
  }

  const totalWeight = items.reduce((acc, item) => acc + item.weight, 0);
  if (totalWeight <= 0) {
    return allocateEqual(
      totalPaisa,
      items.map((item) => item.membershipId),
    );
  }

  const computed = items.map((item) => {
    const numerator = BigInt(totalPaisa) * BigInt(item.weight);
    const denominator = BigInt(totalWeight);
    const floorShare = Number(numerator / denominator);
    const remainderNumerator = numerator % denominator;
    return {
      membershipId: item.membershipId,
      floorShare,
      remainderNumerator,
    };
  });

  const allocatedBase = computed.reduce((acc, row) => acc + row.floorShare, 0);
  const remainingPaisa = totalPaisa - allocatedBase;

  const sortedForRemainder = [...computed].sort((a, b) => {
    if (b.remainderNumerator !== a.remainderNumerator) {
      return b.remainderNumerator > a.remainderNumerator ? 1 : -1;
    }
    return a.membershipId.localeCompare(b.membershipId);
  });

  const bonusSet = new Set<string>(
    sortedForRemainder.slice(0, remainingPaisa).map((row) => row.membershipId),
  );

  return computed.map((row) => ({
    membershipId: row.membershipId,
    amountPaisa: row.floorShare + (bonusSet.has(row.membershipId) ? 1 : 0),
  }));
};

/**
 * Calculates rounded meal rate in paisa per full meal (2 half-units)
 * using half-up integer rounding. Returns 0 if totalMealHalfUnits === 0.
 */
export const calculateMealRateRoundedPaisa = (
  totalBazarPaisa: number,
  totalMealHalfUnits: number,
): number => {
  if (totalMealHalfUnits <= 0 || totalBazarPaisa <= 0) {
    return 0;
  }
  // 1 full meal = 2 half-units => rate per meal = (totalBazarPaisa * 2) / totalMealHalfUnits
  const numerator = BigInt(totalBazarPaisa) * 2n;
  const denominator = BigInt(totalMealHalfUnits);
  return Number((numerator + denominator / 2n) / denominator);
};

/**
 * Allocates totalBazarPaisa across members proportionally to their mealHalfUnits
 * using exact largest-remainder integer arithmetic so total meal costs equal totalBazarPaisa.
 */
export const allocateMealCosts = (
  totalBazarPaisa: number,
  memberMeals: readonly { membershipId: string; mealHalfUnits: number }[],
): AllocationResult[] => {
  const totalHalfUnits = memberMeals.reduce((acc, m) => acc + m.mealHalfUnits, 0);
  if (totalHalfUnits <= 0 || totalBazarPaisa <= 0) {
    return memberMeals.map((m) => ({
      membershipId: m.membershipId,
      amountPaisa: 0,
    }));
  }
  return allocateByWeights(
    totalBazarPaisa,
    memberMeals.map((m) => ({
      membershipId: m.membershipId,
      weight: m.mealHalfUnits,
    })),
  );
};
