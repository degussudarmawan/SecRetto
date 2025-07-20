"use client";

import React, { createContext, useContext, useState } from "react";
import { LoadingOverlay } from "@/component/LoadingOverlay"; // Adjust path if needed

interface ILoadingContext {
  isLoading: boolean;
  setIsLoading: (isLoading: boolean) => void;
}

const LoadingContext = createContext<ILoadingContext>({
  isLoading: false,
  setIsLoading: () => {},
});

export const useLoading = () => {
  return useContext(LoadingContext);
};

export const LoadingProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [isLoading, setIsLoading] = useState(false);

  return (
    <LoadingContext.Provider value={{ isLoading, setIsLoading }}>
      {/* The overlay is now rendered here, controlled by the context */}
      {isLoading && <LoadingOverlay />}
      {children}
    </LoadingContext.Provider>
  );
};
