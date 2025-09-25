export type ConnectionStatus = "connecting" | "open" | "closed" | "error";

export type WelcomeMessage = {
  type: "welcome";
  clientId: string;
};

export type RoomParticipantSummary = {
  clientId: string;
  displayName: string | null;
  role: "host" | "guest";
};

export type RoomStateServerMessage = {
  type: "room-state";
  participants: RoomParticipantSummary[];
};

export type UserJoinedServerMessage = {
  type: "user-joined";
  participant: RoomParticipantSummary;
};

export type UserLeftServerMessage = {
  type: "user-left";
  clientId: string;
};

export type SignalRelayServerMessage = {
  type: "signal";
  from: string;
  payload: unknown;
};

export type ChatServerMessage = {
  type: "chat";
  clientId: string;
  text: string;
  messageId?: string;
  timestamp?: number;
};

export type ServerMessage =
  | WelcomeMessage
  | RoomStateServerMessage
  | UserJoinedServerMessage
  | UserLeftServerMessage
  | SignalRelayServerMessage
  | ChatServerMessage;
