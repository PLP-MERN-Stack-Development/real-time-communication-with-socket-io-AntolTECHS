import React, { useContext, useState } from 'react';
import { connect } from '../socket/socket';
import { AuthContext } from '../context/AuthContext';

export default function Login() {
  const { setUser } = useContext(AuthContext);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const handle = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setLoading(true);
    connect(trimmed, (res) => {
      setLoading(false);
      if (res && res.ok) {
        setUser({ id: res.userId, username: res.username });
      } else {
        alert('Login failed');
      }
    });
  };

  return (
    <div className="min-h-screen flex items-start justify-center bg-slate-50 p-8">
      <div className="w-full max-w-md bg-white rounded-xl shadow-md p-6">
        <h2 className="text-2xl font-semibold mb-2">Sign in</h2>
        <p className="text-sm text-gray-500 mb-4">Choose a username</p>

        <label className="block">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter username"
            className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
            onKeyDown={(e) => { if (e.key === 'Enter') handle(); }}
            disabled={loading}
            aria-label="username"
          />
        </label>

        <div className="mt-4 flex justify-end">
          <button
            onClick={handle}
            className={`px-4 py-2 rounded-md text-white ${loading ? 'bg-blue-300 cursor-wait' : 'bg-blue-600 hover:bg-blue-700'}`}
            disabled={loading}
          >
            {loading ? 'Joining…' : 'Join'}
          </button>
        </div>
      </div>
    </div>
  );
}
