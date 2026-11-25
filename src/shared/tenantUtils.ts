import type { Prisma } from "../generated/prisma/client.js";
import { MembershipStatus, MonthStatus } from "../generated/prisma/enums.js";
import { prisma } from "../config/prisma.js";
import { AppError } from "./AppError.js";
import { getMonthBounds } from "./dateUtils.js";

type DbClient = Prisma.TransactionClient | typeof prisma;

export const assertMembershipBelongsToMess = async (
  messId: string,
  membershipId: string,
  db: DbClient = prisma,
) => {
  const membership = await db.membership.findFirst({
    where: {
      id: membershipId,
      messId,
    },
  });

  if (!membership) {
    throw new AppError(404, "Member not found in this mess");
  }

  return membership;
};

export const assertActiveMembershipInMess = async (
  messId: string,
  membershipId: string,
  db: DbClient = prisma,
) => {
  const membership = await assertMembershipBelongsToMess(messId, membershipId, db);
  if (membership.status !== MembershipStatus.ACTIVE) {
    throw new AppError(400, "Target member is not active in this mess");
  }
  return membership;
};

export const assertMonthIsOpen = async (
  messId: string,
  monthKey: string,
  db: DbClient = prisma,
): Promise<void> => {
  const month = await db.messMonth.findUnique({
    where: {
      messId_monthKey: {
        messId,
        monthKey,
      },
    },
    select: {
      status: true,
    },
  });

  if (month && month.status === MonthStatus.CLOSED) {
    throw new AppError(409, `Month ${monthKey} is closed and cannot be modified`);
  }
};

export const isMembershipEligibleForMonth = (
  membership: { joinedAt: Date; leftAt: Date | null; status: MembershipStatus },
  monthKey: string,
): boolean => {
  const { start, endExclusive } = getMonthBounds(monthKey);
  if (membership.joinedAt >= endExclusive) {
    return false;
  }
  if (membership.leftAt && membership.leftAt < start) {
    return false;
  }
  if (membership.status === MembershipStatus.REMOVED && !membership.leftAt) {
    return false;
  }
  return true;
};

export const createAuditLog = async (
  db: DbClient,
  input: {
    messId: string;
    actorUserId: string;
    action: string;
    entityType: string;
    entityId: string;
    metadata?: unknown;
  },
): Promise<void> => {
  await db.auditLog.create({
    data: {
      messId: input.messId,
      actorUserId: input.actorUserId,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      metadata:
        input.metadata !== undefined
          ? (JSON.parse(JSON.stringify(input.metadata)) as Prisma.InputJsonValue)
          : undefined,
    },
  });
};
