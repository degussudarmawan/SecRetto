"use client";

import React, { useState, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { useKeys } from "@/context/KeyContext";
import { useChats, IMessage } from "@/context/ChatContext";
import sodium from "libsodium-wrappers-sumo";
import { Download, File as FileIcon, Loader2 } from "lucide-react";

interface FileInfo {
  type: "file";
  fileName: string;
  fileId: string;
  key: string;
  nonce: string;
}

export const MessageContent: React.FC<{ message: IMessage }> = ({
  message,
}) => {
  const { user } = useAuth();
  const { privateKey } = useKeys();
  const { selectedChat } = useChats();
  const [isDownloading, setIsDownloading] = useState(false);

  const otherParticipant = selectedChat?.participants.find(
    (p) => p._id !== user?._id
  );

  const content = useMemo(() => {
    if (message._id.includes("T")) return message.content;
    try {
      const parsed = JSON.parse(message.content);
      if (parsed && parsed.type === "file") {
        return parsed as FileInfo;
      }
    } catch (e) {
      // It's not a JSON object, so it must be a text message
      console.log(message.nonce, privateKey);
      if (!message.nonce || !privateKey)
        return "⚠️ Keys missing, cannot decrypt.";

      const senderPublicKey = "REPLACE_WITH_SENDER_PUBLIC_KEY";

      try {
        return sodium.crypto_box_open_easy(
          sodium.from_base64(message.content),
          sodium.from_base64(message.nonce),
          sodium.from_base64(senderPublicKey),
          sodium.from_base64(privateKey),
          "text"
        );
      } catch (err) {
        return "⚠️ Text decryption failed.";
      }
    }
    return message.content;
  }, [message, privateKey, otherParticipant]);

  const handleFileDownload = async (fileInfo: FileInfo) => {
    // draft
  };

  if (typeof content === "object" && content.type === "file") {
    // If the content is a FileInfo object, render the file UI
    return (
      <div className="flex items-center gap-3">
        <FileIcon className="text-current opacity-75" />
        <div className="flex-grow">
          <p className="font-semibold text-sm">{content.fileName}</p>
          <button
            onClick={() => handleFileDownload(content)}
            disabled={isDownloading}
            className="text-xs text-rose-200 group-hover:text-rose-100 hover:underline flex items-center gap-1"
          >
            {isDownloading ? (
              <>
                <Loader2 size={12} className="animate-spin" />
                Decrypting...
              </>
            ) : (
              <>
                <Download size={12} />
                Download
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  return <p>{content as string}</p>;
};
