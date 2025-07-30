"use client";
import React from "react";
import { IMessage, useChats } from "@/context/ChatContext";
import { useAuth } from "@/context/AuthContext";

const cn = (...classes: (string | undefined | null | false)[]): string => {
  return classes.filter(Boolean).join(" ");
};

type MessageBubbleProps = {
  message: IMessage;
  children?: React.ReactNode;
};

const MessageBubble: React.FC<MessageBubbleProps> = ({ message, children }) => {
  const { user } = useAuth();
  const { selectedChat } = useChats();
  const isSentByMe = message.sender === (user?._id as string);

  return (
    <div
      className={cn(
        "flex items-end gap-2",
        isSentByMe ? "justify-end" : "justify-start"
      )}
    >
      {!isSentByMe && (
        <div className="w-8 h-8 bg-gray-300 rounded-full flex-shrink-0"></div>
      )}
      <div
        className={cn(
          "p-3 rounded-lg max-w-md",
          isSentByMe
            ? "bg-rose-500 text-white rounded-br-none"
            : "bg-gray-100 text-gray-800 rounded-bl-none"
        )}
      >
        <p className={cn("font-bold", isSentByMe ? "text-right" : "text-left")}>
          {
            selectedChat?.participants.find((p) => p._id === message.sender)
              ?.username
          }
        </p>
        <div className="flex-grow text-white-space-pre-wrap break-words">
          {children}
        </div>
        <span
          className={cn(
            "text-xs block mt-1",
            isSentByMe ? "text-rose-200 text-right" : "text-gray-400 text-left"
          )}
        >
          {new Date(message.timestamp).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      </div>
    </div>
  );
};

export { MessageBubble };
