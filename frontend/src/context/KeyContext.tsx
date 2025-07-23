"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import _sodium from "libsodium-wrappers-sumo";

interface IKeysContext {
  privateKey: string | null;
  unlock: (password: string) => Promise<boolean>;
  isUnlocked: boolean;
}

const KeysContext = createContext<IKeysContext>({
  privateKey: null,
  unlock: async () => false,
  isUnlocked: false,
});

export const useKeys = () => {
  return useContext(KeysContext);
};

export const KeyProvider = ({ children }: { children: React.ReactNode }) => {
  const [privateKey, setPrivateKey] = useState<string | null>(null);

  const unlock = useCallback(async (password: string): Promise<boolean> => {
    const encryptedKey = localStorage.getItem("encryptedPrivateKey");
    const nonce = localStorage.getItem("privateKeyNonce");
    const salt = localStorage.getItem("privateKeySalt");

    if (!encryptedKey || !nonce || !salt) {
      console.error("Missing necessary items from storage to decrypt key.");
      return false;
    }

    try {
      await _sodium.ready;
      const sodium = _sodium
      const encryptionKey = sodium.crypto_pwhash(
        32,
        password,
        sodium.from_base64(salt),
        sodium.crypto_pwhash_OPSLIMIT_INTERACTIVE,
        sodium.crypto_pwhash_MEMLIMIT_INTERACTIVE,
        sodium.crypto_pwhash_ALG_DEFAULT,
        "base64"
      );

      const decryptedKey = sodium.crypto_secretbox_open_easy(
        sodium.from_base64(encryptedKey),
        sodium.from_base64(nonce),
        sodium.from_base64(encryptionKey),
        "text"
      );

      setPrivateKey(decryptedKey);
      return true;
    } catch (error) {
      console.error("Decryption failed, likely incorrect password:", error);
      return false;
    }
  }, []);

  return (
    <KeysContext.Provider
      value={{ privateKey, unlock, isUnlocked: !!privateKey }}
    >
      {children}
    </KeysContext.Provider>
  );
};
