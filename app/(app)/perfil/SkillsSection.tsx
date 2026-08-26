"use client";

import { useState, useTransition } from "react";
import { setOwnSkillAction } from "./actions";

type SkillOption = {
  id: string;
  name: string;
  capaz: boolean;
  ministry: { id: string; name: string };
};

// Secao "Minhas funcoes" do /perfil: chips marcaveis por funcao, agrupados
// por ministerio. Toggle otimista — reflete na tela antes da resposta do
// servidor e desfaz se a action falhar (CAPA-01.2).
export function SkillsSection({ options }: { options: SkillOption[] }) {
  const [, start] = useTransition();
  const [capazById, setCapazById] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(options.map((o) => [o.id, o.capaz])),
  );

  if (options.length === 0) {
    return (
      <p className="text-sm text-text-muted">
        Entre em um ministério para escolher suas funções.
      </p>
    );
  }

  const byMinistry = new Map<string, { name: string; roles: SkillOption[] }>();
  for (const o of options) {
    const entry = byMinistry.get(o.ministry.id) ?? { name: o.ministry.name, roles: [] };
    entry.roles.push(o);
    byMinistry.set(o.ministry.id, entry);
  }

  function toggle(roleId: string) {
    const next = !capazById[roleId];
    setCapazById((prev) => ({ ...prev, [roleId]: next }));
    start(async () => {
      const res = await setOwnSkillAction(roleId, next);
      if (!res.ok) {
        setCapazById((prev) => ({ ...prev, [roleId]: !next }));
      }
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {[...byMinistry.values()].map((group) => (
        <div key={group.name}>
          <p className="eyebrow mb-2">{group.name}</p>
          <div className="flex flex-wrap gap-2">
            {group.roles.map((r) => {
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
      ))}
    </div>
  );
}
