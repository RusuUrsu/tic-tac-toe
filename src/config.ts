// Server configuration
const API_PORT = 3001;
const SOCKET_PORT = 3001;

// Determine the base URL for API requests
const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const API_BASE = isLocalhost 
  ? `http://localhost:${API_PORT}` 
  : `http://${window.location.hostname}:${API_PORT}`;

// Determine the socket URL
const SOCKET_URL = isLocalhost 
  ? `http://localhost:${SOCKET_PORT}` 
  : `http://${window.location.hostname}:${SOCKET_PORT}`;

export {
  API_BASE,
  SOCKET_URL
};
