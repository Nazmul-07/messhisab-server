import { prisma } from "../../config/prisma.js";
import { assertMembershipBelongsToMess } from "../../shared/tenantUtils.js";
import { computeMonthAccounting } from "../settlement/settlement.service.js";

const getMonthlyReport = async (messId: string, monthKey: string) => {
  return computeMonthAccounting(messId, monthKey);
};

const getMemberReport = async (messId: string, memberId: string, monthKey: string) => {
  const membership = await assertMembershipBelongsToMess(messId, memberId);

  const [accounting, deposits, bazarPaid, expensesPaid, meals] = await Promise.all([
    computeMonthAccounting(messId, monthKey),
    prisma.deposit.findMany({
      where: { messId, membershipId: memberId, monthKey, isDeleted: false },
      orderBy: { depositDate: "desc" },
    }),
    prisma.bazarEntry.findMany({
      where: { messId, paidByMembershipId: memberId, monthKey, isDeleted: false },
      orderBy: { purchaseDate: "desc" },
    }),
    prisma.expense.findMany({
      where: { messId, paidByMembershipId: memberId, monthKey, isDeleted: false },
      orderBy: { expenseDate: "desc" },
    }),
    prisma.mealRecord.findMany({
      where: { messId, membershipId: memberId, monthKey },
      orderBy: [{ date: "desc" }, { mealType: "asc" }],
    }),
  ]);

  const summary = accounting.members.find((m) => m.membershipId === memberId) ?? null;

  return {
    messId,
    monthKey,
    membership,
    summary,
    deposits,
    bazarPaid,
    expensesPaid,
    meals,
  };
};

const getTransactionsReport = async (messId: string, monthKey: string) => {
  const [bazarEntries, deposits, expenses] = await Promise.all([
    prisma.bazarEntry.findMany({
      where: { messId, monthKey, isDeleted: false },
      include: {
        paidBy: {
          select: { id: true, displayName: true, user: { select: { name: true } } },
        },
      },
    }),
    prisma.deposit.findMany({
      where: { messId, monthKey, isDeleted: false },
      include: {
        membership: {
          select: { id: true, displayName: true, user: { select: { name: true } } },
        },
      },
    }),
    prisma.expense.findMany({
      where: { messId, monthKey, isDeleted: false },
      include: {
        paidBy: {
          select: { id: true, displayName: true, user: { select: { name: true } } },
        },
      },
    }),
  ]);

  const transactions = [
    ...bazarEntries.map((b) => ({
      id: b.id,
      type: "BAZAR" as const,
      title: b.title,
      amountPaisa: b.amountPaisa,
      date: b.purchaseDate,
      paymentSource: b.paymentSource,
      paymentMethod: b.paymentMethod,
      memberName: b.paidBy?.displayName ?? b.paidBy?.user.name ?? null,
    })),
    ...deposits.map((d) => ({
      id: d.id,
      type: "DEPOSIT" as const,
      title: d.note ?? "Member Deposit",
      amountPaisa: d.amountPaisa,
      date: d.depositDate,
      paymentSource: "MEMBER" as const,
      paymentMethod: d.paymentMethod,
      memberName: d.membership.displayName ?? d.membership.user.name,
    })),
    ...expenses.map((e) => ({
      id: e.id,
      type: "EXPENSE" as const,
      title: e.title,
      category: e.category,
      amountPaisa: e.amountPaisa,
      date: e.expenseDate,
      paymentSource: e.paymentSource,
      paymentMethod: e.paymentMethod,
      memberName: e.paidBy?.displayName ?? e.paidBy?.user.name ?? null,
    })),
  ].sort((a, b) => b.date.getTime() - a.date.getTime());

  return {
    messId,
    monthKey,
    count: transactions.length,
    transactions,
  };
};

export const reportService = {
  getMonthlyReport,
  getMemberReport,
  getTransactionsReport,
};
