import { z } from "zod";
import { MealType } from "../../generated/prisma/enums.js";
import { APP_CONSTANTS } from "../../shared/constants.js";
import {
  dateInputSchema,
  messAndIdParamSchema,
  messParamSchema,
  monthKeySchema,
  objectIdSchema,
} from "../../shared/validationSchemas.js";

const mealHalfUnitsSchema = z
  .number()
  .int("mealHalfUnits must be an integer")
  .min(0, "mealHalfUnits cannot be negative")
  .max(
    APP_CONSTANTS.MAX_MEAL_HALF_UNITS_PER_ENTRY,
    `mealHalfUnits cannot exceed ${APP_CONSTANTS.MAX_MEAL_HALF_UNITS_PER_ENTRY}`,
  );

export const createMealSchema = {
  params: messParamSchema,
  body: z.object({
    membershipId: objectIdSchema,
    date: dateInputSchema,
    mealType: z.nativeEnum(MealType),
    mealHalfUnits: mealHalfUnitsSchema,
    note: z.string().trim().max(255).nullable().optional(),
  }),
};

export const bulkCreateMealSchema = {
  params: messParamSchema,
  body: z.object({
    date: dateInputSchema,
    entries: z
      .array(
        z.object({
          membershipId: objectIdSchema,
          mealType: z.nativeEnum(MealType),
          mealHalfUnits: mealHalfUnitsSchema,
          note: z.string().trim().max(255).nullable().optional(),
        }),
      )
      .min(1, "At least one meal entry is required"),
  }),
};

export const listMealSchema = {
  params: messParamSchema,
  query: z.object({
    monthKey: monthKeySchema.optional(),
    date: dateInputSchema.optional(),
    membershipId: objectIdSchema.optional(),
  }),
};

export const mealByIdSchema = {
  params: messAndIdParamSchema,
};

export const updateMealSchema = {
  params: messAndIdParamSchema,
  body: z
    .object({
      mealHalfUnits: mealHalfUnitsSchema.optional(),
      note: z.string().trim().max(255).nullable().optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: "At least one field must be provided for update",
    }),
};
