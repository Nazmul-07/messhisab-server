import {
  AllocationMethod,
  MonthStatus,
  PaymentSource,
  type Prisma,
} from "../../generated/prisma/client.js";
import { prisma } from "../../config/prisma.js";
import { AppError } from "../../shared/AppError.js";
import {
  allocateByWeights,
  allocateMealCosts,
  calculateMealRateRoundedPaisa,
} from "../../shared/financeUtils.js";
import {
  assertMembershipBelongsToMess,
  createAuditLog,
  isMembershipEligibleForMonth,
} from "../../shared/tenantUtils.js";

type DbClient = Prisma.TransactionClient | typeof prisma;

export interface ComputedMemberSettlement {
  membershipId: string;
  displayName: string;
  userId: string;
  totalMealHalfUnits: number;
  mealCostPaisa: number;
  otherExpenseSharePaisa: number;
  totalCostPaisa: number;
  depositPaisa: number;
  bazarPaidPaisa: number;
  otherExpensePaidPaisa: number;
  totalCreditPaisa: number;
  netBalancePaisa: number;
}

export interface ComputedMonthAccounting {
  messId: string;
  monthKey: string;
  status: MonthStatus;
  totalBazarPaisa: number;
  totalMealHalfUnits: number;
  mealRateRoundedPaisa: number;
  totalOtherExpensePaisa: number;
  totalDepositPaisa: number;
  cashboxBazarPaisa: number;
  cashboxOtherExpensePaisa: number;
  cashboxBalancePaisa: number;
  mealBasedExpenseAllocations: Array<{
    expenseId: string;
    shares: Array<{ membershipId: string; amountPaisa: number }>;
  }>;
  members: ComputedMemberSettlement[];
}

export const computeMonthAccounting = async (
  messId: string,
  monthKey: string,
  db: DbClient = prisma,
): Promise<ComputedMonthAccounting> => {
  const [messMonth, memberships, bazarEntries, mealRecords, deposits, expenses] =
    await Promise.all([
      db.messMonth.findUnique({
        where: { messId_monthKey: { messId, monthKey } },
      }),
      db.membership.findMany({
        where: { messId },
        include: {
          user: { select: { id: true, name: true } },
        },
      }),
      db.bazarEntry.findMany({
        where: { messId, monthKey, isDeleted: false },
      }),
      db.mealRecord.findMany({
        where: { messId, monthKey },
      }),
      db.deposit.findMany({
        where: { messId, monthKey, isDeleted: false },
      }),
      db.expense.findMany({
        where: { messId, monthKey, isDeleted: false },
        include: { shares: true },
      }),
    ]);

  // Include all members eligible for the month OR with any recorded activity in the month
  const activeActivityMemberIds = new Set<string>();
  for (const m of mealRecords) activeActivityMemberIds.add(m.membershipId);
  for (const d of deposits) activeActivityMemberIds.add(d.membershipId);
  for (const b of bazarEntries) {
    if (b.paidByMembershipId) activeActivityMemberIds.add(b.paidByMembershipId);
  }
  for (const e of expenses) {
    if (e.paidByMembershipId) activeActivityMemberIds.add(e.paidByMembershipId);
    for (const s of e.shares) activeActivityMemberIds.add(s.membershipId);
  }

  const eligibleMemberships = memberships.filter(
    (m) => isMembershipEligibleForMonth(m, monthKey) || activeActivityMemberIds.has(m.id),
  );

  // Aggregate meals per member
  const mealMap = new Map<string, number>();
  let totalMealHalfUnits = 0;
  for (const record of mealRecords) {
    mealMap.set(record.membershipId, (mealMap.get(record.membershipId) ?? 0) + record.mealHalfUnits);
    totalMealHalfUnits += record.mealHalfUnits;
  }

  // Aggregate bazar
  let totalBazarPaisa = 0;
  let cashboxBazarPaisa = 0;
  const bazarPaidMap = new Map<string, number>();
  for (const entry of bazarEntries) {
    totalBazarPaisa += entry.amountPaisa;
    if (entry.paymentSource === PaymentSource.MEMBER && entry.paidByMembershipId) {
      bazarPaidMap.set(
        entry.paidByMembershipId,
        (bazarPaidMap.get(entry.paidByMembershipId) ?? 0) + entry.amountPaisa,
      );
    } else if (entry.paymentSource === PaymentSource.CASHBOX) {
      cashboxBazarPaisa += entry.amountPaisa;
    }
  }

  const mealRateRoundedPaisa = calculateMealRateRoundedPaisa(totalBazarPaisa, totalMealHalfUnits);

  const mealCostAllocations = allocateMealCosts(
    totalBazarPaisa,
    eligibleMemberships.map((m) => ({
      membershipId: m.id,
      mealHalfUnits: mealMap.get(m.id) ?? 0,
    })),
  );
  const mealCostMap = new Map<string, number>(
    mealCostAllocations.map((a) => [a.membershipId, a.amountPaisa]),
  );

  // Aggregate deposits
  let totalDepositPaisa = 0;
  const depositMap = new Map<string, number>();
  for (const dep of deposits) {
    totalDepositPaisa += dep.amountPaisa;
    depositMap.set(dep.membershipId, (depositMap.get(dep.membershipId) ?? 0) + dep.amountPaisa);
  }

  // Aggregate other expenses & shares
  let totalOtherExpensePaisa = 0;
  let cashboxOtherExpensePaisa = 0;
  const otherExpensePaidMap = new Map<string, number>();
  const otherExpenseShareMap = new Map<string, number>();
  const mealBasedExpenseAllocations: ComputedMonthAccounting["mealBasedExpenseAllocations"] = [];

  for (const exp of expenses) {
    totalOtherExpensePaisa += exp.amountPaisa;

    if (exp.paymentSource === PaymentSource.MEMBER && exp.paidByMembershipId) {
      otherExpensePaidMap.set(
        exp.paidByMembershipId,
        (otherExpensePaidMap.get(exp.paidByMembershipId) ?? 0) + exp.amountPaisa,
      );
    } else if (exp.paymentSource === PaymentSource.CASHBOX) {
      cashboxOtherExpensePaisa += exp.amountPaisa;
    }

    if (exp.allocationMethod === AllocationMethod.MEAL_BASED) {
      const shares = allocateByWeights(
        exp.amountPaisa,
        eligibleMemberships.map((m) => ({
          membershipId: m.id,
          weight: mealMap.get(m.id) ?? 0,
        })),
      );
      mealBasedExpenseAllocations.push({ expenseId: exp.id, shares });
      for (const s of shares) {
        otherExpenseShareMap.set(
          s.membershipId,
          (otherExpenseShareMap.get(s.membershipId) ?? 0) + s.amountPaisa,
        );
      }
    } else {
      for (const s of exp.shares) {
        otherExpenseShareMap.set(
          s.membershipId,
          (otherExpenseShareMap.get(s.membershipId) ?? 0) + s.amountPaisa,
        );
      }
    }
  }

  const members: ComputedMemberSettlement[] = eligibleMemberships.map((m) => {
    const memberMeals = mealMap.get(m.id) ?? 0;
    const mealCostPaisa = mealCostMap.get(m.id) ?? 0;
    const otherExpenseSharePaisa = otherExpenseShareMap.get(m.id) ?? 0;
    const totalCostPaisa = mealCostPaisa + otherExpenseSharePaisa;

    const depositPaisa = depositMap.get(m.id) ?? 0;
    const bazarPaidPaisa = bazarPaidMap.get(m.id) ?? 0;
    const otherExpensePaidPaisa = otherExpensePaidMap.get(m.id) ?? 0;
    const totalCreditPaisa = depositPaisa + bazarPaidPaisa + otherExpensePaidPaisa;

    const netBalancePaisa = totalCostPaisa - totalCreditPaisa;

    return {
      membershipId: m.id,
      displayName: m.displayName ?? m.user.name,
      userId: m.user.id,
      totalMealHalfUnits: memberMeals,
      mealCostPaisa,
      otherExpenseSharePaisa,
      totalCostPaisa,
      depositPaisa,
      bazarPaidPaisa,
      otherExpensePaidPaisa,
      totalCreditPaisa,
      netBalancePaisa,
    };
  });

  // Financial consistency verification
  if (totalMealHalfUnits > 0 && totalBazarPaisa > 0) {
    const sumMealCosts = members.reduce((acc, m) => acc + m.mealCostPaisa, 0);
    if (sumMealCosts !== totalBazarPaisa) {
      throw new AppError(
        500,
        `Financial consistency check failed: meal costs (${sumMealCosts}) != total bazar (${totalBazarPaisa})`,
      );
    }
  }

  if (eligibleMemberships.length > 0 && totalOtherExpensePaisa > 0) {
    const sumOtherShares = members.reduce((acc, m) => acc + m.otherExpenseSharePaisa, 0);
    if (sumOtherShares !== totalOtherExpensePaisa) {
      throw new AppError(
        500,
        `Financial consistency check failed: expense shares (${sumOtherShares}) != total other expenses (${totalOtherExpensePaisa})`,
      );
    }
  }

  const cashboxBalancePaisa = totalDepositPaisa - cashboxBazarPaisa - cashboxOtherExpensePaisa;

  return {
    messId,
    monthKey,
    status: messMonth?.status ?? MonthStatus.OPEN,
    totalBazarPaisa,
    totalMealHalfUnits,
    mealRateRoundedPaisa,
    totalOtherExpensePaisa,
    totalDepositPaisa,
    cashboxBazarPaisa,
    cashboxOtherExpensePaisa,
    cashboxBalancePaisa,
    mealBasedExpenseAllocations,
    members,
  };
};

const previewSettlement = async (messId: string, monthKey: string) => {
  return computeMonthAccounting(messId, monthKey);
};

const closeMonth = async (
  messId: string,
  monthKey: string,
  actorMembershipId: string,
  actorUserId: string,
) => {
  return prisma.$transaction(async (tx) => {
    const existingMonth = await tx.messMonth.findUnique({
      where: { messId_monthKey: { messId, monthKey } },
    });

    if (existingMonth && existingMonth.status === MonthStatus.CLOSED) {
      throw new AppError(409, `Month ${monthKey} is already closed`);
    }

    const computed = await computeMonthAccounting(messId, monthKey, tx);

    // Materialize MEAL_BASED expense shares for historical auditability
    for (const allocation of computed.mealBasedExpenseAllocations) {
      await tx.expenseShare.deleteMany({
        where: { expenseId: allocation.expenseId },
      });
      if (allocation.shares.length > 0) {
        await tx.expenseShare.createMany({
          data: allocation.shares.map((s) => ({
            messId,
            expenseId: allocation.expenseId,
            membershipId: s.membershipId,
            monthKey,
            amountPaisa: s.amountPaisa,
          })),
        });
      }
    }

    const closedAt = new Date();
    const messMonth = await tx.messMonth.upsert({
      where: { messId_monthKey: { messId, monthKey } },
      create: {
        messId,
        monthKey,
        status: MonthStatus.CLOSED,
        totalBazarPaisa: computed.totalBazarPaisa,
        totalMealHalfUnits: computed.totalMealHalfUnits,
        mealRateRoundedPaisa: computed.mealRateRoundedPaisa,
        totalOtherExpensePaisa: computed.totalOtherExpensePaisa,
        totalDepositPaisa: computed.totalDepositPaisa,
        closedAt,
        closedByMembershipId: actorMembershipId,
      },
      update: {
        status: MonthStatus.CLOSED,
        totalBazarPaisa: computed.totalBazarPaisa,
        totalMealHalfUnits: computed.totalMealHalfUnits,
        mealRateRoundedPaisa: computed.mealRateRoundedPaisa,
        totalOtherExpensePaisa: computed.totalOtherExpensePaisa,
        totalDepositPaisa: computed.totalDepositPaisa,
        closedAt,
        closedByMembershipId: actorMembershipId,
      },
    });

    const settlements = [];
    for (const member of computed.members) {
      const saved = await tx.memberSettlement.upsert({
        where: {
          messId_membershipId_monthKey: {
            messId,
            membershipId: member.membershipId,
            monthKey,
          },
        },
        create: {
          messId,
          messMonthId: messMonth.id,
          membershipId: member.membershipId,
          monthKey,
          totalMealHalfUnits: member.totalMealHalfUnits,
          mealCostPaisa: member.mealCostPaisa,
          otherExpenseSharePaisa: member.otherExpenseSharePaisa,
          totalCostPaisa: member.totalCostPaisa,
          depositPaisa: member.depositPaisa,
          bazarPaidPaisa: member.bazarPaidPaisa,
          otherExpensePaidPaisa: member.otherExpensePaidPaisa,
          totalCreditPaisa: member.totalCreditPaisa,
          netBalancePaisa: member.netBalancePaisa,
        },
        update: {
          messMonthId: messMonth.id,
          totalMealHalfUnits: member.totalMealHalfUnits,
          mealCostPaisa: member.mealCostPaisa,
          otherExpenseSharePaisa: member.otherExpenseSharePaisa,
          totalCostPaisa: member.totalCostPaisa,
          depositPaisa: member.depositPaisa,
          bazarPaidPaisa: member.bazarPaidPaisa,
          otherExpensePaidPaisa: member.otherExpensePaidPaisa,
          totalCreditPaisa: member.totalCreditPaisa,
          netBalancePaisa: member.netBalancePaisa,
        },
      });
      settlements.push(saved);
    }

    await createAuditLog(tx, {
      messId,
      actorUserId,
      action: "MONTH_CLOSED",
      entityType: "MessMonth",
      entityId: messMonth.id,
      metadata: {
        monthKey,
        totalBazarPaisa: computed.totalBazarPaisa,
        totalMealHalfUnits: computed.totalMealHalfUnits,
        mealRateRoundedPaisa: computed.mealRateRoundedPaisa,
      },
    });

    return { messMonth, settlements };
  });
};

const getSettlementByMonth = async (messId: string, monthKey: string) => {
  const messMonth = await prisma.messMonth.findUnique({
    where: { messId_monthKey: { messId, monthKey } },
    include: {
      settlements: {
        include: {
          membership: {
            select: {
              id: true,
              displayName: true,
              user: { select: { id: true, name: true } },
            },
          },
        },
      },
    },
  });

  if (messMonth && messMonth.status === MonthStatus.CLOSED) {
    return {
      isClosed: true,
      messMonth,
      settlements: messMonth.settlements,
    };
  }

  const preview = await computeMonthAccounting(messId, monthKey);
  return {
    isClosed: false,
    preview,
  };
};

const getMemberSettlement = async (messId: string, monthKey: string, memberId: string) => {
  await assertMembershipBelongsToMess(messId, memberId);

  const messMonth = await prisma.messMonth.findUnique({
    where: { messId_monthKey: { messId, monthKey } },
  });

  if (messMonth && messMonth.status === MonthStatus.CLOSED) {
    const settlement = await prisma.memberSettlement.findUnique({
      where: {
        messId_membershipId_monthKey: {
          messId,
          membershipId: memberId,
          monthKey,
        },
      },
    });
    if (!settlement) {
      throw new AppError(404, "Settlement not found for this member in the closed month");
    }
    return { isClosed: true, messMonth, settlement };
  }

  const preview = await computeMonthAccounting(messId, monthKey);
  const memberPreview = preview.members.find((m) => m.membershipId === memberId);
  if (!memberPreview) {
    throw new AppError(404, "Member has no settlement data for this month");
  }

  return {
    isClosed: false,
    monthKey,
    settlement: memberPreview,
  };
};

export const settlementService = {
  previewSettlement,
  closeMonth,
  getSettlementByMonth,
  getMemberSettlement,
};
