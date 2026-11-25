import type { Request, Response } from "express";
import { catchAsync } from "../../shared/catchAsync.js";
import { sendResponse } from "../../shared/sendResponse.js";
import { messService, type CreateMessInput, type UpdateMessInput } from "./mess.service.js";

const createMess = catchAsync(async (req: Request, res: Response) => {
  const result = await messService.createMess(
    req.user!.id,
    req.user!.name,
    req.body as CreateMessInput,
  );
  sendResponse(res, 201, "Mess created successfully", result);
});

const listUserMesses = catchAsync(async (req: Request, res: Response) => {
  const result = await messService.listUserMesses(req.user!.id);
  sendResponse(res, 200, "Messes fetched successfully", result);
});

const getMessById = catchAsync(async (req: Request, res: Response) => {
  const result = await messService.getMessById(req.params["messId"]!);
  sendResponse(res, 200, "Mess fetched successfully", result);
});

const updateMess = catchAsync(async (req: Request, res: Response) => {
  const result = await messService.updateMess(
    req.params["messId"]!,
    req.user!.id,
    req.body as UpdateMessInput,
  );
  sendResponse(res, 200, "Mess updated successfully", result);
});

export const messController = {
  createMess,
  listUserMesses,
  getMessById,
  updateMess,
};
