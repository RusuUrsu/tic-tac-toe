import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { auth } from '../middleware/auth.middleware';

const router = Router();

// Public routes
router.post('/register', (req, res) => authController.register(req, res));
router.post('/login', (req, res) => authController.login(req, res));

// Protected routes
router.put('/profile', auth, (req, res) => authController.updateProfile(req, res));

export default router;
