import { useEffect } from 'react';
import socket from '../socket/socket';

export function useSocket(event, handler) {
  useEffect(() => {
    if (!handler) return;
    socket.on(event, handler);
    return () => socket.off(event, handler);
  }, [event, handler]);
}
