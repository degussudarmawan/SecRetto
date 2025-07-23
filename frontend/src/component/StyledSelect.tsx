"use client";

import React from "react";
import { ChevronDown, Check } from "lucide-react";
import * as Select from "@radix-ui/react-select";

// Helper function to conditionally combine CSS classes.
const cn = (...classes: (string | undefined | null | false)[]): string => {
  return classes.filter(Boolean).join(" ");
};

export type FriendOption = { id: string; name: string };

const StyledSelect = ({
  placeholder,
  options,
  disabled,
  onValueChange,
}: {
  placeholder: string;
  options: FriendOption[];
  disabled?: boolean;
  onValueChange: (code: string) => void;
}) => (
  <Select.Root disabled={disabled} onValueChange={onValueChange}>
    <Select.Trigger
      className="w-full flex items-center justify-between px-4 py-3 bg-gray-100 border border-gray-200 rounded-lg text-left focus:outline-none focus:ring-2 focus:ring-rose-400 
            data-[placeholder]:text-gray-500 text-black"
    >
      <Select.Value placeholder={placeholder} />
      <Select.Icon className="text-gray-500">
        <ChevronDown size={20} />
      </Select.Icon>
    </Select.Trigger>
    <Select.Portal>
      <Select.Content
        position="popper"
        sideOffset={5}
        className="bg-white rounded-lg shadow-lg border border-gray-200 z-50 w-[var(--radix-select-trigger-width)]"
      >
        <Select.Viewport className="p-2">
          {options.map((option) => (
            <Select.Item
              key={option.id}
              value={option.id}
              className="flex items-center px-3 py-2 rounded-md text-sm text-gray-700 hover:bg-rose-200 focus:bg-rose-200 cursor-pointer focus:outline-none"
            >
              <Select.ItemText>{option.name}</Select.ItemText>
              <Select.ItemIndicator className="ml-auto">
                <Check size={16} className="text-rose-500" />
              </Select.ItemIndicator>
            </Select.Item>
          ))}
        </Select.Viewport>
      </Select.Content>
    </Select.Portal>
  </Select.Root>
);
export { StyledSelect };
