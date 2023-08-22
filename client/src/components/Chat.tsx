import { useContext, useEffect, useRef, useState } from "react";
import Logo from "./Logo";
import { UserContext } from "../hooks/user-context/UserContext";
import { uniqBy } from "lodash";
import { api } from "../lib/axios";
import Contact from "./Contact";

const Chat = () => {
  const [wsConnection, setWsConnection] = useState<WebSocket | null>(null);
  const [onlinePeople, setOnlinePeople] = useState<any>({});
  const [offlinePeople, setOfflinePeople] = useState<any>({});
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [newMessageText, setNewMessageText] = useState("");
  const [messages, setMessages] = useState<
    {
      sender?: string;
      _id?: any;
      text: string;
      file?: string;
      isOur?: boolean;
    }[]
  >([]);
  const { username, id, setId, setUsername } = useContext(UserContext);
  const divUnderMessages = useRef<HTMLDivElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  useEffect(() => {
    connectToWebSocket();
  }, [selectedUserId]);

  function connectToWebSocket() {
    const ws = new WebSocket("ws://localhost:4040");
    setWsConnection(ws);
    ws.addEventListener("message", handleMessage);
    ws.addEventListener("close", () => {
      setTimeout(() => {
        connectToWebSocket();
      }, 1000);
    });
  }

  function showOnlinePeople(personArray: any) {
    const people: any = {};
    personArray.forEach(({ userId, username }: any) => {
      people[userId] = username;
    });
    setOnlinePeople(people);
  }

  function handleMessage(e: any) {
    const messageData = JSON.parse(e.data);
    if ("online" in messageData) {
      showOnlinePeople(messageData.online);
    } else if ("text" in messageData) {
      if (messageData.sender === selectedUserId) {
        setMessages((prev) => [...prev, { ...messageData }]);
      }
    }
  }

  function sendMessage(e: any, file: any = null) {
    if (e) e.preventDefault();

    wsConnection?.send(
      JSON.stringify({
        recipient: selectedUserId,
        text: newMessageText,
        file
      })
    );

    if (file) {
      api.get(`/messages/${selectedUserId}`).then((response) => {
        setMessages(response.data);
      });
    } else {
      setNewMessageText("");
      setMessages((prev) => [
        ...prev,
        {
          text: newMessageText,
          sender: id,
          recipient: selectedUserId,
          _id: Date.now()
        }
      ]);
    }
  }

  function sendFile(e: any) {
    const reader = new FileReader();
    reader.readAsDataURL(e.target.files[0]);
    reader.onload = () => {
      sendMessage(null, {
        name: e.target.files[0].name,
        data: reader.result
      });
    };
  }

  function logout() {
    api.post("/logout").then(() => {
      setWsConnection(null);
      setId(null);
      setUsername(null);
    });
  }

  useEffect(() => {
    const div = divUnderMessages.current;

    if (div) {
      div.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [messages]);

  useEffect(() => {
    if (selectedUserId) {
      api.get(`/messages/${selectedUserId}`).then((response) => {
        setMessages(response.data);
      });
    }
  }, [selectedUserId]);

  useEffect(() => {
    api.get("/people").then((response) => {
      const offlinePeopleArray = response.data
        .filter((p: any) => p._id !== id)
        .filter((p: any) => !Object.keys(onlinePeople).includes(p._id));
      const offlinePeople: any = {};
      offlinePeopleArray.forEach((p: any) => {
        offlinePeople[p._id] = p;
      });
      setOfflinePeople(offlinePeople);
    });
  }, [onlinePeople]);

  const onlinePeopleExcludeOurUser = { ...onlinePeople };

  delete onlinePeopleExcludeOurUser[id];

  const messagesWithoutDupes = uniqBy(messages, "_id");

  return (
    <div className="flex h-screen">
      <div className="bg-white w-1/3 flex flex-col">
        <div className="flex-grow">
          <Logo />
          {Object.keys(onlinePeopleExcludeOurUser).map((userId: any) => (
            <Contact
              key={userId}
              id={userId}
              online={true}
              username={onlinePeopleExcludeOurUser[userId]}
              onClick={() => setSelectedUserId(userId)}
              selected={userId === selectedUserId}
            />
          ))}
          {Object.keys(offlinePeople).map((userId: any) => (
            <Contact
              key={userId}
              id={userId}
              online={false}
              username={offlinePeople[userId].username}
              onClick={() => setSelectedUserId(userId)}
              selected={userId === selectedUserId}
            />
          ))}
        </div>
        <div className="p-2 text-center flex items-center justify-center">
          <span className="mr-4 text-sm text-gray-600 flex items-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="w-5 h-5"
            >
              <path
                fillRule="evenodd"
                d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z"
                clipRule="evenodd"
              />
            </svg>
            {username}
          </span>
          <button
            onClick={logout}
            className="text-sm bg-blue-600 p-3 text-white border border-0 rounded-md"
          >
            Encerrar sessão
          </button>
        </div>
      </div>
      <div className="flex flex-col bg-blue-600 w-2/3 p-2">
        <div className="flex-grow">
          {!selectedUserId && (
            <div className="flex flex-grow h-full items-center justify-center">
              <div className="text-white text-base">
                &larr; Selecione uma pessoa
              </div>
            </div>
          )}
          {!!selectedUserId && (
            <div className="relative h-full">
              <div className="overflow-auto absolute top-0 left-0 right-0 bottom-2">
                {messagesWithoutDupes.map((message) => (
                  <div
                    key={message._id}
                    className={`${
                      message.sender === id ? "text-right mr-2" : "text-left"
                    }`}
                  >
                    <div
                      className={`text-left inline-block p-2 my-2 rounded-md text-sm ${
                        message.sender === id
                          ? "bg-blue-500 border border-1 border-white text-white"
                          : "bg-white border border-1 border-black text-gray-500"
                      }`}
                    >
                      {message.text}
                      {message.file && (
                        <div>
                          <a
                            target="_blank"
                            className="flex items-center gap-1 border-b"
                            href={`${api.defaults.baseURL}/uploads/${message.file}`}
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 24 24"
                              fill="currentColor"
                              className="w-4 h-4"
                            >
                              <path
                                fillRule="evenodd"
                                d="M18.97 3.659a2.25 2.25 0 00-3.182 0l-10.94 10.94a3.75 3.75 0 105.304 5.303l7.693-7.693a.75.75 0 011.06 1.06l-7.693 7.693a5.25 5.25 0 11-7.424-7.424l10.939-10.94a3.75 3.75 0 115.303 5.304L9.097 18.835l-.008.008-.007.007-.002.002-.003.002A2.25 2.25 0 015.91 15.66l7.81-7.81a.75.75 0 011.061 1.06l-7.81 7.81a.75.75 0 001.054 1.068L18.97 6.84a2.25 2.25 0 000-3.182z"
                                clipRule="evenodd"
                              />
                            </svg>
                            {message.file}
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                <div ref={divUnderMessages}></div>
              </div>
            </div>
          )}
        </div>
        {!!selectedUserId && (
          <form className="flex gap-2" onSubmit={sendMessage}>
            <input
              type="text"
              value={newMessageText}
              onChange={(e) => setNewMessageText(e.target.value)}
              placeholder="Escreva sua mensagem aqui"
              className="bg-white border border-0 p-2 flex-grow rounded-sm"
            />
            <button
              type="submit"
              className="bg-green-500 p-2 text-white rounded-sm"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="1.5"
                stroke="currentColor"
                className="w-6 h-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"
                />
              </svg>
            </button>
            <div className="relative">
              <button
                type="button"
                className="p-2 bg-blue-500 border border-blue-400 text-white rounded-sm"
                onClick={toggleMenu}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="w-6 h-6"
                >
                  <path
                    fillRule="evenodd"
                    d="M3 6.75A.75.75 0 013.75 6h16.5a.75.75 0 010 1.5H3.75A.75.75 0 013 6.75zM3 12a.75.75 0 01.75-.75h16.5a.75.75 0 010 1.5H3.75A.75.75 0 013 12zm0 5.25a.75.75 0 01.75-.75h16.5a.75.75 0 010 1.5H3.75a.75.75 0 01-.75-.75z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
              {isOpen && (
                <div className="absolute bottom-full right-0 mb-2 p-2 w-44 bg-white rounded-sm">
                  <div className="flex items-center justify-center block p-2 text-gray-600 hover:bg-blue-200 cursor-pointer">
                    <label className="flex items-center rounded-sm cursor-pointer">
                      <input
                        type="file"
                        className="hidden"
                        onChange={sendFile}
                      />
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        className="w-4 h-4 mr-1"
                      >
                        <path
                          fillRule="evenodd"
                          d="M18.97 3.659a2.25 2.25 0 00-3.182 0l-10.94 10.94a3.75 3.75 0 105.304 5.303l7.693-7.693a.75.75 0 011.06 1.06l-7.693 7.693a5.25 5.25 0 11-7.424-7.424l10.939-10.94a3.75 3.75 0 115.303 5.304L9.097 18.835l-.008.008-.007.007-.002.002-.003.002A2.25 2.25 0 015.91 15.66l7.81-7.81a.75.75 0 011.061 1.06l-7.81 7.81a.75.75 0 001.054 1.068L18.97 6.84a2.25 2.25 0 000-3.182z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <span className="text-base">Enviar arquivo</span>
                    </label>
                  </div>
                  <div className="flex items-center justify-center block p-2 text-gray-600 hover:bg-blue-200 cursor-pointer">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      className="w-4 h-4 mr-1"
                    >
                      <path
                        fillRule="evenodd"
                        d="M1.5 6a2.25 2.25 0 012.25-2.25h16.5A2.25 2.25 0 0122.5 6v12a2.25 2.25 0 01-2.25 2.25H3.75A2.25 2.25 0 011.5 18V6zM3 16.06V18c0 .414.336.75.75.75h16.5A.75.75 0 0021 18v-1.94l-2.69-2.689a1.5 1.5 0 00-2.12 0l-.88.879.97.97a.75.75 0 11-1.06 1.06l-5.16-5.159a1.5 1.5 0 00-2.12 0L3 16.061zm10.125-7.81a1.125 1.125 0 112.25 0 1.125 1.125 0 01-2.25 0z"
                        clipRule="evenodd"
                      />
                    </svg>

                    <span className="text-base">Papel de parede</span>
                  </div>
                </div>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default Chat;
