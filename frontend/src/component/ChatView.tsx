"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Settings,
  Search,
  Paperclip,
  Send,
  MessageCircle,
  Menu,
} from "lucide-react";
import { Message, MessageBubble } from "./MessageBubble";
import { Input } from "./Input";
import { useAuth } from "@/context/AuthContext";

// Helper function to conditionally combine CSS classes.
const cn = (...classes: (string | undefined | null | false)[]): string => {
  return classes.filter(Boolean).join(" ");
};

const EmptyChatView: React.FC<{ onMenuClick?: () => void }> = ({
  onMenuClick,
}) => {
  const { user, isLoading } = useAuth();

  return (
    <div className="flex flex-col h-full">
      <header className="flex items-center p-4 border-b border-gray-200 flex-shrink-0 sm:hidden">
        <button
          onClick={onMenuClick}
          className="mr-2 p-2 rounded-full sm:hidden text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
        >
          <Menu size={24} />
        </button>
        <h2 className="font-bold text-lg">SecRetto</h2>
      </header>
      <div className="flex-grow flex flex-col items-center justify-center text-center p-8">
        <MessageCircle size={64} className="text-gray-400 mb-4" />
        {isLoading ? (
          <div className="h-4 bg-gray-200 rounded w-24 animate-pulse"></div>
        ) : (
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            Hi, {user?.username}!
          </h2>
        )}
        <p className="text-gray-500 max-w-xs">
          To view a chat, click one on the menu bar! To start a new one, click +
          button!
        </p>
      </div>
    </div>
  );
};

export const ChatView: React.FC<{ onMenuClick?: () => void }> = ({
  onMenuClick,
}) => {
  // const [messages, setMessages] = useState<Message[]>([
  //   { id: 1, text: "Hey, how are you?", time: "10:00 AM", sender: "other" },
  //   {
  //     id: 2,
  //     text: "I'm good, thanks! Just working on this cool new app. How about you?",
  //     time: "10:01 AM",
  //     sender: "me",
  //   },
  //   {
  //     id: 3,
  //     text: "Sounds exciting! Tell me more.",
  //     time: "10:02 AM",
  //     sender: "other",
  //   },
  // ]);
  const [messages, setMessages] = useState<Message[]>([]);

  const [newMessage, setNewMessage] = useState("");

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim() === "") return; // Don't send empty messages

    const message: Message = {
      id: messages.length + 1,
      text: newMessage,
      time: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      sender: "me",
    };

    setMessages([...messages, message]);
    setNewMessage("");
  };

  // If there are no messages in the state, show the EmptyChatView component.
  // In a real app, you would check if a chat is selected, not just if messages exist.
  if (messages.length === 0) {
    return <EmptyChatView />;
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <header className="relative z-20 flex items-center p-4 border-b border-gray-200 flex-shrink-0 bg-white">
        {/* Mobile Menu Button */}
        <button
          onClick={onMenuClick}
          className="mr-2 p-2 rounded-full sm:hidden text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
        >
          <Menu size={24} />
        </button>
        <div className="w-10 h-10 bg-gray-300 rounded-full mr-4"></div>
        <div>
          <h2 className="font-bold text-lg">Secret 1</h2>
          <p className="text-sm text-green-500">Active now</p>
        </div>
        <div className="ml-auto flex items-center space-x-4">
          <button className="text-gray-500 hover:text-gray-800">
            <Search size={20} />
          </button>
          <button className="text-gray-500 hover:text-gray-800">
            <Settings size={20} />
          </button>
        </div>
      </header>

      {/* Messages Area */}
      <div className="flex-grow p-6 overflow-y-auto space-y-6">
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <footer className="p-4 border-t border-gray-200 flex-shrink-0">
        <form onSubmit={handleSendMessage} className="relative">
          <Input
            placeholder="Type a message..."
            className="pr-24 !py-2"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
            <button type="button" className="text-gray-500 hover:text-gray-800">
              <Paperclip size={22} />
            </button>
            <button
              type="submit"
              className="bg-rose-500 text-white p-2 rounded-full hover:bg-rose-600"
            >
              <Send size={18} />
            </button>
          </div>
        </form>
      </footer>
    </div>
  );
};
