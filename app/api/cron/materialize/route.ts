import { NextResponse } from "next/server";
import { isAuthorizedCron } from "@/lib/cron";
import { materializeOccurrences } from "@/modules/scheduling/services/materializeOccurrences";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const created = await materializeOccurrences();
  return NextResponse.json({ ok: true, created });
}
