export const AI_MODEL = "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free";
export const GEMINI_MODEL = "gemini-3.1-flash-lite";
export const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";
export const GEMINI_BASE_URL =
  "https://generativelanguage.googleapis.com/v1beta/openai/";

export const MAX_LLM_STEPS = 3;
export const DEFAULT_EXPENSE_LIMIT = 10;
export const PENDING_ACTION_TTL_MS = 5 * 60 * 1000; // 5 minutes
export const PENDING_CONFIRMATION_REPLY = "pending_confirmation";

export const TOOL_NAME = {
  ADD_EXPENSE: "addExpense",
  DELETE_EXPENSE: "deleteExpense",
  LIST_EXPENSES: "listExpenses",
} as const;

export const BUTTON_PREFIX = {
  CONFIRM: "confirm_",
  CANCEL: "cancel_",
} as const;

export const DB_TABLE = {
  EXPENSE: "expense",
  EXPENSE_CATEGORY: "expense_category",
  WHATSAPP_USERS: "whatsapp_users",
  WHATSAPP_PENDING_ACTIONS: "whatsapp_pending_actions",
} as const;

export const WRITE_TOOLS = [
  TOOL_NAME.ADD_EXPENSE,
  TOOL_NAME.DELETE_EXPENSE,
] as const;
