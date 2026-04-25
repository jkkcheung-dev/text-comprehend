export type SupportedCommand = "comprehend" | "comprehend-summary" | "comprehend-chat";

export interface CreateCommandPromptOptions {
  command: SupportedCommand;
  argumentsText?: string;
}
