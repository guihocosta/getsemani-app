"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowser } from "@/lib/supabase/client";
import { Button } from "@/ui/Button";
import { sendCodeAction, verifyCodeAction } from "./actions";

export function LoginForm() {
  const router = useRouter();
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const origin = typeof window !== "undefined" ? window.location.origin : "";

  function sendCode() {
    setError(null);
    start(async () => {
      const res = await sendCodeAction(email);
      if (!res.ok) {
        setError(res.error ?? "Erro");
        return;
      }
      setStep("code");
    });
  }

  function verifyCode() {
    setError(null);
    start(async () => {
      const res = await verifyCodeAction(email, code);
      if (!res.ok) {
        setError(res.error ?? "Erro");
        return;
      }
      router.push("/");
      router.refresh();
    });
  }

  async function signInGoogle() {
    const supabase = createSupabaseBrowser();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${origin}/callback` },
    });
  }

  if (step === "code") {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-text">
          Código enviado para <b>{email}</b>.
        </p>
        <input
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          placeholder="000000"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className="field text-center tracking-[0.5em]"
          maxLength={6}
        />
        {error && <p className="text-xs text-danger">{error}</p>}
        <Button onClick={verifyCode} disabled={code.length < 6 || pending}>
          Entrar
        </Button>
        <button
          type="button"
          className="text-xs text-text-muted underline underline-offset-2"
          onClick={() => {
            setStep("email");
            setCode("");
            setError(null);
          }}
        >
          Usar outro e-mail
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <input
        type="email"
        placeholder="seu@email.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="field"
      />
      {error && <p className="text-xs text-danger">{error}</p>}
      <Button onClick={sendCode} disabled={!email || pending}>
        Entrar com e-mail
      </Button>
      <Button variant="secondary" onClick={signInGoogle}>
        Entrar com Google
      </Button>
    </div>
  );
}
