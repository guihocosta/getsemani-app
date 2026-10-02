import { describe, it, expect } from "vitest";
import { summarizeAttendance, attendanceView, attendanceWindow } from "@/modules/reports/domain/attendance";

const linha = (userId: string, name: string, checkedIn: boolean) => ({ userId, name, checkedIn });

// n pessoas, cada uma com `faltas` faltas e 1 presenca.
function pessoasComFalta(n: number, faltas: number) {
  return Array.from({ length: n }, (_, i) => {
    const id = `u${i + 1}`;
    return [
      ...Array.from({ length: faltas }, () => linha(id, `Pessoa ${i + 1}`, false)),
      linha(id, `Pessoa ${i + 1}`, true),
    ];
  }).flat();
}

describe("summarizeAttendance", () => {
  it("conta presencas e faltas", () => {
    const s = summarizeAttendance([
      linha("ana", "Ana", false),
      linha("ana", "Ana", true),
      linha("bia", "Bia", true),
    ]);
    expect(s.total).toBe(3);
    expect(s.presentes).toBe(2);
    expect(s.faltas).toBe(1);
    expect(s.ranking).toEqual([{ userId: "ana", name: "Ana", escalado: 2, faltas: 1 }]);
  });

  it("taxa de presenca arredonda e e nula sem escalas", () => {
    const s = summarizeAttendance([
      linha("ana", "Ana", false),
      linha("ana", "Ana", true),
      linha("bia", "Bia", true),
    ]);
    expect(s.taxa).toBe(67);
    expect(summarizeAttendance([]).taxa).toBeNull();
  });

  it("ordena ranking por faltas e depois por nome, sem quem nao faltou", () => {
    const s = summarizeAttendance([
      linha("bia", "Bia", false),
      linha("ana", "Ana", false),
      linha("caio", "Caio", false),
      linha("caio", "Caio", false),
      linha("duda", "Duda", true),
    ]);
    expect(s.ranking.map((p) => [p.name, p.faltas])).toEqual([
      ["Caio", 2],
      ["Ana", 1],
      ["Bia", 1],
    ]);
  });
});

describe("attendanceView", () => {
  it("sem escalas concluidas mostra mensagem de vazio", () => {
    const v = attendanceView(summarizeAttendance([]));
    expect(v.mensagem).toBe("Sem escalas concluídas no período.");
    expect(v.itens).toEqual([]);
  });

  it("nenhuma falta mostra mensagem propria", () => {
    const v = attendanceView(summarizeAttendance([linha("ana", "Ana", true), linha("bia", "Bia", true)]));
    expect(v.mensagem).toBe("Nenhuma falta no período.");
    expect(v.itens).toEqual([]);
  });

  it("limita a 5 pessoas e escreve o rotulo no singular e plural", () => {
    const v = attendanceView(summarizeAttendance(pessoasComFalta(7, 2)));
    expect(v.mensagem).toBeNull();
    expect(v.itens).toHaveLength(5);
    expect(v.itens[0].label).toBe("2 faltas de 3");

    const um = attendanceView(summarizeAttendance([linha("ana", "Ana", false)]));
    expect(um.itens).toEqual([{ userId: "ana", name: "Ana", label: "1 falta de 1" }]);
  });
});

describe("attendanceWindow", () => {
  it("attendanceWindow vai de 30 dias atras ate o inicio de hoje em APP_TZ", () => {
    const { from, to } = attendanceWindow(new Date("2026-10-02T15:00:00Z"));
    expect(from.toISOString()).toBe("2026-09-02T03:00:00.000Z");
    expect(to.toISOString()).toBe("2026-10-02T03:00:00.000Z");
  });
});
