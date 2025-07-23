"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { SignUpForm } from "@/component/SignUpForm";
import { useLoading } from "@/context/LoadingContext";

export default function SignUpPage() {
  const router = useRouter();
  const { setIsLoading } = useLoading();

  const handleSignUp = async (googleAuthCode: string) => {
    setIsLoading(true);
    try {
      const response = await fetch("http://localhost:3001/api/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: googleAuthCode }),
        credentials: "include",
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Google authentication failed.");
      }
      if (data.isNewUser) {
        router.push("/signup/setup");
      } else {
        router.push("/signup/unlock");
      }
    } catch (error: any) {
      console.error("Sign up failed:", error);
      setIsLoading(false);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="h-screen w-screen bg-rose-50 flex items-center justify-center font-sans p-4">
        <SignUpForm onSubmit={handleSignUp} />
      </div>
    </>
  );
}
