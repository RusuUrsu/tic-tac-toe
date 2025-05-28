import { Router } from 'express';
import { gameHistoryController } from '../controllers/gameHistory.controller';
import { auth } from '../middleware/auth.middleware';

const router = Router();

// Protected routes - require authentication
router.post('/save', auth, gameHistoryController.saveGame);
router.get('/history', auth, gameHistoryController.getUserHistory);

export default router;
