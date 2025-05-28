import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

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
    const [socket, setSocket] = useState<Socket | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [gameState, setGameState] = useState<GameState>(initialGameState);

    useEffect(() => {
        console.log('Initializing socket connection...');
        const newSocket = io('http://localhost:3002', {
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
            const username = localStorage.getItem('username') || 'Guest';
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

        newSocket.on('game_start', (data: {
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
        });

        newSocket.on('move_made', (data: {
            position: number;
            symbol: string;
            nextTurn: string;
        }) => {
            console.log('Move made:', data);
            setGameState(prev => ({
                ...prev,
                board: prev.board.map((cell, index) => 
                    index === data.position ? data.symbol : cell
                ),
                isMyTurn: data.nextTurn === newSocket.id
            }));
        });

        newSocket.on('game_end', (data: {
            winner: string | null;
            isDraw: boolean;
            finalState: Array<string | null>;
        }) => {
            console.log('Game ended:', data);
            setGameState(prev => ({
                ...prev,
                gameStatus: 'finished',
                board: data.finalState,
                winner: data.winner === newSocket.id ? 'You' : data.winner ? 'Opponent' : null,
                isDraw: data.isDraw
            }));
        });

        newSocket.on('opponent_disconnected', () => {
            console.log('Opponent disconnected');
            setGameState(prev => ({
                ...prev,
                gameStatus: 'finished',
                winner: 'Opponent disconnected'
            }));
        });

        return () => {
            console.log('Cleaning up socket connection...');
            newSocket.close();
        };
    }, []);

    const findGame = () => {
        if (socket && isConnected) {
            console.log('Finding game...');
            socket.emit('find_game');
        }
    };

    const makeMove = (position: number) => {
        if (socket && isConnected && gameState.isMyTurn && gameState.gameStatus === 'playing') {
            console.log('Making move:', position);
            socket.emit('make_move', { position });
        }
    };

    return (
        <SocketContext.Provider value={{
            isConnected,
            gameState,
            findGame,
            makeMove
        }}>
            {children}
        </SocketContext.Provider>
    );
};
