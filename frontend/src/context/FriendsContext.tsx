"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";

// Define the shape of a friend object
interface IFriend {
  _id: string;
  username: string;
}

interface IFriendsContext {
  friends: IFriend[];
  isLoading: boolean;
  refetchFriends: () => void;
}

const FriendsContext = createContext<IFriendsContext>({
  friends: [],
  isLoading: true,
  refetchFriends: () => {},
});

export const useFriends = () => {
  return useContext(FriendsContext);
};

export const FriendsProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [friends, setFriends] = useState<IFriend[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchFriends = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/friends`,
        {
          credentials: "include",
        }
      );

      if (response.ok) {
        const friendsData = await response.json();
        setFriends(friendsData);
      }
    } catch (error) {
      console.error("Failed to fetch friends:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFriends();
  }, [fetchFriends]);

  return (
    <FriendsContext.Provider
      value={{ friends, isLoading, refetchFriends: fetchFriends }}
    >
      {children}
    </FriendsContext.Provider>
  );
};
