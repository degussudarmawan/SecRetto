"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { ProfileSetupForm } from "@/component/ProfileSetupForm"; // Adjust path
import { useLoading } from "@/context/LoadingContext"; // Adjust path

// This new component holds the logic, ensuring hooks are called correctly.
function ProfileSetupView() {
  const router = useRouter();
  const { setIsLoading } = useLoading();

  const handleSubmit = async (username: string) => {
    setIsLoading(true);

    try {
      const response = await fetch("http://localhost:3001/api/profile/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to set up profile.");
      }

      router.push("/chat");
    } catch (err: any) {
      console.error(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return <ProfileSetupForm onSubmit={handleSubmit} />;
}

export { ProfileSetupView };
