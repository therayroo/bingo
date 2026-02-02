"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ensureAnonymousAuth } from "@/lib/auth";
import { fetchDrawHistory, fetchSessionByCode, fetchMyCard, rpcCreateMyCard, rpcDrawRandomNumber, rpcJoinSession, rpcEndSession, rpcStartNextSession, fetchParticipants, rpcUpdateWinningRules, fetchWinningRules, type WinningRules, fetchParticipantCards, type CardColor } from "@/lib/rpc";
import { subscribeToDraws, subscribeToCards, subscribeToSessionState } from "@/lib/realtime";
import { supabase } from "@/lib/supabaseClient";
import { numberToLabel, COL_LABELS } from "@/lib/bingoCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

function qrUrl(url: string) {
  // External QR image generator (no UI libs). This is just an <img>.
  const encoded = encodeURIComponent(url);
  return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encoded}`;
}

type Cell = { value: number; isFree: boolean; isDrawn: boolean };

export default function GmPage() {
  const router = useRouter();
  const params = useParams<{ code: string }>();
  const code = (params.code ?? "").toUpperCase();

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [title, setTitle] = useState<string>("");
  const [state, setState] = useState<string>("");
  const [history, setHistory] = useState<{ number: number; drawn_at: string }[]>([]);
  const [grid, setGrid] = useState<number[][] | null>(null);
  const [drawnSet, setDrawnSet] = useState<Set<number>>(new Set());
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [showNextRoundDialog, setShowNextRoundDialog] = useState(false);
  const [nextRoundTitle, setNextRoundTitle] = useState("");
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [participants, setParticipants] = useState<
    { user_id: string; nickname: string; role: "gm" | "player"; created_at: string }[]
  >([]);
  const [participantCards, setParticipantCards] = useState<
    Map<string, { grid: number[][]; color: CardColor }>
  >(new Map());
  const [gmCardColor, setGmCardColor] = useState<CardColor>("blue");
  const [winningRules, setWinningRules] = useState<WinningRules>({
    singleLine: true,
    twoLines: false,
    fullHouse: false,
    fourCorners: false,
    diagonal: false,
    xPattern: false,
    plusPattern: false,
    customNumbers: "",
  });

  const joinLink = useMemo(() => {
    // Use full URL for QR codes
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    return origin ? `${origin}/join/${code}` : `/join/${code}`;
  }, [code]);

  useEffect(() => {
    let unsub: null | (() => void) = null;
    let unsubCards: null | (() => void) = null;
    let unsubState: null | (() => void) = null;
    let channelPlayers: ReturnType<typeof supabase.channel> | null = null;

    (async () => {
      setErr(null);
      try {
        await ensureAnonymousAuth();

        // Ensure GM is joined (role enforced by backend if user_id matches gm_user_id)
        await rpcJoinSession(code, "GM");

        // Ensure GM has a card too
        await rpcCreateMyCard(code);

        const s = await fetchSessionByCode(code);
        setSessionId(s.id);
        setTitle(s.title);
        setState(s.state);

        const h = await fetchDrawHistory(s.id);
        setHistory(h);
        setDrawnSet(new Set(h.map((d) => d.number)));

        // Fetch GM's card
        const my = await fetchMyCard(s.id);
        setGrid(my.grid);

        // Fetch participants
        const ppl = await fetchParticipants(s.id);
        setParticipants(ppl);

        // Fetch participant cards (colors are now saved in DB)
        const cards = await fetchParticipantCards(s.id);
        const cardMap = new Map<string, { grid: number[][]; color: CardColor }>();
        const { data: { user } } = await supabase.auth.getUser();
        
        cards.forEach((card) => {
          cardMap.set(card.user_id, { grid: card.grid, color: card.color });
          
          // Store GM's color
          if (user && card.user_id === user.id) {
            setGmCardColor(card.color);
          }
        });
        setParticipantCards(cardMap);

        // Fetch winning rules
        const rules = await fetchWinningRules(s.id);
        if (rules) {
          setWinningRules(rules);
        }

        unsub = subscribeToDraws(s.id, (row) => {
          setHistory((prev) => [{ number: row.number, drawn_at: row.drawn_at }, ...prev]);
          setDrawnSet((prev) => new Set(prev).add(row.number));
          setState("live");
        });

        // Subscribe to new cards
        unsubCards = subscribeToCards(s.id, (card) => {
          setParticipantCards((prev) => {
            const newMap = new Map(prev);
            newMap.set(card.user_id, { grid: card.grid, color: card.color as CardColor });
            return newMap;
          });
        });

        // Subscribe to session state changes
        unsubState = subscribeToSessionState(s.id, (state) => {
          setState(state);
          if (state === "ended") {
            // Redirect to home page when session ends
            setTimeout(() => {
              router.push("/");
            }, 2000); // Give GM a moment to see the state change
          }
        });

        // Subscribe to participant changes
        channelPlayers = supabase
          .channel(`bingo_players:${s.id}`)
          .on(
            "postgres_changes",
            {
              event: "INSERT",
              schema: "public",
              table: "bingo_players",
              filter: `session_id=eq.${s.id}`,
            },
            async () => {
              const ppl = await fetchParticipants(s.id);
              setParticipants(ppl);
            }
          )
          .on(
            "postgres_changes",
            {
              event: "UPDATE",
              schema: "public",
              table: "bingo_players",
              filter: `session_id=eq.${s.id}`,
            },
            async () => {
              const ppl = await fetchParticipants(s.id);
              setParticipants(ppl);
            }
          )
          .subscribe();
      } catch (e) {
        setErr(e instanceof Error ? e.message : String(e));
      }
    })();

    return () => {
      if (unsub) unsub();
      if (unsubCards) unsubCards();
      if (unsubState) unsubState();
      if (channelPlayers) supabase.removeChannel(channelPlayers);
    };
  }, [code, router]);

  // Auto-save winning rules when they change (only in lobby state)
  useEffect(() => {
    if (!sessionId || state !== "lobby") return;
    
    const saveRules = async () => {
      try {
        await rpcUpdateWinningRules(code, winningRules);
      } catch (e) {
        console.error('Failed to save winning rules:', e);
      }
    };

    saveRules();
  }, [winningRules, code, sessionId, state]);

  async function onDraw() {
    if (!sessionId) return;
    setBusy(true);
    setErr(null);
    try {
      await ensureAnonymousAuth();
      await rpcDrawRandomNumber(code);
      
      // Fetch latest history to update UI (in case realtime events don't fire)
      const h = await fetchDrawHistory(sessionId);
      setHistory(h);
      setDrawnSet(new Set(h.map((d) => d.number)));
      setState("live");
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function onEndSession() {
    if (!confirm("Are you sure you want to end this session? This cannot be undone.")) return;
    setBusy(true);
    setErr(null);
    try {
      await ensureAnonymousAuth();
      await rpcEndSession(code);
      setState("ended");
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function onStartNextRound() {
    if (!nextRoundTitle.trim()) {
      setErr("Please enter a title for the next round");
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      await ensureAnonymousAuth();
      const result = await rpcStartNextSession(code, nextRoundTitle.trim());
      // Redirect GM to the new session
      router.push(`/gm/${result.new_code}`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  function toggleRule(rule: keyof typeof winningRules) {
    setWinningRules(prev => ({
      ...prev,
      [rule]: !prev[rule]
    }));
  }

  const cells: Cell[][] | null = useMemo(() => {
    if (!grid) return null;
    return grid.map((row, r) =>
      row.map((value, c) => {
        const isFree = value === 0 && r === 2 && c === 2;
        const isDrawn = isFree ? true : drawnSet.has(value);
        return { value, isFree, isDrawn };
      })
    );
  }, [grid, drawnSet]);

  const last = history[0]?.number ?? null;

  // Helper to get card color classes
  const getCardColorClasses = (color: CardColor) => {
    const colorMap = {
      blue: { text: "text-blue-600", bg: "bg-blue-500", border: "border-blue-600" },
      red: { text: "text-red-600", bg: "bg-red-500", border: "border-red-600" },
      orange: { text: "text-orange-600", bg: "bg-orange-500", border: "border-orange-600" },
      black: { text: "text-gray-900", bg: "bg-gray-900", border: "border-gray-950" },
    };
    return colorMap[color];
  };

  // Card Thumbnail Component
  const CardThumbnail = ({ userId, size = "small" }: { userId: string; size?: "small" | "large" }) => {
    const cardData = participantCards.get(userId);
    if (!cardData) return null;

    const { grid, color } = cardData;
    const colorClasses = getCardColorClasses(color);
    const cellSize = size === "small" ? "w-2 h-2" : "w-4 h-4";
    const gapSize = size === "small" ? "gap-0.5" : "gap-1";

    return (
      <div className={`grid grid-cols-5 ${gapSize}`}>
        {grid.flatMap((row, r) =>
          row.map((value, c) => {
            const isFree = value === 0 && r === 2 && c === 2;
            const isDrawn = isFree ? true : drawnSet.has(value);
            return (
              <div
                key={`${r}-${c}`}
                className={`${cellSize} rounded-sm ${
                  isDrawn 
                    ? `${colorClasses.bg} opacity-100` 
                    : 'bg-muted/30 border border-muted'
                }`}
              />
            );
          })
        )}
      </div>
    );
  };

  // Participants & Rules Component (reusable for desktop and drawer)
  const ParticipantsAndRulesContent = () => {
    // CardThumbnail needs to be defined in the same scope
    return (
    <div className="space-y-6">
      {/* Participants */}
      <Card className="card-3d">
        <CardHeader>
          <CardTitle>Participants</CardTitle>
          <CardDescription>{participants.length} joined</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="max-h-64 overflow-auto border rounded-lg bg-card">
            {participants.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground text-sm">
                No participants yet
              </div>
            ) : (
              <div className="divide-y">
                {participants.map((p) => {
                  const cardData = participantCards.get(p.user_id);
                  return (
                    <div
                      key={`${p.user_id}-${drawnSet.size}`}
                      className="p-3 hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          {/* Desktop: Show card thumbnail or placeholder */}
                          <div className="hidden lg:block flex-shrink-0">
                            {cardData ? (
                              <CardThumbnail userId={p.user_id} size="small" />
                            ) : (
                              <div className="grid grid-cols-5 gap-0.5">
                                {Array.from({ length: 25 }).map((_, i) => (
                                  <div key={i} className="w-2 h-2 rounded-sm bg-muted/20 border border-muted" />
                                ))}
                              </div>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-2 min-w-0">
                            {/* Color indicator for mobile */}
                            {cardData && (
                              <div 
                                className={`lg:hidden w-3 h-3 rounded-full flex-shrink-0 ${getCardColorClasses(cardData.color).bg}`}
                              />
                            )}
                            <span className="font-medium truncate">{p.nickname}</span>
                            {p.role === "gm" && (
                              <Badge variant="secondary" className="text-xs flex-shrink-0">GM</Badge>
                            )}
                          </div>
                        </div>
                        <span className="text-xs text-muted-foreground flex-shrink-0">
                          {new Date(p.created_at).toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Winning Rules */}
      <Card className="card-3d">
        <CardHeader>
          <CardTitle>Winning Rules</CardTitle>
          <CardDescription>
            {state === "lobby" 
              ? "Select valid winning patterns" 
              : "Winning patterns (locked after start)"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer hover:bg-accent/50 p-2 rounded transition-colors">
              <input
                type="checkbox"
                checked={winningRules.singleLine}
                onChange={() => toggleRule('singleLine')}
                disabled={state !== "lobby"}
                className="w-4 h-4"
              />
              <span className="text-sm font-medium">Single Line (Horizontal/Vertical)</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer hover:bg-accent/50 p-2 rounded transition-colors">
              <input
                type="checkbox"
                checked={winningRules.twoLines}
                onChange={() => toggleRule('twoLines')}
                disabled={state !== "lobby"}
                className="w-4 h-4"
              />
              <span className="text-sm font-medium">Two Lines</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer hover:bg-accent/50 p-2 rounded transition-colors">
              <input
                type="checkbox"
                checked={winningRules.fullHouse}
                onChange={() => toggleRule('fullHouse')}
                disabled={state !== "lobby"}
                className="w-4 h-4"
              />
              <span className="text-sm font-medium">Full House / Blackout</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer hover:bg-accent/50 p-2 rounded transition-colors">
              <input
                type="checkbox"
                checked={winningRules.fourCorners}
                onChange={() => toggleRule('fourCorners')}
                disabled={state !== "lobby"}
                className="w-4 h-4"
              />
              <span className="text-sm font-medium">Four Corners</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer hover:bg-accent/50 p-2 rounded transition-colors">
              <input
                type="checkbox"
                checked={winningRules.diagonal}
                onChange={() => toggleRule('diagonal')}
                disabled={state !== "lobby"}
                className="w-4 h-4"
              />
              <span className="text-sm font-medium">Diagonal</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer hover:bg-accent/50 p-2 rounded transition-colors">
              <input
                type="checkbox"
                checked={winningRules.xPattern}
                onChange={() => toggleRule('xPattern')}
                disabled={state !== "lobby"}
                className="w-4 h-4"
              />
              <span className="text-sm font-medium">X Pattern</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer hover:bg-accent/50 p-2 rounded transition-colors">
              <input
                type="checkbox"
                checked={winningRules.plusPattern}
                onChange={() => toggleRule('plusPattern')}
                disabled={state !== "lobby"}
                className="w-4 h-4"
              />
              <span className="text-sm font-medium">Plus / Cross Pattern</span>
            </label>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label htmlFor="customNumbers" className="text-sm font-medium">
              Custom Numbers (comma-separated)
            </Label>
            <Input
              id="customNumbers"
              placeholder="e.g., 1,15,30,45,75"
              value={winningRules.customNumbers}
              onChange={(e) => setWinningRules(prev => ({ ...prev, customNumbers: e.target.value }))}
              disabled={state !== "lobby"}
              className="text-sm"
            />
            <p className="text-xs text-muted-foreground">
              First player to mark all these numbers wins
            </p>
          </div>

          {state !== "lobby" && (
            <div className="mt-3 p-2 bg-muted rounded text-xs text-muted-foreground text-center">
              🔒 Winning rules are locked once the session starts
            </div>
          )}
        </CardContent>
      </Card>
    </div>
    );
  };

  return (
    <div className="min-h-screen p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div>
            <h1 className="text-4xl font-bold tracking-tight mb-1">GM Dashboard</h1>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="text-lg px-3 py-1">{code}</Badge>
              <Separator orientation="vertical" className="h-6" />
              <p className="text-muted-foreground">
                <span className="font-semibold text-foreground">{title}</span>
              </p>
              <Separator orientation="vertical" className="h-6" />
              <Badge variant={state === "live" ? "default" : "secondary"}>{state || "..."}</Badge>
            </div>
          </div>
          <div className="flex gap-2">
            {/* Mobile drawer trigger */}
            <Sheet open={mobileDrawerOpen} onOpenChange={setMobileDrawerOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="lg" className="lg:hidden">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                    <polyline points="9 22 9 12 15 12 15 22"></polyline>
                  </svg>
                  Participants & Rules
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[90vw] sm:w-96 overflow-y-auto">
                <SheetHeader>
                  <SheetTitle>Session Info</SheetTitle>
                  <SheetDescription>Participants and winning rules</SheetDescription>
                </SheetHeader>
                <div className="mt-6">
                  <ParticipantsAndRulesContent />
                </div>
              </SheetContent>
            </Sheet>

            <Button onClick={() => router.push(`/play/${code}`)} variant="outline" size="lg">
              Open My Card
            </Button>
          </div>
        </div>

        {/* 3-Column Desktop Layout, Responsive on Mobile */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT COLUMN - Participants & Rules (Desktop only) */}
          <div className="hidden lg:block lg:col-span-3 space-y-6">
            <ParticipantsAndRulesContent />
          </div>

          {/* CENTER COLUMN - Draw Controls */}
          <div className="lg:col-span-5">
            <Card className="card-3d">
              <CardHeader>
                <CardTitle>Draw Control</CardTitle>
                <CardDescription>Draw the next bingo number</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  <Button 
                    onClick={onDraw} 
                    disabled={busy || state === "ended"} 
                    size="lg"
                    className="w-full text-lg h-14 shadow-lg hover:shadow-xl transition-all"
                  >
                    {busy ? "Drawing..." : "🎲 Draw Next Number"}
                  </Button>

                  <div className="flex gap-3">
                    <Button
                      onClick={onEndSession}
                      disabled={busy || state === "ended"}
                      variant="destructive"
                      size="lg"
                      className="flex-1"
                    >
                      End Session
                    </Button>
                    <Button
                      onClick={() => {
                        setShowNextRoundDialog(!showNextRoundDialog);
                        setNextRoundTitle("");
                        setErr(null);
                      }}
                      disabled={busy || state === "ended"}
                      variant="default"
                      size="lg"
                      className="flex-1"
                    >
                      Start Next Round
                    </Button>
                  </div>

                  {showNextRoundDialog && (
                    <Card className="border-primary/50 shadow-lg">
                      <CardContent className="pt-6 space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="nextRoundTitle">Next Round Title</Label>
                          <Input
                            id="nextRoundTitle"
                            placeholder="e.g., Round 2, Final Round"
                            value={nextRoundTitle}
                            onChange={(e) => setNextRoundTitle(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                onStartNextRound();
                              }
                            }}
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button
                            onClick={onStartNextRound}
                            disabled={busy || !nextRoundTitle.trim()}
                            className="flex-1"
                          >
                            {busy ? "Creating..." : "Create & Start"}
                          </Button>
                          <Button
                            onClick={() => setShowNextRoundDialog(false)}
                            variant="outline"
                          >
                            Cancel
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          This will create a new session and automatically redirect all players to the new round.
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </div>

                <div className="text-center p-8 bg-gradient-to-br from-primary/5 to-primary/10 rounded-xl border-2 border-primary/20">
                  <div className="text-sm font-medium text-muted-foreground mb-2">Last Drawn</div>
                  <div className="text-7xl font-black tracking-tight bg-gradient-to-br from-primary to-primary/60 bg-clip-text text-transparent">
                    {last ? numberToLabel(last) : "—"}
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-3 text-lg">Draw History</h3>
                  <div className="max-h-80 overflow-auto border rounded-lg bg-card">
                    {history.length === 0 ? (
                      <div className="p-6 text-center text-muted-foreground">No draws yet.</div>
                    ) : (
                      <div className="divide-y">
                        {history.map((d, idx) => (
                          <div 
                            key={`${d.number}-${d.drawn_at}`} 
                            className="p-4 hover:bg-accent/50 transition-colors flex items-center justify-between"
                            style={{
                              animation: idx === 0 ? 'slide-in 0.4s ease-out' : undefined
                            }}
                          >
                            <div className="flex items-center gap-3">
                              <Badge className="text-lg px-3 py-1">{numberToLabel(d.number)}</Badge>
                              <span className="text-sm text-muted-foreground">
                                {new Date(d.drawn_at).toLocaleString()}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* RIGHT COLUMN - QR + GM Card */}
          <div className="lg:col-span-4 space-y-6">
            {/* QR Code */}
            <Card className="card-3d">
              <CardHeader>
                <CardTitle>Join Session</CardTitle>
                <CardDescription>Scan QR or share link</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-center p-4 bg-white rounded-lg">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={qrUrl(joinLink)} alt="Join QR" width={220} height={220} />
                </div>
                <div className="text-sm break-all bg-muted p-3 rounded-md">
                  <span className="text-muted-foreground">Link: </span>
                  <span className="font-mono font-semibold">{joinLink}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Players will enter a nickname, then go straight to the card.
                </p>
              </CardContent>
            </Card>

            {/* GM's Card View */}
            {cells && (
              <Card className="card-3d">
                <CardHeader>
                  <CardTitle className="text-lg">Your Card</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="grid grid-cols-5 gap-1">
                      {COL_LABELS.map((l) => {
                        const colorClasses = getCardColorClasses(gmCardColor);
                        return (
                          <div key={l} className={`text-center font-black ${colorClasses.text}`} style={{ fontSize: 'clamp(1rem, 3vw, 2rem)' }}>
                            {l}
                          </div>
                        );
                      })}
                    </div>

                    <div className="grid grid-cols-5 gap-1">
                      {cells.flatMap((row, r) =>
                        row.map((cell, c) => {
                          const isDrawn = cell.isDrawn;
                          const colorClasses = getCardColorClasses(gmCardColor);
                          return (
                            <div
                              key={`${r}-${c}`}
                              className={`
                                aspect-square rounded-md flex items-center justify-center
                                font-bold transition-all
                                ${colorClasses.text}
                                ${isDrawn 
                                  ? `${colorClasses.bg} ${colorClasses.border} text-white shadow-md border-2` 
                                  : 'bg-card border-2 border-border'
                                }
                              `}
                              style={{ fontSize: cell.isFree ? '0.7rem' : 'clamp(0.8rem, 2.5vw, 1.5rem)' }}
                            >
                              {cell.isFree ? "FREE" : cell.value}
                            </div>
                          );
                        })
                      )}
                    </div>

                    <div className="text-xs text-muted-foreground text-center pt-1">
                      {drawnSet.size}/75 drawn
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {err && (
          <Card className="mt-6 border-destructive">
            <CardContent className="pt-6">
              <p className="text-destructive">{err}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
