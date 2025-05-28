import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useNavigate } from 'react-router-dom';

interface GameState {
    room: string | null;
    symbol: 'X' | 'O' | null;
    isMyTurn: boolean;
    opponent: string | null;
    gameStatus: 'waiting' | 'playing' | 'finished';
    board: Array<string | null>;
    winner: string | null;
    isDraw: boolean;
}

interface SocketContextType {
    isConnected: boolean;
    gameState: GameState;
    findGame: () => void;
    makeMove: (position: number) => void;
    socket: Socket | null;
}

const initialGameState: GameState = {
    room: null,
    symbol: null,
    isMyTurn: false,
    opponent: null,
    gameStatus: 'waiting',
    board: Array(9).fill(null),
    winner: null,
    isDraw: false
};

const SocketContext = createContext<SocketContextType | null>(null);

export const useSocket = () => {
    const context = useContext(SocketContext);
    if (!context) {
        throw new Error('useSocket must be used within a SocketProvider');
    }
    return context;
};

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const navigate = useNavigate();
    const [socket, setSocket] = useState<Socket | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [gameState, setGameState] = useState<GameState>(initialGameState);

    const handleGameStart = useCallback((data: {
        room: string;
        symbol: 'X' | 'O';
        opponent: string;
        isMyTurn: boolean;
    }) => {
        console.log('Game starting:', data);
        setGameState({
            room: data.room,
            symbol: data.symbol,
            opponent: data.opponent,
            isMyTurn: data.isMyTurn,
            gameStatus: 'playing',
            board: Array(9).fill(null),
            winner: null,
            isDraw: false
        });
        navigate(`/game?room=${data.room}`);
    }, [navigate]);

    useEffect(() => {
        console.log('Initializing socket connection...');
        const newSocket = io('http://localhost:3001', {
            transports: ['websocket'],
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            timeout: 10000
        });

        setSocket(newSocket);

        newSocket.on('connect', () => {
            console.log('Socket connected:', newSocket.id);
            setIsConnected(true);
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            const username = user?.username || 'Guest';
            console.log('Registering as:', username);
            newSocket.emit('register_player', username);
        });

        newSocket.on('connect_error', (error) => {
            console.error('Connection error:', error);
            setIsConnected(false);
        });

        newSocket.on('disconnect', () => {
            console.log('Socket disconnected');
            setIsConnected(false);
            setGameState(initialGameState);
        });

        newSocket.on('waiting_for_opponent', () => {
            console.log('Waiting for opponent...');
            setGameState(prev => ({
                ...prev,
                gameStatus: 'waiting'
            }));
        });

        newSocket.on('game_start', handleGameStart);

        newSocket.on('error', (error: { message: string }) => {
            console.error('Socket error:', error);
            // You might want to show this error to the user through a toast or alert
        });

        newSocket.on('move_made', (data: {
            position: number;
            symbol: string;
            nextTurn: string;
            board: Array<string | null>;
            gameStatus: string;
        }) => {
            console.log('Move made:', data);
            setGameState(prev => ({
                ...prev,
                board: data.board,
                isMyTurn: socket?.id === data.nextTurn,
                gameStatus: data.gameStatus as 'waiting' | 'playing' | 'finished'
            }));
        });

        newSocket.on('game_end', (data: {
            winner: string | null;
            isDraw: boolean;
            finalState: Array<string | null>;
            gameStatus: 'finished';
        }) => {
            console.log('Game ended:', data);
            setGameState(prev => ({
                ...prev,
                board: data.finalState,
                winner: data.winner,
                isDraw: data.isDraw,
                gameStatus: data.gameStatus,
                isMyTurn: false
            }));
        });

        return () => {
            console.log('Cleaning up socket connection...');
            newSocket.off('connect');
            newSocket.off('disconnect');
            newSocket.off('game_start');
            newSocket.off('move_made');
            newSocket.off('game_end');
            newSocket.off('error');
            newSocket.close();
        };
    }, [navigate, handleGameStart]);

    const findGame = useCallback(() => {
        if (socket && isConnected) {
            socket.emit('find_game');
        }
    }, [socket, isConnected]);    const makeMove = useCallback((position: number) => {
        console.log('Making move:', { position, gameState });
        if (!socket || !isConnected) {
            console.error('Socket not connected');
            return;
        }
        
        if (!gameState.room) {
            console.error('Not in a game room');
            return;
        }

        if (gameState.gameStatus !== 'playing') {
            console.error('Game is not in playing state');
            return;
        }

        if (!gameState.isMyTurn) {
            console.error('Not your turn');
            return;
        }

        console.log('Emitting move:', { position, room: gameState.room });
        socket.emit('make_move', { position, roomId: gameState.room });
    }, [socket, isConnected, gameState]);

    return (
        <SocketContext.Provider value={{
            isConnected,
            gameState,
            findGame,
            makeMove,
            socket
        }}>
            {children}
        </SocketContext.Provider>
    );
};