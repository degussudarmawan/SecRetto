"use client";

import React, { useState } from "react";
import {
  Settings,
  PlusCircle,
  Search,
  UserPlus,
  MessageSquarePlus,
  LogOut,
} from "lucide-react";
import Link from "next/link";
import { SidebarItem } from "./SidebarItem";
import { Input } from "./Input";
import { useAuth } from "@/context/AuthContext";
import { IChat, useChats } from "@/context/ChatContext";

const cn = (...classes: (string | undefined | null | false)[]): string => {
  return classes.filter(Boolean).join(" ");
};

type Chat = {
  id: number;
  name: string;
  message: string;
  time: string;
  hasPassword?: boolean;
};

const placeholder: Chat[] = [
  { id: 1, name: "Secret 1", message: "Hey, how are you?", time: "10m" },
  {
    id: 2,
    name: "Top Secret Project",
    message: "The plans are ready...",
    time: "1h",
    hasPassword: true,
  },
  { id: 3, name: "Friend", message: "See you tomorrow!", time: "3h" },
];

const Sidebar: React.FC<{
  onAddFriendClick: () => void;
  onStartSessionClick: () => void;
  onChatClick: (chat: IChat) => void;
}> = ({ onAddFriendClick, onStartSessionClick, onChatClick }) => {
  const { user, isLoading } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { chats, isLoadingChat: chatsLoading } = useChats();

  const handleLogout = async () => {
    try {
      await fetch("http://localhost:3001/api/logout", {
        method: "POST",
        credentials: "include",
      });

      window.location.reload();
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return (
    <div className="bg-rose-50 h-full w-full flex flex-col p-4 border-r border-rose-200">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-rose-800">SecRetto</h1>
        <div className="relative">
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="text-rose-600 hover:text-rose-800"
          >
            <PlusCircle size={24} />
          </button>
          {isMenuOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl py-1 z-10 border border-gray-100">
              <button
                onClick={() => {
                  onAddFriendClick();
                  setIsMenuOpen(false);
                }}
                className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-rose-50"
              >
                <UserPlus size={16} /> Add Friend
              </button>
              <button
                onClick={() => {
                  onStartSessionClick();
                  setIsMenuOpen(false);
                }}
                className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-rose-50"
              >
                <MessageSquarePlus size={16} /> Start Session
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="relative mb-4">
        <Search
          size={18}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
        />
        <Input placeholder="Search Chats..." className="pl-10 !py-2" />
      </div>
      <div className="flex-grow overflow-y-auto -mr-2 pr-2">
        {chatsLoading ? (
          <div className="space-y-2 mt-4">
            <div className="h-16 bg-gray-200 rounded-lg animate-pulse"></div>
            <div className="h-16 bg-gray-200 rounded-lg animate-pulse"></div>
          </div>
        ) : chats.length > 0 ? (
          <div className="space-y-2">
            {chats.map((chat) => (
              <SidebarItem
                key={chat._id.toString()}
                name={chat.name || "Chat"}
                message={"No messages yet..."}
                time={new Date(chat.updatedAt).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
                isLocked={chat.hasPassword}
                onClickItem={() => onChatClick(chat)}
              />
            ))}
          </div>
        ) : (
          <div className="text-center text-gray-500 mt-10 p-4">
            <p className="font-semibold">No Chats Yet</p>
            <p className="text-sm mt-1">
              Click the '+' icon to start a new secret chat.
            </p>
          </div>
        )}
      </div>
      <div className="mt-auto flex items-center p-2 rounded-lg group">
        <Link
          href="/chat/profile"
          className="flex-grow flex items-center rounded-lg -ml-2 pl-2 py-1 group-hover:bg-rose-100 transition-colors duration-200"
        >
          <div className="w-10 h-10 bg-gray-300 rounded-full mr-3"></div>
          <div>
            {isLoading ? (
              <div className="h-4 bg-gray-200 rounded w-24 animate-pulse"></div>
            ) : (
              <div className="font-bold text-gray-800">{user?.username}</div>
            )}
            <div className="text-sm text-green-600">Online</div>
          </div>
        </Link>
        <div className="flex items-center gap-1 ml-auto">
          <button
            onClick={handleLogout}
            title="Log Out"
            className="p-2 rounded-full text-gray-600 hover:bg-rose-200 hover:text-red-600 transition-colors"
          >
            <LogOut size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};

export { Sidebar };
