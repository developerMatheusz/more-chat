import { createContext, useEffect, useState } from "react";
import { api } from "../../lib/axios";

export type UserContextData = {
  username: string;
  id: string;
  setUsername: (e: any) => any;
  setId: (e: any) => any;
};

export const UserContextDefaultValues = {
  username: "",
  id: "",
  setUsername: () => null,
  setId: () => null
};

export const UserContext = createContext<UserContextData>(
  UserContextDefaultValues
);

type UserContextProviderProps = {
  children: React.ReactNode;
};

export function UserContextProvider({ children }: UserContextProviderProps) {
  const [username, setUsername] = useState("");
  const [id, setId] = useState("");

  useEffect(() => {
    api.get("/profile").then((response) => {
      setId(response.data.userId);
      setUsername(response.data.username);
    });
  }, []);

  return (
    <UserContext.Provider value={{ username, setUsername, id, setId }}>
      {children}
    </UserContext.Provider>
  );
}
