import type { Request, Response } from "express";
import { catchAsync } from "../../shared/catchAsync.js";
import { sendResponse } from "../../shared/sendResponse.js";
import {
  expenseService,
  type CreateExpenseInput,
  type UpdateExpenseInput,
} from "./expense.service.js";

const createExpense = catchAsync(async (req: Request, res: Response) => {
  const result = await expenseService.createExpense(
    req.params["messId"]!,
    req.membership!.id,
    req.user!.id,
    req.body as CreateExpenseInput,
  );
  sendResponse(res, 201, "Expense created successfully", result);
});

const listExpenses = catchAsync(async (req: Request, res: Response) => {
  const monthKey = req.query["monthKey"] as string | undefined;
  const result = await expenseService.listExpenses(req.params["messId"]!, monthKey);
  sendResponse(res, 200, "Expenses fetched successfully", result);
});

const getExpenseById = catchAsync(async (req: Request, res: Response) => {
  const result = await expenseService.getExpenseById(req.params["messId"]!, req.params["id"]!);
  sendResponse(res, 200, "Expense fetched successfully", result);
});

const updateExpense = catchAsync(async (req: Request, res: Response) => {
  const result = await expenseService.updateExpense(
    req.params["messId"]!,
    req.params["id"]!,
    req.user!.id,
    req.body as UpdateExpenseInput,
  );
  sendResponse(res, 200, "Expense updated successfully", result);
});

const deleteExpense = catchAsync(async (req: Request, res: Response) => {
  const result = await expenseService.deleteExpense(
    req.params["messId"]!,
    req.params["id"]!,
    req.user!.id,
  );
  sendResponse(res, 200, "Expense deleted successfully", result);
});

export const expenseController = {
  createExpense,
  listExpenses,
  getExpenseById,
  updateExpense,
  deleteExpense,
};
