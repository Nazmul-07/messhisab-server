import type { Request, Response } from "express";
import { catchAsync } from "../../shared/catchAsync.js";
import { sendResponse } from "../../shared/sendResponse.js";
import {
  depositService,
  type CreateDepositInput,
  type UpdateDepositInput,
} from "./deposit.service.js";

const createDeposit = catchAsync(async (req: Request, res: Response) => {
  const result = await depositService.createDeposit(
    req.params["messId"]!,
    req.membership!.id,
    req.user!.id,
    req.body as CreateDepositInput,
  );
  sendResponse(res, 201, "Deposit created successfully", result);
});

const listDeposits = catchAsync(async (req: Request, res: Response) => {
  const result = await depositService.listDeposits(req.params["messId"]!, {
    monthKey: req.query["monthKey"] as string | undefined,
    membershipId: req.query["membershipId"] as string | undefined,
  });
  sendResponse(res, 200, "Deposits fetched successfully", result);
});

const updateDeposit = catchAsync(async (req: Request, res: Response) => {
  const result = await depositService.updateDeposit(
    req.params["messId"]!,
    req.params["id"]!,
    req.user!.id,
    req.body as UpdateDepositInput,
  );
  sendResponse(res, 200, "Deposit updated successfully", result);
});

const deleteDeposit = catchAsync(async (req: Request, res: Response) => {
  const result = await depositService.deleteDeposit(
    req.params["messId"]!,
    req.params["id"]!,
    req.user!.id,
  );
  sendResponse(res, 200, "Deposit deleted successfully", result);
});

export const depositController = {
  createDeposit,
  listDeposits,
  updateDeposit,
  deleteDeposit,
};
