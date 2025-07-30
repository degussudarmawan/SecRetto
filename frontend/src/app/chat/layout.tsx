"use client";

import { AddFriendModal } from "@/component/AddFriendModal";
import ChatPasswordModal from "@/component/ChatPasswordModal";
import { Sidebar } from "@/component/Sidebar";
import { StartSessionModal } from "@/component/StartSessionModal";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { ChatProvider, IChat, useChats } from "@/context/ChatContext";
import { FriendsProvider } from "@/context/FriendsContext";
import { SocketProvider } from "@/context/SocketContext";
import React, { useState } from "react";

const ChatLayoutContent = ({ children }: { children: React.ReactNode }) => {
  const [activeModal, setActiveModal] = useState<
    "addFriend" | "startSession" | null
  >(null);
  const [chatToUnlock, setChatToUnlock] = useState<IChat | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { selectedChat, setSelectedChat } = useChats();
  const { user } = useAuth();
  const childrenWithProps = React.Children.map(children, (child) => {
    if (React.isValidElement(child)) {
      return React.cloneElement(child, {
        onMenuClick: () => setIsSidebarOpen(true),
      } as any);
    }
    return child;
  });

  const handleChatClick = (chat: IChat) => {
    if (chat.hasPassword) {
      setChatToUnlock(chat);
    } else {
      setSelectedChat(chat);
      console.log("YOO123", chat);
      console.log(selectedChat);
    }
  };

  const handlePasswordSubmit = async (password: string) => {
    if (!chatToUnlock) return;

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/chats/${chatToUnlock._id}/verify-password`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password }),
          credentials: "include",
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Incorrect password.");
      }

      setSelectedChat(chatToUnlock);
      setChatToUnlock(null);
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <>
      <div className="h-screen w-screen bg-gray-100 flex font-sans">
        {isSidebarOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-20 sm:hidden"
            onClick={() => setIsSidebarOpen(false)}
          ></div>
        )}
        <div
          className={`fixed inset-y-0 left-0 z-30 w-full max-w-xs transform transition-transform duration-300 ease-in-out 
                    ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"} 
                    sm:relative sm:translate-x-0`}
        >
          <Sidebar
            onAddFriendClick={() => setActiveModal("addFriend")}
            onStartSessionClick={() => setActiveModal("startSession")}
            onChatClick={handleChatClick}
          />
        </div>
        <main className="flex-grow h-full bg-white text-gray-800">
          {childrenWithProps}
        </main>
        {activeModal === "addFriend" && (
          <AddFriendModal onClose={() => setActiveModal(null)} />
        )}
        {activeModal === "startSession" && (
          <StartSessionModal onClose={() => setActiveModal(null)} />
        )}
        {chatToUnlock && (
          <ChatPasswordModal
            chatName={
              chatToUnlock.participants.find((p) => p._id !== user?._id)
                ?.username || "Chat"
            }
            onClose={() => setChatToUnlock(null)}
            onSubmit={handlePasswordSubmit}
          />
        )}
      </div>
    </>
  );
};

const ChatLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <SocketProvider>
      <AuthProvider>
        <FriendsProvider>
          <ChatProvider>
            <ChatLayoutContent>{children}</ChatLayoutContent>
          </ChatProvider>
        </FriendsProvider>
      </AuthProvider>
    </SocketProvider>
  );
};

export default ChatLayout;
