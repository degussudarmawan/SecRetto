import React from "react";
import { Lock } from "lucide-react";

const cn = (...classes: (string | undefined | null | false)[]): string => {
  return classes.filter(Boolean).join(" ");
};

type SidebarItemProps = {
  name: string;
  message: string;
  time: string;
  active?: boolean;
  isLocked?: boolean;
};

const SidebarItem: React.FC<SidebarItemProps> = ({
  name,
  message,
  time,
  active = false,
  isLocked = false,
}) => (
  <div
    className={cn(
      "flex items-center p-3 rounded-lg cursor-pointer transition-colors duration-200",
      active ? "bg-rose-200" : "hover:bg-rose-100"
    )}
  >
    <div className="w-10 h-10 bg-gray-300 rounded-full flex-shrink-0 mr-3"></div>
    <div className="flex-grow overflow-hidden">
      <div className="font-bold text-gray-800 flex items-center gap-2">
        {name}
        {isLocked && <Lock size={12} className="text-gray-500" />}
      </div>
      <p className="text-sm text-gray-500 truncate">
        {isLocked ? "*************" : message}
      </p>
    </div>
    <div className="text-xs text-gray-400 ml-2 flex-shrink-0">{time}</div>
  </div>
);

export { SidebarItem };
