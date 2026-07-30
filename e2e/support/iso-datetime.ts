/**
 * `e2e/support/dates.ts` gera horários com offset explícito `-03:00`
 * (`saoPauloIso`/`slotFromSeed`) — necessário para preencher os campos
 * `<input type="date">`/`<input type="time">` da UI corretamente.
 *
 * As rotas de API que recebem `startsAt`/`endsAt` diretamente (ex.:
 * `POST /api/appointments`) validam com `z.iso.datetime()` **sem** `{ offset: true }`,
 * que só aceita o formato UTC com sufixo `Z` — o mesmo formato que o próprio
 * formulário da agenda envia via `Date#toISOString()` (ver
 * `src/app/(staff)/agenda/page.tsx`). Um `startsAt`/`endsAt` com offset `-03:00`
 * enviado direto para a API é rejeitado com "Invalid ISO datetime".
 *
 * Specs que criam consultas via API diretamente (sem passar pelo formulário)
 * devem converter o horário da seed para UTC com este helper antes de enviar.
 */
export const toApiDatetime = (iso: string): string => new Date(iso).toISOString();
