import type { AllocationStatus } from "@prisma/client";

export type Slot = {
  slotId: string;
  role: string;
  allocatedUserId: string | null;
  allocatedName: string | null;
  allocationId: string | null;
  allocatedStatus: AllocationStatus | null;
  checkedIn: boolean;
  isGuest: boolean;
  active: boolean;
};

export type Item = {
  occurrenceId: string;
  scheduleId: string;
  ministryId: string;
  dayKey: string; // yyyy-MM-dd
  title: string;
  when: string;
  slots: Slot[];
};

export type SlotPatch = {
  allocatedUserId: string | null;
  allocatedName: string;
  allocationId: string;
  allocatedStatus: AllocationStatus;
  checkedIn: boolean;
  isGuest: boolean;
};

// Atualiza uma vaga especifica dentro da lista de ocorrencias do mes, sem
// tocar o banco — usado apos allocate/reassign pra refletir 1 vaga na tela
// sem re-buscar o mes inteiro (que era a 2a requisicao por selecao).
export function patchOccurrenceSlot(
  items: Item[],
  occurrenceId: string,
  slotId: string,
  patch: SlotPatch,
): Item[] {
  return items.map((item) => {
    if (item.occurrenceId !== occurrenceId) return item;
    return {
      ...item,
      slots: item.slots.map((slot) => (slot.slotId === slotId ? { ...slot, ...patch } : slot)),
    };
  });
}

// Ativa/desativa 1 vaga sem re-buscar o mes. Desativar tambem limpa qualquer
// alocacao que estivesse ali (o servidor ja removeu) - reativar sempre volta
// vazia, nunca restaura quem estava antes.
export function patchSlotActive(items: Item[], occurrenceId: string, slotId: string, active: boolean): Item[] {
  return items.map((item) => {
    if (item.occurrenceId !== occurrenceId) return item;
    return {
      ...item,
      slots: item.slots.map((slot) =>
        slot.slotId === slotId
          ? {
              ...slot,
              active,
              ...(active
                ? {}
                : {
                    allocatedUserId: null,
                    allocatedName: null,
                    allocationId: null,
                    allocatedStatus: null,
                    checkedIn: false,
                    isGuest: false,
                  }),
            }
          : slot,
      ),
    };
  });
}
