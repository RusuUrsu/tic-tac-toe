import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles/Login.css';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const navigate = useNavigate();
  const { login } = useAuth();

  const validateInput = () => {
    if (!username.trim()) {
      setError('Username is required');
      return false;
    }
    if (!password) {
      setError('Password is required');
      return false;
    }
    if (!isLogin && password.length < 6) {
      setError('Password must be at least 6 characters');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!validateInput()) {
      return;
    }

    try {      const endpoint = isLogin ? 'login' : 'register';
      console.log('Making request to:', `http://localhost:3001/api/auth/${endpoint}`);
      const response = await fetch(`http://localhost:3001/api/auth/${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username: username.trim(), password }),
      });

      const data = await response.json();
      console.log('Response:', data); // Debug log

      if (response.ok) {
        if (isLogin) {
          const { token, user } = data;
          login(token, user);
          navigate('/');
        } else {
          setIsLogin(true);
          setError('Registration successful! Please login.');
          setUsername('');
          setPassword('');
        }
      } else {
        setError(data.error || 'Something went wrong');
      }
    } catch (err) {
      console.error('Error:', err); // Debug log
      setError(isLogin ? 'Failed to login. Please try again.' : 'Failed to register. Please try again.');
    }
  };

  return (
    <div className="login-container">
      <form onSubmit={handleSubmit} className="login-form">
        <h2>{isLogin ? 'Login' : 'Register'}</h2>
        {error && <div className={error.includes('successful') ? 'success' : 'error'}>{error}</div>}
        <div className="form-group">
          <label>Username:</label>
          <input
            type="text"
            value={username}
            onChange={(e) => {
              setError('');
              setUsername(e.target.value);
            }}
            required
            minLength={3}
            maxLength={20}
            placeholder="Enter username"
          />
        </div>
        <div className="form-group">
          <label>Password:</label>
          <input
            type="password"
            value={password}
            onChange={(e) => {
              setError('');
              setPassword(e.target.value);
            }}
            required
            minLength={6}
            placeholder="Enter password"
          />
          {!isLogin && (
            <small className="password-hint">Password must be at least 6 characters long</small>
          )}
        </div>
        <button type="submit">{isLogin ? 'Login' : 'Register'}</button>
        <button 
          type="button" 
          className="toggle-auth" 
          onClick={() => {
            setIsLogin(!isLogin);
            setError('');
            setUsername('');
            setPassword('');
          }}
        >
          {isLogin ? 'Need an account? Register' : 'Have an account? Login'}
        </button>
      </form>
    </div>
  );
}
