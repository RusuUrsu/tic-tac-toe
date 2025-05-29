import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { API_BASE } from '../config';
import '../styles/Profile.css';

interface GameRecord {
  gameType: 'computer' | 'multiplayer' | 'online';
  result: 'win' | 'loss' | 'draw';
  winner: 'X' | 'O' | 'draw';
  date: string;
  opponent?: string;
  gameTypeDisplay?: string;
  resultDisplay?: string;
  opponentDisplay?: string;
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
        setLoading(true);
        const token = localStorage.getItem('token');
        
        if (!token) {
          setError('You must be logged in to view game history');
          setLoading(false);
          return;
        }
        
        console.log('Fetching history from:', `${API_BASE}/api/games/history`);
        console.log('Using token:', token?.substring(0, 10) + '...');
        
        const response = await fetch(`${API_BASE}/api/games/history`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        console.log('Response status:', response.status);
        
        if (response.ok) {
          const data = await response.json();
          console.log('Received game history:', data);
          setGameHistory(data);
        } else {
          const errorData = await response.json().catch(() => ({}));
          console.error('Error response:', errorData);
          setError(`Failed to fetch game history: ${errorData.message || response.statusText}`);
        }
      } catch (error) {
        console.error('Error fetching game history:', error);
        setError(`Error fetching game history: ${(error as Error).message}`);
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
            {user?.username ? user.username.charAt(0).toUpperCase() : '?'}
          </div>
          <h2>{user?.username || 'Guest'}</h2>
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
                  {game.gameTypeDisplay || 
                   (game.gameType === 'online' ? '👥 Online Match' : 
                    game.gameType === 'computer' ? '🤖 vs Computer' : 
                    '👫 Local Multiplayer')}
                </div>
                <div className={`game-result ${game.result}`}>
                  {game.resultDisplay || game.result.toUpperCase()}
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
