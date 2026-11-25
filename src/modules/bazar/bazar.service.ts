import { type PaymentMethod, PaymentSource } from "../../generated/prisma/enums.js";
import { prisma } from "../../config/prisma.js";
import { AppError } from "../../shared/AppError.js";
import { getDhakaMonthKey, toDhakaBusinessDate } from "../../shared/dateUtils.js";
import {
  assertMembershipBelongsToMess,
  assertMonthIsOpen,
  createAuditLog,
} from "../../shared/tenantUtils.js";

export interface CreateBazarInput {
  title: string;
  amountPaisa: number;
  purchaseDate: string;
  paymentSource: PaymentSource;
  paymentMethod: PaymentMethod;
  paidByMembershipId?: string | null;
  description?: string | null;
  receiptUrl?: string | null;
}

export type UpdateBazarInput = Partial<CreateBazarInput>;

const createBazar = async (
  messId: string,
  actorMembershipId: string,
  actorUserId: string,
  input: CreateBazarInput,
) => {
  const purchaseDate = toDhakaBusinessDate(input.purchaseDate);
  const monthKey = getDhakaMonthKey(purchaseDate);

  await assertMonthIsOpen(messId, monthKey);

  if (input.paymentSource === PaymentSource.MEMBER) {
    if (!input.paidByMembershipId) {
      throw new AppError(400, "paidByMembershipId is required when paymentSource is MEMBER");
    }
    await assertMembershipBelongsToMess(messId, input.paidByMembershipId);
  }

  return prisma.$transaction(async (tx) => {
    const entry = await tx.bazarEntry.create({
      data: {
        messId,
        monthKey,
        title: input.title,
        amountPaisa: input.amountPaisa,
        purchaseDate,
        paymentSource: input.paymentSource,
        paymentMethod: input.paymentMethod,
        paidByMembershipId:
          input.paymentSource === PaymentSource.MEMBER ? input.paidByMembershipId! : null,
        description: input.description ?? null,
        receiptUrl: input.receiptUrl ?? null,
        createdByMembershipId: actorMembershipId,
      },
    });

    await createAuditLog(tx, {
      messId,
      actorUserId,
      action: "BAZAR_CREATED",
      entityType: "BazarEntry",
      entityId: entry.id,
      metadata: { amountPaisa: entry.amountPaisa, monthKey },
    });

    return entry;
  });
};

const listBazar = async (messId: string, monthKey?: string) => {
  return prisma.bazarEntry.findMany({
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
    },
    orderBy: [{ purchaseDate: "desc" }, { createdAt: "desc" }],
  });
};

const getBazarById = async (messId: string, id: string) => {
  const entry = await prisma.bazarEntry.findFirst({
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
    },
  });

  if (!entry) {
    throw new AppError(404, "Bazar entry not found in this mess");
  }

  return entry;
};

const updateBazar = async (
  messId: string,
  id: string,
  actorUserId: string,
  input: UpdateBazarInput,
) => {
  const existing = await getBazarById(messId, id);
  await assertMonthIsOpen(messId, existing.monthKey);

  const nextPurchaseDate = input.purchaseDate
    ? toDhakaBusinessDate(input.purchaseDate)
    : existing.purchaseDate;
  const nextMonthKey = getDhakaMonthKey(nextPurchaseDate);
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

  return prisma.$transaction(async (tx) => {
    const updated = await tx.bazarEntry.update({
      where: { id },
      data: {
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.amountPaisa !== undefined ? { amountPaisa: input.amountPaisa } : {}),
        purchaseDate: nextPurchaseDate,
        monthKey: nextMonthKey,
        paymentSource: nextPaymentSource,
        ...(input.paymentMethod !== undefined ? { paymentMethod: input.paymentMethod } : {}),
        paidByMembershipId: nextPaidByMembershipId,
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.receiptUrl !== undefined ? { receiptUrl: input.receiptUrl } : {}),
      },
    });

    await createAuditLog(tx, {
      messId,
      actorUserId,
      action: "BAZAR_UPDATED",
      entityType: "BazarEntry",
      entityId: id,
      metadata: input as Record<string, unknown>,
    });

    return updated;
  });
};

const deleteBazar = async (messId: string, id: string, actorUserId: string) => {
  const existing = await getBazarById(messId, id);
  await assertMonthIsOpen(messId, existing.monthKey);

  return prisma.$transaction(async (tx) => {
    const deleted = await tx.bazarEntry.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
      },
    });

    await createAuditLog(tx, {
      messId,
      actorUserId,
      action: "BAZAR_DELETED",
      entityType: "BazarEntry",
      entityId: id,
    });

    return deleted;
  });
};

export const bazarService = {
  createBazar,
  listBazar,
  getBazarById,
  updateBazar,
  deleteBazar,
};
