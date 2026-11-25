import type { Request, Response } from "express";
import type { MembershipStatus } from "../../generated/prisma/enums.js";
import { catchAsync } from "../../shared/catchAsync.js";
import { sendResponse } from "../../shared/sendResponse.js";
import { memberService, type UpdateMemberInput } from "./member.service.js";

const listMembers = catchAsync(async (req: Request, res: Response) => {
  const status = req.query["status"] as MembershipStatus | undefined;
  const result = await memberService.listMembers(req.params["messId"]!, status);
  sendResponse(res, 200, "Members fetched successfully", result);
});

const getMemberById = catchAsync(async (req: Request, res: Response) => {
  const result = await memberService.getMemberById(
    req.params["messId"]!,
    req.params["memberId"]!,
  );
  sendResponse(res, 200, "Member fetched successfully", result);
});

const updateMember = catchAsync(async (req: Request, res: Response) => {
  const result = await memberService.updateMember(
    req.params["messId"]!,
    req.params["memberId"]!,
    req.user!.id,
    req.body as UpdateMemberInput,
  );
  sendResponse(res, 200, "Member updated successfully", result);
});

const removeMember = catchAsync(async (req: Request, res: Response) => {
  const result = await memberService.removeMember(
    req.params["messId"]!,
    req.params["memberId"]!,
    req.user!.id,
  );
  sendResponse(res, 200, "Member removed successfully", result);
});

export const memberController = {
  listMembers,
  getMemberById,
  updateMember,
  removeMember,
};
