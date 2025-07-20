"use client";

import React, { useState } from "react";
import { Input } from "./Input";
import { Button } from "./Button";
import { useRouter } from "next/navigation";
import { GoogleButton } from "./GoogleButton";
import { useGoogleLogin } from "@react-oauth/google";
import LoadingOverlay from "./LoadingOverlay";
import { useLoading } from "@/context/LoadingContext";

type SignUpFormProps = {
  onSubmit: (code: string) => void;
};

export const SignUpForm: React.FC<SignUpFormProps> = ({ onSubmit }) => {
  const [error, setError] = useState("");
  const { isLoading } = useLoading();

  const handleGoogleLogin = useGoogleLogin({
    flow: "auth-code",
    redirect_uri: "postmessage",
    onSuccess: (codeResponse) => {
      onSubmit(codeResponse.code);
    },
    onError: () => {
      setError("Google login failed. Please try again.");
    },
  });

  return (
    <>
      <div className="w-full max-w-sm mx-auto p-8 bg-white rounded-2xl shadow-lg text-center">
        <h1 className="text-3xl font-bold text-rose-800 mb-2">
          Welcome to SecRetto
        </h1>
        <p className="text-gray-600 mb-6">Join SecRetto today!</p>

        <button
          type="button"
          disabled={isLoading}
          onClick={() => handleGoogleLogin()}
          className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-400 disabled:opacity-50"
        >
          <GoogleButton />
          <span className="text-sm font-medium text-gray-700">
            "Sign in with Google"
          </span>
        </button>

        {error && <p className="text-red-500 text-sm mt-4">{error}</p>}
      </div>
    </>
  );
};

export default SignUpForm;
