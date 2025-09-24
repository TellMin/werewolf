"use client";

import { useCallback } from "react";
import { ChatPanel } from "@/lib/chat/components/ChatPanel";
import { ConnectionSummaryCard } from "@/lib/chat/components/ConnectionSummaryCard";
import { useChatSession } from "@/lib/chat/useChatSession";

export const WerewolfChatPrototype = () => {
  const {
    connectionStatus,
    noticeMessage,
    errorMessage,
    clientId,
    reconnect,
    messages,
    draftMessage,
    setDraftMessage,
    sendDraftMessage,
    signalingDisplay,
  } = useChatSession();

  const handleDraftChange = useCallback(
    (value: string) => {
      setDraftMessage(value);
    },
    [setDraftMessage]
  );

  return (
    <div className="mx-auto flex min-h-screen max-w-4xl flex-col gap-8 px-4 py-10 sm:px-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold text-zinc-900 dark:text-zinc-50">
          Werewolf Signaling Chat Proof-of-Concept
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-300">
          Messages now travel through the dedicated signaling service hosted on Render. Use this
          page to verify connectivity before layering on the full Werewolf game flow.
        </p>
      </header>

      <ConnectionSummaryCard
        connectionStatus={connectionStatus}
        clientId={clientId}
        endpoint={signalingDisplay}
        onReconnect={reconnect}
        errorMessage={errorMessage}
        noticeMessage={noticeMessage}
      />

      <ChatPanel
        messages={messages}
        draftMessage={draftMessage}
        onDraftChange={handleDraftChange}
        onSubmit={sendDraftMessage}
      />

      <footer className="border-t border-dashed border-zinc-200 pt-4 text-xs text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
        <p>
          This proof-of-concept relays chat messages through the Werewolf signaling service. Expand
          the protocol to negotiate WebRTC sessions once the signaling contracts stabilize.
        </p>
      </footer>
    </div>
  );
};

export default WerewolfChatPrototype;
