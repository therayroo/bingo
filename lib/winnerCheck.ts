import type { WinningRules } from "./rpc";

type Grid = number[][];
type DrawnSet = Set<number>;

export function checkWinningPattern(
  grid: Grid,
  drawnSet: DrawnSet,
  rules: WinningRules
): string | null {
  // Check each pattern in priority order
  
  // Full House / Blackout
  if (rules.fullHouse && checkFullHouse(grid, drawnSet)) {
    return "fullHouse";
  }

  // Two Lines
  if (rules.twoLines && checkTwoLines(grid, drawnSet)) {
    return "twoLines";
  }

  // X Pattern
  if (rules.xPattern && checkXPattern(grid, drawnSet)) {
    return "xPattern";
  }

  // Plus Pattern
  if (rules.plusPattern && checkPlusPattern(grid, drawnSet)) {
    return "plusPattern";
  }

  // Four Corners
  if (rules.fourCorners && checkFourCorners(grid, drawnSet)) {
    return "fourCorners";
  }

  // Diagonal
  if (rules.diagonal && checkDiagonal(grid, drawnSet)) {
    return "diagonal";
  }

  // Single Line
  if (rules.singleLine && checkSingleLine(grid, drawnSet)) {
    return "singleLine";
  }

  // Custom Numbers
  if (rules.customNumbers.trim() && checkCustomNumbers(grid, drawnSet, rules.customNumbers)) {
    return "customNumbers";
  }

  return null;
}

function isDrawn(value: number, row: number, col: number, drawnSet: DrawnSet): boolean {
  const isFree = value === 0 && row === 2 && col === 2;
  return isFree || drawnSet.has(value);
}

function checkFullHouse(grid: Grid, drawnSet: DrawnSet): boolean {
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 5; c++) {
      if (!isDrawn(grid[r][c], r, c, drawnSet)) {
        return false;
      }
    }
  }
  return true;
}

function checkSingleLine(grid: Grid, drawnSet: DrawnSet): boolean {
  // Check horizontal lines
  for (let r = 0; r < 5; r++) {
    if (grid[r].every((val, c) => isDrawn(val, r, c, drawnSet))) {
      return true;
    }
  }

  // Check vertical lines
  for (let c = 0; c < 5; c++) {
    if (Array.from({ length: 5 }).every((_, r) => isDrawn(grid[r][c], r, c, drawnSet))) {
      return true;
    }
  }

  return false;
}

function checkTwoLines(grid: Grid, drawnSet: DrawnSet): boolean {
  let lineCount = 0;

  // Count horizontal lines
  for (let r = 0; r < 5; r++) {
    if (grid[r].every((val, c) => isDrawn(val, r, c, drawnSet))) {
      lineCount++;
    }
  }

  // Count vertical lines
  for (let c = 0; c < 5; c++) {
    if (Array.from({ length: 5 }).every((_, r) => isDrawn(grid[r][c], r, c, drawnSet))) {
      lineCount++;
    }
  }

  return lineCount >= 2;
}

function checkDiagonal(grid: Grid, drawnSet: DrawnSet): boolean {
  // Top-left to bottom-right
  const diag1 = Array.from({ length: 5 }).every((_, i) => isDrawn(grid[i][i], i, i, drawnSet));
  
  // Top-right to bottom-left
  const diag2 = Array.from({ length: 5 }).every((_, i) => isDrawn(grid[i][4 - i], i, 4 - i, drawnSet));

  return diag1 || diag2;
}

function checkFourCorners(grid: Grid, drawnSet: DrawnSet): boolean {
  return (
    isDrawn(grid[0][0], 0, 0, drawnSet) &&
    isDrawn(grid[0][4], 0, 4, drawnSet) &&
    isDrawn(grid[4][0], 4, 0, drawnSet) &&
    isDrawn(grid[4][4], 4, 4, drawnSet)
  );
}

function checkXPattern(grid: Grid, drawnSet: DrawnSet): boolean {
  // Both diagonals must be complete
  const diag1 = Array.from({ length: 5 }).every((_, i) => isDrawn(grid[i][i], i, i, drawnSet));
  const diag2 = Array.from({ length: 5 }).every((_, i) => isDrawn(grid[i][4 - i], i, 4 - i, drawnSet));
  
  return diag1 && diag2;
}

function checkPlusPattern(grid: Grid, drawnSet: DrawnSet): boolean {
  // Middle row and middle column
  const middleRow = grid[2].every((val, c) => isDrawn(val, 2, c, drawnSet));
  const middleCol = Array.from({ length: 5 }).every((_, r) => isDrawn(grid[r][2], r, 2, drawnSet));
  
  return middleRow && middleCol;
}

function checkCustomNumbers(grid: Grid, drawnSet: DrawnSet, customNumbers: string): boolean {
  const numbers = customNumbers
    .split(",")
    .map((n) => parseInt(n.trim()))
    .filter((n) => !isNaN(n) && n >= 1 && n <= 75);

  if (numbers.length === 0) return false;

  // Check if all custom numbers are drawn
  return numbers.every((n) => drawnSet.has(n));
}

export function getPatternName(patternType: string): string {
  const names: Record<string, string> = {
    singleLine: "Single Line",
    twoLines: "Two Lines",
    fullHouse: "Full House",
    fourCorners: "Four Corners",
    diagonal: "Diagonal",
    xPattern: "X Pattern",
    plusPattern: "Plus Pattern",
    customNumbers: "Custom Numbers",
  };
  return names[patternType] || patternType;
}
