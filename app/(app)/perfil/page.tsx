import { Bell, Settings, Moon } from "lucide-react";
import { requireUser, isLeaderOfAny } from "@/modules/identity/services/authz";
import { prisma } from "@/lib/prisma";
import { Card } from "@/ui/Card";
import { Badge } from "@/ui/Badge";
import { ThemeToggle } from "@/ui/ThemeToggle";
import { ProfileForm } from "./ProfileForm";
import { InstallSection } from "./InstallSection";
import { NavRow } from "@/ui/NavRow";
import { PushRegister } from "../PushRegister";

export const dynamic = "force-dynamic";

const STATUS_LABEL = { ACTIVE: "Ativo", PENDING: "Aguardando aprovação" } as const;

export default async function PerfilPage() {
  const user = await requireUser();
  const isLeader = await isLeaderOfAny(user.id);

  const memberships = await prisma.membership.findMany({
    where: { userId: user.id },
    include: { ministry: true },
    orderBy: { ministry: { name: "asc" } },
  });

  let pendingCount = 0;
  if (user.isAdmin || isLeader) {
    const led = user.isAdmin
      ? undefined
      : (
          await prisma.membership.findMany({
            where: { userId: user.id, role: "LEADER", status: "ACTIVE" },
            select: { ministryId: true },
          })
        ).map((m) => m.ministryId);

    pendingCount = await prisma.membership.count({
      where: { status: "PENDING", ...(led ? { ministryId: { in: led } } : {}) },
    });
  }

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-3xl text-text">Perfil</h1>
      </header>

      <h2 className="eyebrow mb-3">Seus dados</h2>
      <Card className="mb-6">
        <ProfileForm name={user.name} phone={user.phone ?? ""} />
      </Card>

      <h2 className="eyebrow mb-3">Meus ministérios</h2>
      <Card className="mb-6">
        {memberships.length === 0 ? (
          <p className="text-sm text-text-muted">Você ainda não participa de nenhum ministério.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {memberships.map((m) => (
              <li key={m.id} className="flex items-center justify-between gap-2 text-sm">
                <span className="text-text">{m.ministry.name}</span>
                <Badge tone={m.status === "ACTIVE" ? "info" : "muted"} className="text-[10px]">
                  {STATUS_LABEL[m.status]}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <h2 className="eyebrow mb-3">Notificações</h2>
      <div className="mb-6">
        <PushRegister />
      </div>

      <h2 className="eyebrow mb-3">Aparência</h2>
      <Card className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-accent-soft ring-1 ring-primary/20 flex items-center justify-center text-primary">
            <Moon size={18} strokeWidth={1.8} />
          </div>
          <p className="text-sm text-text">Tema claro/escuro</p>
        </div>
        <ThemeToggle />
      </Card>

      <h2 className="eyebrow mb-3">Instalar</h2>
      <div className="mb-6">
        <InstallSection />
      </div>

      {(user.isAdmin || isLeader) && (
        <>
          <h2 className="eyebrow mb-3">Gestão</h2>
          <Card className="mb-6 divide-y divide-border">
            <NavRow
              href="/solicitacoes"
              label="Solicitações"
              subtitle={pendingCount > 0 ? `${pendingCount} pendente(s)` : "Nenhum pedido pendente"}
              Icon={Bell}
            />
            {user.isAdmin && (
              <NavRow
                href="/admin"
                label="Gestão do ministério"
                subtitle="Ministérios, pessoas e relatórios"
                Icon={Settings}
              />
            )}
          </Card>
        </>
      )}
    </div>
  );
}
