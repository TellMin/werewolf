"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { SIGNALING_DISPLAY, SIGNALING_URL } from "@/lib/signaling/config";
import { makeId } from "@/lib/signaling/utils";
import { parseServerMessage } from "@/lib/signaling/parseServerMessage";
import { useSignalingClient } from "@/lib/signaling/useSignalingClient";
import type { ConnectionStatus, ServerMessage } from "@/lib/signaling/types";
import type { ChatMessage, MessageSender } from "./types";

interface UseChatSessionOptions {
  signalingUrl?: string | null;
  signalingDisplay?: string;
}

interface UseChatSessionResult {
  connectionStatus: ConnectionStatus;
  noticeMessage: string | null;
  errorMessage: string | null;
  clientId: string | null;
  reconnect: () => void;
  messages: ChatMessage[];
  draftMessage: string;
  setDraftMessage: Dispatch<SetStateAction<string>>;
  sendChatMessage: (value: string) => boolean;
  sendDraftMessage: () => void;
  signalingDisplay: string;
}

export const useChatSession = (
  options: UseChatSessionOptions = {}
): UseChatSessionResult => {
  const signalingUrl = options.signalingUrl ?? SIGNALING_URL;
  const signalingDisplay = options.signalingDisplay ?? SIGNALING_DISPLAY;

  const [clientId, setClientId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draftMessage, setDraftMessage] = useState("");

  const clientIdRef = useRef<string | null>(null);
  const seenMessageIdsRef = useRef<Set<string>>(new Set());

  const {
    connectionStatus,
    noticeMessage,
    setNoticeMessage,
    errorMessage,
    setErrorMessage,
    reconnect,
    send,
    connectionAttempt,
    setMessageHandler,
  } = useSignalingClient<ServerMessage>({
    url: signalingUrl,
    parseMessage: parseServerMessage,
    initialNotice: "Connecting to the signaling service...",
  });

  useEffect(() => {
    clientIdRef.current = clientId;
  }, [clientId]);

  useEffect(() => {
    seenMessageIdsRef.current = new Set();
    clientIdRef.current = null;
    setClientId(null);
  }, [connectionAttempt]);

  const handleServerMessage = useCallback(
    (message: ServerMessage) => {
      if (message.type === "welcome") {
        setClientId(message.clientId);
        clientIdRef.current = message.clientId;
        setNoticeMessage("You're ready to exchange messages through the signaling server.");
        setErrorMessage(null);
        return;
      }

      if (message.type === "chat") {
        const messageId = message.messageId ?? makeId();
        if (seenMessageIdsRef.current.has(messageId)) {
          return;
        }
        seenMessageIdsRef.current.add(messageId);

        const timestamp = message.timestamp ?? Date.now();
        const sender: MessageSender =
          message.clientId && message.clientId === clientIdRef.current ? "local" : "remote";

        setMessages((previous) => [
          ...previous,
          {
            id: messageId,
            sender,
            text: message.text,
            timestamp,
          },
        ]);
      }
    },
    [setErrorMessage, setNoticeMessage]
  );

  useEffect(() => {
    setMessageHandler(handleServerMessage);
    return () => setMessageHandler(null);
  }, [handleServerMessage, setMessageHandler]);

  const sendChatMessage = useCallback(
    (value: string) => {
      const trimmed = value.trim();
      if (!trimmed) {
        return false;
      }

      const succeeded = send({ type: "chat", text: trimmed });
      if (succeeded) {
        setErrorMessage(null);
      }

      return succeeded;
    },
    [send, setErrorMessage]
  );

  const sendDraftMessage = useCallback(() => {
    if (!sendChatMessage(draftMessage)) {
      return;
    }
    setDraftMessage("");
  }, [draftMessage, sendChatMessage]);

  return {
    connectionStatus,
    noticeMessage,
    errorMessage,
    clientId,
    reconnect,
    messages,
    draftMessage,
    setDraftMessage,
    sendChatMessage,
    sendDraftMessage,
    signalingDisplay,
  };
};
