import { describe, it, expect } from "vitest";
import { ReminderLog, REMINDER_KINDS, dateKey } from "@/domain/messaging/reminder-log";

describe("Feature: Registro de lembrete enviado", () => {
  describe("Cenário: criar registro", () => {
    it("Dado kind e referenceId, Quando criar sem sentAt, Então usa a data atual", () => {
      const before = new Date();
      const log = ReminderLog.create("confirmation", "appt-1");
      const after = new Date();

      expect(log.id).toBeTruthy();
      expect(log.kind).toBe("confirmation");
      expect(log.referenceId).toBe("appt-1");
      expect(log.sentOn).toBe(dateKey(before));
      expect(log.createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(log.createdAt.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it("Dado sentAt explícito, Quando criar, Então sentOn reflete o dia informado", () => {
      const sentAt = new Date("2026-05-10T23:59:00Z");
      const log = ReminderLog.create("recall", "followup-1", sentAt);

      expect(log.sentOn).toBe("2026-05-10");
      expect(log.createdAt).toEqual(sentAt);
    });

    it("Dado cada tipo suportado, Quando criar, Então kind é preservado", () => {
      for (const kind of REMINDER_KINDS) {
        const log = ReminderLog.create(kind, "ref-1");
        expect(log.kind).toBe(kind);
      }
    });
  });

  describe("Cenário: reconstituir registro da persistência", () => {
    it("Dado state completo, Quando restore, Então mantém todos os campos", () => {
      const createdAt = new Date("2026-06-01T10:00:00Z");
      const log = ReminderLog.restore({
        id: "log-1",
        kind: "confirmation",
        referenceId: "appt-9",
        sentOn: "2026-06-01",
        createdAt,
      });

      expect(log.id).toBe("log-1");
      expect(log.referenceId).toBe("appt-9");
      expect(log.sentOn).toBe("2026-06-01");
      expect(log.createdAt).toEqual(createdAt);
    });
  });
});

describe("Feature: Chave de idempotência diária (dateKey)", () => {
  it("Dado uma data, Quando gerar chave, Então retorna YYYY-MM-DD em UTC", () => {
    expect(dateKey(new Date("2026-01-05T15:30:00Z"))).toBe("2026-01-05");
  });
});
