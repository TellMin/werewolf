export type MessageSender = "local" | "remote";

export type ChatMessage = {
  id: string;
  sender: MessageSender;
  text: string;
  timestamp: number;
};
