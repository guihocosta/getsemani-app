"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { Card } from "@/ui/Card";
import { RoleRow } from "./RoleRow";
import { AddRoleForm } from "./AddRoleForm";
import { EditMinistryForm } from "./EditMinistryForm";

type Role = { id: string; name: string; active: boolean };
type Ministry = {
  id: string;
  name: string;
  color: string | null;
  description: string | null;
  roles: Role[];
  _count: { memberships: number };
};

export function MinistryCard({ ministry: m }: { ministry: Ministry }) {
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
          <button
            onClick={() => setEditing((v) => !v)}
            className="text-text-muted hover:text-text"
            aria-label="Editar ministério"
          >
            <Pencil size={16} strokeWidth={1.8} />
          </button>
        </div>
      </div>
      {m.description && <p className="text-sm text-text-muted mb-3">{m.description}</p>}

      {editing ? (
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
            {active.map((r) => (
              <RoleRow key={r.id} roleId={r.id} name={r.name} active={r.active} />
            ))}
          </ul>

          {inactive.length > 0 && (
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

          <AddRoleForm ministryId={m.id} />
        </>
      )}
    </Card>
  );
}
