"use client";

import { useTransition } from "react";
import { Badge } from "@/ui/Badge";
import { setMembershipRoleAction, removeMembershipAction } from "./actions";

type Props = {
  membershipId: string;
  ministryName: string;
  role: "LEADER" | "VOLUNTEER";
  status: "PENDING" | "ACTIVE";
};

export function MembershipRow({ membershipId, ministryName, role, status }: Props) {
  const [pending, start] = useTransition();

  function changeRole(newRole: "LEADER" | "VOLUNTEER") {
    if (newRole === role) return;
    start(() => setMembershipRoleAction(membershipId, newRole));
  }

  return (
    <li className="flex items-center justify-between gap-2 text-sm">
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
        <button
          className="text-xs text-danger disabled:opacity-40"
          disabled={pending}
          onClick={() => start(() => removeMembershipAction(membershipId))}
        >
          Remover
        </button>
      </div>
    </li>
  );
}
