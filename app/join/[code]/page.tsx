"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ensureAnonymousAuth } from "@/lib/auth";
import { rpcJoinSession, rpcCreateMyCard } from "@/lib/rpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

export default function JoinPage() {
  const router = useRouter();
  const params = useParams<{ code: string }>();
  const code = (params.code ?? "").toUpperCase();

  const [nickname, setNickname] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    ensureAnonymousAuth().catch((e) => setErr(e.message ?? String(e)));
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);

    const name = nickname.trim();
    if (!name) {
      setErr("Nickname is required.");
      return;
    }

    setBusy(true);
    try {
      await ensureAnonymousAuth();
      await rpcJoinSession(code, name);
      await rpcCreateMyCard(code);
      router.push(`/play/${code}`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="card-3d w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-3">
            <Badge variant="outline" className="text-2xl px-4 py-2 font-bold">
              {code}
            </Badge>
          </div>
          <CardTitle className="text-3xl">Join Bingo Session</CardTitle>
          <CardDescription>Enter your nickname to get your card</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nickname" className="text-base">Nickname</Label>
              <Input
                id="nickname"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="Your name"
                maxLength={24}
                className="text-lg h-12"
                autoFocus
              />
            </div>
            <Button 
              type="submit" 
              disabled={busy || !nickname.trim()} 
              size="lg"
              className="w-full text-lg h-12"
            >
              {busy ? "Joining..." : "🎲 Join & Play"}
            </Button>
          </form>

          {err && (
            <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="text-destructive text-sm font-medium">{err}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
