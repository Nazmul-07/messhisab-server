import type {
  ActiveMembershipContext,
  AuthenticatedSession,
  AuthenticatedUser,
} from "./common.js";

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
      session?: AuthenticatedSession;
      membership?: ActiveMembershipContext;
    }
  }
}

export {};
