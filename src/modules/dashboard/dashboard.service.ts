import { MembershipStatus } from "../../generated/prisma/enums.js";
import { prisma } from "../../config/prisma.js";
import { computeMonthAccounting } from "../settlement/settlement.service.js";

const getSummary = async (messId: string, monthKey: string, myMembershipId: string) => {
  const [accounting, activeMemberCount] = await Promise.all([
    computeMonthAccounting(messId, monthKey),
    prisma.membership.count({
      where: {
        messId,
        status: MembershipStatus.ACTIVE,
      },
    }),
  ]);

  const mySummary =
    accounting.members.find((m) => m.membershipId === myMembershipId) ?? null;

  return {
    messId,
    monthKey,
    status: accounting.status,
    activeMemberCount,
    totalBazarPaisa: accounting.totalBazarPaisa,
    totalMealHalfUnits: accounting.totalMealHalfUnits,
    mealRateRoundedPaisa: accounting.mealRateRoundedPaisa,
    totalOtherExpensePaisa: accounting.totalOtherExpensePaisa,
    totalDepositPaisa: accounting.totalDepositPaisa,
    cashboxBalancePaisa: accounting.cashboxBalancePaisa,
    mySummary,
  };
};

export const dashboardService = {
  getSummary,
};
