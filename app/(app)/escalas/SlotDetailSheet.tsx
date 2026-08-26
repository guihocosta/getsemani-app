"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/ui/Badge";
import { BottomSheet } from "@/ui/BottomSheet";
import type { AllocationCandidate } from "./actions";
import type { Slot } from "./occurrenceCache";

export function SlotDetailSheet(props: {
  open: boolean;
  slot: Slot | null;
  onClose: () => void;
  candidates: AllocationCandidate[] | null;
  guestNames: string[];
  loading: boolean;
  failed: boolean;
  failedRef: string | null;
  pending: boolean;
  note: { message: string; onOverride?: () => void } | null;
  onRetryCandidates: () => void;
  onPickUser: (userId: string) => void;
  onPickGuest: (name: string) => void;
  onDeactivate: () => void;
}) {
  const [picking, setPicking] = useState(false);
  const [addingGuest, setAddingGuest] = useState(false);
  const [guestName, setGuestName] = useState("");
  const [lastSlot, setLastSlot] = useState<Slot | null>(null);

  useEffect(() => {
    if (props.open) {
      setPicking(false);
      setAddingGuest(false);
      setGuestName("");
    }
  }, [props.open]);

  useEffect(() => {
    if (props.slot) {
      setLastSlot(props.slot);
    }
  }, [props.slot]);

  const slot = props.slot ?? lastSlot;
  const filled = !!slot?.allocatedName;
  const showPicker = !filled || picking;

  function submitGuest() {
    const name = guestName.trim();
    if (!name) return;
    props.onPickGuest(name);
    setAddingGuest(false);
    setGuestName("");
  }

  function handleClose() {
    setPicking(false);
    setAddingGuest(false);
    setGuestName("");
    props.onClose();
  }

  return (
    <BottomSheet open={props.open} onClose={handleClose}>
      {slot && (
        <div className="flex flex-col gap-3">
          <div>
            <p className="eyebrow text-text-muted mb-1">{slot.role}</p>
            {!showPicker && (
              <div className="flex items-center gap-1.5 flex-wrap">
                <p className="text-lg text-text">{slot.allocatedName}</p>
                {slot.isGuest && <Badge tone="info">sem conta</Badge>}
                {!slot.isGuest && slot.allocatedStatus === "PENDING" && (
                  <Badge tone="info">aguardando confirmação</Badge>
                )}
              </div>
            )}
          </div>

          {props.note && (
            <Badge tone="info" className="normal-case! tracking-normal! w-fit">
              {props.note.message}
              {props.note.onOverride && (
                <button
                  className="underline underline-offset-2 ml-1"
                  onClick={props.note.onOverride}
                >
                  Sim
                </button>
              )}
            </Badge>
          )}

          {showPicker ? (
            <div className="flex flex-col gap-1">
              {props.loading && <p className="px-1 py-2 text-sm text-text-muted">Carregando…</p>}
              {props.failed && (
                <div className="px-1 py-2 text-sm text-text-muted">
                  Não deu pra carregar{props.failedRef && ` · cód. ${props.failedRef}`}.{" "}
                  <button
                    className="underline underline-offset-2 text-primary"
                    onClick={props.onRetryCandidates}
                  >
                    Tentar de novo
                  </button>
                </div>
              )}
              {!props.loading && !props.failed && props.candidates?.length === 0 && (
                <p className="px-1 py-2 text-sm text-text-muted">Nenhum voluntário neste ministério.</p>
              )}
              {!props.loading &&
                !props.failed &&
                props.candidates
                  ?.filter((c) => c.userId !== slot.allocatedUserId)
                  .map((c) => (
                    <button
                      key={c.userId}
                      type="button"
                      disabled={props.pending}
                      onClick={() => props.onPickUser(c.userId)}
                      className="w-full min-h-11 flex items-center gap-1.5 px-1 py-2 text-left text-sm text-text hover:bg-surface-2 rounded-lg flex-wrap disabled:opacity-40"
                    >
                      {c.name}
                      {c.unavailable && <Badge tone="danger">Indisponível</Badge>}
                      {!c.capable && <Badge tone="muted">não capacitado</Badge>}
                    </button>
                  ))}

              {!!props.guestNames.length && !addingGuest && (
                <div className="border-t border-border pt-1 mt-1">
                  {props.guestNames.map((name) => (
                    <button
                      key={name}
                      type="button"
                      disabled={props.pending}
                      onClick={() => props.onPickGuest(name)}
                      className="w-full min-h-11 flex items-center gap-1.5 px-1 py-2 text-left text-sm text-text hover:bg-surface-2 rounded-lg disabled:opacity-40"
                    >
                      {name}
                      <Badge tone="info">sem conta</Badge>
                    </button>
                  ))}
                </div>
              )}

              {addingGuest ? (
                <div className="flex flex-col gap-2 border-t border-border mt-1 pt-3">
                  <input
                    type="text"
                    placeholder="Nome da pessoa"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    className="field !py-2 text-sm w-full"
                    autoFocus
                  />
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={submitGuest}
                      disabled={!guestName.trim() || props.pending}
                      className="min-h-11 text-sm text-primary font-medium disabled:opacity-40"
                    >
                      Adicionar
                    </button>
                    <button
                      type="button"
                      onClick={() => setAddingGuest(false)}
                      className="min-h-11 text-sm text-text-muted"
                    >
                      cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setAddingGuest(true)}
                  className="w-full min-h-11 text-left px-1 py-2 text-sm text-primary hover:bg-surface-2 rounded-lg border-t border-border mt-1 pt-3"
                >
                  + Pessoa sem conta
                </button>
              )}

              {filled && (
                <button
                  type="button"
                  onClick={() => setPicking(false)}
                  className="w-full min-h-11 text-center text-sm text-text-muted mt-1"
                >
                  cancelar troca
                </button>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-4 pt-1">
              <button
                type="button"
                disabled={props.pending}
                onClick={() => setPicking(true)}
                className="min-h-11 text-sm text-primary font-medium disabled:opacity-40"
              >
                Trocar
              </button>
              <button
                type="button"
                disabled={props.pending}
                onClick={props.onDeactivate}
                className="min-h-11 text-sm text-danger disabled:opacity-40"
              >
                Desativar vaga
              </button>
            </div>
          )}
        </div>
      )}
    </BottomSheet>
  );
}
