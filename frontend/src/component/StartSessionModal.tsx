"use client";

import React from "react";
import { Modal } from "./Modal";
import { Input } from "./Input";
import { Button } from "./Button";
import { StyledSelect } from "./StyledSelect";
import { useFriends } from "@/context/FriendsContext";

const StartSessionModal: React.FC<{
  onClose: () => void;
}> = ({ onClose }) => {
  const { friends, isLoading } = useFriends();
  // Transform the friend data for the StyledSelect component

  console.log(friends);
  const friendOptions = friends.map((friend) => ({
    id: friend._id,
    name: friend.username,
  }));

  return (
    <Modal onClose={onClose}>
      <div className="text-center">
        <h2 className="text-2xl text-black font-bold mb-6">Start Session</h2>
        <form className="space-y-4">
          {isLoading ? (
            <div className="w-full h-[46px] bg-gray-200 rounded-lg animate-pulse"></div>
          ) : (
            <>
              <StyledSelect
                placeholder="Select Friend"
                options={friendOptions}
                disabled={friends.length === 0} // Disable if no friends
              />
              {friends.length === 0 && (
                <p className="text-sm text-gray-500 pt-1">
                  You have no friends to start a session with. Add a friend
                  first!
                </p>
              )}
            </>
          )}
          <Input type="text" placeholder="Set Timer (e.g., 24h)" />
          <Input type="password" placeholder="Set Password (optional)" />
          <Button type="submit">Start Session</Button>
        </form>
      </div>
    </Modal>
  );
};

export { StartSessionModal };
