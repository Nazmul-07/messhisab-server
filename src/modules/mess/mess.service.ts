import { MembershipStatus, MessRole } from "../../generated/prisma/enums.js";
import { prisma } from "../../config/prisma.js";
import { AppError } from "../../shared/AppError.js";
import { APP_CONSTANTS } from "../../shared/constants.js";
import { createAuditLog } from "../../shared/tenantUtils.js";

export interface CreateMessInput {
  name: string;
  address?: string;
  displayName?: string;
  phone?: string;
}

export interface UpdateMessInput {
  name?: string;
  address?: string | null;
}

const createMess = async (userId: string, userName: string, input: CreateMessInput) => {
  return prisma.$transaction(async (tx) => {
    const mess = await tx.mess.create({
      data: {
        name: input.name,
        address: input.address,
        currency: APP_CONSTANTS.CURRENCY,
        timezone: APP_CONSTANTS.TIMEZONE,
        createdById: userId,
      },
    });

    const membership = await tx.membership.create({
      data: {
        messId: mess.id,
        userId,
        role: MessRole.ADMIN,
        status: MembershipStatus.ACTIVE,
        displayName: input.displayName ?? userName,
        phone: input.phone,
      },
    });

    await createAuditLog(tx, {
      messId: mess.id,
      actorUserId: userId,
      action: "MESS_CREATED",
      entityType: "Mess",
      entityId: mess.id,
      metadata: { name: mess.name },
    });

    return { mess, membership };
  });
};

const listUserMesses = async (userId: string) => {
  const memberships = await prisma.membership.findMany({
    where: {
      userId,
      status: MembershipStatus.ACTIVE,
      mess: {
        isActive: true,
      },
    },
    include: {
      mess: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return memberships.map((m) => ({
    ...m.mess,
    myMembership: {
      id: m.id,
      role: m.role,
      status: m.status,
      displayName: m.displayName,
      joinedAt: m.joinedAt,
    },
  }));
};

const getMessById = async (messId: string) => {
  const mess = await prisma.mess.findFirst({
    where: {
      id: messId,
      isActive: true,
    },
    include: {
      _count: {
        select: {
          memberships: {
            where: {
              status: MembershipStatus.ACTIVE,
            },
          },
        },
      },
    },
  });

  if (!mess) {
    throw new AppError(404, "Mess not found");
  }

  return mess;
};

const updateMess = async (messId: string, actorUserId: string, input: UpdateMessInput) => {
  return prisma.$transaction(async (tx) => {
    const updated = await tx.mess.update({
      where: { id: messId },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.address !== undefined ? { address: input.address } : {}),
      },
    });

    await createAuditLog(tx, {
      messId,
      actorUserId,
      action: "MESS_UPDATED",
      entityType: "Mess",
      entityId: messId,
      metadata: input as Record<string, unknown>,
    });

    return updated;
  });
};

export const messService = {
  createMess,
  listUserMesses,
  getMessById,
  updateMess,
};
