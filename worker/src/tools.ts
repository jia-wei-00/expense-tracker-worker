import OpenAI from "openai";
import { TOOL_NAME } from "./constants";

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
];

export const promptMessage = ({
  categoryText,
  email,
  history,
}: {
  categoryText: string;
  email: string;
  history: OpenAI.Chat.Completions.ChatCompletionMessageParam[];
}): OpenAI.Chat.Completions.ChatCompletionMessageParam[] => {
  return [
    {
      role: "system",
      content: `You are a friendly expense tracking assistant for ${email}.
Today is ${new Date().toLocaleDateString("en-MY", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}.
Currency is MYR (Malaysian Ringgit).
The user's available categories:
${categoryText}

Rules:
- Always use the category ID (number) when calling tools, not the name.
- Match the user's description to the closest category.
- If unsure which category fits, ask for clarification.
- For ADD or DELETE actions, call the tool immediately — do NOT write a reply message. The app will show a confirmation UI to the user.
- For READ actions (list, summary), just answer directly.
- Keep replies short and friendly.
- If user ask for something not related to the expenses as what can you assist for your expenses.`,
    },
    ...history,
  ];
};
