"use client";

import { useEffect, useState, useTransition } from "react";
import { Sheet } from "@/ui/Sheet";
import { Button } from "@/ui/Button";
import { Loader2 } from "lucide-react";
import { getAvailableRolesAction, addExtraSlotAction } from "./actions";

export function AddExtraSlotSheet(props: {
  open: boolean;
  onClose: () => void;
  occurrenceId: string;
  onAdded: () => void;
}) {
  const [roles, setRoles] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [pending, start] = useTransition();

  useEffect(() => {
    if (props.open) {
      setLoading(true);
      getAvailableRolesAction(props.occurrenceId)
        .then((res) => {
          if (res.ok) setRoles(res.roles);
        })
        .finally(() => setLoading(false));
    }
  }, [props.open, props.occurrenceId]);

  function handleAdd(roleId: string) {
    start(async () => {
      const res = await addExtraSlotAction(props.occurrenceId, roleId);
      if (res.ok) {
        props.onAdded();
        props.onClose();
      } else {
        alert("Erro ao adicionar vaga.");
      }
    });
  }

  return (
    <Sheet open={props.open} onClose={props.onClose} title="Adicionar Vaga Extra">
      <div className="p-4">
        {loading ? (
          <div className="flex justify-center p-6">
            <Loader2 className="animate-spin text-primary" size={24} />
          </div>
        ) : roles.length === 0 ? (
          <p className="text-sm text-text-muted text-center p-4">
            Não há funções disponíveis para adicionar (todas já estão ativas nesta data).
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {roles.map((r) => (
              <li key={r.id}>
                <Button
                  type="button"
                  tone="neutral"
                  className="w-full justify-start"
                  disabled={pending}
                  onClick={() => handleAdd(r.id)}
                >
                  {r.name}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Sheet>
  );
}
