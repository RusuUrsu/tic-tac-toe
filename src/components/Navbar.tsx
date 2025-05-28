import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles/Navbar.css';

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav className="nav-bar">
      <div className="nav-logo">
        <span className="logo" onClick={() => navigate('/')}>
          Tic Tac Toe
        </span>
      </div>      <div className="nav-actions">
        <div className="nav-action" onClick={() => navigate('/')}>
          Home
        </div>
        {isAuthenticated ? (
          <>
            <div className="nav-action" onClick={() => navigate('/online')}>
              Online Matches
            </div>
            <div className="nav-action" onClick={() => navigate('/profile')}>
              Profile
            </div>
            <div className="nav-action" onClick={handleLogout}>
              Logout
            </div>
          </>
        ) : (
          <div className="nav-action" onClick={() => navigate('/login')}>
            Login
          </div>
        )}
      </div>
    </nav>
  );
}
