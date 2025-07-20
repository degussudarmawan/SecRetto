"use client";

import { X } from "lucide-react";
import React from "react";

type ModalProps = { children: React.ReactNode; onClose: () => void };

export const Modal: React.FC<ModalProps> = ({ children, onClose }) => (
  <div className="fixed inset-0 bg-gray-500/50 flex items-center justify-center z-50 p-4">
    {" "}
    <div className="relative bg-white p-8 rounded-2xl shadow-lg w-full max-w-md">
      {" "}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
      >
        {" "}
        <X size={24} />{" "}
      </button>{" "}
      {children}{" "}
    </div>{" "}
  </div>
);
