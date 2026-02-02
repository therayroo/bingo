interface WinningPatternThumbnailProps {
  patternType: string;
  size?: 'sm' | 'md' | 'lg';
}

export function WinningPatternThumbnail({ patternType, size = 'md' }: WinningPatternThumbnailProps) {
  const gridSize = size === 'sm' ? 'w-3 h-3' : size === 'md' ? 'w-4 h-4' : 'w-6 h-6';
  const containerSize = size === 'sm' ? 'w-20' : size === 'md' ? 'w-28' : 'w-40';
  
  // Define which cells are highlighted for each pattern
  const getPatternCells = (): boolean[][] => {
    const grid = Array(5).fill(null).map(() => Array(5).fill(false));
    
    switch (patternType) {
      case 'singleLine':
        // Show a horizontal line example
        for (let c = 0; c < 5; c++) grid[0][c] = true;
        break;
        
      case 'twoLines':
        // Show two horizontal lines
        for (let c = 0; c < 5; c++) {
          grid[0][c] = true;
          grid[4][c] = true;
        }
        break;
        
      case 'fullHouse':
        // All cells
        for (let r = 0; r < 5; r++) {
          for (let c = 0; c < 5; c++) {
            grid[r][c] = true;
          }
        }
        break;
        
      case 'fourCorners':
        // Four corners
        grid[0][0] = true;
        grid[0][4] = true;
        grid[4][0] = true;
        grid[4][4] = true;
        break;
        
      case 'diagonal':
        // One diagonal example
        for (let i = 0; i < 5; i++) {
          grid[i][i] = true;
        }
        break;
        
      case 'xPattern':
        // Both diagonals
        for (let i = 0; i < 5; i++) {
          grid[i][i] = true;
          grid[i][4 - i] = true;
        }
        break;
        
      case 'plusPattern':
        // Middle row and column
        for (let i = 0; i < 5; i++) {
          grid[2][i] = true; // middle row
          grid[i][2] = true; // middle column
        }
        break;
        
      case 'customNumbers':
        // Show a generic pattern
        grid[1][1] = true;
        grid[1][3] = true;
        grid[3][1] = true;
        grid[3][3] = true;
        break;
        
      default:
        // Default to a single line
        for (let c = 0; c < 5; c++) grid[0][c] = true;
    }
    
    // Center is always free
    grid[2][2] = true;
    
    return grid;
  };
  
  const pattern = getPatternCells();
  
  return (
    <div className={`${containerSize} mx-auto`}>
      <div className="grid grid-cols-5 gap-0.5 bg-gray-300 p-0.5 rounded">
        {pattern.map((row, r) =>
          row.map((isHighlighted, c) => (
            <div
              key={`${r}-${c}`}
              className={`${gridSize} rounded-sm ${
                isHighlighted
                  ? 'bg-yellow-400 border border-yellow-600'
                  : 'bg-white border border-gray-200'
              }`}
            />
          ))
        )}
      </div>
    </div>
  );
}
