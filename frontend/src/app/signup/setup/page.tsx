"use client";

import { ProfileSetupView } from "@/component/ProfileSetupView";
import React from "react";

export default function ProfileSetupPage() {
  return (
    <div className="h-screen w-screen bg-rose-50 flex items-center justify-center font-sans p-4">
      <ProfileSetupView />
    </div>
  );
}
