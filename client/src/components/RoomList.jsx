import React from 'react';

function RoomList({
  rooms = ['global', 'react', 'random'],
  onJoin,
  currentRoom,
  isOpen,
  closeSidebar,
}) {
  return (
    <>
      {/* Sidebar */}
      <div
        className={`fixed top-0 left-0 h-full w-64 bg-gray-900 text-white p-6 rounded-r-lg shadow-md flex flex-col transform transition-transform duration-300
        ${isOpen ? 'translate-x-0' : '-translate-x-full'} sm:translate-x-0 sm:relative sm:flex`}
      >
        <h4 className="text-xl font-semibold mb-4">Rooms</h4>

        <ul className="space-y-2 flex-1">
          {rooms.map((r) => (
            <li key={r}>
              <button
                onClick={() => {
                  onJoin(r);
                  closeSidebar(); // close sidebar on mobile after selecting
                }}
                className={`w-full text-left px-3 py-2 rounded-md transition-colors ${
                  currentRoom === r
                    ? 'bg-gray-700'
                    : 'bg-gray-800 hover:bg-gray-700'
                }`}
              >
                #{r}
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* Overlay for small screens */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black opacity-50 sm:hidden"
          onClick={closeSidebar}
        ></div>
      )}
    </>
  );
}

export default RoomList;
