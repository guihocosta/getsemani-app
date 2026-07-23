import { requireUser } from "@/modules/identity/services/authz";
import { EmptyState } from "@/ui/EmptyState";
import { dateKey } from "@/lib/time";
import {
  ledMinistryIds,
  visibleMinistryIds,
  listMonthOccurrences,
} from "@/modules/scheduling/services/listMonthOccurrences";
import { EscalaCalendar } from "./EscalaCalendar";

export const dynamic = "force-dynamic";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function shiftMonth(year: number, month: number, delta: number): [number, number] {
  const total = year * 12 + (month - 1) + delta;
  return [Math.floor(total / 12), (total % 12) + 1];
}

export default async function EscalasPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>;
}) {
  const user = await requireUser();
  const { mes } = await searchParams;

  const now = new Date();
  const todayKey = dateKey(now);
  const [defYear, defMonth] = todayKey.split("-").map(Number);
  const [year, month] =
    mes && /^\d{4}-\d{2}$/.test(mes) ? mes.split("-").map(Number) : [defYear, defMonth];

  const [viewMinistryIds, manageMinistryIds] = await Promise.all([
    visibleMinistryIds(user.id, user.isAdmin),
    ledMinistryIds(user.id, user.isAdmin),
  ]);

  if (viewMinistryIds.length === 0) {
    return (
      <div>
        <h1 className="text-3xl text-text mb-6">Escalas</h1>
        <EmptyState
          title="Você ainda não participa de nenhum ministério"
          subtitle="Peça acesso a um admin."
        />
      </div>
    );
  }

  // Pre-carrega mes anterior/atual/seguinte pra trocar de mes ser instantaneo no
  // client (cache local) na maioria dos casos; meses fora disso usam a action.
  const [prevYear, prevMonth] = shiftMonth(year, month, -1);
  const [nextYear, nextMonth] = shiftMonth(year, month, 1);
  const [prevItems, currentItems, nextItems] = await Promise.all([
    listMonthOccurrences(viewMinistryIds, prevYear, prevMonth),
    listMonthOccurrences(viewMinistryIds, year, month),
    listMonthOccurrences(viewMinistryIds, nextYear, nextMonth),
  ]);

  return (
    <div>
      <EscalaCalendar
        year={year}
        month={month}
        todayKey={todayKey}
        initialMonths={{
          [`${prevYear}-${pad(prevMonth)}`]: prevItems,
          [`${year}-${pad(month)}`]: currentItems,
          [`${nextYear}-${pad(nextMonth)}`]: nextItems,
        }}
        manageableMinistryIds={manageMinistryIds}
      />
    </div>
  );
}
