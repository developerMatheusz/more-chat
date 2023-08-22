import { useContext } from "react";
import Auth from "./components/Auth";
import { UserContext } from "./hooks/user-context/UserContext";
import Chat from "./components/Chat";

export default function Routes() {
  const { username } = useContext(UserContext);

  if (username) {
    return <Chat />;
  }

  return <Auth />;
}
