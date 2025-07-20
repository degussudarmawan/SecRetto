"use client";

import { AddFriendModal } from "@/component/AddFriendModal";
import ChatPasswordModal from "@/component/ChatPasswordModal";
import { Sidebar } from "@/component/Sidebar";
import { StartSessionModal } from "@/component/StartSessionModal";
import { AuthProvider } from "@/context/AuthContext";
import { FriendsProvider } from "@/context/FriendsContext";
import { SocketProvider } from "@/context/SocketContext";
import React, { useState } from "react";

type Chat = {
  id: number;
  name: string;
  message: string;
  time: string;
  hasPassword?: boolean;
};

const ChatLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeModal, setActiveModal] = useState<
    "addFriend" | "startSession" | null
  >(null);
  const [chatToUnlock, setChatToUnlock] = useState<Chat | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const childrenWithProps = React.Children.map(children, (child) => {
    if (React.isValidElement(child)) {
      return React.cloneElement(child, {
        onMenuClick: () => setIsSidebarOpen(true),
      } as any);
    }
    return child;
  });

  return (
    <SocketProvider>
      <AuthProvider>
        <FriendsProvider>
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
                onChatClick={(chat) => {
                  if (chat.hasPassword) {
                    setChatToUnlock(chat);
                  } else {
                    console.log(`Opening chat: ${chat.name}`);
                  }
                  setIsSidebarOpen(false);
                }}
              />
            </div>
            <main className="flex-grow h-full bg-white text-gray-800">
              {childrenWithProps}
            </main>
            {activeModal === "addFriend" && (
              <AddFriendModal onClose={() => setActiveModal(null)} />
            )}
            {activeModal === "startSession" && (
              <StartSessionModal
                onClose={() => setActiveModal(null)}
              />
            )}
            {chatToUnlock && (
              <ChatPasswordModal
                chatName={chatToUnlock.name}
                onClose={() => setChatToUnlock(null)}
                onSubmit={(password) => {
                  console.log(
                    `Unlocking chat ${chatToUnlock.name} with password: ${password}`
                  );
                  setChatToUnlock(null);
                }}
              />
            )}
          </div>
        </FriendsProvider>
      </AuthProvider>
    </SocketProvider>
  );
};

export default ChatLayout;
