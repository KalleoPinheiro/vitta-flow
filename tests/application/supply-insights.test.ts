import { describe, it, expect, beforeEach } from "vitest";
import {
  InMemorySupplyRepository,
  InMemoryStockMovementRepository,
  InMemorySupplyBatchRepository,
} from "@/infrastructure/persistence/in-memory/in-memory-inventory-repositories";
import { CreateSupply } from "@/application/inventory/create-supply";
import { RegisterStockMovement } from "@/application/inventory/register-stock-movement";
import { GetSupplyInsights } from "@/application/inventory/get-supply-insights";
import type { Supply } from "@/domain/inventory/supply";

const DAY_MS = 86_400_000;

describe("Feature: Previsão de ruptura e validade de lotes", () => {
  let supplyRepo: InMemorySupplyRepository;
  let movementRepo: InMemoryStockMovementRepository;
  let batchRepo: InMemorySupplyBatchRepository;
  let bolsa: Supply;

  beforeEach(async () => {
    supplyRepo = new InMemorySupplyRepository();
    movementRepo = new InMemoryStockMovementRepository();
    batchRepo = new InMemorySupplyBatchRepository();
    bolsa = await new CreateSupply(supplyRepo).execute({
      name: "Bolsa colostomia",
      unit: "un",
      minQty: 5,
      priceCents: 4000,
    });
  });

  const move = (input: Parameters<RegisterStockMovement["execute"]>[0]) =>
    new RegisterStockMovement(supplyRepo, movementRepo, undefined, batchRepo).execute(input);

  it("Dado consumo de 90 unidades em 90 dias e estoque 30, Quando calcular, Então ruptura em ~30 dias", async () => {
    await move({ supplyId: bolsa.id, type: "in", quantity: 120, reason: "Compra" });
    await move({ supplyId: bolsa.id, type: "out", quantity: 90, reason: "Uso" });

    const insights = await new GetSupplyInsights(supplyRepo, movementRepo, batchRepo).execute();

    const insight = insights.bySupply.find((i) => i.supplyId === bolsa.id);
    expect(insight?.avgDailyOut).toBeCloseTo(1);
    expect(insight?.daysToStockout).toBe(30);
  });

  it("Dado insumo sem saída na janela, Quando calcular, Então sem previsão", async () => {
    await move({ supplyId: bolsa.id, type: "in", quantity: 10, reason: "Compra" });

    const insights = await new GetSupplyInsights(supplyRepo, movementRepo, batchRepo).execute();
    expect(insights.bySupply.find((i) => i.supplyId === bolsa.id)).toBeUndefined();
  });

  it("Dado entrada com lote e validade próxima, Quando consultar, Então lote aparece no alerta", async () => {
    const in20Days = new Date(Date.now() + 20 * DAY_MS);
    await move({
      supplyId: bolsa.id,
      type: "in",
      quantity: 10,
      reason: "Compra",
      batchLabel: "L2026-01",
      expiresAt: in20Days,
    });

    const insights = await new GetSupplyInsights(supplyRepo, movementRepo, batchRepo).execute();

    expect(insights.expiringBatches).toHaveLength(1);
    expect(insights.expiringBatches[0].label).toBe("L2026-01");
    expect(insights.expiringBatches[0].isExpired).toBe(false);
    expect(insights.expiringBatches[0].remaining).toBe(10);
  });

  it("Dado dois lotes, Quando registrar saída, Então consome primeiro o de validade mais próxima (FEFO)", async () => {
    const near = new Date(Date.now() + 10 * DAY_MS);
    const far = new Date(Date.now() + 200 * DAY_MS);
    await move({
      supplyId: bolsa.id,
      type: "in",
      quantity: 5,
      reason: "Compra",
      batchLabel: "PERTO",
      expiresAt: near,
    });
    await move({
      supplyId: bolsa.id,
      type: "in",
      quantity: 5,
      reason: "Compra",
      batchLabel: "LONGE",
      expiresAt: far,
    });

    await move({ supplyId: bolsa.id, type: "out", quantity: 7, reason: "Uso" });

    const active = await batchRepo.findActiveBySupplyId(bolsa.id);
    expect(active).toHaveLength(1);
    expect(active[0].label).toBe("LONGE");
    expect(active[0].remaining).toBe(3);
  });

  it("Dado entrada sem lote, Quando registrar, Então nenhum lote é criado (retrocompatível)", async () => {
    await move({ supplyId: bolsa.id, type: "in", quantity: 10, reason: "Compra" });

    const active = await batchRepo.findActiveBySupplyId(bolsa.id);
    expect(active).toHaveLength(0);
  });

  it("Dado GetSupplyInsights sem repositório de lotes, Quando calcular, Então expiringBatches vazio sem lançar", async () => {
    await move({ supplyId: bolsa.id, type: "in", quantity: 120, reason: "Compra" });
    await move({ supplyId: bolsa.id, type: "out", quantity: 90, reason: "Uso" });

    const insights = await new GetSupplyInsights(supplyRepo, movementRepo).execute();

    expect(insights.expiringBatches).toEqual([]);
    expect(insights.bySupply.find((i) => i.supplyId === bolsa.id)?.daysToStockout).toBe(30);
  });
});
