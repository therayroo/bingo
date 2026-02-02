"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ensureAnonymousAuth } from "@/lib/auth";
import { fetchMyCard, fetchSessionByCode, fetchDrawHistory, rpcCreateMyCard, fetchWinningRules, type WinningRules, type CardColor, rpcClaimWin, fetchSessionWinners } from "@/lib/rpc";
import { subscribeToDraws, subscribeToSessionState, subscribeToWinners } from "@/lib/realtime";
import { subscribeToSessionTransition } from "@/lib/transitions";
import { supabase } from "@/lib/supabaseClient";
import { COL_LABELS, numberToLabel } from "@/lib/bingoCard";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { checkWinningPattern, getPatternName } from "@/lib/winnerCheck";
import { WinningCardDisplay } from "@/components/WinningCardDisplay";
import { WinningPatternThumbnail } from "@/components/WinningPatternThumbnail";
import { ThemeToggle } from "@/components/theme-toggle";

type Cell = { value: number; isFree: boolean; isDrawn: boolean; isMarked: boolean };

export default function PlayPage() {
  const params = useParams<{ code: string }>();
  const router = useRouter();
  const code = (params.code ?? "").toUpperCase();

  const [grid, setGrid] = useState<number[][] | null>(null);
  const [drawnSet, setDrawnSet] = useState<Set<number>>(new Set());
  const [markedSet, setMarkedSet] = useState<Set<string>>(new Set()); // local only
  const [err, setErr] = useState<string | null>(null);
  const [latestDraw, setLatestDraw] = useState<number | null>(null);
  const [showPopup, setShowPopup] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const [winningRules, setWinningRules] = useState<WinningRules | null>(null);
  const [cardColor, setCardColor] = useState<CardColor>("blue");
  const [winners, setWinners] = useState<{user_id: string; nickname: string; pattern_type: string}[]>([]);
  const [showWinDialog, setShowWinDialog] = useState(false);
  const [myWinPattern, setMyWinPattern] = useState<string | null>(null);

  useEffect(() => {
    let unsub: null | (() => void) = null;
    let unsubTransition: null | (() => void) = null;
    let unsubState: null | (() => void) = null;
    let unsubWinners: null | (() => void) = null;
    const timers = { exit: null as NodeJS.Timeout | null, hide: null as NodeJS.Timeout | null };

    (async () => {
      setErr(null);
      try {
        await ensureAnonymousAuth();

        // Ensure card exists (requires the player already joined via /join)
        await rpcCreateMyCard(code);

        const s = await fetchSessionByCode(code);
        console.log('[PlayPage] Session loaded:', s.id);

        const my = await fetchMyCard(s.id);
        setGrid(my.grid);
        setCardColor(my.color);

        const history = await fetchDrawHistory(s.id);
        setDrawnSet(new Set(history.map((d) => d.number)));

        // Fetch winning rules
        const rules = await fetchWinningRules(s.id);
        setWinningRules(rules);

        console.log('[PlayPage] About to subscribe to draws for session:', s.id);
        unsub = subscribeToDraws(s.id, async (row) => {
          console.log('[PlayPage] ====> CALLBACK FIRED! New draw received:', row.number);
          console.log('[PlayPage] ====> Current showPopup state:', showPopup);
          console.log('[PlayPage] ====> Current latestDraw state:', latestDraw);
          
          // Update drawn set using function updater to avoid stale closure
          setDrawnSet((prev) => {
            const newDrawnSet = new Set(prev).add(row.number);
            
            // Check for win after adding this number
            if (rules && my.grid) {
              const winPattern = checkWinningPattern(my.grid, newDrawnSet, rules);
              if (winPattern) {
                console.log('[PlayPage] Win detected! Pattern:', winPattern);
                rpcClaimWin(code, winPattern).catch((e) => {
                  console.log('[PlayPage] Win already claimed or error:', e);
                });
              }
            }
            
            return newDrawnSet;
          });
          
          // Clear any existing popup timers
          if (timers.exit) clearTimeout(timers.exit);
          if (timers.hide) clearTimeout(timers.hide);
          
          // Show popup for new draw
          console.log('[PlayPage] ====> Setting states for popup...');
          setLatestDraw(row.number);
          setIsExiting(false);
          setShowPopup(true);
          console.log('[PlayPage] ====> States set. latestDraw:', row.number, 'showPopup: true');
          
          // Start exit animation before hiding
          timers.exit = setTimeout(() => {
            console.log('[PlayPage] Starting popup exit animation');
            setIsExiting(true);
          }, 2400);
          timers.hide = setTimeout(() => {
            console.log('[PlayPage] Hiding popup');
            setShowPopup(false);
          }, 3000);
        });
        console.log('[PlayPage] ====> Subscription setup complete for session:', s.id);

        // Subscribe to winners
        unsubWinners = subscribeToWinners(s.id, async (winner) => {
          console.log('[PlayPage] Winner announced:', winner);
          const allWinners = await fetchSessionWinners(s.id);
          setWinners(allWinners);
          
          // Check if I won
          const { data: { user } } = await supabase.auth.getUser();
          if (user && winner.user_id === user.id) {
            setMyWinPattern(winner.pattern_type);
            setShowWinDialog(true);
          }
        });

        unsubTransition = subscribeToSessionTransition(s.id, async ({ new_session_id }) => {
          // Get the new session code (member row already copied by RPC)
          const { data, error } = await supabase
            .from("bingo_sessions")
            .select("code")
            .eq("id", new_session_id)
            .single();

          if (!error && data?.code) {
            window.location.href = `/play/${data.code}`;
          }
        });

        // Subscribe to session state changes
        unsubState = subscribeToSessionState(s.id, (state) => {
          if (state === "ended") {
            // Redirect to home page when session ends
            router.push("/");
          }
        });
      } catch (e) {
        setErr(e instanceof Error ? e.message : String(e));
      }
    })();

    return () => {
      console.log('[PlayPage] Cleaning up subscriptions');
      if (unsub) unsub();
      if (unsubTransition) unsubTransition();
      if (unsubState) unsubState();
      if (unsubWinners) unsubWinners();
      
      // Clear popup timers on cleanup
      if (timers.exit) clearTimeout(timers.exit);
      if (timers.hide) clearTimeout(timers.hide);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, router]);

  const activePatterns = useMemo(() => {
    if (!winningRules) return [];
    
    const patterns = [];
    if (winningRules.singleLine) patterns.push({ name: "Single Line", type: "singleLine" });
    if (winningRules.twoLines) patterns.push({ name: "Two Lines", type: "twoLines" });
    if (winningRules.fullHouse) patterns.push({ name: "Full House", type: "fullHouse" });
    if (winningRules.fourCorners) patterns.push({ name: "Four Corners", type: "fourCorners" });
    if (winningRules.diagonal) patterns.push({ name: "Diagonal", type: "diagonal" });
    if (winningRules.xPattern) patterns.push({ name: "X Pattern", type: "xPattern" });
    if (winningRules.plusPattern) patterns.push({ name: "Plus Pattern", type: "plusPattern" });
    if (winningRules.customNumbers) {
      patterns.push({ name: `Custom: ${winningRules.customNumbers}`, type: "custom" });
    }
    
    return patterns;
  }, [winningRules]);

  const cells: Cell[][] | null = useMemo(() => {
    if (!grid) return null;
    return grid.map((row, r) =>
      row.map((value, c) => {
        const isFree = value === 0 && r === 2 && c === 2;
        const isDrawn = isFree ? true : drawnSet.has(value);
        const key = `${r}:${c}`;
        const isMarked = isFree ? true : markedSet.has(key);
        return { value, isFree, isDrawn, isMarked };
      })
    );
  }, [grid, drawnSet, markedSet]);

  function toggleMark(r: number, c: number, cell: Cell) {
    if (cell.isFree) return;

    const key = `${r}:${c}`;
    setMarkedSet((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  // Helper to get card color classes for text and borders
  const getCardColorClasses = (color: CardColor) => {
    const colorMap = {
      blue: { text: "text-blue-600", border: "border-blue-500", ring: "ring-blue-500", bg: "bg-blue-500" },
      red: { text: "text-red-600", border: "border-red-500", ring: "ring-red-500", bg: "bg-red-500" },
      orange: { text: "text-orange-600", border: "border-orange-500", ring: "ring-orange-500", bg: "bg-orange-500" },
      black: { text: "text-gray-900", border: "border-gray-900", ring: "ring-gray-900", bg: "bg-gray-900" },
    };
    return colorMap[color];
  };

  const cardColorClasses = getCardColorClasses(cardColor);

  function PatternThumbnail({ type, name }: { type: string; name: string }) {
    const getPattern = () => {
      const pattern: boolean[][] = Array(5).fill(null).map(() => Array(5).fill(false));
      
      switch (type) {
        case 'singleLine':
          // Show one horizontal line as example
          for (let c = 0; c < 5; c++) pattern[0][c] = true;
          break;
        case 'twoLines':
          for (let c = 0; c < 5; c++) {
            pattern[0][c] = true;
            pattern[1][c] = true;
          }
          break;
        case 'fullHouse':
          for (let r = 0; r < 5; r++) {
            for (let c = 0; c < 5; c++) pattern[r][c] = true;
          }
          break;
        case 'fourCorners':
          pattern[0][0] = true;
          pattern[0][4] = true;
          pattern[4][0] = true;
          pattern[4][4] = true;
          break;
        case 'diagonal':
          for (let i = 0; i < 5; i++) {
            pattern[i][i] = true;
            pattern[i][4 - i] = true;
          }
          break;
        case 'xPattern':
          for (let i = 0; i < 5; i++) {
            pattern[i][i] = true;
            pattern[i][4 - i] = true;
          }
          break;
        case 'plusPattern':
          for (let i = 0; i < 5; i++) {
            pattern[2][i] = true;
            pattern[i][2] = true;
          }
          break;
      }
      
      return pattern;
    };

    const pattern = getPattern();

    return (
      <div className="flex flex-col items-center gap-2 p-3 bg-card rounded-lg border">
        <div className="grid grid-cols-5 gap-0.5">
          {pattern.map((row, r) =>
            row.map((isActive, c) => {
              const isFree = r === 2 && c === 2;
              return (
                <div
                  key={`${r}-${c}`}
                  className={`w-4 h-4 rounded-sm ${
                    isActive || isFree
                      ? 'bg-primary'
                      : 'bg-muted'
                  }`}
                />
              );
            })
          )}
        </div>
        <span className="text-xs font-medium text-center">{name}</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 via-zinc-50 to-slate-100 dark:from-slate-950 dark:via-zinc-950 dark:to-slate-900">
      <header className="p-4 md:p-6 border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10 shadow-sm">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div>
            <div className="text-xs md:text-sm text-muted-foreground font-medium">Session</div>
            <Badge variant="outline" className="text-lg md:text-xl font-bold mt-1">{code}</Badge>
          </div>
          <div className="text-right flex items-center gap-3">
            <div>
              <div className="text-xs md:text-sm text-muted-foreground font-medium">Drawn</div>
              <div className="text-lg md:text-xl font-bold mt-1">
                {drawnSet.size}<span className="text-muted-foreground">/75</span>
              </div>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-4 md:p-8">
        {!cells ? (
          <div className="text-center">
            <div className="animate-pulse text-muted-foreground text-lg">Loading your card...</div>
          </div>
        ) : (
          <div className="w-full max-w-2xl">
            <div className="grid grid-cols-5 gap-2 md:gap-3 mb-3 md:mb-4">
              {COL_LABELS.map((l) => (
                <div key={l} className={`text-center font-black text-4xl md:text-6xl tracking-wider drop-shadow-sm ${cardColorClasses.text}`}>
                  {l}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-5 gap-2 md:gap-3">
              {cells.flatMap((row, r) =>
                row.map((cell, c) => {
                  return (
                    <button
                      key={`${r}-${c}`}
                      onClick={() => toggleMark(r, c, cell)}
                      className={`
                        bingo-cell
                        aspect-square rounded-xl md:rounded-2xl border-2
                        font-bold
                        transition-all duration-200
                        ${cell.isMarked 
                          ? `${cardColorClasses.bg} ${cardColorClasses.border} text-white shadow-2xl scale-95 border-4` 
                          : `${cardColorClasses.text} bg-card ${cell.isDrawn ? `${cardColorClasses.border} ring-2 ${cardColorClasses.ring} ring-opacity-50` : 'border-border'} shadow-md hover:shadow-xl`
                        }
                      `}
                      style={{ fontSize: cell.isFree ? '1.2rem' : 'clamp(2rem, 8vw, 5rem)' }}
                      title={cell.isFree ? "FREE" : cell.isDrawn ? "Drawn - tap to mark" : "Not drawn yet"}
                      disabled={cell.isFree}
                    >
                      {cell.isFree ? "FREE" : cell.value}
                    </button>
                  );
                })
              )}
            </div>

            <div className="mt-6 text-center text-sm text-muted-foreground bg-card/50 backdrop-blur-sm rounded-lg p-3 border">
              💡 <span className="font-medium">Tip:</span> Tap cells to mark them. Drawn numbers have a colored border.
            </div>

            {/* Winning Patterns */}
            {activePatterns.length > 0 && (
              <div className="mt-6">
                <h3 className="text-sm font-semibold text-center mb-3">Winning Patterns</h3>
                <div className="flex flex-wrap justify-center gap-3">
                  {activePatterns.map((pattern) => (
                    <PatternThumbnail key={pattern.type} type={pattern.type} name={pattern.name} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Number Popup - Always mounted for smooth transitions */}
      <div 
        className={`fixed inset-0 flex items-center justify-center z-50 transition-opacity duration-500 ${
          showPopup ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        style={{ display: latestDraw === null ? 'none' : 'flex' }}
      >
        <div 
          className={`bg-gradient-to-br from-primary to-primary/80 text-primary-foreground rounded-3xl shadow-2xl p-8 md:p-12 border-4 border-white transition-all duration-600 ease-out ${
            showPopup && !isExiting
              ? 'scale-100 translate-y-0 opacity-100' 
              : isExiting
              ? 'scale-75 -translate-y-12 opacity-0'
              : 'scale-50 translate-y-12 opacity-0'
          }`}
          style={{ 
            animation: showPopup && !isExiting ? 'pop-in 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55)' : 'none'
          }}
        >
          <div className="text-sm md:text-base font-semibold tracking-wide opacity-90 mb-2">DRAWN</div>
          <div className="text-6xl md:text-8xl font-black tracking-tight drop-shadow-lg">
            {latestDraw !== null ? numberToLabel(latestDraw) : ''}
          </div>
        </div>
      </div>

      {/* Winner Dialog */}
      {showWinDialog && myWinPattern && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <Card className="max-w-md mx-4 border-4 border-yellow-500 shadow-2xl overflow-hidden p-0">
            <CardHeader className="bg-gradient-to-r from-yellow-400 to-orange-400 text-white pt-8 pb-8 px-6 space-y-0">
              <CardTitle className="text-3xl text-center font-bold m-0">🎉 BINGO! 🎉</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              {grid && (
                <WinningCardDisplay 
                  grid={grid} 
                  drawnSet={drawnSet} 
                  patternType={myWinPattern}
                  color={cardColor}
                />
              )}
              <p className="text-xl text-center">
                You won with: <strong className="text-primary">{getPatternName(myWinPattern)}</strong>
              </p>
              <p className="text-sm text-muted-foreground text-center">
                Waiting for GM to end session or start next round...
              </p>
              {winners.length > 1 && (
                <div className="pt-4 border-t">
                  <h4 className="font-semibold mb-2 text-center">Other Winners:</h4>
                  <div className="space-y-1">
                    {winners.filter(w => w.user_id !== myWinPattern).map((w, i) => (
                      <div key={i} className="text-sm text-center">
                        {w.nickname} - {getPatternName(w.pattern_type)}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Winners List (for non-winners to see) */}
      {!showWinDialog && winners.length > 0 && (
        <div className="fixed bottom-4 right-4 z-40">
          <Card className="border-2 border-yellow-500 bg-yellow-50/95 shadow-lg">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">🏆 Winners</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {winners.map((w, i) => (
                <div key={i} className="space-y-2">
                  <div className="text-sm font-semibold text-center">
                    {w.nickname} - {getPatternName(w.pattern_type)}
                  </div>
                  <WinningPatternThumbnail patternType={w.pattern_type} size="sm" />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      {err && (
        <footer className="p-4 md:p-6 border-t bg-destructive/10 backdrop-blur-sm">
          <div className="max-w-4xl mx-auto text-destructive font-medium">
            {err}
          </div>
        </footer>
      )}
    </div>
  );
}
