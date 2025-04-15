import React, { useState } from 'react';

const CLASSIC_SHIPS = [
  { name: 'Carrier', size: 5 },
  { name: 'Battleship', size: 4 },
  { name: 'Cruiser', size: 3 },
  { name: 'Submarine', size: 3 },
  { name: 'Destroyer', size: 2 },
];

function ShipPlacement({ boardSize, onPlaceShips }) {
  const [ships, setShips] = useState([]); // {name, positions: [{x, y}]}
  const [currentShipIdx, setCurrentShipIdx] = useState(0);
  const [orientation, setOrientation] = useState('horizontal');
  const [tempPositions, setTempPositions] = useState([]);

  const grid = Array(boardSize).fill(0).map(() => Array(boardSize).fill(null));
  ships.forEach(ship => {
    ship.positions.forEach(pos => {
      grid[pos.y][pos.x] = ship.name;
    });
  });
  tempPositions.forEach(pos => {
    grid[pos.y][pos.x] = 'preview';
  });

  const placeShip = (x, y) => {
    const ship = CLASSIC_SHIPS[currentShipIdx];
    if (!ship) return; // Guard: no more ships
    let positions = [];
    for (let i = 0; i < ship.size; i++) {
      let px = orientation === 'horizontal' ? x + i : x;
      let py = orientation === 'vertical' ? y + i : y;
      if (px >= boardSize || py >= boardSize) return;
      positions.push({ x: px, y: py });
    }
    // Check overlap
    for (const s of ships) {
      for (const pos of s.positions) {
        if (positions.some(p => p.x === pos.x && p.y === pos.y)) return;
      }
    }
    setShips([...ships, { name: ship.name, positions }]);
    setCurrentShipIdx(currentShipIdx + 1);
    setTempPositions([]);
  };

  const previewShip = (x, y) => {
    const ship = CLASSIC_SHIPS[currentShipIdx];
    if (!ship) return setTempPositions([]); // Guard: no more ships
    let positions = [];
    for (let i = 0; i < ship.size; i++) {
      let px = orientation === 'horizontal' ? x + i : x;
      let py = orientation === 'vertical' ? y + i : y;
      if (px >= boardSize || py >= boardSize) return setTempPositions([]);
      positions.push({ x: px, y: py });
    }
    // Check overlap
    for (const s of ships) {
      for (const pos of s.positions) {
        if (positions.some(p => p.x === pos.x && p.y === pos.y)) return setTempPositions([]);
      }
    }
    setTempPositions(positions);
  };

  const clearPreview = () => setTempPositions([]);

  const handleCellClick = (x, y) => {
    if (currentShipIdx < CLASSIC_SHIPS.length) placeShip(x, y);
  };

  const handleOrientationToggle = () => {
    setOrientation(orientation === 'horizontal' ? 'vertical' : 'horizontal');
  };

  const handleSubmit = () => {
    if (ships.length === CLASSIC_SHIPS.length) {
      onPlaceShips(ships);
    }
  };

  return (
    <div>
      <h3>Place your ships</h3>
      <div>Placing: <b>{CLASSIC_SHIPS[currentShipIdx]?.name || 'All placed!'}</b> ({orientation})</div>
      <button onClick={handleOrientationToggle} style={{marginBottom: 8}} disabled={currentShipIdx >= CLASSIC_SHIPS.length}>Toggle Orientation</button>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${boardSize}, 32px)`, gap: 2 }}>
        {Array(boardSize).fill(0).map((_, y) =>
          Array(boardSize).fill(0).map((_, x) => {
            let cell = grid[y][x];
            const canInteract = currentShipIdx < CLASSIC_SHIPS.length;
            return (
              <div
                key={x + '-' + y}
                onClick={canInteract ? () => handleCellClick(x, y) : undefined}
                onMouseEnter={canInteract ? () => previewShip(x, y) : undefined}
                onMouseLeave={canInteract ? clearPreview : undefined}
                style={{
                  width: 32, height: 32, border: '1px solid #999', background:
                    cell === 'preview' ? '#aaf' : cell ? '#555' : '#fff',
                  cursor: canInteract ? 'pointer' : 'default',
                  boxSizing: 'border-box',
                  transition: 'background 0.1s',
                }}
              />
            );
          })
        )}
      </div>
      <button
        onClick={handleSubmit}
        disabled={ships.length !== CLASSIC_SHIPS.length}
        style={{marginTop: 12}}
      >
        Confirm Placement
      </button>
    </div>
  );
}

export default ShipPlacement;
