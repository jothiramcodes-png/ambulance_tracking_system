import { createContext, useContext, useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import config from '../config';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const { token } = useAuth();
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [locationUpdates, setLocationUpdates] = useState([]);
  const [greenCorridors, setGreenCorridors] = useState([]);
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    if (!token) return;

    const socket = io(config.SOCKET_URL, { transports: ['websocket'] });
    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      socket.emit('join_room', 'tracking_room');
      socket.emit('join_room', 'admin_room');
    });

    socket.on('disconnect', () => setConnected(false));

    socket.on('location_update', (data) => {
      setLocationUpdates(prev => {
        const idx = prev.findIndex(l => l.ambulanceId === data.ambulanceId);
        if (idx >= 0) { const next = [...prev]; next[idx] = data; return next; }
        return [...prev, data];
      });
    });

    socket.on('green_corridor_active', (data) => {
      setGreenCorridors(prev => {
        const idx = prev.findIndex(g => g.junctionId === data.junctionId);
        if (idx >= 0) { const next = [...prev]; next[idx] = data; return next; }
        return [...prev, data];
      });
    });

    socket.on('green_corridor_reset', (data) => {
      setGreenCorridors(prev => prev.filter(g => g.junctionId !== data.junctionId));
    });

    socket.on('new_emergency_alert', (data) => {
      setAlerts(prev => [{ ...data, id: Date.now() }, ...prev.slice(0, 9)]);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [token]);

  const emit = (event, data) => {
    if (socketRef.current) socketRef.current.emit(event, data);
  };

  return (
    <SocketContext.Provider value={{ connected, locationUpdates, greenCorridors, alerts, emit, socket: socketRef.current }}>
      {children}
    </SocketContext.Provider>
  );
}

export const useSocket = () => useContext(SocketContext);
