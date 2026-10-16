"use client";

import { Button } from "@/ui/Button";

export function LoginForm() {
  // supabase-js so no clique: e o maior peso da rota, e /login e a primeira tela
  // de quem instala o PWA.
  async function signInGoogle() {
    const { createSupabaseBrowser } = await import("@/lib/supabase/client");
    const supabase = createSupabaseBrowser();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/callback` },
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
