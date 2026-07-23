import Link from "next/link";
import { requireUser } from "@/modules/identity/services/authz";
import { prisma } from "@/lib/prisma";
import { Card } from "@/ui/Card";
import { MinistryRequestButton } from "./MinistryRequestButton";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const user = await requireUser();

  const [ministries, memberships] = await Promise.all([
    prisma.ministry.findMany({ orderBy: { name: "asc" } }),
    prisma.membership.findMany({ where: { userId: user.id } }),
  ]);

  const membershipByMinistry = new Map(memberships.map((m) => [m.ministryId, m]));

  return (
    <div>
      <header className="mb-6">
        <p className="text-sm text-text-muted">Bem-vindo(a),</p>
        <h1 className="text-3xl text-text">{user.name.split(" ")[0]}</h1>
        <p className="text-sm text-text-muted mt-1">
          Escolha os ministérios que você quer participar.{" "}
          <Link href="/perfil" className="text-primary underline underline-offset-2">
            Editar meus dados
          </Link>
        </p>
      </header>

      <h2 className="eyebrow mb-3">Ministérios</h2>
      <ul className="flex flex-col gap-3">
        {ministries.map((ministry) => {
          const membership = membershipByMinistry.get(ministry.id);
          return (
            <li key={ministry.id}>
              <Card className="flex items-center justify-between">
                <div>
                  <p className="text-lg text-text">{ministry.name}</p>
                  {ministry.description && (
                    <p className="text-sm text-text-muted">{ministry.description}</p>
                  )}
                </div>
                <MinistryRequestButton
                  ministryId={ministry.id}
                  status={membership?.status ?? null}
                />
              </Card>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
