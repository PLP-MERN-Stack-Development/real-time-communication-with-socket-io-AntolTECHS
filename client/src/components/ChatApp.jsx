import React, { useContext, useState } from "react";
import { AuthContext } from "../context/AuthContext";
import Chat from "./Chat";
import Login from "./Login";

export default function ChatApp() {
  const { user } = useContext(AuthContext);
  const [currentRoom, setCurrentRoom] = useState("global");

  if (!user) return <Login />;

  return (
    <div className="h-screen">
      <Chat room={currentRoom} setCurrentRoom={setCurrentRoom} />
    </div>
  );
}
