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

type UIMessage = {
  _id: string;
  content: string;
  timestamp: string;
  senderId: string;
};

type KeyPromiseResult = { userId: string; publicKey: string } | null;

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
              `http://localhost:3001/api/users/${p._id}/key`,
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
    await _sodium.ready;
    const sodium = _sodium;
    e.preventDefault();
    const otherParticipantKey = otherParticipant
      ? participantKeys[otherParticipant._id]
      : null;

    if (newMessage.trim() === "" || !socket || !user || !otherParticipantKey)
      return;

    try {
      if (!privateKey) {
        throw new Error("Your private key is missing. Please log in again.");
      }

      const nonce = sodium.randombytes_buf(sodium.crypto_box_NONCEBYTES);

      const ciphertext = sodium.crypto_box_easy(
        newMessage,
        nonce,
        sodium.from_base64(
          otherParticipantKey,
          sodium.base64_variants.URLSAFE_NO_PADDING
        ),
        sodium.from_base64(
          privateKey,
          sodium.base64_variants.URLSAFE_NO_PADDING
        )
      );

      const fullMessage = new Uint8Array(nonce.length + ciphertext.length);
      fullMessage.set(nonce);
      fullMessage.set(ciphertext, nonce.length);

      const encryptedContent = sodium.to_base64(
        fullMessage,
        sodium.base64_variants.URLSAFE_NO_PADDING
      );

      const messageData = {
        chatId: selectedChat?._id,
        senderId: user._id,
        content: encryptedContent,
      };

      socket.emit("send_message", messageData);

      const optimisticMessage: IMessage = {
        _id: new Date().toISOString(),
        sender: user._id,
        content: newMessage,
        timestamp: new Date().toISOString(),
      };
      addMessageToChat(selectedChat?._id as string, optimisticMessage);

      setNewMessage("");
    } catch (error) {
      console.error("Encryption failed:", error);
    }
  };

  // In ChatView.tsx, replace the decryptMessage function

  const decryptMessage = useCallback(
    async (message: IMessage): Promise<string> => {
      await _sodium.ready;
      const sodium = _sodium;
      if (message._id.includes("T")) return message.content;

      try {
        if (!privateKey) return "Decryption failed: Your key is missing.";

        const fullMessage = sodium.from_base64(
          message.content,
          sodium.base64_variants.URLSAFE_NO_PADDING
        );
        const nonce = fullMessage.slice(0, sodium.crypto_box_NONCEBYTES);
        const ciphertext = fullMessage.slice(sodium.crypto_box_NONCEBYTES);

        let decrypted: string | null = null;

        if (message.sender === user?._id) {
          const otherParticipantPublicKey = otherParticipant
            ? participantKeys[otherParticipant._id]
            : null;
          if (!otherParticipantPublicKey) {
            return "Cannot decrypt: Recipient's public key is missing.";
          }

          decrypted = sodium.crypto_box_open_easy(
            ciphertext,
            nonce,
            sodium.from_base64(
              otherParticipantPublicKey,
              sodium.base64_variants.URLSAFE_NO_PADDING
            ),
            sodium.from_base64(
              privateKey,
              sodium.base64_variants.URLSAFE_NO_PADDING
            ),
            "text"
          );
        } else {
          const senderPublicKey = participantKeys[message.sender];
          if (!senderPublicKey) {
            return "Cannot decrypt: Sender's public key is missing.";
          }

          decrypted = (sodium as any).crypto_box_open_easy(
            ciphertext,
            nonce,
            sodium.from_base64(
              senderPublicKey,
              sodium.base64_variants.URLSAFE_NO_PADDING
            ),
            sodium.from_base64(
              privateKey,
              sodium.base64_variants.URLSAFE_NO_PADDING
            ),
            "text"
          );
        }

        return decrypted || "⚠️ Decryption failed.";
      } catch (e) {
        console.error("Decryption error:", e);
        return "⚠️ Decryption failed.";
      }
    },
    [participantKeys, user, otherParticipant, privateKey]
  );

  useEffect(() => {
    const decryptAll = async () => {
      if (!selectedChat?.messages) return;

      const newContent = new Map<string, string>();
      for (const msg of selectedChat.messages) {
        if (msg._id.includes("T")) {
          newContent.set(msg._id, msg.content);
        } else {
          const decrypted = await decryptMessage(msg);
          newContent.set(msg._id, decrypted);
        }
      }
      setDecryptedContent(newContent);
    };

    decryptAll();
  }, [selectedChat?.messages, decryptMessage]);

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file || !user || !otherParticipant || !socket) return;

    const otherParticipantKey = participantKeys[otherParticipant._id];
    if (!otherParticipantKey) {
      alert("Cannot send file: recipient's key is not available.");
      return;
    }

    try {
      await _sodium.ready;
      const sodium = _sodium;
      if (!privateKey) throw new Error("Private key is missing.");

      const fileBuffer = await file.arrayBuffer();
      const fileBytes = new Uint8Array(fileBuffer);

      const fileKey = sodium.crypto_secretbox_keygen("base64");
      const fileNonce = sodium.randombytes_buf(
        sodium.crypto_secretbox_NONCEBYTES,
        "base64"
      );

      const encryptedFile = sodium.crypto_secretbox_easy(
        fileBytes,
        sodium.from_base64(fileNonce),
        sodium.from_base64(fileKey)
      );

      const keyNonce = sodium.randombytes_buf(
        sodium.crypto_box_NONCEBYTES,
        "base64"
      );
      const encryptedFileKey = sodium.crypto_box_easy(
        JSON.stringify({ key: fileKey, nonce: fileNonce }),
        sodium.from_base64(keyNonce),
        sodium.from_base64(otherParticipantKey),
        sodium.from_base64(privateKey),
        "base64"
      );

      const formData = new FormData();
      formData.append("file", new Blob([encryptedFile]));

      const uploadResponse = await fetch(
        "http://localhost:3001/api/files/upload",
        {
          method: "POST",
          body: formData,
          credentials: "include",
        }
      );
      const uploadData = await uploadResponse.json();
      if (!uploadResponse.ok) throw new Error(uploadData.message);

      const messageData = {
        chatId: selectedChat?._id,
        senderId: user._id,
        content: JSON.stringify({
          type: "file",
          fileName: file.name,
          fileId: uploadData.fileId,
          key: encryptedFileKey,
          nonce: keyNonce,
        }),
        isFileInfo: true,
      };
      socket.emit("send_message", messageData);

      addMessageToChat(selectedChat?._id as string, {
        _id: new Date().toISOString(),
        sender: user._id,
        content: `You sent a file: ${file.name}`,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      console.error("File encryption or upload failed:", error);
      alert(`Error: ${error.message}`);
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
          <MessageBubble
            key={index}
            message={{
              ...msg,
              content: decryptedContent.get(msg._id) || "Decrypting...",
            }}
          >
          </MessageBubble>
          // <MessageBubble key={msg._id} message={msg}>
          //   <MessageContent message={msg}/>
          // </MessageBubble>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <footer className="p-4 border-t border-gray-200 flex-shrink-0">
        <form onSubmit={handleSendMessage} className="relative">
          <Input
            placeholder="Type a message..."
            className="pr-24 !py-2"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              style={{ display: "none" }}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-gray-500 hover:text-gray-800"
            >
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
