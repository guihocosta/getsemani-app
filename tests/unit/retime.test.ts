import { describe, it, expect } from "vitest";
import {
  parseTime,
  retimeInstant,
  planRetime,
  retimeNotices,
  type RetimeOcc,
} from "@/modules/scheduling/domain/retime";
import { expandOccurrences, missingDays } from "@/modules/scheduling/domain/recurrence";

// 15/10 15:00 em Sao Paulo
const NOW = new Date("2026-10-15T18:00:00Z");

function occ(id: string, iso: string, over: Partial<RetimeOcc> = {}): RetimeOcc {
  return { id, date: new Date(iso), status: "ACTIVE", published: true, songs: 0, userIds: [], ...over };
}

const d1810 = () => occ("o18", "2026-10-18T21:00:00Z");
const d2510 = () => occ("o25", "2026-10-25T21:00:00Z");
const d0111 = (over: Partial<RetimeOcc> = {}) => occ("o01", "2026-11-01T21:00:00Z", over);

describe("retimeInstant", () => {
  it("mesmo dia local", () => {
    const base = new Date("2026-10-18T21:00:00Z");
    expect(retimeInstant(base, "18:30").toISOString()).toBe("2026-10-18T21:30:00.000Z");
    expect(retimeInstant(base, "00:30").toISOString()).toBe("2026-10-18T03:30:00.000Z");
  });
});

describe("parseTime", () => {
  it("horario valido", () => {
    const casos: [string, string | null][] = [
      ["00:00", "00:00"],
      ["23:59", "23:59"],
      ["24:00", null],
      ["23:60", null],
      ["9:00", null],
      ["ab", null],
      ["", null],
    ];
    for (const [raw, esperado] of casos) expect(parseTime(raw), raw).toBe(esperado);
  });
});

describe("planRetime", () => {
  it("so esta data", () => {
    const occurrences = [d1810(), d2510(), d0111()];
    const plan = planRetime({
      occurrences,
      chosenId: "o25",
      scope: "SINGLE",
      time: "18:30",
      scheduleTime: "18:00",
      now: NOW,
    });
    expect(plan).toEqual({
      moves: [{ id: "o25", to: new Date("2026-10-25T21:30:00Z") }],
      deletes: [],
      startTime: null,
    });
  });

  it("esta e as proximas", () => {
    const occurrences = [d1810(), d2510(), d0111({ status: "CANCELLED" })];
    const plan = planRetime({
      occurrences,
      chosenId: "o25",
      scope: "FROM_HERE",
      time: "18:30",
      scheduleTime: "18:00",
      now: NOW,
    });
    expect(plan).toEqual({
      moves: [
        { id: "o25", to: new Date("2026-10-25T21:30:00Z") },
        { id: "o01", to: new Date("2026-11-01T21:30:00Z") },
      ],
      deletes: [],
      startTime: "18:30",
    });
  });

  it("datas passadas ficam", () => {
    const occurrences = [
      occ("o11", "2026-10-11T21:00:00Z"),
      occ("o15", "2026-10-15T21:00:00Z"),
      d1810(),
    ];
    const plan = planRetime({
      occurrences,
      chosenId: "o11",
      scope: "FROM_HERE",
      time: "19:00",
      scheduleTime: "18:00",
      now: NOW,
    });
    expect(plan).toEqual({
      moves: [
        { id: "o15", to: new Date("2026-10-15T22:00:00Z") },
        { id: "o18", to: new Date("2026-10-18T22:00:00Z") },
      ],
      deletes: [],
      startTime: "19:00",
    });
  });

  it("data passada recusa", () => {
    const plan = planRetime({
      occurrences: [occ("o11", "2026-10-11T21:00:00Z"), d1810()],
      chosenId: "o11",
      scope: "SINGLE",
      time: "19:00",
      scheduleTime: "18:00",
      now: NOW,
    });
    expect(plan).toEqual({ error: "DATA_PASSADA" });
  });

  it("mesmo horario nao muda", () => {
    for (const scope of ["SINGLE", "FROM_HERE"] as const) {
      const plan = planRetime({
        occurrences: [d1810(), d2510(), d0111()],
        chosenId: "o18",
        scope,
        time: "18:00",
        scheduleTime: "18:00",
        now: NOW,
      });
      expect(plan, scope).toEqual({ moves: [], deletes: [], startTime: null });
    }
  });

  it("funde com duplicata vazia", () => {
    // SINGLE: a duplicata vazia das 18:30 e outra data da escala, fora do escopo
    const dupla = occ("dup", "2026-10-25T21:30:00Z");
    const single = planRetime({
      occurrences: [d1810(), occ("o25", "2026-10-25T21:00:00Z", { userIds: ["u1"] }), dupla],
      chosenId: "o25",
      scope: "SINGLE",
      time: "18:30",
      scheduleTime: "18:00",
      now: NOW,
    });
    expect(single).toEqual({
      moves: [{ id: "o25", to: new Date("2026-10-25T21:30:00Z") }],
      deletes: ["dup"],
      startTime: null,
    });

    // FROM_HERE: a duplicata ja esta no horario novo e e uma das datas do escopo
    const fromHere = planRetime({
      occurrences: [d1810(), occ("o25", "2026-10-25T21:00:00Z", { userIds: ["u1"] }), dupla, d0111()],
      chosenId: "o18",
      scope: "FROM_HERE",
      time: "18:30",
      scheduleTime: "18:00",
      now: NOW,
    });
    expect(fromHere).toEqual({
      moves: [
        { id: "o18", to: new Date("2026-10-18T21:30:00Z") },
        { id: "o25", to: new Date("2026-10-25T21:30:00Z") },
        { id: "o01", to: new Date("2026-11-01T21:30:00Z") },
      ],
      deletes: ["dup"],
      startTime: "18:30",
    });
  });

  it("recusa duplicata com conteudo", () => {
    const instante = new Date("2026-10-25T21:30:00Z");
    const base = { chosenId: "o25", time: "18:30", scheduleTime: "18:00", now: NOW };

    const comPessoa = planRetime({
      ...base,
      scope: "SINGLE",
      occurrences: [d2510(), occ("dup", instante.toISOString(), { userIds: ["u9"] })],
    });
    expect(comPessoa).toEqual({ conflito: instante });

    const soMusica = planRetime({
      ...base,
      scope: "SINGLE",
      occurrences: [d2510(), occ("dup", instante.toISOString(), { songs: 1 })],
    });
    expect(soMusica).toEqual({ conflito: instante });

    const umEmTres = planRetime({
      ...base,
      chosenId: "o18",
      scope: "FROM_HERE",
      occurrences: [d1810(), d2510(), occ("dup", instante.toISOString(), { userIds: ["u9"] }), d0111()],
    });
    expect(umEmTres).toEqual({ conflito: instante });

    // duplicatas antigas 18:00 e 18:15 no mesmo dia, as duas com pessoa, indo para 18:30
    const doisCheios = planRetime({
      ...base,
      chosenId: "o18",
      scope: "FROM_HERE",
      occurrences: [
        occ("o18", "2026-10-18T21:00:00Z", { userIds: ["u1"] }),
        occ("o18b", "2026-10-18T21:15:00Z", { userIds: ["u2"] }),
      ],
    });
    expect(doisCheios).toEqual({ conflito: new Date("2026-10-18T21:30:00Z") });
  });
});

describe("materializacao", () => {
  it("materializacao nao duplica", () => {
    const de = new Date("2026-10-18T21:00:00Z");
    const antigas = Array.from({ length: 13 }, (_, i) => new Date(de.getTime() + i * 7 * 86_400_000));
    const movidas = antigas.map((d) => retimeInstant(d, "18:30").getTime());
    const to = new Date(NOW.getTime() + 90 * 86_400_000);
    const esperadas = expandOccurrences(
      {
        recurrenceRule: "FREQ=WEEKLY;BYDAY=SU",
        startDate: new Date("2026-10-04"),
        startTime: "18:30",
        recurrenceUntil: null,
      },
      NOW,
      to,
    ).map((d) => d.getTime());
    expect(esperadas).toHaveLength(13);
    expect(esperadas).toEqual(movidas);
  });
});

// Aplica o plano em 13 domingos e confere que a materializacao com o modelo
// resultante nao acha dia faltando.
function diasFaltando(scope: "SINGLE" | "FROM_HERE", chosenId: string) {
  const de = new Date("2026-10-18T21:00:00Z").getTime();
  const occurrences = Array.from({ length: 13 }, (_, i) =>
    occ(`o${i}`, new Date(de + i * 7 * 86_400_000).toISOString()),
  );
  const plan = planRetime({ occurrences, chosenId, scope, time: "18:30", scheduleTime: "18:00", now: NOW });
  if (!("moves" in plan)) throw new Error("plano recusado");
  const depois = occurrences.map((o) => plan.moves.find((m) => m.id === o.id)?.to ?? o.date);
  const esperadas = expandOccurrences(
    {
      recurrenceRule: "FREQ=WEEKLY;BYDAY=SU",
      startDate: new Date("2026-10-04"),
      startTime: plan.startTime ?? "18:00",
      recurrenceUntil: null,
    },
    NOW,
    new Date(NOW.getTime() + 90 * 86_400_000),
  );
  return { moved: plan.moves.length, faltando: missingDays(esperadas, depois) };
}

describe("materializacao por dia local", () => {
  it("dia movido nao volta", () => {
    // SINGLE em 25/10: o modelo continua 18:00 e 25/10 agora esta as 18:30
    expect(diasFaltando("SINGLE", "o1")).toEqual({ moved: 1, faltando: [] });
    // FROM_HERE a partir de 25/10: 18/10 fica as 18:00 e o modelo vira 18:30
    expect(diasFaltando("FROM_HERE", "o1")).toEqual({ moved: 12, faltando: [] });
  });

  it("dia sem data continua faltando", () => {
    const esperadas = [new Date("2026-10-18T21:00:00Z"), new Date("2026-10-25T21:00:00Z")];
    expect(missingDays(esperadas, [new Date("2026-10-18T03:30:00Z")])).toEqual([esperadas[1]]);
    expect(missingDays(esperadas, [])).toEqual(esperadas);
  });
});

describe("retimeNotices", () => {
  const movida = (id: string, iso: string, userIds: (string | null)[], over: Partial<RetimeOcc> = {}) => ({
    ...occ(id, iso, { userIds, ...over }),
    to: retimeInstant(new Date(iso), "18:30"),
  });

  it("um aviso por pessoa", () => {
    const notices = retimeNotices("Culto Louvor", "18:30", [
      movida("a", "2026-10-18T21:00:00Z", ["u1", "u2", "u3", "u3"]),
      movida("b", "2026-10-25T21:00:00Z", ["u2", "u3"]),
      movida("c", "2026-11-01T21:00:00Z", ["u3"]),
      movida("d", "2026-11-08T21:00:00Z", ["u3"]),
      movida("e", "2026-11-15T21:00:00Z", ["u3"]),
    ]);
    expect(notices).toEqual([
      { userId: "u1", body: "Culto Louvor: 18/10 agora às 18:30." },
      { userId: "u2", body: "Culto Louvor: 18/10 e 25/10 agora às 18:30." },
      { userId: "u3", body: "Culto Louvor: 18/10, 25/10, 01/11 e mais 2 datas agora às 18:30." },
    ]);
  });

  it("aviso ignora rascunho e convidado", () => {
    const notices = retimeNotices("Culto Louvor", "18:30", [
      movida("a", "2026-10-18T21:00:00Z", ["u1"], { published: false }),
      movida("b", "2026-10-25T21:00:00Z", ["u2"], { status: "CANCELLED" }),
      movida("c", "2026-11-01T21:00:00Z", [null]),
    ]);
    expect(notices).toEqual([]);
  });
});
