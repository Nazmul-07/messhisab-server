import type { Request, Response } from "express";
import { catchAsync } from "../../shared/catchAsync.js";
import { getDhakaMonthKey } from "../../shared/dateUtils.js";
import { sendResponse } from "../../shared/sendResponse.js";
import { dashboardService } from "./dashboard.service.js";

const getSummary = catchAsync(async (req: Request, res: Response) => {
  const monthKey = (req.query["monthKey"] as string | undefined) ?? getDhakaMonthKey();
  const result = await dashboardService.getSummary(
    req.params["messId"]!,
    monthKey,
    req.membership!.id,
  );
  sendResponse(res, 200, "Dashboard summary fetched successfully", result);
});

export const dashboardController = {
  getSummary,
};
