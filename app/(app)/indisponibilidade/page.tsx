import { requireUser } from "@/modules/identity/services/authz";
import { listUnavailability } from "@/modules/availability/services/unavailability";
import { Card } from "@/ui/Card";
import { UnavailabilityForm } from "./UnavailabilityForm";
import { RemoveButton } from "./RemoveButton";
import { formatInTimeZone } from "date-fns-tz";
import { APP_TZ } from "@/lib/time";

export const dynamic = "force-dynamic";

const MONTH_LABELS = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

export default async function IndisponibilidadePage() {
  const user = await requireUser();
  const now = new Date();
  const rows = await listUnavailability(user.id, now.getUTCFullYear(), now.getUTCMonth() + 1);

  return (
    <div>
      <h1 className="text-2xl sm:text-3xl text-text mb-2 break-words">Agenda</h1>
      <p className="text-sm text-text-muted mb-6">
        Marque os dias/horários que não pode servir em {MONTH_LABELS[now.getUTCMonth()]}.
      </p>

      <Card className="mb-6">
        <UnavailabilityForm />
      </Card>

      <p className="eyebrow mb-2">Este mês</p>
      <ul className="flex flex-col gap-2">
        {rows.length === 0 && (
          <li className="text-sm text-text-muted">Nenhuma indisponibilidade marcada.</li>
        )}
        {rows.map((r) => (
          <li key={r.id}>
            <Card className="flex items-center justify-between py-3 gap-2">
              <span className="text-sm text-text break-words">
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
