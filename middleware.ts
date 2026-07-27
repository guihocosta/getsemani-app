import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { shouldRefreshSession } from "@/lib/session";

type CookieToSet = { name: string; value: string; options?: CookieOptions };

const REFRESH_BUFFER_SECONDS = 300;

// Refresh da sessao Supabase a cada request (mantem cookie valido).
// getSession() e local (sem rede); so chamamos getUser() (rede, valida+renova
// o JWT) quando o token esta perto de expirar — reduz o overhead fixo que
// bate em toda request, mesmo paginas sem query no banco.
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: {
        maxAge: 400 * 24 * 60 * 60,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        httpOnly: true,
      },
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) return response;

  const nowSeconds = Math.floor(Date.now() / 1000);
  if (!shouldRefreshSession(session.expires_at, nowSeconds, REFRESH_BUFFER_SECONDS)) {
    return response;
  }

  await supabase.auth.getUser();
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|fonts|manifest.webmanifest|sw.js|api/cron).*)"],
};
