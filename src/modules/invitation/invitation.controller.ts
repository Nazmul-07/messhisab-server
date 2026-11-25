import type { Request, Response } from "express";
import { catchAsync } from "../../shared/catchAsync.js";
import { sendResponse } from "../../shared/sendResponse.js";
import {
  invitationService,
  type AcceptInviteInput,
  type CreateInviteInput,
} from "./invitation.service.js";

const createInvite = catchAsync(async (req: Request, res: Response) => {
  const result = await invitationService.createInvite(
    req.params["messId"]!,
    req.user!.id,
    req.body as CreateInviteInput,
  );
  sendResponse(res, 201, "Invitation created successfully", result);
});

const listInvites = catchAsync(async (req: Request, res: Response) => {
  const result = await invitationService.listInvites(req.params["messId"]!);
  sendResponse(res, 200, "Invitations fetched successfully", result);
});

const acceptInvite = catchAsync(async (req: Request, res: Response) => {
  const result = await invitationService.acceptInvite(
    req.params["messId"]!,
    req.user!,
    req.body as AcceptInviteInput,
  );
  sendResponse(res, 200, "Invitation accepted successfully", result);
});

const revokeInvite = catchAsync(async (req: Request, res: Response) => {
  const result = await invitationService.revokeInvite(
    req.params["messId"]!,
    req.params["inviteId"]!,
    req.user!.id,
  );
  sendResponse(res, 200, "Invitation revoked successfully", result);
});

export const invitationController = {
  createInvite,
  listInvites,
  acceptInvite,
  revokeInvite,
};
