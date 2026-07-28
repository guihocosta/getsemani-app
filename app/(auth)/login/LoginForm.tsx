"use client";

import { createSupabaseBrowser } from "@/lib/supabase/client";
import { Button } from "@/ui/Button";

export function LoginForm() {
  const origin = typeof window !== "undefined" ? window.location.origin : "";

  async function signInGoogle() {
    const supabase = createSupabaseBrowser();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${origin}/callback` },
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <Button onClick={signInGoogle}>
        Entrar com Google
      </Button>
    </div>
  );
}

