"use client";

import React, { useState } from "react";
import { Modal } from "@/component/Modal"; // Adjust path
import { Input } from "@/component/Input"; // Adjust path
import { Button } from "@/component/Button"; // Adjust path

type ChatPasswordModalProps = {
  chatName: string;
  onClose: () => void;
  onSubmit: (password: string) => void;
};

export const ChatPasswordModal: React.FC<ChatPasswordModalProps> = ({
  chatName,
  onClose,
  onSubmit,
}) => {
  const [password, setPassword] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(password);
  };

  return (
    <Modal onClose={onClose}>
      <div className="text-center">
        <h2 className="text-2xl text-black font-bold mb-2">Enter Password</h2>
        <p className="text-gray-500 mb-6">
          This chat is locked. Please enter the password for "{chatName}".
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Button type="submit">Unlock Chat</Button>
        </form>
      </div>
    </Modal>
  );
};

export default ChatPasswordModal;
