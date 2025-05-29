import { Request, Response } from 'express';
import { GameHistory } from '../models/gameHistory.model';

export const gameHistoryController = {
  async saveGame(req: Request, res: Response) {
    try {
      const { gameType, result, winner, opponent, gameMode } = req.body;
      const userId = (req as any).user._id; // Added by auth middleware

      console.log('Saving game history:', { 
        userId, 
        gameType, 
        result, 
        winner, 
        opponent, 
        gameMode 
      });

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
  },

  async getGameHistory(req: Request, res: Response) {
    try {
      const userId = req.params.userId || (req as any).user?._id;
      
      if (!userId) {
        return res.status(400).json({ message: 'User ID is required' });
      }

      const history = await GameHistory.find({ userId })
        .sort({ date: -1 })
        .limit(10);
      
      const formattedHistory = history.map(game => ({
        id: game._id,
        date: game.date,
        gameType: game.gameType,
        result: game.result,
        winner: game.winner,
        opponent: game.opponent || (game.gameType === 'computer' ? 'Computer' : 'Player 2')
      }));

      return res.status(200).json(formattedHistory);
    } catch (error) {
      console.error('Error fetching game history:', error);
      return res.status(500).json({ message: 'Failed to fetch game history', error });
    }
  }
};
