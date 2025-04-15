import React from 'react';

function Board({
  boardSize,
  ships = [],
  hits = [],
  misses = [],
  showShips = false,
  onCellClick,
  clickable = false,
  firedCells = [],
}) {
  // Build a grid representation
  const grid = Array(boardSize)
    .fill(0)
    .map(() => Array(boardSize).fill('empty'));

  // Mark ships
  if (showShips) {
    ships.forEach(ship => {
      ship.positions.forEach(pos => {
        grid[pos.y][pos.x] = 'ship';
      });
    });
  }
  // Mark hits
  hits.forEach(({ x, y }) => {
    grid[y][x] = 'hit';
  });
  // Mark misses
  misses.forEach(({ x, y }) => {
    grid[y][x] = 'miss';
  });
  // Mark fired cells on opponent's board
  firedCells.forEach(({ x, y }) => {
    if (grid[y][x] === 'empty') grid[y][x] = 'fired';
  });

  return (
    <div
      style={{
        display: 'inline-block',
        border: '2px solid #333',
        background: '#eee',
        margin: 8,
      }}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${boardSize}, 32px)`,
          gap: 1,
        }}
      >
        {Array(boardSize)
          .fill(0)
          .map((_, y) =>
            Array(boardSize)
              .fill(0)
              .map((_, x) => {
                let cell = grid[y][x];
                let color = '#fff';
                if (cell === 'ship') color = '#555';
                if (cell === 'hit') color = '#e22';
                if (cell === 'miss') color = '#aad';
                if (cell === 'fired') color = '#eee';
                return (
                  <div
                    key={x + '-' + y}
                    onClick={clickable ? () => onCellClick(x, y) : undefined}
                    style={{
                      width: 32,
                      height: 32,
                      border: '1px solid #999',
                      background: color,
                      cursor: clickable ? 'pointer' : 'default',
                      boxSizing: 'border-box',
                      transition: 'background 0.1s',
                      position: 'relative',
                    }}
                  >
                    {cell === 'hit' && (
                      <span
                        style={{
                          color: '#fff',
                          fontWeight: 'bold',
                          fontSize: 20,
                          position: 'absolute',
                          top: 2,
                          left: 7,
                        }}
                      >
                        ×
                      </span>
                    )}
                    {cell === 'miss' && (
                      <span
                        style={{
                          color: '#333',
                          fontWeight: 'bold',
                          fontSize: 20,
                          position: 'absolute',
                          top: 2,
                          left: 10,
                        }}
                      >
                        •
                      </span>
                    )}
                  </div>
                );
              })
          )}
      </div>
    </div>
  );
}

export default Board;
