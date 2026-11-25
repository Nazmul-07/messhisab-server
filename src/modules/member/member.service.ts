import { MembershipStatus, MessRole } from "../../generated/prisma/enums.js";
import { prisma } from "../../config/prisma.js";
import { AppError } from "../../shared/AppError.js";
import { toDhakaBusinessDate } from "../../shared/dateUtils.js";
import { assertMembershipBelongsToMess, createAuditLog } from "../../shared/tenantUtils.js";

export interface UpdateMemberInput {
  displayName?: string;
  phone?: string | null;
  status?: "ACTIVE" | "INACTIVE";
  joinedAt?: string;
  leftAt?: string | null;
}

const listMembers = async (messId: string, status?: MembershipStatus) => {
  return prisma.membership.findMany({
    where: {
      messId,
      ...(status ? { status } : {}),
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
    },
    orderBy: [{ role: "asc" }, { joinedAt: "asc" }],
  });
};

const getMemberById = async (messId: string, memberId: string) => {
  const member = await prisma.membership.findFirst({
    where: {
      id: memberId,
      messId,
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
    },
  });

  if (!member) {
    throw new AppError(404, "Member not found in this mess");
  }

  return member;
};

const updateMember = async (
  messId: string,
  memberId: string,
  actorUserId: string,
  input: UpdateMemberInput,
) => {
  const existing = await assertMembershipBelongsToMess(messId, memberId);

  if (existing.role === MessRole.ADMIN && input.status === MembershipStatus.INACTIVE) {
    throw new AppError(400, "Cannot deactivate the mess admin");
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.membership.update({
      where: { id: memberId },
      data: {
        ...(input.displayName !== undefined ? { displayName: input.displayName } : {}),
        ...(input.phone !== undefined ? { phone: input.phone } : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
        ...(input.joinedAt !== undefined ? { joinedAt: toDhakaBusinessDate(input.joinedAt) } : {}),
        ...(input.leftAt !== undefined
          ? { leftAt: input.leftAt ? toDhakaBusinessDate(input.leftAt) : null }
          : {}),
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    await createAuditLog(tx, {
      messId,
      actorUserId,
      action: "MEMBER_UPDATED",
      entityType: "Membership",
      entityId: memberId,
      metadata: input as Record<string, unknown>,
    });

    return updated;
  });
};

const removeMember = async (messId: string, memberId: string, actorUserId: string) => {
  const existing = await assertMembershipBelongsToMess(messId, memberId);

  if (existing.role === MessRole.ADMIN) {
    throw new AppError(400, "Cannot remove the mess admin");
  }

  if (existing.status === MembershipStatus.REMOVED) {
    throw new AppError(400, "Member is already removed");
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.membership.update({
      where: { id: memberId },
      data: {
        status: MembershipStatus.REMOVED,
        leftAt: existing.leftAt ?? new Date(),
      },
    });

    await createAuditLog(tx, {
      messId,
      actorUserId,
      action: "MEMBER_REMOVED",
      entityType: "Membership",
      entityId: memberId,
    });

    return updated;
  });
};

export const memberService = {
  listMembers,
  getMemberById,
  updateMember,
  removeMember,
};
