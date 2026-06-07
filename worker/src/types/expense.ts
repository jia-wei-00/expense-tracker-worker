import { z } from "zod";
import { TOOL_NAME } from "@/constants/ai";

export const categorySchema = z.object({
  id: z.number(),
  name: z.string(),
  is_expense: z.boolean(),
});

export type Category = z.infer<typeof categorySchema>;

export const categoryListSchema = z.array(categorySchema);

export const addExpenseArgsSchema = z.object({
  name: z.string().default(""),
  amount: z.number().default(0),
  category: z.number().default(0),
  is_expense: z.boolean().default(true),
  spend_date: z.string().default(() => new Date().toISOString()),
});

export type AddExpenseArgs = z.infer<typeof addExpenseArgsSchema>;

export const deleteExpenseArgsSchema = z.object({
  id: z.number(),
  name: z.string().optional(),
});

export type DeleteExpenseArgs = z.infer<typeof deleteExpenseArgsSchema>;

export const pendingActionSchema = z.discriminatedUnion("toolName", [
  z.object({
    toolName: z.literal(TOOL_NAME.ADD_EXPENSE),
    args: addExpenseArgsSchema,
  }),
  z.object({
    toolName: z.literal(TOOL_NAME.DELETE_EXPENSE),
    args: deleteExpenseArgsSchema,
  }),
]);

export type PendingAction = z.infer<typeof pendingActionSchema>;

export const pendingActionListSchema = z.array(pendingActionSchema);
