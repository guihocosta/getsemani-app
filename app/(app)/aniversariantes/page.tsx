import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { requireUser } from "@/modules/identity/services/authz";
import { listBirthdays } from "@/modules/identity/services/birthdays";
import { isBirthdayToday, parseMonthNumber } from "@/modules/identity/domain/birthday";
import { visibleMinistryIds } from "@/modules/scheduling/services/listMonthOccurrences";
import { Card } from "@/ui/Card";
import { Badge } from "@/ui/Badge";
import { EmptyState } from "@/ui/EmptyState";
import { dateKey } from "@/lib/time";

export const dynamic = "force-dynamic";

const MESES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

export default async function AniversariantesPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>;
}) {
  const user = await requireUser();
  const { mes } = await searchParams;

  const todayKey = dateKey(new Date());
  const month = parseMonthNumber(mes, Number(todayKey.slice(5, 7)));
  const people = await listBirthdays(month, await visibleMinistryIds(user.id, user.isAdmin));

  const prev = month === 1 ? 12 : month - 1;
  const next = month === 12 ? 1 : month + 1;

  return (
    <div>
      <h1 className="text-3xl text-text mb-4">Aniversariantes</h1>

      <div className="flex items-center justify-between mb-4">
        <Link
          href={`/aniversariantes?mes=${prev}`}
          aria-label="Mês anterior"
          className="h-11 w-11 flex items-center justify-center text-text-muted hover:text-text"
        >
          <ChevronLeft size={18} strokeWidth={1.8} />
        </Link>
        <p className="text-text">{MESES[month - 1]}</p>
        <Link
          href={`/aniversariantes?mes=${next}`}
          aria-label="Próximo mês"
          className="h-11 w-11 flex items-center justify-center text-text-muted hover:text-text"
        >
          <ChevronRight size={18} strokeWidth={1.8} />
        </Link>
      </div>

      {people.length === 0 ? (
        <EmptyState
          title="Nenhum aniversariante neste mês"
          subtitle="Cada pessoa informa a data de nascimento no próprio perfil."
        />
      ) : (
        <Card>
          <ul className="flex flex-col divide-y divide-border">
            {people.map((p) => (
              <li key={p.userId} className="flex items-center gap-3 py-2.5">
                <span className="font-title text-xl text-primary w-8 shrink-0">{p.day}</span>
                <span className="text-text flex-1">{p.name}</span>
                {isBirthdayToday(p.day, month, todayKey) && (
                  <Badge tone="info" className="text-[10px]">
                    hoje
                  </Badge>
                )}
              </li>
            ))}
          </ul>
        </Card>
      )}

      <p className="text-xs text-text-muted mt-4">
        Aparece quem informou a data no{" "}
        <Link href="/perfil" className="text-primary underline underline-offset-2">
          perfil
        </Link>{" "}
        e serve em um dos seus ministérios.
      </p>
    </div>
  );
}
