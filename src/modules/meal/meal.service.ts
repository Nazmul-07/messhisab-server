import type { MealType } from "../../generated/prisma/enums.js";
import { prisma } from "../../config/prisma.js";
import { AppError } from "../../shared/AppError.js";
import { getDhakaMonthKey, toDhakaBusinessDate } from "../../shared/dateUtils.js";
import {
  assertActiveMembershipInMess,
  assertMonthIsOpen,
  createAuditLog,
} from "../../shared/tenantUtils.js";

export interface CreateMealInput {
  membershipId: string;
  date: string;
  mealType: MealType;
  mealHalfUnits: number;
  note?: string | null;
}

export interface BulkCreateMealInput {
  date: string;
  entries: Array<{
    membershipId: string;
    mealType: MealType;
    mealHalfUnits: number;
    note?: string | null;
  }>;
}

export interface UpdateMealInput {
  mealHalfUnits?: number;
  note?: string | null;
}

const createMeal = async (
  messId: string,
  actorMembershipId: string,
  actorUserId: string,
  input: CreateMealInput,
) => {
  const date = toDhakaBusinessDate(input.date);
  const monthKey = getDhakaMonthKey(date);

  await assertMonthIsOpen(messId, monthKey);
  await assertActiveMembershipInMess(messId, input.membershipId);

  const duplicate = await prisma.mealRecord.findUnique({
    where: {
      messId_membershipId_date_mealType: {
        messId,
        membershipId: input.membershipId,
        date,
        mealType: input.mealType,
      },
    },
  });

  if (duplicate) {
    throw new AppError(409, "Meal record already exists for this member, date, and meal type");
  }

  return prisma.$transaction(async (tx) => {
    const record = await tx.mealRecord.create({
      data: {
        messId,
        membershipId: input.membershipId,
        monthKey,
        date,
        mealType: input.mealType,
        mealHalfUnits: input.mealHalfUnits,
        note: input.note ?? null,
        createdByMembershipId: actorMembershipId,
      },
    });

    await createAuditLog(tx, {
      messId,
      actorUserId,
      action: "MEAL_CREATED",
      entityType: "MealRecord",
      entityId: record.id,
      metadata: {
        membershipId: input.membershipId,
        monthKey,
        mealType: input.mealType,
        mealHalfUnits: input.mealHalfUnits,
      },
    });

    return record;
  });
};

const bulkCreateMeals = async (
  messId: string,
  actorMembershipId: string,
  actorUserId: string,
  input: BulkCreateMealInput,
) => {
  const date = toDhakaBusinessDate(input.date);
  const monthKey = getDhakaMonthKey(date);

  await assertMonthIsOpen(messId, monthKey);

  const seenSlots = new Set<string>();
  const uniqueMemberIds = new Set<string>();

  for (const entry of input.entries) {
    const slotKey = `${entry.membershipId}:${entry.mealType}`;
    if (seenSlots.has(slotKey)) {
      throw new AppError(400, `Duplicate meal entry in payload for ${slotKey}`);
    }
    seenSlots.add(slotKey);
    uniqueMemberIds.add(entry.membershipId);
  }

  for (const membershipId of uniqueMemberIds) {
    await assertActiveMembershipInMess(messId, membershipId);
  }

  return prisma.$transaction(async (tx) => {
    const createdRecords = [];

    for (const entry of input.entries) {
      const existing = await tx.mealRecord.findUnique({
        where: {
          messId_membershipId_date_mealType: {
            messId,
            membershipId: entry.membershipId,
            date,
            mealType: entry.mealType,
          },
        },
      });

      if (existing) {
        throw new AppError(
          409,
          `Meal record already exists for member ${entry.membershipId} on ${entry.mealType}`,
        );
      }

      const created = await tx.mealRecord.create({
        data: {
          messId,
          membershipId: entry.membershipId,
          monthKey,
          date,
          mealType: entry.mealType,
          mealHalfUnits: entry.mealHalfUnits,
          note: entry.note ?? null,
          createdByMembershipId: actorMembershipId,
        },
      });
      createdRecords.push(created);
    }

    await createAuditLog(tx, {
      messId,
      actorUserId,
      action: "MEALS_BULK_CREATED",
      entityType: "MealRecord",
      entityId: monthKey,
      metadata: { count: createdRecords.length, date: date.toISOString() },
    });

    return createdRecords;
  });
};

const listMeals = async (
  messId: string,
  filters: { monthKey?: string; date?: string; membershipId?: string },
) => {
  return prisma.mealRecord.findMany({
    where: {
      messId,
      ...(filters.monthKey ? { monthKey: filters.monthKey } : {}),
      ...(filters.date ? { date: toDhakaBusinessDate(filters.date) } : {}),
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
    orderBy: [{ date: "desc" }, { mealType: "asc" }],
  });
};

const getMealById = async (messId: string, id: string) => {
  const record = await prisma.mealRecord.findFirst({
    where: { id, messId },
    include: {
      membership: {
        select: {
          id: true,
          displayName: true,
          user: { select: { id: true, name: true } },
        },
      },
    },
  });

  if (!record) {
    throw new AppError(404, "Meal record not found in this mess");
  }

  return record;
};

const updateMeal = async (
  messId: string,
  id: string,
  actorUserId: string,
  input: UpdateMealInput,
) => {
  const existing = await getMealById(messId, id);
  await assertMonthIsOpen(messId, existing.monthKey);

  return prisma.$transaction(async (tx) => {
    const updated = await tx.mealRecord.update({
      where: { id },
      data: {
        ...(input.mealHalfUnits !== undefined ? { mealHalfUnits: input.mealHalfUnits } : {}),
        ...(input.note !== undefined ? { note: input.note } : {}),
      },
    });

    await createAuditLog(tx, {
      messId,
      actorUserId,
      action: "MEAL_UPDATED",
      entityType: "MealRecord",
      entityId: id,
      metadata: input as Record<string, unknown>,
    });

    return updated;
  });
};

const deleteMeal = async (messId: string, id: string, actorUserId: string) => {
  const existing = await getMealById(messId, id);
  await assertMonthIsOpen(messId, existing.monthKey);

  return prisma.$transaction(async (tx) => {
    const deleted = await tx.mealRecord.delete({
      where: { id },
    });

    await createAuditLog(tx, {
      messId,
      actorUserId,
      action: "MEAL_DELETED",
      entityType: "MealRecord",
      entityId: id,
    });

    return deleted;
  });
};

export const mealService = {
  createMeal,
  bulkCreateMeals,
  listMeals,
  getMealById,
  updateMeal,
  deleteMeal,
};
