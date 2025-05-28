import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/user.model';

export const authController = {
  async register(req: Request, res: Response) {
    try {
      const { username, password } = req.body;

      // Check if user already exists
      const existingUser = await User.findOne({ username });
      if (existingUser) {
        return res.status(400).json({ error: 'Username already exists' });
      }

      // Create new user
      const user = new User({ username, password });
      await user.save();

      // Generate token
      const token = jwt.sign(
        { userId: user._id },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '7d' }
      );

      res.status(201).json({
        token,
        user: {
          id: user._id,
          username: user.username,
        },
      });    } catch (error) {
      console.error('Registration error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Registration failed';
      res.status(500).json({ error: errorMessage });
    }
  },
  async login(req: Request, res: Response) {
    try {
      const { username, password } = req.body;
      console.log('Login attempt:', { username }); // Log login attempt

      // Find user
      const user = await User.findOne({ username });
      console.log('User found:', !!user); // Log if user was found
      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }      // Check password
      const isValid = await user.comparePassword(password);
      console.log('Password valid:', isValid); // Log password validation result
      if (!isValid) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Generate token
      const token = jwt.sign(
        { userId: user._id },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '7d' }
      );

      res.json({
        token,
        user: {
          id: user._id,
          username: user.username,
        },
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Login failed' });
    }
  },
  async updateProfile(req: Request, res: Response) {
    try {
      const userId = (req as any).user._id;
      const { username, currentPassword, newPassword } = req.body;

      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // If changing username, check if it's already taken
      if (username && username !== user.username) {
        const existingUser = await User.findOne({ username });
        if (existingUser) {
          return res.status(400).json({ error: 'Username already taken' });
        }
        user.username = username;
      }

      // If changing password, verify current password first
      if (newPassword) {
        if (!currentPassword) {
          return res.status(400).json({ error: 'Current password is required' });
        }

        const isValid = await user.comparePassword(currentPassword);
        if (!isValid) {
          return res.status(401).json({ error: 'Current password is incorrect' });
        }

        user.password = newPassword;
      }

      await user.save();

      res.json({
        message: 'Profile updated successfully',
        user: {
          id: user._id,
          username: user.username,
        },
      });
    } catch (error) {
      console.error('Update profile error:', error);
      res.status(500).json({ error: 'Failed to update profile' });
    }
  },
};
