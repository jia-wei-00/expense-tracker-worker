export const AI_MODEL = "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free";
export const GEMINI_MODEL = "gemini-3.1-flash-lite";
export const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";
export const GEMINI_BASE_URL =
  "https://generativelanguage.googleapis.com/v1beta/openai/";

export const AI_PROVIDER = {
  OPENROUTER: "openrouter",
  GEMINI: "gemini",
} as const;

export const TOOL_NAME = {
  ADD_EXPENSE: "addExpense",
  DELETE_EXPENSE: "deleteExpense",
  LIST_EXPENSES: "listExpenses",
  GET_CATEGORY_TOTAL: "getCategoryTotal",
  GET_DATE_RANGE_TOTAL: "getDateRangeTotal",
} as const;

export const WRITE_TOOLS = [
  TOOL_NAME.ADD_EXPENSE,
  TOOL_NAME.DELETE_EXPENSE,
] as const;
