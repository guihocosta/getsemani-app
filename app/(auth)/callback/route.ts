import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { ensureProfile } from "@/modules/identity/services/ensureProfile";
import { logError } from "@/lib/logError";

// Troca o code por sessao e garante o perfil de dominio.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  try {
    if (code) {
      const supabase = await createSupabaseServer();
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) await ensureProfile(user);
        return NextResponse.redirect(`${origin}${next}`);
      }
    }
  } catch (err) {
    const ref = logError("auth.callback", err);
    return NextResponse.redirect(`${origin}/login?error=falha&ref=${ref}`);
  }
  return NextResponse.redirect(`${origin}/login?error=auth`);
}
