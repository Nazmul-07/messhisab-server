import crypto from "node:crypto";
import { InviteStatus, MembershipStatus, MessRole } from "../../generated/prisma/enums.js";
import { prisma } from "../../config/prisma.js";
import { AppError } from "../../shared/AppError.js";
import { APP_CONSTANTS } from "../../shared/constants.js";
import { createAuditLog } from "../../shared/tenantUtils.js";

export interface CreateInviteInput {
  email: string;
}

export interface AcceptInviteInput {
  token: string;
  displayName?: string;
  phone?: string;
}

const createInvite = async (messId: string, invitedById: string, input: CreateInviteInput) => {
  const email = input.email.toLowerCase();

  const existingUser = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (existingUser) {
    const existingMembership = await prisma.membership.findUnique({
      where: {
        messId_userId: {
          messId,
          userId: existingUser.id,
        },
      },
    });

    if (existingMembership && existingMembership.status === MembershipStatus.ACTIVE) {
      throw new AppError(409, "User is already an active member of this mess");
    }
  }

  const existingPendingInvite = await prisma.messInvite.findFirst({
    where: {
      messId,
      email,
      status: InviteStatus.PENDING,
      expiresAt: { gt: new Date() },
    },
  });

  if (existingPendingInvite) {
    throw new AppError(409, "An active invitation already exists for this email");
  }

  const token = crypto.randomBytes(24).toString("hex");
  const expiresAt = new Date(Date.now() + APP_CONSTANTS.INVITE_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

  return prisma.$transaction(async (tx) => {
    const invite = await tx.messInvite.create({
      data: {
        messId,
        email,
        role: MessRole.MEMBER,
        token,
        status: InviteStatus.PENDING,
        invitedById,
        expiresAt,
      },
    });

    await createAuditLog(tx, {
      messId,
      actorUserId: invitedById,
      action: "INVITE_CREATED",
      entityType: "MessInvite",
      entityId: invite.id,
      metadata: { email },
    });

    return invite;
  });
};

const listInvites = async (messId: string) => {
  return prisma.messInvite.findMany({
    where: { messId },
    include: {
      invitedBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
};

const acceptInvite = async (
  messId: string,
  user: { id: string; name: string; email: string },
  input: AcceptInviteInput,
) => {
  const invite = await prisma.messInvite.findUnique({
    where: { token: input.token },
    include: {
      mess: {
        select: { id: true, isActive: true },
      },
    },
  });

  if (!invite || invite.messId !== messId || !invite.mess.isActive) {
    throw new AppError(404, "Invitation not found for this mess");
  }

  if (invite.status !== InviteStatus.PENDING) {
    throw new AppError(400, `Invitation is already ${invite.status.toLowerCase()}`);
  }

  if (invite.expiresAt < new Date()) {
    await prisma.messInvite.update({
      where: { id: invite.id },
      data: { status: InviteStatus.EXPIRED },
    });
    throw new AppError(400, "Invitation has expired");
  }

  if (invite.email.toLowerCase() !== user.email.toLowerCase()) {
    throw new AppError(403, "This invitation was issued to a different email address");
  }

  return prisma.$transaction(async (tx) => {
    const existingMembership = await tx.membership.findUnique({
      where: {
        messId_userId: {
          messId,
          userId: user.id,
        },
      },
    });

    if (existingMembership && existingMembership.status === MembershipStatus.ACTIVE) {
      throw new AppError(409, "You are already an active member of this mess");
    }

    const membership = existingMembership
      ? await tx.membership.update({
          where: { id: existingMembership.id },
          data: {
            status: MembershipStatus.ACTIVE,
            role: invite.role,
            displayName: input.displayName ?? existingMembership.displayName ?? user.name,
            phone: input.phone ?? existingMembership.phone,
            joinedAt: new Date(),
            leftAt: null,
          },
        })
      : await tx.membership.create({
          data: {
            messId,
            userId: user.id,
            role: invite.role,
            status: MembershipStatus.ACTIVE,
            displayName: input.displayName ?? user.name,
            phone: input.phone,
          },
        });

    const updatedInvite = await tx.messInvite.update({
      where: { id: invite.id },
      data: {
        status: InviteStatus.ACCEPTED,
        acceptedAt: new Date(),
      },
    });

    await createAuditLog(tx, {
      messId,
      actorUserId: user.id,
      action: "INVITE_ACCEPTED",
      entityType: "MessInvite",
      entityId: invite.id,
      metadata: { membershipId: membership.id },
    });

    return { invite: updatedInvite, membership };
  });
};

const revokeInvite = async (messId: string, inviteId: string, actorUserId: string) => {
  const invite = await prisma.messInvite.findFirst({
    where: {
      id: inviteId,
      messId,
    },
  });

  if (!invite) {
    throw new AppError(404, "Invitation not found in this mess");
  }

  if (invite.status !== InviteStatus.PENDING) {
    throw new AppError(400, "Only pending invitations can be revoked");
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.messInvite.update({
      where: { id: inviteId },
      data: { status: InviteStatus.REVOKED },
    });

    await createAuditLog(tx, {
      messId,
      actorUserId,
      action: "INVITE_REVOKED",
      entityType: "MessInvite",
      entityId: inviteId,
    });

    return updated;
  });
};

export const invitationService = {
  createInvite,
  listInvites,
  acceptInvite,
  revokeInvite,
};
