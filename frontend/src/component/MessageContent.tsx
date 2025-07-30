"use client";

import React, { useState, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { useKeys } from "@/context/KeyContext";
import { useChats, IMessage } from "@/context/ChatContext";
import sodium from "libsodium-wrappers-sumo";
import { Download, File as FileIcon, Loader2 } from "lucide-react";

const cn = (...classes: (string | undefined | null | false)[]): string => {
  return classes.filter(Boolean).join(" ");
};

interface FileInfo {
  type: "file";
  fileName: string;
  fileId: string;
  key: string;
  nonce: string;
}

export const MessageContent: React.FC<{
  message: IMessage;
  participantKeys: { [userId: string]: string };
}> = ({ message, participantKeys }) => {
  const { user } = useAuth();
  const { privateKey } = useKeys();
  const { selectedChat } = useChats();
  const [isDownloading, setIsDownloading] = useState(false);
  const isSentByMe = message.sender === (user?._id as string);
  const otherParticipant = selectedChat?.participants.find(
    (p) => p._id !== user?._id
  );

  const content = useMemo(() => {
    if (message._id.includes("T")) return message.content; // It's an optimistic message
    try {
      const parsed = JSON.parse(message.content);
      if (parsed && parsed.type === "file") {
        return parsed as FileInfo;
      }
    } catch (e) {}

    console.log(
      message.nonce,
      privateKey,
      participantKeys,
      message.sender,
      participantKeys[message.sender]
    );
    if (!message.nonce || !privateKey)
      return "⚠️ Keys missing, cannot decrypt.";

    let publicKeyToUse: string | null = null;

    if (isSentByMe) {
      publicKeyToUse = otherParticipant
        ? participantKeys[otherParticipant._id]
        : null;
    } else {
      publicKeyToUse = participantKeys[message.sender];
    }

    if (!publicKeyToUse) return "⚠️ Sender's key not available.";

    try {
      return sodium.crypto_box_open_easy(
        sodium.from_base64(message.content),
        sodium.from_base64(message.nonce),
        sodium.from_base64(publicKeyToUse),
        sodium.from_base64(privateKey),
        "text"
      );
    } catch (err) {
      console.log(err);
      return "⚠️ Text decryption failed.";
    }
  }, [message, privateKey, participantKeys]);

  const handleFileDownload = async (fileInfo: FileInfo) => {
    if (!privateKey || !otherParticipant) return;
    setIsDownloading(true);

    try {
      let publicKeyToUse: string | null = null;

      if (isSentByMe) {
        publicKeyToUse = otherParticipant
          ? participantKeys[otherParticipant._id]
          : null;
      } else {
        publicKeyToUse = participantKeys[message.sender];
      }

      if (!publicKeyToUse) return "⚠️ Sender's key not available.";
      if (!publicKeyToUse)
        throw new Error("Could not find sender's public key.");

      const fileKeyData = JSON.parse(
        sodium.crypto_box_open_easy(
          sodium.from_base64(fileInfo.key),
          sodium.from_base64(fileInfo.nonce),
          sodium.from_base64(publicKeyToUse),
          sodium.from_base64(privateKey),
          "text"
        )
      );

      const { key: fileKey, nonce: fileNonce } = fileKeyData;

      const fileResponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/files/${fileInfo.fileId}`,
        { credentials: "include" }
      );
      if (!fileResponse.ok) throw new Error("Could not download file.");
      const encryptedFileBytes = await fileResponse.arrayBuffer();

      const decryptedFile = sodium.crypto_secretbox_open_easy(
        new Uint8Array(encryptedFileBytes),
        sodium.from_base64(fileNonce),
        sodium.from_base64(fileKey)
      );

      const blob = new Blob([decryptedFile], {
        type: "application/octet-stream",
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileInfo.fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      console.error("File download/decryption failed:", error);
      alert(`Error: ${error.message}`);
    } finally {
      setIsDownloading(false);
    }
  };

  if (
    typeof content === "object" &&
    content !== null &&
    content.type === "file"
  ) {
    return (
      <div className="flex items-center gap-3 p-3">
        <FileIcon className="text-current opacity-75 flex-shrink-0" />
        <div className="flex-grow min-w-0">
          <p className="font-semibold text-sm truncate">{content.fileName}</p>
          <button
            onClick={() => handleFileDownload(content)}
            disabled={isDownloading}
            className="text-xs text-rose-200 group-hover:text-rose-100 hover:underline flex items-center gap-1"
          >
            {isDownloading ? (
              <>
                <Loader2 size={12} className="animate-spin" /> Decrypting...
              </>
            ) : (
              <>
                <Download size={12} /> Download
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  return (
    <p className={cn("text-bold", isSentByMe ? "text-right" : "text-left")}>
      {String(content)}
    </p>
  );
};
