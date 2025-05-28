import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import '../App.css';
import '../styles/Game.css';

function Square({value, onSquareClick, highlight}: {value: string | null, onSquareClick: () => void, highlight?:boolean}) {
  return <button className={`square ${highlight ? 'highlight': ''}`} onClick={onSquareClick}>{value}</button>;
}

function Board({xIsNext, squares, onPlay, winningLine, disabled}: {xIsNext: boolean, squares: (string|null)[], onPlay: (s: (string | null)[]) => void, winningLine?: number[]|null, disabled?: boolean}) {
  function handleClick(i: number){
    if (disabled) return;
    if (squares[i] || calculateWinner(squares)){
      return;
    }
    const newSquares = squares.slice() as (string|null)[];
    if (xIsNext){
      newSquares[i] = 'X';
    } else {
      newSquares[i] = 'O';
    }
    onPlay(newSquares);
  }
  const winner = calculateWinner(squares);
  const draw = calculateDraw(squares);
  let status;
  if (winner){
    const winnerName = squares[winner[0]];
    status = 'Winner: ' + winnerName;
  } else {
    if (draw){
      status = 'Draw!';
    } else {
      status = 'Next player: ' + (xIsNext ? 'X' : 'O');
    }
  }
  return (
    <>
      <div className="status">{status}</div>
      {Array(3).fill(null).map((_, i) => (
        <div className="board-row" key={i}>
          {Array(3).fill(null).map((_, j) => {
            const index = i * 3 + j;
            const isWinningSquare = winningLine?.includes(index);
            return (
              <Square
                key={index}
                value={squares[index]}
                onSquareClick={() => handleClick(index)}
                highlight={isWinningSquare}
              />
            );
          })}
        </div>
      ))}
    </>
  )
}

function calculateDraw(squares: (string|null)[]){
  return squares.every((square) => square !== null) && !calculateWinner(squares);
}

function calculateWinner(squares: (string|null)[]){
  const lines = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6]
  ];
  for (let i = 0; i < lines.length; i++){
    const [a,b,c] = lines[i];
    if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]){
      return [a,b,c];
    }
  }
  return null;
}

export default function Game() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const roomId = searchParams.get('room');
  const [currentMove, setCurrentMove] = useState(0);
  const [history, setHistory] = useState([Array(9).fill(null)]);
  const [isAscending, setIsAscending] = useState(true);
  const xIsNext = currentMove % 2 === 0;
  const currentSquares = history[currentMove];
  const [gameMode, setGameMode] = useState<'two-player' | 'single-player' | 'online'>(
    roomId ? 'online' : 'two-player'
  );
  const [isWaitingForAI, setIsWaitingForAI] = useState(false);
  const { isAuthenticated } = useAuth();
  const { isConnected, gameState, findGame, makeMove } = useSocket();

  useEffect(() => {
    if (roomId && gameMode === 'online' && !gameState.room) {
      // The game was accessed directly via URL, but we're not in a game
      navigate('/online');
    }
  }, [roomId, gameMode, gameState.room, navigate]);

  useEffect(() => {
    if (gameMode === 'online') {
      // Redirect if we're not in a game
      if (!roomId || !gameState.room) {
        console.log('No room ID or game state, redirecting to online matches');
        navigate('/online');
        return;
      }

      // Validate that we're in the correct room
      if (roomId !== gameState.room) {
        console.log('Room mismatch, redirecting to online matches');
        navigate('/online');
        return;
      }

      console.log('Current game state:', gameState);
    }
  }, [roomId, gameMode, gameState, navigate]);

  function handleModeChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const newMode = e.target.value as 'two-player' | 'single-player' | 'online';
    setGameMode(newMode);
    setHistory([Array(9).fill(null)]);
    setCurrentMove(0);
    setIsWaitingForAI(false);

    if (newMode === 'online') {
      navigate('/online');
    }
  }

  function getAIMove(squares: (string | null)[]): number{
    const emptyIndices = squares.map((val, idx) => (val === null ? idx : null)).filter( idx => idx!==null) as number[];
    return emptyIndices[Math.floor(Math.random() * emptyIndices.length)];
  }
  function handlePlay(nextSquares: (string | null)[]) {
    if (gameMode === 'online') {
      if (!gameState.room || gameState.gameStatus !== 'playing') {
        console.log('Game not active:', gameState);
        return;
      }

      if (!gameState.isMyTurn) {
        console.log('Not your turn');
        return;
      }

      const position = nextSquares.findIndex((square, i) => square !== gameState.board[i]);
      if (position !== -1) {
        console.log('Making move at position:', position);
        makeMove(position);
      }
      return;
    }

    const nextHistory = [...history.slice(0, currentMove + 1), nextSquares];
    setHistory(nextHistory);
    setCurrentMove(nextMove => nextMove + 1);

    if (gameMode === 'single-player' && !calculateWinner(nextSquares) && !calculateDraw(nextSquares)) {
      setIsWaitingForAI(true);
    }
  }

  function jumpTo(nextMove: number){
    setCurrentMove(nextMove);
  }

  const moves = history.map((squares, move) => {
    let description;
    if (move > 0){
      description = 'Go to move #' + move;
    } else {
      description = 'Go to game start';
    }
    if (move !== currentMove){
      return (
        <li key={move}>
          <button onClick={() => jumpTo(move)}>{description}</button>
        </li>
      );
    } else {
      return (
        <li key={move}>
          <p>You are at move #{move}</p>
        </li>
      );
    }
  });

  function sortMoves() {
    setIsAscending(!isAscending);
  }

  const winningLine = calculateWinner(currentSquares);

  const saveGameHistory = useCallback(async (gameType: 'computer' | 'multiplayer', result: 'win' | 'loss' | 'draw', winner: 'X' | 'O' | 'draw') => {
    if (!isAuthenticated) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:3001/api/games/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          gameType,
          result,
          winner
        })
      });

      if (!response.ok) {
        console.error('Failed to save game history');
      }
    } catch (error) {
      console.error('Error saving game history:', error);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    const winner = calculateWinner(history[currentMove]);
    const draw = !winner && calculateDraw(history[currentMove]);
    const gameType = gameMode === 'single-player' ? 'computer' : 'multiplayer';

    if (winner || draw) {
      let result: 'win' | 'loss' | 'draw';
      let winnerSymbol: 'X' | 'O' | 'draw';

      if (winner) {
        winnerSymbol = history[currentMove][winner[0]] as 'X' | 'O';
        result = winnerSymbol === 'X' ? 'win' : 'loss';
      } else {
        winnerSymbol = 'draw';
        result = 'draw';
      }

      saveGameHistory(gameType, result, winnerSymbol);
    }
  }, [history, currentMove, gameMode, saveGameHistory]);

  useEffect(() => {
    if (isWaitingForAI && gameMode === 'single-player') {
      const timer = setTimeout(() => {
        const aiMove = getAIMove(currentSquares);
        const nextSquares = currentSquares.slice();
        nextSquares[aiMove] = 'O';
        
        const nextHistory = [...history.slice(0, currentMove + 1), nextSquares];
        setHistory(nextHistory);
        setCurrentMove(currentMove + 1);
        setIsWaitingForAI(false);
      }, 500); // Add a small delay to make AI feel more natural
      
      return () => clearTimeout(timer);
    }
  }, [isWaitingForAI, gameMode, currentSquares, currentMove, history]);
  // Handle game completion
  const handleGameComplete = () => {
    if (gameMode === 'online' && gameState.gameStatus === 'finished') {
      return (
        <div className="game-status finished">
          <p>Game Over!</p>
          {gameState.winner ? `Winner: ${gameState.winner}` : 'Draw!'}
          <button 
            onClick={() => {
              console.log('Finding new game...');
              findGame();
            }} 
            className="new-game-button"
          >
            Find New Game
          </button>
        </div>
      );
    }
    return null;
  }

  // Add game status display
  const renderGameStatus = () => {
    if (gameMode === 'online' && gameState) {
      if (gameState.gameStatus === 'waiting') {
        return <div className="game-status waiting">Waiting for opponent...</div>;
      }

      return (
        <div className="game-status">
          {gameState.opponent && (
            <div className="opponent-info">
              <div className="opponent-name">
                Playing against: {gameState.opponent}
              </div>
              <div className="turn-status">
                {gameState.isMyTurn ? (
                  <span className="your-turn">Your turn</span>
                ) : (
                  <span className="opponent-turn">{gameState.opponent}'s turn</span>
                )}
              </div>
            </div>
          )}
          <div className="player-info">
            You are: <span className="player-symbol">{gameState.symbol}</span>
          </div>
          {gameState.gameStatus === 'finished' && (
            <div className="game-result">
              {gameState.winner === 'You' && <span className="winner">You won! 🎉</span>}
              {gameState.winner === 'Opponent' && (
                <span className="winner">{gameState.opponent} won!</span>
              )}
              {gameState.isDraw && <span className="draw">Game ended in a draw!</span>}
              <button 
                className="play-again-btn"
                onClick={() => navigate('/online')}
              >
                Play Another Game
              </button>
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="game">
      <div className="game-mode">
        <select value={gameMode} onChange={handleModeChange} disabled={roomId !== null}>
          <option value="two-player">Two Player (Local)</option>
          <option value="single-player">Single Player (vs AI)</option>
          <option value="online">Online Multiplayer</option>
        </select>
      </div>

      {renderGameStatus()}
      
      <div className="game-board">
        <Board
          xIsNext={gameMode === 'online' ? gameState.isMyTurn : xIsNext}
          squares={gameMode === 'online' ? gameState.board : currentSquares}
          onPlay={handlePlay}
          winningLine={calculateWinner(gameMode === 'online' ? gameState.board : currentSquares)}
          disabled={
            gameMode === 'online' && 
            (!gameState.isMyTurn || gameState.gameStatus !== 'playing')
          }
        />
      </div>

      <div className="game-info">
        {gameMode !== 'online' && (
          <>
            <div className="move-list">
              <ol>{isAscending ? moves : [...moves].reverse()}</ol>
            </div>
            <div className="game-controls">
              <ToggleButton onClick={sortMoves} />
              <RestartGameButton onClick={() => {
                setHistory([Array(9).fill(null)]);
                setCurrentMove(0);
              }} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function RestartGameButton({onClick}: {onClick: () => void}) {
  return (
    <button className="RestartGameButton" onClick={onClick}>
      Restart Game
    </button>
  );
}
function ToggleButton({ onClick }: { onClick: () => void }) {
  return (
    <button className="ToggleButton" onClick={onClick}>
      Toggle Move Order
    </button>
  );
}

