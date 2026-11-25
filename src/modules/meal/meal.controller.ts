import type { Request, Response } from "express";
import { catchAsync } from "../../shared/catchAsync.js";
import { sendResponse } from "../../shared/sendResponse.js";
import {
  mealService,
  type BulkCreateMealInput,
  type CreateMealInput,
  type UpdateMealInput,
} from "./meal.service.js";

const createMeal = catchAsync(async (req: Request, res: Response) => {
  const result = await mealService.createMeal(
    req.params["messId"]!,
    req.membership!.id,
    req.user!.id,
    req.body as CreateMealInput,
  );
  sendResponse(res, 201, "Meal record created successfully", result);
});

const bulkCreateMeals = catchAsync(async (req: Request, res: Response) => {
  const result = await mealService.bulkCreateMeals(
    req.params["messId"]!,
    req.membership!.id,
    req.user!.id,
    req.body as BulkCreateMealInput,
  );
  sendResponse(res, 201, "Meal records created successfully", result);
});

const listMeals = catchAsync(async (req: Request, res: Response) => {
  const result = await mealService.listMeals(req.params["messId"]!, {
    monthKey: req.query["monthKey"] as string | undefined,
    date: req.query["date"] as string | undefined,
    membershipId: req.query["membershipId"] as string | undefined,
  });
  sendResponse(res, 200, "Meal records fetched successfully", result);
});

const getMealById = catchAsync(async (req: Request, res: Response) => {
  const result = await mealService.getMealById(req.params["messId"]!, req.params["id"]!);
  sendResponse(res, 200, "Meal record fetched successfully", result);
});

const updateMeal = catchAsync(async (req: Request, res: Response) => {
  const result = await mealService.updateMeal(
    req.params["messId"]!,
    req.params["id"]!,
    req.user!.id,
    req.body as UpdateMealInput,
  );
  sendResponse(res, 200, "Meal record updated successfully", result);
});

const deleteMeal = catchAsync(async (req: Request, res: Response) => {
  const result = await mealService.deleteMeal(
    req.params["messId"]!,
    req.params["id"]!,
    req.user!.id,
  );
  sendResponse(res, 200, "Meal record deleted successfully", result);
});

export const mealController = {
  createMeal,
  bulkCreateMeals,
  listMeals,
  getMealById,
  updateMeal,
  deleteMeal,
};
