import { useContext, useState } from "react";
import { api } from "../lib/axios";
import { UserContext } from "../hooks/user-context/UserContext";

const Auth = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoginOrRegister, setIsLoginOrRegister] = useState("register");

  const { setUsername: setLoggedInUsername, setId } = useContext(UserContext);

  async function handleSubmit(e: any) {
    e.preventDefault();

    const url = isLoginOrRegister === "register" ? "register" : "login";

    const { data } = await api.post(url, {
      username,
      password
    });
    setLoggedInUsername(username);
    setId(data.id);
  }

  return (
    <div className="bg-blue-50 h-screen flex items-center">
      <form className="w-64 mx-auto mb-12" onSubmit={handleSubmit}>
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          type="text"
          placeholder="Nome de usuário"
          className="block w-full rounded-sm p-2 mb-2 border"
        />
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          type="password"
          placeholder="Senha de acesso"
          className="block w-full rounded-sm p-2 mb-2 border"
        />
        <button className="bg-blue-600 text-white block w-full rounded-sm p-2">
          {isLoginOrRegister === "register" ? "Cadastre-se" : "Entrar"}
        </button>
        <div className="text-center mt-2">
          {isLoginOrRegister === "register" && (
            <div>
              Já é cadastrado?{" "}
              <button
                className="ml-1 text-blue-500 underline"
                onClick={() => setIsLoginOrRegister("login")}
              >
                Inicie a sessão
              </button>
            </div>
          )}
          {isLoginOrRegister === "login" && (
            <div>
              Ainda não tem uma conta?{" "}
              <button
                className="ml-1 text-blue-500 underline"
                onClick={() => setIsLoginOrRegister("register")}
              >
                Crie uma!
              </button>
            </div>
          )}
        </div>
      </form>
    </div>
  );
};

export default Auth;
