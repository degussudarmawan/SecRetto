"use client";

import React, { useState } from "react";
import { Input } from "@/component/Input";
import { Button } from "@/component/Button";
import { useLoading } from "@/context/LoadingContext";

type ProfileSetupFormProps = {
  onSubmit: (username: string) => void;
};

export const ProfileSetupForm: React.FC<ProfileSetupFormProps> = ({
  onSubmit,
}) => {
  const [username, setUsername] = useState("");
  const { isLoading } = useLoading();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(username);
  };

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
          disabled={isLoading}
          required
        />
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Saving..." : "Complete Profile"}
        </Button>
      </form>
    </div>
  );
};

export default ProfileSetupForm;
