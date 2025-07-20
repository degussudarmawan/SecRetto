"use client";
import React from "react";

const cn = (...classes: (string | undefined | null | false)[]): string => {
  return classes.filter(Boolean).join(" ");
};

type ButtonProps = {
  children: React.ReactNode;
} & React.ButtonHTMLAttributes<HTMLButtonElement>;

const Button: React.FC<ButtonProps> = ({ children, className, ...props }) => (
  <button
    className={cn(
      "px-4 py-2 rounded-lg font-semibold text-white transition-colors duration-200",
      "bg-rose-500 hover:bg-rose-600 focus:outline-none focus:ring-2 focus:ring-rose-400 focus:ring-opacity-75",
      className
    )}
    {...props}
  >
    {children}
  </button>
);

export { Button };
