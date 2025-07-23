"use client";

import React, { useState } from "react";
import { Input } from "@/component/Input";
import { Button } from "@/component/Button";
import { useAuth } from "@/context/AuthContext";

export const ProfileForm: React.FC = () => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [username, setUsername] = useState(user?.username);
  const [email, setEmail] = useState(user?.email);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    console.log("Saving profile...", { username, email });

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500));

    setIsLoading(false);
    console.log("Profile saved!");
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-800 mb-8">Edit Profile</h1>

      <form onSubmit={handleSave} className="space-y-8">
        <div className="flex items-center gap-6">
          <div className="w-24 h-24 bg-gray-300 rounded-full flex-shrink-0">
          </div>
          <div className="flex-grow">
            <h2 className="text-lg font-semibold">Profile Picture</h2>
            <p className="text-sm text-gray-500 mb-3">Upload a new photo.</p>
            <input
              type="file"
              className="text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-rose-100 file:text-rose-700 hover:file:bg-rose-200"
              disabled={isLoading}
            />
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label
              htmlFor="username"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Username
            </label>
            <Input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={isLoading}
            />
          </div>
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Email
            </label>
            <Input
              id="email"
              type="email"
              value={email}
              disabled
              className="bg-gray-200 cursor-not-allowed"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <Button type="submit" disabled={isLoading} className="w-auto px-6">
            {isLoading ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default ProfileForm;
