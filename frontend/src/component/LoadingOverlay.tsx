"use client";

import React from "react";

// Keyhole Icon SVG
const KeyholeIcon = () => (
  <svg
    className="w-24 h-24 text-rose-500"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="10" />
    <path d="M12 12v4.5" />
    <path d="M15.5 16.5a3.5 3.5 0 0 0-7 0" />
  </svg>
);

export default function LoadingOverlay() {
  return (
    <>
      <style>
        {`
                .keyhole-pulse {
                    animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
                }

                @keyframes pulse {
                    0%, 100% {
                        opacity: 1;
                        transform: scale(1);
                    }
                    50% {
                        opacity: 0.7;
                        transform: scale(1.1);
                    }
                }
            `}
      </style>
      <div className="h-screen w-full flex flex-col items-center justify-center bg-rose-50 font-sans">
        <div className="keyhole-pulse">
          <KeyholeIcon />
        </div>
        <p className="mt-6 text-lg font-semibold text-rose-800 animate-pulse">
          Unlocking Secrets...
        </p>
      </div>
    </>
  );
}

export { LoadingOverlay }
