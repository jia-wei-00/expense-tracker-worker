import OpenAI from "openai";

export interface IAgentPropmt {
  email: string;
  categoryText: string;
  history: OpenAI.Chat.Completions.ChatCompletionMessageParam[];
}
