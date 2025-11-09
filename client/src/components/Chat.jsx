import React, { useContext, useEffect, useRef, useState } from "react";
import socket, { joinRoom, leaveRoom } from "../socket/socket";
import { AuthContext } from "../context/AuthContext";

const REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🎉"];

function RoomList({ rooms = ["global", "react", "random"], onJoin, currentRoom, isOpen, closeSidebar }) {
  return (
    <>
      <div
        className={`fixed top-0 left-0 h-full w-64 bg-gradient-to-b from-gray-900 to-gray-800 text-white p-6 flex flex-col transition-transform duration-300 rounded-r-2xl shadow-xl z-40
          ${isOpen ? "translate-x-0" : "-translate-x-full"} sm:translate-x-0`}
      >
        <h4 className="text-2xl font-bold mb-6 text-center tracking-wide">Rooms</h4>
        <ul className="space-y-3 flex-1">
          {rooms.map((r) => (
            <li key={r}>
              <button
                onClick={() => {
                  onJoin(r);
                  closeSidebar();
                }}
                className={`w-full text-left px-4 py-2 rounded-xl font-medium transition-all duration-200 shadow-inner ${
                  currentRoom === r
                    ? "bg-indigo-600 hover:bg-indigo-500"
                    : "bg-gray-700 hover:bg-gray-600"
                }`}
              >
                #{r}
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* Overlay on mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 sm:hidden z-30"
          onClick={closeSidebar}
        />
      )}
    </>
  );
}

export default function Chat({ room, setCurrentRoom }) {
  const { user, setUser } = useContext(AuthContext);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [typingUsers, setTypingUsers] = useState({});
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [privateRecipient, setPrivateRecipient] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [selectedMessageId, setSelectedMessageId] = useState(null);

  const messagesRef = useRef(null);
  const typingTimeout = useRef(null);

  const scrollToBottom = () => {
    requestAnimationFrame(() => {
      if (messagesRef.current)
        messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
    });
  };

  const sendMessage = (msg = text, type = "text") => {
    if (!msg.trim()) return;

    if (privateRecipient) {
      socket.emit("private_message", { to: privateRecipient.id, message: msg.trim(), type });
    } else {
      socket.emit("send_message", { message: msg.trim(), type, toRoom: room });
    }

    setText("");
    socket.emit("typing", false);
  };

  const handleTyping = (e) => {
    setText(e.target.value);
    socket.emit("typing", e.target.value.length > 0);

    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => socket.emit("typing", false), 300);
  };

  const leaveChat = () => {
    leaveRoom(room);
    setUser(null);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/api/chat/upload", { method: "POST", body: formData });
    const data = await res.json();
    sendMessage(data.url, "file");
  };

  useEffect(() => {
    if (!socket.connected) return;

    const handleMessage = (msg) => {
      setMessages((prev) => [...prev, msg]);
      scrollToBottom();
    };

    const handleReactionUpdate = (msg) => {
      setMessages((prev) => prev.map((m) => (m.id === msg.id ? msg : m)));
    };

    const handleTypingUsers = (users) => {
      const map = {};
      users.forEach((u) => (map[u] = true));
      setTypingUsers(map);
    };

    const handleOnlineUsers = (users) => setOnlineUsers(users);

    socket.on("receive_message", handleMessage);
    socket.on("private_message", handleMessage);
    socket.on("reaction_updated", handleReactionUpdate);
    socket.on("typing_users", handleTypingUsers);
    socket.on("user_list", handleOnlineUsers);

    joinRoom(room);

    return () => {
      socket.off("receive_message", handleMessage);
      socket.off("private_message", handleMessage);
      socket.off("reaction_updated", handleReactionUpdate);
      socket.off("typing_users", handleTypingUsers);
      socket.off("user_list", handleOnlineUsers);
      leaveRoom(room);
    };
  }, [room]);

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      {/* Sidebar */}
      <RoomList
        isOpen={sidebarOpen}
        closeSidebar={() => setSidebarOpen(false)}
        currentRoom={room}
        onJoin={(r) => {
          setCurrentRoom(r);
          setSidebarOpen(false);
        }}
      />

      {/* Main chat area */}
      <div className="flex-1 flex flex-col relative overflow-hidden sm:ml-64">
        {/* Top bar */}
        <div className="flex flex-wrap items-center justify-between p-2 sm:p-3 bg-white shadow-md sticky top-0 z-20 rounded-b-2xl">
          <button
            className="sm:hidden px-3 py-1 bg-indigo-600 text-white rounded-md z-40 shadow-lg mb-2 sm:mb-0"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? "❌" : "☰"}
          </button>
          <h3 className="text-base sm:text-lg font-semibold text-center flex-1 mb-2 sm:mb-0">
            Room: {room} {privateRecipient && `(Private to ${privateRecipient.username})`}
          </h3>
          <button
            onClick={leaveChat}
            className="px-3 py-1 bg-red-500 text-white rounded-md hover:bg-red-600 shadow-sm flex-shrink-0"
          >
            Logout
          </button>
        </div>

        {/* Online users */}
        <div className="flex gap-2 p-2 sm:p-3 overflow-x-auto bg-white shadow-inner rounded-xl mx-2 sm:mx-3 mt-2">
          {onlineUsers.map((u) => (
            <button
              key={u.id}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors duration-200 ${
                privateRecipient?.id === u.id
                  ? "bg-green-500 text-white shadow-md"
                  : "bg-gray-200 hover:bg-gray-300"
              }`}
              onClick={() => setPrivateRecipient(u)}
            >
              {u.username}
            </button>
          ))}
          {privateRecipient && (
            <button
              className="px-3 py-1 rounded-full bg-red-400 text-white shadow-md"
              onClick={() => setPrivateRecipient(null)}
            >
              Cancel Private
            </button>
          )}
        </div>

        {/* Messages */}
        <div
          ref={messagesRef}
          className="flex-1 overflow-auto p-2 sm:p-4 space-y-3 relative"
        >
          {messages.map((m) => {
            const isMe = m.senderId === user.id;
            const showMsg = !m.isPrivate || isMe || m.to === user.id;
            if (!showMsg) return null;

            return (
              <div
                key={m.id}
                className={`flex ${isMe ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[70%] p-3 rounded-2xl shadow-md backdrop-blur-sm relative cursor-pointer ${
                    isMe
                      ? "bg-indigo-600 text-white rounded-br-none"
                      : m.isPrivate
                      ? "bg-purple-200 text-purple-900 rounded-bl-none"
                      : "bg-white text-gray-900 rounded-bl-none"
                  }`}
                  onClick={() => setSelectedMessageId(m.id)}
                >
                  <div className="flex justify-between text-sm mb-1">
                    <span className={isMe ? "text-white/80" : "text-gray-600"}>
                      {m.sender}
                    </span>
                    <span className={isMe ? "text-white/70" : "text-gray-400"}>
                      {new Date(m.timestamp).toLocaleTimeString()}
                    </span>
                  </div>

                  <div className="break-words">
                    {m.type === "file" ? (
                      m.message.match(/\.(jpeg|jpg|gif|png)$/) ? (
                        <img
                          src={m.message}
                          alt="uploaded"
                          className="max-w-full rounded-md"
                        />
                      ) : (
                        <a
                          href={m.message}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 underline"
                        >
                          {m.message}
                        </a>
                      )
                    ) : (
                      m.message
                    )}
                  </div>

                  {m.reactions?.length > 0 && (
                    <div className="flex gap-1 mt-1 text-sm">
                      {m.reactions.map((r, idx) => (
                        <span
                          key={idx}
                          className="bg-gray-200 rounded-full px-1 text-xs"
                        >
                          {r.emoji}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Typing indicator */}
        {Object.keys(typingUsers).length > 0 && (
          <div className="text-sm text-gray-500 mt-1 italic p-3 ml-3">
            {Object.keys(typingUsers).join(", ")} typing...
          </div>
        )}

        {/* Input + File Upload + Reactions */}
        <div className="mt-2 sm:mt-4 p-2 sm:p-3 bg-white rounded-t-2xl shadow-lg mx-2 sm:mx-3 mb-2 sm:mb-3 flex gap-2 items-center flex-wrap relative">
          <input
            type="file"
            id="file-upload"
            className="hidden"
            onChange={handleFileUpload}
          />
          <label
            htmlFor="file-upload"
            className="flex items-center justify-center w-10 h-10 bg-indigo-500 text-white text-2xl font-bold rounded-full cursor-pointer shadow-md hover:bg-indigo-600 transition-colors flex-shrink-0"
          >
            +
          </label>

          {/* Reaction button */}
          <button
            type="button"
            className="flex items-center justify-center w-10 h-10 bg-yellow-400 text-2xl rounded-full shadow-md hover:bg-yellow-500 transition-colors flex-shrink-0"
            onClick={() => {
              if (!selectedMessageId) {
                alert("Please tap a message first to react!");
                return;
              }
              setShowReactionPicker(!showReactionPicker);
            }}
          >
            😀
          </button>

          {showReactionPicker && selectedMessageId && (
            <div className="absolute bottom-16 left-2 sm:left-16 bg-white rounded-xl shadow-md p-2 flex gap-2 z-50">
              {REACTIONS.map((r) => (
                <button
                  key={r}
                  className="text-2xl hover:scale-125 transition-transform"
                  onClick={() => {
                    socket.emit("add_reaction", { messageId: selectedMessageId, emoji: r });
                    setShowReactionPicker(false);
                  }}
                >
                  {r}
                </button>
              ))}
            </div>
          )}

          <input
            value={text}
            onChange={handleTyping}
            placeholder="Type a message..."
            className="flex-1 min-w-[80px] px-4 py-2 border rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-400 shadow-inner"
          />
          <button
            type="button"
            onClick={() => sendMessage()}
            className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-full hover:from-indigo-600 hover:to-purple-600 shadow-md transition-colors flex-shrink-0"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
