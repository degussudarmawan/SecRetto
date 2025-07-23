"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/component/Input";
import { Button } from "@/component/Button";
import { useLoading } from "@/context/LoadingContext";
import { useKeys } from "@/context/KeyContext"; // NEW: Import the useKeys hook

export const UnlockForm: React.FC = () => {
  const router = useRouter();
  const { setIsLoading } = useLoading();
  const { unlock } = useKeys();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const success = await unlock(password);
      if (!success) {
        throw new Error("Incorrect master password. Please try again.");
      }

      const response = await fetch("http://localhost:3001/api/auth/unlock", {
        method: "POST",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to create an unlocked session.");
      }

      router.push("/chat");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-sm mx-auto p-8 bg-white rounded-2xl shadow-lg text-center">
      <h1 className="text-3xl font-bold text-rose-800 mb-2">
        Unlock Your Account
      </h1>
      <p className="text-gray-600 mb-6">
        Enter your master password to decrypt your keys and access your chats.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          type="password"
          placeholder="Master Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <Button type="submit">Unlock</Button>
      </form>
    </div>
  );
};

export default UnlockForm;
