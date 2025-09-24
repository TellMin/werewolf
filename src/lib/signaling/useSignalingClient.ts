"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { ConnectionStatus } from "./types";

interface UseSignalingClientOptions<TMessage> {
  url: string | null | undefined;
  parseMessage?: (value: unknown) => TMessage | null;
  initialNotice?: string | null;
}

interface UseSignalingClientResult<TMessage> {
  connectionStatus: ConnectionStatus;
  noticeMessage: string | null;
  setNoticeMessage: Dispatch<SetStateAction<string | null>>;
  errorMessage: string | null;
  setErrorMessage: Dispatch<SetStateAction<string | null>>;
  reconnect: () => void;
  send: (payload: unknown) => boolean;
  connectionAttempt: number;
  setMessageHandler: (handler: ((message: TMessage) => void) | null) => void;
}

export const useSignalingClient = <TMessage,>(
  options: UseSignalingClientOptions<TMessage>
): UseSignalingClientResult<TMessage> => {
  const { url, parseMessage, initialNotice = "Connecting to the signaling service..." } = options;

  const socketRef = useRef<WebSocket | null>(null);
  const messageHandlerRef = useRef<((message: TMessage) => void) | null>(null);
  const parserRef = useRef<typeof parseMessage>(parseMessage);

  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("connecting");
  const [noticeMessage, setNoticeMessage] = useState<string | null>(initialNotice);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [connectionAttempt, setConnectionAttempt] = useState(0);

  useEffect(() => {
    parserRef.current = parseMessage;
  }, [parseMessage]);

  const setMessageHandler = useCallback((handler: ((message: TMessage) => void) | null) => {
    messageHandlerRef.current = handler;
  }, []);

  useEffect(() => {
    if (!url) {
      setConnectionStatus("error");
      setErrorMessage("Signaling URL is not configured.");
      return undefined;
    }

    setConnectionStatus("connecting");
    setNoticeMessage(initialNotice);
    setErrorMessage(null);

    const socket = new WebSocket(url);
    socketRef.current = socket;

    const handleOpen = () => {
      if (socketRef.current !== socket) {
        return;
      }
      setConnectionStatus("open");
      setNoticeMessage("Connected to the signaling service.");
    };

    const handleMessage = (event: MessageEvent) => {
      if (socketRef.current !== socket) {
        return;
      }

      let jsonPayload: unknown;

      try {
        const serialized =
          typeof event.data === "string" ? event.data : String(event.data);
        jsonPayload = JSON.parse(serialized);
      } catch (error) {
        console.warn("Discarding malformed signaling payload", error);
        return;
      }

      const parser = parserRef.current;
      let message: TMessage | null;

      try {
        message = parser ? parser(jsonPayload) : (jsonPayload as TMessage);
      } catch (error) {
        console.warn("Signaling parser threw, discarding payload", error);
        return;
      }

      if (!message) {
        return;
      }

      const handler = messageHandlerRef.current;
      if (!handler) {
        return;
      }

      try {
        handler(message);
      } catch (error) {
        console.error("Unhandled error in signaling message handler", error);
      }
    };

    const handleError = (event: Event) => {
      if (socketRef.current !== socket) {
        return;
      }
      console.error("Signaling socket error", event);
      setConnectionStatus("error");
      setErrorMessage("The signaling connection encountered an error. Try reconnecting.");
    };

    const handleClose = (event: CloseEvent) => {
      if (socketRef.current !== socket) {
        return;
      }
      const reason =
        event.code === 1000 ? "Connection closed gracefully." : "Connection closed unexpectedly.";
      setConnectionStatus("closed");
      setNoticeMessage(reason);
    };

    socket.addEventListener("open", handleOpen);
    socket.addEventListener("message", handleMessage);
    socket.addEventListener("error", handleError);
    socket.addEventListener("close", handleClose);

    return () => {
      if (socketRef.current === socket) {
        socketRef.current = null;
      }
      socket.removeEventListener("open", handleOpen);
      socket.removeEventListener("message", handleMessage);
      socket.removeEventListener("error", handleError);
      socket.removeEventListener("close", handleClose);
      socket.close();
    };
  }, [initialNotice, url, connectionAttempt]);

  const send = useCallback(
    (payload: unknown) => {
      const socket = socketRef.current;
      if (!socket || socket.readyState !== WebSocket.OPEN) {
        setErrorMessage("Cannot send: signaling connection is not open.");
        return false;
      }

      try {
        const serialized = typeof payload === "string" ? payload : JSON.stringify(payload);
        socket.send(serialized);
        return true;
      } catch (error) {
        console.error("Failed to send signaling payload", error);
        setErrorMessage("Failed to send message. Try again.");
        return false;
      }
    },
    []
  );

  const reconnect = useCallback(() => {
    const socket = socketRef.current;
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.close();
    }
    setConnectionAttempt((value) => value + 1);
  }, []);

  return {
    connectionStatus,
    noticeMessage,
    setNoticeMessage,
    errorMessage,
    setErrorMessage,
    reconnect,
    send,
    connectionAttempt,
    setMessageHandler,
  };
};
