import type { Request, Response } from "express";
import { catchAsync } from "../../shared/catchAsync.js";
import { getDhakaMonthKey } from "../../shared/dateUtils.js";
import { sendResponse } from "../../shared/sendResponse.js";
import { reportService } from "./report.service.js";

const getMonthlyReport = catchAsync(async (req: Request, res: Response) => {
  const monthKey = (req.query["monthKey"] as string | undefined) ?? getDhakaMonthKey();
  const result = await reportService.getMonthlyReport(req.params["messId"]!, monthKey);
  sendResponse(res, 200, "Monthly report generated successfully", result);
});

const getMemberReport = catchAsync(async (req: Request, res: Response) => {
  const monthKey = (req.query["monthKey"] as string | undefined) ?? getDhakaMonthKey();
  const result = await reportService.getMemberReport(
    req.params["messId"]!,
    req.params["memberId"]!,
    monthKey,
  );
  sendResponse(res, 200, "Member report generated successfully", result);
});

const getTransactionsReport = catchAsync(async (req: Request, res: Response) => {
  const monthKey = (req.query["monthKey"] as string | undefined) ?? getDhakaMonthKey();
  const result = await reportService.getTransactionsReport(req.params["messId"]!, monthKey);
  sendResponse(res, 200, "Transactions report generated successfully", result);
});

export const reportController = {
  getMonthlyReport,
  getMemberReport,
  getTransactionsReport,
};
