import { redirect } from "next/navigation";
import { getSessionUser, isLeaderOfAny } from "@/modules/identity/services/authz";
import { listMinistries } from "@/modules/ministries/services/listMinistries";
import { listMinistrySkillMatrix } from "@/modules/ministries/services/userSkills";
import { ledMinistryIds } from "@/modules/scheduling/services/listMonthOccurrences";
import { EmptyState } from "@/ui/EmptyState";
import { CreateMinistryForm } from "./CreateMinistryForm";
import { MinistryCard } from "./MinistryCard";

export const dynamic = "force-dynamic";

export default async function MinisteriosAdminPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  // SPEC_DEVIATION: pagina era admin-only antes desta feature. CAPA-03.1
  // exige que o lider abra /admin/ministerios pra editar a capacitacao da
  // equipe, entao o gate agora tambem libera quem lidera algum ministerio.
  // Reason: sem isso o lider nunca alcanca a tela onde a AC diz que ele edita.
  if (!user.isAdmin && !(await isLeaderOfAny(user.id))) redirect("/");

  const allMinistries = await listMinistries();
  const ledIds = await ledMinistryIds(user.id, user.isAdmin);
  const ministries = user.isAdmin ? allMinistries : allMinistries.filter((m) => ledIds.includes(m.id));

  const ministriesWithSkills = await Promise.all(
    ministries.map(async (m) => ({ ...m, skillMatrix: await listMinistrySkillMatrix(m.id) })),
  );

  return (
    <div>
      <h1 className="text-3xl text-text mb-6">Ministérios</h1>

      {user.isAdmin && <CreateMinistryForm />}

      {ministriesWithSkills.length === 0 ? (
        <EmptyState
          title="Nenhum ministério cadastrado"
          subtitle={user.isAdmin ? "Crie o primeiro ministério acima." : "Você ainda não lidera nenhum ministério."}
        />
      ) : (
        <ul className="flex flex-col gap-4">
          {ministriesWithSkills.map((m) => (
            <li key={m.id}>
              <MinistryCard ministry={m} canManage={user.isAdmin} skillMatrix={m.skillMatrix} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
