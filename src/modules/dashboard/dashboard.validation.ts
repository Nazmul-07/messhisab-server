import { messParamSchema, monthQuerySchema } from "../../shared/validationSchemas.js";

export const dashboardSummarySchema = {
  params: messParamSchema,
  query: monthQuerySchema,
};
