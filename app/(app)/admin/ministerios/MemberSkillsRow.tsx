"use client";

import { useState, useTransition } from "react";
import { setMemberSkillAction } from "./actions";

type SkillRole = { id: string; name: string; capaz: boolean };

// Linha de 1 membro na matriz de capacitacao da equipe (CAPA-03): chips
// marcaveis por funcao do ministerio, toggle otimista igual SkillsSection.
export function MemberSkillsRow({
  userId,
  name,
  roles,
}: {
  userId: string;
  name: string;
  roles: SkillRole[];
}) {
  const [, start] = useTransition();
  const [capazById, setCapazById] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(roles.map((r) => [r.id, r.capaz])),
  );

  function toggle(roleId: string) {
    const next = !capazById[roleId];
    setCapazById((prev) => ({ ...prev, [roleId]: next }));
    start(async () => {
      const res = await setMemberSkillAction(userId, roleId, next);
      if (!res.ok) {
        setCapazById((prev) => ({ ...prev, [roleId]: !next }));
      }
    });
  }

  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-sm text-text">{name}</p>
      <div className="flex flex-wrap gap-2">
        {roles.map((r) => {
          const active = capazById[r.id];
          return (
            <button
              key={r.id}
              type="button"
              onClick={() => toggle(r.id)}
              className={
                "inline-flex items-center rounded-full px-3 py-1.5 text-xs font-medium transition-colors ring-1 " +
                (active
                  ? "bg-primary text-white ring-primary"
                  : "bg-surface-2 text-text-muted ring-border hover:text-text")
              }
            >
              {r.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
