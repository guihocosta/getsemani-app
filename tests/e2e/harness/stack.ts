import { execSync } from "node:child_process";

// Sobe com: npm run e2e:stack. A config fica em tests/e2e porque o CLI da
// Supabase parseia o .env do workdir, e o .env da raiz e o de producao.
export const SUPABASE_CLI = "npx --yes supabase@2.122.0 --workdir tests/e2e";

export type Stack = { apiUrl: string; anonKey: string; serviceKey: string; dbUrl: string };

// Tudo aqui apaga dados: nada segue se o alvo nao for a maquina local.
export function assertLocal(url: string) {
  const host = new URL(url).hostname;
  if (!["localhost", "127.0.0.1", "[::1]"].includes(host)) {
    throw new Error(`e2e abortado: alvo precisa ser local (host atual: "${host}")`);
  }
}

export function readStack(): Stack {
  let raw: string;
  try {
    raw = execSync(`${SUPABASE_CLI} status -o json`, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
  } catch {
    throw new Error("Supabase local fora do ar. Rode: npm run e2e:stack");
  }
  const status = JSON.parse(raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1));
  const stack = {
    apiUrl: status.API_URL,
    anonKey: status.ANON_KEY,
    serviceKey: status.SERVICE_ROLE_KEY,
    dbUrl: status.DB_URL,
  };
  assertLocal(stack.apiUrl);
  assertLocal(stack.dbUrl);
  return stack;
}
