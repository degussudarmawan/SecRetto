"use client";

import React, { useState } from "react";
import { Modal } from "./Modal";
import { Input } from "./Input";
import { Button } from "./Button";
import { StyledSelect } from "./StyledSelect";
import { useFriends } from "@/context/FriendsContext";
import { useLoading } from "@/context/LoadingContext";
import { useChats } from "@/context/ChatContext";

const StartSessionModal: React.FC<{
  onClose: () => void;
}> = ({ onClose }) => {
  const { friends, isLoading } = useFriends();
  const { setIsLoading } = useLoading();

  const [selectedFriend, setSelectedFriend] = useState<string | undefined>(
    undefined
  );
  const [password, setPassword] = useState("");
  const [sessionName, setSessionName] = useState("");
  const [timer, setTimer] = useState("");
  const [message, setMessage] = useState({ type: "", text: "" });
  const { addChat } = useChats();

  const friendOptions = friends.map((friend) => ({
    id: friend._id,
    name: friend.username,
  }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFriend) {
      setMessage({
        type: "error",
        text: "Please select a friend to start a chat.",
      });
      return;
    }
    setIsLoading(true);
    setMessage({ type: "", text: "" });

    console.log("yoo!!!");
    try {
      const response = await fetch("http://localhost:3001/api/chats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          friendId: selectedFriend,
          password: password,
          sessionName: sessionName,
          timer,
        }),
        credentials: "include",
      });

      const data = await response.json();

      console.log("[Frontend API] Received response from /api/chats:", data);

      if (!response.ok) {
        throw new Error(data.message || "Failed to start session.");
      }

      addChat(data.chat);
      onClose();
    } catch (err: any) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setIsLoading(false);
    }
  };

  console.log("YO", selectedFriend);

  return (
    <Modal onClose={onClose}>
      <div className="text-center">
        <h2 className="text-2xl text-black font-bold mb-6">Start Session</h2>
        <form className="space-y-4" onSubmit={handleSubmit}>
          {isLoading ? (
            <div className="w-full h-[46px] bg-gray-200 rounded-lg animate-pulse"></div>
          ) : (
            <>
              <StyledSelect
                placeholder="Select Friend"
                options={friendOptions}
                disabled={friends.length === 0}
                onValueChange={(value) => setSelectedFriend(value)}
              />
              {friends.length === 0 && (
                <p className="text-sm text-gray-500 pt-1">
                  You have no friends to start a session with. Add a friend
                  first!
                </p>
              )}
            </>
          )}
          <Input
            type="text"
            placeholder="room name"
            value={sessionName}
            onChange={(e) => setSessionName(e.target.value)}
          />
          <Input
            type="text"
            placeholder="Set Timer (e.g., 24h)"
            value={timer}
            onChange={(e) => setTimer(e.target.value)}
          />
          <Input
            type="password"
            placeholder="Set Password (optional)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {message.text && (
            <p
              className={`text-sm ${
                message.type === "error" ? "text-red-600" : "text-green-600"
              }`}
            >
              {message.text}
            </p>
          )}
          <Button type="submit">Start Session</Button>
        </form>
      </div>
    </Modal>
  );
};

export { StartSessionModal };
