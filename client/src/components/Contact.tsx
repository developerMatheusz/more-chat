import Avatar from "./Avatar";

const Contact = ({ id, username, onClick, selected, online }: any) => {
  return (
    <div
      key={id}
      onClick={() => onClick(id)}
      className={`${
        selected ? "bg-blue-50" : ""
      } border-b border-gray-100 flex items-center gap-2 cursor-pointer`}
    >
      {selected && <div className="w-1 bg-blue-500 h-12 rounded-r-md"></div>}
      <div className="flex gap-2 py-2 pl-4 items-center">
        <Avatar online={online} username={username} userId={id} />
        <span className="text-gray-800">{username}</span>
      </div>
    </div>
  );
};

export default Contact;
