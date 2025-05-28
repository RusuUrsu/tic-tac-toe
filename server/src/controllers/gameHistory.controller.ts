import { Request, Response } from 'express';
import { GameHistory } from '../models/gameHistory.model';

export const gameHistoryController = {
  async saveGame(req: Request, res: Response) {
    try {
      const { gameType, result, winner, opponent, gameMode } = req.body;
      const userId = (req as any).user._id; // Added by auth middleware

      const gameHistory = new GameHistory({
        userId,
        gameType,
        result,
        winner,
        opponent,
        gameMode
      });

      await gameHistory.save();
      res.status(201).json(gameHistory);
    } catch (error) {
      console.error('Save game error:', error);
      res.status(500).json({ error: 'Failed to save game history' });
    }
  },

  async getUserHistory(req: Request, res: Response) {
    try {
      const userId = (req as any).user._id;
      const history = await GameHistory.find({ userId })
        .sort({ date: -1 })
        .limit(10);
      
      const formattedHistory = history.map(game => ({
        ...game.toObject(),
        gameTypeDisplay: game.gameType === 'online' ? 'Online Multiplayer' :
                        game.gameType === 'computer' ? 'vs Computer' : 'Local Multiplayer',
        resultDisplay: `${game.result.charAt(0).toUpperCase()}${game.result.slice(1)}`,
        opponentDisplay: game.opponent || (game.gameType === 'computer' ? 'Computer' : 'Player 2')
      }));
      
      res.json(formattedHistory);
    } catch (error) {
      console.error('Get history error:', error);
      res.status(500).json({ error: 'Failed to get game history' });
    }
  }
};
