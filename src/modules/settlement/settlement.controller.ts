import type { Request, Response } from "express";
import { catchAsync } from "../../shared/catchAsync.js";
import { getDhakaMonthKey } from "../../shared/dateUtils.js";
import { sendResponse } from "../../shared/sendResponse.js";
import { settlementService } from "./settlement.service.js";

const previewSettlement = catchAsync(async (req: Request, res: Response) => {
  const monthKey = (req.query["monthKey"] as string | undefined) ?? getDhakaMonthKey();
  const result = await settlementService.previewSettlement(req.params["messId"]!, monthKey);
  sendResponse(res, 200, "Settlement preview generated successfully", result);
});

const closeMonth = catchAsync(async (req: Request, res: Response) => {
  const { monthKey } = req.body as { monthKey: string };
  const result = await settlementService.closeMonth(
    req.params["messId"]!,
    monthKey,
    req.membership!.id,
    req.user!.id,
  );
  sendResponse(res, 200, `Month ${monthKey} closed and settled successfully`, result);
});

const getSettlementByMonth = catchAsync(async (req: Request, res: Response) => {
  const result = await settlementService.getSettlementByMonth(
    req.params["messId"]!,
    req.params["monthKey"]!,
  );
  sendResponse(res, 200, "Monthly settlement fetched successfully", result);
});

const getMemberSettlement = catchAsync(async (req: Request, res: Response) => {
  const result = await settlementService.getMemberSettlement(
    req.params["messId"]!,
    req.params["monthKey"]!,
    req.params["memberId"]!,
  );
  sendResponse(res, 200, "Member settlement fetched successfully", result);
});

export const settlementController = {
  previewSettlement,
  closeMonth,
  getSettlementByMonth,
  getMemberSettlement,
};
