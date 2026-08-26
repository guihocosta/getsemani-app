"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { Card } from "@/ui/Card";
import { RoleRow } from "./RoleRow";
import { AddRoleForm } from "./AddRoleForm";
import { EditMinistryForm } from "./EditMinistryForm";
import { MemberSkillsRow } from "./MemberSkillsRow";

type Role = { id: string; name: string; active: boolean };
type SkillRole = { id: string; name: string; capaz: boolean };
type SkillMatrixEntry = { user: { id: string; name: string }; roles: SkillRole[] };
type Ministry = {
  id: string;
  name: string;
  color: string | null;
  description: string | null;
  roles: Role[];
  _count: { memberships: number };
};

// canManage: so admin gerencia dados do ministerio (nome, funcoes) — CAPA-03
// so cobre a capacitacao da equipe, entao o lider (canManage=false) so ve a
// lista de funcoes ativas em modo leitura e a matriz de capacitacao abaixo.
export function MinistryCard({
  ministry: m,
  canManage,
  skillMatrix,
}: {
  ministry: Ministry;
  canManage: boolean;
  skillMatrix: SkillMatrixEntry[];
}) {
  const [editing, setEditing] = useState(false);
  const active = m.roles.filter((r) => r.active);
  const inactive = m.roles.filter((r) => !r.active);

  return (
    <Card>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span
            className="h-3 w-3 rounded-full shrink-0 ring-1 ring-border"
            style={{ backgroundColor: m.color ?? "#6d28d9" }}
          />
          <p className="text-lg text-text">{m.name}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-text-muted">
            {m._count.memberships} {m._count.memberships === 1 ? "membro" : "membros"}
          </span>
          {canManage && (
            <button
              onClick={() => setEditing((v) => !v)}
              className="text-text-muted hover:text-text"
              aria-label="Editar ministério"
            >
              <Pencil size={16} strokeWidth={1.8} />
            </button>
          )}
        </div>
      </div>
      {m.description && <p className="text-sm text-text-muted mb-3">{m.description}</p>}

      {editing && canManage ? (
        <EditMinistryForm
          ministryId={m.id}
          name={m.name}
          color={m.color}
          description={m.description}
          onDone={() => setEditing(false)}
        />
      ) : (
        <>
          <p className="eyebrow mb-2">Funções ativas</p>
          <ul className="flex flex-col gap-1.5 mb-3">
            {active.length === 0 && (
              <li className="text-sm text-text-muted">Nenhuma função ativa.</li>
            )}
            {active.map((r) =>
              canManage ? (
                <RoleRow key={r.id} roleId={r.id} name={r.name} active={r.active} />
              ) : (
                <li key={r.id} className="text-sm text-text">
                  {r.name}
                </li>
              ),
            )}
          </ul>

          {canManage && inactive.length > 0 && (
            <details className="mb-3">
              <summary className="eyebrow cursor-pointer select-none">
                Inativas ({inactive.length})
              </summary>
              <ul className="flex flex-col gap-1.5 mt-2">
                {inactive.map((r) => (
                  <RoleRow key={r.id} roleId={r.id} name={r.name} active={r.active} />
                ))}
              </ul>
            </details>
          )}

          {canManage && <AddRoleForm ministryId={m.id} />}

          {skillMatrix.length > 0 && (
            <div className="mt-4 pt-3 border-t border-border">
              <p className="eyebrow mb-2">Capacitação da equipe</p>
              <ul className="flex flex-col gap-3">
                {skillMatrix.map((entry) => (
                  <li key={entry.user.id}>
                    <MemberSkillsRow userId={entry.user.id} name={entry.user.name} roles={entry.roles} />
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </Card>
  );
}
