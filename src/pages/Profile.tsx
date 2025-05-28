import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import '../styles/Profile.css';

interface GameRecord {
  gameType: 'computer' | 'multiplayer';
  result: 'win' | 'loss' | 'draw';
  winner: 'X' | 'O' | 'draw';
  date: string;
}

export default function Profile() {
  const { user, updateProfile } = useAuth();
  const [gameHistory, setGameHistory] = useState<GameRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Account settings state
  const [username, setUsername] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [updateError, setUpdateError] = useState('');

  useEffect(() => {
    const fetchGameHistory = async () => {
      try {
        const token = localStorage.getItem('token');        const response = await fetch('http://localhost:3001/api/games/history', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          setGameHistory(data);
        } else {
          setError('Failed to fetch game history');
        }
      } catch (error) {
        setError('Error fetching game history');
      } finally {
        setLoading(false);
      }
    };

    fetchGameHistory();
  }, []);

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdateError('');
    setSuccessMessage('');

    try {
      await updateProfile(
        username || undefined,
        currentPassword || undefined,
        newPassword || undefined
      );
      setSuccessMessage('Profile updated successfully');
      setUsername('');
      setCurrentPassword('');
      setNewPassword('');
    } catch (error) {
      setUpdateError((error as Error).message);
    }
  };

  return (
    <div className="profile-container">
      <div className="profile-header">
        <h1>Profile</h1>
        <div className="user-info">
          <div className="profile-icon large">
            {user?.username.charAt(0).toUpperCase()}
          </div>
          <h2>{user?.username}</h2>
        </div>
      </div>

      <div className="account-settings-section">
        <h3>Account Settings</h3>
        {updateError && <p className="error">{updateError}</p>}
        {successMessage && <p className="success">{successMessage}</p>}
        <form onSubmit={handleProfileUpdate}>
          <div className="form-group">
            <label>New Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter new username"
            />
          </div>
          <div className="form-group">
            <label>Current Password</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Enter current password"
            />
          </div>
          <div className="form-group">
            <label>New Password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password"
            />
          </div>
          <button type="submit" className="update-profile-btn">
            Update Profile
          </button>
        </form>
      </div>

      <div className="game-history-section">
        <h3>Game History</h3>
        {loading ? (
          <p>Loading game history...</p>
        ) : error ? (
          <p className="error">{error}</p>
        ) : gameHistory.length === 0 ? (
          <p>No previous games played</p>
        ) : (
          <div className="game-history-list">
            {gameHistory.map((game, index) => (
              <div key={index} className="game-record">
                <div className="game-type">
                  {game.gameType === 'multiplayer' ? '👥 Online Match' : '🤖 vs Computer'}
                </div>
                <div className={`game-result ${game.result}`}>
                  {game.result.toUpperCase()}
                </div>
                <div className="game-winner">
                  Winner: {game.winner === 'draw' ? 'Draw' : `Player ${game.winner}`}
                </div>
                <div className="game-date">
                  {new Date(game.date).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
