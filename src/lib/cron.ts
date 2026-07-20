// Autoriza chamadas de cron: header "Authorization: Bearer <CRON_SECRET>"
// (Vercel Cron envia isso automaticamente).
export function isAuthorizedCron(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = request.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}
