import type { Request, Response } from "express";
import { catchAsync } from "../../shared/catchAsync.js";
import { sendResponse } from "../../shared/sendResponse.js";
import {
  bazarService,
  type CreateBazarInput,
  type UpdateBazarInput,
} from "./bazar.service.js";

const createBazar = catchAsync(async (req: Request, res: Response) => {
  const result = await bazarService.createBazar(
    req.params["messId"]!,
    req.membership!.id,
    req.user!.id,
    req.body as CreateBazarInput,
  );
  sendResponse(res, 201, "Bazar entry created successfully", result);
});

const listBazar = catchAsync(async (req: Request, res: Response) => {
  const monthKey = req.query["monthKey"] as string | undefined;
  const result = await bazarService.listBazar(req.params["messId"]!, monthKey);
  sendResponse(res, 200, "Bazar entries fetched successfully", result);
});

const getBazarById = catchAsync(async (req: Request, res: Response) => {
  const result = await bazarService.getBazarById(req.params["messId"]!, req.params["id"]!);
  sendResponse(res, 200, "Bazar entry fetched successfully", result);
});

const updateBazar = catchAsync(async (req: Request, res: Response) => {
  const result = await bazarService.updateBazar(
    req.params["messId"]!,
    req.params["id"]!,
    req.user!.id,
    req.body as UpdateBazarInput,
  );
  sendResponse(res, 200, "Bazar entry updated successfully", result);
});

const deleteBazar = catchAsync(async (req: Request, res: Response) => {
  const result = await bazarService.deleteBazar(
    req.params["messId"]!,
    req.params["id"]!,
    req.user!.id,
  );
  sendResponse(res, 200, "Bazar entry deleted successfully", result);
});

export const bazarController = {
  createBazar,
  listBazar,
  getBazarById,
  updateBazar,
  deleteBazar,
};
