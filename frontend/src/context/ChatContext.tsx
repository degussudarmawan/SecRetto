import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { useSocket } from "./SocketContext";
import { useAuth } from "./AuthContext";

export interface IMessage {
  _id: string;
  sender: string;
  content: string;
  timestamp: string;
  nonce?: string;
}

export interface IChat {
  _id: string;
  participants: { _id: string; username: string }[];
  messages: IMessage[];
  hasPassword?: boolean;
  sessionName?: string;
  createdAt: string;
  updatedAt: string;
  name: string;
}
interface IChatContext {
  chats: IChat[];
  isLoadingChat: boolean;
  addChat: (newChat: IChat) => void;
  selectedChat: IChat | null;
  setSelectedChat: (chat: IChat | null) => void;
  addMessageToChat: (chatId: string, message: IMessage) => void;
}

const ChatContext = createContext<IChatContext>({
  chats: [],
  isLoadingChat: true,
  addChat: () => {},
  selectedChat: null,
  setSelectedChat: () => {},
  addMessageToChat: function (chatId: string, message: IMessage): void {
    throw new Error("Function not implemented.");
  },
});

export const useChats = () => {
  return useContext(ChatContext);
};

export const ChatProvider = ({ children }: { children: React.ReactNode }) => {
  const { socket } = useSocket();
  const { user } = useAuth();
  const [chats, setChats] = useState<IChat[]>([]);
  const [isLoadingChat, setIsLoadingChat] = useState(true);
  const [selectedChat, setSelectedChat] = useState<IChat | null>(null);

  const fetchChats = useCallback(async () => {
    setIsLoadingChat(true);
    try {
      const response = await fetch("http://localhost:3001/api/chats", {
        credentials: "include",
      });
      if (response.ok) {
        const chatData = await response.json();
        setChats(chatData);
      }
    } catch (error) {
      console.error("Failed to fetch chats:", error);
    } finally {
      setIsLoadingChat(false);
    }
  }, []);

  useEffect(() => {
    fetchChats();
  }, [fetchChats]);

  const addChat = useCallback((newChat: IChat) => {
    console.log(newChat);
    if (!newChat || !newChat._id) {
      console.error("Received an invalid chat object. Cannot update state.");
      return;
    }
    setChats((prevChats) => {
      if (prevChats.some((chat) => chat._id === newChat._id)) {
        return prevChats;
      }
      return [newChat, ...prevChats];
    });
  }, []);

  useEffect(() => {
    if (socket && user) {
      socket.emit("register", user._id);
    }
  }, [socket, user]);

  useEffect(() => {
    if (!socket) return;

    // The handler now uses the stable addChat function
    const handleNewChat = (newChat: IChat) => {
      console.log(newChat);
      addChat(newChat);
    };

    socket.on("new_chat", handleNewChat);

    return () => {
      socket.off("new_chat", handleNewChat);
    };
  }, [socket, addChat]);

  const addMessageToChat = useCallback((chatId: string, message: IMessage) => {
    setChats((prevChats) =>
      prevChats.map((chat) =>
        chat._id === chatId
          ? { ...chat, messages: [...chat.messages, message] }
          : chat
      )
    );
    // Also update the selected chat if it's the active one
    setSelectedChat((prevSelected) =>
      prevSelected?._id === chatId
        ? { ...prevSelected, messages: [...prevSelected.messages, message] }
        : prevSelected
    );
  }, []);

  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = ({
      chatId,
      message,
    }: {
      chatId: string;
      message: IMessage;
    }) => {
      addMessageToChat(chatId, message);
    };

    socket.on("receive_message", handleNewMessage);

    return () => {
      socket.off("receive_message", handleNewMessage);
    };
  }, [socket, addMessageToChat]);

  const removeChat = useCallback((chatId: string) => {
    setChats((prevChats) => prevChats.filter((chat) => chat._id !== chatId));
    // Also deselect the chat if it was the active one
    setSelectedChat((prevSelected) =>
      prevSelected?._id === chatId ? null : prevSelected
    );
  }, []);

  // NEW: Listen for chat deletion events from the socket
  useEffect(() => {
    if (!socket) return;

    const handleChatAborted = ({ chatId }: { chatId: string }) => {
      console.log(`Chat ${chatId} was aborted from server.`);
      removeChat(chatId);
    };

    socket.on("chat_aborted", handleChatAborted);

    return () => {
      socket.off("chat_aborted", handleChatAborted);
    };
  }, [socket, removeChat]);

  return (
    <ChatContext.Provider
      value={{
        chats,
        isLoadingChat,
        addChat,
        selectedChat,
        setSelectedChat,
        addMessageToChat,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};
