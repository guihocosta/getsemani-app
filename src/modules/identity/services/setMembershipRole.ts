import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/modules/identity/services/authz";

// Admin troca o papel (LEADER/VOLUNTEER) de uma membership existente.
export async function setMembershipRole(params: {
  membershipId: string;
  role: "LEADER" | "VOLUNTEER";
}) {
  await requireAdmin();

  return prisma.membership.update({
    where: { id: params.membershipId },
    data: { role: params.role },
  });
}

// Admin remove uma membership (retira a pessoa do ministerio).
export async function removeMembership(params: { membershipId: string }) {
  await requireAdmin();

  return prisma.membership.delete({ where: { id: params.membershipId } });
}
