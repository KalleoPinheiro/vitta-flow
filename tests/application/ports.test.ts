import { describe, it, expect } from "vitest";
import { NullCalendarGateway } from "@/application/ports/calendar-gateway";
import { NullMessagingGateway } from "@/application/ports/messaging-gateway";

describe("Feature: Gateways nulos (integrações desativadas)", () => {
  it("Dado NullCalendarGateway, Quando chamado, Então createEvent retorna null e update/delete não lançam", async () => {
    const gateway = new NullCalendarGateway();

    await expect(gateway.createEvent()).resolves.toBeNull();
    await expect(gateway.updateEvent()).resolves.toBeUndefined();
    await expect(gateway.deleteEvent()).resolves.toBeUndefined();
  });

  it("Dado NullMessagingGateway, Quando enabled, Então false e sendText não lança", async () => {
    const gateway = new NullMessagingGateway();

    expect(gateway.enabled).toBe(false);
    await expect(gateway.sendText("11999999999", "oi")).resolves.toBeUndefined();
  });
});
