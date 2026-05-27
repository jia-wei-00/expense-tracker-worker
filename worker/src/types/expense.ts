import { z } from "zod";
import { TOOL_NAME } from "../constants/ai";

export interface Category {
  id: number;
  name: string;
  is_expense: boolean;
}

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

export type PendingAction =
  | { toolName: typeof TOOL_NAME.ADD_EXPENSE; args: AddExpenseArgs }
  | { toolName: typeof TOOL_NAME.DELETE_EXPENSE; args: DeleteExpenseArgs };
