import { requireUser } from "@/modules/identity/services/authz";
import { listUnavailability } from "@/modules/availability/services/unavailability";
import { Card } from "@/ui/Card";
import { Button } from "@/ui/Button";
import { addUnavailabilityAction } from "./actions";
import { RemoveButton } from "./RemoveButton";
import { formatInTimeZone } from "date-fns-tz";
import { APP_TZ } from "@/lib/time";

export const dynamic = "force-dynamic";

export default async function IndisponibilidadePage() {
  const user = await requireUser();
  const now = new Date();
  const rows = await listUnavailability(user.id, now.getUTCFullYear(), now.getUTCMonth() + 1);

  return (
    <div>
      <h1 className="text-3xl text-text mb-2">Indisponibilidade</h1>
      <p className="text-sm text-text-muted mb-6">Marque os dias/horários que não pode servir neste mês.</p>

      <Card className="mb-6">
        <form action={addUnavailabilityAction} className="flex flex-col gap-3">
          <input type="date" name="date" required className="field" />
          <label className="flex items-center gap-2 text-sm text-text-muted">
            <input type="checkbox" name="allDay" defaultChecked className="accent-[var(--color-primary)]" /> Dia inteiro
          </label>
          <div className="flex gap-2">
            <input type="time" name="startTime" className="field flex-1" />
            <input type="time" name="endTime" className="field flex-1" />
          </div>
          <Button type="submit">Adicionar</Button>
        </form>
      </Card>

      <ul className="flex flex-col gap-2">
        {rows.map((r) => (
          <li key={r.id}>
            <Card className="flex items-center justify-between py-3">
              <span className="text-sm text-text">
                {r.date ? formatInTimeZone(r.date, APP_TZ, "dd/MM") : "Mês todo"}
                {r.startTime ? ` · ${r.startTime}–${r.endTime}` : " · dia inteiro"}
              </span>
              <RemoveButton id={r.id} />
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}
