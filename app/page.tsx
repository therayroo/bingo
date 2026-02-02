"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ensureAnonymousAuth } from "@/lib/auth";
import { rpcCreateSession } from "@/lib/rpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function HomePage() {
  const router = useRouter();
  const [title, setTitle] = useState("Bingo Night");
  const [joinCode, setJoinCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    ensureAnonymousAuth().catch((e) => setErr(e.message ?? String(e)));
  }, []);

  async function onCreate() {
    setErr(null);
    setBusy(true);
    try {
      await ensureAnonymousAuth();
      const session = await rpcCreateSession(title);
      router.push(`/gm/${session.code}`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  function onJoin() {
    const code = joinCode.trim().toUpperCase();
    if (!code) return;
    router.push(`/join/${code}`);
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-2xl space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-5xl md:text-6xl font-black tracking-tight bg-gradient-to-br from-primary to-primary/60 bg-clip-text text-transparent">
            Bingo!
          </h1>
          <p className="text-muted-foreground text-lg">
            Create or join a session to play
          </p>
        </div>

        <Tabs defaultValue="create" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="create">Create Session</TabsTrigger>
            <TabsTrigger value="join">Join Session</TabsTrigger>
          </TabsList>
          
          <TabsContent value="create">
            <Card className="card-3d">
              <CardHeader>
                <CardTitle className="text-2xl">🎮 Create Session</CardTitle>
                <CardDescription>Start a new game as Game Master</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title" className="text-base">Session Title</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Bingo Night"
                    className="text-lg h-12"
                  />
                </div>
                <Button 
                  onClick={onCreate} 
                  disabled={busy || !title.trim()} 
                  size="lg"
                  className="w-full text-lg h-12"
                >
                  {busy ? "Creating..." : "Create Session"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="join">
            <Card className="card-3d">
              <CardHeader>
                <CardTitle className="text-2xl">🎯 Join Session</CardTitle>
                <CardDescription>Enter a session code to play</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="joinCode" className="text-base">Join Code</Label>
                  <Input
                    id="joinCode"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    placeholder="AB3K9Q"
                    maxLength={6}
                    className="text-lg h-12 font-mono tracking-wider"
                  />
                </div>
                <Button 
                  onClick={onJoin} 
                  disabled={!joinCode.trim()}
                  size="lg"
                  variant="secondary"
                  className="w-full text-lg h-12"
                >
                  Continue
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {err && (
          <Card className="border-destructive">
            <CardContent className="pt-6">
              <p className="text-destructive font-medium">{err}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
