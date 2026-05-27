import OpenAI from "openai";
import { TOOL_NAME } from "../constants/ai";

export const tools: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: TOOL_NAME.ADD_EXPENSE,
      description:
        "Extract and return a complete expense or income record from the user's message. Fill every required field with normalized values.",
      parameters: {
        type: "object",
        required: ["name", "amount", "category_id", "is_expense", "spend_date"],
        additionalProperties: false,
        properties: {
          name: {
            type: "string",
            description:
              'Extract a short transaction name from the user input. Use only the core label, not the full sentence. Do not include amount, currency, date, or filler words. Examples: "add coffee expense RM50" -> "coffee", "spent RM18 on grab ride" -> "grab ride", "salary came in" -> "salary". You MUST return a name this is REQUIRED!',
          },
          description: {
            type: "string",
            description:
              "Optional extra note only if the user explicitly provides useful detail.",
          },
          amount: {
            type: "number",
            description:
              "Amount in MYR as a positive number only. Example: 16.5",
          },
          category_id: {
            type: "integer",
            description:
              "Numeric category ID from the provided category list only. Must match the intended transaction type.",
          },
          is_expense: {
            type: "boolean",
            description:
              "true for expense, false for income. Must match the selected category's is_expense value.",
          },
          spend_date: {
            type: "string",
            description:
              'Transaction datetime in ISO 8601 format for the field "spend_date". Convert clearly understood user dates into ISO 8601 datetime. Examples: "2026-05-01" -> "2026-05-01T00:00:00", "2026-05-01 8pm" -> "2026-05-01T20:00:00". If the user does not provide a date, use the current datetime. If the user provides an ambiguous or unclear date format, such as "01-05-2026" where day/month order is uncertain, do not guess; ask for clarification instead.',
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: TOOL_NAME.DELETE_EXPENSE,
      description: "Propose deleting an expense record by ID.",
      parameters: {
        type: "object",
        required: ["id"],
        additionalProperties: false,
        properties: {
          id: { type: "integer", description: "The expense ID to delete" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: TOOL_NAME.LIST_EXPENSES,
      description: "List the user's expenses with optional filters.",
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          category: { type: "integer" },
          from: { type: "string", description: "Start date in ISO format" },
          to: { type: "string", description: "End date in ISO format" },
          limit: { type: "integer", default: 10 },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: TOOL_NAME.GET_CATEGORY_TOTAL,
      description:
        "Get the aggregated total amount and transaction count for a single category. Pass `from` and `to` to scope it to a date range, or omit both for an all-time total. Use this when the user asks how much they spent (or earned) in a specific category — for example 'how much did I spend on food', 'food expenses this month'.",
      parameters: {
        type: "object",
        required: ["category_id"],
        additionalProperties: false,
        properties: {
          category_id: {
            type: "integer",
            description:
              "Numeric category ID from the provided category list.",
          },
          from: {
            type: "string",
            description:
              "Optional start of range in ISO 8601 format (inclusive). Provide only if the user mentions a time period.",
          },
          to: {
            type: "string",
            description:
              "Optional end of range in ISO 8601 format (inclusive). Provide only if the user mentions a time period.",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: TOOL_NAME.GET_DATE_RANGE_TOTAL,
      description:
        "Get a summary of all expenses and income within a date range — total expense, total income, net, and a per-category breakdown. Use this when the user asks for a summary, overview, or totals over a period (e.g. 'this month', 'last week', 'in May').",
      parameters: {
        type: "object",
        required: ["from", "to"],
        additionalProperties: false,
        properties: {
          from: {
            type: "string",
            description: "Start of range in ISO 8601 format (inclusive).",
          },
          to: {
            type: "string",
            description: "End of range in ISO 8601 format (inclusive).",
          },
        },
      },
    },
  },
];
