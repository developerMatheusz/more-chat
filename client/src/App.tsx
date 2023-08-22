import { UserContextProvider } from "./hooks/user-context/UserContext";
import Routes from "./Routes";

export default function App() {
  return (
    <UserContextProvider>
      <Routes />
    </UserContextProvider>
  );
}
