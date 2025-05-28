import { Server, Socket } from 'socket.io';

interface GameRoom {
    id: string;
    name: string;
    players: string[];
    currentTurn: string;
    gameState: Array<string | null>;
    gameStatus: 'waiting' | 'playing' | 'finished';
    host: string;
    hostUsername: string;
}

interface Player {
    id: string;
    username: string;
    room?: string;
}

class SocketManager {
    private io: Server;
    private rooms: Map<string, GameRoom>;
    private players: Map<string, Player>;
    private waitingPlayers: string[];

    constructor(io: Server) {
        this.io = io;
        this.rooms = new Map();
        this.players = new Map();
        this.waitingPlayers = [];
        this.setupSocketHandlers();
        console.log('SocketManager initialized');
    }

    private setupSocketHandlers() {
        this.io.on('connection', (socket: Socket) => {
            console.log(`Player connected: ${socket.id}`);

            socket.on('register_player', (username: string) => {
                try {
                    console.log(`[register_player] Registering ${username} (${socket.id})`);
                    this.registerPlayer(socket, username);
                } catch (error) {
                    console.error('[register_player] Error:', error);
                    socket.emit('error', { message: 'Failed to register player' });
                }
            });

            socket.on('create_room', (data: { name: string }) => {
                try {
                    console.log(`[create_room] Request from ${socket.id}:`, data);
                    this.createRoom(socket, data);
                } catch (error) {
                    console.error('[create_room] Error:', error);
                    socket.emit('error', { message: 'Failed to create room' });
                }
            });

            socket.on('join_room', (roomId: string) => {
                try {
                    console.log(`[join_room] Request from ${socket.id} for room ${roomId}`);
                    this.joinRoom(socket, roomId);
                } catch (error) {
                    console.error('[join_room] Error:', error);
                    socket.emit('error', { message: 'Failed to join room' });
                }
            });

            socket.on('make_move', (data: { position: number; roomId: string }) => {
                try {
                    console.log(`[make_move] Request from ${socket.id}:`, data);
                    this.handleMove(socket, data);
                } catch (error) {
                    console.error('[make_move] Error:', error);
                    socket.emit('error', { message: 'Failed to make move' });
                }
            });

            socket.on('get_rooms', () => {
                try {
                    console.log(`[get_rooms] Request from ${socket.id}`);
                    this.sendRoomsList(socket);
                } catch (error) {
                    console.error('[get_rooms] Error:', error);
                    socket.emit('error', { message: 'Failed to get rooms list' });
                }
            });

            socket.on('disconnect', () => {
                try {
                    console.log(`[disconnect] Player ${socket.id} disconnecting`);
                    this.handleDisconnect(socket);
                } catch (error) {
                    console.error('[disconnect] Error:', error);
                }
            });

            socket.on('error', (error) => {
                console.error(`[socket error] From ${socket.id}:`, error);
            });
        });
    }    private registerPlayer(socket: Socket, username: string) {
        console.log(`[registerPlayer] Registering player: ${username} (${socket.id})`);
        
        // Check for existing player
        const existingPlayer = this.players.get(socket.id);
        username = username || existingPlayer?.username || 'Guest';

        // Remove from waiting list if present
        this.waitingPlayers = this.waitingPlayers.filter(id => id !== socket.id);

        // Handle existing room membership
        if (existingPlayer?.room) {
            console.log(`[registerPlayer] Player ${socket.id} was in room ${existingPlayer.room}`);
            const existingRoom = this.rooms.get(existingPlayer.room);
            if (existingRoom) {
                // Remove player from room
                existingRoom.players = existingRoom.players.filter(id => id !== socket.id);
                socket.leave(existingRoom.id);
                
                // Clean up empty room
                if (existingRoom.players.length === 0) {
                    console.log(`[registerPlayer] Removing empty room ${existingRoom.id}`);
                    this.rooms.delete(existingRoom.id);
                }
            }
        }

        // Create or update player
        const player = {
            id: socket.id,
            username: username,
            room: undefined // Always start with no room
        };
        
        this.players.set(socket.id, player);
        
        console.log(`[registerPlayer] Player registered successfully:`, player);
        socket.emit('registration_complete', { id: socket.id, username });
    }    private findGame(socket: Socket) {
        const player = this.players.get(socket.id);
        if (!player) {
            console.log(`Player not found for socket ${socket.id}`);
            return;
        }

        console.log(`Finding game for player ${player.username} (${socket.id})`);

        // If player is already in a game room, leave it
        if (player.room) {
            const currentRoom = this.rooms.get(player.room);
            if (currentRoom) {
                currentRoom.players = currentRoom.players.filter(id => id !== socket.id);
                if (currentRoom.players.length === 0) {
                    this.rooms.delete(player.room);
                }
            }
            socket.leave(player.room);
            player.room = undefined;
        }

        // Remove this player from waiting list if they were already in it
        this.waitingPlayers = this.waitingPlayers.filter(id => id !== socket.id);

        // Find another waiting player
        const opponent = this.waitingPlayers[0];
        if (opponent && opponent !== socket.id) {
            // Remove the opponent from waiting list
            this.waitingPlayers = this.waitingPlayers.filter(id => id !== opponent);
            console.log(`Matching players: ${socket.id} with ${opponent}`);
            this.createGame(socket.id, opponent);
        } else {
            // No opponent found, add this player to waiting list
            this.waitingPlayers.push(socket.id);
            console.log(`Player ${socket.id} is waiting for opponent`);
            socket.emit('waiting_for_opponent');
        }
    }    private createGame(player1Id: string, player2Id: string) {
        const roomId = `game_${Date.now()}`;
        const player1 = this.players.get(player1Id);
        const player2 = this.players.get(player2Id);

        if (!player1 || !player2) {
            console.error('One or both players not found:', { player1Id, player2Id });
            return;
        }

        console.log('Creating game between:', player1.username, 'and', player2.username);

        // Clean up any existing rooms for these players
        [player1Id, player2Id].forEach(playerId => {
            const player = this.players.get(playerId);
            if (player?.room) {
                this.rooms.delete(player.room);
            }
        });        const gameRoom: GameRoom = {
            id: roomId,
            name: `Game between ${player1.username} and ${player2.username}`,
            players: [player1Id, player2Id],
            currentTurn: player1Id,
            gameState: Array(9).fill(null),
            gameStatus: 'playing',
            host: player1Id,
            hostUsername: player1.username
        };

        this.rooms.set(roomId, gameRoom);
        
        // Update player room references
        player1.room = roomId;
        player2.room = roomId;

        // Make players join the socket.io room
        const socket1 = this.io.sockets.sockets.get(player1Id);
        const socket2 = this.io.sockets.sockets.get(player2Id);
        
        if (socket1) socket1.join(roomId);
        if (socket2) socket2.join(roomId);

        // Notify players of game start
        this.io.to(player1Id).emit('game_start', {
            room: roomId,
            symbol: 'X',
            opponent: player2.username || 'Guest',
            isMyTurn: true,
            gameStatus: 'playing'
        });

        this.io.to(player2Id).emit('game_start', {
            room: roomId,
            symbol: 'O',
            opponent: player1.username || 'Guest',
            isMyTurn: false,
            gameStatus: 'playing'
        });
    }    private handleMove(socket: Socket, data: { position: number; roomId: string }) {
        console.log(`Handle move from ${socket.id}:`, data);
        
        const player = this.players.get(socket.id);
        if (!player) {
            console.error('Player not found');
            socket.emit('error', { message: 'Player not found' });
            return;
        }

        const room = this.rooms.get(data.roomId);
        if (!room) {
            console.error(`Room ${data.roomId} not found`);
            socket.emit('error', { message: 'Game room not found' });
            return;
        }

        // Validate room membership and state
        if (!room.players.includes(socket.id)) {
            console.error(`Player ${socket.id} attempted move in room ${data.roomId} but is not a member`);
            console.log('Room players:', room.players);
            console.log('Player room:', player.room);
            socket.emit('error', { message: 'You are not in this game' });
            return;
        }

        if (room.gameStatus !== 'playing') {
            console.error(`Invalid game status: ${room.gameStatus}`);
            socket.emit('error', { message: 'Game is not in progress' });
            return;
        }

        if (room.currentTurn !== socket.id) {
            console.error('Not player\'s turn');
            socket.emit('error', { message: 'Not your turn' });
            return;
        }

        if (room.gameState[data.position] !== null) {
            console.error('Position already taken');
            socket.emit('error', { message: 'Position already taken' });
            return;
        }

        // Make the move
        const symbol = room.players[0] === socket.id ? 'X' : 'O';
        room.gameState[data.position] = symbol;

        console.log(`Move made in room ${data.roomId}:`, {
            player: socket.id,
            position: data.position,
            symbol
        });

        const gameResult = this.checkGameResult(room.gameState);
        if (gameResult.isEnd) {
            room.gameStatus = 'finished';
            const winnerUsername = gameResult.winner ? player.username : null;
            
            // Emit game end event to all players in the room
            this.io.to(room.id).emit('game_end', {
                winner: winnerUsername,
                isDraw: gameResult.isDraw,
                finalState: room.gameState,
                gameStatus: 'finished'
            });

            // Clean up the room after game ends
            this.rooms.delete(room.id);
            room.players.forEach(playerId => {
                const p = this.players.get(playerId);
                if (p) p.room = undefined;
            });
        } else {
            // Update turn
            room.currentTurn = room.players.find(id => id !== socket.id)!;
            
            // Broadcast move to all players in the room
            this.io.to(room.id).emit('move_made', {
                position: data.position,
                symbol,
                nextTurn: room.currentTurn,
                board: room.gameState,
                gameStatus: 'playing'
            });
        }
    }

    private checkGameResult(gameState: Array<string | null>) {
        const winPatterns = [
            [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
            [0, 3, 6], [1, 4, 7], [2, 5, 8], // Columns
            [0, 4, 8], [2, 4, 6] // Diagonals
        ];

        for (const pattern of winPatterns) {
            const [a, b, c] = pattern;
            if (gameState[a] && gameState[a] === gameState[b] && gameState[a] === gameState[c]) {
                return { isEnd: true, winner: true, isDraw: false };
            }
        }

        if (gameState.every(cell => cell !== null)) {
            return { isEnd: true, winner: false, isDraw: true };
        }

        return { isEnd: false, winner: false, isDraw: false };
    }    private handleDisconnect(socket: Socket) {
        console.log(`Player disconnecting: ${socket.id}`);
        const player = this.players.get(socket.id);
        if (player?.room) {
            const room = this.rooms.get(player.room);
            if (room) {
                console.log(`Cleaning up room ${room.id}`);
                // Mark the room as finished
                room.gameStatus = 'finished';
                
                // Notify the opponent
                const opponent = room.players.find(id => id !== socket.id);
                if (opponent) {
                    const opponentPlayer = this.players.get(opponent);
                    this.io.to(opponent).emit('opponent_disconnected', {
                        message: `${player.username} has disconnected`,
                        gameStatus: 'finished',
                        room: room.id
                    });
                    
                    // Clean up opponent's state
                    if (opponentPlayer) {
                        opponentPlayer.room = undefined;
                    }
                }
                
                // Remove the room only if all players are disconnected
                if (room.players.every(playerId => !this.players.has(playerId))) {
                    this.rooms.delete(room.id);
                }
            }
            
            // Make socket leave the room
            socket.leave(player.room);
        }

        // Clean up player from waiting list and players map
        this.waitingPlayers = this.waitingPlayers.filter(id => id !== socket.id);
        this.players.delete(socket.id);
        console.log(`Player disconnected: ${socket.id}`);
    }    private createRoom(socket: Socket, data: { name: string }) {
        console.log(`[createRoom] Creating room for player ${socket.id}`, data);
        const player = this.players.get(socket.id);
        if (!player) {
            console.error('[createRoom] Player not found');
            socket.emit('error', { message: 'Player not found' });
            return;
        }

        // Clean up any existing room membership
        if (player.room) {
            console.log(`[createRoom] Player ${socket.id} leaving existing room ${player.room}`);
            const existingRoom = this.rooms.get(player.room);
            if (existingRoom) {
                existingRoom.players = existingRoom.players.filter(id => id !== socket.id);
                if (existingRoom.players.length === 0) {
                    this.rooms.delete(player.room);
                }
            }
            socket.leave(player.room);
        }

        const roomId = `room_${Date.now()}`;
        console.log(`[createRoom] Creating new room ${roomId}`);

        // Create the new room
        const gameRoom: GameRoom = {
            id: roomId,
            name: data.name || `${player.username}'s Room`,
            players: [socket.id],
            currentTurn: socket.id,
            gameState: Array(9).fill(null),
            gameStatus: 'waiting',
            host: socket.id,
            hostUsername: player.username
        };

        // Set up room and player state
        this.rooms.set(roomId, gameRoom);
        player.room = roomId; // Set the player's room reference
        socket.join(roomId);

        // Notify the room creator
        socket.emit('game_start', {
            room: roomId,
            symbol: 'X',
            opponent: null, // No opponent yet
            isMyTurn: false, // Game hasn't started yet
            gameStatus: 'waiting'
        });

        console.log(`[createRoom] Room created:`, {
            roomId,
            player: {
                id: socket.id,
                username: player.username,
                room: player.room
            },
            roomState: gameRoom
        });

        this.broadcastRoomsList();
    }    private joinRoom(socket: Socket, roomId: string) {
        console.log(`[joinRoom] Player ${socket.id} attempting to join room ${roomId}`);
        const room = this.rooms.get(roomId);
        const player = this.players.get(socket.id);

        // Validate room and player
        if (!room || !player) {
            console.error('[joinRoom] Room or player not found', { roomId, playerId: socket.id });
            socket.emit('error', { message: 'Room not found' });
            return;
        }

        // Basic validations
        if (room.host === socket.id) {
            console.error('[joinRoom] Host trying to join their own room');
            socket.emit('error', { message: 'You cannot join your own room' });
            return;
        }

        if (room.players.length >= 2) {
            console.error('[joinRoom] Room is full');
            socket.emit('error', { message: 'Room is full' });
            return;
        }

        if (room.gameStatus !== 'waiting') {
            console.error('[joinRoom] Game already in progress');
            socket.emit('error', { message: 'Game already in progress' });
            return;
        }

        // Clean up any existing room membership for the joining player
        if (player.room) {
            console.log(`[joinRoom] Cleaning up existing room ${player.room} for player ${socket.id}`);
            const existingRoom = this.rooms.get(player.room);
            if (existingRoom) {
                existingRoom.players = existingRoom.players.filter(id => id !== socket.id);
                if (existingRoom.players.length === 0) {
                    this.rooms.delete(player.room);
                }
            }
            socket.leave(player.room);
        }

        // Get host player
        const hostPlayer = this.players.get(room.host);
        if (!hostPlayer) {
            console.error('[joinRoom] Host player not found');
            socket.emit('error', { message: 'Host player not found' });
            return;
        }

        // Update room state
        room.players.push(socket.id);
        room.gameStatus = 'playing';
        room.currentTurn = room.host; // Host (X) goes first
        room.gameState = Array(9).fill(null);

        // Update player states
        player.room = roomId;
        hostPlayer.room = roomId;

        // Join the socket.io room
        socket.join(roomId);

        console.log(`[joinRoom] Game starting in room ${roomId}:`, {
            host: {
                id: room.host,
                username: hostPlayer.username,
                room: hostPlayer.room
            },
            joiner: {
                id: socket.id,
                username: player.username,
                room: player.room
            },
            roomState: room
        });

        // Notify both players
        this.io.to(room.host).emit('game_start', {
            room: roomId,
            symbol: 'X',
            opponent: player.username,
            isMyTurn: true,
            gameStatus: 'playing'
        });

        socket.emit('game_start', {
            room: roomId,
            symbol: 'O',
            opponent: hostPlayer.username,
            isMyTurn: false,
            gameStatus: 'playing'
        });

        // Broadcast updated rooms list
        this.broadcastRoomsList();

        // Verify final state
        const verifyHost = this.players.get(room.host);
        const verifyJoiner = this.players.get(socket.id);
        console.log('[joinRoom] Final state verification:', {
            hostState: {
                id: room.host,
                room: verifyHost?.room
            },
            joinerState: {
                id: socket.id,
                room: verifyJoiner?.room
            },
            roomPlayers: room.players
        });
    }    private sendRoomsList(socket: Socket) {
        const roomsList = Array.from(this.rooms.values())
            .filter(room => room.gameStatus === 'waiting')
            .map(room => ({
                id: room.id,
                name: room.name,
                host: room.host,
                hostUsername: room.hostUsername,
                status: room.gameStatus,
                players: room.players
            }));
        socket.emit('rooms_update', roomsList);
    }private broadcastRoomsList() {
        const roomsList = Array.from(this.rooms.values())
            .filter(room => room.gameStatus === 'waiting')
            .map(room => ({
                id: room.id,
                name: room.name,
                host: room.host,
                hostUsername: room.hostUsername,
                status: room.gameStatus,
                players: room.players
            }));
        this.io.emit('rooms_update', roomsList);
    }
}

export default SocketManager;