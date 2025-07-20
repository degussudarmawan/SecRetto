"use client";
import React from "react";
import { Input } from "./Input";
import { Button } from "./Button";

const cn = (...classes: (string | undefined | null | false)[]): string => {
  return classes.filter(Boolean).join(" ");
};

export type Message = {
  id: number;
  text: string;
  time: string;
  sender: "me" | "other";
};

type MessageBubbleProps = {
  message: Message;
};

const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const isSentByMe = message.sender === "me";

  return (
    <div
      className={cn(
        "flex items-end gap-2",
        isSentByMe ? "justify-end" : "justify-start"
      )}
    >
      {/* Avatar for received messages */}
      {!isSentByMe && (
        <div className="w-8 h-8 bg-gray-300 rounded-full flex-shrink-0"></div>
      )}

      {/* Message bubble */}
      <div
        className={cn(
          "p-3 rounded-lg max-w-md",
          isSentByMe
            ? "bg-rose-500 text-white rounded-br-none"
            : "bg-gray-100 text-gray-800 rounded-bl-none"
        )}
      >
        <p>{message.text}</p>
        <span
          className={cn(
            "text-xs block text-right mt-1",
            isSentByMe ? "text-rose-200" : "text-gray-400"
          )}
        >
          {message.time}
        </span>
      </div>
    </div>
  );
};

export { MessageBubble}
