"use client";

import { useState } from "react";
import { createSupabaseBrowser } from "@/lib/supabase/client";
import { Button } from "@/ui/Button";
import { Card } from "@/ui/Card";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const supabase = createSupabaseBrowser();

  const origin = typeof window !== "undefined" ? window.location.origin : "";

  async function signInEmail() {
    setLoading(true);
    await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${origin}/callback` },
    });
    setSent(true);
    setLoading(false);
  }

  async function signInGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${origin}/callback` },
    });
  }

  return (
    <div className="min-h-dvh flex items-center justify-center px-6">
      <Card className="w-full max-w-sm">
        <h1 className="text-3xl tracking-tight text-text mb-1">Bem-vindo(a)</h1>
        <p className="eyebrow mb-6">Escalas dos voluntários</p>

        {sent ? (
          <p className="text-sm text-text">
            Link enviado para <b>{email}</b>. Confira seu e-mail.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            <input
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="field"
            />
            <Button onClick={signInEmail} disabled={!email || loading}>
              Entrar com e-mail
            </Button>
            <Button variant="secondary" onClick={signInGoogle}>
              Entrar com Google
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
