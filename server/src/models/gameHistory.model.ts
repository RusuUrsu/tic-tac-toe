import mongoose, { Document } from 'mongoose';

export interface IGameHistory extends Document {
  userId: string;
  gameType: 'computer' | 'multiplayer' | 'online';
  result: 'win' | 'loss' | 'draw';
  winner: 'X' | 'O' | 'draw';
  date: Date;
  opponent?: string; // For online games
  gameMode?: string; // To distinguish between different game modes
}

const gameHistorySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  gameType: {
    type: String,
    enum: ['computer', 'multiplayer', 'online'],
    required: true
  },
  result: {
    type: String,
    enum: ['win', 'loss', 'draw'],
    required: true
  },
  winner: {
    type: String,
    enum: ['X', 'O', 'draw'],
    required: true
  },
  date: {
    type: Date,
    default: Date.now
  },
  opponent: {
    type: String,
    required: false
  },
  gameMode: {
    type: String,
    required: false
  }
});

export const GameHistory = mongoose.model<IGameHistory>('GameHistory', gameHistorySchema);
