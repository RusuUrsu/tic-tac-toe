import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useNavigate } from 'react-router-dom';
import { SOCKET_URL, API_BASE } from '../config';

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

    // Add a function to save game history to the API
    const saveGameHistory = useCallback(async (
        gameType: 'online',
        result: 'win' | 'loss' | 'draw',
        winner: 'X' | 'O' | 'draw',
        opponent: string
    ) => {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                console.log('No token found, skipping game history save');
                return;
            }

            console.log('Saving game history:', { gameType, result, winner, opponent });
            
            const response = await fetch(`${API_BASE}/api/games/save`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    gameType,
                    result,
                    winner,
                    opponent,
                    gameMode: 'online'
                })
            });

            if (response.ok) {
                console.log('Game history saved successfully');
            } else {
                console.error('Failed to save game history:', await response.text());
            }
        } catch (error) {
            console.error('Error saving game history:', error);
        }
    }, []);

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
        console.log(`Connecting to server at: ${SOCKET_URL}`);
        const newSocket = io(SOCKET_URL, {
            transports: ['websocket', 'polling'], // Adding polling as a fallback
            reconnection: true,
            reconnectionAttempts: 10,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            timeout: 20000,
            forceNew: false,
            upgrade: true,
            rememberUpgrade: true
        });

        setSocket(newSocket);

        // Handle page visibility changes to maintain connection
        const handleVisibilityChange = () => {
            if (document.hidden) {
                console.log('Page hidden, maintaining socket connection');
                // Don't disconnect when page is hidden
            } else {
                console.log('Page visible, ensuring socket connection');
                if (!newSocket.connected) {
                    newSocket.connect();
                }
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

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
            console.log('Current socket ID:', newSocket.id);
            console.log('Next turn should be for:', data.nextTurn);
            
            // Fix: properly determine if it's my turn
            const isMyTurn = data.nextTurn === newSocket.id;
            console.log('Is it my turn?', isMyTurn);
            
            setGameState(prev => ({
                ...prev,
                board: data.board,
                isMyTurn: isMyTurn,
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
            
            // Update the game state
            setGameState(prev => {
                const updatedState = {
                    ...prev,
                    board: data.finalState,
                    winner: data.winner === newSocket.id ? 'You' : data.winner ? 'Opponent' : null,
                    isDraw: data.isDraw,
                    gameStatus: data.gameStatus,
                    isMyTurn: false
                };
                
                // Save game history after each completed game
                if (prev.opponent && prev.symbol) {
                    const mySymbol = prev.symbol;
                    let result: 'win' | 'loss' | 'draw';
                    let winner: 'X' | 'O' | 'draw';
                    
                    if (data.isDraw) {
                        result = 'draw';
                        winner = 'draw';
                    } else if (data.winner === newSocket.id) {
                        result = 'win';
                        winner = mySymbol;
                    } else {
                        result = 'loss';
                        winner = mySymbol === 'X' ? 'O' : 'X';
                    }
                    
                    // Save the game history to the database
                    saveGameHistory('online', result, winner, prev.opponent);
                }
                
                return updatedState;
            });
        });

        return () => {
            console.log('Cleaning up socket connection...');
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            newSocket.off('connect');
            newSocket.off('disconnect');
            newSocket.off('game_start');
            newSocket.off('move_made');
            newSocket.off('game_end');
            newSocket.off('error');
            newSocket.close();
        };
    }, [navigate, handleGameStart, saveGameHistory]);

    const findGame = useCallback(() => {
        if (socket && isConnected) {
            socket.emit('find_game');
        }
    }, [socket, isConnected]);

    const makeMove = useCallback((position: number) => {
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
        
        // Immediately update local state to prevent double moves
        setGameState(prev => ({
            ...prev,
            isMyTurn: false,
            board: prev.board.map((cell, idx) => 
                idx === position ? gameState.symbol : cell
            )
        }));
        
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