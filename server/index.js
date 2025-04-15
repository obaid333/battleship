import express from 'express';
import http from 'http';
import { Server } from 'socket.io';

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

const PORT = 4000;

// In-memory game state (for demo; use DB for prod)
let games = {};

function createGame(gameId, boardSize = 10) {
  games[gameId] = {
    players: [], // array of socket ids
    observers: [],
    state: 'waiting', // 'waiting', 'placing', 'in-progress', 'finished'
    boards: {}, // { socketId: { ships: [...], hits: [...], misses: [...] } }
    moves: [], // { by, x, y, result }
    shipsPlaced: {}, // { socketId: true }
    turn: null, // socketId of current turn
    winner: null,
    boardSize // Store board size in game state
  };
}

// Helper: Check if all ships are sunk
function allShipsSunk(board) {
  return board.ships.every(ship => ship.positions.every(pos =>
    board.hits.some(hit => hit.x === pos.x && hit.y === pos.y)
  ));
}

// Helper: Get opponent's socketId
function getOpponent(game, playerId) {
  return game.players.find(id => id !== playerId);
}

io.on('connection', (socket) => {
  socket.on('joinGame', ({ gameId, role, boardSize }) => {
    // Only allow boardSize to be set by first player
    if (!games[gameId]) createGame(gameId, boardSize || 10);
    const game = games[gameId];
    if (role === 'player') {
      if (game.players.length < 2) {
        game.players.push(socket.id);
        game.boards[socket.id] = { ships: [], hits: [], misses: [] };
        socket.join(gameId);
        socket.emit('joined', { role: 'player' });
        // If now 2 players, move to 'placing' state
        if (game.players.length === 2) {
          game.state = 'placing';
          game.shipsPlaced = {};
          io.to(gameId).emit('update', game);
        }
      } else {
        socket.emit('full', { reason: 'Players full' });
      }
    } else if (role === 'observer') {
      if (game.observers.length < 10) {
        game.observers.push(socket.id);
        socket.join(gameId);
        socket.emit('joined', { role: 'observer' });
      } else {
        socket.emit('full', { reason: 'Observers full' });
      }
    }
    io.to(gameId).emit('update', game);
  });

  // Player submits ship placements
  socket.on('placeShips', ({ gameId, ships }) => {
    const game = games[gameId];
    if (!game || !game.players.includes(socket.id) || game.state !== 'placing') return;
    console.log(`[placeShips] Player ${socket.id} placed ships in game ${gameId}`);
    game.boards[socket.id].ships = ships;
    game.shipsPlaced[socket.id] = true;
    // If both players placed ships, start game
    if (Object.keys(game.shipsPlaced).length === 2) {
      game.state = 'in-progress';
      // Randomly select who starts
      const idx = Math.floor(Math.random() * 2);
      game.turn = game.players[idx];
      console.log(`[game ${gameId}] Both players placed ships. Game started. Turn: ${game.turn}`);
    } else {
      console.log(`[game ${gameId}] Waiting for other player to place ships...`);
    }
    io.to(gameId).emit('update', game);
  });

  // Player fires at a cell
  socket.on('fire', ({ gameId, x, y }) => {
    const game = games[gameId];
    if (!game || game.state !== 'in-progress') return;
    if (game.turn !== socket.id) return; // Not your turn
    const opponentId = getOpponent(game, socket.id);
    const opponentBoard = game.boards[opponentId];
    if (!opponentBoard) return;
    // Check if already fired
    if ([...opponentBoard.hits, ...opponentBoard.misses].some(pos => pos.x === x && pos.y === y)) return;
    // Check hit
    let hit = false;
    let sunkShip = false;
    for (const ship of opponentBoard.ships) {
      if (ship.positions.some(pos => pos.x === x && pos.y === y)) {
        opponentBoard.hits.push({ x, y });
        hit = true;
        // Check if this ship is now sunk
        if (ship.positions.every(pos => opponentBoard.hits.some(h => h.x === pos.x && h.y === pos.y))) {
          sunkShip = true;
        }
        break;
      }
    }
    if (!hit) {
      opponentBoard.misses.push({ x, y });
    }
    game.moves.push({ by: socket.id, x, y, result: hit ? 'hit' : 'miss' });
    // Check for win
    if (allShipsSunk(opponentBoard)) {
      game.state = 'finished';
      game.winner = socket.id;
    } else {
      // Turn logic: swap on miss or sunk ship, otherwise keep turn
      if (!hit || sunkShip) {
        game.turn = opponentId;
      } // else (hit but not sunk) => keep turn
    }
    io.to(gameId).emit('update', game);
  });

  socket.on('disconnect', () => {
    for (const gameId in games) {
      let g = games[gameId];
      g.players = g.players.filter(id => id !== socket.id);
      g.observers = g.observers.filter(id => id !== socket.id);
      // Remove board and placements
      delete g.boards[socket.id];
      delete g.shipsPlaced?.[socket.id];
      io.to(gameId).emit('update', g);
    }
  });
});

app.get('/', (req, res) => {
  res.send('Battleships server running');
});

server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
