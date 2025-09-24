export type ConnectionStatus = "connecting" | "open" | "closed" | "error";

export type WelcomeMessage = {
  type: "welcome";
  clientId: string;
};

export type ChatServerMessage = {
  type: "chat";
  clientId: string;
  text: string;
  messageId?: string;
  timestamp?: number;
};

export type ServerMessage = WelcomeMessage | ChatServerMessage;
