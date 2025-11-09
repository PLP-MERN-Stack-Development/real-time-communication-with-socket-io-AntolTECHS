import React, { useContext } from 'react';
import { AuthProvider, AuthContext } from './context/AuthContext';
import Login from './components/Login';
import ChatApp from './components/ChatApp'; // contains room switching

function Root() {
  const { user } = useContext(AuthContext);
  return user ? <ChatApp /> : <Login />;
}

export default function App() {
  return (
    <AuthProvider>
      <Root />
    </AuthProvider>
  );
}
