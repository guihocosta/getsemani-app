"use client";

import { useTransition } from "react";
import { Badge } from "@/ui/Badge";
import { useConfirm } from "@/ui/ConfirmDialog";
import { setMembershipRoleAction, removeMembershipAction } from "./actions";

type Props = {
  membershipId: string;
  ministryName: string;
  role: "LEADER" | "VOLUNTEER";
  status: "PENDING" | "ACTIVE";
};

export function MembershipRow({ membershipId, ministryName, role, status }: Props) {
  const [pending, start] = useTransition();
  const { confirm, dialog } = useConfirm();

  function changeRole(newRole: "LEADER" | "VOLUNTEER") {
    if (newRole === role) return;
    start(() => setMembershipRoleAction(membershipId, newRole));
  }

  async function remove() {
    const ok = await confirm({
      title: `Remover de "${ministryName}"?`,
      description: "A pessoa perde o acesso a esse ministério e sai das escalas futuras.",
      confirmLabel: "Remover",
      tone: "danger",
    });
    if (ok) start(() => removeMembershipAction(membershipId));
  }

  return (
    <li className="flex items-center justify-between gap-2 text-sm">
      {dialog}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-text">{ministryName}</span>
        <Badge tone={status === "ACTIVE" ? "info" : "muted"} className="text-[10px]">
          {status === "ACTIVE" ? "Ativo" : "Pendente"}
        </Badge>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <select
          value={role}
          disabled={pending}
          onChange={(e) => changeRole(e.target.value as "LEADER" | "VOLUNTEER")}
          className="field !py-1 text-xs"
        >
          <option value="VOLUNTEER">Voluntário</option>
          <option value="LEADER">Líder</option>
        </select>
        <button className="text-xs text-danger disabled:opacity-40" disabled={pending} onClick={remove}>
          Remover
        </button>
      </div>
    </li>
  );
}
