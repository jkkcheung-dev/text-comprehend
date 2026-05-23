export type SupportedCommand = "comprehend" | "comprehend-summary" | "comprehend-chat" | "comprehend-explore";

export interface CreateCommandPromptOptions {
  command: SupportedCommand;
  argumentsText?: string;
}
