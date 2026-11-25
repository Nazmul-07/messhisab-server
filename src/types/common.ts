import type { MessRole, MembershipStatus } from "../generated/prisma/enums.js";

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image?: string | null;
}

export interface AuthenticatedSession {
  id: string;
  userId: string;
  token: string;
  expiresAt: Date;
}

export interface ActiveMembershipContext {
  id: string;
  messId: string;
  userId: string;
  role: MessRole;
  status: MembershipStatus;
  displayName?: string | null;
}
