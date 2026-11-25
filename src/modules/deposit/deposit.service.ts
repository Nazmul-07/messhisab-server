import type { PaymentMethod } from "../../generated/prisma/enums.js";
import { prisma } from "../../config/prisma.js";
import { AppError } from "../../shared/AppError.js";
import { getDhakaMonthKey, toDhakaBusinessDate } from "../../shared/dateUtils.js";
import {
  assertMembershipBelongsToMess,
  assertMonthIsOpen,
  createAuditLog,
} from "../../shared/tenantUtils.js";

export interface CreateDepositInput {
  membershipId: string;
  amountPaisa: number;
  depositDate: string;
  paymentMethod: PaymentMethod;
  reference?: string | null;
  note?: string | null;
}

export type UpdateDepositInput = Partial<CreateDepositInput>;

const createDeposit = async (
  messId: string,
  actorMembershipId: string,
  actorUserId: string,
  input: CreateDepositInput,
) => {
  const depositDate = toDhakaBusinessDate(input.depositDate);
  const monthKey = getDhakaMonthKey(depositDate);

  await assertMonthIsOpen(messId, monthKey);
  await assertMembershipBelongsToMess(messId, input.membershipId);

  return prisma.$transaction(async (tx) => {
    const deposit = await tx.deposit.create({
      data: {
        messId,
        membershipId: input.membershipId,
        monthKey,
        amountPaisa: input.amountPaisa,
        depositDate,
        paymentMethod: input.paymentMethod,
        reference: input.reference ?? null,
        note: input.note ?? null,
        createdByMembershipId: actorMembershipId,
      },
    });

    await createAuditLog(tx, {
      messId,
      actorUserId,
      action: "DEPOSIT_CREATED",
      entityType: "Deposit",
      entityId: deposit.id,
      metadata: {
        membershipId: input.membershipId,
        amountPaisa: input.amountPaisa,
        monthKey,
      },
    });

    return deposit;
  });
};

const listDeposits = async (
  messId: string,
  filters: { monthKey?: string; membershipId?: string },
) => {
  return prisma.deposit.findMany({
    where: {
      messId,
      isDeleted: false,
      ...(filters.monthKey ? { monthKey: filters.monthKey } : {}),
      ...(filters.membershipId ? { membershipId: filters.membershipId } : {}),
    },
    include: {
      membership: {
        select: {
          id: true,
          displayName: true,
          user: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: [{ depositDate: "desc" }, { createdAt: "desc" }],
  });
};

const getDepositById = async (messId: string, id: string) => {
  const deposit = await prisma.deposit.findFirst({
    where: {
      id,
      messId,
      isDeleted: false,
    },
  });

  if (!deposit) {
    throw new AppError(404, "Deposit not found in this mess");
  }

  return deposit;
};

const updateDeposit = async (
  messId: string,
  id: string,
  actorUserId: string,
  input: UpdateDepositInput,
) => {
  const existing = await getDepositById(messId, id);
  await assertMonthIsOpen(messId, existing.monthKey);

  const nextDate = input.depositDate
    ? toDhakaBusinessDate(input.depositDate)
    : existing.depositDate;
  const nextMonthKey = getDhakaMonthKey(nextDate);
  if (nextMonthKey !== existing.monthKey) {
    await assertMonthIsOpen(messId, nextMonthKey);
  }

  if (input.membershipId) {
    await assertMembershipBelongsToMess(messId, input.membershipId);
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.deposit.update({
      where: { id },
      data: {
        ...(input.membershipId !== undefined ? { membershipId: input.membershipId } : {}),
        ...(input.amountPaisa !== undefined ? { amountPaisa: input.amountPaisa } : {}),
        depositDate: nextDate,
        monthKey: nextMonthKey,
        ...(input.paymentMethod !== undefined ? { paymentMethod: input.paymentMethod } : {}),
        ...(input.reference !== undefined ? { reference: input.reference } : {}),
        ...(input.note !== undefined ? { note: input.note } : {}),
      },
    });

    await createAuditLog(tx, {
      messId,
      actorUserId,
      action: "DEPOSIT_UPDATED",
      entityType: "Deposit",
      entityId: id,
      metadata: input as Record<string, unknown>,
    });

    return updated;
  });
};

const deleteDeposit = async (messId: string, id: string, actorUserId: string) => {
  const existing = await getDepositById(messId, id);
  await assertMonthIsOpen(messId, existing.monthKey);

  return prisma.$transaction(async (tx) => {
    const deleted = await tx.deposit.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
      },
    });

    await createAuditLog(tx, {
      messId,
      actorUserId,
      action: "DEPOSIT_DELETED",
      entityType: "Deposit",
      entityId: id,
    });

    return deleted;
  });
};

export const depositService = {
  createDeposit,
  listDeposits,
  updateDeposit,
  deleteDeposit,
};
