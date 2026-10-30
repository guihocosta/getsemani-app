import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { createServerClient } from "@supabase/ssr";
import { assertLocal, readStack } from "./stack";
import { PASSWORD, PERSONAS, seed, type Persona } from "./seed";

// Login real por senha: o cookie sai do proprio @supabase/ssr, sem bypass no app.
async function saveSession(persona: Persona, apiUrl: string, anonKey: string) {
  const cookies: { name: string; value: string }[] = [];
  const supabase = createServerClient(apiUrl, anonKey, {
    cookies: {
      getAll: () => cookies,
      setAll: (list: { name: string; value: string }[]) => {
        for (const { name, value } of list) {
          const i = cookies.findIndex((c) => c.name === name);
          if (i >= 0) cookies.splice(i, 1);
          if (value) cookies.push({ name, value });
        }
      },
    },
  });
  const { error } = await supabase.auth.signInWithPassword({ email: PERSONAS[persona], password: PASSWORD });
  if (error) throw error;

  writeFileSync(
    `tests/e2e/.auth/${persona}.json`,
    JSON.stringify({
      cookies: cookies.map((c) => ({
        ...c,
        domain: "localhost",
        path: "/",
        expires: -1,
        httpOnly: false,
        secure: false,
        sameSite: "Lax",
      })),
      origins: [],
    }),
  );
}

export default async function globalSetup() {
  const stack = readStack();
  assertLocal(stack.dbUrl);
  execSync("npx prisma migrate deploy", {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: stack.dbUrl, DIRECT_URL: stack.dbUrl },
  });
  await seed(stack);

  mkdirSync("tests/e2e/.auth", { recursive: true });
  for (const persona of Object.keys(PERSONAS) as Persona[]) {
    await saveSession(persona, stack.apiUrl, stack.anonKey);
  }
}
