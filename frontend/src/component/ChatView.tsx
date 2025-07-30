"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Settings,
  Search,
  Paperclip,
  Send,
  MessageCircle,
  Menu,
} from "lucide-react";
import { MessageBubble } from "./MessageBubble";
import { Input } from "./Input";
import { useAuth } from "@/context/AuthContext";
import { IMessage, useChats } from "@/context/ChatContext";
import { useSocket } from "@/context/SocketContext";
import _sodium from "libsodium-wrappers-sumo";
import { useKeys } from "@/context/KeyContext";
import { MessageContent } from "./MessageContent";

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
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { selectedChat, addMessageToChat } = useChats();
  const { user } = useAuth();
  const { socket } = useSocket();
  const { privateKey } = useKeys();
  const [decryptedContent, setDecryptedContent] = useState<Map<string, string>>(
    new Map()
  );
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [newMessage]);

  const [participantKeys, setParticipantKeys] = useState<{
    [userId: string]: string;
  }>({});

  const otherParticipant = selectedChat?.participants.find(
    (p) => p._id !== user?._id
  );

  useEffect(() => {
    const fetchAllKeys = async () => {
      const keyPromises = (selectedChat?.participants || []).map(
        async (p: { _id: any }) => {
          try {
            const response = await fetch(
              `${process.env.NEXT_PUBLIC_API_URL}/api/users/${p._id}/key`,
              {
                credentials: "include",
              }
            );
            const data = await response.json();
            if (response.ok) {
              return { userId: p._id, publicKey: data.publicKey };
            }
          } catch (error) {
            console.error(`Failed to fetch public key for ${p._id}:`, error);
          }
          return null;
        }
      );

      const results = await Promise.all(keyPromises);
      const newKeys: { [userId: string]: string } = {};
      results.forEach((result) => {
        if (result) {
          newKeys[result.userId] = result.publicKey;
        }
      });
      setParticipantKeys(newKeys);
      console.log("Fetched all public keys for the chat.");
    };
    fetchAllKeys();
  }, [selectedChat?.participants]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [selectedChat?.messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const otherParticipantKey = otherParticipant
      ? participantKeys[otherParticipant._id]
      : null;
    if (
      newMessage.trim() === "" ||
      !socket ||
      !user ||
      !privateKey ||
      !otherParticipantKey
    )
      return;

    try {
      await _sodium.ready;
      const sodium = _sodium;
      const nonce = sodium.randombytes_buf(
        sodium.crypto_box_NONCEBYTES,
        "base64"
      );
      const encryptedMessage = sodium.crypto_box_easy(
        newMessage,
        sodium.from_base64(nonce),
        sodium.from_base64(otherParticipantKey),
        sodium.from_base64(privateKey),
        "base64"
      );

      const messageData = {
        chatId: selectedChat?._id,
        senderId: user._id,
        content: encryptedMessage,
        nonce: nonce,
      };
      socket.emit("send_message", messageData);

      const optimisticMessage: IMessage = {
        _id: new Date().toISOString(),
        sender: user._id,
        content: newMessage,
        timestamp: new Date().toISOString(),
        nonce: nonce,
      };
      addMessageToChat(selectedChat?._id as string, optimisticMessage);
      setNewMessage("");
    } catch (error) {
      console.error("Encryption failed:", error);
    }
  };

  if (selectedChat === null) {
    return <EmptyChatView />;
  }

  return (
    <div className="flex flex-col h-full">
      <header className="relative z-20 flex items-center p-4 border-b border-gray-200 flex-shrink-0 bg-white">
        <button
          onClick={onMenuClick}
          className="mr-2 p-2 rounded-full sm:hidden text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
        >
          <Menu size={24} />
        </button>
        <div className="w-10 h-10 bg-gray-300 rounded-full mr-4"></div>
        <div>
          <h2 className="font-bold text-lg">{selectedChat.name}</h2>
          <p className="text-sm text-green-500">
            last updated at{" "}
            {new Date(selectedChat.updatedAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
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
      <div className="flex-grow p-6 overflow-y-auto space-y-6">
        {selectedChat.messages.map((msg, index) => (
          <MessageBubble key={msg._id} message={msg}>
            <MessageContent message={msg} participantKeys={participantKeys} />
          </MessageBubble>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <footer className="p-4 border-t border-gray-200 flex-shrink-0">
        <form onSubmit={handleSendMessage} className="relative">
          <textarea
            ref={textareaRef}
            placeholder="Type a message..."
            className="w-full px-4 py-2 pr-24 bg-gray-100 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-400 resize-none overflow-y-hidden"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            rows={1}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage(e);
              }
            }}
          />
          <div className="absolute right-2 bottom-2 flex items-center gap-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={() => {
                /* handleFileUpload */
              }}
              style={{ display: "none" }}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-2 rounded-full text-gray-500 hover:bg-gray-200"
            >
              <Paperclip size={20} />
            </button>
            <button
              type="submit"
              className="p-2 rounded-full bg-rose-500 text-white hover:bg-rose-600"
            >
              <Send size={18} />
            </button>
          </div>
        </form>
      </footer>
    </div>
  );
};
