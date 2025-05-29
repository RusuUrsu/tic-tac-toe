import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import ConnectionDebugger from '../components/ConnectionDebugger';
import '../styles/OnlineMatches.css';

interface Room {
    id: string;
    name: string;
    host: string;
    hostUsername: string;
    status: 'waiting' | 'playing';
    players: string[];
}

export default function OnlineMatches() {
    const navigate = useNavigate();
    const { isAuthenticated, user } = useAuth();
    const { isConnected, socket } = useSocket();
    const [rooms, setRooms] = useState<Room[]>([]);
    const [isCreatingRoom, setIsCreatingRoom] = useState(false);
    const [roomName, setRoomName] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [debugInfo, setDebugInfo] = useState<string | null>(null);

    useEffect(() => {
        if (!isAuthenticated) {
            navigate('/login');
            return;
        }

        // Listen for room updates
        socket?.on('rooms_update', (updatedRooms: Room[]) => {
            console.log('Received rooms update:', updatedRooms);
            setRooms(updatedRooms || []);
            setIsLoading(false);
        });

        socket?.on('error', (error: { message: string }) => {
            setError(error.message);
            setTimeout(() => setError(null), 5000);
        });
        
        // Listen for game start event to navigate to game
        socket?.on('game_start', (data: {
            room: string;
            symbol: 'X' | 'O';
            opponent: string | null;
            isMyTurn: boolean;
            gameStatus: string;
        }) => {
            console.log('Game starting from OnlineMatches:', data);
            navigate(`/game?room=${data.room}`);
        });

        // Request initial rooms list
        socket?.emit('get_rooms');
          // Request rooms immediately when connected
        if (socket && isConnected) {
            console.log('Initially requesting rooms list');
            socket.emit('get_rooms');
        }
        
        // Set up periodic room refresh
        const intervalId = setInterval(() => {
            if (socket && isConnected) {
                console.log('Requesting updated rooms list');
                socket.emit('get_rooms');
            }
        }, 3000); // Refresh every 3 seconds for more responsiveness

        return () => {
            socket?.off('rooms_update');
            socket?.off('error');
            socket?.off('game_start');
            clearInterval(intervalId);
        };
    }, [isAuthenticated, navigate, socket, isConnected]);

    // Add a debug effect
    useEffect(() => {
        if (socket) {
            // Check the socket connection state
            setDebugInfo(`Socket ID: ${socket.id || 'not assigned'}, Connected: ${isConnected}, 
                          Socket instance exists: ${!!socket}`);
            
            // Add additional debug listeners
            socket.on('connect_error', (err) => {
                console.error('Connection error:', err);
                setDebugInfo(`Connection error: ${err.message}`);
            });
            
            socket.io.on('reconnect_attempt', (attempt) => {
                console.log(`Reconnection attempt ${attempt}`);
                setDebugInfo(`Reconnection attempt ${attempt}`);
            });
            
            // Emit a specific debug event to test connection
            socket.emit('get_rooms');
        }
        
        return () => {
            socket?.off('connect_error');
            if (socket?.io) {
                socket.io.off('reconnect_attempt');
            }
        };
    }, [socket, isConnected]);

    const createRoom = () => {
        if (!roomName.trim()) {
            setError('Please enter a room name');
            return;
        }
        console.log('Creating room with name:', roomName);
        socket?.emit('create_room', { name: roomName });
        setIsCreatingRoom(false);
        setRoomName('');
    };

    const joinRoom = (roomId: string) => {
        console.log('Joining room with ID:', roomId);
        socket?.emit('join_room', roomId);
    };    return (
        <div className="online-matches">
            <ConnectionDebugger />
            <h2>Online Matches</h2>
            
            <div className="online-matches-header">
                <div className="online-status">
                    {isConnected ? (
                        <span className="status-connected">🟢 Connected</span>
                    ) : (
                        <span className="status-disconnected">🔴 Disconnected</span>
                    )}
                </div>
                <button 
                    className="create-room-btn"
                    onClick={() => setIsCreatingRoom(true)}
                    disabled={!isConnected}
                >
                    Create Room
                </button>
            </div>

            {error && <div className="error-message">{error}</div>}
            {debugInfo && <div className="debug-info" style={{ fontSize: '12px', color: '#666', margin: '10px 0', padding: '8px', background: '#f5f5f5' }}>
                <strong>Debug Info:</strong> {debugInfo}
            </div>}
            
            <div className="rooms-list">
                {isLoading ? (
                    <div className="loading">Loading rooms...</div>
                ) : (rooms && rooms.length > 0) ? (
                    rooms.map(room => (                        <div key={room.id} className={`room-item ${room.status}`}>
                            <div className="room-info">
                                <span className="room-name">{room.name}</span>
                                <span className="host-name">Host: {room.hostUsername}</span>
                                <span className="players-count">
                                    {room.players.length}/2 Players
                                </span>
                                <span className={`room-status ${room.status}`}>
                                    {room.status === 'waiting' ? 'Waiting for player' : 'Game in progress'}
                                </span>
                            </div>
                            {room.status === 'waiting' && room.host !== user?.id && (
                                <button 
                                    className="join-btn"
                                    onClick={() => joinRoom(room.id)}
                                >
                                    Join
                                </button>
                            )}
                            {room.host === user?.id && (
                                <span className="your-room-badge">Your Room</span>
                            )}
                        </div>
                    ))
                ) : (
                    <div className="no-rooms">
                        No active rooms. Create one to start playing!
                    </div>
                )}
            </div>

            {isCreatingRoom && (
                <div className="create-room-dialog">
                    <div className="dialog-content">
                        <h3>Create New Room</h3>
                        <input
                            type="text"
                            placeholder="Enter room name"
                            value={roomName}
                            onChange={(e) => setRoomName(e.target.value)}
                            maxLength={30}
                            autoFocus
                        />
                        <div className="dialog-buttons">
                            <button onClick={createRoom}>Create</button>
                            <button onClick={() => {
                                setIsCreatingRoom(false);
                                setRoomName('');
                            }}>Cancel</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
