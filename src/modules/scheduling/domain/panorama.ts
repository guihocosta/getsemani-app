// Panorama: grade funcao x data de um ministerio num mes. So outra forma de
// mostrar o resultado de listMonthOccurrences (que ja filtra rascunho).

export type PanoramaItem = {
  occurrenceId: string;
  dayKey: string; // yyyy-MM-dd
  time: string; // HH:mm
  published: boolean;
  slots: {
    roleId: string;
    role: string;
    active: boolean;
    allocatedName: string | null;
    allocatedStatus: "PENDING" | "CONFIRMED" | null;
    isGuest: boolean;
  }[];
};

export type PanoramaCell =
  | { state: "open" }
  | { state: "filled"; name: string; isGuest: boolean; pending: boolean };

export type Panorama = {
  columns: { occurrenceId: string; dayLabel: string; time: string; published: boolean }[];
  rows: { roleId: string; role: string; cells: (PanoramaCell | null)[] }[];
  openCount: number; // vagas abertas de hoje em diante
};

// Primeiro nome + inicial do ultimo sobrenome, para caber na coluna.
export function shortName(full: string): string {
  const parts = full.trim().split(/\s+/);
  if (parts.length < 2) return parts[0] ?? "";
  return `${parts[0]} ${parts[parts.length - 1][0]}.`;
}

export function buildPanorama(items: PanoramaItem[], todayKey: string): Panorama {
  const roles = new Map<string, string>();
  for (const item of items) {
    for (const s of item.slots) if (s.active) roles.set(s.roleId, s.role);
  }

  let openCount = 0;
  const rows = [...roles.entries()]
    .sort((a, b) => a[1].localeCompare(b[1], "pt-BR"))
    .map(([roleId, role]) => ({
      roleId,
      role,
      cells: items.map((item): PanoramaCell | null => {
        const slot = item.slots.find((s) => s.roleId === roleId && s.active);
        if (!slot) return null;
        if (slot.allocatedName === null) {
          if (item.dayKey >= todayKey) openCount++;
          return { state: "open" };
        }
        return {
          state: "filled",
          name: shortName(slot.allocatedName),
          isGuest: slot.isGuest,
          pending: !slot.isGuest && slot.allocatedStatus === "PENDING",
        };
      }),
    }));

  return {
    columns: items.map((item) => ({
      occurrenceId: item.occurrenceId,
      dayLabel: `${item.dayKey.slice(8, 10)}/${item.dayKey.slice(5, 7)}`,
      time: item.time,
      published: item.published,
    })),
    rows,
    openCount,
  };
}

// Ministerio mostrado: o pedido, se o usuario pode ve-lo; senao o primeiro.
// Nunca devolve ministerio fora da lista visivel.
export function pickMinistry<T extends { id: string }>(visible: T[], requestedId: string | undefined): T | null {
  return visible.find((m) => m.id === requestedId) ?? visible[0] ?? null;
}
