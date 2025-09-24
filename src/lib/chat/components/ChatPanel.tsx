"use client";

import type { ChatMessage } from "@/lib/chat/types";

interface ChatPanelProps {
  messages: ChatMessage[];
  draftMessage: string;
  onDraftChange: (value: string) => void;
  onSubmit: () => void;
}

export const ChatPanel = ({ messages, draftMessage, onDraftChange, onSubmit }: ChatPanelProps) => {
  return (
    <section className="grid gap-4 rounded-lg border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
      <div className="grid gap-3">
        <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">Chat</h2>
        <div className="grid max-h-72 gap-2 overflow-y-auto rounded-md border border-zinc-200 bg-zinc-50 p-3 text-sm dark:border-zinc-700 dark:bg-zinc-950">
          {messages.length === 0 ? (
            <p className="text-zinc-500 dark:text-zinc-400">
              No messages yet. Connect a second browser session to the signaling service to start
              chatting.
            </p>
          ) : (
            messages.map((message) => (
              <div key={message.id} className="flex flex-col gap-0.5">
                <span className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                  {message.sender === "local" ? "You" : "Peer"} ·{" "}
                  {new Date(message.timestamp).toLocaleTimeString()}
                </span>
                <p className="rounded-md bg-white px-3 py-2 text-zinc-800 shadow-sm dark:bg-zinc-900 dark:text-zinc-100">
                  {message.text}
                </p>
              </div>
            ))
          )}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            value={draftMessage}
            onChange={(event) => onDraftChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                onSubmit();
              }
            }}
            className="flex-1 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-800 shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
            placeholder="Type a message and press Enter"
          />
          <button
            type="button"
            onClick={onSubmit}
            className="inline-flex items-center justify-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          >
            Send
          </button>
        </div>
      </div>
    </section>
  );
};
