import {
  AllocationMethod,
  type ExpenseCategory,
  type PaymentMethod,
  PaymentSource,
} from "../../generated/prisma/enums.js";
import { prisma } from "../../config/prisma.js";
import { AppError } from "../../shared/AppError.js";
import { getDhakaMonthKey, toDhakaBusinessDate } from "../../shared/dateUtils.js";
import { allocateEqual, type AllocationResult } from "../../shared/financeUtils.js";
import {
  assertMembershipBelongsToMess,
  assertMonthIsOpen,
  createAuditLog,
  isMembershipEligibleForMonth,
} from "../../shared/tenantUtils.js";

export interface CustomShareInput {
  membershipId: string;
  amountPaisa: number;
}

export interface CreateExpenseInput {
  title: string;
  category: ExpenseCategory;
  amountPaisa: number;
  expenseDate: string;
  allocationMethod: AllocationMethod;
  paymentSource: PaymentSource;
  paymentMethod: PaymentMethod;
  paidByMembershipId?: string | null;
  description?: string | null;
  shares?: CustomShareInput[];
}

export type UpdateExpenseInput = Partial<CreateExpenseInput>;

const buildSnapshotShares = async (
  messId: string,
  monthKey: string,
  amountPaisa: number,
  allocationMethod: AllocationMethod,
  customShares?: CustomShareInput[],
): Promise<AllocationResult[]> => {
  if (allocationMethod === AllocationMethod.MEAL_BASED) {
    return [];
  }

  if (allocationMethod === AllocationMethod.EQUAL) {
    const memberships = await prisma.membership.findMany({
      where: { messId },
      select: { id: true, joinedAt: true, leftAt: true, status: true },
    });

    const eligibleIds = memberships
      .filter((m) => isMembershipEligibleForMonth(m, monthKey))
      .map((m) => m.id);

    if (eligibleIds.length === 0) {
      throw new AppError(400, `No eligible members found for ${monthKey}`);
    }

    return allocateEqual(amountPaisa, eligibleIds);
  }

  // CUSTOM allocation
  if (!customShares || customShares.length === 0) {
    throw new AppError(400, "shares are required when allocationMethod is CUSTOM");
  }

  const seen = new Set<string>();
  let sum = 0;

  for (const share of customShares) {
    if (seen.has(share.membershipId)) {
      throw new AppError(400, `Duplicate membershipId ${share.membershipId} in custom shares`);
    }
    seen.add(share.membershipId);
    await assertMembershipBelongsToMess(messId, share.membershipId);
    sum += share.amountPaisa;
  }

  if (sum !== amountPaisa) {
    throw new AppError(
      400,
      `Sum of custom shares (${sum}) must equal expense amountPaisa (${amountPaisa})`,
    );
  }

  return customShares.map((s) => ({
    membershipId: s.membershipId,
    amountPaisa: s.amountPaisa,
  }));
};

const createExpense = async (
  messId: string,
  actorMembershipId: string,
  actorUserId: string,
  input: CreateExpenseInput,
) => {
  const expenseDate = toDhakaBusinessDate(input.expenseDate);
  const monthKey = getDhakaMonthKey(expenseDate);

  await assertMonthIsOpen(messId, monthKey);

  if (input.paymentSource === PaymentSource.MEMBER) {
    if (!input.paidByMembershipId) {
      throw new AppError(400, "paidByMembershipId is required when paymentSource is MEMBER");
    }
    await assertMembershipBelongsToMess(messId, input.paidByMembershipId);
  }

  const snapshotShares = await buildSnapshotShares(
    messId,
    monthKey,
    input.amountPaisa,
    input.allocationMethod,
    input.shares,
  );

  return prisma.$transaction(async (tx) => {
    const expense = await tx.expense.create({
      data: {
        messId,
        monthKey,
        title: input.title,
        category: input.category,
        amountPaisa: input.amountPaisa,
        expenseDate,
        allocationMethod: input.allocationMethod,
        paymentSource: input.paymentSource,
        paymentMethod: input.paymentMethod,
        paidByMembershipId:
          input.paymentSource === PaymentSource.MEMBER ? input.paidByMembershipId! : null,
        description: input.description ?? null,
        createdByMembershipId: actorMembershipId,
      },
    });

    if (snapshotShares.length > 0) {
      await tx.expenseShare.createMany({
        data: snapshotShares.map((share) => ({
          messId,
          expenseId: expense.id,
          membershipId: share.membershipId,
          monthKey,
          amountPaisa: share.amountPaisa,
        })),
      });
    }

    await createAuditLog(tx, {
      messId,
      actorUserId,
      action: "EXPENSE_CREATED",
      entityType: "Expense",
      entityId: expense.id,
      metadata: {
        amountPaisa: expense.amountPaisa,
        allocationMethod: expense.allocationMethod,
        monthKey,
      },
    });

    return tx.expense.findUnique({
      where: { id: expense.id },
      include: { shares: true },
    });
  });
};

const listExpenses = async (messId: string, monthKey?: string) => {
  return prisma.expense.findMany({
    where: {
      messId,
      isDeleted: false,
      ...(monthKey ? { monthKey } : {}),
    },
    include: {
      paidBy: {
        select: {
          id: true,
          displayName: true,
          user: { select: { id: true, name: true } },
        },
      },
      shares: true,
    },
    orderBy: [{ expenseDate: "desc" }, { createdAt: "desc" }],
  });
};

const getExpenseById = async (messId: string, id: string) => {
  const expense = await prisma.expense.findFirst({
    where: {
      id,
      messId,
      isDeleted: false,
    },
    include: {
      paidBy: {
        select: {
          id: true,
          displayName: true,
          user: { select: { id: true, name: true } },
        },
      },
      shares: true,
    },
  });

  if (!expense) {
    throw new AppError(404, "Expense not found in this mess");
  }

  return expense;
};

const updateExpense = async (
  messId: string,
  id: string,
  actorUserId: string,
  input: UpdateExpenseInput,
) => {
  const existing = await getExpenseById(messId, id);
  await assertMonthIsOpen(messId, existing.monthKey);

  const nextExpenseDate = input.expenseDate
    ? toDhakaBusinessDate(input.expenseDate)
    : existing.expenseDate;
  const nextMonthKey = getDhakaMonthKey(nextExpenseDate);
  if (nextMonthKey !== existing.monthKey) {
    await assertMonthIsOpen(messId, nextMonthKey);
  }

  const nextPaymentSource = input.paymentSource ?? existing.paymentSource;
  let nextPaidByMembershipId: string | null =
    input.paidByMembershipId !== undefined
      ? input.paidByMembershipId
      : existing.paidByMembershipId;

  if (nextPaymentSource === PaymentSource.CASHBOX) {
    if (input.paidByMembershipId) {
      throw new AppError(400, "paidByMembershipId must be null when paymentSource is CASHBOX");
    }
    nextPaidByMembershipId = null;
  } else {
    if (!nextPaidByMembershipId) {
      throw new AppError(400, "paidByMembershipId is required when paymentSource is MEMBER");
    }
    await assertMembershipBelongsToMess(messId, nextPaidByMembershipId);
  }

  const nextAmountPaisa = input.amountPaisa ?? existing.amountPaisa;
  const nextAllocationMethod = input.allocationMethod ?? existing.allocationMethod;

  const shouldRebuildShares =
    input.amountPaisa !== undefined ||
    input.allocationMethod !== undefined ||
    input.expenseDate !== undefined ||
    input.shares !== undefined;

  const nextShares = shouldRebuildShares
    ? await buildSnapshotShares(
        messId,
        nextMonthKey,
        nextAmountPaisa,
        nextAllocationMethod,
        input.shares,
      )
    : null;

  return prisma.$transaction(async (tx) => {
    await tx.expense.update({
      where: { id },
      data: {
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.category !== undefined ? { category: input.category } : {}),
        amountPaisa: nextAmountPaisa,
        expenseDate: nextExpenseDate,
        monthKey: nextMonthKey,
        allocationMethod: nextAllocationMethod,
        paymentSource: nextPaymentSource,
        ...(input.paymentMethod !== undefined ? { paymentMethod: input.paymentMethod } : {}),
        paidByMembershipId: nextPaidByMembershipId,
        ...(input.description !== undefined ? { description: input.description } : {}),
      },
    });

    if (nextShares !== null) {
      await tx.expenseShare.deleteMany({
        where: { expenseId: id },
      });

      if (nextShares.length > 0) {
        await tx.expenseShare.createMany({
          data: nextShares.map((share) => ({
            messId,
            expenseId: id,
            membershipId: share.membershipId,
            monthKey: nextMonthKey,
            amountPaisa: share.amountPaisa,
          })),
        });
      }
    }

    await createAuditLog(tx, {
      messId,
      actorUserId,
      action: "EXPENSE_UPDATED",
      entityType: "Expense",
      entityId: id,
      metadata: input as Record<string, unknown>,
    });

    return tx.expense.findUnique({
      where: { id },
      include: { shares: true },
    });
  });
};

const deleteExpense = async (messId: string, id: string, actorUserId: string) => {
  const existing = await getExpenseById(messId, id);
  await assertMonthIsOpen(messId, existing.monthKey);

  return prisma.$transaction(async (tx) => {
    const deleted = await tx.expense.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
      },
    });

    await createAuditLog(tx, {
      messId,
      actorUserId,
      action: "EXPENSE_DELETED",
      entityType: "Expense",
      entityId: id,
    });

    return deleted;
  });
};

export const expenseService = {
  createExpense,
  listExpenses,
  getExpenseById,
  updateExpense,
  deleteExpense,
};
