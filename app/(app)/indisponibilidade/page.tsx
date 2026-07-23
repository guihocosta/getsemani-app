import { requireUser } from "@/modules/identity/services/authz";
import { listUnavailability } from "@/modules/availability/services/unavailability";
import { Card } from "@/ui/Card";
import { UnavailabilityForm } from "./UnavailabilityForm";
import { RemoveButton } from "./RemoveButton";
import { formatInTimeZone } from "date-fns-tz";

export const dynamic = "force-dynamic";

function fmtGroup(g: { startDate: Date | null; endDate: Date | null; startTime: string | null; endTime: string | null }) {
  if (!g.startDate) return "Mês todo";
  const start = formatInTimeZone(g.startDate, "UTC", "dd/MM");
  const end = g.endDate && g.endDate.getTime() !== g.startDate.getTime() ? formatInTimeZone(g.endDate, "UTC", "dd/MM") : null;
  const day = end ? `${start} a ${end}` : start;
  const time = g.startTime ? ` · ${g.startTime}–${g.endTime}` : " · dia inteiro";
  return `${day}${time}`;
}

export default async function IndisponibilidadePage() {
  const user = await requireUser();
  const groups = await listUnavailability(user.id, new Date());

  return (
    <div>
      <h1 className="text-2xl sm:text-3xl text-text mb-2 break-words">Agenda</h1>
      <p className="text-sm text-text-muted mb-6">
        Marque os dias/horários que não pode servir, de hoje em diante.
      </p>

      <Card className="mb-6">
        <UnavailabilityForm />
      </Card>

      <p className="eyebrow mb-2">Próximas indisponibilidades</p>
      <ul className="flex flex-col gap-2">
        {groups.length === 0 && (
          <li className="text-sm text-text-muted">Nenhuma indisponibilidade marcada.</li>
        )}
        {groups.map((g) => (
          <li key={g.ids[0]}>
            <Card className="flex items-center justify-between py-3 gap-2">
              <span className="text-sm text-text break-words">{fmtGroup(g)}</span>
              <RemoveButton ids={g.ids} />
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}
