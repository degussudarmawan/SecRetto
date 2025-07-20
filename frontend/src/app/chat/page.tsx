// src/app/chat/page.tsx
"use client";

import { ChatView } from "@/component/ChatView";

export default function ChatPage({ onMenuClick }: { onMenuClick?: () => void }) {
  return <ChatView onMenuClick={onMenuClick} />;
}
