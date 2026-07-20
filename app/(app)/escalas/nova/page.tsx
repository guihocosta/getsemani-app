import { prisma } from "@/lib/prisma";
import { requireUser } from "@/modules/identity/services/authz";
import { ScheduleForm } from "../ScheduleForm";

export const dynamic = "force-dynamic";

export default async function NovaEscalaPage() {
  const user = await requireUser();

  const led = user.isAdmin
    ? await prisma.ministry.findMany({ include: { roles: true } })
    : (
        await prisma.membership.findMany({
          where: { userId: user.id, role: "LEADER" },
          include: { ministry: { include: { roles: true } } },
        })
      ).map((m) => m.ministry);

  return (
    <div>
      <h1 className="text-3xl text-text mb-6">Nova escala</h1>
      <ScheduleForm ministries={led} />
    </div>
  );
}
