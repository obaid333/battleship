import React, { useState } from 'react';
import io from 'socket.io-client';
import ShipPlacement from './ShipPlacement';
import Board from './Board';

const socket = io('https://battleship-wqaj.onrender.com');

function App() {
  // Add initial state values
  const initialGameId = '';
  const initialRole = 'player';
  const initialStatus = '';
  const initialGame = null;
  const initialBoardSize = 10;

  const [gameId, setGameId] = useState(initialGameId);
  const [role, setRole] = useState(initialRole);
  const [status, setStatus] = useState(initialStatus);
  const [game, setGame] = useState(initialGame);
  const [boardSize, setBoardSize] = useState(initialBoardSize);

  // Reset function
  const resetGame = () => {
    setGameId(initialGameId);
    setRole(initialRole);
    setStatus(initialStatus);
    setGame(initialGame);
    setBoardSize(initialBoardSize);
  };

  // (Removed duplicate state declarations; see above for correct ones)


  const joinGame = () => {
    // Only send boardSize if first player (game not yet created)
    socket.emit('joinGame', { gameId, role, boardSize: role === 'player' && (!game || (game.players && game.players.length === 0)) ? boardSize : undefined });
  };

  React.useEffect(() => {
    socket.on('joined', (data) => {
      setStatus(`Joined as ${data.role}`);
    });
    socket.on('full', (data) => {
      setStatus(`Cannot join: ${data.reason}`);
    });
    socket.on('update', (gameData) => {
      setGame(gameData);
    });
    return () => {
      socket.off('joined');
      socket.off('full');
      socket.off('update');
    };
  }, []);

  const handlePlaceShips = (ships) => {
    socket.emit('placeShips', { gameId, ships });
  };

  const myId = socket.id;
  const isPlayer = role === 'player' && game && game.players.includes(socket.id);
  const isPlacing = isPlayer && game && game.state === 'placing';
  const isInProgress = game && game.state === 'in-progress';
  const isFinished = game && game.state === 'finished';
  const isObserver = role === 'observer';

  // Find out which player you are
  const myIdx = game && game.players ? game.players.indexOf(socket.id) : -1;
  const opponentId = game && game.players && game.players.length === 2 ? game.players.find(id => id !== socket.id) : null;

  // Board data
  const myBoard = game && game.boards && socket.id in game.boards ? game.boards[socket.id] : { ships: [], hits: [], misses: [] };
  const oppBoard = game && game.boards && opponentId && opponentId in game.boards ? game.boards[opponentId] : { ships: [], hits: [], misses: [] };

  // For observers, show both boards (always use a default board if missing)
  const EMPTY_BOARD = { ships: [], hits: [], misses: [] };
  const playerBoards = game && game.players ? game.players.map(pid => ({
    id: pid,
    board: (game.boards && game.boards[pid]) ? game.boards[pid] : EMPTY_BOARD,
    you: pid === socket.id
  })) : [];

  // Firing
  const canFire = isPlayer && isInProgress && game.turn === socket.id && opponentId;
  const firedCells = oppBoard ? [...oppBoard.hits, ...oppBoard.misses] : [];
  const handleFire = (x, y) => {
    if (!canFire) return;
    // Don't allow firing at the same cell twice
    if (firedCells.some(pos => pos.x === x && pos.y === y)) return;
    socket.emit('fire', { gameId, x, y });
  };

  return (
    <div style={{ padding: 32, fontFamily: 'sans-serif' }}>
      <h1>Battleships Online</h1>
      <div>
        <input
          placeholder="Game ID"
          value={gameId}
          onChange={e => setGameId(e.target.value)}
        />
        <select value={role} onChange={e => setRole(e.target.value)}>
          <option value="player">Player</option>
          <option value="observer">Observer</option>
        </select>
        {/* Only allow board size selection if player and not joined yet */}
        {role === 'player' && (!game || (game.players && game.players.length === 0)) && (
          <select value={boardSize} onChange={e => setBoardSize(Number(e.target.value))} style={{ marginLeft: 8 }}>
            <option value={8}>8x8</option>
            <option value={10}>10x10</option>
            <option value={15}>15x15</option>
          </select>
        )}
        {game && (
          <span style={{ marginLeft: 8 }}>
            <b>Board Size:</b> {game.boardSize}x{game.boardSize}
          </span>
        )}
        <button onClick={joinGame} style={{ marginLeft: 8 }}>Join Game</button>
        <button onClick={resetGame} style={{ marginLeft: 8 }}>Restart Game</button>
      </div>
      <div style={{ marginTop: 16 }}>
        <b>Status:</b> {status}
      </div>
      {game && (
        <div style={{ marginTop: 16 }}>
          <b>Players:</b> {game.players.length} / 2<br />
          <b>Observers:</b> {game.observers.length} / 10<br />
          <b>Game State:</b> {game.state}
        </div>
      )}
      {/* Ship placement phase for player */}
      {isPlacing && (
        <div style={{ marginTop: 24 }}>
          <ShipPlacement boardSize={game.boardSize} onPlaceShips={handlePlaceShips} />
        </div>
      )}

      {/* Gameplay phase */}
      {isInProgress && (
        <div style={{ marginTop: 32, display: 'flex', gap: 32 }}>
          <div>
            <h3>Your Board</h3>
            <Board
              boardSize={game.boardSize}
              ships={myBoard.ships}
              hits={myBoard.hits}
              misses={myBoard.misses}
              showShips={true}
            />
          </div>
          <div>
            <h3>Opponent's Board</h3>
            <Board
              boardSize={game.boardSize}
              ships={[]}
              hits={oppBoard.hits}
              misses={oppBoard.misses}
              showShips={false}
              onCellClick={handleFire}
              clickable={canFire}
              firedCells={firedCells}
            />
            <div style={{ marginTop: 12 }}>
              {canFire ? <b>Your turn! Click a cell to fire.</b> : game.turn === socket.id ? 'Waiting...' : "Opponent's turn"}
            </div>
          </div>
        </div>
      )}

      {/* Observer view */}
      {isObserver && isInProgress && (
        <div style={{ marginTop: 32, display: 'flex', gap: 32 }}>
          {playerBoards.map((pb, idx) => (
            <div key={pb.id}>
              <h3>Player {idx + 1} {pb.you && '(You)'}</h3>
              <Board
                boardSize={game.boardSize}
                ships={pb.board.ships}
                hits={pb.board.hits}
                misses={pb.board.misses}
                showShips={true}
              />
            </div>
          ))}
        </div>
      )}

      {/* Game over */}
      {isFinished && (
        <div style={{ marginTop: 32 }}>
          <h2>Game Over!</h2>
          {game.winner === socket.id ? (
            <div style={{ color: 'green', fontWeight: 'bold' }}>You win!</div>
          ) : game.players.includes(socket.id) ? (
            <div style={{ color: 'red', fontWeight: 'bold' }}>You lose!</div>
          ) : (
            <div style={{ color: 'blue' }}>Winner: Player {game.players.indexOf(game.winner) + 1}</div>
          )}
        </div>
      )}
    </div>
  );
}

export default App;
