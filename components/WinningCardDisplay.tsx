import { COL_LABELS } from "@/lib/bingoCard";

interface WinningCardDisplayProps {
  grid: number[][];
  drawnSet: Set<number>;
  patternType: string;
  color?: string;
}

export function WinningCardDisplay({ grid, drawnSet, patternType, color = "blue" }: WinningCardDisplayProps) {
  // Determine which cells are part of the winning pattern
  const isWinningCell = (r: number, c: number): boolean => {
    const isFree = r === 2 && c === 2;
    
    switch (patternType) {
      case 'singleLine':
        // Check if this cell is in any complete line
        // Row
        const rowComplete = grid[r].every((val, col) => {
          const cellIsFree = r === 2 && col === 2;
          return cellIsFree || drawnSet.has(val);
        });
        if (rowComplete) return true;
        
        // Column
        const colComplete = grid.every((row, rowIdx) => {
          const cellIsFree = rowIdx === 2 && c === 2;
          const val = row[c];
          return cellIsFree || drawnSet.has(val);
        });
        if (colComplete) return true;
        
        // Diagonal top-left to bottom-right
        if (r === c) {
          const diag1Complete = grid.every((row, idx) => {
            const cellIsFree = idx === 2 && idx === 2;
            const val = row[idx];
            return cellIsFree || drawnSet.has(val);
          });
          if (diag1Complete) return true;
        }
        
        // Diagonal top-right to bottom-left
        if (r + c === 4) {
          const diag2Complete = grid.every((row, idx) => {
            const cellIsFree = idx === 2 && (4 - idx) === 2;
            const val = row[4 - idx];
            return cellIsFree || drawnSet.has(val);
          });
          if (diag2Complete) return true;
        }
        
        return false;
        
      case 'twoLines':
        // Similar to singleLine but count completed lines
        let completedLines = 0;
        let isInCompletedLine = false;
        
        // Check rows
        for (let row = 0; row < 5; row++) {
          const rowComplete = grid[row].every((val, col) => {
            const cellIsFree = row === 2 && col === 2;
            return cellIsFree || drawnSet.has(val);
          });
          if (rowComplete) {
            completedLines++;
            if (row === r) isInCompletedLine = true;
          }
        }
        
        // Check columns
        for (let col = 0; col < 5; col++) {
          const colComplete = grid.every((row, rowIdx) => {
            const cellIsFree = rowIdx === 2 && col === 2;
            const val = row[col];
            return cellIsFree || drawnSet.has(val);
          });
          if (colComplete) {
            completedLines++;
            if (col === c) isInCompletedLine = true;
          }
        }
        
        return completedLines >= 2 && isInCompletedLine;
        
      case 'fullHouse':
        return true; // All cells
        
      case 'fourCorners':
        return (r === 0 && c === 0) || (r === 0 && c === 4) || (r === 4 && c === 0) || (r === 4 && c === 4);
        
      case 'diagonal':
        return (r === c) || (r + c === 4);
        
      case 'xPattern':
        return (r === c) || (r + c === 4);
        
      case 'plusPattern':
        return r === 2 || c === 2;
        
      default:
        return isFree;
    }
  };
  
  const colorClasses = {
    blue: { bg: 'bg-blue-500', border: 'border-blue-600', text: 'text-blue-600' },
    green: { bg: 'bg-green-500', border: 'border-green-600', text: 'text-green-600' },
    red: { bg: 'bg-red-500', border: 'border-red-600', text: 'text-red-600' },
    purple: { bg: 'bg-purple-500', border: 'border-purple-600', text: 'text-purple-600' },
    orange: { bg: 'bg-orange-500', border: 'border-orange-600', text: 'text-orange-600' },
  }[color] || { bg: 'bg-blue-500', border: 'border-blue-600', text: 'text-blue-600' };

  return (
    <div className="max-w-sm mx-auto">
      {/* Column Headers */}
      <div className="grid grid-cols-5 gap-1 mb-1">
        {COL_LABELS.map((label) => (
          <div key={label} className={`text-center font-black text-xl ${colorClasses.text}`}>
            {label}
          </div>
        ))}
      </div>

      {/* Bingo Grid */}
      <div className="grid grid-cols-5 gap-1">
        {grid.map((row, r) =>
          row.map((value, c) => {
            const isFree = value === 0 && r === 2 && c === 2;
            const isDrawn = isFree ? true : drawnSet.has(value);
            const isWinner = isWinningCell(r, c);

            return (
              <div
                key={`${r}:${c}`}
                className={`
                  aspect-square rounded-lg flex items-center justify-center
                  font-bold text-lg transition-all
                  ${isWinner
                    ? 'bg-yellow-400 border-4 border-yellow-600 text-yellow-900 shadow-lg ring-2 ring-yellow-500'
                    : isDrawn 
                    ? `${colorClasses.bg} ${colorClasses.border} text-white shadow-md border-2` 
                    : 'bg-card border-2 border-border'
                  }
                `}
                style={{ fontSize: isFree ? '0.6rem' : undefined }}
              >
                {isFree ? "FREE" : value}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
