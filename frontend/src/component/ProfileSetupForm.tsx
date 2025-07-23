"use client";

import React, { useState } from "react";
import { Input } from "@/component/Input";
import { Button } from "@/component/Button";
import { useLoading } from "@/context/LoadingContext";

type ProfileSetupFormProps = {
  onSubmit: (username: string, masterPassword: string) => void;
  error: string;
  isKeysGenerating: boolean;
};

export const ProfileSetupForm: React.FC<ProfileSetupFormProps> = ({
  onSubmit,
  error,
  isKeysGenerating,
}) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const { isLoading } = useLoading();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      alert("Master password must be at least 8 characters long.");
      return;
    }
    if (password !== confirmPassword) {
      alert("Passwords do not match!");
      return;
    }
    onSubmit(username, password);
  };

  const isDisabled = isLoading || isKeysGenerating;

  return (
    <div className="w-full max-w-sm mx-auto p-8 bg-white rounded-2xl shadow-lg text-center">
      <h1 className="text-3xl font-bold text-rose-800 mb-2">
        Welcome to SecRetto
      </h1>
      <p className="text-gray-600 mb-6">Set up your username</p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          disabled={isDisabled}
          required
        />
        <Input
          type="password"
          placeholder="Master Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={isDisabled}
          required
        />
        <Input
          type="password"
          placeholder="Confirm Master Password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          disabled={isDisabled}
          required
        />
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <Button type="submit" disabled={isDisabled}>
          {isLoading
            ? "Saving..."
            : isKeysGenerating
            ? "Generating Keys..."
            : "Complete Profile"}
        </Button>
      </form>
    </div>
  );
};

export default ProfileSetupForm;
