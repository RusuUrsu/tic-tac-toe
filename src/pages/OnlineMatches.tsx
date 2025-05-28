import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
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

    useEffect(() => {
        if (!isAuthenticated) {
            navigate('/login');
            return;
        }

        // Listen for room updates
        socket?.on('rooms_update', (updatedRooms: Room[]) => {
            setRooms(updatedRooms || []);
            setIsLoading(false);
        });

        socket?.on('error', (error: { message: string }) => {
            setError(error.message);
            setTimeout(() => setError(null), 5000);
        });        // Request initial rooms list
        socket?.emit('get_rooms');        return () => {
            socket?.off('rooms_update');
            socket?.off('error');
        };
    }, [isAuthenticated, navigate, socket]);

    const createRoom = () => {
        if (!roomName.trim()) {
            setError('Please enter a room name');
            return;
        }
        socket?.emit('create_room', { name: roomName });
        setIsCreatingRoom(false);
        setRoomName('');
    };

    const joinRoom = (roomId: string) => {
        socket?.emit('join_room', roomId);
    };

    return (
        <div className="online-matches">
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
