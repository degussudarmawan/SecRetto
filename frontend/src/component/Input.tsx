import React from "react";

const cn = (...classes: (string | undefined | null | false)[]): string => {
  return classes.filter(Boolean).join(" ");
};

type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

const Input: React.FC<InputProps> = ({ className, ...props }) => (
  <input
    className={cn(
      "w-full px-4 py-3 bg-gray-100 border border-gray-200 text-gray-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-400 focus:text-black",
      className
    )}
    {...props}
  />
);

export { Input };
