import React, { useEffect, useState } from 'react';
import { useSocket } from '../context/SocketContext';
import { API_BASE, SOCKET_URL } from '../config';

const ConnectionDebugger: React.FC = () => {
  const { socket, isConnected } = useSocket();
  const [apiStatus, setApiStatus] = useState<string>('Unknown');
  const [expandedInfo, setExpandedInfo] = useState<boolean>(false);

  useEffect(() => {
    // Check API connection
    const checkApi = async () => {
      try {
        const response = await fetch(`${API_BASE}/test`);
        if (response.ok) {
          setApiStatus('Connected');
        } else {
          setApiStatus(`Error ${response.status}`);
        }
      } catch (error) {
        setApiStatus('Failed to connect');
      }
    };

    checkApi();
    // Check every 5 seconds
    const interval = setInterval(checkApi, 5000);
    
    return () => clearInterval(interval);
  }, []);

  if (!expandedInfo) {
    return (
      <div 
        style={{ 
          position: 'fixed', 
          bottom: '10px', 
          right: '10px', 
          background: 'rgba(0,0,0,0.7)', 
          color: 'white',
          padding: '5px 10px',
          borderRadius: '5px',
          cursor: 'pointer',
          fontSize: '12px'
        }}
        onClick={() => setExpandedInfo(true)}
      >
        📊 Debug
      </div>
    );
  }

  return (
    <div 
      style={{ 
        position: 'fixed', 
        bottom: '10px', 
        right: '10px', 
        background: 'rgba(0,0,0,0.85)', 
        color: 'white',
        padding: '10px',
        borderRadius: '5px',
        width: '300px',
        maxHeight: '400px',
        overflowY: 'auto',
        zIndex: 9999
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
        <h4 style={{ margin: 0 }}>Connection Debugger</h4>
        <button 
          onClick={() => setExpandedInfo(false)} 
          style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}
        >
          ✕
        </button>
      </div>

      <div style={{ fontSize: '12px' }}>
        <div style={{ marginBottom: '5px' }}>
          <strong>Socket URL:</strong> {SOCKET_URL}
        </div>
        <div style={{ marginBottom: '5px' }}>
          <strong>API URL:</strong> {API_BASE}
        </div>
        <div style={{ marginBottom: '5px' }}>
          <strong>Socket Connection:</strong>{' '}
          <span style={{ color: isConnected ? 'lightgreen' : 'salmon' }}>
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
        <div style={{ marginBottom: '5px' }}>
          <strong>Socket ID:</strong> {socket?.id || 'Not assigned'}
        </div>
        <div style={{ marginBottom: '5px' }}>
          <strong>API Status:</strong>{' '}
          <span style={{ color: apiStatus === 'Connected' ? 'lightgreen' : 'salmon' }}>
            {apiStatus}
          </span>
        </div>
        
        <hr style={{ borderColor: '#555', margin: '10px 0' }} />

        <div>
          <button 
            onClick={() => {
              if (socket) {
                socket.emit('get_rooms');
                console.log('Manual rooms request sent');
              }
            }}
            style={{
              padding: '3px 8px',
              background: '#444',
              border: 'none',
              color: 'white',
              borderRadius: '3px',
              cursor: 'pointer',
              marginRight: '5px'
            }}
            disabled={!isConnected}
          >
            Request Rooms
          </button>

          <button 
            onClick={() => {
              if (socket) {
                socket.disconnect();
                setTimeout(() => socket.connect(), 1000);
                console.log('Manual reconnection triggered');
              }
            }}
            style={{
              padding: '3px 8px',
              background: '#444',
              border: 'none',
              color: 'white',
              borderRadius: '3px',
              cursor: 'pointer'
            }}
          >
            Reconnect
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConnectionDebugger;
