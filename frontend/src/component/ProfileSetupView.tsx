"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ProfileSetupForm } from "@/component/ProfileSetupForm";
import { useLoading } from "@/context/LoadingContext";
import sodium from "libsodium-wrappers-sumo";
import { useKeys } from "@/context/KeyContext";

type KeyPair = {
  publicKey: string;
  privateKey: string;
};

// This new component holds the logic, ensuring hooks are called correctly.
function ProfileSetupView() {
  const router = useRouter();
  const { setIsLoading } = useLoading();
  const [keyPair, setKeyPair] = useState<KeyPair | null>(null);
  const [error, setError] = useState("");
  const [isKeysGenerating, setIsKeysGenerating] = useState(true);
  const { unlock } = useKeys();

  useEffect(() => {
    const generateKeys = async () => {
      try {
        await sodium.ready;
        const keys = sodium.crypto_box_keypair("base64");
        console.log("Generated new key pair!");
        setKeyPair({
          publicKey: keys.publicKey,
          privateKey: keys.privateKey,
        });
      } catch (e) {
        setError(
          "Failed to generate cryptographic keys. Please refresh the page."
        );
      } finally {
        setIsKeysGenerating(false);
      }
    };
    generateKeys();
  }, []);

  const handleSubmit = async (username: string, masterPassword: string) => {
    if (!keyPair) {
      setError("Keys are not ready. Please wait.");
      return;
    }
    setIsLoading(true);

    try {
      await sodium.ready;
      const nonce = sodium.randombytes_buf(
        sodium.crypto_secretbox_NONCEBYTES,
        "base64"
      );

      const salt = sodium.randombytes_buf(
        sodium.crypto_pwhash_SALTBYTES,
        "base64"
      );
      const encryptionKey = sodium.crypto_pwhash(
        32,
        masterPassword,
        sodium.from_base64(salt),
        sodium.crypto_pwhash_OPSLIMIT_INTERACTIVE,
        sodium.crypto_pwhash_MEMLIMIT_INTERACTIVE,
        sodium.crypto_pwhash_ALG_DEFAULT,
        "base64"
      );

      const encryptedPrivateKey = sodium.crypto_secretbox_easy(
        keyPair.privateKey,
        sodium.from_base64(nonce),
        sodium.from_base64(encryptionKey),
        "base64"
      );

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/profile/setup`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, publicKey: keyPair.publicKey }),
          credentials: "include",
        }
      );

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to set up profile.");
      }

      localStorage.setItem("encryptedPrivateKey", encryptedPrivateKey);
      localStorage.setItem("privateKeyNonce", nonce);
      localStorage.setItem("privateKeySalt", salt);

      router.push("/chat");

      await unlock(masterPassword);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ProfileSetupForm
      onSubmit={handleSubmit}
      error={error}
      isKeysGenerating={isKeysGenerating}
    />
  );
}

export { ProfileSetupView };
